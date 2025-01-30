from sqlmodel import SQLModel, Field
from typing import Optional

from app.core.models import TimeStampModel, UUIDModel


class TaskProgressBase(SQLModel):
    task_type: str
    total_items: Optional[int] = None
    processed_items: int = 0
    status: str = "pending"
    error: Optional[str] = None


class TaskProgressCreate(TaskProgressBase):
    pass


class TaskProgressUpdate(SQLModel):
    task_type: Optional[str] = None
    total_items: Optional[int] = None
    processed_items: Optional[int] = None
    status: Optional[str] = None
    error: Optional[str] = None


class TaskProgress(
    TimeStampModel,
    UUIDModel,
    TaskProgressBase,
    table=True
):
    id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_kwargs={"autoincrement": True},
        nullable=False,
        index=True,
    )


class TaskProgressOut(TaskProgressBase):
    id: int


class TaskProgresssOut(SQLModel):
    task_progress: list[TaskProgressOut]
    count: int


class TaskStatus:
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
