import json
import logging
import os
import re
import shutil
from typing import Any, Dict, List, Optional, Sequence, cast

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text as sql_text
from sqlmodel import asc, desc, func, select

from app.api.deps import (
    SessionDep,
    get_current_active_superuser,
)
from app.api.params import (
    DasiIdPath,
    JsonFiltersParam,
    ObjectFieldsParam,
    PageLimit,
    PageOffset,
    ResourceIdPath,
    SearchTextParam,
    SortFieldParam,
    SortOrderParam,
    TranslationTextParam,
)
from app.crud.crud_epigraph import epigraph as crud_epigraph
from app.crud.crud_site import site as crud_site
from app.crud.crud_object import obj as crud_object
from app.models.epigraph import (
    Epigraph,
    EpigraphCreate,
    EpigraphOut,
    EpigraphUpdate,
    EpigraphsOut,
)
from app.models.pipeline_run import PipelineRun, PipelineRunOut
from app.services.enrichment.embeddings import EmbeddingsService
from app.services.importers.epigraph import EpigraphImportService
from app.services.pipeline.dispatch import dispatch_dasi_pipeline
from app.services.search.epigraph_fields import get_epigraph_facet_schema, get_epigraph_facet_values
from app.services.search.epigraph_search_schema import (
    expand_epigraph_search_scope_keys,
    get_epigraph_default_sort,
    get_epigraph_search_schema,
    validate_epigraph_search_field_keys,
)
from app.services.search.service import SearchService
from app.services.text.word_parser import WordParser
from app.utils import parse_period


logging.basicConfig(
    filename='epigraph_search.log',
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    datefmt='%d-%b-%y %H:%M:%S',
)


router = APIRouter(prefix="/epigraphs", tags=["epigraphs"])

FacetBucketPrimitive = str | bool | int | float
FacetValue = FacetBucketPrimitive | list[str]


class EpigraphFacetSchemaFieldResponse(BaseModel):
    key: str
    label: str
    dependsOn: list[str]
    sortMode: str
    multiValue: bool


class EpigraphSearchFieldResponse(BaseModel):
    key: str
    label: str
    description: str
    category: str
    source: str
    subfields: list[str]


class EpigraphSearchScopeResponse(BaseModel):
    key: str
    label: str
    description: str
    fieldKeys: list[str]


class EpigraphSearchSortDefaultResponse(BaseModel):
    sortField: str
    sortOrder: str


class EpigraphSearchDefaultsResponse(BaseModel):
    browse: EpigraphSearchSortDefaultResponse
    search: EpigraphSearchSortDefaultResponse
    scopeKeys: list[str]


class EpigraphSearchSortOptionResponse(BaseModel):
    key: str
    label: str
    defaultOrder: str
    searchOnly: bool


class EpigraphSearchOperatorResponse(BaseModel):
    key: str
    token: str
    label: str
    description: str


class EpigraphSearchSchemaResponse(BaseModel):
    fields: list[EpigraphSearchFieldResponse]
    scopes: list[EpigraphSearchScopeResponse]
    sortOptions: list[EpigraphSearchSortOptionResponse]
    defaults: EpigraphSearchDefaultsResponse
    operators: list[EpigraphSearchOperatorResponse]


class EpigraphQueryRequest(BaseModel):
    search_text: str = ""
    fields: list[str] = Field(default_factory=list)
    scope_keys: list[str] | None = None
    include_objects: bool = False
    object_fields: list[str] = Field(default_factory=list)
    filters: dict[str, Any] = Field(default_factory=dict)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=25, ge=1, le=250)
    sort_field: str | None = None
    sort_order: str | None = None


class EpigraphFacetBucket(BaseModel):
    value: FacetBucketPrimitive
    count: int


class EpigraphQueryResponse(BaseModel):
    results: EpigraphsOut
    facets: Dict[str, List[FacetValue]]
    facet_counts: Dict[str, List[EpigraphFacetBucket]]
    facet_schema: list[EpigraphFacetSchemaFieldResponse]
    page: int
    page_size: int
    sort_field: str | None = None
    sort_order: str


class EpigraphMapMarkerResponse(BaseModel):
    id: int
    dasi_id: int
    title: str
    label: str
    coordinates: tuple[float, float]
    site_name: str | None = None


class EpigraphMapMarkersResponse(BaseModel):
    markers: list[EpigraphMapMarkerResponse]
    result_count: int
    mapped_count: int


def _build_epigraphs_out(epigraphs: Sequence[Epigraph], count: int) -> EpigraphsOut:
    return EpigraphsOut(
        epigraphs=[EpigraphOut.model_validate(epigraph) for epigraph in epigraphs],
        count=count,
    )

