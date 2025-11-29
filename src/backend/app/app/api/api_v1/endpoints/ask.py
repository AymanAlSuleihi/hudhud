import logging
import json
from typing import AsyncGenerator, List, Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import select
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep
from app.models.epigraph import Epigraph, EpigraphOut
from app.services.search_service import SearchService
from app.services.ai_service import AIService
from app.crud.crud_epigraph import epigraph as epigraph_crud

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
        MAX_CHUNK_RESULTS = 30
        MAX_TITLE_MATCHES = 15
        MAX_TOTAL_EPIGRAPHS = 30
        SEARCH_DISTANCE_THRESHOLD = 1.0

        search_service = SearchService(session)
        ai_service = AIService()

        try:
            intent, direct_response, search_query, epigraph_titles = ai_service.process_query(
                request.query,
                request.conversation_history or []
            )
            logger.info(f"Query processed - Intent: {intent}, Titles: {epigraph_titles}")

            if intent in ["greeting", "thanks", "meta", "help"] and direct_response:
                logger.info("Responding directly without database search")
                for char in direct_response:
                    yield f"data: {json.dumps({'type': 'token', 'content': char})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return

            logger.info(f"Search query: {search_query}")

            chunk_results = search_service.semantic_search_chunks(
                text=search_query,
                distance_threshold=SEARCH_DISTANCE_THRESHOLD,
                limit=MAX_CHUNK_RESULTS
            )

            logger.info(f"Found {len(chunk_results)} chunk results")

            if not chunk_results:
                logger.warning("No chunk results found")
                yield f"data: {json.dumps({'type': 'error', 'content': 'No results found'})}\n\n"
                return

            unique_epigraph_ids = list(set([chunk[1].id for chunk in chunk_results]))
            logger.info(f"Found {len(unique_epigraph_ids)} unique epigraphs from chunks")

            # Retrieve epigraphs by title if any were detected
            title_matched_epigraph_ids = []
            if epigraph_titles:
                logger.info(f"Searching for epigraphs by titles: {epigraph_titles}")
                title_matched_epigraphs = epigraph_crud.get_by_titles(
                    db=session, 
                    titles=epigraph_titles,
                    limit=MAX_TITLE_MATCHES
                )
                logger.info(f"Found {len(title_matched_epigraphs)} epigraphs matching titles")

                title_matched_epigraph_ids = [ep.id for ep in title_matched_epigraphs]

                for ep_id in title_matched_epigraph_ids:
                    if ep_id not in unique_epigraph_ids:
                        unique_epigraph_ids.insert(0, ep_id)

            epigraphs_query = select(Epigraph).where(Epigraph.id.in_(unique_epigraph_ids)).options(
                selectinload(Epigraph.objects),
                selectinload(Epigraph.sites_objs)
            )
            all_epigraphs = list(session.exec(epigraphs_query).all())

            title_matched_eps = [ep for ep in all_epigraphs if ep.id in title_matched_epigraph_ids]
            semantic_matched_eps = [ep for ep in all_epigraphs if ep.id not in title_matched_epigraph_ids]
            source_epigraphs = title_matched_eps + semantic_matched_eps

            epigraphs_data = [ep.model_dump(exclude={'embedding', 'created_at', 'updated_at', 'last_modified', 'images'}) for ep in source_epigraphs]

            logger.info(f"Sending {len(epigraphs_data)} epigraphs to frontend")
            yield f"data: {json.dumps({'type': 'epigraphs', 'content': epigraphs_data})}\n\n"

            logger.info("Creating answer generator with full epigraphs")

            num_title_matches = len(title_matched_epigraph_ids)

            if num_title_matches > 0:
                epigraph_limit = min(MAX_TOTAL_EPIGRAPHS, len(source_epigraphs))
                logger.info(f"Including {num_title_matches} title matches (capped at {MAX_TITLE_MATCHES}) + up to {epigraph_limit - num_title_matches} semantic matches (total: {epigraph_limit})")
            else:
                epigraph_limit = min(MAX_TOTAL_EPIGRAPHS, len(source_epigraphs))
                logger.info(f"Including up to {epigraph_limit} semantic matches (no title matches)")

            limited_epigraphs = source_epigraphs[:epigraph_limit]

            answer_generator = ai_service.generate_answer_with_epigraphs_streaming(
                request.query,
                limited_epigraphs,
                conversation_history=request.conversation_history or []
            )

            logger.info("Starting to iterate over answer generator")

            accumulated_response = ""
            token_count = 0

            async for chunk in answer_generator:
                if chunk["type"] == "token":
                    accumulated_response += chunk['content']
                    token_count += 1
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
