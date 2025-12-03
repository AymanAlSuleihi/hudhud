"""Tests for CRUD operations on Epigraph model."""

import pytest
from sqlmodel import Session

from app.crud.crud_epigraph import epigraph as crud_epigraph
from app.models.epigraph import Epigraph, EpigraphCreate, EpigraphUpdate
from app.models.site import Site
from app.models.object import Object
from app.models.links import EpigraphSiteLink, EpigraphObjectLink


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
def test_epigraph(session: Session) -> Epigraph:
    """Create a test epigraph."""
    epigraph_data = EpigraphCreate(
        dasi_id=3001,
        title="Test Epigraph 001",
        epigraph_text="Test inscription text",
        dasi_published=True,
        uri="https://dasi.cnr.it/test",
        chronology_conjectural=False,
        textual_typology_conjectural=False,
        royal_inscription=False,
        license="CC BY-SA 4.0",
    )
    epigraph = crud_epigraph.create(session, obj_in=epigraph_data)
    return epigraph


@pytest.fixture
def test_epigraph_with_embedding(session: Session) -> Epigraph:
    """Create a test epigraph with embedding."""
    embedding = [0.1, 0.2, 0.3, 0.4, 0.5] + [0.0] * 3067

    epigraph = Epigraph(
        dasi_id=3002,
        title="Test Epigraph 002",
        epigraph_text="Another test inscription",
        embedding=embedding,
        uri="https://dasi.cnr.it/test",
        chronology_conjectural=False,
        textual_typology_conjectural=False,
        royal_inscription=False,
        license="CC BY-SA 4.0",
    )
    session.add(epigraph)
    session.commit()
    session.refresh(epigraph)
    return epigraph


class TestEpigraphCRUD:
    """Test basic CRUD operations."""

    def test_create_epigraph(self, session: Session):
        """Test creating an epigraph."""
        epigraph_data = EpigraphCreate(
            dasi_id=4001,
            title="New Epigraph",
            epigraph_text="New inscription",
            uri="https://dasi.cnr.it/test",
            chronology_conjectural=False,
            textual_typology_conjectural=False,
            royal_inscription=False,
            license="CC BY-SA 4.0",
        )
        epigraph = crud_epigraph.create(session, obj_in=epigraph_data)

        assert epigraph.id is not None
        assert epigraph.dasi_id == 4001
        assert epigraph.title == "New Epigraph"
        assert epigraph.epigraph_text == "New inscription"

    def test_read_epigraph(self, session: Session, test_epigraph: Epigraph):
        """Test reading an epigraph by ID."""
        retrieved = crud_epigraph.get(session, id=test_epigraph.id)

        assert retrieved is not None
        assert retrieved.id == test_epigraph.id
        assert retrieved.dasi_id == test_epigraph.dasi_id
        assert retrieved.title == test_epigraph.title

    def test_update_epigraph(self, session: Session, test_epigraph: Epigraph):
        """Test updating an epigraph."""
        update_data = EpigraphUpdate(title="Updated Epigraph Title")
        updated = crud_epigraph.update(
            session, db_obj=test_epigraph, obj_in=update_data
        )

        assert updated.id == test_epigraph.id
        assert updated.title == "Updated Epigraph Title"
        assert updated.epigraph_text == test_epigraph.epigraph_text

    def test_get_multi(self, session: Session):
        """Test getting multiple epigraphs."""
        for i in range(5):
            epigraph_data = EpigraphCreate(
                dasi_id=5000 + i,
                title=f"Epigraph {i}",
                epigraph_text=f"Text {i}",
                uri="https://dasi.cnr.it/test",
                chronology_conjectural=False,
                textual_typology_conjectural=False,
                royal_inscription=False,
                license="CC BY-SA 4.0",
            )
            crud_epigraph.create(session, obj_in=epigraph_data)

        epigraphs = crud_epigraph.get_multi(session, skip=0, limit=3)
        assert len(epigraphs) == 3


