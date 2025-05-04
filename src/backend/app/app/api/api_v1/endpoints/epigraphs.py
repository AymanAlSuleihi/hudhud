import time
from typing import List, Optional, Dict, Any
from urllib.parse import urlparse

import requests
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlmodel import select, func, asc, desc, update, text

from app.api.deps import (
    SessionDep,
    get_current_active_superuser,
    get_current_active_superuser_no_error,
)
from app.crud.crud_epigraph import epigraph as crud_epigraph
from app.models.epigraph import (
    Epigraph,
    EpigraphCreate,
    EpigraphOut,
    EpigraphUpdate,
    EpigraphsOut,
    EpigraphsOutBasic,
)

logging.basicConfig(
    filename='epigraph_search.log',
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    datefmt='%d-%b-%y %H:%M:%S',
)


router = APIRouter()

@router.get(
    "/",
    response_model=EpigraphsOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def read_epigraphs(
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
    sort_field: Optional[str] = None,
    sort_order: Optional[str] = None,
    filters: Optional[str] = None,
) -> EpigraphsOut:
    """
    Retrieve epigraphs.
    """
    total_count_statement = select(func.count()).select_from(Epigraph)
    total_count = session.exec(total_count_statement).one()

    epigraphs_statement = select(Epigraph).offset(skip).limit(limit)
    epigraphs = session.exec(epigraphs_statement).all()

    return EpigraphsOut(epigraphs=epigraphs, count=total_count)


@router.get(
    "/filter",
    response_model=EpigraphsOutBasic,
)
def filter_epigraphs(
    session: SessionDep,
    translation_text: str,
    sort_field: Optional[str] = None,
    sort_order: Optional[str] = None,
):
    """
    Filter epigraphs by searching within all translations.
    """

    logging.info(f"Searching: {translation_text}, sort_field: {sort_field}, sort_order: {sort_order}")

    query = select(Epigraph)

    query = query.where(
        text("""
            EXISTS (
                SELECT 1 
                FROM jsonb_array_elements(translations) as t 
                WHERE t->>'text' ~* :translation_pattern
            )
        """)
    ).params(translation_pattern=f"\\m{translation_text}\\M")

    if sort_field:
        if sort_order.lower() == "desc":
            query = query.order_by(desc(sort_field))
        else:
            query = query.order_by(asc(sort_field))

    epigraphs = session.exec(query).all()

    logging.info(f"Found {len(epigraphs)} epigraphs")

    return EpigraphsOutBasic(epigraphs=epigraphs, count=len(epigraphs))

@router.get(
    "/search",
    response_model=EpigraphsOutBasic,
)
def full_text_search_epigraphs(
    session: SessionDep,
    search_text: str,
    fields: Optional[str] = None,
    sort_field: Optional[str] = None,
    sort_order: Optional[str] = None,
    filters: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
):
    """
    Full text search epigraphs by searching within specified fields.
    """
    logging.info(f"Full text searching: {search_text}, fields: {fields}, sort_field: {sort_field}, sort_order: {sort_order}")

    cleaned_text = re.sub(r'[!@#$%^&*()+=\[\]{};:"\\|,.<>/?]', ' ', search_text)
    processed_search_text = ' '.join(cleaned_text.split())

    query = select(Epigraph)

    if fields:
        fields = fields.split(",")
        field_vectors = []

        for field in fields:
            if field not in Epigraph.__table__.columns:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid field: {field}",
                )

            column_type = str(Epigraph.__table__.columns[field].type)

            if "JSONB" in column_type:
                field_vectors.append(
                    text(f"""
                        CASE 
                            WHEN {field} IS NULL THEN ''
                            WHEN jsonb_typeof({field}) = 'array' THEN
                                COALESCE((
                                    SELECT string_agg(CASE 
                                        WHEN jsonb_typeof(value) = 'object' AND value ? 'text'
                                        THEN value #>> '{{text}}'
                                        ELSE value #>> '{{}}'
                                    END, ' ')
                                    FROM jsonb_array_elements({field})
                                ), '')
                            ELSE {field}::text
                        END
                    """)
                )
            else:
                field_vectors.append(text(f"COALESCE({field}::text, '')"))

        combined_vector = " || ' ' || ".join(str(v) for v in field_vectors)
        query = query.where(
            text(f"to_tsvector({combined_vector}) @@ plainto_tsquery(:search_text)")
        ).params(search_text=processed_search_text)

    if filters:
        filters_dict = json.loads(filters)
        for key, value in filters_dict.items():
            if isinstance(value, bool):
                query = query.where(
                    getattr(Epigraph, key).is_(value)
                )
            else:
                query = query.where(
                    getattr(Epigraph, key) == value
                )

    epigraph_count = session.exec(select(func.count()).select_from(query)).one()
    logging.info(f"Found {epigraph_count} epigraphs")

    if sort_field:
        if sort_order.lower() == "desc":
            query = query.order_by(desc(sort_field))
        else:
            query = query.order_by(asc(sort_field))

    query = query.offset(skip).limit(limit)

    epigraphs = session.exec(query).all()

    return EpigraphsOutBasic(epigraphs=epigraphs, count=epigraph_count)


@router.get(
    "/{epigraph_id}",
    response_model=EpigraphOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def read_epigraph_by_id(
    epigraph_id: int,
    session: SessionDep,
) -> EpigraphOut:
    """
    Retrieve epigraph by ID.
    """
    epigraph = crud_epigraph.get(session, id=epigraph_id)
    if not epigraph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Epigraph not found",
        )
    return epigraph


@router.post(
    "/",
    response_model=EpigraphOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def create_epigraph(
    epigraph: EpigraphCreate,
    session: SessionDep,
) -> EpigraphOut:
    """
    Create new epigraph.
    """
    return crud_epigraph.create(session, obj_in=epigraph)


@router.put(
    "/{epigraph_id}",
    response_model=EpigraphOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def update_epigraph(
    epigraph_id: int,
    epigraph_in: EpigraphUpdate,
    session: SessionDep,
) -> EpigraphOut:
    """
    Update epigraph.
    """
    epigraph = crud_epigraph.get(session, id=epigraph_id)
    if not epigraph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Epigraph not found",
        )
    return crud_epigraph.update(session, db_obj=epigraph, obj_in=epigraph_in)


@router.delete(
    "/{epigraph_id}",
    dependencies=[Depends(get_current_active_superuser)],
)
def delete_epigraph(
    epigraph_id: int,
    session: SessionDep,
) -> None:
    """
    Delete epigraph.
    """
    return crud_epigraph.remove(session, id=epigraph_id)

