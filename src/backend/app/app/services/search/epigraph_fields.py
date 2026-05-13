from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlmodel import Session, asc, func, select

from app.models.epigraph import Epigraph
from app.utils import parse_period


@dataclass(frozen=True)
class EpigraphFacetField:
    key: str
    label: str
    sort_mode: str = "alpha"
    depends_on: tuple[str, ...] = ()
    facet_filter_keys: tuple[str, ...] | None = None
    multi_value: bool = False


EPIGRAPH_FACET_FIELDS: tuple[EpigraphFacetField, ...] = (
    EpigraphFacetField("period", "Period", sort_mode="period"),
    EpigraphFacetField("chronology_conjectural", "Chronology (Conjectural)"),
    EpigraphFacetField("language_level_1", "Language (Level 1)", facet_filter_keys=("dasi_published",)),
    EpigraphFacetField(
        "language_level_2",
        "Language (Level 2)",
        depends_on=("language_level_1",),
        facet_filter_keys=("dasi_published", "language_level_1"),
    ),
    EpigraphFacetField(
        "language_level_3",
        "Language (Level 3)",
        depends_on=("language_level_1", "language_level_2"),
        facet_filter_keys=("dasi_published", "language_level_1", "language_level_2"),
    ),
    EpigraphFacetField("alphabet", "Alphabet"),
    EpigraphFacetField("script_typology", "Script Typology"),
    EpigraphFacetField("script_cursus", "Script Cursus", multi_value=True),
    EpigraphFacetField("textual_typology", "Textual Typology"),
    EpigraphFacetField("textual_typology_conjectural", "Textual Typology (Conjectural)"),
    EpigraphFacetField("writing_techniques", "Writing Techniques", multi_value=True),
    EpigraphFacetField("royal_inscription", "Royal Inscription"),
)

EPIGRAPH_FACET_FIELD_MAP = {field.key: field for field in EPIGRAPH_FACET_FIELDS}
BOOLEAN_FACET_FIELD_KEYS = {
    "chronology_conjectural",
    "textual_typology_conjectural",
    "royal_inscription",
}


def _apply_epigraph_filter(statement: Any, key: str, value: Any) -> Any:
    column = getattr(Epigraph, key, None)
    if column is None:
        return statement

    field = EPIGRAPH_FACET_FIELD_MAP.get(key)

    if isinstance(value, bool):
        return statement.where(column.is_(value))

    if field is not None and field.multi_value:
        if isinstance(value, list):
            return statement.where(column.contains(value))

        return statement.where(column.contains([value]))

    if isinstance(value, list):
        return statement.where(column.in_(value))

    if isinstance(value, dict) and "not" in value and value["not"] is False:
        return statement.where(column.isnot(False))

    return statement.where(column == value)


def _get_epigraph_facet_sort_key(field: EpigraphFacetField, value: Any) -> Any:
    if field.sort_mode == "period":
        return parse_period(str(value))

    return str(value).casefold()


def _sort_epigraph_facet_values(field: EpigraphFacetField, values: list[Any]) -> list[Any]:
    return sorted(values, key=lambda value: _get_epigraph_facet_sort_key(field, value))


def sort_epigraph_facet_values(field_key: str, values: list[Any]) -> list[Any]:
    field = EPIGRAPH_FACET_FIELD_MAP.get(field_key)
    if field is None:
        return values

    return _sort_epigraph_facet_values(field, values)


def sort_epigraph_facet_buckets(field_key: str, buckets: list[dict[str, Any]]) -> list[dict[str, Any]]:
    field = EPIGRAPH_FACET_FIELD_MAP.get(field_key)
    if field is None:
        return buckets

    return sorted(
        buckets,
        key=lambda bucket: _get_epigraph_facet_sort_key(field, bucket["value"]),
    )


def get_epigraph_facet_schema() -> list[dict[str, Any]]:
    return [
        {
            "key": field.key,
            "label": field.label,
            "dependsOn": list(field.depends_on),
            "sortMode": field.sort_mode,
            "multiValue": field.multi_value,
        }
        for field in EPIGRAPH_FACET_FIELDS
    ]


def get_epigraph_facet_values(
    session: Session,
    filters: dict[str, Any] | None = None,
) -> dict[str, list[Any]]:
    field_values: dict[str, list[Any]] = {}

    for field in EPIGRAPH_FACET_FIELDS:
        statement: Any = select(func.distinct(getattr(Epigraph, field.key))).where(
            getattr(Epigraph, field.key).is_not(None)
        )

        if filters:
            allowed_filter_keys = set(field.facet_filter_keys) if field.facet_filter_keys is not None else None

            for key, value in filters.items():
                if allowed_filter_keys is not None and key not in allowed_filter_keys:
                    continue

                statement = _apply_epigraph_filter(statement, key, value)

        statement = statement.order_by(asc(getattr(Epigraph, field.key)))
        raw_values = [
            value
            for value in session.exec(statement).all()
            if value is not None and value != "" and value != []
        ]

        if field.multi_value:
            values = sorted(
                {
                    item
                    for value in raw_values
                    if isinstance(value, list)
                    for item in value
                    if item
                },
                key=lambda value: _get_epigraph_facet_sort_key(field, value),
            )
            field_values[field.key] = values
            continue

        field_values[field.key] = _sort_epigraph_facet_values(field, raw_values)

    return field_values