from __future__ import annotations

import re
from collections import Counter
from typing import Any

from sqlalchemy import text as sql_text
from sqlmodel import Session, select

from app.models.epigraph import Epigraph
from app.models.site import Site
from app.utils import parse_period


_SITE_ID_PATTERN = re.compile(r"/sites/(\d+)$")


def _normalize_label(value: str | None, fallback: str = "Unknown") -> str:
    if value is None:
        return fallback
    normalized = value.strip()
    return normalized or fallback


def _build_chart(
    rows: list[tuple[str, int]],
    *,
    series_name: str,
    chart_type: str = "bar",
) -> dict[str, Any]:
    return {
        "legend": [series_name],
        "xAxis": [label for label, _ in rows],
        "series": [
            {
                "name": series_name,
                "type": chart_type,
                "data": [count for _, count in rows],
                **({"smooth": True} if chart_type == "line" else {}),
            }
        ],
    }


def _build_multi_series_chart(
    x_axis: list[str],
    series: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "legend": [str(item["name"]) for item in series],
        "xAxis": x_axis,
        "series": series,
    }


def _run_label_count_query(session: Session, query: str) -> list[tuple[str, int]]:
    rows = session.exec(sql_text(query)).all()
    return [(_normalize_label(label), int(count)) for label, count in rows]


def _run_label_translation_breakdown_query(session: Session, query: str) -> list[tuple[str, int, int]]:
    rows = session.exec(sql_text(query)).all()
    return [(_normalize_label(label), int(translated_count), int(untranslated_count)) for label, translated_count, untranslated_count in rows]


def _build_translation_status_chart(rows: list[tuple[str, int, int]]) -> dict[str, Any]:
    return _build_multi_series_chart(
        [label for label, _, _ in rows],
        [
            {
                "name": "Translated",
                "type": "bar",
                "stack": "translation-status",
                "data": [translated_count for _, translated_count, _ in rows],
            },
            {
                "name": "Untranslated",
                "type": "bar",
                "stack": "translation-status",
                "data": [untranslated_count for _, _, untranslated_count in rows],
            },
        ],
    )


def _build_publication_calendar(session: Session) -> dict[str, list[int]]:
    rows = session.exec(
        sql_text(
            """
            SELECT
                EXTRACT(YEAR FROM first_published::date)::int AS year,
                EXTRACT(MONTH FROM first_published::date)::int AS month,
                COUNT(*)::int AS publication_count
            FROM epigraph
            WHERE COALESCE(dasi_published, false)
              AND first_published ~ '^\\d{4}-\\d{2}-\\d{2}$'
            GROUP BY year, month
            ORDER BY year, month
            """
        )
    ).all()

    calendar: dict[str, list[int]] = {}
    for year, month, publication_count in rows:
        year_key = str(int(year))
        calendar.setdefault(year_key, [0] * 12)
        calendar[year_key][int(month) - 1] = int(publication_count)

    return dict(sorted(calendar.items(), key=lambda item: item[0]))


