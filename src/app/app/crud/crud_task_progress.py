from typing import List, Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.task_progress import TaskProgress, TaskProgressCreate, TaskProgressUpdate, TaskStatus


class CRUDTaskProgress(CRUDBase[TaskProgress, TaskProgressCreate, TaskProgressUpdate]):
    def get_by_uuid(self, db: Session, *, uuid: str) -> Optional[TaskProgress]:
        return db.query(self.model).filter(self.model.uuid == uuid).first()

    def get_unfinished_task(self, db: Session, *, task_type: str) -> Optional[TaskProgress]:
        return db.query(self.model).filter(
            self.model.task_type == task_type,
            self.model.status.in_([TaskStatus.PENDING, TaskStatus.RUNNING])
        ).order_by(self.model.created_at.desc()).first()


task_progress = CRUDTaskProgress(TaskProgress)
