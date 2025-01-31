from fastapi import APIRouter

from app.api.api_v1.endpoints import (
    epigraphs,
    login,
    task_progress,
    users,
)

api_router = APIRouter()
api_router.include_router(epigraphs.router, prefix="/epigraphs", tags=["epigraphs"])
api_router.include_router(login.router, tags=["login"])
api_router.include_router(task_progress.router, prefix="/task_progress", tags=["task_progress"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
