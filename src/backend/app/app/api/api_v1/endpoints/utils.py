"""Utility endpoints for system health checks and monitoring."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlmodel import Session

from app.api.deps import get_db
from app.models.msg import Message

router = APIRouter()


@router.get("/health-check", response_model=Message)
def health_check(db: Session = Depends(get_db)) -> Message:
    """Health check endpoint."""
    db.execute(text("SELECT 1"))

    return Message(message="OK")
