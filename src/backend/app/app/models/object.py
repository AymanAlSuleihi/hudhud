from datetime import datetime
from typing import Optional, Sequence, Self
from pydantic import BaseModel
from sqlmodel import Column, Field, Relationship, select, SQLModel
from sqlalchemy.dialects.postgresql import JSONB

from app.core.models import TimeStampModel
from app.models.links import EpigraphObjectLink, ObjectSiteLink
from app.models.minimal import EpigraphMinimal, ObjectMinimal, SiteMinimal


class ObjectBase(SQLModel):
    dasi_object: dict = Field(sa_column=Column(JSONB), default={})
    dasi_id: int


class ObjectCreate(ObjectBase):
    pass


class ObjectUpdate(SQLModel):
    dasi_object: Optional[dict] = Field(sa_column=Column(JSONB), default={})
    dasi_id: Optional[int] = None


class Object(
    TimeStampModel,
    ObjectBase,
    table=True,
):
    id: Optional[int] = Field(default=None, primary_key=True)

    epigraphs: list["Epigraph"] = Relationship(back_populates="objects", link_model=EpigraphObjectLink)
    sites: list["Site"] = Relationship(back_populates="objects", link_model=ObjectSiteLink)


class ObjectOut(ObjectBase):
    id: int
    epigraphs: list = []
    sites: list = []


class ObjectMinimal(SQLModel):
    id: int
    dasi_id: int
    dasi_object: dict = Field(sa_column=Column(JSONB), default={})


class ObjectsOut(SQLModel):
    objects: list[ObjectOut] = []
    count: int = 0