@router.get(
    "",
    response_model=EpigraphsOut,
    # dependencies=[Depends(get_current_active_superuser)],
)
def read_epigraphs(
    session: SessionDep,
    skip: PageOffset = 0,
    limit: PageLimit = 100,
    sort_field: SortFieldParam = None,
    sort_order: SortOrderParam = None,
    filters: JsonFiltersParam = None,
) -> EpigraphsOut:
    """
    Retrieve epigraphs.
    """
    epigraphs_statement = select(Epigraph)

    if filters:
        filters_dict = json.loads(filters)
        for key, value in filters_dict.items():
            if isinstance(value, bool):
                epigraphs_statement = epigraphs_statement.where(
                    getattr(Epigraph, key).is_(value)
                )
            elif isinstance(value, dict) and "not" in value and value["not"] is False:
                epigraphs_statement = epigraphs_statement.where(
                    getattr(Epigraph, key).isnot(False)
                )
            else:
                epigraphs_statement = epigraphs_statement.where(
                    getattr(Epigraph, key) == value
                )

    total_count_statement = select(func.count()).select_from(epigraphs_statement.subquery())
    total_count = session.exec(total_count_statement).one()

    if sort_field:
        if sort_order == "desc":
            if sort_field in ["period", "language_level_1"]:
                epigraphs_statement = epigraphs_statement.order_by(desc(getattr(Epigraph, sort_field)), desc(Epigraph.id))
            else:
                epigraphs_statement = epigraphs_statement.order_by(desc(getattr(Epigraph, sort_field)))
        else:
            if sort_field in ["period", "language_level_1"]:
                epigraphs_statement = epigraphs_statement.order_by(asc(getattr(Epigraph, sort_field)), asc(Epigraph.id))
            else:
                epigraphs_statement = epigraphs_statement.order_by(asc(getattr(Epigraph, sort_field)))

    epigraphs_statement = epigraphs_statement.offset(skip).limit(limit)

    epigraphs = session.exec(epigraphs_statement).all()

    return _build_epigraphs_out(epigraphs, int(total_count))


@router.get(
    "/filter",
    response_model=EpigraphsOut,
)
def filter_epigraphs(
    session: SessionDep,
    translation_text: TranslationTextParam,
    sort_field: SortFieldParam = None,
    sort_order: SortOrderParam = None,
    filters: JsonFiltersParam = None,
):
    """
    Filter epigraphs by searching within all translations.
    """

    logging.info(f"Searching: {translation_text}, sort_field: {sort_field}, sort_order: {sort_order}")

    query = select(Epigraph)

    query = query.where(
        sql_text("""
            EXISTS (
                SELECT 1 
                FROM jsonb_array_elements(translations) as t 
                WHERE t->>'text' ~* :translation_pattern
            )
        """)
    ).params(translation_pattern=f"\\m{translation_text}\\M")

    if filters:
        filters_dict = json.loads(filters)
        for key, value in filters_dict.items():
            if isinstance(value, bool):
                query = query.where(
                    getattr(Epigraph, key).is_(value)
                )
            else:
                query = query.where(
                    getattr(Epigraph, key) == value
                )

    if sort_field:
        if sort_order == "desc":
            if sort_field in ["period", "language_level_1"]:
                query = query.order_by(desc(sort_field), desc(Epigraph.id))
            else:
                query = query.order_by(desc(sort_field))
        else:
            if sort_field in ["period", "language_level_1"]:
                query = query.order_by(asc(sort_field), asc(Epigraph.id))
            else:
                query = query.order_by(asc(sort_field))

    epigraphs = session.exec(query).all()

    logging.info(f"Found {len(epigraphs)} epigraphs")

    return _build_epigraphs_out(epigraphs, len(epigraphs))


@router.post(
    "/by-ids",
    response_model=EpigraphsOut,
)
def get_epigraphs_by_ids(
    session: SessionDep,
    epigraph_ids: List[int],
):
    """
    Fetch multiple epigraphs by their IDs.
    """
    if not epigraph_ids:
        return EpigraphsOut(epigraphs=[], count=0)

    if len(epigraph_ids) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot fetch more than 100 epigraphs at once"
        )

    epigraph_id_column = cast(Any, Epigraph.id)
    query = select(Epigraph).where(epigraph_id_column.in_(epigraph_ids))
    epigraphs = session.exec(query).all()

    epigraph_dict = {ep.id: ep for ep in epigraphs}
    ordered_epigraphs = [epigraph_dict[id] for id in epigraph_ids if id in epigraph_dict]

    return _build_epigraphs_out(ordered_epigraphs, len(ordered_epigraphs))


@router.get(
    "/search",
    response_model=EpigraphsOut,
)
def full_text_search_epigraphs(
    session: SessionDep,
    search_text: SearchTextParam,
    fields: Optional[str] = None,
    sort_field: SortFieldParam = None,
    sort_order: SortOrderParam = None,
    filters: JsonFiltersParam = None,
    skip: PageOffset = 0,
    limit: PageLimit = 100,
    include_objects: bool = False,
    object_fields: ObjectFieldsParam = None,
):
    """
    Full text search epigraphs using OpenSearch when available, falling back to PostgreSQL.
    """
    search_service = SearchService(session)

    epigraphs, count = search_service.opensearch_full_text_search(
        search_text=search_text,
        fields=fields,
        sort_field=sort_field,
        sort_order=sort_order,
        filters=filters,
        skip=skip,
        limit=limit,
        include_objects=include_objects,
        object_fields=object_fields,
    )

    return _build_epigraphs_out(epigraphs, count)


