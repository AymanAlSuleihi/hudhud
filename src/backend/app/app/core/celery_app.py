from celery import Celery
from celery.schedules import crontab

from app.core.config import settings


celery_app = Celery(
    "hudhud",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_default_queue="pipeline",
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    broker_connection_retry_on_startup=True,
    task_always_eager=settings.CELERY_TASK_ALWAYS_EAGER,
    imports=("app.workers.pipeline_tasks", "app.workers.sitemap_tasks"),
)

beat_schedule = {}

if settings.PIPELINE_NIGHTLY_SYNC_ENABLED:
    beat_schedule["nightly-dasi-sync"] = {
        "task": "app.workers.pipeline_tasks.dispatch_nightly_dasi_sync",
        "schedule": crontab(
            hour=settings.PIPELINE_NIGHTLY_SYNC_HOUR,
            minute=settings.PIPELINE_NIGHTLY_SYNC_MINUTE,
        ),
    }

if settings.EMBEDDING_DEFER_PIPELINE_REQUESTS:
    beat_schedule["flush-pending-chunk-embeddings"] = {
        "task": "app.workers.pipeline_tasks.flush_pending_chunk_embeddings",
        "schedule": settings.EMBEDDING_PENDING_FLUSH_INTERVAL_SECONDS,
    }

if beat_schedule:
    celery_app.conf.beat_schedule = beat_schedule
