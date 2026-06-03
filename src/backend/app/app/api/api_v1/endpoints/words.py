from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import (
    SessionDep,
    get_current_active_superuser,
)
from app.api.params import JsonFiltersParam, PageLimit, PageOffset, ResourceIdPath, SortFieldParam, SortOrderParam
from app.crud.crud_word import word as crud_word
from app.models.word import (
    WordCreate,
    WordUpdate,
    WordOut,
    WordsOut,
    WordsMinimalOut,
)


router = APIRouter(prefix="/words", tags=["words"])

@router.get(
    "",
    response_model=WordsOut,
)
def read_words(
    session: SessionDep,
    skip: PageOffset = 0,
    limit: PageLimit = 100,
    sort_field: SortFieldParam = None,
    sort_order: SortOrderParam = None,
    filters: JsonFiltersParam = None,
    related_epigraphs_limit: int = 10,
    related_words_limit: int = 10,
) -> WordsOut:
    """
    Retrieve words.
    """
    return crud_word.get_words_out(
        session,
        skip=skip,
        limit=limit,
        sort_field=sort_field,
        sort_order=sort_order,
        filters=filters,
        related_epigraphs_limit=related_epigraphs_limit,
        related_words_limit=related_words_limit,
    )


@router.get(
    "/minimal",
    response_model=WordsMinimalOut,
)
def read_words_minimal(
    session: SessionDep,
    skip: PageOffset = 0,
    limit: PageLimit = 100,
    sort_field: SortFieldParam = None,
    sort_order: SortOrderParam = None,
    filters: JsonFiltersParam = None,
) -> WordsMinimalOut:
    """
    Retrieve words with minimal fields.
    """
    return crud_word.get_words_minimal_out(
        session,
        skip=skip,
        limit=limit,
        sort_field=sort_field,
        sort_order=sort_order,
        filters=filters,
    )


@router.get(
    "/{word_id}",
    response_model=WordOut,
)
def read_word(
    word_id: ResourceIdPath,
    session: SessionDep,
    related_epigraphs_limit: int = 10,
    related_words_limit: int = 10,
) -> WordOut:
    """
    Retrieve a word by ID.
    """
    word = crud_word.get_word_out(
        session,
        id=word_id,
        related_epigraphs_limit=related_epigraphs_limit,
        related_words_limit=related_words_limit
    )
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
