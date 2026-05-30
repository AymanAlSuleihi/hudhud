from sqlmodel import Session

from app.models.pipeline_run import PipelineRun, PipelineTrigger
from app.services.pipeline.orchestrator import DasiPipelineOrchestrator
from app.services.pipeline.run_service import PipelineRunService
from app.workers.pipeline_tasks import run_dasi_sync_pipeline


INLINE_SEARCH_REINDEX_DISABLED_STEPS = (
    "import_sites",
    "import_objects",
    "import_epigraphs",
    "run_chunking",
    "generate_embeddings",
)


def _should_run_inline(parameters: dict) -> bool:
    return parameters.get("reindex_search", True) and all(
        parameters.get(step, True) is False
        for step in INLINE_SEARCH_REINDEX_DISABLED_STEPS
    )


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

    if _should_run_inline(parameters):
        DasiPipelineOrchestrator(session).run(str(pipeline_run.uuid), parameters)
        refreshed_run = pipeline_runs.get_run(str(pipeline_run.uuid))
        return refreshed_run or pipeline_run

    async_result = run_dasi_sync_pipeline.apply_async(
        args=[str(pipeline_run.uuid), parameters],
        queue="pipeline",
    )
    return pipeline_runs.mark_queued(
        str(pipeline_run.uuid),
        celery_task_id=async_result.id,
    )
