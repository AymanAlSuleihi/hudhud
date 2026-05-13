from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class EpigraphSearchField:
    key: str
    label: str
    description: str
    category: str
    source: str
    subfields: tuple[str, ...] | None = None


@dataclass(frozen=True)
class EpigraphSearchScope:
    key: str
    label: str
    description: str
    field_keys: tuple[str, ...]


@dataclass(frozen=True)
class EpigraphSearchSortOption:
    key: str
    label: str
    default_order: str
    search_only: bool = False


@dataclass(frozen=True)
class EpigraphSearchOperator:
    key: str
    token: str
    label: str
    description: str


EPIGRAPH_SEARCH_FIELDS: tuple[EpigraphSearchField, ...] = (
    EpigraphSearchField("title", "Title", "Search the epigraph title.", "identity", "epigraph"),
    EpigraphSearchField("epigraph_text", "Epigraph Text", "Search the original inscription text.", "text", "epigraph"),
    EpigraphSearchField(
        "translations",
        "Translations",
        "Search translations together with their notes and bibliography.",
        "text",
        "translation",
        subfields=("text", "notes.note", "bibliography.reference", "bibliography.reference_short", "editors.name"),
    ),
    EpigraphSearchField("general_notes", "General Notes", "Search general scholarly notes.", "notes", "epigraph"),
    EpigraphSearchField(
        "apparatus_notes",
        "Apparatus Notes",
        "Search philological and apparatus notes.",
        "notes",
        "epigraph",
        subfields=("note",),
    ),
    EpigraphSearchField(
        "cultural_notes",
        "Cultural Notes",
        "Search cultural and historical commentary.",
        "notes",
        "epigraph",
        subfields=("note",),
    ),
    EpigraphSearchField(
        "bibliography",
        "Bibliography",
        "Search bibliography text and references.",
        "references",
        "epigraph",
        subfields=("text", "reference", "title", "reference_short"),
    ),
    EpigraphSearchField(
        "support_notes",
        "Support Notes",
        "Search object support descriptions.",
        "objects",
        "object",
    ),
    EpigraphSearchField(
        "deposit_notes",
        "Deposit Notes",
        "Search object deposit descriptions.",
        "objects",
        "object",
    ),
    EpigraphSearchField(
        "object_cultural_notes",
        "Object Cultural Notes",
        "Search cultural notes attached to related objects.",
        "objects",
        "object",
        subfields=("note",),
    ),
    EpigraphSearchField(
        "deposits",
        "Deposits",
        "Search settlement, institution, and repository deposit metadata.",
        "objects",
        "object",
        subfields=("settlement", "institution", "repository"),
    ),
    EpigraphSearchField(
        "decorations",
        "Decorations",
        "Search figurative and symbolic decoration metadata.",
        "objects",
        "object",
        subfields=(
            "typeLevel1",
            "type",
            "typeLevel2",
            "subjectLevel1",
            "partOfHumanBody",
            "subjectLevel2",
            "view",
            "humanGender",
            "humanClothes",
            "humanWeapons",
            "humanGestures",
            "humanJewellery",
            "partOfAnimalBody",
            "symbolShape",
            "symbolReference",
            "symbolReferenceText",
            "monogramName",
            "animalGestures",
        ),
    ),
    EpigraphSearchField("materials", "Materials", "Search object materials.", "objects", "object"),
    EpigraphSearchField("shape", "Shape", "Search object shapes.", "objects", "object"),
    EpigraphSearchField(
        "sites",
        "Sites",
        "Search related site names.",
        "context",
        "site",
        subfields=("name",),
    ),
    EpigraphSearchField(
        "images",
        "Images",
        "Search image captions.",
        "media",
        "media",
        subfields=("caption",),
    ),
    EpigraphSearchField(
        "editors",
        "Editors",
        "Search editor names in translation metadata.",
        "people",
        "translation",
        subfields=("name",),
    ),
)

EPIGRAPH_SEARCH_SCOPES: tuple[EpigraphSearchScope, ...] = (
    EpigraphSearchScope(
        "epigraphText",
        "Epigraph Text",
        "Search the original inscription text.",
        ("epigraph_text",),
    ),
    EpigraphSearchScope(
        "translationText",
        "Translations",
        "Search translations and translation-side notes.",
        ("translations",),
    ),
    EpigraphSearchScope(
        "notes",
        "Notes",
        "Search scholarly, contextual, site, image, and deposit notes.",
        (
            "general_notes",
            "apparatus_notes",
            "cultural_notes",
            "support_notes",
            "deposit_notes",
            "object_cultural_notes",
            "images",
            "sites",
            "deposits",
        ),
    ),
    EpigraphSearchScope(
        "bibliography",
        "Bibliography",
        "Search bibliography citations and references.",
        ("bibliography",),
    ),
    EpigraphSearchScope(
        "title",
        "Title",
        "Search epigraph titles.",
        ("title",),
    ),
    EpigraphSearchScope(
        "physical",
        "Physical",
        "Search materials, shapes, and decorations.",
        ("decorations", "materials", "shape"),
    ),
)

