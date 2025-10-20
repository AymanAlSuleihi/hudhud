import json
import logging
import os
import re
import shutil
import asyncio
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlmodel import select, func, asc, desc, text, or_

from app.api.deps import (
    SessionDep,
    get_current_active_superuser,
    get_current_active_superuser_no_error,
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
from app.services.epigraph.import_service import EpigraphImportService
from app.services.word.word_parser import WordParser
from app.services.task_progress import TaskProgressService
from app.services.embeddings_service import EmbeddingsService
from app.services.search_service import SearchService
from app.utils import parse_period


logging.basicConfig(
    filename='epigraph_search.log',
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    datefmt='%d-%b-%y %H:%M:%S',
)


router = APIRouter()

@router.get(
    "/",
    response_model=EpigraphsOut,
    # dependencies=[Depends(get_current_active_superuser)],
)
def read_epigraphs(
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
    sort_field: Optional[str] = None,
    sort_order: Optional[str] = None,
    filters: Optional[str] = None,
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
        if sort_order and sort_order.lower() == "desc":
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

    return EpigraphsOut(epigraphs=epigraphs, count=total_count)


@router.get(
    "/filter",
    response_model=EpigraphsOut,
)
def filter_epigraphs(
    session: SessionDep,
    translation_text: str,
    sort_field: Optional[str] = None,
    sort_order: Optional[str] = None,
    filters: Optional[str] = None,
):
    """
    Filter epigraphs by searching within all translations.
    """

    logging.info(f"Searching: {translation_text}, sort_field: {sort_field}, sort_order: {sort_order}")

    query = select(Epigraph)

    query = query.where(
        text("""
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
        if sort_order.lower() == "desc":
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

    return EpigraphsOut(epigraphs=epigraphs, count=len(epigraphs))


@router.get(
    "/search",
    response_model=EpigraphsOut,
)
def full_text_search_epigraphs(
    session: SessionDep,
    search_text: str,
    fields: Optional[str] = None,
    sort_field: Optional[str] = None,
    sort_order: Optional[str] = None,
    filters: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    include_objects: bool = False,
    object_fields: Optional[str] = None,
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

    return EpigraphsOut(epigraphs=epigraphs, count=count)


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


@router.get(
    "/{epigraph_id}",
    response_model=EpigraphOut,
)
def read_epigraph_by_id(
    epigraph_id: int,
    session: SessionDep,
) -> EpigraphOut:
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
    dasi_id: int,
    session: SessionDep,
) -> EpigraphOut:
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
    epigraph_id: int,
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
    field_values = {}
    for field in [
        "period",
        "chronology_conjectural",
        # "mentioned_date",
        "language_level_1",
        "language_level_2",
        "language_level_3",
        "alphabet",
        "script_typology",
        "script_cursus",
        "textual_typology",
        "textual_typology_conjectural",
        "writing_techniques",
        "royal_inscription",
    ]:
        statement = select(func.distinct(getattr(Epigraph, field))).where(
            getattr(Epigraph, field).is_not(None)
        ).order_by(asc(getattr(Epigraph, field)))
        values = session.exec(statement).all()
        values = [v for v in values if v]

        if field == "period":
            values = sorted(values, key=parse_period)
            
        field_values[field] = values
    return field_values


@router.get(
    "/fields/filtered",
    response_model=Dict[str, List[Any]],
)
def get_filtered_field_values(
    session: SessionDep,
    filters: Optional[str] = None,
) -> Dict[str, List[str]]:
    """
    Get field values based on current filters.
    """
    base_query = select(Epigraph)

    if filters:
        filters_dict = json.loads(filters)
        for key, value in filters_dict.items():
            if isinstance(value, bool):
                base_query = base_query.where(
                    getattr(Epigraph, key).is_(value)
                )
            elif isinstance(value, dict) and "not" in value and value["not"] is False:
                base_query = base_query.where(
                    getattr(Epigraph, key).isnot(False)
                )
            else:
                base_query = base_query.where(
                    getattr(Epigraph, key) == value
                )

    field_values = {}
    for field in [
        "period",
        "chronology_conjectural",
        "language_level_1",
        "language_level_2",
        "language_level_3",
        "alphabet",
        "script_typology",
        "script_cursus",
        "textual_typology",
        "textual_typology_conjectural",
        "writing_techniques",
        "royal_inscription",
    ]:
        field_specific_query = select(Epigraph)

        if filters:
            filters_dict = json.loads(filters)
            for key, value in filters_dict.items():
                should_apply_filter = False

                if field == "language_level_1":
                    should_apply_filter = key == "dasi_published"
                elif field == "language_level_2":
                    should_apply_filter = key in ["dasi_published", "language_level_1"]
                elif field == "language_level_3":
                    should_apply_filter = key in ["dasi_published", "language_level_1", "language_level_2"]
                else:
                    should_apply_filter = True

                if should_apply_filter:
                    if isinstance(value, bool):
                        field_specific_query = field_specific_query.where(
                            getattr(Epigraph, key).is_(value)
                        )
                    elif isinstance(value, dict) and "not" in value and value["not"] is False:
                        field_specific_query = field_specific_query.where(
                            getattr(Epigraph, key).isnot(False)
                        )
                    else:
                        field_specific_query = field_specific_query.where(
                            getattr(Epigraph, key) == value
                        )

        field_query = field_specific_query.with_only_columns(
            func.distinct(getattr(Epigraph, field))
        ).where(
            getattr(Epigraph, field).is_not(None)
        ).order_by(asc(getattr(Epigraph, field)))

        values = session.exec(field_query).all()
        values = [v for v in values if v]

        if field == "period":
            values = sorted(values, key=parse_period)
            
        field_values[field] = values

    return field_values


@router.post(
    "/",
    response_model=EpigraphOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def create_epigraph(
    epigraph: EpigraphCreate,
    session: SessionDep,
) -> EpigraphOut:
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
    epigraph_id: int,
    epigraph_in: EpigraphUpdate,
    session: SessionDep,
) -> EpigraphOut:
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
    epigraph_id: int,
    session: SessionDep,
) -> None:
    """
    Delete epigraph.
    """
    return crud_epigraph.remove(session, id=epigraph_id)


@router.post(
    "/import",
    dependencies=[Depends(get_current_active_superuser)],
)
def import_epigraphs(
    background_tasks: BackgroundTasks,
    session: SessionDep,
) -> dict:
    """
    Import epigraphs from external api.
    """
    task_service = TaskProgressService(session)
    task = task_service.get_or_create_task("import_epigraphs")

    epigraph_import_service = EpigraphImportService(session, task_service)
    background_tasks.add_task(epigraph_import_service.import_all, task.uuid, 10)
    return {"task_id": task.uuid}


@router.post(
    "/import_range",
    dependencies=[Depends(get_current_active_superuser)],
)
def import_epigraphs_range(
    background_tasks: BackgroundTasks,
    session: SessionDep,
    start_id: int,
    end_id: int,
    dasi_published: bool = None,
    update_existing: bool = False,
) -> dict:
    """
    Import epigraphs from external api in a range.
    """
    task_service = TaskProgressService(session)
    task = task_service.get_or_create_task("import_epigraphs_range")

    epigraph_import_service = EpigraphImportService(session, task_service)
    background_tasks.add_task(
        epigraph_import_service.import_range,
        task_id=task.uuid,
        start_id=start_id,
        end_id=end_id,
        dasi_published=dasi_published,
        rate_limit_delay=10,
        update_existing=update_existing,
    )

    return {"task_id": task.uuid}


@router.get(
    "/import_metrics/{task_id}",
    dependencies=[Depends(get_current_active_superuser_no_error)],
)
def import_epigraphs_metrics(
    task_id: str,
    session: SessionDep,
):
    """
    Get import epigraphs task metrics.
    """
    task_service = TaskProgressService(session)
    return task_service.get_metrics(task_id)


@router.get(
    "/import_images/metrics/{task_id}",
    dependencies=[Depends(get_current_active_superuser_no_error)],
)
def import_images_metrics(
    task_id: str,
    session: SessionDep,
):
    """
    Get import images task metrics and progress.
    """
    task_service = TaskProgressService(session)
    return task_service.get_metrics(task_id)


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
) -> None:
    """
    Transfer fields for every epigraph object that's already in the db.
    """
    epigraph_import_service = EpigraphImportService(session, TaskProgressService(session))
    epigraphs = session.exec(select(Epigraph)).all()

    for epigraph in epigraphs:
        epigraph_update = epigraph_import_service.transfer_fields(epigraph.dasi_object)
        crud_epigraph.update(session, db_obj=epigraph, obj_in=epigraph_update)

    return {"status": "success", "message": "Fields transferred for all epigraphs"}


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
            if site:
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
            if obj:
                crud_epigraph.link_to_object(session, epigraph=epigraph, object_id=obj.id)
    return {"status": "success", "message": "Linked all epigraphs to objects"}


@router.put(
    "/generate_embeddings/all",
    dependencies=[Depends(get_current_active_superuser)],
)
def generate_embeddings_all(
    session: SessionDep,
    background_tasks: BackgroundTasks,
    skip_existing: bool = True
) -> dict:
    """
    Generate embeddings for all epigraphs.
    """
    def generate_all_embeddings_task(session, skip_existing):
        query = select(Epigraph)
        if skip_existing:
            query = query.where(Epigraph.embedding.is_(None))
        epigraphs = session.exec(query).all()
        embeddings_service = EmbeddingsService(session)

        for epigraph in epigraphs:
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

            epigraph_data = epigraph.dict()
            object_data = epigraph.objects[0].dict() if epigraph.objects and len(epigraph.objects) > 0 else {}
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
                logging.warning(f"Epigraph ID {epigraph.id} has no valid text for embedding")
                continue

            embedding = embeddings_service.generate_embedding(combined_text)

            if embedding is None:
                continue

            crud_epigraph.update(
                session,
                db_obj=epigraph,
                obj_in=EpigraphUpdate(embedding=embedding)
            )

    background_tasks.add_task(generate_all_embeddings_task, session, skip_existing)
    return {"status": "started", "message": "Embeddings generation started in background"}


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

    epigraph_data = epigraph.dict()
    object_data = epigraph.objects[0].dict() if epigraph.objects and len(epigraph.objects) > 0 else {}
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

    return EpigraphsOut(epigraphs=result["epigraphs"], count=result["total_count"])


@router.post(
    "/import_images/all",
    dependencies=[Depends(get_current_active_superuser)],
)
async def import_all_images(
    background_tasks: BackgroundTasks,
    session: SessionDep,
    start_rec_id: int = 1,
    image_size: str = "high",
    rate_limit_delay: float = 2.0,
    max_consecutive_failures: int = 50,
) -> dict:
    """
    Import all images from DASI starting from start_rec_id until no more images are found.
    """
    task_service = TaskProgressService(session)
    task = task_service.get_or_create_task("import_all_images")

    def import_all_images_task(task_id: str, session):
        try:
            task_service = TaskProgressService(session)
            epigraph_import_service = EpigraphImportService(session, task_service)

            result = asyncio.run(epigraph_import_service.import_all_images(
                task_id=task_id,
                start_rec_id=start_rec_id,
                image_size=image_size,
                rate_limit_delay=rate_limit_delay,
                max_consecutive_failures=max_consecutive_failures,
            ))

            return result

        except Exception as e:
            task_service = TaskProgressService(session)
            task_service.update_progress(
                uuid=task_id,
                processed=0,
                status="failed",
                error=str(e),
            )
            return {"status": "error", "error": str(e)}

    background_tasks.add_task(import_all_images_task, task.uuid, session)

    return {
        "task_id": task.uuid,
        "message": f"Started importing all images from rec_id {start_rec_id}",
        "parameters": {
            "start_rec_id": start_rec_id,
            "image_size": image_size,
            "rate_limit_delay": rate_limit_delay,
            "max_consecutive_failures": max_consecutive_failures
        }
    }


@router.post(
    "/import_images/range",
    dependencies=[Depends(get_current_active_superuser)],
)
async def import_images_range(
    background_tasks: BackgroundTasks,
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

    task_service = TaskProgressService(session)
    task = task_service.get_or_create_task("import_images_range")

    def import_images_range_task(task_id: str, session):
        try:
            task_service = TaskProgressService(session)
            epigraph_import_service = EpigraphImportService(session, task_service)

            result = asyncio.run(epigraph_import_service.import_images_range(
                task_id=task_id,
                start_id=start_rec_id,
                end_id=end_rec_id,
                image_size=image_size,
                rate_limit_delay=rate_limit_delay,
            ))

            return result

        except Exception as e:
            task_service = TaskProgressService(session)
            task_service.update_progress(
                uuid=task_id,
                processed=0,
                status="failed",
                error=str(e),
            )
            return {"status": "error", "error": str(e)}

    background_tasks.add_task(import_images_range_task, task.uuid, session)
    return {
        "task_id": task.uuid,
        "message": f"Started importing images for rec_ids {start_rec_id} to {end_rec_id}",
        "total_images": end_rec_id - start_rec_id + 1,
        "parameters": {
            "start_rec_id": start_rec_id,
            "end_rec_id": end_rec_id,
            "image_size": image_size,
            "rate_limit_delay": rate_limit_delay
        }
    }


@router.post(
    "/scrape_images/range",
    dependencies=[Depends(get_current_active_superuser)],
)
def scrape_epigraphs_images_range(
    background_tasks: BackgroundTasks,
    session: SessionDep,
    start_dasi_id: int,
    end_dasi_id: int,
    rate_limit_delay: float = 10,
    max_retries: int = 1,
) -> dict:
    """
    Scrape image details for epigraphs in a DASI ID range.
    """
    task_service = TaskProgressService(session)
    task = task_service.get_or_create_task("scrape_epigraphs_images_range")

    def scrape_range_task(task_uuid: str):
        try:
            epigraph_import_service = EpigraphImportService(session, task_service)

            epigraphs_query = select(Epigraph).where(
                Epigraph.dasi_id >= start_dasi_id,
                Epigraph.dasi_id <= end_dasi_id
            )
            epigraphs = session.exec(epigraphs_query).all()

            total_items = len(epigraphs)
            task_service.update_progress(task_uuid, processed=0, total=total_items, status="running")

            success_count = 0
            error_count = 0

            for i, epigraph in enumerate(epigraphs):
                try:
                    epigraph_import_service.scrape_single(
                        dasi_id=epigraph.dasi_id,
                        rate_limit_delay=rate_limit_delay,
                        max_retries=max_retries
                    )
                    success_count += 1
                    task_service.update_progress(
                        task_uuid, 
                        processed=i + 1,
                        total=total_items,
                        status="running"
                    )
                except Exception as e:
                    error_count += 1
                    logging.error(f"Error scraping images for DASI ID {epigraph.dasi_id}: {str(e)}")
                    task_service.update_progress(
                        task_uuid, 
                        processed=i + 1,
                        total=total_items,
                        status="running",
                        error=str(e)
                    )

            final_status = "completed" if error_count == 0 else "completed_with_errors"
            task_service.update_progress(
                task_uuid, 
                processed=total_items, 
                total=total_items, 
                status=final_status
            )

        except Exception as e:
            logging.error(f"Fatal error in scrape_range_task: {str(e)}", exc_info=True)
            task_service.update_progress(
                task_uuid,
                processed=0,
                status="failed",
                error=f"Task failed: {str(e)}"
            )

    background_tasks.add_task(scrape_range_task, task.uuid)
    return {
        "task_id": task.uuid, 
        "range": f"{start_dasi_id}-{end_dasi_id}",
        "max_retries": max_retries
    }


@router.post(
    "/scrape_images/all",
    dependencies=[Depends(get_current_active_superuser)],
)
def scrape_all_epigraphs_images(
    background_tasks: BackgroundTasks,
    session: SessionDep,
    rate_limit_delay: float = 10,
    update_existing: bool = False,
    max_retries: int = 1,
) -> dict:
    """
    Scrape image details for all epigraphs.
    """
    task_service = TaskProgressService(session)
    task = task_service.get_or_create_task("scrape_all_epigraphs_images")

    def scrape_all_task(task_uuid: str):
        try:
            epigraph_import_service = EpigraphImportService(session, task_service)

            if update_existing:
                epigraphs_query = select(Epigraph)
            else:
                epigraphs_query = select(Epigraph).where(Epigraph.images.is_(None))

            epigraphs = session.exec(epigraphs_query).all()

            total_items = len(epigraphs)
            task_service.update_progress(task_uuid, processed=0, total=total_items, status="running")

            success_count = 0
            error_count = 0

            for i, epigraph in enumerate(epigraphs):
                try:
                    epigraph_import_service.scrape_single(
                        dasi_id=epigraph.dasi_id,
                        rate_limit_delay=rate_limit_delay,
                        max_retries=max_retries
                    )
                    success_count += 1
                    task_service.update_progress(
                        task_uuid, 
                        processed=i + 1,
                        total=total_items,
                        status="running"
                    )
                except Exception as e:
                    error_count += 1
                    logging.error(f"Error scraping images for DASI ID {epigraph.dasi_id}: {str(e)}")
                    task_service.update_progress(
                        task_uuid, 
                        processed=i + 1,
                        total=total_items,
                        status="running",
                        error=str(e)
                    )

            final_status = "completed" if error_count == 0 else "completed_with_errors"
            task_service.update_progress(
                task_uuid, 
                processed=total_items, 
                total=total_items, 
                status=final_status
            )

        except Exception as e:
            logging.error(f"Fatal error in scrape_all_task: {str(e)}", exc_info=True)
            task_service.update_progress(
                task_uuid,
                processed=0,
                status="failed",
                error=f"Task failed: {str(e)}"
            )

    background_tasks.add_task(scrape_all_task, task.uuid)

    if update_existing:
        total_count = len(session.exec(select(Epigraph)).all())
        message = "all epigraphs"
    else:
        total_count = len(session.exec(select(Epigraph).where(Epigraph.images.is_(None))).all())
        message = "epigraphs not yet scraped (images is null)"

    return {
        "task_id": task.uuid, 
        "total_epigraphs": total_count,
        "update_existing": update_existing,
        "max_retries": max_retries,
        "message": f"Started scraping images for {message}"
    }


@router.post(
    "/scrape_images/{dasi_id}",
    response_model=EpigraphOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def scrape_epigraph_images_single(
    dasi_id: int,
    session: SessionDep,
    rate_limit_delay: float = 10,
    max_retries: int = 1,
) -> EpigraphOut:
    """
    Scrape image details for a single epigraph by DASI ID.
    """
    task_service = TaskProgressService(session)
    epigraph_import_service = EpigraphImportService(session, task_service)
    
    try:
        updated_epigraph = epigraph_import_service.scrape_single(
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
            Epigraph.images.isnot(None),
            text("jsonb_array_length(images) > 0")
        )
    ).all()

    moved_count = 0
    updated_epigraphs = 0

    for epigraph in epigraphs:
        updated_images = []
        epigraph_updated = False

        for image in epigraph.images:
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