from typing import List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select, func

from app.api.deps import (
    SessionDep,
    get_current_active_superuser,
    get_current_active_superuser_no_error,
)
from app.crud.crud_word import word as crud_word
from app.models.word import (
    Word,
    WordCreate,
    WordUpdate,
    WordOut,
    WordsOut,
)


router = APIRouter()


@router.get(
    "/",
    response_model=WordsOut,
)
def read_words(
  session: SessionDep,
    skip: int = 0,
    limit: int = 100,
    sort_field: Optional[str] = None,
    sort_order: Optional[str] = None,
    filters: Optional[str] = None,
) -> WordsOut:
    """
    Retrieve words.
    """
    total_count_statement = select(func.count()).select_from(Word)
    total_count = session.exec(total_count_statement).one()

    words_statement = select(Word).offset(skip).limit(limit)
    words = session.exec(words_statement).all()

    return WordsOut(words=words, count=total_count)


@router.get(
    "/{word_id}",
    response_model=WordOut,
)
def read_word(
    word_id: int,
    session: SessionDep,
) -> WordOut:
    """
    Retrieve a word by ID.
    """
    word = crud_word.get(session, id=word_id)
    if not word:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Word not found",
        )
    return word


@router.post(
    "/",
    response_model=WordOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def create_word(
    word_in: WordCreate,
    session: SessionDep,
) -> WordOut:
    """
    Create a new word.
    """
    return crud_word.create(session, obj_in=word_in)


@router.put(
    "/{word_id}",
    response_model=WordOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def update_word(
    word_id: int,
    word_in: WordUpdate,
    session: SessionDep,
) -> WordOut:
    """
    Update a word.
    """
    word = crud_word.get(session, id=word_id)
    if not word:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Word not found",
        )
    return crud_word.update(session, db_obj=word, obj_in=word_in)


@router.delete(
    "/{word_id}",
    response_model=WordOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def delete_word(
    word_id: int,
    session: SessionDep,
) -> WordOut:
    """
    Delete a word.
    """
    word = crud_word.get(session, id=word_id)
    if not word:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Word not found",
        )
    return crud_word.remove(session, id=word_id)
