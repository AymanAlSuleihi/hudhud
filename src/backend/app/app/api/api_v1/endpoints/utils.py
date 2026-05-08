"""Utility endpoints for system health checks and monitoring."""

from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import SessionDep
from app.models.msg import Message

router = APIRouter(prefix="/utils", tags=["utils"])


@router.get("/health-check", response_model=Message)
def health_check(session: SessionDep) -> Message:
    """Health check endpoint."""
    session.execute(text("SELECT 1"))

    return Message(message="OK")
