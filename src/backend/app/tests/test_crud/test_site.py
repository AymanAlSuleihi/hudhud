"""Tests for CRUD operations on Site model."""

import pytest
from sqlmodel import Session

from app.crud.crud_site import site as crud_site
from app.models.site import Site, SiteCreate, SiteUpdate
from app.models.epigraph import Epigraph
from app.models.object import Object
from app.models.links import EpigraphSiteLink, ObjectSiteLink


@pytest.fixture
def test_epigraph(session: Session) -> Epigraph:
    """Create a test epigraph."""
    epigraph = Epigraph(
        dasi_id=3001,
        title="Test Epigraph 001",
        epigraph_text="Test inscription text",
        dasi_published=True,
        uri="https://dasi.cnr.it/test-epigraph",
        chronology_conjectural=False,
        textual_typology_conjectural=False,
        royal_inscription=False,
        license="CC BY-SA 4.0",
    )
    session.add(epigraph)
    session.commit()
    session.refresh(epigraph)
    return epigraph


@pytest.fixture
def another_test_epigraph(session: Session) -> Epigraph:
    """Create another test epigraph."""
    epigraph = Epigraph(
        dasi_id=3002,
        title="Test Epigraph 002",
        epigraph_text="Another test inscription",
        dasi_published=True,
        uri="https://dasi.cnr.it/another-test-epigraph",
        chronology_conjectural=False,
        textual_typology_conjectural=False,
        royal_inscription=False,
        license="CC BY-SA 4.0",
    )
    session.add(epigraph)
    session.commit()
    session.refresh(epigraph)
    return epigraph


@pytest.fixture
def test_object(session: Session) -> Object:
    """Create a test object."""
    obj = Object(
        dasi_id=2001,
        title="Test Object",
        uri="https://dasi.cnr.it/test-object",
        license="CC BY-SA 4.0",
    )
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@pytest.fixture
def another_test_object(session: Session) -> Object:
    """Create another test object."""
    obj = Object(
        dasi_id=2002,
        title="Another Test Object",
        uri="https://dasi.cnr.it/another-test-object",
        license="CC BY-SA 4.0",
    )
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@pytest.fixture
def test_site(session: Session) -> Site:
    """Create a test site."""
    site_data = SiteCreate(
        dasi_id=1001,
        uri="https://dasi.cnr.it/test-site",
        modern_name="Test Modern Name",
        ancient_name="Test Ancient Name",
        country="Yemen",
        governorate="Test Governorate",
        type_of_site="Archaeological Site",
        license="CC BY-SA 4.0",
    )
    site = crud_site.create(session, obj_in=site_data)
    return site


class TestSiteCRUD:
    """Test basic CRUD operations."""

    def test_create_site(self, session: Session):
        """Test creating a site."""
        site_data = SiteCreate(
            dasi_id=1002,
            uri="https://dasi.cnr.it/new-site",
            modern_name="New Modern Name",
            ancient_name="New Ancient Name",
            country="Yemen",
            type_of_site="Necropolis",
            license="CC BY-SA 4.0",
        )
        site = crud_site.create(session, obj_in=site_data)

        assert site.id is not None
        assert site.dasi_id == 1002
        assert site.modern_name == "New Modern Name"
        assert site.ancient_name == "New Ancient Name"
        assert site.country == "Yemen"
        assert site.type_of_site == "Necropolis"

    def test_get_site(self, session: Session, test_site: Site):
        """Test retrieving a site by ID."""
        site = crud_site.get(session, id=test_site.id)

        assert site is not None
        assert site.id == test_site.id
        assert site.modern_name == test_site.modern_name

    def test_get_site_not_found(self, session: Session):
        """Test retrieving a non-existent site."""
        site = crud_site.get(session, id=99999)
        assert site is None

    def test_get_by_dasi_id(self, session: Session, test_site: Site):
        """Test retrieving a site by DASI ID."""
        site = crud_site.get_by_dasi_id(session, dasi_id=test_site.dasi_id)

        assert site is not None
        assert site.dasi_id == test_site.dasi_id
        assert site.modern_name == test_site.modern_name

    def test_get_by_dasi_id_not_found(self, session: Session):
        """Test retrieving a non-existent site by DASI ID."""
        site = crud_site.get_by_dasi_id(session, dasi_id=99999)
        assert site is None

    def test_update_site(self, session: Session, test_site: Site):
        """Test updating a site."""
        update_data = SiteUpdate(
            modern_name="Updated Modern Name",
            country="Yemen",
            type_of_site="Settlement",
        )
        updated_site = crud_site.update(session, db_obj=test_site, obj_in=update_data)

        assert updated_site.id == test_site.id
        assert updated_site.modern_name == "Updated Modern Name"
        assert updated_site.country == "Yemen"
        assert updated_site.type_of_site == "Settlement"
        assert updated_site.dasi_id == test_site.dasi_id
        assert updated_site.ancient_name == test_site.ancient_name

    def test_get_multi(self, session: Session):
        """Test retrieving multiple sites."""
        for i in range(5):
            site_data = SiteCreate(
                dasi_id=1100 + i,
                uri=f"https://dasi.cnr.it/site-{i}",
                modern_name=f"Site {i} Modern",
                ancient_name=f"Site {i} Ancient",
                license="CC BY-SA 4.0",
            )
            crud_site.create(session, obj_in=site_data)

        sites = crud_site.get_multi(session, skip=0, limit=10)
        assert len(sites) >= 5


