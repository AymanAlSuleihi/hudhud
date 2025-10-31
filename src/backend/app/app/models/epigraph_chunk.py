from datetime import datetime
from typing import Optional, TYPE_CHECKING, Dict, Any, List
from sqlmodel import Column, Field, Relationship, SQLModel
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector

from app.core.models import TimeStampModel

if TYPE_CHECKING:
    from app.models.epigraph import Epigraph


class EpigraphChunkBase(SQLModel):
    epigraph_id: int = Field(foreign_key="epigraph.id", index=True)
    chunk_text: str = Field(index=False)
    chunk_type: str = Field(
        index=True,
        description="Type of chunk: translation, cultural_notes, apparatus_notes, general_notes, object_description, named_entities"
    )
    chunk_index: int = Field(
        default=0,
        description="Position/order of this chunk within the epigraph"
    )
    chunk_metadata: Dict[str, Any] = Field(
        sa_column=Column(JSONB),
        default={},
        description="Additional context: title, period, language, topic, etc."
    )
    token_count: int = Field(
        default=0,
        description="Number of tokens in chunk_text for budget management"
    )
    embedding: Optional[list[float]] = Field(
        sa_column=Column(Vector(3072), nullable=True),
        default=None,
        description="Vector embedding of chunk_text"
    )


class EpigraphChunkCreate(EpigraphChunkBase):
    pass


class EpigraphChunkUpdate(SQLModel):
    chunk_text: Optional[str] = None
    chunk_type: Optional[str] = None
    chunk_index: Optional[int] = None
    chunk_metadata: Optional[Dict[str, Any]] = None
    token_count: Optional[int] = None
    embedding: Optional[list[float]] = None


class EpigraphChunk(TimeStampModel, EpigraphChunkBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    epigraph: Optional["Epigraph"] = Relationship(back_populates="chunks")


class EpigraphChunkOut(SQLModel):
    id: int
    epigraph_id: int
    chunk_text: str
    chunk_type: str
    chunk_index: int
    chunk_metadata: Dict[str, Any]
    token_count: int
    created_at: datetime
    updated_at: datetime


class EpigraphChunkOutWithScore(EpigraphChunkOut):
    similarity_score: Optional[float] = Field(
        default=None,
        description="Cosine similarity or distance score from search"
    )


class EpigraphChunkOutWithEpigraph(EpigraphChunkOut):
    epigraph_title: str
    epigraph_period: Optional[str] = None
    epigraph_language: Optional[str] = None


class ChunkEpigraphsRequest(SQLModel):
    """Request model for chunking epigraphs."""
    epigraph_ids: Optional[List[int]] = None
    limit: Optional[int] = None
    rechunk: bool = False
    generate_embeddings: bool = False


class ChunkEpigraphsResponse(SQLModel):
    """Response model for chunking operations."""
    status: str
    processed: int
    chunks_created: int
    failed: int
    failed_ids: List[int] = []
    elapsed_seconds: float
    message: str


class BatchEmbeddingRequest(SQLModel):
    """Request model for creating batch embedding jobs."""
    chunk_ids: Optional[List[int]] = None
    limit: Optional[int] = None
    use_batch_api: bool = True


class BatchEmbeddingResponse(SQLModel):
    """Response model for batch embedding operations."""
    status: str
    batch_id: Optional[str] = None
    chunk_count: int
    message: str
    estimated_cost: Optional[Dict[str, Any]] = None


class BatchStatusResponse(SQLModel):
    """Response model for batch job status."""
    id: str
    status: str
    created_at: int
    completed_at: Optional[int] = None
    failed_at: Optional[int] = None
    request_counts: Dict[str, int]
    output_file_id: Optional[str] = None
    error_file_id: Optional[str] = None


class ChunkStatisticsResponse(SQLModel):
    """Response model for chunk statistics."""
    total_epigraphs: int
    epigraphs_chunked: int
    epigraphs_not_chunked: int
    total_chunks: int
    chunks_with_embeddings: int
    chunks_without_embeddings: int
    average_chunks_per_epigraph: float
    average_tokens_per_chunk: float
    chunk_types: Dict[str, int]
    estimated_cost: Optional[Dict[str, Any]] = None


class EpigraphChunksOut(SQLModel):
    """Response model for list of chunks."""
    chunks: List[EpigraphChunkOut]
    count: int


class MultiBatchRequest(SQLModel):
    """Request model for creating multiple batch jobs."""
    chunk_ids: Optional[List[int]] = None
    chunks_per_batch: int = 50000
    max_batches: Optional[int] = None


class MultiBatchResponse(SQLModel):
    """Response model for multi-batch operations."""
    status: str
    total_chunks: int
    num_batches: int
    batch_ids: List[str]
    estimated_cost: Dict[str, Any]
    message: str


class MultiBatchStatusResponse(SQLModel):
    """Response model for multi-batch status check."""
    batch_ids: List[str]
    statuses: List[Dict[str, Any]]
    summary: Dict[str, int]
    all_completed: bool
    estimated_completion_time: Optional[str] = None


class SemanticSearchRequest(SQLModel):
    """Request model for semantic search."""
    query: str
    limit: int = 10
    distance_threshold: Optional[float] = None
    chunk_types: Optional[List[str]] = None
    periods: Optional[List[str]] = None
    languages: Optional[List[str]] = None


class ChunkSearchResult(SQLModel):
    """Individual chunk search result."""
    chunk: EpigraphChunkOut
    similarity_score: float
    epigraph_id: int
    epigraph_title: str
    epigraph_period: Optional[str] = None


class SemanticSearchResponse(SQLModel):
    """Response model for semantic search."""
    query: str
    results: List[ChunkSearchResult]
    total_results: int
    message: str
