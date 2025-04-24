import json
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlmodel import select, func, asc, desc

from app.api.deps import (
    SessionDep,
    get_current_active_superuser,
    get_current_active_superuser_no_error,
)
from app.crud.crud_site import site as crud_site
from app.models.site import (
    Site,
    SiteCreate,
    SiteUpdate,
    SiteOut,
    SitesOut,
)
from app.models.links import EpigraphSiteLink
from app.services.site.import_service import SiteImportService
from app.services.task_progress import TaskProgressService


router = APIRouter()


@router.get(
    "/",
    response_model=SitesOut,
)
def read_sites(
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
    sort_field: Optional[str] = None,
    sort_order: Optional[str] = None,
    filters: Optional[str] = None,
) -> SitesOut:
    """
    Retrieve sites.
    """
    total_count_statement = select(func.count()).select_from(Site)
    total_count = session.exec(total_count_statement).one()

    sites_statement = select(Site).offset(skip).limit(limit)
    sites = session.exec(sites_statement).all()

    return SitesOut(sites=sites, count=total_count)


@router.get(
    "/{site_id}",
    response_model=SiteOut,
)
def read_site(
    site_id: int,
    session: SessionDep,
) -> SiteOut:
    """
    Retrieve a site by ID.
    """
    site = crud_site.get(session, id=site_id)
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found",
        )
    return site


@router.post(
    "/",
    response_model=SiteOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def create_site(
    site_in: SiteCreate,
    session: SessionDep,
) -> SiteOut:
    """
    Create a new site.
    """
    site = crud_site.create(session, obj_in=site_in)
    return site


@router.put(
    "/{site_id}",
    response_model=SiteOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def update_site(
    site_id: int,
    site_in: SiteUpdate,
    session: SessionDep,
) -> SiteOut:
    """
    Update a site by ID.
    """
    site = crud_site.get(session, id=site_id)
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found",
        )
    site = crud_site.update(session, db_obj=site, obj_in=site_in)
    return site


@router.delete(
    "/{site_id}",
    response_model=SiteOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def delete_site(
    site_id: int,
    session: SessionDep,
) -> SiteOut:
    """
    Delete a site by ID.
    """
    site = crud_site.get(session, id=site_id)
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found",
        )
    site = crud_site.remove(session, id=site_id)
    return site


@router.post(
    "/import",
    dependencies=[Depends(get_current_active_superuser)],
)
def import_sites(
    background_tasks: BackgroundTasks,
    session: SessionDep,
) -> dict:
    """
    Import sites from external api.
    """
    task_service = TaskProgressService(session)
    task = task_service.get_or_create_task("import_sites")
    
    site_import_service = SiteImportService(session, task_service)
    background_tasks.add_task(site_import_service.import_all, task.uuid, 10)
    return {"task_id": task.uuid}
