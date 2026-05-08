import uuid as uuid_pkg

from sqlmodel import select

from app.models.dasi_sync import DasiImportCursor, DasiSourceSnapshot
from app.models.pipeline_run import PipelineRun
from app.models.site import Site
from app.services.importers.site import SiteImportService
from app.workers import pipeline_tasks


class MockResponse:
    def __init__(self, payload):
        self._payload = payload

    def json(self):
        return self._payload

    def raise_for_status(self):
        return None


def test_site_import_incremental_uses_cursor_and_snapshots(session, monkeypatch):
    service = SiteImportService(session)
    page_calls = []
    phase = {"value": 1}

    def listing_page(page: int):
        if phase["value"] == 1:
            pages = {
                1: {
                    "totalItems": 4,
                    "member": [
                        {"@id": "http://localhost/test-dasi/sites/1"},
                        {"@id": "http://localhost/test-dasi/sites/2"},
                    ],
                    "view": {"next": "page=2"},
                },
                2: {
                    "totalItems": 4,
                    "member": [
                        {"@id": "http://localhost/test-dasi/sites/3"},
                        {"@id": "http://localhost/test-dasi/sites/4"},
                    ],
                    "view": {},
                },
            }
            return pages[page]

        pages = {
            2: {
                "totalItems": 5,
                "member": [
                    {"@id": "http://localhost/test-dasi/sites/3"},
                    {"@id": "http://localhost/test-dasi/sites/4"},
                    {"@id": "http://localhost/test-dasi/sites/5"},
                ],
                "view": {},
            },
        }
        return pages.get(page, {"totalItems": 5, "member": [], "view": {}})

    def site_detail(item_id: int):
        return {
            "uri": f"/sites/{item_id}",
            "modernName": f"Modern Site {item_id}",
            "ancientName": f"Ancient Site {item_id}",
            "license": "CC-BY",
            "lastModified": "2026-05-07",
            "epigraphs": [],
            "objects": [],
        }

    def fake_get(url, params=None, timeout=30):
        if params and "page" in params:
            page_calls.append(params["page"])
            return MockResponse(listing_page(params["page"]))

        item_id = int(url.rstrip("/").split("/")[-1])
        return MockResponse(site_detail(item_id))

    monkeypatch.setattr(
        service,
        "scrape_single",
        lambda site_id, rate_limit_delay=10.0: service.crud.get(service.session, id=site_id),
    )
    monkeypatch.setattr("requests.get", fake_get)

    first_result = service.import_incremental(rate_limit_delay=0, update_existing=True)

    assert first_result["status"] == "success"
    assert first_result["start_page"] == 1
    assert first_result["last_completed_page"] == 2
    assert first_result["last_seen_dasi_id"] == 4
    assert page_calls == [1, 2]

    cursor = session.exec(
        select(DasiImportCursor).where(DasiImportCursor.entity_type == "sites")
    ).first()
    assert cursor is not None
    assert cursor.last_completed_page == 2
    assert cursor.last_seen_dasi_id == 4
    assert len(session.exec(select(DasiSourceSnapshot)).all()) == 4
    assert len(session.exec(select(Site)).all()) == 4

    phase["value"] = 2
    page_calls.clear()

    second_result = service.import_incremental(rate_limit_delay=0, update_existing=True)

    assert second_result["status"] == "success"
    assert second_result["start_page"] == 2
    assert second_result["last_completed_page"] == 2
    assert second_result["last_seen_dasi_id"] == 5
    assert page_calls == [2]
    assert len(session.exec(select(DasiSourceSnapshot)).all()) == 5
    assert session.exec(select(Site).where(Site.dasi_id == 5)).first() is not None


def test_dispatch_nightly_dasi_sync_queues_incremental_run(session, monkeypatch):
    captured = {}

    class SessionManager:
        def __enter__(self):
            return session

        def __exit__(self, exc_type, exc, tb):
            return False

    class DummyAsyncResult:
        id = "celery-task-123"

    def fake_apply_async(*, args, queue):
        captured["args"] = args
        captured["queue"] = queue
        return DummyAsyncResult()

    monkeypatch.setattr(pipeline_tasks, "Session", lambda engine: SessionManager())
    monkeypatch.setattr(pipeline_tasks.run_dasi_sync_pipeline, "apply_async", fake_apply_async)

    run_uuid = pipeline_tasks.dispatch_nightly_dasi_sync()
    pipeline_run = session.exec(
        select(PipelineRun).where(PipelineRun.uuid == uuid_pkg.UUID(run_uuid))
    ).first()

    assert pipeline_run is not None
    assert pipeline_run.parameters["incremental"] is True
    assert pipeline_run.parameters["update_existing"] is True
    assert captured["queue"] == "pipeline"
    assert captured["args"][1]["incremental"] is True
