import logging
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.api.deps import SessionDep
from app.models.epigraph import EpigraphOut
from app.services.search_service import SearchService

router = APIRouter()

logger = logging.getLogger(__name__)

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    answer: str
    epigraphs: list[EpigraphOut] = []


@router.post(
    "/query",
    response_model=QueryResponse,
)
def query_hudhud(
    request: QueryRequest,
    session: SessionDep,
) -> Dict[str, Any]:
    search_service = SearchService(session)
    try:
        results = search_service.smart_search(request.query)

        logger.info(f"Search results: {results}")

        return QueryResponse(
            answer=results["answer"],
            epigraphs=results["epigraphs"],
        )
    except Exception as e:
        logger.error(f"Error during smart search: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during smart search: {str(e)}",
        )