class TestGetByDasiId:
    """Test getting epigraphs by DASI ID."""

    def test_get_by_dasi_id_exists(self, session: Session, test_epigraph: Epigraph):
        """Test getting an epigraph by DASI ID when it exists."""
        retrieved = crud_epigraph.get_by_dasi_id(session, dasi_id=test_epigraph.dasi_id)

        assert retrieved is not None
        assert retrieved.id == test_epigraph.id
        assert retrieved.dasi_id == test_epigraph.dasi_id

    def test_get_by_dasi_id_not_exists(self, session: Session):
        """Test getting an epigraph by DASI ID when it doesn't exist."""
        retrieved = crud_epigraph.get_by_dasi_id(session, dasi_id=99999)
        assert retrieved is None


class TestGetByTitle:
    """Test getting epigraphs by title."""

    def test_get_by_title_exact_match(self, session: Session, test_epigraph: Epigraph):
        """Test getting an epigraph by exact title match."""
        retrieved = crud_epigraph.get_by_title(session, title=test_epigraph.title)

        assert retrieved is not None
        assert retrieved.id == test_epigraph.id

    def test_get_by_title_partial_match(
        self, session: Session, test_epigraph: Epigraph
    ):
        """Test getting an epigraph by partial title match."""
        retrieved = crud_epigraph.get_by_title(session, title="Test Epigraph")

        assert retrieved is not None
        assert "Test Epigraph" in retrieved.title

    def test_get_by_title_case_insensitive(self, session: Session):
        """Test that title search is case-insensitive."""
        epigraph_data = EpigraphCreate(
            dasi_id=6001,
            title="CamelCase Title",
            epigraph_text="Text",
            uri="https://dasi.cnr.it/test",
            chronology_conjectural=False,
            textual_typology_conjectural=False,
            royal_inscription=False,
            license="CC BY-SA 4.0",
        )
        created = crud_epigraph.create(session, obj_in=epigraph_data)

        retrieved = crud_epigraph.get_by_title(session, title="camelcase title")
        assert retrieved is not None
        assert retrieved.id == created.id

    def test_get_by_title_with_whitespace(self, session: Session):
        """Test that title search handles whitespace."""
        epigraph_data = EpigraphCreate(
            dasi_id=6002,
            title="Spaced Title",
            epigraph_text="Text",
            uri="https://dasi.cnr.it/test",
            chronology_conjectural=False,
            textual_typology_conjectural=False,
            royal_inscription=False,
            license="CC BY-SA 4.0",
        )
        created = crud_epigraph.create(session, obj_in=epigraph_data)

        retrieved = crud_epigraph.get_by_title(session, title="  Spaced Title  ")
        assert retrieved is not None
        assert retrieved.id == created.id

    def test_get_by_title_not_exists(self, session: Session):
        """Test getting an epigraph by title when it doesn't exist."""
        retrieved = crud_epigraph.get_by_title(session, title="Nonexistent Title")
        assert retrieved is None