class TestSiteEpigraphLinks:
    """Test site-epigraph relationship operations."""

    def test_link_to_epigraph(
        self, session: Session, test_site: Site, test_epigraph: Epigraph
    ):
        """Test linking a site to an epigraph."""
        linked_site = crud_site.link_to_epigraph(
            session, site=test_site, epigraph_id=test_epigraph.id
        )

        assert linked_site.id == test_site.id

        link = (
            session.query(EpigraphSiteLink)
            .filter(
                EpigraphSiteLink.site_id == test_site.id,
                EpigraphSiteLink.epigraph_id == test_epigraph.id,
            )
            .first()
        )
        assert link is not None
        assert link.site_id == test_site.id
        assert link.epigraph_id == test_epigraph.id

    def test_link_to_epigraph_already_linked(
        self, session: Session, test_site: Site, test_epigraph: Epigraph
    ):
        """Test linking a site to an epigraph that's already linked."""
        crud_site.link_to_epigraph(session, site=test_site, epigraph_id=test_epigraph.id)

        links_before = (
            session.query(EpigraphSiteLink)
            .filter(EpigraphSiteLink.site_id == test_site.id)
            .count()
        )

        crud_site.link_to_epigraph(session, site=test_site, epigraph_id=test_epigraph.id)

        links_after = (
            session.query(EpigraphSiteLink)
            .filter(EpigraphSiteLink.site_id == test_site.id)
            .count()
        )

        assert links_before == links_after == 1

    def test_link_to_multiple_epigraphs(
        self,
        session: Session,
        test_site: Site,
        test_epigraph: Epigraph,
        another_test_epigraph: Epigraph,
    ):
        """Test linking a site to multiple epigraphs."""
        crud_site.link_to_epigraph(session, site=test_site, epigraph_id=test_epigraph.id)
        crud_site.link_to_epigraph(
            session, site=test_site, epigraph_id=another_test_epigraph.id
        )

        links = (
            session.query(EpigraphSiteLink)
            .filter(EpigraphSiteLink.site_id == test_site.id)
            .all()
        )

        assert len(links) == 2
        epigraph_ids = {link.epigraph_id for link in links}
        assert test_epigraph.id in epigraph_ids
        assert another_test_epigraph.id in epigraph_ids

    def test_unlink_from_epigraph(
        self, session: Session, test_site: Site, test_epigraph: Epigraph
    ):
        """Test unlinking a site from an epigraph."""
        crud_site.link_to_epigraph(session, site=test_site, epigraph_id=test_epigraph.id)

        unlinked_site = crud_site.unlink_from_epigraph(
            session, site=test_site, epigraph_id=test_epigraph.id
        )

        assert unlinked_site.id == test_site.id

        link = (
            session.query(EpigraphSiteLink)
            .filter(
                EpigraphSiteLink.site_id == test_site.id,
                EpigraphSiteLink.epigraph_id == test_epigraph.id,
            )
            .first()
        )
        assert link is None

    def test_unlink_from_epigraph_not_linked(
        self, session: Session, test_site: Site, test_epigraph: Epigraph
    ):
        """Test unlinking a site from an epigraph when not linked."""
        unlinked_site = crud_site.unlink_from_epigraph(
            session, site=test_site, epigraph_id=test_epigraph.id
        )

        assert unlinked_site.id == test_site.id


