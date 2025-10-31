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
    EpigraphChunkOutWithScore,
    EpigraphChunkCreate,
    EpigraphChunkUpdate,
    ChunkEpigraphsRequest,
    ChunkEpigraphsResponse,
    BatchEmbeddingRequest,
    BatchEmbeddingResponse,
    BatchStatusResponse,
    ChunkStatisticsResponse,
    EpigraphChunksOut,
    MultiBatchRequest,
    MultiBatchResponse,
    MultiBatchStatusResponse,
    SemanticSearchRequest,
    ChunkSearchResult,
    SemanticSearchResponse,
)
from app.services.chunking_service import ChunkingService
from app.services.embeddings_service import EmbeddingsService
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
    """Retrieve chunks with pagination."""
    total_count_statement = select(func.count()).select_from(EpigraphChunk)
    total_count = session.exec(total_count_statement).one()

    chunks = crud_epigraph_chunk.get_multi(session, skip=skip, limit=limit)

    return EpigraphChunksOut(chunks=chunks, count=total_count)


@router.get(
    "/statistics",
    response_model=ChunkStatisticsResponse,
    status_code=status.HTTP_200_OK,
)
def get_chunk_statistics(
    *,
    session: SessionDep,
) -> ChunkStatisticsResponse:
    """Get comprehensive statistics about epigraph chunks, embeddings, and estimated costs."""
    total_epigraphs = session.exec(
        select(func.count(Epigraph.id))
    ).one()

    epigraphs_chunked = session.exec(
        select(func.count(func.distinct(EpigraphChunk.epigraph_id)))
    ).one()

    total_chunks = session.exec(
        select(func.count(EpigraphChunk.id))
    ).one()

    chunks_with_embeddings = session.exec(
        select(func.count(EpigraphChunk.id))
        .where(EpigraphChunk.embedding.is_not(None))
    ).one()

    chunks_without_embeddings = total_chunks - chunks_with_embeddings

    avg_chunks = total_chunks / epigraphs_chunked if epigraphs_chunked > 0 else 0

    avg_tokens = session.exec(
        select(func.avg(EpigraphChunk.token_count))
    ).one() or 0

    chunk_types_result = session.exec(
        select(
            EpigraphChunk.chunk_type,
            func.count(EpigraphChunk.id)
        ).group_by(EpigraphChunk.chunk_type)
    ).all()

    chunk_types = {chunk_type: count for chunk_type, count in chunk_types_result}

    estimated_cost = None
    if chunks_without_embeddings > 0:
        estimated_tokens = chunks_without_embeddings * float(avg_tokens)
        cost_standard = estimated_tokens / 1_000_000 * 0.13
        cost_batch = estimated_tokens / 1_000_000 * 0.065

        estimated_cost = {
            "estimated_tokens": int(estimated_tokens),
            "standard_api_cost": round(cost_standard, 2),
            "batch_api_cost": round(cost_batch, 2),
            "savings": round(cost_standard - cost_batch, 2),
            "savings_percent": 50.0
        }

    return ChunkStatisticsResponse(
        total_epigraphs=total_epigraphs,
        epigraphs_chunked=epigraphs_chunked,
        epigraphs_not_chunked=total_epigraphs - epigraphs_chunked,
        total_chunks=total_chunks,
        chunks_with_embeddings=chunks_with_embeddings,
        chunks_without_embeddings=chunks_without_embeddings,
        average_chunks_per_epigraph=round(avg_chunks, 2),
        average_tokens_per_chunk=round(avg_tokens, 2),
        chunk_types=chunk_types,
        estimated_cost=estimated_cost
    )


