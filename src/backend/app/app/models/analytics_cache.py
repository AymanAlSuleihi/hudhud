from typing import Optional

from sqlmodel import Column, Field, SQLModel
from sqlalchemy.dialects.postgresql import JSONB

from app.core.models import TimeStampModel


class AnalyticsCacheBase(SQLModel):
    key: str = Field(index=True)
    data: dict = Field(sa_column=Column(JSONB), default={})


class AnalyticsCacheCreate(AnalyticsCacheBase):
    pass


class AnalyticsCacheUpdate(SQLModel):
    key: Optional[str] = None
    data: Optional[dict] = None


class AnalyticsCache(
    TimeStampModel,
    AnalyticsCacheBase,
    table=True
):
    id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_kwargs={"autoincrement": True},
        nullable=False,
        index=True,
    )


class AnalyticsCacheOut(AnalyticsCacheBase):
    id: int


class AnalyticsCachesOut(SQLModel):
    analytics_cache: list[AnalyticsCacheOut]
    count: int
