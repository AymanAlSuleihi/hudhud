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


class SiteCreate(SiteBase):
    pass


class SiteUpdate(SQLModel):
    dasi_object: Optional[dict] = Field(sa_column=Column(JSONB), default={})
    dasi_id: Optional[int] = None


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
    dasi_object: dict = Field(sa_column=Column(JSONB), default={})


class SitesOut(SQLModel):
    sites: list[SiteOut] = []
    count: int = 0