@router.get(
    "/{chunk_id}",
    response_model=EpigraphChunkOut,
)
def read_chunk(
    chunk_id: int,
    session: SessionDep,
) -> EpigraphChunkOut:
    """Retrieve a single chunk by ID."""
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
    """Retrieve all chunks for a specific epigraph."""
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
    """Retrieve chunks by type (e.g., translation, cultural_notes)."""
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
    """Create a new chunk."""
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
    """Update an existing chunk."""
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
    """Delete a chunk by ID."""
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
    """Delete all chunks for a specific epigraph."""
    deleted_count = crud_epigraph_chunk.delete_by_epigraph_id(session, epigraph_id=epigraph_id)
    return {
        "status": "success",
        "epigraph_id": epigraph_id,
        "deleted_count": deleted_count,
        "message": f"Deleted {deleted_count} chunks for epigraph {epigraph_id}"
    }


def chunk_epigraphs_background(
    session,
    epigraph_ids: Optional[List[int]] = None,
    limit: Optional[int] = None,
    rechunk: bool = False
):
    """Background task to chunk epigraphs."""
    try:
        chunking_service = ChunkingService(session)

        if epigraph_ids:
            query = select(Epigraph).where(Epigraph.id.in_(epigraph_ids))
        elif rechunk:
            query = select(Epigraph).where(Epigraph.dasi_published.is_(True))
            if limit:
                query = query.limit(limit)
        else:
            subquery = select(EpigraphChunk.epigraph_id).distinct()
            query = select(Epigraph).where(
                Epigraph.id.not_in(subquery),
                Epigraph.dasi_published.is_(True)
            )
            if limit:
                query = query.limit(limit)

        epigraphs = session.exec(query).all()

        logger.info(f"Background task: Processing {len(epigraphs)} epigraphs")

        for epigraph in epigraphs:
            if rechunk:
                chunking_service.update_chunks_for_epigraph(epigraph)
            else:
                chunking_service.create_and_save_chunks(epigraph)

        logger.info(f"Background task: Completed chunking {len(epigraphs)} epigraphs")

    except Exception as e:
        logger.error(f"Background chunking task failed: {e}")


@router.post(
    "/process",
    response_model=ChunkEpigraphsResponse,
    status_code=status.HTTP_200_OK,
)
def chunk_epigraphs(
    *,
    session: SessionDep,
    request: ChunkEpigraphsRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_active_superuser),
) -> ChunkEpigraphsResponse:
    """Chunk epigraphs into smaller pieces for RAG with optional immediate embeddings."""
    import time
    start_time = time.time()

    chunking_service = ChunkingService(session)

    if request.epigraph_ids:
        epigraphs = session.exec(
            select(Epigraph).where(Epigraph.id.in_(request.epigraph_ids))
        ).all()
    elif request.rechunk:
        query = select(Epigraph).where(Epigraph.dasi_published.is_(True))
        if request.limit:
            query = query.limit(request.limit)
        epigraphs = session.exec(query).all()
    else:
        subquery = select(EpigraphChunk.epigraph_id).distinct()
        query = select(Epigraph).where(
            Epigraph.id.not_in(subquery),
            Epigraph.dasi_published.is_(True)
        )
        if request.limit:
            query = query.limit(request.limit)
        epigraphs = session.exec(query).all()

    if not epigraphs:
        return ChunkEpigraphsResponse(
            status="no_work",
            processed=0,
            chunks_created=0,
            failed=0,
            elapsed_seconds=0,
            message="No epigraphs to process"
        )

    if len(epigraphs) > 100:
        background_tasks.add_task(
            chunk_epigraphs_background,
            session=session,
            epigraph_ids=request.epigraph_ids,
            limit=request.limit,
            rechunk=request.rechunk
        )
        return ChunkEpigraphsResponse(
            status="processing",
            processed=0,
            chunks_created=0,
            failed=0,
            elapsed_seconds=0,
            message=f"Processing {len(epigraphs)} epigraphs in background"
        )

    processed = 0
    total_chunks = 0
    failed = []

    for epigraph in epigraphs:
        try:
            if request.rechunk:
                chunks = chunking_service.update_chunks_for_epigraph(
                    epigraph,
                    generate_embeddings=request.generate_embeddings
                )
            else:
                chunks = chunking_service.create_and_save_chunks(
                    epigraph,
                    generate_embeddings=request.generate_embeddings
                )
            processed += 1
            total_chunks += len(chunks)
        except Exception as e:
            logger.error(f"Failed to chunk epigraph {epigraph.id}: {e}")
            failed.append(epigraph.id)

    elapsed = time.time() - start_time

    return ChunkEpigraphsResponse(
        status="completed",
        processed=processed,
        chunks_created=total_chunks,
        failed=len(failed),
        failed_ids=failed,
        elapsed_seconds=elapsed,
        message=f"Successfully processed {processed} epigraphs, created {total_chunks} chunks"
    )


