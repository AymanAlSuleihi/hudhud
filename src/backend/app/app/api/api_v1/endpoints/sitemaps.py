from fastapi import APIRouter, Depends

from app.api.deps import (
    get_current_active_superuser,
)
from app.core.config import settings
from app.workers.sitemap_tasks import generate_sitemap


router = APIRouter()


@router.get(
    "/generate_sitemap",
    # response_class=dict,
    dependencies=[Depends(get_current_active_superuser)],
)
def sitemap_xml(
):
    async_result = generate_sitemap.apply_async(queue="pipeline")
    server_host = str(settings.SERVER_HOST).rstrip("/")
    return {
        "status": "queued",
        "task_id": async_result.id,
        "sitemap_url": f"{server_host}/public/sitemap.xml",
    }
