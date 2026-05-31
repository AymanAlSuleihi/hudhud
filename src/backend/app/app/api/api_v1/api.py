from fastapi import APIRouter

from app.api.api_v1.endpoints import (
    analytics,
    epigraphs,
    login,
    pipeline_runs,
    sitemaps,
    users,
    words,
    sites,
    objects,
    ask,
    opensearch,
    epigraph_chunks,
    utils,
)

api_router = APIRouter()
api_router.include_router(utils.router)
api_router.include_router(analytics.router)
api_router.include_router(epigraphs.router)
api_router.include_router(login.router)
api_router.include_router(pipeline_runs.router)
api_router.include_router(sitemaps.router)
api_router.include_router(users.router)
api_router.include_router(words.router)
api_router.include_router(sites.router)
api_router.include_router(objects.router)
api_router.include_router(ask.router)
api_router.include_router(opensearch.router)
api_router.include_router(epigraph_chunks.router)