def _build_site_map_payload(session: Session) -> dict[str, Any]:
    total_sites = int(session.exec(sql_text("SELECT COUNT(*)::int FROM site")).one()[0])
    rows = session.exec(
        select(
            Site.dasi_id,
            Site.uri,
            Site.modern_name,
            Site.ancient_name,
            Site.country,
            Site.type_of_site,
            Site.language,
            Site.coordinates_accuracy,
            Site.coordinates,
            Site.kingdom,
            Site.chronology,
        ).where(Site.coordinates.is_not(None))
    ).all()

    country_counts: Counter[str] = Counter()
    site_type_counts: Counter[str] = Counter()
    accuracy_counts: Counter[str] = Counter()
    countries: set[str] = set()
    site_types: set[str] = set()
    accuracies: set[str] = set()
    points: list[dict[str, Any]] = []

    for (
        dasi_id,
        uri,
        modern_name,
        ancient_name,
        country,
        type_of_site,
        language,
        coordinates_accuracy,
        coordinates,
        kingdom,
        chronology,
    ) in rows:
        if not coordinates or len(coordinates) != 2:
            continue

        latitude = float(coordinates[0])
        longitude = float(coordinates[1])
        country_label = _normalize_label(country)
        site_type_label = _normalize_label(type_of_site)
        accuracy_label = _normalize_label(coordinates_accuracy)
        language_label = _normalize_label(language)
        kingdoms = [item.strip() for item in (kingdom or []) if item and item.strip()]

        countries.add(country_label)
        site_types.add(site_type_label)
        accuracies.add(accuracy_label)
        country_counts[country_label] += 1
        site_type_counts[site_type_label] += 1
        accuracy_counts[accuracy_label] += 1

        points.append(
            {
                "siteDasiId": int(dasi_id),
                "uri": uri,
                "modernName": _normalize_label(modern_name, f"Site {dasi_id}"),
                "ancientName": ancient_name,
                "country": country_label,
                "typeOfSite": site_type_label,
                "language": language_label,
                "coordinatesAccuracy": accuracy_label,
                "coordinates": [longitude, latitude],
                "kingdoms": kingdoms,
                "chronology": chronology,
            }
        )

    points.sort(key=lambda point: (point["country"], point["modernName"]))

    return {
        "summary": {
            "totalSites": total_sites,
            "mappedSites": len(points),
            "countries": len(countries),
            "siteTypes": len(site_types),
            "coordinateCoveragePercent": round((len(points) / total_sites) * 100, 1) if total_sites else 0,
        },
        "filters": {
            "countries": sorted(countries),
            "siteTypes": sorted(site_types),
            "accuracies": sorted(
                accuracies,
                key=lambda value: (
                    {"certain": 0, "approximate": 1, "assumed": 2}.get(value.lower(), 99),
                    value,
                ),
            ),
        },
        "points": points,
        "countryCounts": [
            {"label": label, "count": count}
            for label, count in country_counts.most_common()
        ],
        "siteTypeCounts": [
            {"label": label, "count": count}
            for label, count in site_type_counts.most_common()
        ],
        "accuracyCounts": [
            {"label": label, "count": count}
            for label, count in accuracy_counts.most_common()
        ],
    }


def _normalize_site_coordinates(coordinates: Any) -> tuple[float, float] | None:
    if not isinstance(coordinates, (list, tuple)) or len(coordinates) != 2:
        return None

    try:
        latitude = float(coordinates[0])
        longitude = float(coordinates[1])
    except (TypeError, ValueError):
        return None

    return longitude, latitude


def _normalize_language_label(value: str | None) -> str:
    normalized = _normalize_label(value)
    normalized = re.sub(r"\blanguage\b", "", normalized, flags=re.IGNORECASE).strip()
    return normalized or "Unknown"


def _extract_site_dasi_ids(site_refs: Any) -> set[int]:
    if not isinstance(site_refs, list):
        return set()

    site_ids: set[int] = set()

    for item in site_refs:
        candidate: int | None = None

        if isinstance(item, dict):
            raw_dasi_id = item.get("dasi_id")
            if isinstance(raw_dasi_id, int):
                candidate = raw_dasi_id
            elif isinstance(raw_dasi_id, str) and raw_dasi_id.isdigit():
                candidate = int(raw_dasi_id)
            else:
                for key in ("@id", "uri", "id"):
                    raw_value = item.get(key)
                    if isinstance(raw_value, int):
                        candidate = raw_value
                        break
                    if isinstance(raw_value, str):
                        stripped_value = raw_value.strip()
                        if stripped_value.isdigit():
                            candidate = int(stripped_value)
                            break
                        match = _SITE_ID_PATTERN.search(stripped_value)
                        if match:
                            candidate = int(match.group(1))
                            break
        elif isinstance(item, str):
            stripped_value = item.strip()
            if stripped_value.isdigit():
                candidate = int(stripped_value)
            else:
                match = _SITE_ID_PATTERN.search(stripped_value)
                if match:
                    candidate = int(match.group(1))

        if candidate is not None:
            site_ids.add(candidate)

    return site_ids


def _period_sort_key(period: str) -> tuple[int, tuple[str, int, str]]:
    if period == "Unknown":
        return (1, ("ZZZ", 0, ""))
    return (0, parse_period(period))


def _build_language_descriptor(level_1: str, level_2: str, level_3: str) -> dict[str, str] | None:
    family = _normalize_language_label(level_1)
    branch = _normalize_language_label(level_2)
    leaf = _normalize_language_label(level_3)

    if family == "Unknown":
        return None

    label = leaf if leaf != "Unknown" else branch if branch != "Unknown" else family
    group = branch if branch != "Unknown" else family

    return {
        "key": "::".join((family, branch, leaf)),
        "label": label,
        "family": family,
        "branch": branch,
        "leaf": leaf,
        "group": group,
    }


