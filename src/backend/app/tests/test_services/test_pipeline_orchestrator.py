from typing import Any, cast

from app.services.pipeline.orchestrator import DasiPipelineOrchestrator


def test_build_import_plan_defaults_to_all_stages(session):
    orchestrator = DasiPipelineOrchestrator(session)

    plan = orchestrator._build_import_plan({})

    assert [stage_name for stage_name, _, _ in plan] == ["sites", "objects", "epigraphs"]


def test_build_import_plan_can_limit_to_epigraphs_only(session):
    orchestrator = DasiPipelineOrchestrator(session)

    plan = orchestrator._build_import_plan(
        {
            "import_sites": False,
            "import_objects": False,
            "import_epigraphs": True,
        }
    )

    assert [stage_name for stage_name, _, _ in plan] == ["epigraphs"]


def test_run_import_stage_uses_incremental_mode(session):
    calls = []

    class FakeImportService:
        def __init__(self, session):
            self.session = session

        def import_all(self, **kwargs):
            raise AssertionError("full import should not be used")

        def import_range(self, **kwargs):
            raise AssertionError("range import should not be used")

        def import_incremental(self, **kwargs):
            calls.append(kwargs)
            return {
                "status": "success",
                "processed_items": 2,
                "skipped_items": 1,
                "failed_items": 0,
                "total_items": 3,
            }

    orchestrator = DasiPipelineOrchestrator(session)
    orchestrator.IMPORT_STAGE_CONFIG = cast(Any, (("sites", "import_sites", FakeImportService),))
    run = orchestrator.pipeline_runs.create_run(
        orchestrator.PIPELINE_NAME,
        trigger="manual",
        parameters={},
    )

    metrics, totals = orchestrator._run_import_stage(
        run_uuid=str(run.uuid),
        stage_name="sites",
        parameters={"incremental": True, "update_existing": True, "rate_limit_delay": 0},
    )

    assert calls == [{"rate_limit_delay": 0, "update_existing": True}]
    assert metrics["status"] == "success"
    assert totals == {
        "total_items": 3,
        "processed_items": 2,
        "skipped_items": 1,
        "failed_items": 0,
    }
