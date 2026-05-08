import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import select, func, asc, desc

from app.api.deps import (
    SessionDep,
    get_current_active_superuser,
    get_current_active_superuser_no_error,
)
from app.api.params import DasiIdPath, JsonFiltersParam, PageLimit, PageOffset, ResourceIdPath, SortFieldParam, SortOrderParam
from app.crud.crud_site import site as crud_site
from app.crud.crud_epigraph import epigraph as crud_epigraph
from app.crud.crud_object import obj as crud_object
from app.models.site import (
    Site,
    SiteCreate,
    SiteUpdate,
    SiteOut,
    SitesOut,
)
from app.models.pipeline_run import PipelineRun, PipelineRunOut
from app.services.importers.site import SiteImportService
from app.services.pipeline.dispatch import dispatch_dasi_pipeline


router = APIRouter(prefix="/sites", tags=["sites"])


@router.get(
    "/",
    response_model=SitesOut,
)
def read_sites(
    session: SessionDep,
    skip: PageOffset = 0,
    limit: PageLimit = 100,
    sort_field: SortFieldParam = None,
    sort_order: SortOrderParam = None,
    filters: JsonFiltersParam = None,
) -> SitesOut:
    """
    Retrieve sites.
    """
    sites_statement = select(Site)

    if filters:
        filters_dict = json.loads(filters)
        for key, value in filters_dict.items():
            if isinstance(value, bool):
                sites_statement = sites_statement.where(
                    getattr(Site, key).is_(value)
                )
            elif isinstance(value, dict) and "not" in value and value["not"] is False:
                sites_statement = sites_statement.where(
                    getattr(Site, key).isnot(False)
                )
            else:
                sites_statement = sites_statement.where(
                    getattr(Site, key).ilike(f"%{value}%")
                )

    total_count_statement = select(func.count()).select_from(sites_statement)
    total_count = session.exec(total_count_statement).one()

    sites_statement = sites_statement.offset(skip).limit(limit)

    if sort_field:
        if sort_order == "desc":
            sites_statement = sites_statement.order_by(desc(getattr(Site, sort_field)))
        else:
            sites_statement = sites_statement.order_by(asc(getattr(Site, sort_field)))

    sites = session.exec(sites_statement).all()

    return SitesOut(sites=sites, count=total_count)


@router.get(
    "/{site_id}",
    response_model=SiteOut,
)
def read_site(
    site_id: ResourceIdPath,
    session: SessionDep,
) -> Site:
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


@router.get(
    "/dasi_id/{dasi_id}",
    response_model=SiteOut,
)
def read_site_by_dasi_id(
    dasi_id: DasiIdPath,
    session: SessionDep,
) -> Site:
    """
    Retrieve a site by DASI ID.
    """
    site = crud_site.get_by_dasi_id(session, dasi_id=dasi_id)
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found",
        )
    return site


@router.post(
    "/",
    response_model=SiteOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_active_superuser)],
)
def create_site(
    site_in: SiteCreate,
    session: SessionDep,
) -> Site:
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
    site_id: ResourceIdPath,
    site_in: SiteUpdate,
    session: SessionDep,
) -> Site:
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
    site_id: ResourceIdPath,
    session: SessionDep,
) -> Site:
    """
    Delete a site by ID.
    """
    site = crud_site.get(session, id=site_id)
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found",
        )
    deleted_site = crud_site.remove(session, id=site_id)
    if deleted_site is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Site removal failed",
        )
    return deleted_site


@router.post(
    "/import",
    dependencies=[Depends(get_current_active_superuser)],
)
def import_sites(
    session: SessionDep,
    dasi_id: Annotated[int | None, Query(ge=1)] = None,
    update_existing: bool = False,
):
    """
    Import sites from external api.
    """
    site_import_service = SiteImportService(session)
    if dasi_id:
        site = crud_site.get_by_dasi_id(session, dasi_id=dasi_id)
        if site and not update_existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Site already exists",
            )
        return site_import_service.import_single(dasi_id)

    return dispatch_dasi_pipeline(
        session,
        parameters={
            "import_sites": True,
            "import_objects": False,
            "import_epigraphs": False,
            "update_existing": update_existing,
            "run_chunking": False,
            "generate_embeddings": False,
            "reindex_search": False,
        },
    )