@router.post(
    "/embeddings/batch/create",
    response_model=BatchEmbeddingResponse,
    status_code=status.HTTP_200_OK,
)
def create_batch_embedding_job(
    *,
    session: SessionDep,
    request: BatchEmbeddingRequest,
    current_user=Depends(get_current_active_superuser),
) -> BatchEmbeddingResponse:
    """Create a batch embedding job for chunks using OpenAI's Batch API (50% cost savings)."""
    embeddings_service = EmbeddingsService(session)

    if request.chunk_ids:
        query = select(EpigraphChunk).where(
            EpigraphChunk.id.in_(request.chunk_ids)
        ).where(
            EpigraphChunk.embedding.is_(None)
        )
    else:
        query = select(EpigraphChunk).where(
            EpigraphChunk.embedding.is_(None)
        )
        if request.limit:
            query = query.limit(request.limit)

    chunks = session.exec(query).all()

    if not chunks:
        return BatchEmbeddingResponse(
            status="no_work",
            chunk_count=0,
            message="No chunks found without embeddings"
        )

    chunk_ids = [chunk.id for chunk in chunks]

    avg_tokens = sum(c.token_count for c in chunks) / len(chunks)
    total_tokens = len(chunks) * avg_tokens
    cost_standard = float(total_tokens) / 1_000_000 * 0.13
    cost_batch = float(total_tokens) / 1_000_000 * 0.065

    estimated_cost = {
        "estimated_tokens": int(total_tokens),
        "standard_api_cost": round(cost_standard, 2),
        "batch_api_cost": round(cost_batch, 2),
        "savings": round(cost_standard - cost_batch, 2),
        "savings_percent": 50.0
    }

    result = embeddings_service.process_chunks_batch(
        chunk_ids=chunk_ids,
        use_batch_api=request.use_batch_api
    )

    if result.get("status") == "batch_created":
        return BatchEmbeddingResponse(
            status="batch_created",
            batch_id=result["batch_id"],
            chunk_count=result["chunk_count"],
            message=f"Batch job created for {result['chunk_count']} chunks. Check status with /embeddings/batch/status/{result['batch_id']}",
            estimated_cost=estimated_cost
        )
    elif result.get("status") == "completed":
        return BatchEmbeddingResponse(
            status="completed",
            chunk_count=result["chunk_count"],
            message=f"Processed {result['processed']} chunks immediately",
            estimated_cost=estimated_cost
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create batch job: {result.get('message', 'Unknown error')}"
        )


@router.get(
    "/embeddings/batch/status/{batch_id}",
    response_model=BatchStatusResponse,
    status_code=status.HTTP_200_OK,
)
def get_batch_embedding_status(
    *,
    session: SessionDep,
    batch_id: str,
) -> BatchStatusResponse:
    """Check the status of a batch embedding job."""
    embeddings_service = EmbeddingsService(session)

    status_info = embeddings_service.get_batch_job_status(batch_id)

    if not status_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch job {batch_id} not found"
        )

    return BatchStatusResponse(**status_info)


