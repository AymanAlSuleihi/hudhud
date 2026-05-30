from sqlmodel import Session

from app.crud.crud_epigraph import epigraph as crud_epigraph
from app.crud.crud_object import obj as crud_object
from app.crud.crud_site import site as crud_site
from app.models.epigraph import EpigraphCreate
from app.models.links import EpigraphObjectLink, EpigraphSiteLink, ObjectSiteLink
from app.models.object import ObjectCreate
from app.models.site import SiteCreate
from app.services.importers.epigraph import EpigraphImportService
from app.services.importers.object import ObjectImportService
from app.services.importers.site import SiteImportService


def _create_site(session: Session, dasi_id: int):
    return crud_site.create(
        session,
        obj_in=SiteCreate(
            dasi_id=dasi_id,
            uri=f"https://dasi.cnr.it/sites/{dasi_id}",
            modern_name=f"Site {dasi_id}",
            ancient_name=f"Ancient Site {dasi_id}",
            license="CC BY-SA 4.0",
        ),
    )


def _create_object(session: Session, dasi_id: int):
    return crud_object.create(
        session,
        obj_in=ObjectCreate(
            dasi_id=dasi_id,
            title=f"Object {dasi_id}",
            uri=f"https://dasi.cnr.it/objects/{dasi_id}",
            license="CC BY-SA 4.0",
        ),
    )


def _create_epigraph(session: Session, dasi_id: int):
    return crud_epigraph.create(
        session,
        obj_in=EpigraphCreate(
            dasi_id=dasi_id,
            title=f"Epigraph {dasi_id}",
            epigraph_text=f"Text for {dasi_id}",
            uri=f"https://dasi.cnr.it/epigraphs/{dasi_id}",
            chronology_conjectural=False,
            textual_typology_conjectural=False,
            royal_inscription=False,
            license="CC BY-SA 4.0",
        ),
    )


def _related_refs(entity_type: str, dasi_ids: list[int]) -> list[dict[str, str]]:
    return [
        {"@id": f"https://dasi.cnr.it/{entity_type}/{dasi_id}"}
        for dasi_id in dasi_ids
    ]


def test_site_cleanup_unreliable_related_links_clears_only_over_limit_links(session: Session):
    site = _create_site(session, 1001)
    epigraphs = [_create_epigraph(session, 3000 + index) for index in range(6)]
    objects = [_create_object(session, 2000 + index) for index in range(2)]

    for epigraph in epigraphs:
        crud_site.link_to_epigraph(session, site=site, epigraph_id=epigraph.id)
    for obj in objects:
        crud_site.link_to_object(session, site=site, object_id=obj.id)

    crud_site.update(
        session,
        db_obj=site,
        obj_in={
            "dasi_object": {
                "epigraphs": _related_refs("epigraphs", [epigraph.dasi_id for epigraph in epigraphs]),
                "objects": _related_refs("objects", [obj.dasi_id for obj in objects]),
            }
        },
    )

    result = SiteImportService(session).cleanup_unreliable_related_links()

    assert result["status"] == "success"
    assert result["processed_items"] == 1
    assert result["cleaned_items"] == 1
    assert result["removed_links"] == 6
    assert session.query(EpigraphSiteLink).filter(EpigraphSiteLink.site_id == site.id).count() == 0
    assert session.query(ObjectSiteLink).filter(ObjectSiteLink.site_id == site.id).count() == 2


def test_epigraph_cleanup_unreliable_related_links_clears_only_over_limit_links(session: Session):
    epigraph = _create_epigraph(session, 3001)
    sites = [_create_site(session, 1100 + index) for index in range(6)]
    objects = [_create_object(session, 2100 + index) for index in range(2)]

    for site in sites:
        crud_epigraph.link_to_site(session, epigraph=epigraph, site_id=site.id)
    for obj in objects:
        crud_epigraph.link_to_object(session, epigraph=epigraph, object_id=obj.id)

    crud_epigraph.update(
        session,
        db_obj=epigraph,
        obj_in={
            "dasi_object": {
                "sites": _related_refs("sites", [site.dasi_id for site in sites]),
                "objects": _related_refs("objects", [obj.dasi_id for obj in objects]),
            }
        },
    )

    result = EpigraphImportService(session).cleanup_unreliable_related_links()

    assert result["status"] == "success"
    assert result["processed_items"] == 1
    assert result["cleaned_items"] == 1
    assert result["removed_links"] == 6
    assert session.query(EpigraphSiteLink).filter(EpigraphSiteLink.epigraph_id == epigraph.id).count() == 0
    assert session.query(EpigraphObjectLink).filter(EpigraphObjectLink.epigraph_id == epigraph.id).count() == 2