class TestGetByTitles:
    """Test getting epigraphs by multiple titles."""

    def test_get_by_titles_multiple_matches(self, session: Session):
        """Test getting multiple epigraphs by titles."""
        titles = ["Alpha Inscription", "Beta Inscription", "Gamma Inscription"]
        for i, title in enumerate(titles):
            epigraph_data = EpigraphCreate(
                dasi_id=7000 + i,
                title=title,
                epigraph_text=f"Text {i}",
                uri="https://dasi.cnr.it/test",
                chronology_conjectural=False,
                textual_typology_conjectural=False,
                royal_inscription=False,
                license="CC BY-SA 4.0",
            )
            crud_epigraph.create(session, obj_in=epigraph_data)

        search_titles = ["Alpha", "Gamma"]
        retrieved = crud_epigraph.get_by_titles(session, titles=search_titles)

        assert len(retrieved) == 2
        retrieved_titles = [e.title for e in retrieved]
        assert "Alpha Inscription" in retrieved_titles
        assert "Gamma Inscription" in retrieved_titles

    def test_get_by_titles_with_limit(self, session: Session):
        """Test getting epigraphs by titles with a limit."""
        for i in range(5):
            epigraph_data = EpigraphCreate(
                dasi_id=7100 + i,
                title=f"Common Inscription {i}",
                epigraph_text="Text",
                uri="https://dasi.cnr.it/test",
                chronology_conjectural=False,
                textual_typology_conjectural=False,
                royal_inscription=False,
                license="CC BY-SA 4.0",
            )
            crud_epigraph.create(session, obj_in=epigraph_data)

        retrieved = crud_epigraph.get_by_titles(session, titles=["Common"], limit=3)
        assert len(retrieved) == 3

    def test_get_by_titles_empty_list(self, session: Session):
        """Test getting epigraphs with empty titles list."""
        retrieved = crud_epigraph.get_by_titles(session, titles=[])
        assert retrieved == []

    def test_get_by_titles_no_matches(self, session: Session):
        """Test getting epigraphs when no titles match."""
        retrieved = crud_epigraph.get_by_titles(
            session, titles=["Nonexistent1", "Nonexistent2"]
        )
        assert len(retrieved) == 0


class TestGetIdAndDasiId:
    """Test getting ID and DASI ID pairs."""

    def test_get_id_and_dasi_id_all(self, session: Session):
        """Test getting all ID and DASI ID pairs."""
        for i in range(3):
            epigraph_data = EpigraphCreate(
                dasi_id=8000 + i,
                title=f"Epigraph {i}",
                epigraph_text="Text",
                uri="https://dasi.cnr.it/test",
                chronology_conjectural=False,
                textual_typology_conjectural=False,
                royal_inscription=False,
                license="CC BY-SA 4.0",
            )
            crud_epigraph.create(session, obj_in=epigraph_data)

        results = crud_epigraph.get_id_and_dasi_id(session)
        assert len(results) >= 3
        assert all(hasattr(r, "id") and hasattr(r, "dasi_id") for r in results)
        assert all(len(r) == 2 for r in results)

    def test_get_id_and_dasi_id_published_only(self, session: Session):
        """Test getting only published epigraphs."""
        published = EpigraphCreate(
            dasi_id=8100,
            title="Published",
            epigraph_text="Text",
            dasi_published=True,
            uri="https://dasi.cnr.it/test",
            chronology_conjectural=False,
            textual_typology_conjectural=False,
            royal_inscription=False,
            license="CC BY-SA 4.0",
        )
        crud_epigraph.create(session, obj_in=published)

        unpublished = EpigraphCreate(
            dasi_id=8101,
            title="Unpublished",
            epigraph_text="Text",
            dasi_published=False,
            uri="https://dasi.cnr.it/test",
            chronology_conjectural=False,
            textual_typology_conjectural=False,
            royal_inscription=False,
            license="CC BY-SA 4.0",
        )
        crud_epigraph.create(session, obj_in=unpublished)

        results = crud_epigraph.get_id_and_dasi_id(session, dasi_published=True)
        dasi_ids = [r[1] for r in results]
        assert 8100 in dasi_ids
        assert 8101 not in dasi_ids

    def test_get_id_and_dasi_id_with_pagination(self, session: Session):
        """Test getting ID and DASI ID pairs with pagination."""
        for i in range(5):
            epigraph_data = EpigraphCreate(
                dasi_id=8200 + i,
                title=f"Epigraph {i}",
                epigraph_text="Text",
                uri="https://dasi.cnr.it/test",
                chronology_conjectural=False,
                textual_typology_conjectural=False,
                royal_inscription=False,
                license="CC BY-SA 4.0",
            )
            crud_epigraph.create(session, obj_in=epigraph_data)

        results = crud_epigraph.get_id_and_dasi_id(session, skip=1, limit=2)
        assert len(results) == 2


