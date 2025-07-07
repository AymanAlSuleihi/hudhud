import json
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlmodel import select, func, asc, desc

from app.api.deps import (
    SessionDep,
    get_current_active_superuser,
    get_current_active_superuser_no_error,
)
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
from app.models.links import EpigraphObjectLink, ObjectSiteLink
from app.services.object.import_service import ObjectImportService
from app.services.task_progress import TaskProgressService


router = APIRouter()


@router.get(
    "/",
    response_model=ObjectsOut,
)
def read_objects(
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
    sort_field: Optional[str] = None,
    sort_order: Optional[str] = None,
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
    object_id: int,
    session: SessionDep,
) -> ObjectOut:
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
    dasi_id: int,
    session: SessionDep,
) -> ObjectOut:
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
    dependencies=[Depends(get_current_active_superuser)],
)
def create_object(
    object_in: ObjectCreate,
    session: SessionDep,
) -> ObjectOut:
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
    object_id: int,
    object_in: ObjectUpdate,
    session: SessionDep,
) -> ObjectOut:
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
    object_id: int,
    session: SessionDep,
) -> ObjectOut:
    """
    Delete an object by ID.
    """
    obj = crud_object.get(session, id=object_id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Object not found"
        )
    obj = crud_object.remove(session, id=object_id)
    return obj


@router.post(
    "/import",
    dependencies=[Depends(get_current_active_superuser)],
)
def import_objects(
    background_tasks: BackgroundTasks,
    session: SessionDep,
) -> dict:
    """
    Import objects from external api.
    """
    task_service = TaskProgressService(session)
    task = task_service.get_or_create_task("import_objects")

    object_import_service = ObjectImportService(session, task_service)
    background_tasks.add_task(object_import_service.import_all, task.uuid, 10)

    return {"task_id": task.uuid}


@router.post(
    "/import_range",
    dependencies=[Depends(get_current_active_superuser)],
)
def import_objects_range(
    background_tasks: BackgroundTasks,
    session: SessionDep,
    start_id: int,
    end_id: int,
    dasi_published: Optional[bool] = None,
) -> dict:
    """
    Import objects from external api in a range.
    """
    task_service = TaskProgressService(session)
    task = task_service.get_or_create_task("import_objects_range")

    object_import_service = ObjectImportService(session, task_service)
    background_tasks.add_task(
        object_import_service.import_range,
        task.uuid,
        start_id,
        end_id,
        dasi_published,
        10
    )

    return {"task_id": task.uuid}


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
) -> None:
    """
    Transfer fields for every object that's already in the db.
    """
    object_import_service = ObjectImportService(session, TaskProgressService(session))
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
            if site:
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
            if epigraph:
                crud_object.link_to_epigraph(session, obj=obj, epigraph_id=epigraph.id)
    return {"status": "success", "message": "Linked all objects to their epigraphs"}