@router.post(
    "/embeddings/batch/apply/{batch_id}",
    status_code=status.HTTP_200_OK,
)
def apply_batch_embedding_results(
    *,
    session: SessionDep,
    batch_id: str,
    current_user=Depends(get_current_active_superuser),
) -> Dict[str, Any]:
    """Apply results from a completed batch embedding job to chunks."""
    embeddings_service = EmbeddingsService(session)

    status_info = embeddings_service.get_batch_job_status(batch_id)

    if not status_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch job {batch_id} not found"
        )

    if status_info["status"] != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch job is not completed yet (status: {status_info['status']})"
        )

    # Apply results
    result = embeddings_service.apply_batch_results_to_chunks(batch_id)

    if result.get("status") == "completed":
        return {
            "status": "success",
            "batch_id": batch_id,
            "updated_chunks": result["updated"],
            "failed_chunks": result["failed"],
            "message": f"Successfully applied embeddings to {result['updated']} chunks"
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to apply results: {result.get('message', 'Unknown error')}"
        )


@router.get(
    "/embeddings/batch/list",
    status_code=status.HTTP_200_OK,
)
def list_batch_jobs(
    *,
    session: SessionDep,
    limit: int = Query(default=20, le=100),
) -> Dict[str, Any]:
    """List recent batch embedding jobs from OpenAI's batch API."""
    embeddings_service = EmbeddingsService(session)

    if not embeddings_service.client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI client not configured"
        )

    try:
        batches = embeddings_service.client.batches.list(limit=limit)

        batch_list = []
        for batch in batches.data:
            batch_list.append({
                "id": batch.id,
                "status": batch.status,
                "created_at": batch.created_at,
                "completed_at": batch.completed_at,
                "request_counts": {
                    "total": batch.request_counts.total,
                    "completed": batch.request_counts.completed,
                    "failed": batch.request_counts.failed,
                }
            })

        return {
            "batches": batch_list,
            "count": len(batch_list)
        }

    except Exception as e:
        logger.error(f"Failed to list batch jobs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list batch jobs: {str(e)}"
        )