def _load_public_mapped_site_lookup(session: Session) -> tuple[dict[int, dict[str, Any]], int, int]:
    total_sites = int(session.exec(sql_text("SELECT COUNT(*)::int FROM site")).one()[0])
    rows = session.exec(
        select(
            Site.dasi_id,
            Site.uri,
            Site.modern_name,
            Site.ancient_name,
            Site.country,
            Site.type_of_site,
            Site.coordinates_accuracy,
            Site.coordinates,
            Site.dasi_published,
        )
    ).all()

    public_site_count = 0
    site_lookup: dict[int, dict[str, Any]] = {}

    for (
        dasi_id,
        uri,
        modern_name,
        ancient_name,
        country,
        type_of_site,
        coordinates_accuracy,
        coordinates,
        dasi_published,
    ) in rows:
        if dasi_published is False:
            continue

        public_site_count += 1
        normalized_coordinates = _normalize_site_coordinates(coordinates)
        if normalized_coordinates is None:
            continue

        site_lookup[int(dasi_id)] = {
            "siteDasiId": int(dasi_id),
            "siteUri": uri,
            "siteName": _normalize_label(modern_name, f"Site {dasi_id}"),
            "ancientName": ancient_name or None,
            "country": _normalize_label(country),
            "typeOfSite": _normalize_label(type_of_site),
            "coordinatesAccuracy": _normalize_label(coordinates_accuracy),
            "coordinates": [normalized_coordinates[0], normalized_coordinates[1]],
        }

    return site_lookup, total_sites, public_site_count


def _load_epigraph_site_associations(session: Session) -> tuple[list[dict[str, Any]], dict[str, int]]:
    site_lookup, total_sites, public_site_count = _load_public_mapped_site_lookup(session)
    suspicious_site_threshold = max(50, public_site_count - 2) if public_site_count >= 50 else 0

    epigraph_rows = session.exec(
        select(
            Epigraph.dasi_id,
            Epigraph.uri,
            Epigraph.title,
            Epigraph.period,
            Epigraph.sites,
            Epigraph.language_level_1,
            Epigraph.language_level_2,
            Epigraph.language_level_3,
        ).where(Epigraph.dasi_published.is_(True))
    ).all()

    associations: list[dict[str, Any]] = []
    excluded_epigraphs = 0

    for (
        epigraph_dasi_id,
        epigraph_uri,
        epigraph_title,
        period,
        sites,
        language_level_1,
        language_level_2,
        language_level_3,
    ) in epigraph_rows:
        site_ids = _extract_site_dasi_ids(sites)
        if not site_ids:
            continue

        if suspicious_site_threshold and len(site_ids) >= suspicious_site_threshold:
            excluded_epigraphs += 1
            continue

        for site_dasi_id in site_ids:
            site = site_lookup.get(site_dasi_id)
            if site is None:
                continue

            associations.append(
                {
                    "epigraphDasiId": int(epigraph_dasi_id),
                    "epigraphUri": epigraph_uri,
                    "epigraphTitle": _normalize_label(epigraph_title, f"Epigraph {epigraph_dasi_id}"),
                    "period": _normalize_label(period),
                    "languageLevel1": _normalize_language_label(language_level_1),
                    "languageLevel2": _normalize_language_label(language_level_2),
                    "languageLevel3": _normalize_language_label(language_level_3),
                    **site,
                }
            )

    return associations, {
        "totalSites": total_sites,
        "publicSiteCount": public_site_count,
        "publishedEpigraphs": len(epigraph_rows),
        "excludedEpigraphs": excluded_epigraphs,
        "siteFanoutThreshold": suspicious_site_threshold,
    }


