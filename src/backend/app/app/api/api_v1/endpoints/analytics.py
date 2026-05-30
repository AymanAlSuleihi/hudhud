from typing import Any

from fastapi import APIRouter

from app.api.deps import SessionDep
from app.services.analytics import get_analytics_overview, get_epigraph_heatmap, get_language_period_map, get_site_map


router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview")
def read_analytics_overview(session: SessionDep) -> dict[str, Any]:
    """Return summary metrics and chart-ready analytics for the public corpus."""
    return get_analytics_overview(session)


@router.get("/site_map")
def read_site_map(session: SessionDep) -> dict[str, Any]:
    """Return the mapped-site atlas used by the public maps page."""
    return get_site_map(session)


@router.get("/epigraph_heatmap")
def read_epigraph_heatmap(session: SessionDep) -> dict[str, Any]:
    """Return mapped published epigraph points by period for the public maps page."""
    return get_epigraph_heatmap(session)


@router.get("/language_period_map")
def read_language_period_map(session: SessionDep) -> dict[str, Any]:
    """Return the language-by-period site map used by the public maps page."""
    return get_language_period_map(session)