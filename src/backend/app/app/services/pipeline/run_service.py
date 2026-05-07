from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.crud.crud_pipeline_run import pipeline_run as crud_pipeline_run
from app.models.pipeline_run import (
    PipelineRun,
    PipelineRunCreate,
    PipelineStatus,
)


class PipelineRunService:
    def __init__(self, session: Session):
        self.session = session

    def get_run(self, uuid: str) -> Optional[PipelineRun]:
        return crud_pipeline_run.get_by_uuid(self.session, uuid=uuid)

    def get_unfinished_run(self, pipeline_name: str) -> Optional[PipelineRun]:
        return crud_pipeline_run.get_unfinished_run(
            self.session,
            pipeline_name=pipeline_name,
        )

    def create_run(
        self,
        pipeline_name: str,
        *,
        trigger: str,
        parameters: Optional[dict] = None,
    ) -> PipelineRun:
        return crud_pipeline_run.create(
            self.session,
            obj_in=PipelineRunCreate(
                pipeline_name=pipeline_name,
                trigger=trigger,
                parameters=parameters or {},
            ),
        )

    def update_run(
        self,
        uuid: str,
        *,
        status: Optional[str] = None,
        current_step: Optional[str] = None,
        celery_task_id: Optional[str] = None,
        total_items: Optional[int] = None,
        processed_items: Optional[int] = None,
        skipped_items: Optional[int] = None,
        failed_items: Optional[int] = None,
        parameters: Optional[dict] = None,
        metrics: Optional[dict] = None,
        error: Optional[str] = None,
        started_at: Optional[datetime] = None,
        finished_at: Optional[datetime] = None,
        merge_metrics: bool = False,
    ) -> PipelineRun:
        run = self.get_run(uuid)
        if not run:
            raise ValueError(f"Pipeline run {uuid} not found")

        update_data = {}
        if status is not None:
            update_data["status"] = status
        if current_step is not None:
            update_data["current_step"] = current_step
        if celery_task_id is not None:
            update_data["celery_task_id"] = celery_task_id
        if total_items is not None:
            update_data["total_items"] = total_items
        if processed_items is not None:
            update_data["processed_items"] = processed_items
        if skipped_items is not None:
            update_data["skipped_items"] = skipped_items
        if failed_items is not None:
            update_data["failed_items"] = failed_items
        if parameters is not None:
            update_data["parameters"] = parameters
        if metrics is not None:
            if merge_metrics:
                update_data["metrics"] = {**(run.metrics or {}), **metrics}
            else:
                update_data["metrics"] = metrics
        if error is not None:
            update_data["error"] = error
        if started_at is not None:
            update_data["started_at"] = started_at
        if finished_at is not None:
            update_data["finished_at"] = finished_at

        return crud_pipeline_run.update(self.session, db_obj=run, obj_in=update_data)

    def mark_queued(self, uuid: str, *, celery_task_id: str) -> PipelineRun:
        return self.update_run(
            uuid,
            status=PipelineStatus.QUEUED,
            current_step="queued",
            celery_task_id=celery_task_id,
        )

    def mark_running(
        self,
        uuid: str,
        *,
        current_step: str,
    ) -> PipelineRun:
        run = self.get_run(uuid)
        if not run:
            raise ValueError(f"Pipeline run {uuid} not found")

        return self.update_run(
            uuid,
            status=PipelineStatus.RUNNING,
            current_step=current_step,
            started_at=run.started_at or datetime.now(timezone.utc),
        )

    def mark_completed(
        self,
        uuid: str,
        *,
        current_step: str = "completed",
        metrics: Optional[dict] = None,
        merge_metrics: bool = False,
    ) -> PipelineRun:
        return self.update_run(
            uuid,
            status=PipelineStatus.COMPLETED,
            current_step=current_step,
            metrics=metrics,
            merge_metrics=merge_metrics,
            finished_at=datetime.now(timezone.utc),
            error=None,
        )

    def mark_failed(self, uuid: str, *, error: str, current_step: Optional[str] = None) -> PipelineRun:
        return self.update_run(
            uuid,
            status=PipelineStatus.FAILED,
            current_step=current_step,
            error=error,
            finished_at=datetime.now(timezone.utc),
        )