def get_analytics_overview(session: Session) -> dict[str, Any]:
    count_rows = session.exec(
        sql_text(
            """
            SELECT 'epigraphs_total', COUNT(*)::int FROM epigraph
            UNION ALL
            SELECT 'published_epigraphs', COUNT(*)::int
            FROM epigraph
            WHERE COALESCE(dasi_published, false)
            UNION ALL
            SELECT 'translated_epigraphs', COUNT(*)::int
            FROM epigraph
            WHERE COALESCE(dasi_published, false)
              AND jsonb_typeof(translations) = 'array'
              AND jsonb_array_length(translations) > 0
            UNION ALL
            SELECT 'epigraphs_with_known_period', COUNT(*)::int
            FROM epigraph
            WHERE COALESCE(dasi_published, false)
              AND NULLIF(BTRIM(period), '') IS NOT NULL
            UNION ALL
            SELECT 'sites_total', COUNT(*)::int FROM site
            UNION ALL
            SELECT 'mapped_sites', COUNT(*)::int
            FROM site
            WHERE coordinates IS NOT NULL
              AND jsonb_typeof(coordinates) = 'array'
              AND jsonb_array_length(coordinates) = 2
            UNION ALL
            SELECT 'words_total', COUNT(*)::int FROM word
            UNION ALL
            SELECT 'objects_total', COUNT(*)::int FROM object
            """
        )
    ).all()
    counts = {metric: int(value) for metric, value in count_rows}

    published_epigraphs = counts.get("published_epigraphs", 0)
    translated_epigraphs = counts.get("translated_epigraphs", 0)
    known_period_epigraphs = counts.get("epigraphs_with_known_period", 0)
    sites_total = counts.get("sites_total", 0)
    mapped_sites = counts.get("mapped_sites", 0)

    translation_coverage = round((translated_epigraphs / published_epigraphs) * 100, 1) if published_epigraphs else 0
    period_coverage = round((known_period_epigraphs / published_epigraphs) * 100, 1) if published_epigraphs else 0
    coordinate_coverage = round((mapped_sites / sites_total) * 100, 1) if sites_total else 0

    translation_rows = [
        ("Translated", translated_epigraphs),
        ("Untranslated", max(published_epigraphs - translated_epigraphs, 0)),
    ]

    period_breakdown_rows = _run_label_translation_breakdown_query(
        session,
        """
        SELECT
            BTRIM(period) AS period_label,
            SUM(
                CASE
                    WHEN jsonb_typeof(translations) = 'array' THEN
                        CASE WHEN jsonb_array_length(translations) > 0 THEN 1 ELSE 0 END
                    ELSE 0
                END
            )::int AS translated_count,
            SUM(
                CASE
                    WHEN jsonb_typeof(translations) = 'array' THEN
                        CASE WHEN jsonb_array_length(translations) > 0 THEN 0 ELSE 1 END
                    ELSE 1
                END
            )::int AS untranslated_count
        FROM epigraph
        WHERE COALESCE(dasi_published, false)
          AND NULLIF(BTRIM(period), '') IS NOT NULL
        GROUP BY period_label
        """,
    )
    period_breakdown_rows.sort(key=lambda row: _period_sort_key(row[0]))

    language_rows = _run_label_translation_breakdown_query(
        session,
        """
        SELECT
            language_level_2 AS language_label,
            SUM(
                CASE
                    WHEN jsonb_typeof(translations) = 'array' THEN
                        CASE WHEN jsonb_array_length(translations) > 0 THEN 1 ELSE 0 END
                    ELSE 0
                END
            )::int AS translated_count,
            SUM(
                CASE
                    WHEN jsonb_typeof(translations) = 'array' THEN
                        CASE WHEN jsonb_array_length(translations) > 0 THEN 0 ELSE 1 END
                    ELSE 1
                END
            )::int AS untranslated_count
        FROM epigraph
        WHERE COALESCE(dasi_published, false)
          AND NULLIF(BTRIM(language_level_2), '') IS NOT NULL
                GROUP BY 1
                ORDER BY 2 + 3 DESC, 1 ASC
        LIMIT 12
        """,
    )
    textual_typology_rows = _run_label_translation_breakdown_query(
        session,
        """
        SELECT
            textual_typology AS typology_label,
            SUM(
                CASE
                    WHEN jsonb_typeof(translations) = 'array' THEN
                        CASE WHEN jsonb_array_length(translations) > 0 THEN 1 ELSE 0 END
                    ELSE 0
                END
            )::int AS translated_count,
            SUM(
                CASE
                    WHEN jsonb_typeof(translations) = 'array' THEN
                        CASE WHEN jsonb_array_length(translations) > 0 THEN 0 ELSE 1 END
                    ELSE 1
                END
            )::int AS untranslated_count
        FROM epigraph
        WHERE COALESCE(dasi_published, false)
          AND NULLIF(BTRIM(textual_typology), '') IS NOT NULL
                GROUP BY 1
                ORDER BY 2 + 3 DESC, 1 ASC
        LIMIT 12
        """,
    )
    writing_technique_rows = _run_label_translation_breakdown_query(
        session,
        """
        SELECT
            technique,
            SUM(
                CASE
                    WHEN jsonb_typeof(translations) = 'array' THEN
                        CASE WHEN jsonb_array_length(translations) > 0 THEN 1 ELSE 0 END
                    ELSE 0
                END
            )::int AS translated_count,
            SUM(
                CASE
                    WHEN jsonb_typeof(translations) = 'array' THEN
                        CASE WHEN jsonb_array_length(translations) > 0 THEN 0 ELSE 1 END
                    ELSE 1
                END
            )::int AS untranslated_count
        FROM epigraph
        CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(writing_techniques, '[]'::jsonb)) AS technique
        WHERE COALESCE(dasi_published, false)
        GROUP BY 1
        ORDER BY 2 + 3 DESC, 1 ASC
        LIMIT 12
        """,
    )
    mapped_country_rows = _run_label_count_query(
        session,
        """
        SELECT COALESCE(NULLIF(BTRIM(country), ''), 'Unknown') AS country_label, COUNT(*)::int AS site_count
        FROM site
                WHERE dasi_published IS DISTINCT FROM FALSE
                    AND coordinates IS NOT NULL
          AND jsonb_typeof(coordinates) = 'array'
          AND jsonb_array_length(coordinates) = 2
        GROUP BY country_label
        ORDER BY site_count DESC, country_label ASC
        LIMIT 12
        """,
    )
    mapped_site_type_rows = _run_label_count_query(
        session,
        """
        SELECT COALESCE(NULLIF(BTRIM(type_of_site), ''), 'Unknown') AS site_type_label, COUNT(*)::int AS site_count
        FROM site
                WHERE dasi_published IS DISTINCT FROM FALSE
                    AND coordinates IS NOT NULL
          AND jsonb_typeof(coordinates) = 'array'
          AND jsonb_array_length(coordinates) = 2
        GROUP BY site_type_label
        ORDER BY site_count DESC, site_type_label ASC
        LIMIT 12
        """,
    )

    return {
        "summary": {
            "epigraphsTotal": counts.get("epigraphs_total", 0),
            "publishedEpigraphs": published_epigraphs,
            "translatedEpigraphs": translated_epigraphs,
            "sitesTotal": sites_total,
            "mappedSites": mapped_sites,
            "wordsTotal": counts.get("words_total", 0),
            "objectsTotal": counts.get("objects_total", 0),
            "translationCoveragePercent": translation_coverage,
            "knownPeriodCoveragePercent": period_coverage,
            "coordinateCoveragePercent": coordinate_coverage,
        },
        "charts": {
            "translationCoverage": _build_chart(
                translation_rows,
                series_name="Epigraphs",
            ),
            "periodDistribution": _build_translation_status_chart(period_breakdown_rows),
            "languageDistribution": _build_translation_status_chart(language_rows),
            "textualTypologyDistribution": _build_translation_status_chart(textual_typology_rows),
            "writingTechniqueDistribution": _build_translation_status_chart(writing_technique_rows),
            "mappedCountryDistribution": _build_chart(
                mapped_country_rows,
                series_name="Mapped sites",
            ),
            "mappedSiteTypeDistribution": _build_chart(
                mapped_site_type_rows,
                series_name="Mapped sites",
            ),
            "publicationCalendar": _build_publication_calendar(session),
        },
    }


