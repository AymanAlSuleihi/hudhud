"""Tests for CRUD operations on Object model."""

import pytest
from sqlmodel import Session

from app.crud.crud_object import obj as crud_object
from app.models.object import Object, ObjectCreate, ObjectUpdate
from app.models.site import Site
from app.models.epigraph import Epigraph
from app.models.links import EpigraphObjectLink, ObjectSiteLink


@pytest.fixture
def test_site(session: Session) -> Site:
    """Create a test site."""
    site = Site(
        dasi_id=1001,
        title="Test Site",
        uri="https://dasi.cnr.it/test-site",
        modern_name="Test Modern Name",
        ancient_name="Test Ancient Name",
        license="CC BY-SA 4.0",
    )
    session.add(site)
    session.commit()
    session.refresh(site)
    return site


@pytest.fixture
def another_test_site(session: Session) -> Site:
    """Create another test site."""
    site = Site(
        dasi_id=1002,
        title="Another Test Site",
        uri="https://dasi.cnr.it/another-test-site",
        modern_name="Another Modern Name",
        ancient_name="Another Ancient Name",
        license="CC BY-SA 4.0",
    )
    session.add(site)
    session.commit()
    session.refresh(site)
    return site


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
    object_data = ObjectCreate(
        dasi_id=2001,
        title="Test Object",
        uri="https://dasi.cnr.it/test-object",
        period="B",
        shape="Squared",
        measures="h. 10, w. 9, th. 7.4",
        support_type_level_1="Monumental support",
        license="CC BY-SA 4.0",
    )
    obj = crud_object.create(session, obj_in=object_data)
    return obj


class TestObjectCRUD:
    """Test basic CRUD operations."""

    def test_create_object(self, session: Session):
        """Test creating an object."""
        object_data = ObjectCreate(
            dasi_id=2002,
            title="New Object",
            uri="https://dasi.cnr.it/new-object",
            period="B",
            shape="Conical",
            license="CC BY-SA 4.0",
        )
        obj = crud_object.create(session, obj_in=object_data)

        assert obj.id is not None
        assert obj.dasi_id == 2002
        assert obj.title == "New Object"
        assert obj.period == "B"
        assert obj.shape == "Conical"

    def test_get_object(self, session: Session, test_object: Object):
        """Test retrieving an object by ID."""
        obj = crud_object.get(session, id=test_object.id)

        assert obj is not None
        assert obj.id == test_object.id
        assert obj.title == test_object.title

    def test_get_object_not_found(self, session: Session):
        """Test retrieving a non-existent object."""
        obj = crud_object.get(session, id=99999)
        assert obj is None

    def test_get_by_dasi_id(self, session: Session, test_object: Object):
        """Test retrieving an object by DASI ID."""
        obj = crud_object.get_by_dasi_id(session, dasi_id=test_object.dasi_id)

        assert obj is not None
        assert obj.dasi_id == test_object.dasi_id
        assert obj.title == test_object.title

    def test_get_by_dasi_id_not_found(self, session: Session):
        """Test retrieving a non-existent object by DASI ID."""
        obj = crud_object.get_by_dasi_id(session, dasi_id=99999)
        assert obj is None

    def test_update_object(self, session: Session, test_object: Object):
        """Test updating an object."""
        update_data = ObjectUpdate(
            title="Updated Object Title",
            period="A",
            measures="h. 2.2, w. 3, th. 1",
        )
        updated_obj = crud_object.update(
            session, db_obj=test_object, obj_in=update_data
        )

        assert updated_obj.id == test_object.id
        assert updated_obj.title == "Updated Object Title"
        assert updated_obj.period == "A"
        assert updated_obj.measures == "h. 2.2, w. 3, th. 1"
        assert updated_obj.dasi_id == test_object.dasi_id
        assert updated_obj.shape == test_object.shape

    def test_get_multi(self, session: Session):
        """Test retrieving multiple objects."""
        for i in range(5):
            object_data = ObjectCreate(
                dasi_id=2100 + i,
                title=f"Object {i}",
                uri=f"https://dasi.cnr.it/object-{i}",
                license="CC BY-SA 4.0",
            )
            crud_object.create(session, obj_in=object_data)

        objects = crud_object.get_multi(session, skip=0, limit=10)
        assert len(objects) >= 5


