import logging
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Query
from sqlmodel import select, func

from app.api.deps import SessionDep, get_current_active_superuser
from app.models.epigraph import Epigraph
from app.models.epigraph_chunk import (
    EpigraphChunk,
    EpigraphChunkOut,
    EpigraphChunkCreate,
    EpigraphChunkUpdate,
    EpigraphChunksOut,
)
from app.crud.crud_epigraph_chunk import epigraph_chunk as crud_epigraph_chunk


logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/",
    response_model=EpigraphChunksOut,
)
def read_chunks(
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
) -> EpigraphChunksOut:
    """
    Retrieve chunks with pagination.
    """
    total_count_statement = select(func.count()).select_from(EpigraphChunk)
    total_count = session.exec(total_count_statement).one()

    chunks = crud_epigraph_chunk.get_multi(session, skip=skip, limit=limit)

    return EpigraphChunksOut(chunks=chunks, count=total_count)


@router.get(
    "/{chunk_id}",
    response_model=EpigraphChunkOut,
)
def read_chunk(
    chunk_id: int,
    session: SessionDep,
) -> EpigraphChunkOut:
    """
    Retrieve a single chunk by ID.
    """
    chunk = crud_epigraph_chunk.get(session, id=chunk_id)
    if not chunk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chunk not found"
        )
    return chunk


@router.get(
    "/epigraph/{epigraph_id}",
    response_model=EpigraphChunksOut,
)
def read_chunks_by_epigraph(
    epigraph_id: int,
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
) -> EpigraphChunksOut:
    """
    Retrieve all chunks for a specific epigraph.
    """
    chunks = crud_epigraph_chunk.get_by_epigraph_id(
        session, 
        epigraph_id=epigraph_id,
        skip=skip,
        limit=limit
    )

    count_statement = (
        select(func.count())
        .select_from(EpigraphChunk)
        .where(EpigraphChunk.epigraph_id == epigraph_id)
    )
    total_count = session.exec(count_statement).one()

    return EpigraphChunksOut(chunks=chunks, count=total_count)


@router.get(
    "/type/{chunk_type}",
    response_model=EpigraphChunksOut,
)
def read_chunks_by_type(
    chunk_type: str,
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
) -> EpigraphChunksOut:
    """
    Retrieve chunks by type (e.g., translation, cultural_notes).
    """
    chunks = crud_epigraph_chunk.get_by_chunk_type(
        session,
        chunk_type=chunk_type,
        skip=skip,
        limit=limit
    )

    count_statement = (
        select(func.count())
        .select_from(EpigraphChunk)
        .where(EpigraphChunk.chunk_type == chunk_type)
    )
    total_count = session.exec(count_statement).one()
    
    return EpigraphChunksOut(chunks=chunks, count=total_count)


@router.post(
    "/create",
    response_model=EpigraphChunkOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def create_chunk(
    chunk_in: EpigraphChunkCreate,
    session: SessionDep,
) -> EpigraphChunkOut:
    """
    Create a new chunk.
    """
    chunk = crud_epigraph_chunk.create(session, obj_in=chunk_in)
    return chunk


@router.put(
    "/{chunk_id}",
    response_model=EpigraphChunkOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def update_chunk(
    chunk_id: int,
    chunk_in: EpigraphChunkUpdate,
    session: SessionDep,
) -> EpigraphChunkOut:
    """
    Update an existing chunk.
    """
    chunk = crud_epigraph_chunk.get(session, id=chunk_id)
    if not chunk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chunk not found"
        )
    chunk = crud_epigraph_chunk.update(session, db_obj=chunk, obj_in=chunk_in)
    return chunk


@router.delete(
    "/{chunk_id}",
    response_model=EpigraphChunkOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def delete_chunk(
    chunk_id: int,
    session: SessionDep,
) -> EpigraphChunkOut:
    """
    Delete a chunk by ID.
    """
    chunk = crud_epigraph_chunk.get(session, id=chunk_id)
    if not chunk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chunk not found"
        )
    session.delete(chunk)
    session.commit()
    return chunk


@router.delete(
    "/epigraph/{epigraph_id}",
    dependencies=[Depends(get_current_active_superuser)],
)
def delete_chunks_by_epigraph(
    epigraph_id: int,
    session: SessionDep,
) -> Dict[str, Any]:
    """
    Delete all chunks for a specific epigraph.
    """
    deleted_count = crud_epigraph_chunk.delete_by_epigraph_id(session, epigraph_id=epigraph_id)
    return {
        "status": "success",
        "epigraph_id": epigraph_id,
        "deleted_count": deleted_count,
        "message": f"Deleted {deleted_count} chunks for epigraph {epigraph_id}"
    }
