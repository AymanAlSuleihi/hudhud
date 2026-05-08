from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import select, func

from app.api.deps import (
    SessionDep,
    get_current_active_superuser,
)
from app.api.params import DasiIdPath, PageLimit, PageOffset, ResourceIdPath, SortFieldParam, SortOrderParam
from app.crud.crud_object import obj as crud_object
from app.crud.crud_site import site as crud_site
from app.crud.crud_epigraph import epigraph as crud_epigraph
from app.models.object import (
    Object,
    ObjectCreate,
    ObjectUpdate,
    ObjectOut,
    ObjectsOut,
)
from app.models.pipeline_run import PipelineRun, PipelineRunOut
from app.services.importers.object import ObjectImportService
from app.services.pipeline.dispatch import dispatch_dasi_pipeline


router = APIRouter(prefix="/objects", tags=["objects"])


@router.get(
    "/",
    response_model=ObjectsOut,
)
def read_objects(
    session: SessionDep,
    skip: PageOffset = 0,
    limit: PageLimit = 100,
    sort_field: SortFieldParam = None,
    sort_order: SortOrderParam = None,
    filters: Optional[str] = None,
) -> ObjectsOut:
    """
    Retrieve objects.
    """
    total_count_statement = select(func.count()).select_from(Object)
    total_count = session.exec(total_count_statement).one()

    objects_statement = select(Object).offset(skip).limit(limit)
    objects = session.exec(objects_statement).all()

    return ObjectsOut(objects=objects, count=total_count)


@router.get(
    "/{object_id}",
    response_model=ObjectOut,
)
def read_object(
    object_id: ResourceIdPath,
    session: SessionDep,
) -> Object:
    """
    Retrieve a single object by ID.
    """
    obj = crud_object.get(session, id=object_id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Object not found"
        )
    return obj


@router.get(
    "/dasi_id/{dasi_id}",
    response_model=ObjectOut,
)
def read_object_by_dasi_id(
    dasi_id: DasiIdPath,
    session: SessionDep,
) -> Object:
    """
    Retrieve a single object by DASI ID.
    """
    obj = crud_object.get_by_dasi_id(session, dasi_id=dasi_id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Object not found",
        )
    return obj


@router.post(
    "/",
    response_model=ObjectOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_active_superuser)],
)
def create_object(
    object_in: ObjectCreate,
    session: SessionDep,
) -> Object:
    """
    Create a new object.
    """
    obj = crud_object.create(session, obj_in=object_in)
    return obj


@router.put(
    "/{object_id}",
    response_model=ObjectOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def update_object(
    object_id: ResourceIdPath,
    object_in: ObjectUpdate,
    session: SessionDep,
) -> Object:
    """
    Update an existing object.
    """
    obj = crud_object.get(session, id=object_id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Object not found"
        )
    obj = crud_object.update(session, db_obj=obj, obj_in=object_in)
    return obj


@router.delete(
    "/{object_id}",
    response_model=ObjectOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def delete_object(
    object_id: ResourceIdPath,
    session: SessionDep,
) -> Object:
    """
    Delete an object by ID.
    """
    obj = crud_object.get(session, id=object_id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Object not found"
        )
    deleted_obj = crud_object.remove(session, id=object_id)
    if deleted_obj is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Object removal failed",
        )
    return deleted_obj


@router.post(
    "/import",
    response_model=PipelineRunOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def import_objects(
    session: SessionDep,
) -> PipelineRun:
    """
    Import objects from external api.
    """
    return dispatch_dasi_pipeline(
        session,
        parameters={
            "import_sites": False,
            "import_objects": True,
            "import_epigraphs": False,
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
def import_objects_range(
    session: SessionDep,
    start_id: Annotated[int, Query(ge=1)],
    end_id: Annotated[int, Query(ge=1)],
    dasi_published: Optional[bool] = None,
    update_existing: bool = False,
) -> PipelineRun:
    """
    Import objects from external api in a range.
    """
    return dispatch_dasi_pipeline(
        session,
        parameters={
            "import_sites": False,
            "import_objects": True,
            "import_epigraphs": False,
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
def get_dasi_object_fields(
    session: SessionDep,
):
    """
    Get list of fields in all site.dasi_object jsonb column.
    """
    fields_statement = select(
        func.jsonb_object_keys(Object.dasi_object)
    ).distinct()
    fields = session.exec(fields_statement).all()
    return fields


@router.get(
    "/fields/dasi_object/missing",
    dependencies=[Depends(get_current_active_superuser)],
)
def get_dasi_object_missing_fields(
    session: SessionDep,
):
    """
    Get list of fields which are not in all Object.dasi_object jsonb column.
    """
    fields_statement = select(
        func.jsonb_object_keys(Object.dasi_object)
    ).distinct()
    fields = session.exec(fields_statement).all()

    all_fields = set(fields)
    missing_fields = set()
    for field in all_fields:
        field_statement = select(
            func.count()
        ).where(
            ~func.jsonb_exists(Object.dasi_object, field)
        )
        count = session.exec(field_statement).one()
        if count > 0:
            missing_fields.add(field)
    return missing_fields


@router.post(
    "/transfer_fields",
    dependencies=[Depends(get_current_active_superuser)],
)
def transfer_fields(
    session: SessionDep,
) -> dict[str, str]:
    """
    Transfer fields for every object that's already in the db.
    """
    object_import_service = ObjectImportService(session)
    objects = session.exec(select(Object)).all()

    for obj in objects:
        object_update = object_import_service.transfer_fields(obj.dasi_object)
        crud_object.update(session, db_obj=obj, obj_in=object_update)

    return {"status": "success", "message": "Fields transferred for all objects"}


@router.put(
    "/link_to_sites/all",
    dependencies=[Depends(get_current_active_superuser)],
)
def link_to_sites(
    session: SessionDep,
) -> dict:
    """
    Link all objects to their sites.
    """
    objects = session.exec(select(Object)).all()
    for obj in objects:
        site_list = obj.dasi_object.get("sites", [])
        site_dasi_ids = [
            int(site["@id"].split("/")[-1])
            for site in site_list
            if "@id" in site
        ]
        for site_dasi_id in site_dasi_ids:
            site = crud_site.get_by_dasi_id(session, dasi_id=site_dasi_id)
            if site and site.id is not None:
                crud_object.link_to_site(session, obj=obj, site_id=site.id)
    return {"status": "success", "message": "Linked all objects to their sites"}


@router.put(
    "/link_to_epigraphs/all",
    dependencies=[Depends(get_current_active_superuser)],
)
def link_to_epigraphs(
    session: SessionDep,
) -> dict:
    """
    Link all objects to their epigraphs.
    """
    objects = session.exec(select(Object)).all()
    for obj in objects:
        epigraph_list = obj.dasi_object.get("epigraphs", [])
        epigraph_dasi_ids = [
            int(epigraph["@id"].split("/")[-1])
            for epigraph in epigraph_list
            if "@id" in epigraph
        ]
        for epigraph_dasi_id in epigraph_dasi_ids:
            epigraph = crud_epigraph.get_by_dasi_id(session, dasi_id=epigraph_dasi_id)
            if epigraph and epigraph.id is not None:
                crud_object.link_to_epigraph(session, obj=obj, epigraph_id=epigraph.id)
    return {"status": "success", "message": "Linked all objects to their epigraphs"}
