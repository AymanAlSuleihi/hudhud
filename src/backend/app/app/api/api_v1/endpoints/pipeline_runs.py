from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import desc, func, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.api.params import PageLimit, PageOffset, UuidPath
from app.models.pipeline_run import (
    PipelineRun,
    PipelineRunOut,
    PipelineRunsOut,
    TriggerDasiPipelineRequest,
)
from app.services.pipeline.dispatch import dispatch_dasi_pipeline
from app.services.pipeline.run_service import PipelineRunService

router = APIRouter(prefix="/pipelines", tags=["pipelines"])


@router.get(
    "/",
    response_model=PipelineRunsOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def read_pipeline_runs(
    session: SessionDep,
    skip: PageOffset = 0,
    limit: PageLimit = 100,
) -> PipelineRunsOut:
    total_count = session.exec(select(func.count()).select_from(PipelineRun)).one()
    pipeline_runs = session.exec(
        select(PipelineRun)
        .order_by(desc(PipelineRun.created_at))
        .offset(skip)
        .limit(limit)
    ).all()
    return PipelineRunsOut(pipeline_runs=pipeline_runs, count=total_count)


@router.get(
    "/uuid/{uuid}",
    response_model=PipelineRunOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def read_pipeline_run_by_uuid(
    uuid: UuidPath,
    session: SessionDep,
) -> PipelineRun:
    pipeline_run = PipelineRunService(session).get_run(uuid)
    if not pipeline_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline run not found",
        )
    return pipeline_run


@router.post(
    "/dasi/sync",
    response_model=PipelineRunOut,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(get_current_active_superuser)],
)
def trigger_dasi_sync(
    request: TriggerDasiPipelineRequest,
    session: SessionDep,
) -> PipelineRun:
    if (request.start_id is None) != (request.end_id is None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_id and end_id must be provided together",
        )

    if not any(
        [
            request.import_sites,
            request.import_objects,
            request.import_epigraphs,
            request.run_chunking,
            request.reindex_search,
        ]
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one import or enrichment stage must be enabled",
        )

    payload = request.model_dump(exclude_none=True)
    return dispatch_dasi_pipeline(session, parameters=payload)
