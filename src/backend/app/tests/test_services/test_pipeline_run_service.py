from app.models.pipeline_run import PipelineStatus, PipelineTrigger
from app.services.pipeline.run_service import PipelineRunService


def test_pipeline_run_service_lifecycle(session):
    service = PipelineRunService(session)

    run = service.create_run(
        "dasi_sync",
        trigger=PipelineTrigger.MANUAL,
        parameters={"start_id": 1, "end_id": 5},
    )

    assert run.status == PipelineStatus.PENDING
    assert run.parameters["start_id"] == 1

    run = service.mark_queued(str(run.uuid), celery_task_id="task-123")
    assert run.status == PipelineStatus.QUEUED
    assert run.celery_task_id == "task-123"

    run = service.mark_running(
        str(run.uuid),
        current_step="import",
    )
    assert run.status == PipelineStatus.RUNNING
    assert run.current_step == "import"
    assert run.started_at is not None

    run = service.update_run(
        str(run.uuid),
        total_items=5,
        processed_items=3,
        skipped_items=1,
        metrics={"import": {"total_imported": 3}},
        merge_metrics=True,
    )
    assert run.total_items == 5
    assert run.processed_items == 3
    assert run.metrics["import"]["total_imported"] == 3

    run = service.mark_completed(
        str(run.uuid),
        metrics={"indexing": {"indexed": 3}},
        merge_metrics=True,
    )
    assert run.status == PipelineStatus.COMPLETED
    assert run.finished_at is not None
    assert run.metrics["indexing"]["indexed"] == 3
