import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select, func, asc, desc

from app.api.deps import (
    SessionDep,
    get_current_active_superuser,
)
from app.api.params import JsonFiltersParam, PageLimit, PageOffset, ResourceIdPath, SortFieldParam, SortOrderParam
from app.crud.crud_word import word as crud_word
from app.models.word import (
    Word,
    WordCreate,
    WordUpdate,
    WordOut,
    WordsOut,
)
from app.models.links import EpigraphWordLink, WordLink


router = APIRouter()
router = APIRouter(prefix="/words", tags=["words"])

@router.get(
    "/",
    response_model=WordsOut,
)
def read_words(
        session: SessionDep,
        skip: PageOffset = 0,
        limit: PageLimit = 100,
        sort_field: SortFieldParam = None,
        sort_order: SortOrderParam = None,
        filters: JsonFiltersParam = None,
) -> WordsOut:
    """
    Retrieve words.
    """
    total_count_statement = select(func.count()).select_from(Word)
    total_count = session.exec(total_count_statement).one()

    words_statement = select(Word).offset(skip).limit(limit)

    if filters:
        filters_dict = json.loads(filters)
        for key, value in filters_dict.items():
            if isinstance(value, bool):
                words_statement = words_statement.where(
                    getattr(Word, key).is_(value)
                )
            else:
                words_statement = words_statement.where(
                    getattr(Word, key) == value
                )

    if sort_field:
        if sort_field == "words":
            sort_field = (
                select(func.count(WordLink.to_word_id))
                .where(WordLink.from_word_id == Word.id)
                .scalar_subquery()
            )
        elif sort_field == "epigraphs":
            sort_field = (
                select(func.count(EpigraphWordLink.epigraph_id))
                .where(EpigraphWordLink.word_id == Word.id)
                .scalar_subquery()
            )
        if sort_order == "desc":
            words_statement = words_statement.order_by(desc(sort_field))
        else:
            words_statement = words_statement.order_by(asc(sort_field))

    words = session.exec(words_statement).all()

    return WordsOut(words=words, count=total_count)


@router.get(
    "/{word_id}",
    response_model=WordOut,
)
def read_word(
    word_id: ResourceIdPath,
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
    status_code=status.HTTP_201_CREATED,
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
    word_id: ResourceIdPath,
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
    word_id: ResourceIdPath,
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
