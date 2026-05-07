from datetime import datetime
import uuid as uuid_pkg
from typing import Optional

from sqlalchemy import Column, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

from app.core.models import TimeStampModel


class PipelineStatus:
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PipelineTrigger:
    MANUAL = "manual"
    SCHEDULED = "scheduled"
    RETRY = "retry"


class PipelineRunBase(SQLModel):
    pipeline_name: str = Field(index=True)
    trigger: str = Field(default=PipelineTrigger.MANUAL, index=True)
    status: str = Field(default=PipelineStatus.PENDING, index=True)
    current_step: Optional[str] = Field(default=None, index=True)
    celery_task_id: Optional[str] = Field(default=None, index=True)
    total_items: Optional[int] = None
    processed_items: int = 0
    skipped_items: int = 0
    failed_items: int = 0
    parameters: dict = Field(sa_column=Column(JSONB), default={})
    metrics: dict = Field(sa_column=Column(JSONB), default={})
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class PipelineRunCreate(PipelineRunBase):
    pass


class PipelineRunUpdate(SQLModel):
    pipeline_name: Optional[str] = None
    trigger: Optional[str] = None
    status: Optional[str] = None
    current_step: Optional[str] = None
    celery_task_id: Optional[str] = None
    total_items: Optional[int] = None
    processed_items: Optional[int] = None
    skipped_items: Optional[int] = None
    failed_items: Optional[int] = None
    parameters: Optional[dict] = None
    metrics: Optional[dict] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class PipelineRun(TimeStampModel, PipelineRunBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    uuid: uuid_pkg.UUID = Field(
        default_factory=uuid_pkg.uuid4,
        nullable=False,
        index=True,
        sa_column_kwargs={
            "server_default": text("gen_random_uuid()"),
            "unique": True,
        },
    )


class PipelineRunOut(PipelineRunBase):
    id: int
    uuid: uuid_pkg.UUID
    created_at: datetime
    updated_at: datetime


class PipelineRunsOut(SQLModel):
    pipeline_runs: list[PipelineRunOut]
    count: int


class TriggerDasiPipelineRequest(SQLModel):
    import_sites: bool = True
    import_objects: bool = True
    import_epigraphs: bool = True
    incremental: bool = False
    start_id: Optional[int] = None
    end_id: Optional[int] = None
    dasi_published: Optional[bool] = None
    update_existing: bool = False
    run_chunking: bool = True
    generate_embeddings: bool = True
    rechunk: bool = False
    reindex_search: bool = True
    rate_limit_delay: float = 10.0
    chunk_limit: Optional[int] = None