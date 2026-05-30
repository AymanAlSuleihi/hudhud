from app.models.pipeline_run import PipelineStatus
from app.services.pipeline import dispatch as pipeline_dispatch
from app.services.pipeline.run_service import PipelineRunService


def test_dispatch_dasi_pipeline_runs_search_only_reindex_inline(session, monkeypatch):
    parameters = {
        "import_sites": False,
        "import_objects": False,
        "import_epigraphs": False,
        "run_chunking": False,
        "generate_embeddings": False,
        "reindex_search": True,
    }
    captured = {}

    def fake_run(self, pipeline_run_uuid: str, payload: dict | None = None):
        captured["pipeline_run_uuid"] = pipeline_run_uuid
        captured["parameters"] = payload
        PipelineRunService(session).mark_completed(
            pipeline_run_uuid,
            metrics={"indexing": {"enabled": True, "indexed": 42}},
        )

    def fail_apply_async(*args, **kwargs):
        raise AssertionError("apply_async should not be called for search-only reindex")

    monkeypatch.setattr(pipeline_dispatch.DasiPipelineOrchestrator, "run", fake_run)
    monkeypatch.setattr(pipeline_dispatch.run_dasi_sync_pipeline, "apply_async", fail_apply_async)

    result = pipeline_dispatch.dispatch_dasi_pipeline(session, parameters=parameters)

    assert captured == {
        "pipeline_run_uuid": str(result.uuid),
        "parameters": parameters,
    }
    assert result.status == PipelineStatus.COMPLETED
    assert result.celery_task_id is None
    assert result.metrics == {"indexing": {"enabled": True, "indexed": 42}}


def test_dispatch_dasi_pipeline_queues_non_inline_runs(session, monkeypatch):
    parameters = {"reindex_search": True}
    captured = {}

    class DummyAsyncResult:
        id = "celery-task-123"

    def fail_run(self, pipeline_run_uuid: str, payload: dict | None = None):
        raise AssertionError("non-inline pipeline dispatch should not run synchronously")

    def fake_apply_async(*, args, queue):
        captured["args"] = args
        captured["queue"] = queue
        return DummyAsyncResult()

    monkeypatch.setattr(pipeline_dispatch.DasiPipelineOrchestrator, "run", fail_run)
    monkeypatch.setattr(pipeline_dispatch.run_dasi_sync_pipeline, "apply_async", fake_apply_async)

    result = pipeline_dispatch.dispatch_dasi_pipeline(session, parameters=parameters)

    assert captured == {
        "args": [str(result.uuid), parameters],
        "queue": "pipeline",
    }
    assert result.status == PipelineStatus.QUEUED
    assert result.celery_task_id == "celery-task-123"