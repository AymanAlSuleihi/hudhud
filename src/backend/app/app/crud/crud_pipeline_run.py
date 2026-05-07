from typing import Optional

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.pipeline_run import (
    PipelineRun,
    PipelineRunCreate,
    PipelineRunUpdate,
    PipelineStatus,
)


class CRUDPipelineRun(CRUDBase[PipelineRun, PipelineRunCreate, PipelineRunUpdate]):
    def get_by_uuid(self, db: Session, *, uuid: str) -> Optional[PipelineRun]:
        return db.query(self.model).filter(self.model.uuid == uuid).first()

    def get_unfinished_run(self, db: Session, *, pipeline_name: str) -> Optional[PipelineRun]:
        return (
            db.query(self.model)
            .filter(
                self.model.pipeline_name == pipeline_name,
                self.model.status.in_(
                    [
                        PipelineStatus.PENDING,
                        PipelineStatus.QUEUED,
                        PipelineStatus.RUNNING,
                    ]
                ),
            )
            .order_by(self.model.created_at.desc())
            .first()
        )


pipeline_run = CRUDPipelineRun(PipelineRun)
