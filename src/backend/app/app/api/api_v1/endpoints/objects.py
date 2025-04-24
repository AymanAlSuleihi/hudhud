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
