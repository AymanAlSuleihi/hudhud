from typing import Annotated, Literal

from fastapi import Path, Query


PageOffset = Annotated[
    int,
    Query(ge=0, description="Number of records to skip before returning results"),
]
PageLimit = Annotated[
    int,
    Query(ge=1, le=500, description="Maximum number of records to return"),
]
BatchListLimit = Annotated[
    int,
    Query(ge=1, le=100, description="Maximum number of batch jobs to return"),
]
SortFieldParam = Annotated[
    str | None,
    Query(min_length=1, description="Field name to use for sorting"),
]
SortOrderParam = Annotated[
    Literal["asc", "desc"] | None,
    Query(description="Sort direction"),
]
JsonFiltersParam = Annotated[
    str | None,
    Query(description="JSON-encoded filters"),
]
SearchTextParam = Annotated[
    str,
    Query(min_length=1, description="Search text to execute against the corpus"),
]
TranslationTextParam = Annotated[
    str,
    Query(min_length=1, description="Translation text to search for"),
]
ObjectFieldsParam = Annotated[
    str | None,
    Query(description="Comma-separated object fields to search"),
]
ResourceIdPath = Annotated[
    int,
    Path(ge=1, description="Internal resource identifier"),
]
DasiIdPath = Annotated[
    int,
    Path(ge=1, description="DASI identifier"),
]
UuidPath = Annotated[
    str,
    Path(min_length=1, description="Pipeline run UUID"),
]
BatchIdPath = Annotated[
    str,
    Path(min_length=1, description="OpenAI batch identifier"),
]
ChunkTypePath = Annotated[
    str,
    Path(min_length=1, description="Chunk type"),
]
EmailPath = Annotated[
    str,
    Path(min_length=3, description="User email address"),
]
JsonKeyPath = Annotated[
    str,
    Path(min_length=1, description="JSON object key"),
]