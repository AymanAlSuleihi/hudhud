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
    title: str
    uri: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    period: Optional[str] = None
    deposits: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    materials: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    shape: Optional[str] = None
    measures: Optional[str] = None
    decorations: Optional[list[Union[dict, list]]] = Field(sa_column=Column(JSONB), default=[])
    support_type_level_1: Optional[str] = None
    support_type_level_2: Optional[str] = None
    support_type_level_3: Optional[str] = None
    support_type_level_4: Optional[str] = None
    support_notes: Optional[str] = None
    deposit_notes: Optional[str] = None
    cultural_notes: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    bibliography: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    concordances: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    license: str
    editors: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    first_published: Optional[str] = None
    last_modified: Optional[datetime] = None


class ObjectCreate(ObjectBase):
    pass


class ObjectUpdate(SQLModel):
    dasi_object: Optional[dict] = Field(sa_column=Column(JSONB), default={})
    dasi_id: Optional[int] = None
    title: Optional[str] = None
    uri: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    period: Optional[str] = None
    deposits: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    materials: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    shape: Optional[str] = None
    measures: Optional[str] = None
    decorations: Optional[list[Union[dict, list]]] = Field(sa_column=Column(JSONB), default=[])
    support_type_level_1: Optional[str] = None
    support_type_level_2: Optional[str] = None
    support_type_level_3: Optional[str] = None
    support_type_level_4: Optional[str] = None
    support_notes: Optional[str] = None
    deposit_notes: Optional[str] = None
    cultural_notes: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    bibliography: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    concordances: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    license: Optional[str] = None
    editors: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    first_published: Optional[str] = None
    last_modified: Optional[datetime] = None


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