@router.get(
    "/semantic_search/{text}",
    response_model=EpigraphsOut,
)
def semantic_search_epigraphs(
    text: str,
    session: SessionDep,
):
    search_service = SearchService(session)
    epigraphs = search_service.semantic_search(
        text=text,
        # distance_threshold=None,
        distance_threshold=0.7,
        limit=10,
        # filters={"dasi_published": True},
    )
    if not epigraphs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No epigraphs found",
        )
    return epigraphs


@router.post(
    "/query",
    response_model=EpigraphQueryResponse,
)
def query_epigraphs(
    request: EpigraphQueryRequest,
    session: SessionDep,
) -> EpigraphQueryResponse:
    """Run the new canonical epigraph query contract backed by OpenSearch plus canonical facet values."""
    search_service = SearchService(session)

    published_filters = {"dasi_published": True, **request.filters}
    has_search_text = bool(request.search_text.strip())
    default_sort = get_epigraph_default_sort(has_search_text)
    sort_field = request.sort_field or default_sort["sortField"]
    sort_order = request.sort_order or default_sort["sortOrder"]
    resolved_fields = validate_epigraph_search_field_keys(request.fields)

    if request.scope_keys is not None:
        resolved_fields = expand_epigraph_search_scope_keys(request.scope_keys)

    try:
        query_result = search_service.opensearch_query_epigraphs(
            search_text=request.search_text,
            fields=",".join(resolved_fields) if resolved_fields else None,
            sort_field=sort_field,
            sort_order=sort_order,
            filters=published_filters,
            skip=(request.page - 1) * request.page_size,
            limit=request.page_size,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return EpigraphQueryResponse(
        results=_build_epigraphs_out(query_result["epigraphs"], query_result["count"]),
        facets=get_epigraph_facet_values(session, filters=published_filters),
        facet_counts=query_result["facet_counts"],
        facet_schema=get_epigraph_facet_schema(),
        page=request.page,
        page_size=request.page_size,
        sort_field=sort_field,
        sort_order=sort_order,
    )


@router.post(
    "/query/map-markers",
    response_model=EpigraphMapMarkersResponse,
)
def query_epigraph_map_markers(
    request: EpigraphQueryRequest,
    session: SessionDep,
) -> EpigraphMapMarkersResponse:
    """Return lightweight map markers for all published epigraphs matching the canonical query filters."""
    search_service = SearchService(session)

    published_filters = {"dasi_published": True, **request.filters}
    resolved_fields = validate_epigraph_search_field_keys(request.fields)

    if request.scope_keys is not None:
        resolved_fields = expand_epigraph_search_scope_keys(request.scope_keys)

    try:
        marker_result = search_service.opensearch_query_epigraph_markers(
            search_text=request.search_text,
            fields=",".join(resolved_fields) if resolved_fields else None,
            filters=published_filters,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return EpigraphMapMarkersResponse(**marker_result)


@router.get(
    "/schema/search",
    response_model=EpigraphSearchSchemaResponse,
)
def get_epigraph_search_schema_endpoint() -> EpigraphSearchSchemaResponse:
    """Return the canonical epigraph search schema for search scopes, advanced fields, and sort options."""
    return EpigraphSearchSchemaResponse.model_validate(get_epigraph_search_schema())


@router.get(
    "/schema/filters",
    response_model=Dict[str, list[EpigraphFacetSchemaFieldResponse]],
)
def get_epigraph_filter_schema() -> Dict[str, list[EpigraphFacetSchemaFieldResponse]]:
    """Return the canonical epigraph facet metadata for the rebuilt search UI."""
    return {
        "fields": [
            EpigraphFacetSchemaFieldResponse.model_validate(field)
            for field in get_epigraph_facet_schema()
        ]
    }


@router.get(
    "/{epigraph_id}",
    response_model=EpigraphOut,
)
def read_epigraph_by_id(
    epigraph_id: ResourceIdPath,
    session: SessionDep,
) -> Epigraph:
    """
    Retrieve epigraph by ID.
    """
    epigraph = crud_epigraph.get(session, id=epigraph_id)
    if not epigraph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Epigraph not found",
        )
    return epigraph


@router.get(
    "/dasi_id/{dasi_id}",
    response_model=EpigraphOut,
)
def read_epigraph_by_dasi_id(
    dasi_id: DasiIdPath,
    session: SessionDep,
) -> Epigraph:
    """
    Retrieve epigraph by DASI ID.
    """
    epigraph = crud_epigraph.get_by_dasi_id(session, dasi_id=dasi_id)
    if not epigraph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Epigraph not found",
        )
    if not epigraph.dasi_published:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Epigraph not published",
        )
    return epigraph


