from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from sqlmodel import Column, Field, Relationship, SQLModel
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector

from app.core.models import TimeStampModel
from app.models.links import EpigraphSiteLink, EpigraphWordLink, EpigraphObjectLink, ObjectSiteLink, WordLink
from app.models.minimal import EpigraphMinimal, ObjectMinimal, SiteMinimal


class EpigraphBase(SQLModel):
    dasi_object: dict = Field(sa_column=Column(JSONB), default={})
    dasi_id: int
    title: str
    uri: str
    epigraph_text: str
    translations: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    period: Optional[str] = None
    chronology_conjectural: bool
    mentioned_date: Optional[str] = None
    sites: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    language_level_1: Optional[str] = None
    language_level_2: Optional[str] = None
    language_level_3: Optional[str] = None
    alphabet: Optional[str] = None
    script_typology: Optional[str] = None
    script_cursus: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    textual_typology: Optional[str] = None
    textual_typology_conjectural: bool
    letter_measure: Optional[str] = None
    writing_techniques: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    royal_inscription: bool
    cultural_notes: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    aparatus_notes: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    general_notes: Optional[str] = None
    bibliography: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    concordances: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    license: str
    first_published: Optional[str] = None
    editors: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    last_modified: Optional[datetime] = None
    dasi_published: Optional[bool] = None
    embedding: Optional[list[float]] = Field(sa_column=Column(Vector(3072), nullable=True, default=None), default=None)


class EpigraphCreate(EpigraphBase):
    pass


class EpigraphUpdate(SQLModel):
    dasi_object: Optional[dict] = Field(sa_column=Column(JSONB), default={})
    dasi_id: Optional[int] = None
    title: Optional[str] = None
    uri: Optional[str] = None
    epigraph_text: Optional[str] = None
    translations: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    period: Optional[str] = None
    chronology_conjectural: Optional[bool] = None
    mentioned_date: Optional[str] = None
    sites: list[dict] = Field(sa_column=Column(JSONB), default=[])
    language_level_1: Optional[str] = None
    language_level_2: Optional[str] = None
    language_level_3: Optional[str] = None
    alphabet: Optional[str] = None
    script_typology: Optional[str] = None
    script_cursus: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    textual_typology: Optional[str] = None
    textual_typology_conjectural: Optional[bool] = None
    letter_measure: Optional[str] = None
    writing_techniques: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    royal_inscription: Optional[bool] = None
    cultural_notes: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    aparatus_notes: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    general_notes: Optional[str] = None
    bibliography: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    concordances: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    license: Optional[str] = None
    first_published: Optional[str] = None
    editors: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    last_modified: Optional[datetime] = None
    dasi_published: Optional[bool] = None
    embedding: Optional[list[float]] = Field(sa_column=Column(Vector(3072), nullable=True, default=None), default=None)


class Epigraph(
    TimeStampModel,
    EpigraphBase,
    table=True
):
    id: Optional[int] = Field(default=None, primary_key=True)

    # TODO: sort out sites dict and this
    sites_objs: list["Site"] = Relationship(back_populates="epigraphs", link_model=EpigraphSiteLink)
    objects: list["Object"] = Relationship(back_populates="epigraphs", link_model=EpigraphObjectLink)
    words: list["Word"] = Relationship(back_populates="epigraphs", link_model=EpigraphWordLink)


class EpigraphOut(SQLModel):
    id: int
    dasi_id: int
    title: str
    uri: str
    epigraph_text: str
    translations: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    period: Optional[str] = None
    chronology_conjectural: bool
    mentioned_date: Optional[str] = None
    sites: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    language_level_1: Optional[str] = None
    language_level_2: Optional[str] = None
    language_level_3: Optional[str] = None
    alphabet: Optional[str] = None
    script_typology: Optional[str] = None
    script_cursus: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    textual_typology: Optional[str] = None
    textual_typology_conjectural: bool
    letter_measure: Optional[str] = None
    writing_techniques: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    royal_inscription: bool
    cultural_notes: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    aparatus_notes: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    general_notes: Optional[str] = None
    bibliography: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    concordances: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    license: str
    first_published: Optional[str] = None
    editors: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    last_modified: Optional[datetime] = None
    dasi_published: Optional[bool] = None
    # words: list = None
    objects: list[ObjectMinimal] = []
    sites_objs: list[SiteMinimal] = []


class EpigraphOutBasic(SQLModel):
    id: int
    dasi_id: int
    title: str
    uri: str
    period: Optional[str] = None
    sites: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    language_level_1: Optional[str] = None
    language_level_2: Optional[str] = None
    language_level_3: Optional[str] = None
    translations: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    cultural_notes: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    aparatus_notes: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    general_notes: Optional[str] = None


class EpigraphsOut(BaseModel):
    epigraphs: list[EpigraphOut]
    count: int


class EpigraphsOutBasic(BaseModel):
    epigraphs: list[EpigraphOutBasic]
    count: int
