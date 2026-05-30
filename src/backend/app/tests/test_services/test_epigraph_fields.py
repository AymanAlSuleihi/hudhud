from sqlmodel import Session

from app.models.epigraph import Epigraph
from app.models.site import Site
from app.services.search.epigraph_fields import get_epigraph_facet_values


def _create_epigraph(
    session: Session,
    *,
    dasi_id: int,
    title: str,
    period: str,
    language_level_1: str,
    language_level_2: str,
    alphabet: str,
) -> Epigraph:
    epigraph = Epigraph(
        dasi_id=dasi_id,
        title=title,
        uri=f"https://dasi.cnr.it/{dasi_id}",
        epigraph_text=f"Text for {title}",
        period=period,
        language_level_1=language_level_1,
        language_level_2=language_level_2,
        alphabet=alphabet,
        chronology_conjectural=False,
        textual_typology_conjectural=False,
        royal_inscription=False,
        license="CC BY-SA 4.0",
        dasi_published=True,
    )
    session.add(epigraph)
    session.commit()
    session.refresh(epigraph)
    return epigraph


def _create_site(
    session: Session,
    *,
    dasi_id: int,
    modern_name: str,
    ancient_name: str,
    geographical_area: str,
    country: str,
) -> Site:
    site = Site(
        dasi_id=dasi_id,
        uri=f"https://dasi.cnr.it/site/{dasi_id}",
        modern_name=modern_name,
        ancient_name=ancient_name,
        geographical_area=geographical_area,
        country=country,
        license="CC BY-SA 4.0",
        dasi_published=True,
    )
    session.add(site)
    session.commit()
    session.refresh(site)
    return site


def test_generic_facet_values_remain_stable_with_unrelated_filters(session: Session) -> None:
    _create_epigraph(
        session,
        dasi_id=9001,
        title="Alpha inscription",
        period="Period A",
        language_level_1="Language A",
        language_level_2="Branch A1",
        alphabet="Alphabet A",
    )
    _create_epigraph(
        session,
        dasi_id=9002,
        title="Beta inscription",
        period="Period B",
        language_level_1="Language B",
        language_level_2="Branch B1",
        alphabet="Alphabet B",
    )

    facet_values = get_epigraph_facet_values(
        session,
        filters={"dasi_published": True, "period": "Period A"},
    )

    assert facet_values["alphabet"] == ["Alphabet A", "Alphabet B"]
    assert facet_values["period"] == ["Period A", "Period B"]


def test_dependent_language_facet_values_follow_parent_selection(session: Session) -> None:
    _create_epigraph(
        session,
        dasi_id=9011,
        title="Language A inscription",
        period="Period A",
        language_level_1="Language A",
        language_level_2="Branch A1",
        alphabet="Alphabet A",
    )
    _create_epigraph(
        session,
        dasi_id=9012,
        title="Language B inscription",
        period="Period B",
        language_level_1="Language B",
        language_level_2="Branch B1",
        alphabet="Alphabet B",
    )

    facet_values = get_epigraph_facet_values(
        session,
        filters={"dasi_published": True, "language_level_1": "Language A", "period": "Period B"},
    )

    assert facet_values["language_level_1"] == ["Language A", "Language B"]
    assert facet_values["language_level_2"] == ["Branch A1"]


def test_site_facet_values_are_available_from_linked_sites(session: Session) -> None:
    epigraph = _create_epigraph(
        session,
        dasi_id=9021,
        title="Site-linked inscription",
        period="Period A",
        language_level_1="Language A",
        language_level_2="Branch A1",
        alphabet="Alphabet A",
    )
    other_epigraph = _create_epigraph(
        session,
        dasi_id=9022,
        title="Other site-linked inscription",
        period="Period B",
        language_level_1="Language B",
        language_level_2="Branch B1",
        alphabet="Alphabet B",
    )

    marib = _create_site(
        session,
        dasi_id=8001,
        modern_name="Marib",
        ancient_name="Mrb",
        geographical_area="Jawf",
        country="Yemen",
    )
    sirwah = _create_site(
        session,
        dasi_id=8002,
        modern_name="Sirwah",
        ancient_name="S1rwah",
        geographical_area="Marib",
        country="Yemen",
    )

    epigraph.sites_objs.append(marib)
    other_epigraph.sites_objs.append(sirwah)
    session.add(epigraph)
    session.add(other_epigraph)
    session.commit()

    facet_values = get_epigraph_facet_values(
        session,
        filters={"dasi_published": True},
    )

    assert facet_values["site_modern_name"] == ["Marib", "Sirwah"]
    assert facet_values["site_ancient_name"] == ["Mrb", "S1rwah"]
    assert facet_values["site_geographical_area"] == ["Jawf", "Marib"]
    assert facet_values["site_country"] == ["Yemen"]