@router.get(
    "/{epigraph_id}/text",
    response_model=Dict[str, str],
    dependencies=[Depends(get_current_active_superuser)],
)
def read_epigraph_text_by_id(
    epigraph_id: ResourceIdPath,
    session: SessionDep,
) -> Dict[str, str]:
    """
    Retrieve epigraph text by ID.
    """
    epigraph = crud_epigraph.get(session, id=epigraph_id)
    if not epigraph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Epigraph not found",
        )

    epigraph_text = epigraph.epigraph_text
    epigraph_text = re.sub(r"<milestone unit=\"clitic\"/>", " ", epigraph_text)
    epigraph_text = re.sub(r"<[^>]*>", "", epigraph_text)

    return {
        "epigraph_text": epigraph_text,
        "original_text": epigraph.epigraph_text,
    }


@router.get(
    "/fields/all",
    response_model=Dict[str, List[Any]],
)
def get_all_field_values(
    session: SessionDep,
) -> Dict[str, List[str]]:
    """
    Get all possible values for all fields.
    """
    return get_epigraph_facet_values(session)


@router.get(
    "/fields/filtered",
    response_model=Dict[str, List[Any]],
)
def get_filtered_field_values(
    session: SessionDep,
    filters: JsonFiltersParam = None,
) -> Dict[str, List[str]]:
    """
    Get field values based on current filters.
    """
    filters_dict = json.loads(filters) if filters else None
    return get_epigraph_facet_values(session, filters=filters_dict)


@router.post(
    "",
    response_model=EpigraphOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_active_superuser)],
)
def create_epigraph(
    epigraph: EpigraphCreate,
    session: SessionDep,
) -> Epigraph:
    """
    Create new epigraph.
    """
    return crud_epigraph.create(session, obj_in=epigraph)


@router.put(
    "/{epigraph_id}",
    response_model=EpigraphOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def update_epigraph(
    epigraph_id: ResourceIdPath,
    epigraph_in: EpigraphUpdate,
    session: SessionDep,
) -> Epigraph:
    """
    Update epigraph.
    """
    epigraph = crud_epigraph.get(session, id=epigraph_id)
    if not epigraph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Epigraph not found",
        )
    return crud_epigraph.update(session, db_obj=epigraph, obj_in=epigraph_in)


@router.delete(
    "/{epigraph_id}",
    dependencies=[Depends(get_current_active_superuser)],
)
def delete_epigraph(
    epigraph_id: ResourceIdPath,
    session: SessionDep,
) -> None:
    """
    Delete epigraph.
    """
    crud_epigraph.remove(session, id=epigraph_id)
    return None


