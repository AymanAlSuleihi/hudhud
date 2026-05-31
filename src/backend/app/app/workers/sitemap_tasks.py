from sqlmodel import Session

from app.core.celery_app import celery_app
from app.core.config import settings
from app.crud.crud_epigraph import epigraph as epigraph_crud
from app.db.engine import engine
from app.services.sitemap_service import SitemapService


@celery_app.task(name="app.workers.sitemap_tasks.generate_sitemap")
def generate_sitemap() -> dict[str, str | int]:
    with Session(engine) as session:
        epigraph_rows = epigraph_crud.get_id_and_dasi_id(
            db=session,
            dasi_published=True,
            skip=0,
            limit=999999,
        )

    service = SitemapService(base_url=settings.SERVER_HOST)
    output_path = service.write_sitemap(e_dasi_id for _, e_dasi_id in epigraph_rows)
    return {
        "status": "success",
        "path": str(output_path),
        "url_count": len(service.STATIC_PATHS) + len(epigraph_rows),
    }