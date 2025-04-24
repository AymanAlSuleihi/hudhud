from typing import Optional
from sqlalchemy.orm import Session

from app.models.task_progress import TaskProgress, TaskProgressCreate, TaskProgressUpdate, TaskStatus
from app.crud.crud_task_progress import task_progress as crud_task_progress


class TaskProgressService:
    def __init__(self, session: Session):
        self.session = session

    def create_task(self, task_type: str) -> TaskProgress:
        task = crud_task_progress.create(self.session, obj_in=TaskProgressCreate(task_type=task_type))
        return task

    def get_or_create_task(self, task_type: str) -> TaskProgress:
        task = crud_task_progress.get_unfinished_task(self.session, task_type=task_type)
        if task:
            self.update_progress(
                uuid=task.uuid,
                processed=task.processed_items,
                status=TaskStatus.RUNNING
            )
            return task
        return self.create_task(task_type)

    def get_task(self, uuid: str) -> TaskProgress:
        task = crud_task_progress.get_by_uuid(self.session, uuid=uuid)
        return task

    def update_progress(
        self,
        uuid: str,
        processed: int,
        total: Optional[int] = None,
        status: Optional[str] = None,
        error: Optional[str] = None,
    ):
        task = crud_task_progress.get_by_uuid(self.session, uuid=uuid)
        if not task:
            return
        task = crud_task_progress.update(
            self.session,
            db_obj=task,
            obj_in=TaskProgressUpdate(
                total_items=total or task.total_items,
                processed_items=processed,
                status=status or task.status,
                error=error or task.error,
            ),
        )
        return task

    def get_metrics(self, uuid: str) -> dict:
        task = crud_task_progress.get_by_uuid(self.session, uuid=uuid)
        if not task:
            return

        elapsed_time = task.updated_at - task.created_at
        if task.total_items:
            progress = task.processed_items / task.total_items
        else:
            progress = 0

        rate = task.processed_items / elapsed_time.total_seconds()

        eta = None
        if progress > 0:
            eta = elapsed_time / progress - elapsed_time

        return {
            "progress_percent": progress * 100,
            "elapsed_time_minutes": elapsed_time.total_seconds() / 60,
            "rate_items_per_second": rate,
            "eta_minutes": eta.total_seconds() / 60 if eta else None,
            "status": task.status,
        }