@router.post(
    "/embeddings/batch/create-multiple",
    response_model=MultiBatchResponse,
    status_code=status.HTTP_200_OK,
)
def create_multiple_batch_jobs(
    *,
    session: SessionDep,
    request: MultiBatchRequest,
    current_user=Depends(get_current_active_superuser),
) -> MultiBatchResponse:
    """Create multiple batch embedding jobs for large-scale processing (auto-splits into batches of up to 50k chunks)."""
    embeddings_service = EmbeddingsService(session)

    if request.chunk_ids:
        query = select(EpigraphChunk).where(
            EpigraphChunk.id.in_(request.chunk_ids)
        ).where(
            EpigraphChunk.embedding.is_(None)
        )
    else:
        query = select(EpigraphChunk).where(
            EpigraphChunk.embedding.is_(None)
        )

    all_chunks = session.exec(query).all()

    if not all_chunks:
        return MultiBatchResponse(
            status="no_work",
            total_chunks=0,
            num_batches=0,
            batch_ids=[],
            estimated_cost={
                "estimated_tokens": 0,
                "standard_api_cost": 0.0,
                "batch_api_cost": 0.0,
                "savings": 0.0,
                "savings_percent": 50.0
            },
            message="No chunks found without embeddings"
        )

    total_tokens = sum(c.token_count for c in all_chunks)
    cost_standard = float(total_tokens) / 1_000_000 * 0.13
    cost_batch = float(total_tokens) / 1_000_000 * 0.065

    estimated_cost = {
        "estimated_tokens": total_tokens,
        "standard_api_cost": round(cost_standard, 2),
        "batch_api_cost": round(cost_batch, 2),
        "savings": round(cost_standard - cost_batch, 2),
        "savings_percent": 50.0
    }

    chunks_per_batch = min(request.chunks_per_batch, 50000)
    batch_ids = []

    for i in range(0, len(all_chunks), chunks_per_batch):
        if request.max_batches and len(batch_ids) >= request.max_batches:
            logger.info(f"Reached max_batches limit of {request.max_batches}")
            break

        batch_chunks = all_chunks[i:i + chunks_per_batch]
        batch_num = len(batch_ids) + 1

        logger.info(f"Creating batch {batch_num} with {len(batch_chunks)} chunks")

        try:
            texts = [chunk.chunk_text for chunk in batch_chunks]
            custom_ids = [str(chunk.id) for chunk in batch_chunks]

            batch_id = embeddings_service.create_batch_embedding_job(
                texts=texts,
                custom_ids=custom_ids,
                description=f"Batch {batch_num} of epigraph chunks ({len(batch_chunks)} chunks)"
            )

            if batch_id:
                batch_ids.append(batch_id)
                logger.info(f"Created batch {batch_num}: {batch_id}")
            else:
                logger.error(f"Failed to create batch {batch_num}")

        except Exception as e:
            logger.error(f"Error creating batch {batch_num}: {e}")
            continue

    if not batch_ids:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create any batch jobs"
        )

    try:
        import json
        from pathlib import Path
        batch_tracking_file = Path("/app/batch_jobs.json")

        # Load existing data
        if batch_tracking_file.exists():
            with open(batch_tracking_file, 'r') as f:
                data = json.load(f)
        else:
            data = {"jobs": []}

        data["jobs"].append({
            "timestamp": datetime.now().isoformat(),
            "batch_ids": batch_ids,
            "total_chunks": len(all_chunks),
            "chunks_per_batch": chunks_per_batch,
            "estimated_cost": estimated_cost
        })

        with open(batch_tracking_file, 'w') as f:
            json.dump(data, f, indent=2)

        logger.info(f"Saved batch tracking info to {batch_tracking_file}")
    except Exception as e:
        logger.warning(f"Failed to save batch tracking file: {e}")

    return MultiBatchResponse(
        status="batches_created",
        total_chunks=len(all_chunks),
        num_batches=len(batch_ids),
        batch_ids=batch_ids,
        estimated_cost=estimated_cost,
        message=f"Created {len(batch_ids)} batch jobs for {len(all_chunks)} chunks. Use /embeddings/batch/status-multiple to track progress."
    )


@router.post(
    "/embeddings/batch/status-multiple",
    response_model=MultiBatchStatusResponse,
    status_code=status.HTTP_200_OK,
)
def get_multiple_batch_status(
    *,
    session: SessionDep,
    batch_ids: List[str],
) -> MultiBatchStatusResponse:
    """Check status of multiple batch jobs with summary counts and completion estimates."""
    embeddings_service = EmbeddingsService(session)

    statuses = []
    summary = {
        "completed": 0,
        "in_progress": 0,
        "validating": 0,
        "finalizing": 0,
        "failed": 0,
        "expired": 0,
        "cancelled": 0
    }

    for batch_id in batch_ids:
        try:
            status_info = embeddings_service.get_batch_job_status(batch_id)
            if status_info:
                statuses.append(status_info)
                batch_status = status_info["status"]
                if batch_status in summary:
                    summary[batch_status] += 1
                else:
                    summary["in_progress"] += 1  # fallback
        except Exception as e:
            logger.error(f"Failed to get status for batch {batch_id}: {e}")
            statuses.append({
                "id": batch_id,
                "status": "error",
                "error": str(e)
            })

    all_completed = summary["completed"] == len(batch_ids)

    estimated_completion = None
    if not all_completed and summary["completed"] > 0:
        in_progress_count = len(batch_ids) - summary["completed"] - summary["failed"] - summary["expired"] - summary["cancelled"]
        if in_progress_count > 0:
            estimated_completion = f"~{in_progress_count * 2}-{in_progress_count * 4} hours remaining"

    return MultiBatchStatusResponse(
        batch_ids=batch_ids,
        statuses=statuses,
        summary=summary,
        all_completed=all_completed,
        estimated_completion_time=estimated_completion
    )