class TestObjectSiteLinks:
    """Test object-site relationship operations."""

    def test_link_to_site(self, session: Session, test_object: Object, test_site: Site):
        """Test linking an object to a site."""
        linked_obj = crud_object.link_to_site(
            session, obj=test_object, site_id=test_site.id
        )

        assert linked_obj.id == test_object.id

        link = (
            session.query(ObjectSiteLink)
            .filter(
                ObjectSiteLink.object_id == test_object.id,
                ObjectSiteLink.site_id == test_site.id,
            )
            .first()
        )
        assert link is not None
        assert link.object_id == test_object.id
        assert link.site_id == test_site.id

    def test_link_to_site_already_linked(
        self, session: Session, test_object: Object, test_site: Site
    ):
        """Test linking an object to a site that's already linked."""
        crud_object.link_to_site(session, obj=test_object, site_id=test_site.id)

        links_before = (
            session.query(ObjectSiteLink)
            .filter(ObjectSiteLink.object_id == test_object.id)
            .count()
        )

        crud_object.link_to_site(session, obj=test_object, site_id=test_site.id)

        links_after = (
            session.query(ObjectSiteLink)
            .filter(ObjectSiteLink.object_id == test_object.id)
            .count()
        )

        assert links_before == links_after == 1

    def test_link_to_multiple_sites(
        self,
        session: Session,
        test_object: Object,
        test_site: Site,
        another_test_site: Site,
    ):
        """Test linking an object to multiple sites."""
        crud_object.link_to_site(session, obj=test_object, site_id=test_site.id)
        crud_object.link_to_site(session, obj=test_object, site_id=another_test_site.id)

        links = (
            session.query(ObjectSiteLink)
            .filter(ObjectSiteLink.object_id == test_object.id)
            .all()
        )

        assert len(links) == 2
        site_ids = {link.site_id for link in links}
        assert test_site.id in site_ids
        assert another_test_site.id in site_ids

    def test_unlink_from_site(
        self, session: Session, test_object: Object, test_site: Site
    ):
        """Test unlinking an object from a site."""
        crud_object.link_to_site(session, obj=test_object, site_id=test_site.id)

        unlinked_obj = crud_object.unlink_from_site(
            session, obj=test_object, site_id=test_site.id
        )

        assert unlinked_obj.id == test_object.id

        link = (
            session.query(ObjectSiteLink)
            .filter(
                ObjectSiteLink.object_id == test_object.id,
                ObjectSiteLink.site_id == test_site.id,
            )
            .first()
        )
        assert link is None

    def test_unlink_from_site_not_linked(
        self, session: Session, test_object: Object, test_site: Site
    ):
        """Test unlinking an object from a site when not linked."""
        unlinked_obj = crud_object.unlink_from_site(
            session, obj=test_object, site_id=test_site.id
        )

        assert unlinked_obj.id == test_object.id

    def test_unlink_all_sites(
        self,
        session: Session,
        test_object: Object,
        test_site: Site,
        another_test_site: Site,
    ):
        """Test unlinking an object from all sites."""
        crud_object.link_to_site(session, obj=test_object, site_id=test_site.id)
        crud_object.link_to_site(session, obj=test_object, site_id=another_test_site.id)

        links_before = (
            session.query(ObjectSiteLink)
            .filter(ObjectSiteLink.object_id == test_object.id)
            .count()
        )
        assert links_before == 2

        unlinked_obj = crud_object.unlink_all_sites(session, obj=test_object)

        assert unlinked_obj.id == test_object.id

        links_after = (
            session.query(ObjectSiteLink)
            .filter(ObjectSiteLink.object_id == test_object.id)
            .count()
        )
        assert links_after == 0

    def test_unlink_all_sites_when_none_linked(
        self, session: Session, test_object: Object
    ):
        """Test unlinking all sites when object has no site links."""
        unlinked_obj = crud_object.unlink_all_sites(session, obj=test_object)

        assert unlinked_obj.id == test_object.id