@router.post(
    "/import",
    response_model=PipelineRunOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def import_epigraphs(
    session: SessionDep,
) -> PipelineRun:
    """
    Import epigraphs from external api.
    """
    return dispatch_dasi_pipeline(
        session,
        parameters={
            "import_sites": False,
            "import_objects": False,
            "import_epigraphs": True,
            "run_chunking": False,
            "generate_embeddings": False,
            "reindex_search": False,
        },
    )


@router.post(
    "/import_range",
    response_model=PipelineRunOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def import_epigraphs_range(
    session: SessionDep,
    start_id: int,
    end_id: int,
    dasi_published: Optional[bool] = None,
    update_existing: bool = False,
) -> PipelineRun:
    """
    Import epigraphs from external api in a range.
    """
    return dispatch_dasi_pipeline(
        session,
        parameters={
            "import_sites": False,
            "import_objects": False,
            "import_epigraphs": True,
            "start_id": start_id,
            "end_id": end_id,
            "dasi_published": dasi_published,
            "update_existing": update_existing,
            "run_chunking": False,
            "generate_embeddings": False,
            "reindex_search": False,
        },
    )


@router.get(
    "/fields/dasi_object",
    dependencies=[Depends(get_current_active_superuser)],
)
def get_epigraph_fields(
    session: SessionDep,
):
    """
    Get list of fields in all epigraph.dasi_object jsonb column.
    """
    fields_statement = select(
        func.jsonb_object_keys(Epigraph.dasi_object)
    ).distinct()
    fields = session.exec(fields_statement).all()
    return fields


@router.get(
    "/fields/dasi_object/missing",
    dependencies=[Depends(get_current_active_superuser)],
)
def get_epigraph_missing_fields(
    session: SessionDep,
):
    """
    Get list of fields which are not in all epigraph.dasi_object jsonb column.
    """
    fields_statement = select(
        func.jsonb_object_keys(Epigraph.dasi_object)
    ).distinct()
    fields = session.exec(fields_statement).all()

    all_fields = set(fields)
    missing_fields = set()
    for field in all_fields:
        field_statement = select(
            func.count()
        ).where(
            ~func.jsonb_exists(Epigraph.dasi_object, field)
        )
        count = session.exec(field_statement).one()
        if count > 0:
            missing_fields.add(field)
    return missing_fields


@router.put(
    "/transfer_fields",
    dependencies=[Depends(get_current_active_superuser)],
)
def transfer_fields(
    session: SessionDep,
) -> dict[str, str]:
    """
    Transfer fields for every epigraph object that's already in the db.
    """
    epigraph_import_service = EpigraphImportService(session)
    epigraphs = session.exec(select(Epigraph)).all()

    for epigraph in epigraphs:
        epigraph_update = epigraph_import_service.transfer_fields(epigraph.dasi_object)
        crud_epigraph.update(session, db_obj=epigraph, obj_in=epigraph_update)

    return {"status": "success", "message": "Fields transferred for all epigraphs"}


@router.put(
    "/cleanup_unreliable_links/all",
    dependencies=[Depends(get_current_active_superuser)],
)
def cleanup_unreliable_links(
    session: SessionDep,
) -> dict[str, Any]:
    """
    Remove epigraph links for rows whose DASI relationship payload exceeds the reliability threshold.
    """
    return EpigraphImportService(session).cleanup_unreliable_related_links()


@router.put(
    "/link_to_sites/all",
    dependencies=[Depends(get_current_active_superuser)],
)
def link_to_sites(
    session: SessionDep,
) -> dict:
    """
    Link epigraphs to sites.
    """
    epigraphs = session.exec(select(Epigraph)).all()
    for epigraph in epigraphs:
        site_list = epigraph.dasi_object.get("sites", [])
        site_dasi_ids = [
            int(site["@id"].split("/")[-1])
            for site in site_list
            if "@id" in site
        ]
        for site_dasi_id in site_dasi_ids:
            site = crud_site.get_by_dasi_id(session, dasi_id=site_dasi_id)
            if site and site.id is not None:
                crud_epigraph.link_to_site(session, epigraph=epigraph, site_id=site.id)
    return {"status": "success", "message": "Linked all epigraphs to sites"}


@router.put(
    "/link_to_objects/all",
    dependencies=[Depends(get_current_active_superuser)],
)
def link_to_objects(
    session: SessionDep,
) -> dict:
    """
    Link epigraphs to objects.
    """
    epigraphs = session.exec(select(Epigraph)).all()
    for epigraph in epigraphs:
        object_list = epigraph.dasi_object.get("objects", [])
        object_dasi_ids = [
            int(obj["@id"].split("/")[-1])
            for obj in object_list
            if "@id" in obj
        ]
        for object_dasi_id in object_dasi_ids:
            obj = crud_object.get_by_dasi_id(session, dasi_id=object_dasi_id)
            if obj and obj.id is not None:
                crud_epigraph.link_to_object(session, epigraph=epigraph, object_id=obj.id)
    return {"status": "success", "message": "Linked all epigraphs to objects"}


@router.put(
    "/generate_embeddings/all",
    dependencies=[Depends(get_current_active_superuser)],
)
def generate_embeddings_all(
    session: SessionDep,
    skip_existing: bool = True
) -> dict:
    """
    Generate embeddings for all epigraphs.
    """
    query = select(Epigraph)
    if skip_existing:
        query = query.where(sql_text("embedding IS NULL"))
    epigraphs = session.exec(query).all()
    embeddings_service = EmbeddingsService(session)
    processed = 0
    failed_ids = []

    for epigraph in epigraphs:
        text_parts = []

        def field_to_string(field_value):
            if field_value is None:
                return ""
            if isinstance(field_value, str):
                return field_value
            if isinstance(field_value, (list, dict)):
                json_str = json.dumps(field_value, ensure_ascii=False)
                clean_str = re.sub(r'[{}\[\]",:]', "", json_str)
                clean_str = re.sub(r"\s+", " ", clean_str)
                return clean_str
            return str(field_value)

        embedding_fields = [
            "epigraph.epigraph_text",
            "epigraph.translations",
            "epigraph.general_notes",
            "epigraph.apparatus_notes",
            "epigraph.cultural_notes",
            "object.support_notes",
            "object.cultural_notes",
            "object.deposit_notes",
            "object.concordances",
            "epigraph.bibliography",
        ]

        epigraph_data = epigraph.model_dump()
        object_data = epigraph.objects[0].model_dump() if epigraph.objects and len(epigraph.objects) > 0 else {}
        for field_name in embedding_fields:
            source, field = field_name.split(".")
            data = epigraph_data if source == "epigraph" else object_data
            if field in data and data[field]:
                field_value = data[field]
                if field == "epigraph_text":
                    epigraph_text = re.sub(r"<milestone unit=\"clitic\"/>", " ", epigraph.epigraph_text)
                    field_value = re.sub(r"<[^>]*>", "", epigraph_text)

                text = field_to_string(field_value)
                if text.strip():
                    text_parts.append(text)

        combined_text = " ".join(text_parts)
        if not combined_text.strip():
            failed_ids.append(epigraph.id)
            continue

        embedding = embeddings_service.generate_embedding(combined_text)
        if embedding is None:
            failed_ids.append(epigraph.id)
            continue

        crud_epigraph.update(
            session,
            db_obj=epigraph,
            obj_in=EpigraphUpdate(embedding=embedding)
        )
        processed += 1

    return {
        "status": "success",
        "processed_items": processed,
        "failed_items": len(failed_ids),
        "failed_ids": failed_ids,
    }


@router.put(
    "/generate_embeddings/{epigraph_id}",
    dependencies=[Depends(get_current_active_superuser)],
)
def generate_embeddings(
    epigraph_id: int,
    session: SessionDep,
) -> dict:
    """
    Generate embeddings for a specific epigraph.
    """
    epigraph = crud_epigraph.get(session, id=epigraph_id)
    if not epigraph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Epigraph not found",
        )

    text_parts = []

    def field_to_string(field_value):
        if field_value is None:
            return ""
        elif isinstance(field_value, str):
            return field_value
        elif isinstance(field_value, (list, dict)):
            json_str = json.dumps(field_value, ensure_ascii=False)
            clean_str = re.sub(r'[{}\[\]",:]', "", json_str)
            clean_str = re.sub(r"\s+", " ", clean_str)
            return clean_str
        else:
            return str(field_value)

    embedding_fields = [
        "epigraph.epigraph_text",
        "epigraph.translations",
        "epigraph.general_notes",
        "epigraph.apparatus_notes",
        "epigraph.cultural_notes",
        "object.support_notes",
        "object.cultural_notes",
        "object.deposit_notes",
        "object.concordances",
        "epigraph.bibliography",
    ]

    epigraph_data = epigraph.model_dump()
    object_data = epigraph.objects[0].model_dump() if epigraph.objects and len(epigraph.objects) > 0 else {}
    for field_name in embedding_fields:
        source, field = field_name.split(".")
        data = epigraph_data if source == "epigraph" else object_data
        if field in data and data[field]:
            field_value = data[field]
            text = ""
            if field == "epigraph_text":
                epigraph_text = epigraph.epigraph_text
                epigraph_text = re.sub(r"<milestone unit=\"clitic\"/>", " ", epigraph_text)
                epigraph_text = re.sub(r"<[^>]*>", "", epigraph_text)
                field_value = epigraph_text

            text = field_to_string(field_value)
            if text.strip():
                text_parts.append(text)

    combined_text = " ".join(text_parts)

    if not combined_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No text content found to generate embedding",
        )

    embeddings_service = EmbeddingsService(session)
    embedding = embeddings_service.generate_embedding(combined_text)

    if embedding is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate embedding",
        )

    epigraph = crud_epigraph.update(
        session,
        db_obj=epigraph,
        obj_in=EpigraphUpdate(embedding=embedding)
    )

    return {
        "status": "success",
        "message": f"Embedding generated for epigraph {epigraph_id}",
        "text_length": len(combined_text),
        "fields_used": embedding_fields,
        "text_parts_count": len(text_parts),
    }