def get_site_map(session: Session) -> dict[str, Any]:
    return _build_site_map_payload(session)


def get_epigraph_heatmap(session: Session) -> dict[str, Any]:
    associations, base_summary = _load_epigraph_site_associations(session)

    site_period_counts: Counter[tuple[int, str]] = Counter()
    site_metadata: dict[int, dict[str, Any]] = {}
    periods: set[str] = set()
    mapped_epigraph_ids: set[int] = set()
    mapped_site_ids: set[int] = set()

    for association in associations:
        site_dasi_id = int(association["siteDasiId"])
        period = str(association["period"])
        site_period_counts[(site_dasi_id, period)] += 1
        site_metadata[site_dasi_id] = {
            "siteDasiId": site_dasi_id,
            "siteUri": association["siteUri"],
            "siteName": association["siteName"],
            "ancientName": association["ancientName"],
            "country": association["country"],
            "typeOfSite": association["typeOfSite"],
            "coordinatesAccuracy": association["coordinatesAccuracy"],
            "coordinates": association["coordinates"],
        }
        periods.add(period)
        mapped_epigraph_ids.add(int(association["epigraphDasiId"]))
        mapped_site_ids.add(site_dasi_id)

    points = [
        {
            **site_metadata[site_dasi_id],
            "period": period,
            "epigraphCount": epigraph_count,
        }
        for (site_dasi_id, period), epigraph_count in site_period_counts.items()
    ]
    points.sort(
        key=lambda point: (
            _period_sort_key(point["period"]),
            -int(point["epigraphCount"]),
            str(point["siteName"]),
        )
    )

    period_list = sorted(periods, key=_period_sort_key)

    return {
        "summary": {
            "publishedEpigraphs": base_summary["publishedEpigraphs"],
            "mappedEpigraphs": len(mapped_epigraph_ids),
            "excludedEpigraphs": base_summary["excludedEpigraphs"],
            "mappedSites": len(mapped_site_ids),
            "periods": len(period_list),
            "siteFanoutThreshold": base_summary["siteFanoutThreshold"],
        },
        "periods": period_list,
        "points": points,
    }