@router.post(
    "/embeddings/batch/apply-multiple",
    status_code=status.HTTP_200_OK,
)
def apply_multiple_batch_results(
    *,
    session: SessionDep,
    batch_ids: List[str],
    current_user=Depends(get_current_active_superuser),
) -> Dict[str, Any]:
    """Apply results from multiple completed batch jobs (skips incomplete batches)."""
    embeddings_service = EmbeddingsService(session)

    results = {
        "applied": [],
        "skipped": [],
        "failed": [],
        "total_chunks_updated": 0
    }

    for batch_id in batch_ids:
        try:
            status_info = embeddings_service.get_batch_job_status(batch_id)

            if not status_info:
                results["failed"].append({
                    "batch_id": batch_id,
                    "reason": "Batch not found"
                })
                continue

            if status_info["status"] != "completed":
                results["skipped"].append({
                    "batch_id": batch_id,
                    "status": status_info["status"],
                    "reason": f"Not completed yet (status: {status_info['status']})"
                })
                continue

            result = embeddings_service.apply_batch_results_to_chunks(batch_id)

            if result.get("status") == "completed":
                results["applied"].append({
                    "batch_id": batch_id,
                    "chunks_updated": result["updated"],
                    "chunks_failed": result["failed"]
                })
                results["total_chunks_updated"] += result["updated"]
            else:
                results["failed"].append({
                    "batch_id": batch_id,
                    "reason": result.get("message", "Unknown error")
                })

        except Exception as e:
            logger.error(f"Error applying batch {batch_id}: {e}")
            results["failed"].append({
                "batch_id": batch_id,
                "reason": str(e)
            })

    return {
        "status": "completed",
        "summary": {
            "applied": len(results["applied"]),
            "skipped": len(results["skipped"]),
            "failed": len(results["failed"]),
            "total_chunks_updated": results["total_chunks_updated"]
        },
        "details": results,
        "message": f"Applied {len(results['applied'])} batches, updated {results['total_chunks_updated']} chunks"
    }


@router.get(
    "/embeddings/batch/tracking",
    status_code=status.HTTP_200_OK,
)
def get_batch_tracking_info(
    *,
    session: SessionDep,
) -> Dict[str, Any]:
    """Get tracking information for all batch jobs created via create-multiple endpoint."""
    try:
        import json
        from pathlib import Path
        batch_tracking_file = Path("/app/batch_jobs.json")

        if not batch_tracking_file.exists():
            return {
                "jobs": [],
                "message": "No batch jobs tracked yet"
            }

        with open(batch_tracking_file, 'r') as f:
            data = json.load(f)

        return data

    except Exception as e:
        logger.error(f"Failed to read batch tracking file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read tracking info: {str(e)}"
        )


@router.post(
    "/search",
    response_model=SemanticSearchResponse,
    status_code=status.HTTP_200_OK,
)
def semantic_search_chunks(
    *,
    session: SessionDep,
    request: SemanticSearchRequest,
) -> SemanticSearchResponse:
    """Semantic search across epigraph chunks using embeddings with optional filtering by type, period, and language."""
    embeddings_service = EmbeddingsService(session)

    query_embedding = embeddings_service.generate_embedding(request.query)

    if not query_embedding:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate query embedding"
        )

    query = select(
        EpigraphChunk,
        EpigraphChunk.embedding.cosine_distance(query_embedding).label('distance')
    ).where(
        EpigraphChunk.embedding.is_not(None)
    )

    if request.chunk_types:
        query = query.where(EpigraphChunk.chunk_type.in_(request.chunk_types))

    if request.periods or request.languages:
        from sqlalchemy import cast, String
        from sqlalchemy.dialects.postgresql import JSONB

        if request.periods:
            query = query.where(
                cast(EpigraphChunk.chunk_metadata['period'], String).in_(request.periods)
            )

        if request.languages:
            query = query.where(
                cast(EpigraphChunk.chunk_metadata['language'], String).in_(request.languages)
            )

    if request.distance_threshold is not None:
        query = query.where(
            EpigraphChunk.embedding.cosine_distance(query_embedding) < request.distance_threshold
        )

    query = query.order_by('distance').limit(request.limit)

    results = session.exec(query).all()

    chunk_results = []
    for chunk, distance in results:
        epigraph = session.get(Epigraph, chunk.epigraph_id)

        if epigraph:
            similarity_score = 1.0 - distance

            chunk_results.append(
                ChunkSearchResult(
                    chunk=EpigraphChunkOut(
                        id=chunk.id,
                        epigraph_id=chunk.epigraph_id,
                        chunk_text=chunk.chunk_text,
                        chunk_type=chunk.chunk_type,
                        chunk_index=chunk.chunk_index,
                        chunk_metadata=chunk.chunk_metadata,
                        token_count=chunk.token_count,
                        created_at=chunk.created_at,
                        updated_at=chunk.updated_at,
                    ),
                    similarity_score=round(similarity_score, 4),
                    epigraph_id=epigraph.id,
                    epigraph_title=epigraph.title,
                    epigraph_period=epigraph.period,
                )
            )

    return SemanticSearchResponse(
        query=request.query,
        results=chunk_results,
        total_results=len(chunk_results),
        message=f"Found {len(chunk_results)} relevant chunks"
    )


