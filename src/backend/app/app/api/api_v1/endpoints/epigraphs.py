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

