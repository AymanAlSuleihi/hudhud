from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from sqlmodel import Column, Field, Relationship, SQLModel
from sqlalchemy.dialects.postgresql import JSONB

from app.core.models import TimeStampModel
from app.models.links import EpigraphWordLink


class WordBase(SQLModel):
    word: str


class WordCreate(WordBase):
    pass


class WordUpdate(SQLModel):
    word: Optional[str] = None


class Word(
    TimeStampModel,
    WordBase,
    table=True,
):
    id: int = Field(default=None, primary_key=True)

    epigraphs: list["Epigraph"] = Relationship(back_populates="words", link_model=EpigraphWordLink)

    next_id: Optional[int] = Field(default=None, foreign_key="word.id")
    next: Optional["Word"] = Relationship(
        back_populates="previous",
        sa_relationship_kwargs={
            "foreign_keys": "[Word.next_id]",
            "uselist": False,
        }
    )

    previous_id: Optional[int] = Field(default=None, foreign_key="word.id")
    previous: Optional["Word"] = Relationship(
        back_populates="next",
        sa_relationship_kwargs={
            "foreign_keys": "[Word.previous_id]",
            "remote_side": "[Word.id]",
            "uselist": False,
        }
    )

class WordMinimal(SQLModel):
    id: int
    word: str


class WordOut(WordBase):
    id: int
    next: Optional[WordMinimal] = None
    previous: Optional[WordMinimal] = None
    epigraphs: list = None


class WordsOut(SQLModel):
    words: list[WordOut]
    count: int