@router.post(
    "/import_range",
    response_model=PipelineRunOut,
    dependencies=[Depends(get_current_active_superuser)],
)
def import_sites_range(
    session: SessionDep,
    start_id: Annotated[int, Query(ge=1)],
    end_id: Annotated[int, Query(ge=1)],
    update_existing: bool = False,
) -> PipelineRun:
    """
    Import sites from external api in a range.
    """
    return dispatch_dasi_pipeline(
        session,
        parameters={
            "import_sites": True,
            "import_objects": False,
            "import_epigraphs": False,
            "start_id": start_id,
            "end_id": end_id,
            "update_existing": update_existing,
            "run_chunking": False,
            "generate_embeddings": False,
            "reindex_search": False,
        },
    )


@router.get(
    "/fields/dasi_object",
    dependencies=[Depends(get_current_active_superuser)],
)
def get_site_fields(
    session: SessionDep,
):
    """
    Get list of fields in all site.dasi_object jsonb column.
    """
    fields_statement = select(
        func.jsonb_object_keys(Site.dasi_object)
    ).distinct()
    fields = session.exec(fields_statement).all()
    return fields


@router.get(
    "/fields/dasi_object/missing",
    dependencies=[Depends(get_current_active_superuser)],
)
def get_site_missing_fields(
    session: SessionDep,
):
    """
    Get list of fields which are not in all Site.dasi_object jsonb column.
    """
    fields_statement = select(
        func.jsonb_object_keys(Site.dasi_object)
    ).distinct()
    fields = session.exec(fields_statement).all()

    all_fields = set(fields)
    missing_fields = set()
    for field in all_fields:
        field_statement = select(
            func.count()
        ).where(
            ~func.jsonb_exists(Site.dasi_object, field)
        )
        count = session.exec(field_statement).one()
        if count > 0:
            missing_fields.add(field)
    return missing_fields


@router.post(
    "/transfer_fields",
    dependencies=[Depends(get_current_active_superuser)],
)
def transfer_fields(
    session: SessionDep,
) -> dict[str, str]:
    """
    Transfer fields for every site object that's already in the db.
    """
    site_import_service = SiteImportService(session)
    sites = session.exec(select(Site)).all()
    for site in sites:
        if site.dasi_id != 125:
            continue
        site_update = site_import_service.transfer_fields(site.dasi_object)
        crud_site.update(session, db_obj=site, obj_in=site_update)

    return {"status": "success", "message": "Fields transferred for all sites."}


@router.put(
    "/link_to_epigraphs/all",
    dependencies=[Depends(get_current_active_superuser)],
)
def link_sites_to_epigraphs(
    session: SessionDep,
) -> dict:
    """
    Link sites to epigraphs.
    """
    sites = session.exec(select(Site)).all()
    for site in sites:
        epigraph_list = site.dasi_object.get("epigraphs", [])
        epigraph_dasi_ids = [
            int(epigraph["@id"].split("/")[-1])
            for epigraph in epigraph_list
            if "@id" in epigraph
        ]
        for epigraph_dasi_id in epigraph_dasi_ids:
            epigraph = crud_epigraph.get_by_dasi_id(session, dasi_id=epigraph_dasi_id)
            if epigraph and epigraph.id is not None:
                crud_site.link_to_epigraph(session, site=site, epigraph_id=epigraph.id)
    return {"status": "success", "message": "Sites linked to epigraphs."}


@router.put(
    "/link_to_objects/all",
    dependencies=[Depends(get_current_active_superuser)],
)
def link_sites_to_objects(
    session: SessionDep,
) -> dict:
    """
    Link sites to objects.
    """
    sites = session.exec(select(Site)).all()
    for site in sites:
        object_list = site.dasi_object.get("objects", [])
        object_dasi_ids = [
            int(obj["@id"].split("/")[-1])
            for obj in object_list
            if "@id" in obj
        ]
        for object_dasi_id in object_dasi_ids:
            obj = crud_object.get_by_dasi_id(session, dasi_id=object_dasi_id)
            if obj and obj.id is not None:
                crud_site.link_to_object(session, site=site, object_id=obj.id)
    return {"status": "success", "message": "Sites linked to objects."}


@router.get(
    "/scrape/{site_id}",
    dependencies=[Depends(get_current_active_superuser_no_error)],
)
def scrape_site(
    site_id: ResourceIdPath,
    session: SessionDep,
):
    """
    Scrape a site by ID.
    """
    site = crud_site.get(session, id=site_id)
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found",
        )
    if site.id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Site ID missing",
        )

    site_import_service = SiteImportService(session)

    return site_import_service.scrape_single(site.id)


@router.put(
    "/scrape/all",
    dependencies=[Depends(get_current_active_superuser)],
)
def scrape_all_sites(
    session: SessionDep,
):
    """
    Scrape all sites.
    """
    site_import_service = SiteImportService(session)
    return site_import_service.scrape_all(rate_limit_delay=10)