def test_epigraph_cleanup_unreliable_related_links_reconciles_stale_under_limit_links(session: Session):
    epigraph = _create_epigraph(session, 3002)
    expected_site = _create_site(session, 1300)
    stale_sites = [_create_site(session, 1301 + index) for index in range(3)]

    crud_epigraph.link_to_site(session, epigraph=epigraph, site_id=expected_site.id)
    for stale_site in stale_sites:
        crud_epigraph.link_to_site(session, epigraph=epigraph, site_id=stale_site.id)

    crud_epigraph.update(
        session,
        db_obj=epigraph,
        obj_in={
            "dasi_object": {
                "sites": _related_refs("sites", [expected_site.dasi_id]),
                "objects": [],
            }
        },
    )

    result = EpigraphImportService(session).cleanup_unreliable_related_links()

    assert result["status"] == "success"
    assert result["processed_items"] == 1
    assert result["cleaned_items"] == 1
    assert result["removed_links"] == 3
    remaining_site_links = (
        session.query(EpigraphSiteLink)
        .filter(EpigraphSiteLink.epigraph_id == epigraph.id)
        .all()
    )
    assert [link.site_id for link in remaining_site_links] == [expected_site.id]


def test_epigraph_cleanup_unreliable_related_links_preserves_object_links_supported_by_object_payload(session: Session):
    epigraph = _create_epigraph(session, 3003)
    obj = _create_object(session, 2300)

    crud_epigraph.link_to_object(session, epigraph=epigraph, object_id=obj.id)

    crud_epigraph.update(
        session,
        db_obj=epigraph,
        obj_in={
            "dasi_object": {
                "sites": [],
                "objects": [],
            }
        },
    )
    crud_object.update(
        session,
        db_obj=obj,
        obj_in={
            "dasi_object": {
                "sites": [],
                "epigraphs": _related_refs("epigraphs", [epigraph.dasi_id]),
            }
        },
    )

    result = EpigraphImportService(session).cleanup_unreliable_related_links()

    assert result["status"] == "success"
    assert result["processed_items"] == 1
    assert result["cleaned_items"] == 0
    assert result["removed_links"] == 0
    assert (
        session.query(EpigraphObjectLink)
        .filter(EpigraphObjectLink.epigraph_id == epigraph.id)
        .count()
        == 1
    )


def test_object_cleanup_unreliable_related_links_clears_only_over_limit_links(session: Session):
    obj = _create_object(session, 2001)
    sites = [_create_site(session, 1200 + index) for index in range(2)]
    epigraphs = [_create_epigraph(session, 3200 + index) for index in range(6)]

    for site in sites:
        crud_object.link_to_site(session, obj=obj, site_id=site.id)
    for epigraph in epigraphs:
        crud_object.link_to_epigraph(session, obj=obj, epigraph_id=epigraph.id)

    crud_object.update(
        session,
        db_obj=obj,
        obj_in={
            "dasi_object": {
                "sites": _related_refs("sites", [site.dasi_id for site in sites]),
                "epigraphs": _related_refs("epigraphs", [epigraph.dasi_id for epigraph in epigraphs]),
            }
        },
    )

    result = ObjectImportService(session).cleanup_unreliable_related_links()

    assert result["status"] == "success"
    assert result["processed_items"] == 1
    assert result["cleaned_items"] == 1
    assert result["removed_links"] == 6
    assert session.query(ObjectSiteLink).filter(ObjectSiteLink.object_id == obj.id).count() == 2
    assert session.query(EpigraphObjectLink).filter(EpigraphObjectLink.object_id == obj.id).count() == 0