class TestObjectEpigraphLinks:
    """Test object-epigraph relationship operations."""

    def test_link_to_epigraph(
        self, session: Session, test_object: Object, test_epigraph: Epigraph
    ):
        """Test linking an object to an epigraph."""
        linked_obj = crud_object.link_to_epigraph(
            session, obj=test_object, epigraph_id=test_epigraph.id
        )

        assert linked_obj.id == test_object.id

        link = (
            session.query(EpigraphObjectLink)
            .filter(
                EpigraphObjectLink.object_id == test_object.id,
                EpigraphObjectLink.epigraph_id == test_epigraph.id,
            )
            .first()
        )
        assert link is not None
        assert link.object_id == test_object.id
        assert link.epigraph_id == test_epigraph.id

    def test_link_to_epigraph_already_linked(
        self, session: Session, test_object: Object, test_epigraph: Epigraph
    ):
        """Test linking an object to an epigraph that's already linked."""
        crud_object.link_to_epigraph(
            session, obj=test_object, epigraph_id=test_epigraph.id
        )

        links_before = (
            session.query(EpigraphObjectLink)
            .filter(EpigraphObjectLink.object_id == test_object.id)
            .count()
        )

        crud_object.link_to_epigraph(
            session, obj=test_object, epigraph_id=test_epigraph.id
        )

        links_after = (
            session.query(EpigraphObjectLink)
            .filter(EpigraphObjectLink.object_id == test_object.id)
            .count()
        )

        assert links_before == links_after == 1

    def test_link_to_multiple_epigraphs(
        self,
        session: Session,
        test_object: Object,
        test_epigraph: Epigraph,
        another_test_epigraph: Epigraph,
    ):
        """Test linking an object to multiple epigraphs."""
        crud_object.link_to_epigraph(
            session, obj=test_object, epigraph_id=test_epigraph.id
        )
        crud_object.link_to_epigraph(
            session, obj=test_object, epigraph_id=another_test_epigraph.id
        )

        links = (
            session.query(EpigraphObjectLink)
            .filter(EpigraphObjectLink.object_id == test_object.id)
            .all()
        )

        assert len(links) == 2
        epigraph_ids = {link.epigraph_id for link in links}
        assert test_epigraph.id in epigraph_ids
        assert another_test_epigraph.id in epigraph_ids

    def test_unlink_from_epigraph(
        self, session: Session, test_object: Object, test_epigraph: Epigraph
    ):
        """Test unlinking an object from an epigraph."""
        crud_object.link_to_epigraph(
            session, obj=test_object, epigraph_id=test_epigraph.id
        )

        unlinked_obj = crud_object.unlink_from_epigraph(
            session, obj=test_object, epigraph_id=test_epigraph.id
        )

        assert unlinked_obj.id == test_object.id

        link = (
            session.query(EpigraphObjectLink)
            .filter(
                EpigraphObjectLink.object_id == test_object.id,
                EpigraphObjectLink.epigraph_id == test_epigraph.id,
            )
            .first()
        )
        assert link is None

    def test_unlink_from_epigraph_not_linked(
        self, session: Session, test_object: Object, test_epigraph: Epigraph
    ):
        """Test unlinking an object from an epigraph when not linked."""
        unlinked_obj = crud_object.unlink_from_epigraph(
            session, obj=test_object, epigraph_id=test_epigraph.id
        )

        assert unlinked_obj.id == test_object.id


class TestObjectComplexOperations:
    """Test complex operations involving objects."""

    def test_object_with_multiple_relationships(
        self,
        session: Session,
        test_object: Object,
        test_site: Site,
        another_test_site: Site,
        test_epigraph: Epigraph,
        another_test_epigraph: Epigraph,
    ):
        """Test an object linked to multiple sites and epigraphs."""
        crud_object.link_to_site(session, obj=test_object, site_id=test_site.id)
        crud_object.link_to_site(session, obj=test_object, site_id=another_test_site.id)

        crud_object.link_to_epigraph(
            session, obj=test_object, epigraph_id=test_epigraph.id
        )
        crud_object.link_to_epigraph(
            session, obj=test_object, epigraph_id=another_test_epigraph.id
        )

        site_links = (
            session.query(ObjectSiteLink)
            .filter(ObjectSiteLink.object_id == test_object.id)
            .count()
        )
        epigraph_links = (
            session.query(EpigraphObjectLink)
            .filter(EpigraphObjectLink.object_id == test_object.id)
            .count()
        )

        assert site_links == 2
        assert epigraph_links == 2

    def test_update_preserves_links(
        self,
        session: Session,
        test_object: Object,
        test_site: Site,
        test_epigraph: Epigraph,
    ):
        """Test that updating an object preserves its links."""
        crud_object.link_to_site(session, obj=test_object, site_id=test_site.id)
        crud_object.link_to_epigraph(
            session, obj=test_object, epigraph_id=test_epigraph.id
        )

        update_data = ObjectUpdate(title="Updated Title", period="New Period")
        crud_object.update(session, db_obj=test_object, obj_in=update_data)

        site_links = (
            session.query(ObjectSiteLink)
            .filter(ObjectSiteLink.object_id == test_object.id)
            .count()
        )
        epigraph_links = (
            session.query(EpigraphObjectLink)
            .filter(EpigraphObjectLink.object_id == test_object.id)
            .count()
        )

        assert site_links == 1
        assert epigraph_links == 1