@router.get(
    "/analysis/count_by_period",
    # dependencies=[Depends(get_current_active_superuser)],
)
def analyze_epigraphs(
    session: SessionDep,
) -> Dict[str, Any]:
    """
    Perform analysis on the epigraphs and return the results for Apache ECharts.
    """
    epigraphs = session.exec(select(Epigraph)).all()

    period_counts = {}
    for epigraph in epigraphs:
        period = epigraph.period
        if period:
            if period not in period_counts:
                period_counts[period] = 0
            period_counts[period] += 1

    sorted_periods = sorted(period_counts.keys(), key=parse_period)

    echarts_data = {
        "legend": ["Period"],
        "xAxis": sorted_periods,
        "series": [
            {
                "name": "Period",
                "type": "bar",
                "data": [period_counts[period] for period in sorted_periods],
            }
        ],
    }

    return echarts_data


@router.get(
    "/analysis/words",
    # dependencies=[Depends(get_current_active_superuser)],
)
def analyze_words(
    session: SessionDep,
):
    """
    Get list of all words in epigraphs and their counts and display in Apache ECharts.
    """
    return
    epigraphs = session.exec(select(Epigraph)).all()

    words = {}
    for epigraph in epigraphs:
        text = epigraph.epigraph_text
        if text:
            text = re.sub(r"<[^>]*>", "", text)
            for word in text.split():
                if word not in words:
                    words[word] = 0
                words[word] += 1

    words = dict(sorted(words.items(), key=lambda item: item[1], reverse=True))

    return words

    echarts_data = {
        "legend": ["Words"],
        "xAxis": list(words.keys())[:10],
        "series": [
            {
                "name": "Words",
                "type": "bar",
                "data": list(words.values())[:10],
            }
        ],
    }

    return echarts_data


