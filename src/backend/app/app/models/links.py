from typing import List, Optional, Union

from sqlmodel import Field, SQLModel


class EpigraphSiteLink(SQLModel, table=True):
    epigraph_id: Optional[int] = Field(
        default=None, foreign_key="epigraph.id", primary_key=True
    )
    site_id: Optional[int] = Field(
        default=None, foreign_key="site.id", primary_key=True
    )


class EpigraphWordLink(SQLModel, table=True):
    epigraph_id: Optional[int] = Field(
        default=None, foreign_key="epigraph.id", primary_key=True
    )
    word_id: Optional[int] = Field(
        default=None, foreign_key="word.id", primary_key=True
    )


class WordLink(SQLModel, table=True):
    from_word_id: int = Field(
        default=None, foreign_key="word.id", primary_key=True
    )
    to_word_id: int = Field(
        default=None, foreign_key="word.id", primary_key=True
    )
    count: int = Field(default=1)
