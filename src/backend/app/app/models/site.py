from datetime import datetime
from typing import Optional, Sequence, Self
from pydantic import BaseModel
from sqlmodel import Column, Field, Relationship, select, SQLModel
from sqlalchemy.dialects.postgresql import JSONB

from app.core.models import TimeStampModel
from app.models.links import EpigraphSiteLink, ObjectSiteLink
from app.models.minimal import EpigraphMinimal, ObjectMinimal, SiteMinimal


class SiteBase(SQLModel):
    dasi_object: dict = Field(sa_column=Column(JSONB), default={})
    dasi_id: int
    uri: str
    modern_name: str
    ancient_name: str
    country: Optional[str] = None
    governorate: Optional[str] = None
    geographical_area: Optional[str] = None
    coordinates: Optional[tuple[float, float]] = Field(sa_column=Column(JSONB), default=None)
    coordinates_accuracy: Optional[str] = None
    location_and_toponomy: Optional[str] = None
    type_of_site: Optional[str] = None
    editors: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    license: str
    first_published: Optional[str] = None
    last_modified: Optional[datetime] = None
    general_description: Optional[str] = None
    notes: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    bibliography: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    classical_sources: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    archaeological_missions: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    travellers: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    history_of_research: Optional[str] = None
    chronology: Optional[str] = None
    monuments: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    structures: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    deities: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    tribe: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    identification: Optional[str] = None
    kingdom: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    language: Optional[str] = None
    dasi_published: Optional[bool] = None


class SiteCreate(SiteBase):
    pass


class SiteUpdate(SQLModel):
    dasi_object: Optional[dict] = Field(sa_column=Column(JSONB), default={})
    dasi_id: Optional[int] = None
    uri: Optional[str] = None
    modern_name: Optional[str] = None
    ancient_name: Optional[str] = None
    country: Optional[str] = None
    governorate: Optional[str] = None
    geographical_area: Optional[str] = None
    coordinates: Optional[tuple[float, float]] = Field(sa_column=Column(JSONB), default=())
    coordinates_accuracy: Optional[str] = None
    location_and_toponomy: Optional[str] = None
    type_of_site: Optional[str] = None
    editors: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    license: Optional[str] = None
    first_published: Optional[str] = None
    last_modified: Optional[datetime] = None
    general_description: Optional[str] = None
    notes: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    bibliography: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    classical_sources: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    archaeological_missions: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    travellers: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    history_of_research: Optional[str] = None
    chronology: Optional[str] = None
    monuments: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    structures: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    deities: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    tribe: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    identification: Optional[str] = None
    kingdom: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    language: Optional[str] = None
    dasi_published: Optional[bool] = None


class Site(
    TimeStampModel,
    SiteBase,
    table=True,
):
    id: Optional[int] = Field(default=None, primary_key=True)

    epigraphs: list["Epigraph"] = Relationship(back_populates="sites_objs", link_model=EpigraphSiteLink)
    objects: list["Object"] = Relationship(back_populates="sites", link_model=ObjectSiteLink)


class SiteOut(SQLModel):
    id: int
    dasi_id: Optional[int] = None
    uri: Optional[str] = None
    modern_name: Optional[str] = None
    ancient_name: Optional[str] = None
    country: Optional[str] = None
    governorate: Optional[str] = None
    geographical_area: Optional[str] = None
    coordinates: Optional[tuple[float, float]] = Field(sa_column=Column(JSONB), default=())
    coordinates_accuracy: Optional[str] = None
    location_and_toponomy: Optional[str] = None
    type_of_site: Optional[str] = None
    editors: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    license: Optional[str] = None
    first_published: Optional[str] = None
    last_modified: Optional[datetime] = None
    general_description: Optional[str] = None
    notes: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    bibliography: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    classical_sources: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    archaeological_missions: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    travellers: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    history_of_research: Optional[str] = None
    chronology: Optional[str] = None
    monuments: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    structures: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    deities: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    tribe: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    identification: Optional[str] = None
    kingdom: Optional[list[str]] = Field(sa_column=Column(JSONB), default=[])
    language: Optional[str] = None
    dasi_published: Optional[bool] = None
    epigraphs: list[EpigraphMinimal] = []
    objects: list[ObjectMinimal] = []


class SitesOut(SQLModel):
    sites: list[SiteOut] = []
    count: int = 0
