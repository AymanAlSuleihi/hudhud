from datetime import datetime
from typing import Optional, Sequence, Self
from pydantic import BaseModel
from sqlmodel import Column, Field, Relationship, select, SQLModel
from sqlalchemy.dialects.postgresql import JSONB

from app.core.models import TimeStampModel
from app.models.links import EpigraphSiteLink, ObjectSiteLink


class SiteBase(SQLModel):
    dasi_object: dict = Field(sa_column=Column(JSONB), default={})
    dasi_id: int
    uri: str
    modern_name: str
    ancient_name: str
    country: Optional[str] = None
    governorate: Optional[str] = None
    geographical_area: Optional[str] = None
    editors: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    license: str
    first_published: Optional[str] = None
    last_modified_dasi: Optional[datetime] = None


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
    editors: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    license: Optional[str] = None
    first_published: Optional[str] = None
    last_modified_dasi: Optional[datetime] = None


class Site(
    TimeStampModel,
    SiteBase,
    table=True,
):
    id: Optional[int] = Field(default=None, primary_key=True)

    epigraphs: list["Epigraph"] = Relationship(back_populates="sites_objs", link_model=EpigraphSiteLink)
    objects: list["Object"] = Relationship(back_populates="sites", link_model=ObjectSiteLink)


class SiteOut(SiteBase):
    id: int
    # epigraphs: list = None


class SiteMinimal(SQLModel):
    id: int
    dasi_id: int
    uri: str
    modern_name: str
    ancient_name: str
    country: Optional[str] = None
    governorate: Optional[str] = None
    geographical_area: Optional[str] = None
    editors: Optional[list[dict]] = Field(sa_column=Column(JSONB), default=[])
    license: str
    first_published: Optional[str] = None
    last_modified_dasi: Optional[datetime] = None


class SitesOut(SQLModel):
    sites: list[SiteOut] = []
    count: int = 0