EPIGRAPH_SEARCH_SORT_OPTIONS: tuple[EpigraphSearchSortOption, ...] = (
    EpigraphSearchSortOption("_score", "Relevance", "desc", search_only=True),
    EpigraphSearchSortOption("dasi_id", "DASI ID", "asc"),
    EpigraphSearchSortOption("period", "Period", "asc"),
    EpigraphSearchSortOption("title", "Title", "asc"),
    EpigraphSearchSortOption("language_level_1", "Language", "asc"),
)

EPIGRAPH_SEARCH_OPERATORS: tuple[EpigraphSearchOperator, ...] = (
    EpigraphSearchOperator("required", "+term", "Required Term", "Require a term to be present."),
    EpigraphSearchOperator("excluded", "-term", "Excluded Term", "Exclude results containing a term."),
    EpigraphSearchOperator("phrase", '"exact phrase"', "Exact Phrase", "Search for an exact phrase."),
    EpigraphSearchOperator("wildcard", "* or ?", "Wildcard", "Use wildcard matching in a term."),
)

EPIGRAPH_SEARCH_FIELD_MAP = {field.key: field for field in EPIGRAPH_SEARCH_FIELDS}
EPIGRAPH_SEARCH_SCOPE_MAP = {scope.key: scope for scope in EPIGRAPH_SEARCH_SCOPES}
EPIGRAPH_SEARCH_SORT_MAP = {sort.key: sort for sort in EPIGRAPH_SEARCH_SORT_OPTIONS}

EPIGRAPH_LEGACY_OBJECT_QUERY_FIELD_KEYS: tuple[str, ...] = (
    "support_notes",
    "deposit_notes",
    "cultural_notes",
    "bibliography",
    "deposits",
    "title",
)


def get_epigraph_searchable_field_map() -> dict[str, list[str] | None]:
    return {
        field.key: list(field.subfields) if field.subfields is not None else None
        for field in EPIGRAPH_SEARCH_FIELDS
    }


def get_epigraph_search_field_keys() -> list[str]:
    return [field.key for field in EPIGRAPH_SEARCH_FIELDS]


def validate_epigraph_search_field_keys(field_keys: list[str]) -> list[str]:
    return [field_key for field_key in field_keys if field_key in EPIGRAPH_SEARCH_FIELD_MAP]


def validate_epigraph_search_scope_keys(scope_keys: list[str]) -> list[str]:
    return [scope_key for scope_key in scope_keys if scope_key in EPIGRAPH_SEARCH_SCOPE_MAP]


def expand_epigraph_search_scope_keys(scope_keys: list[str]) -> list[str]:
    resolved_field_keys: list[str] = []
    seen_field_keys: set[str] = set()

    for scope_key in validate_epigraph_search_scope_keys(scope_keys):
        for field_key in EPIGRAPH_SEARCH_SCOPE_MAP[scope_key].field_keys:
            if field_key in seen_field_keys:
                continue

            seen_field_keys.add(field_key)
            resolved_field_keys.append(field_key)

    return resolved_field_keys


def get_epigraph_legacy_object_query_field_keys() -> list[str]:
    return list(EPIGRAPH_LEGACY_OBJECT_QUERY_FIELD_KEYS)


def get_epigraph_default_sort(has_search_text: bool) -> dict[str, str]:
    sort_option = EPIGRAPH_SEARCH_SORT_MAP["_score" if has_search_text else "dasi_id"]
    return {
        "sortField": sort_option.key,
        "sortOrder": sort_option.default_order,
    }


def get_epigraph_search_schema() -> dict[str, Any]:
    return {
        "fields": [
            {
                "key": field.key,
                "label": field.label,
                "description": field.description,
                "category": field.category,
                "source": field.source,
                "subfields": list(field.subfields) if field.subfields is not None else [],
            }
            for field in EPIGRAPH_SEARCH_FIELDS
        ],
        "scopes": [
            {
                "key": scope.key,
                "label": scope.label,
                "description": scope.description,
                "fieldKeys": list(scope.field_keys),
            }
            for scope in EPIGRAPH_SEARCH_SCOPES
        ],
        "sortOptions": [
            {
                "key": sort_option.key,
                "label": sort_option.label,
                "defaultOrder": sort_option.default_order,
                "searchOnly": sort_option.search_only,
            }
            for sort_option in EPIGRAPH_SEARCH_SORT_OPTIONS
        ],
        "defaults": {
            "browse": get_epigraph_default_sort(False),
            "search": get_epigraph_default_sort(True),
            "scopeKeys": [scope.key for scope in EPIGRAPH_SEARCH_SCOPES],
        },
        "operators": [
            {
                "key": operator.key,
                "token": operator.token,
                "label": operator.label,
                "description": operator.description,
            }
            for operator in EPIGRAPH_SEARCH_OPERATORS
        ],
    }