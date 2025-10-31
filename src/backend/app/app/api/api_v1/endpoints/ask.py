import logging
import json
from typing import Dict, Any, AsyncGenerator, List, Optional

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import select

from app.api.deps import SessionDep
from app.models.epigraph import Epigraph, EpigraphOut
from app.services.search_service import SearchService
from app.services.ai_service import AIService

router = APIRouter()

logger = logging.getLogger(__name__)

class ConversationMessage(BaseModel):
    role: str
    content: str

class QueryRequest(BaseModel):
    query: str
    conversation_history: Optional[List[ConversationMessage]] = []

class QueryResponse(BaseModel):
    answer: str
    epigraphs: list[EpigraphOut] = []


@router.post(
    "/query",
)
async def query_hudhud(
    request: QueryRequest,
    session: SessionDep,
):
    """Stream the AI response in real-time using Server-Sent Events."""

    async def generate_stream() -> AsyncGenerator[str, None]:
        search_service = SearchService(session)
        ai_service = AIService(session)
        try:
            logger.info(f"Starting stream generation for query: {request.query}")
            chunk_limit = 30
            search_query = ai_service.resolve_query_with_context(
                request.query,
                request.conversation_history or []
            )
            logger.info(f"Resolved search query: {search_query}")

            chunk_results = search_service.semantic_search_chunks(
                text=search_query,
                distance_threshold=1,
                limit=chunk_limit
            )

            logger.info(f"Found {len(chunk_results)} chunk results")

            if not chunk_results:
                logger.warning("No chunk results found")
                yield f"data: {json.dumps({'type': 'error', 'content': 'No results found'})}\n\n"
                return

            unique_epigraph_ids = list(set([chunk[1].id for chunk in chunk_results]))
            logger.info(f"Found {len(unique_epigraph_ids)} unique epigraphs from chunks")

            epigraphs_query = select(Epigraph).where(Epigraph.id.in_(unique_epigraph_ids))
            source_epigraphs = list(session.exec(epigraphs_query).all())

            epigraphs_data = [ep.model_dump(exclude={'embedding', 'created_at', 'updated_at', 'last_modified'}) for ep in source_epigraphs]

            logger.info(f"Sending {len(epigraphs_data)} epigraphs to frontend")
            yield f"data: {json.dumps({'type': 'epigraphs', 'content': epigraphs_data})}\n\n"

            logger.info("Creating answer generator with full epigraphs")

            epigraph_limit = min(10, len(source_epigraphs))
            limited_epigraphs = source_epigraphs[:epigraph_limit]

            answer_generator = ai_service.generate_answer_with_epigraphs_streaming(
                request.query,
                limited_epigraphs,
                conversation_history=request.conversation_history or []
            )

            logger.info("Starting to iterate over answer generator")
            async for chunk in answer_generator:
                if chunk["type"] == "token":
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk['content']})}\n\n"
                elif chunk["type"] == "error":
                    logger.error(f"Error from generator: {chunk['content']}")
                    yield f"data: {json.dumps({'type': 'error', 'content': chunk['content']})}\n\n"
                    return


            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            logger.error(f"Error during streaming search: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
