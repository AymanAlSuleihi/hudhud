import time
from typing import List, Optional
from urllib.parse import urlparse

import requests

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlmodel import select, func, asc, desc, update

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
)
from app.services.epigraph import EpigraphService

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