@router.get(
    "/analysis/writing_techniques",
    # dependencies=[Depends(get_current_active_superuser)],
)
def analyze_writing_techniques(
    session: SessionDep,
):
    """
    Get writing techniques distribution by period and display in Apache ECharts.
    """
    epigraphs = session.exec(select(Epigraph)).all()

    writing_techniques = {}
    for epigraph in epigraphs:
        period = epigraph.period
        techniques = epigraph.writing_techniques
        if period and techniques:
            if period not in writing_techniques:
                writing_techniques[period] = {}
            for technique in techniques:
                if technique not in writing_techniques[period]:
                    writing_techniques[period][technique] = 0
                writing_techniques[period][technique] += 1
                
    techniques_set = set()
    
    for period in writing_techniques:
        techniques_set.update(writing_techniques[period].keys())

    sorted_periods = sorted(writing_techniques.keys(), key=parse_period)

    echarts_data = {
        "legend": list(techniques_set),
        "xAxis": sorted_periods,
        "series": [
            {
                "name": technique,
                "type": "bar",
                "data": [
                    writing_techniques[period].get(technique, 0)
                    for period in sorted_periods
                ],
            }
            for technique in techniques_set
        ],
    }

    return echarts_data


@router.post(
    "/{epigraph_id}/parse-words",
    # response_model=WordsOut,
)
def parse_words(
    epigraph_id: int,
    session: SessionDep,
):
    """
    Parse words in epigraph.epigraph_text.
    """
    epigraph = crud_epigraph.get(session, id=epigraph_id)
    if not epigraph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Epigraph not found",
        )
    word_parser = WordParser(session, epigraph)
    return word_parser.parse()


@router.post(
    "/parse-words",
    # response_model=WordsOut,
)
def parse_all_words(
    session: SessionDep,
):
    """
    Parse words in all epigraphs.
    """
    epigraphs = session.exec(select(Epigraph)).all()
    for epigraph in epigraphs:
        word_parser = WordParser(session, epigraph)
        word_parser.parse()
    return {"status": "success", "message": "Words parsed for all epigraphs"}


@router.get(
    "/{epigraph_id}/similar",
    response_model=EpigraphsOut,
)
def get_similar_epigraphs(
    epigraph_id: int,
    session: SessionDep,
    distance_threshold: Optional[float] = 0.7,
    limit: int = 10,
    filters: Optional[str] = None,
) -> EpigraphsOut:
    """
    Get epigraphs similar to the given epigraph based on embeddings.
    """
    epigraph = crud_epigraph.get(session, id=epigraph_id)
    if not epigraph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Epigraph not found",
        )

    if epigraph.embedding is None or len(epigraph.embedding) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Epigraph has no embedding. Generate embeddings first.",
        )

    embeddings_service = EmbeddingsService(session)
    result = embeddings_service.get_nearest_embeddings(
        embedding=epigraph.embedding,
        distance_threshold=distance_threshold,
        limit=limit + 1,
    )

    result["epigraphs"] = [
        ep for ep in result["epigraphs"] if ep.id != epigraph_id
    ]

    return _build_epigraphs_out(result["epigraphs"], result["total_count"])


@router.post(
    "/import_images/all",
    dependencies=[Depends(get_current_active_superuser)],
)
async def import_all_images(
    session: SessionDep,
    start_rec_id: int = 1,
    image_size: str = "high",
    rate_limit_delay: float = 2.0,
    max_consecutive_failures: int = 50,
) -> dict:
    """
    Import all images from DASI starting from start_rec_id until no more images are found.
    """
    epigraph_import_service = EpigraphImportService(session)
    return await epigraph_import_service.import_all_images(
        start_rec_id=start_rec_id,
        image_size=image_size,
        rate_limit_delay=rate_limit_delay,
        max_consecutive_failures=max_consecutive_failures,
    )


@router.post(
    "/import_images/range",
    dependencies=[Depends(get_current_active_superuser)],
)
async def import_images_range(
    session: SessionDep,
    start_rec_id: int,
    end_rec_id: int,
    image_size: str = "high",
    rate_limit_delay: float = 2.0,
) -> dict:
    """
    Import images for a specific range of record IDs.
    """
    if start_rec_id > end_rec_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_rec_id must be less than or equal to end_rec_id",
        )

    epigraph_import_service = EpigraphImportService(session)
    return await epigraph_import_service.import_images_range(
        start_id=start_rec_id,
        end_id=end_rec_id,
        image_size=image_size,
        rate_limit_delay=rate_limit_delay,
    )


