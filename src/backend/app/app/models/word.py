from typing import Optional

from sqlmodel import Column, Field, Relationship, SQLModel
from sqlalchemy.dialects.postgresql import JSONB

from app.core.models import TimeStampModel
from app.models.links import EpigraphWordLink, WordLink


class WordBase(SQLModel):
    word: str
    classification: Optional[str] = None
    attributes: Optional[dict] = Field(sa_column=Column(JSONB), default={})


class WordCreate(WordBase):
    pass


class WordUpdate(SQLModel):
    word: Optional[str] = None
    classification: Optional[str] = None
    attributes: Optional[dict] = Field(sa_column=Column(JSONB), default={})


class Word(
    TimeStampModel,
    WordBase,
    table=True,
):
    id: int = Field(default=None, primary_key=True)
    frequency: int = Field(default=1)

    epigraphs: list["Epigraph"] = Relationship(back_populates="words", link_model=EpigraphWordLink)

    words: list["Word"] = Relationship(
        back_populates="words",
        link_model=WordLink,
        sa_relationship_kwargs={
            "secondary": WordLink.__table__,
            "primaryjoin": "Word.id == WordLink.from_word_id",
            "secondaryjoin": "Word.id == WordLink.to_word_id",
        },
    )

class WordMinimal(SQLModel):
    id: int
    word: str


class WordConnection(SQLModel):
    id: int
    word: str
    # count: int


class WordOut(WordBase):
    id: int
    frequency: int
    # epigraphs: list = []
    words: list[WordConnection] = []


class WordsOut(SQLModel):
    words: list[WordOut]
    count: int