def get_language_period_map(session: Session) -> dict[str, Any]:
    associations, base_summary = _load_epigraph_site_associations(session)

    site_period_language_counts: Counter[tuple[int, str, str]] = Counter()
    site_metadata: dict[int, dict[str, Any]] = {}
    language_descriptors: dict[str, dict[str, str]] = {}
    language_epigraph_ids: dict[str, set[int]] = {}
    language_site_ids: dict[str, set[int]] = {}
    periods: set[str] = set()
    mapped_epigraph_ids: set[int] = set()
    mapped_site_ids: set[int] = set()

    for association in associations:
        language_descriptor = _build_language_descriptor(
            str(association["languageLevel1"]),
            str(association["languageLevel2"]),
            str(association["languageLevel3"]),
        )
        if language_descriptor is None:
            continue

        site_dasi_id = int(association["siteDasiId"])
        period = str(association["period"])
        language_key = language_descriptor["key"]

        site_period_language_counts[(site_dasi_id, period, language_key)] += 1
        site_metadata[site_dasi_id] = {
            "siteDasiId": site_dasi_id,
            "siteUri": association["siteUri"],
            "siteName": association["siteName"],
            "ancientName": association["ancientName"],
            "country": association["country"],
            "typeOfSite": association["typeOfSite"],
            "coordinatesAccuracy": association["coordinatesAccuracy"],
            "coordinates": association["coordinates"],
        }
        language_descriptors[language_key] = language_descriptor
        language_epigraph_ids.setdefault(language_key, set()).add(int(association["epigraphDasiId"]))
        language_site_ids.setdefault(language_key, set()).add(site_dasi_id)
        periods.add(period)
        mapped_epigraph_ids.add(int(association["epigraphDasiId"]))
        mapped_site_ids.add(site_dasi_id)

    points = [
        {
            **site_metadata[site_dasi_id],
            "period": period,
            "languageKey": language_key,
            "languageLabel": language_descriptors[language_key]["label"],
            "languageFamily": language_descriptors[language_key]["family"],
            "languageBranch": language_descriptors[language_key]["branch"],
            "languageLeaf": language_descriptors[language_key]["leaf"],
            "languageGroup": language_descriptors[language_key]["group"],
            "epigraphCount": epigraph_count,
        }
        for (site_dasi_id, period, language_key), epigraph_count in site_period_language_counts.items()
    ]
    points.sort(
        key=lambda point: (
            _period_sort_key(point["period"]),
            str(point["languageFamily"]),
            str(point["languageBranch"]),
            str(point["languageLabel"]),
            -int(point["epigraphCount"]),
            str(point["siteName"]),
        )
    )

    language_list = [
        {
            **descriptor,
            "epigraphCount": len(language_epigraph_ids.get(language_key, set())),
            "siteCount": len(language_site_ids.get(language_key, set())),
        }
        for language_key, descriptor in language_descriptors.items()
    ]
    language_list.sort(
        key=lambda language: (
            str(language["family"]),
            str(language["branch"]),
            str(language["label"]),
        )
    )

    period_list = sorted(periods, key=_period_sort_key)

    return {
        "summary": {
            "publishedEpigraphs": base_summary["publishedEpigraphs"],
            "mappedEpigraphs": len(mapped_epigraph_ids),
            "excludedEpigraphs": base_summary["excludedEpigraphs"],
            "mappedSites": len(mapped_site_ids),
            "periods": len(period_list),
            "languages": len(language_list),
            "siteFanoutThreshold": base_summary["siteFanoutThreshold"],
        },
        "periods": period_list,
        "languages": language_list,
        "points": points,
    }