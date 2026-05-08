from sqlmodel import Session

from app.core.celery_app import celery_app
from app.core.config import settings
from app.db.engine import engine
from app.models.pipeline_run import PipelineTrigger
from app.services.enrichment.embeddings import EmbeddingsService
from app.services.pipeline.orchestrator import DasiPipelineOrchestrator
from app.services.pipeline.run_service import PipelineRunService


@celery_app.task(name="app.workers.pipeline_tasks.run_dasi_sync_pipeline", bind=True)
def run_dasi_sync_pipeline(self, pipeline_run_uuid: str, parameters: dict | None = None) -> str:
    with Session(engine) as session:
        orchestrator = DasiPipelineOrchestrator(session)
        orchestrator.run(pipeline_run_uuid, parameters or {})

    return pipeline_run_uuid


@celery_app.task(name="app.workers.pipeline_tasks.dispatch_nightly_dasi_sync")
def dispatch_nightly_dasi_sync() -> str:
    with Session(engine) as session:
        pipeline_runs = PipelineRunService(session)
        existing_run = pipeline_runs.get_unfinished_run(DasiPipelineOrchestrator.PIPELINE_NAME)
        if existing_run:
            return str(existing_run.uuid)

        parameters = {
            "import_sites": True,
            "import_objects": True,
            "import_epigraphs": True,
            "incremental": True,
            "update_existing": True,
            "run_chunking": True,
            "generate_embeddings": True,
            "reindex_search": True,
            "rechunk": False,
            "rate_limit_delay": settings.PIPELINE_DEFAULT_RATE_LIMIT_DELAY_SECONDS,
        }
        run = pipeline_runs.create_run(
            DasiPipelineOrchestrator.PIPELINE_NAME,
            trigger=PipelineTrigger.SCHEDULED,
            parameters=parameters,
        )
        async_result = run_dasi_sync_pipeline.apply_async(
            args=[str(run.uuid), parameters],
            queue="pipeline",
        )
        pipeline_runs.mark_queued(str(run.uuid), celery_task_id=async_result.id)
        return str(run.uuid)


@celery_app.task(name="app.workers.pipeline_tasks.flush_pending_chunk_embeddings")
def flush_pending_chunk_embeddings() -> dict:
    with Session(engine) as session:
        return EmbeddingsService(session).flush_pending_chunk_embeddings(force=False)


run_epigraph_sync_pipeline = run_dasi_sync_pipeline
dispatch_nightly_epigraph_sync = dispatch_nightly_dasi_sync