@router.get(
    "/scraped_data/keys",
    dependencies=[Depends(get_current_active_superuser)],
)
def get_scraped_data_keys(
    session: SessionDep,
):
    """
    Get a list of all keys within dasi_object.scraped_data.
    """
    keys_statement = select(
        func.jsonb_object_keys(Site.dasi_object["scraped_data"])
    ).distinct()
    keys = session.exec(keys_statement).all()
    return keys


@router.get(
    "/scraped_data/keys/missing",
    dependencies=[Depends(get_current_active_superuser)],
)
def get_scraped_data_missing_keys(
    session: SessionDep,
):
    """
    Get a list of fields within dasi_object.scraped_data which are not in all sites.
    """
    keys_statement = select(
        func.jsonb_object_keys(Site.dasi_object["scraped_data"])
    ).distinct()
    keys = session.exec(keys_statement).all()

    all_keys = set(keys)
    missing_keys = set()
    for key in all_keys:
        key_statement = select(
            func.count()
        ).where(
            ~func.jsonb_exists(Site.dasi_object["scraped_data"], key)
        )
        count = session.exec(key_statement).one()
        if count > 0:
            missing_keys.add(key)
    return missing_keys


@router.get(
    "/scraped_data/{key}",
    dependencies=[Depends(get_current_active_superuser)],
)
def get_scraped_data_key(
    key: str,
    session: SessionDep,
):
    """
    Get a list of all values for a specific key within dasi_object.scraped_data.
    """
    sample_site = session.exec(select(Site).limit(1)).first()

    if not sample_site or not sample_site.dasi_object.get("scraped_data", {}).get(key).get("parsed_data", {}):
        return []

    sample_data = sample_site.dasi_object["scraped_data"][key]["parsed_data"]

    if isinstance(sample_data, list):
        key_statement = select(
            func.jsonb_array_elements(Site.dasi_object["scraped_data"][key]["parsed_data"])
        ).distinct()
    else:
        key_statement = select(
            func.jsonb_object_keys(Site.dasi_object["scraped_data"][key]["parsed_data"])
        ).distinct()

    values = session.exec(key_statement).all()
    return values


@router.get(
    "/scraped_data/{key}/missing",
    dependencies=[Depends(get_current_active_superuser)],
)
def get_scraped_data_key_missing(
    key: str,
    session: SessionDep,
):
    """
    Get a list of all values for a specific key within dasi_object.scraped_data which are not in all sites.
    """
    sample_site = session.exec(select(Site).limit(1)).first()

    if not sample_site or not sample_site.dasi_object.get("scraped_data", {}).get(key).get("parsed_data", {}):
        return []

    sample_data = sample_site.dasi_object["scraped_data"][key]

    if isinstance(sample_data, list):
        key_statement = select(
            func.jsonb_array_elements(Site.dasi_object["scraped_data"][key]["parsed_data"])
        ).distinct()
        values = session.exec(key_statement).all()

        all_values = set(values)
        missing_values = set()
        for value in all_values:
            value_statement = select(
                func.count()
            ).where(
                ~func.jsonb_exists(Site.dasi_object["scraped_data"][key]["parsed_data"], value)
            )
            count = session.exec(value_statement).one()
            if count > 0:
                missing_values.add(value)
        return missing_values
    else:
        key_statement = select(
            func.jsonb_object_keys(Site.dasi_object["scraped_data"][key]["parsed_data"])
        ).distinct()
        subkeys = session.exec(key_statement).all()

        all_subkeys = set(subkeys)
        missing_subkeys = set()
        for subkey in all_subkeys:
            subkey_statement = select(
                func.count()
            ).where(
                ~func.jsonb_exists(Site.dasi_object["scraped_data"][key]["parsed_data"], subkey)
            )
            count = session.exec(subkey_statement).one()
            if count > 0:
                missing_subkeys.add(subkey)
        return missing_subkeys


@router.put(
    "/scraped_data/transfer",
    dependencies=[Depends(get_current_active_superuser)],
)
def transfer_scraped_data(
    session: SessionDep,
):
    """
    Transfer scraped data for every site object that's already in the db.
    """
    site_import_service = SiteImportService(session)
    sites = session.exec(select(Site)).all()
    for site in sites:
        scraped_data = site.dasi_object.get("scraped_data", {})
        if not scraped_data:
            continue
        site_update = site_import_service.transfer_scraped_data(scraped_data)
        crud_site.update(session, db_obj=site, obj_in=site_update)

    return {"status": "success", "message": "Scraped data transferred for all sites."}
