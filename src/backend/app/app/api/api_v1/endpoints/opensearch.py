from typing import Dict, Any

from fastapi import APIRouter, HTTPException, status, Depends
from sqlmodel import select

from app.api.deps import SessionDep, get_current_active_superuser
from app.api.params import ResourceIdPath
from app.models.epigraph import Epigraph
from app.models.pipeline_run import PipelineRunOut
from app.services.pipeline.dispatch import dispatch_dasi_pipeline
from app.services.search.service import SearchService

router = APIRouter(prefix="/opensearch", tags=["opensearch"])


@router.post(
    "/reindex",
    response_model=PipelineRunOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def reindex_all_epigraphs(
    session: SessionDep,
):
    """Reindex all epigraphs to OpenSearch."""
    return dispatch_dasi_pipeline(
        session,
        parameters={
            "import_sites": False,
            "import_objects": False,
            "import_epigraphs": False,
            "run_chunking": False,
            "generate_embeddings": False,
            "reindex_search": True,
        },
    )


@router.get("/stats", dependencies=[Depends(get_current_active_superuser)])
def get_opensearch_stats(
    session: SessionDep,
) -> Dict[str, Any]:
    """Get OpenSearch index statistics."""
    search_service = SearchService(session)
    stats = search_service.get_opensearch_stats()
    return stats


@router.post("/index/{epigraph_id}", dependencies=[Depends(get_current_active_superuser)])
def index_epigraph(
    epigraph_id: ResourceIdPath,
    session: SessionDep,
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
