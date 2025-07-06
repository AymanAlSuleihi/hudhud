import uuid as uuid_pkg
from datetime import datetime, timezone

from pydantic import BaseModel
from sqlalchemy import text, func
from sqlmodel import Field, SQLModel


class HealthCheck(BaseModel):
    name: str
    version: str
    description: str


class UUIDModel(SQLModel):
    uuid: uuid_pkg.UUID = Field(
       default_factory=uuid_pkg.uuid4,
       primary_key=True,
       index=True,
       nullable=False,
       sa_column_kwargs={
           "server_default": text("gen_random_uuid()"),
           "unique": True
       }
   )


class TimeStampModel(SQLModel):
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={
            "server_default": func.now(),
        }
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={
            "server_default": func.now(),
            "onupdate": lambda: datetime.now(timezone.utc),
        }
    )
