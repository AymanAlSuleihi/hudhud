"""CRUD operations for EpigraphChunk."""

from typing import Optional, List
from sqlmodel import Session, select

from app.crud.base import CRUDBase
from app.models.epigraph_chunk import (
    EpigraphChunk,
    EpigraphChunkCreate,
    EpigraphChunkUpdate,
)


class CRUDEpigraphChunk(CRUDBase[EpigraphChunk, EpigraphChunkCreate, EpigraphChunkUpdate]):
    """CRUD operations for EpigraphChunk."""

    def get_by_epigraph_id(
        self, 
        db: Session, 
        epigraph_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[EpigraphChunk]:
        """Get all chunks for a specific epigraph."""
        statement = (
            select(EpigraphChunk)
            .where(EpigraphChunk.epigraph_id == epigraph_id)
            .order_by(EpigraphChunk.chunk_index)
            .offset(skip)
            .limit(limit)
        )
        return list(db.exec(statement).all())

    def get_by_chunk_type(
        self,
        db: Session,
        chunk_type: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[EpigraphChunk]:
        """Get chunks by type (e.g., translation, cultural_notes)."""
        statement = (
            select(EpigraphChunk)
            .where(EpigraphChunk.chunk_type == chunk_type)
            .offset(skip)
            .limit(limit)
        )
        return list(db.exec(statement).all())

    def delete_by_epigraph_id(
        self,
        db: Session,
        epigraph_id: int
    ) -> int:
        """Delete all chunks for a specific epigraph. Returns count of deleted chunks."""
        chunks = self.get_by_epigraph_id(db, epigraph_id=epigraph_id, limit=10000)
        count = len(chunks)
        for chunk in chunks:
            db.delete(chunk)
        db.commit()
        return count


epigraph_chunk = CRUDEpigraphChunk(EpigraphChunk)
