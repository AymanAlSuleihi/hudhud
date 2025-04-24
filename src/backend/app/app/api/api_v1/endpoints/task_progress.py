from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlmodel import select, func, asc, desc

from app.api.deps import (
    SessionDep,
    get_current_active_superuser,
    get_current_active_superuser_no_error,
    get_task_progress_service,
)
from app.crud.crud_task_progress import task_progress as crud_task_progress
from app.models.task_progress import (
    TaskProgress,
    TaskProgressCreate,
    TaskProgressUpdate,
    TaskProgressOut,
    TaskProgresssOut,
)
from app.services.task_progress import TaskProgressService

router = APIRouter()


@router.get(
    "/",
    response_model=TaskProgresssOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def read_task_progress(
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
    sort_field: Optional[str] = None,
    sort_order: Optional[str] = None,
    filters: Optional[str] = None,
) -> TaskProgresssOut:
    """
    Retrieve task progress.
    """
    total_count_statement = select(func.count()).select_from(TaskProgress)
    total_count = session.exec(total_count_statement).one()

    task_progress_statement = select(TaskProgress).offset(skip).limit(limit)
    task_progress = session.exec(task_progress_statement).all()

    return TaskProgresssOut(task_progress=task_progress, count=total_count)


@router.get(
    "/{task_id}",
    response_model=TaskProgressOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def read_task_progress_by_id(
    task_id: int,
    session: SessionDep,
) -> TaskProgressOut:
    """
    Retrieve task progress by id.
    """
    task_progress = crud_task_progress.get(session, id=task_id)
    if not task_progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task progress not found",
        )
    return task_progress


@router.get(
    "/uuid/{uuid}",
    response_model=TaskProgressOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def read_task_progress_by_uuid(
    uuid: str,
    session: SessionDep,
) -> TaskProgressOut:
    """
    Retrieve task progress by uuid.
    """
    task_progress = crud_task_progress.get_by_uuid(session, uuid=uuid)
    if not task_progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task progress not found",
        )
    return task_progress


@router.get(
    "/uuid/{uuid}/metrics",
    response_model=dict,
    dependencies=[Depends(get_current_active_superuser)],
)
def read_task_progress_metrics(
    uuid: str,
    session: SessionDep,
    task_progress_service: TaskProgressService = Depends(get_task_progress_service),
) -> dict:
    """
    Retrieve task progress metrics.
    """
    return task_progress_service.get_metrics(uuid)


@router.post(
    "/",
    response_model=TaskProgressOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def create_task_progress(
    task_progress_in: TaskProgressCreate,
    session: SessionDep,
) -> TaskProgressOut:
    """
    Create new task progress.
    """
    task_progress = crud_task_progress.create(session, obj_in=task_progress_in)
    return task_progress


@router.put(
    "/{task_id}",
    response_model=TaskProgressOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def update_task_progress(
    task_id: int,
    task_progress_in: TaskProgressUpdate,
    session: SessionDep,
) -> TaskProgressOut:
    """
    Update task progress.
    """
    task_progress = crud_task_progress.update(
        session,
        db_obj=task_id,
        obj_in=task_progress_in,
    )
    return task_progress


@router.delete(
    "/{task_id}",
    dependencies=[Depends(get_current_active_superuser)],
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_task_progress(
    task_id: int,
    session: SessionDep,
) -> None:
    """
    Delete task progress.
    """
    return crud_task_progress.remove(session, id=task_id)