class TestSiteObjectLinks:
    """Test site-object relationship operations."""

    def test_link_to_object(self, session: Session, test_site: Site, test_object: Object):
        """Test linking a site to an object."""
        linked_site = crud_site.link_to_object(
            session, site=test_site, object_id=test_object.id
        )

        assert linked_site.id == test_site.id

        link = (
            session.query(ObjectSiteLink)
            .filter(
                ObjectSiteLink.site_id == test_site.id,
                ObjectSiteLink.object_id == test_object.id,
            )
            .first()
        )
        assert link is not None
        assert link.site_id == test_site.id
        assert link.object_id == test_object.id

    def test_link_to_object_already_linked(
        self, session: Session, test_site: Site, test_object: Object
    ):
        """Test linking a site to an object that's already linked."""
        crud_site.link_to_object(session, site=test_site, object_id=test_object.id)

        links_before = (
            session.query(ObjectSiteLink).filter(ObjectSiteLink.site_id == test_site.id).count()
        )

        crud_site.link_to_object(session, site=test_site, object_id=test_object.id)

        links_after = (
            session.query(ObjectSiteLink).filter(ObjectSiteLink.site_id == test_site.id).count()
        )

        assert links_before == links_after == 1

    def test_link_to_multiple_objects(
        self,
        session: Session,
        test_site: Site,
        test_object: Object,
        another_test_object: Object,
    ):
        """Test linking a site to multiple objects."""
        crud_site.link_to_object(session, site=test_site, object_id=test_object.id)
        crud_site.link_to_object(session, site=test_site, object_id=another_test_object.id)

        links = (
            session.query(ObjectSiteLink).filter(ObjectSiteLink.site_id == test_site.id).all()
        )

        assert len(links) == 2
        object_ids = {link.object_id for link in links}
        assert test_object.id in object_ids
        assert another_test_object.id in object_ids

    def test_unlink_from_object(
        self, session: Session, test_site: Site, test_object: Object
    ):
        """Test unlinking a site from an object."""
        crud_site.link_to_object(session, site=test_site, object_id=test_object.id)

        unlinked_site = crud_site.unlink_from_object(
            session, site=test_site, object_id=test_object.id
        )

        assert unlinked_site.id == test_site.id

        link = (
            session.query(ObjectSiteLink)
            .filter(
                ObjectSiteLink.site_id == test_site.id,
                ObjectSiteLink.object_id == test_object.id,
            )
            .first()
        )
        assert link is None

    def test_unlink_from_object_not_linked(
        self, session: Session, test_site: Site, test_object: Object
    ):
        """Test unlinking a site from an object when not linked."""
        unlinked_site = crud_site.unlink_from_object(
            session, site=test_site, object_id=test_object.id
        )

        assert unlinked_site.id == test_site.id


class TestSiteComplexOperations:
    """Test complex operations involving sites."""

    def test_site_with_multiple_relationships(
        self,
        session: Session,
        test_site: Site,
        test_epigraph: Epigraph,
        another_test_epigraph: Epigraph,
        test_object: Object,
        another_test_object: Object,
    ):
        """Test a site linked to multiple epigraphs and objects."""
        crud_site.link_to_epigraph(session, site=test_site, epigraph_id=test_epigraph.id)
        crud_site.link_to_epigraph(
            session, site=test_site, epigraph_id=another_test_epigraph.id
        )

        crud_site.link_to_object(session, site=test_site, object_id=test_object.id)
        crud_site.link_to_object(session, site=test_site, object_id=another_test_object.id)

        epigraph_links = (
            session.query(EpigraphSiteLink)
            .filter(EpigraphSiteLink.site_id == test_site.id)
            .count()
        )
        object_links = (
            session.query(ObjectSiteLink)
            .filter(ObjectSiteLink.site_id == test_site.id)
            .count()
        )

        assert epigraph_links == 2
        assert object_links == 2

    def test_update_preserves_links(
        self,
        session: Session,
        test_site: Site,
        test_epigraph: Epigraph,
        test_object: Object,
    ):
        """Test that updating a site preserves its links."""
        crud_site.link_to_epigraph(session, site=test_site, epigraph_id=test_epigraph.id)
        crud_site.link_to_object(session, site=test_site, object_id=test_object.id)

        update_data = SiteUpdate(modern_name="Updated Name", country="Updated Country")
        crud_site.update(session, db_obj=test_site, obj_in=update_data)

        epigraph_links = (
            session.query(EpigraphSiteLink)
            .filter(EpigraphSiteLink.site_id == test_site.id)
            .count()
        )
        object_links = (
            session.query(ObjectSiteLink)
            .filter(ObjectSiteLink.site_id == test_site.id)
            .count()
        )

        assert epigraph_links == 1
        assert object_links == 1

    def test_site_with_coordinates(self, session: Session):
        """Test creating a site with coordinates."""
        site_data = SiteCreate(
            dasi_id=1003,
            uri="https://dasi.cnr.it/coord-site",
            modern_name="Site with Coords",
            ancient_name="Ancient Coords",
            coordinates=[15.5, 44.3],
            coordinates_accuracy="Approximate",
            license="CC BY-SA 4.0",
        )
        site = crud_site.create(session, obj_in=site_data)

        assert site.coordinates == [15.5, 44.3]
        assert site.coordinates_accuracy == "Approximate"

    def test_site_with_complex_fields(self, session: Session):
        """Test creating a site with complex JSONB fields."""
        site_data = SiteCreate(
            dasi_id=1004,
            uri="https://dasi.cnr.it/complex-site",
            modern_name="Complex Site",
            ancient_name="Ancient Complex",
            deities=["ʾlmqh", "ʿṯtr"],
            kingdom=["Saba"],
            structures=["Temple", "Fortress"],
            notes=["Note 1", "Note 2"],
            license="CC BY-SA 4.0",
        )
        site = crud_site.create(session, obj_in=site_data)

        assert site.deities == ["ʾlmqh", "ʿṯtr"]
        assert site.kingdom == ["Saba"]
        assert site.structures == ["Temple", "Fortress"]
        assert site.notes == ["Note 1", "Note 2"]
