from sqlmodel import Session

from app.models.pipeline_run import PipelineRun, PipelineTrigger
from app.services.pipeline.orchestrator import DasiPipelineOrchestrator
from app.services.pipeline.run_service import PipelineRunService
from app.workers.pipeline_tasks import run_dasi_sync_pipeline


def dispatch_dasi_pipeline(
    session: Session,
    *,
    parameters: dict,
    trigger: str = PipelineTrigger.MANUAL,
) -> PipelineRun:
    pipeline_runs = PipelineRunService(session)
    pipeline_run = pipeline_runs.create_run(
        DasiPipelineOrchestrator.PIPELINE_NAME,
        trigger=trigger,
        parameters=parameters,
    )
    async_result = run_dasi_sync_pipeline.apply_async(
        args=[str(pipeline_run.uuid), parameters],
        queue="pipeline",
    )
    return pipeline_runs.mark_queued(
        str(pipeline_run.uuid),
        celery_task_id=async_result.id,
    )
