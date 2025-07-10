from typing import Dict, Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, status, Depends
from sqlmodel import select

from app.api.deps import SessionDep, get_current_active_superuser
from app.models.epigraph import Epigraph
from app.services.search_service import SearchService

router = APIRouter()


@router.post("/reindex")
def reindex_all_epigraphs(
    session: SessionDep,
    background_tasks: BackgroundTasks,
    _: dict = Depends(get_current_active_superuser),
):
    """Reindex all epigraphs to OpenSearch."""
    def reindex_task():
        search_service = SearchService(session)
        try:
            total_indexed = search_service.reindex_all_epigraphs()
            return {"message": f"Successfully reindexed {total_indexed} epigraphs"}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to reindex epigraphs: {str(e)}"
            )

    background_tasks.add_task(reindex_task)
    return {"message": "Reindexing started in background"}


@router.get("/stats")
def get_opensearch_stats(
    session: SessionDep,
    _: dict = Depends(get_current_active_superuser),
) -> Dict[str, Any]:
    """Get OpenSearch index statistics."""
    search_service = SearchService(session)
    stats = search_service.get_opensearch_stats()
    return stats


@router.post("/index/{epigraph_id}")
def index_epigraph(
    epigraph_id: int,
    session: SessionDep,
    _: dict = Depends(get_current_active_superuser),
):
    """Index a specific epigraph to OpenSearch."""
    search_service = SearchService(session)

    epigraph = session.exec(select(Epigraph).where(Epigraph.id == epigraph_id)).first()
    if not epigraph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Epigraph not found"
        )

    try:
        search_service.index_epigraph_to_opensearch(epigraph)
        return {"message": f"Successfully indexed epigraph {epigraph_id}"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to index epigraph: {str(e)}"
        )