@router.post(
    "/scrape_images/range",
    dependencies=[Depends(get_current_active_superuser)],
)
async def scrape_epigraphs_images_range(
    session: SessionDep,
    start_dasi_id: int,
    end_dasi_id: int,
    rate_limit_delay: float = 10,
    max_retries: int = 1,
) -> dict:
    """
    Scrape image details for epigraphs in a DASI ID range.
    """
    epigraph_import_service = EpigraphImportService(session)
    epigraphs_query = select(Epigraph).where(
        Epigraph.dasi_id >= start_dasi_id,
        Epigraph.dasi_id <= end_dasi_id
    )
    epigraphs = session.exec(epigraphs_query).all()

    success_count = 0
    failed_ids = []
    for epigraph in epigraphs:
        try:
            await epigraph_import_service.scrape_single(
                dasi_id=epigraph.dasi_id,
                rate_limit_delay=rate_limit_delay,
                max_retries=max_retries,
            )
            success_count += 1
        except Exception as e:
            logging.error(f"Error scraping images for DASI ID {epigraph.dasi_id}: {str(e)}")
            failed_ids.append(epigraph.dasi_id)

    return {
        "status": "success",
        "processed_items": success_count,
        "failed_items": len(failed_ids),
        "failed_ids": failed_ids,
        "total_items": len(epigraphs),
        "range": f"{start_dasi_id}-{end_dasi_id}",
        "max_retries": max_retries,
    }


@router.post(
    "/scrape_images/all",
    dependencies=[Depends(get_current_active_superuser)],
)
async def scrape_all_epigraphs_images(
    session: SessionDep,
    rate_limit_delay: float = 10,
    update_existing: bool = False,
    max_retries: int = 1,
) -> dict:
    """
    Scrape image details for all epigraphs.
    """
    if update_existing:
        epigraphs = session.exec(select(Epigraph)).all()
    else:
        epigraphs = session.exec(select(Epigraph).where(sql_text("images IS NULL"))).all()

    epigraph_import_service = EpigraphImportService(session)
    success_count = 0
    failed_ids = []
    for epigraph in epigraphs:
        try:
            await epigraph_import_service.scrape_single(
                dasi_id=epigraph.dasi_id,
                rate_limit_delay=rate_limit_delay,
                max_retries=max_retries,
            )
            success_count += 1
        except Exception as e:
            logging.error(f"Error scraping images for DASI ID {epigraph.dasi_id}: {str(e)}")
            failed_ids.append(epigraph.dasi_id)

    return {
        "status": "success",
        "processed_items": success_count,
        "failed_items": len(failed_ids),
        "failed_ids": failed_ids,
        "total_items": len(epigraphs),
        "update_existing": update_existing,
        "max_retries": max_retries,
    }


@router.post(
    "/scrape_images/{dasi_id}",
    response_model=EpigraphOut,
    dependencies=[Depends(get_current_active_superuser)],
)
async def scrape_epigraph_images_single(
    dasi_id: int,
    session: SessionDep,
    rate_limit_delay: float = 10,
    max_retries: int = 1,
) -> Epigraph:
    """
    Scrape image details for a single epigraph by DASI ID.
    """
    epigraph_import_service = EpigraphImportService(session)
    
    try:
        updated_epigraph = await epigraph_import_service.scrape_single(
            dasi_id=dasi_id,
            rate_limit_delay=rate_limit_delay,
            max_retries=max_retries
        )
        return updated_epigraph
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error scraping images: {str(e)}"
        )


@router.put(
    "/images/copyright",
    dependencies=[Depends(get_current_active_superuser)],
)
def move_images_free_from_copyright(
    session: SessionDep,
) -> dict:
    """
    Move copyright free images from private to public storage and update epigraph records.
    """
    epigraphs = session.exec(
        select(Epigraph).where(
            sql_text("images IS NOT NULL"),
            sql_text("jsonb_array_length(images) > 0")
        )
    ).all()

    moved_count = 0
    updated_epigraphs = 0

    for epigraph in epigraphs:
        updated_images = []
        epigraph_updated = False

        for image in epigraph.images or []:
            image_copy = dict(image)

            if "free from copyright" in image.get("caption", "").lower():
                image_id = image.get("image_id")
                if not image_id:
                    updated_images.append(image_copy)
                    continue

                if not image_copy.get("copyright_free"):
                    image_copy["copyright_free"] = True
                    epigraph_updated = True

                private_path = f"private/images/rec_{image_id}_high.jpg"
                public_path = f"public/images/rec_{image_id}_high.jpg"

                os.makedirs(os.path.dirname(public_path), exist_ok=True)

                if os.path.exists(private_path):
                    shutil.move(private_path, public_path)
                    moved_count += 1
                    epigraph_updated = True
                    logging.info(f"Moved image {image_id} to public storage")
                elif not os.path.exists(private_path):
                    logging.warning(f"Image {image_id} not found in private storage")
            else:
                if "copyright_free" not in image_copy:
                    image_copy["copyright_free"] = False
                    epigraph_updated = True

            updated_images.append(image_copy)

        if epigraph_updated:
            crud_epigraph.update(
                db=session,
                db_obj=epigraph,
                obj_in={'images': updated_images}
            )
            updated_epigraphs += 1

    return {
        "status": "success",
        "message": f"Moved {moved_count} images to public storage and updated {updated_epigraphs} epigraph records"
    }