class TestFindSimilar:
    """Test finding similar epigraphs by embedding."""

    def test_find_similar_with_embedding(
        self, session: Session, test_epigraph_with_embedding: Epigraph
    ):
        """Test finding similar epigraphs."""
        embeddings = [
            [0.1, 0.2, 0.3, 0.4, 0.5] + [0.0] * 3067,  # Very similar
            [0.9, 0.8, 0.7, 0.6, 0.5] + [0.0] * 3067,  # Different
            [0.15, 0.25, 0.35, 0.45, 0.55] + [0.0] * 3067,  # Somewhat similar
        ]
        for i, emb in enumerate(embeddings):
            epigraph = Epigraph(
                dasi_id=9000 + i,
                title=f"Similar Epigraph {i}",
                epigraph_text="Text",
                embedding=emb,
                uri="https://dasi.cnr.it/test",
                chronology_conjectural=False,
                textual_typology_conjectural=False,
                royal_inscription=False,
                license="CC BY-SA 4.0",
            )
            session.add(epigraph)
        session.commit()

        query_embedding = [0.1, 0.2, 0.3, 0.4, 0.5] + [0.0] * 3067
        similar = crud_epigraph.find_similar(
            session, embedding=query_embedding, limit=3
        )

        assert isinstance(similar, list)
        assert len(similar) <= 3
        assert len(similar) > 0


class TestLinkToSite:
    """Test linking epigraphs to sites."""

    def test_link_to_site_new_link(
        self, session: Session, test_epigraph: Epigraph, test_site: Site
    ):
        """Test creating a new epigraph-site link."""
        result = crud_epigraph.link_to_site(
            session, epigraph=test_epigraph, site_id=test_site.id
        )

        assert result.id == test_epigraph.id

        link = (
            session.query(EpigraphSiteLink)
            .filter(
                EpigraphSiteLink.epigraph_id == test_epigraph.id,
                EpigraphSiteLink.site_id == test_site.id,
            )
            .first()
        )
        assert link is not None

    def test_link_to_site_existing_link(
        self, session: Session, test_epigraph: Epigraph, test_site: Site
    ):
        """Test linking when link already exists (should not create duplicate)."""
        crud_epigraph.link_to_site(
            session, epigraph=test_epigraph, site_id=test_site.id
        )

        result = crud_epigraph.link_to_site(
            session, epigraph=test_epigraph, site_id=test_site.id
        )

        assert result.id == test_epigraph.id

        links = (
            session.query(EpigraphSiteLink)
            .filter(
                EpigraphSiteLink.epigraph_id == test_epigraph.id,
                EpigraphSiteLink.site_id == test_site.id,
            )
            .all()
        )
        assert len(links) == 1


class TestLinkToObject:
    """Test linking epigraphs to objects."""

    def test_link_to_object_new_link(
        self, session: Session, test_epigraph: Epigraph, test_object: Object
    ):
        """Test creating a new epigraph-object link."""
        result = crud_epigraph.link_to_object(
            session, epigraph=test_epigraph, object_id=test_object.id
        )

        assert result.id == test_epigraph.id

        link = (
            session.query(EpigraphObjectLink)
            .filter(
                EpigraphObjectLink.epigraph_id == test_epigraph.id,
                EpigraphObjectLink.object_id == test_object.id,
            )
            .first()
        )
        assert link is not None

    def test_link_to_object_existing_link(
        self, session: Session, test_epigraph: Epigraph, test_object: Object
    ):
        """Test linking when link already exists (should not create duplicate)."""
        crud_epigraph.link_to_object(
            session, epigraph=test_epigraph, object_id=test_object.id
        )

        result = crud_epigraph.link_to_object(
            session, epigraph=test_epigraph, object_id=test_object.id
        )

        assert result.id == test_epigraph.id

        links = (
            session.query(EpigraphObjectLink)
            .filter(
                EpigraphObjectLink.epigraph_id == test_epigraph.id,
                EpigraphObjectLink.object_id == test_object.id,
            )
            .all()
        )
        assert len(links) == 1


