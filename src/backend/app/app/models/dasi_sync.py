from datetime import datetime
from typing import Optional

from sqlalchemy import Column, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

from app.core.models import TimeStampModel


class DasiEntityType:
    SITES = "sites"
    OBJECTS = "objects"
    EPIGRAPHS = "epigraphs"


class DasiImportCursorBase(SQLModel):
    entity_type: str = Field(index=True)
    last_completed_page: int = 0
    last_seen_dasi_id: Optional[int] = None
    total_items_hint: Optional[int] = None
    last_started_at: Optional[datetime] = None
    last_completed_at: Optional[datetime] = None
    last_error: Optional[str] = None


class DasiImportCursor(TimeStampModel, DasiImportCursorBase, table=True):
    __table_args__ = (
        UniqueConstraint("entity_type", name="uq_dasiimportcursor_entity_type"),
    )

    id: Optional[int] = Field(default=None, primary_key=True, index=True)


class DasiSourceSnapshotBase(SQLModel):
    entity_type: str = Field(index=True)
    dasi_id: int = Field(index=True)
    source_url: str
    source_last_modified: Optional[datetime] = None
    payload_hash: str
    payload: dict = Field(sa_column=Column(JSONB), default={})


class DasiSourceSnapshot(TimeStampModel, DasiSourceSnapshotBase, table=True):
    __table_args__ = (
        UniqueConstraint(
            "entity_type",
            "dasi_id",
            name="uq_dasisourcesnapshot_entity_type_dasi_id",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True, index=True)