@router.post(
    "/search/with-context",
    status_code=status.HTTP_200_OK,
)
def semantic_search_with_context(
    *,
    session: SessionDep,
    request: SemanticSearchRequest,
) -> Dict[str, Any]:
    """Semantic search with surrounding context chunks grouped by epigraph for enhanced RAG context."""
    embeddings_service = EmbeddingsService(session)

    query_embedding = embeddings_service.generate_embedding(request.query)

    if not query_embedding:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate query embedding"
        )

    query = select(
        EpigraphChunk,
        EpigraphChunk.embedding.cosine_distance(query_embedding).label('distance')
    ).where(
        EpigraphChunk.embedding.is_not(None)
    )

    if request.chunk_types:
        query = query.where(EpigraphChunk.chunk_type.in_(request.chunk_types))

    if request.distance_threshold is not None:
        query = query.where(
            EpigraphChunk.embedding.cosine_distance(query_embedding) < request.distance_threshold
        )

    query = query.order_by('distance').limit(request.limit)

    results = session.exec(query).all()

    epigraph_groups = {}

    for chunk, distance in results:
        epigraph_id = chunk.epigraph_id

        if epigraph_id not in epigraph_groups:
            epigraph = session.get(Epigraph, epigraph_id)

            all_chunks = session.exec(
                select(EpigraphChunk)
                .where(EpigraphChunk.epigraph_id == epigraph_id)
                .order_by(EpigraphChunk.chunk_index)
            ).all()

            epigraph_groups[epigraph_id] = {
                "epigraph": {
                    "id": epigraph.id,
                    "title": epigraph.title,
                    "period": epigraph.period,
                    "language": epigraph.language_level_1,
                },
                "matching_chunks": [],
                "all_chunks": [
                    {
                        "id": c.id,
                        "chunk_type": c.chunk_type,
                        "chunk_index": c.chunk_index,
                        "chunk_text": c.chunk_text,
                        "token_count": c.token_count,
                    }
                    for c in all_chunks
                ]
            }

        similarity_score = 1.0 - distance
        epigraph_groups[epigraph_id]["matching_chunks"].append({
            "chunk_id": chunk.id,
            "chunk_type": chunk.chunk_type,
            "chunk_index": chunk.chunk_index,
            "chunk_text": chunk.chunk_text,
            "similarity_score": round(similarity_score, 4),
        })

    return {
        "query": request.query,
        "epigraphs": list(epigraph_groups.values()),
        "total_epigraphs": len(epigraph_groups),
        "total_matching_chunks": len(results),
        "message": f"Found {len(results)} matching chunks across {len(epigraph_groups)} epigraphs"
    }
