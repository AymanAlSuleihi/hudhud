from app.api.api_v1.endpoints import sitemaps


def test_sitemap_xml_queues_celery_task(monkeypatch):
    captured = {}

    class DummyAsyncResult:
        id = "celery-task-456"

    def fake_apply_async(*, queue):
        captured["queue"] = queue
        return DummyAsyncResult()

    monkeypatch.setattr(sitemaps.generate_sitemap, "apply_async", fake_apply_async)

    response = sitemaps.sitemap_xml()

    assert captured == {"queue": "pipeline"}
    assert response["status"] == "queued"
    assert response["task_id"] == "celery-task-456"
    assert response["sitemap_url"].endswith("/public/sitemap.xml")