class TestUnlinkFromSite:
    """Test unlinking epigraphs from sites."""

    def test_unlink_from_site_existing_link(
        self, session: Session, test_epigraph: Epigraph, test_site: Site
    ):
        """Test unlinking an existing epigraph-site link."""
        crud_epigraph.link_to_site(
            session, epigraph=test_epigraph, site_id=test_site.id
        )

        result = crud_epigraph.unlink_from_site(
            session, epigraph=test_epigraph, site_id=test_site.id
        )

        assert result.id == test_epigraph.id

        link = (
            session.query(EpigraphSiteLink)
            .filter(
                EpigraphSiteLink.epigraph_id == test_epigraph.id,
                EpigraphSiteLink.site_id == test_site.id,
            )
            .first()
        )
        assert link is None

    def test_unlink_from_site_no_existing_link(
        self, session: Session, test_epigraph: Epigraph, test_site: Site
    ):
        """Test unlinking when no link exists (should be no-op)."""
        result = crud_epigraph.unlink_from_site(
            session, epigraph=test_epigraph, site_id=test_site.id
        )

        assert result.id == test_epigraph.id


class TestUnlinkAllSites:
    """Test unlinking epigraphs from all sites."""

    def test_unlink_all_sites_multiple_links(
        self, session: Session, test_epigraph: Epigraph
    ):
        """Test unlinking an epigraph from multiple sites."""
        sites = []
        for i in range(3):
            site = Site(
                dasi_id=10000 + i,
                title=f"Site {i}",
                uri="https://dasi.cnr.it/test",
                modern_name=f"Modern Name {i}",
                ancient_name=f"Ancient Name {i}",
                license="CC BY-SA 4.0",
            )
            session.add(site)
            session.commit()
            session.refresh(site)
            sites.append(site)

            crud_epigraph.link_to_site(session, epigraph=test_epigraph, site_id=site.id)

        links_before = (
            session.query(EpigraphSiteLink)
            .filter(EpigraphSiteLink.epigraph_id == test_epigraph.id)
            .all()
        )
        assert len(links_before) == 3

        result = crud_epigraph.unlink_all_sites(session, epigraph=test_epigraph)
        assert result.id == test_epigraph.id

        links_after = (
            session.query(EpigraphSiteLink)
            .filter(EpigraphSiteLink.epigraph_id == test_epigraph.id)
            .all()
        )
        assert len(links_after) == 0

    def test_unlink_all_sites_no_links(self, session: Session, test_epigraph: Epigraph):
        """Test unlinking all sites when no links exist."""
        result = crud_epigraph.unlink_all_sites(session, epigraph=test_epigraph)
        assert result.id == test_epigraph.id


class TestUnlinkFromObject:
    """Test unlinking epigraphs from objects."""

    def test_unlink_from_object_existing_link(
        self, session: Session, test_epigraph: Epigraph, test_object: Object
    ):
        """Test unlinking an existing epigraph-object link."""
        crud_epigraph.link_to_object(
            session, epigraph=test_epigraph, object_id=test_object.id
        )

        result = crud_epigraph.unlink_from_object(
            session, epigraph=test_epigraph, object_id=test_object.id
        )

        assert result.id == test_epigraph.id

        link = (
            session.query(EpigraphObjectLink)
            .filter(
                EpigraphObjectLink.epigraph_id == test_epigraph.id,
                EpigraphObjectLink.object_id == test_object.id,
            )
            .first()
        )
        assert link is None

    def test_unlink_from_object_no_existing_link(
        self, session: Session, test_epigraph: Epigraph, test_object: Object
    ):
        """Test unlinking when no link exists (should be no-op)."""
        result = crud_epigraph.unlink_from_object(
            session, epigraph=test_epigraph, object_id=test_object.id
        )

        assert result.id == test_epigraph.id
