import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple, cast

import openai
from pydantic import BaseModel
from sqlalchemy import String, cast as sa_cast, text
from sqlalchemy.orm import selectinload
from sqlmodel import Session, asc, desc, func, or_, select

from app.core.config import settings
from app.models.epigraph import Epigraph, EpigraphsOut
from app.models.epigraph_chunk import EpigraphChunk
from app.models.links import EpigraphObjectLink
from app.models.object import Object
from app.services.enrichment.embeddings import EmbeddingsService
from app.services.search.epigraph_fields import (
    BOOLEAN_FACET_FIELD_KEYS,
    EPIGRAPH_FACET_FIELDS,
    get_epigraph_facet_values,
    sort_epigraph_facet_buckets,
)
from app.services.search.epigraph_search_schema import (
    get_epigraph_legacy_object_query_field_keys,
    get_epigraph_search_field_keys,
    validate_epigraph_search_field_keys,
)
from app.services.search.ai import AIService
from app.services.search.opensearch import OpenSearchService


logging.basicConfig(
    filename="epigraph_search.log",
    level=logging.DEBUG,
    format="%(asctime)s - %(message)s",
    datefmt="%d-%b-%y %H:%M:%S",
)


class QueryFormat(BaseModel):
    search_text: str
    fields: Optional[str] = None
    object_fields: Optional[str] = None
    include_objects: bool = True
    filters: Optional[Dict[str, Any]] = None
    sort_field: Optional[str] = None
    sort_order: Optional[str] = None


class MainQuery(BaseModel):
    primary_query: QueryFormat
    alternative_queries: List[QueryFormat] = []


class SearchService:
    """Service for handling search operations including semantic search, full-text search, and query transformation."""

    def __init__(self, session: Session):
        self.session = session
        if hasattr(settings, "OPENAI_API_KEY"):
            self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        else:
            self.client = None
            logging.warning("OpenAI API key not configured. AI features will be disabled.")

        try:
            self.opensearch = OpenSearchService()
        except Exception as exc:
            logging.warning(f"OpenSearch not available: {exc}. Falling back to PostgreSQL search.")
            self.opensearch = None

    def get_filter_options(self) -> Dict[str, List[str]]:
        """Get filter options for epigraphs."""
        return get_epigraph_facet_values(self.session)

    def transform_query(self, user_query: str) -> Dict[str, Any]:
        """Transform a natural language query into search parameters using AI."""
        if not self.client:
            logging.warning("OpenAI client not initialised. Using default search parameters.")
            return {"search_text": user_query}

        filter_options = self.get_filter_options()

        system_prompt = """
        You are a helpful assistant that transforms natural language queries about Ancient South Arabia 
        into structured search parameters. Extract only the key search terms or keywords from the user's query.
        Do not include any fields, filters, or sorting options.

        The results will be used to search epigraphs in the Hudhud database.
        Containing 8917 epigraphs from 800 BCE-600 CE from Ancient South Arabia.

        Don't include common terms like "epigraph", "inscription", "ancient", "south arabia", "history", etc.

        Don't include too many words in one query as the search engine uses AND logic for matching.
        Limit the number of words per query to around 5 key terms.

        Return a JSON object with these parameters:
        {
            "primary_query": {
                "search_text": "main search terms or keywords"
            },
            "alternative_queries": [
                {
                    "search_text": "alternative search terms or keywords"
                }
            ]
        }

        For the alternative queries:
        1. Use different terms or phrases that represent key concepts from the query
        2. Include broader or more specific terms
        """

        try:
            response = self.client.responses.parse(
                model="gpt-4.1",
                input=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Transform this query into search parameters: '{user_query}'"},
                ],
                text_format=MainQuery,
            )

            logging.info(f"Response: {response}")
            usage = response.usage
            if usage is not None:
                logging.info(f"Token usage: {usage.input_tokens} input, {usage.output_tokens} output")

            search_params = response.output_parsed
            if search_params is None:
                return {"primary_query": {"search_text": user_query}, "alternative_queries": []}

            primary_query = search_params.primary_query.model_dump()
            self._validate_query_fields(primary_query, filter_options)

            alternative_queries = []
            for alt_query_model in search_params.alternative_queries:
                alt_query = alt_query_model.model_dump()
                self._validate_query_fields(alt_query, filter_options)
                alternative_queries.append(alt_query)

            return {
                "primary_query": primary_query,
                "alternative_queries": alternative_queries,
            }
        except Exception as exc:
            logging.error(f"Error transforming query with AI: {exc}")
            return {"primary_query": {"search_text": user_query}, "alternative_queries": []}

    def _validate_query_fields(self, query_params: Dict[str, Any], filter_options: Dict[str, List[str]]):
        """Helper method to validate query fields and filters."""
        if "fields" in query_params:
            fields_list = query_params["fields"].split(",") if query_params["fields"] else []
            valid_fields_list = validate_epigraph_search_field_keys([field.strip() for field in fields_list if field.strip()])
            query_params["fields"] = ",".join(valid_fields_list) if valid_fields_list else None

        if "object_fields" in query_params:
            object_fields_list = query_params["object_fields"].split(",") if query_params["object_fields"] else []
            valid_object_fields = set(get_epigraph_legacy_object_query_field_keys())
            valid_object_fields_list = [
                field.strip()
                for field in object_fields_list
                if field.strip() in valid_object_fields
            ]
            query_params["object_fields"] = ",".join(valid_object_fields_list) if valid_object_fields_list else None

        if "filters" in query_params and query_params["filters"]:
            validated_filters = {}
            for field, value in query_params["filters"].items():
                if field in filter_options and value in filter_options[field]:
                    validated_filters[field] = value
                else:
                    logging.warning(f"Dropping invalid filter {field}:{value}")

            if validated_filters:
                query_params["filters"] = validated_filters
            else:
                query_params["filters"] = {}

        return query_params

    def full_text_search(
        self,
        search_text: str,
        fields: Optional[str] = None,
        sort_field: Optional[str] = None,
        sort_order: Optional[str] = None,
        filters: Optional[str | Dict[str, Any]] = None,
        skip: int = 0,
        limit: int = 100,
        include_objects: bool = False,
        object_fields: Optional[str] = None,
    ) -> Tuple[List[Epigraph], int]:
        """
        Full text search epigraphs by searching within specified fields.
        If include_objects is True, will also search in related objects using object_fields.
        """
        logging.info(
            f"Full text searching: {search_text}, fields: {fields}, include_objects: {include_objects}, object_fields: {object_fields}, sort_field: {sort_field}, sort_order: {sort_order}"
        )

        cleaned_text = re.sub(r'[!@#$%^&*()+=\[\]{};:"\\|,._<>/?]', " ", search_text)
        processed_search_text = " ".join(cleaned_text.split())

        base_query: Any = select(Epigraph)
        epigraph_published_column = cast(Any, Epigraph.dasi_published)

        base_query = base_query.where(epigraph_published_column.is_not(False))

        if include_objects:
            epigraph_id_column = cast(Any, Epigraph.id)
            link_epigraph_id_column = cast(Any, EpigraphObjectLink.epigraph_id)
            link_object_id_column = cast(Any, EpigraphObjectLink.object_id)
            object_id_column = cast(Any, Object.id)
            object_published_column = cast(Any, Object.dasi_published)

            base_query = base_query.outerjoin(EpigraphObjectLink, epigraph_id_column == link_epigraph_id_column)
            base_query = base_query.outerjoin(Object, link_object_id_column == object_id_column)
            base_query = base_query.where(or_(object_id_column.is_(None), object_published_column.is_not(False)))
            base_query = base_query.distinct()

        search_conditions = []

        if fields:
            field_names = fields.split(",")
            field_vectors = []
            epigraph_table = getattr(Epigraph, "__table__")

            for field in field_names:
                if field not in epigraph_table.columns:
                    logging.warning(f"Invalid epigraph field: {field}")
                    continue

                column_type = str(epigraph_table.columns[field].type)

                if "JSONB" in column_type:
                    field_vectors.append(
                        text(f"""
                            CASE 
                                WHEN {Epigraph.__tablename__}.{field} IS NULL THEN ''
                                WHEN jsonb_typeof({Epigraph.__tablename__}.{field}) = 'array' THEN
                                    COALESCE((
                                        SELECT string_agg(CASE 
                                            WHEN jsonb_typeof(value) = 'object' AND value ? 'text'
                                            THEN value #>> '{{text}}'
                                            ELSE value #>> '{{}}'
                                        END, ' ')
                                        FROM jsonb_array_elements({Epigraph.__tablename__}.{field})
                                    ), '')
                                ELSE {Epigraph.__tablename__}.{field}::text
                            END
                        """)
                    )
                else:
                    field_vectors.append(text(f"COALESCE({Epigraph.__tablename__}.{field}::text, '')"))

            if field_vectors:
                combined_vector = " || ' ' || ".join(str(v) for v in field_vectors)
                search_conditions.append(
                    text(f"to_tsvector({combined_vector}) @@ plainto_tsquery(:search_text)")
                )

        if include_objects and object_fields:
            object_fields_list = object_fields.split(",")
            object_field_vectors = []
            object_table = getattr(Object, "__table__")

            for field in object_fields_list:
                if field not in object_table.columns:
                    logging.warning(f"Invalid object field: {field}")
                    continue

                column_type = str(object_table.columns[field].type)

                if "JSONB" in column_type:
                    object_field_vectors.append(
                        text(f"""
                            CASE 
                                WHEN {Object.__tablename__}.{field} IS NULL THEN ''
                                WHEN jsonb_typeof({Object.__tablename__}.{field}) = 'array' THEN
                                    COALESCE((
                                        SELECT string_agg(CASE 
                                            WHEN jsonb_typeof(value) = 'object' AND value ? 'text'
                                            THEN value #>> '{{text}}'
                                            ELSE value #>> '{{}}'
                                        END, ' ')
                                        FROM jsonb_array_elements({Object.__tablename__}.{field})
                                    ), '')
                                ELSE {Object.__tablename__}.{field}::text
                            END
                        """)
                    )
                else:
                    object_field_vectors.append(text(f"COALESCE({Object.__tablename__}.{field}::text, '')"))

            if object_field_vectors:
                combined_object_vector = " || ' ' || ".join(str(v) for v in object_field_vectors)
                search_conditions.append(
                    text(f"to_tsvector({combined_object_vector}) @@ plainto_tsquery(:search_text)")
                )

        if search_conditions:
            base_query = base_query.where(or_(*search_conditions))
            base_query = base_query.params(search_text=processed_search_text)

        if filters:
            filters_dict = json.loads(filters) if isinstance(filters, str) else filters
            for key, value in filters_dict.items():
                if isinstance(value, bool):
                    base_query = base_query.where(
                        getattr(Epigraph, key).is_(value)
                    )
                elif isinstance(value, list):
                    base_query = base_query.where(
                        getattr(Epigraph, key).in_(value)
                    )
                else:
                    base_query = base_query.where(
                        getattr(Epigraph, key) == value
                    )

        epigraph_count = int(self.session.exec(select(func.count()).select_from(base_query.subquery())).one())
        logging.info(f"Found {epigraph_count} epigraphs")

        if sort_field:
            if sort_order and sort_order.lower() == "desc":
                base_query = base_query.order_by(desc(getattr(Epigraph, sort_field)))
            else:
                base_query = base_query.order_by(asc(getattr(Epigraph, sort_field)))

        base_query = base_query.offset(skip).limit(limit)

        epigraphs = list(self.session.exec(base_query).all())

        return epigraphs, epigraph_count

    def smart_search(self, user_query: str) -> Dict[str, Any]:
        """Process a natural language query and return comprehensive search results with AI answer."""
        chunk_results = self.semantic_search_chunks(
            text=user_query,
            distance_threshold=1,
            limit=50
        )

        if not chunk_results:
            logging.warning(f"No chunks found for query: {user_query}")
            return {
                "answer": "I couldn't find any information related to your query in our database. Please try rephrasing your question or using different search terms.",
                "epigraphs": [],
            }

        ai_service = AIService(self.session)
        answer, epigraph_ids = ai_service.generate_answer_with_chunks(
            user_query, 
            chunk_results,
            chunk_limit=15
        )

        if epigraph_ids:
            epigraph_id_column = cast(Any, Epigraph.id)
            epigraphs_query = select(Epigraph).where(epigraph_id_column.in_(epigraph_ids))
            epigraphs_used = list(self.session.exec(epigraphs_query).all())
            logging.info(f"Returning {len(epigraphs_used)} epigraphs used in answer generation")
        else:
            epigraphs_used = []

        logging.info(f"Smart search completed: found {len(chunk_results)} relevant chunks from {len(epigraphs_used)} epigraphs")

        return {
            "answer": answer,
            "epigraphs": epigraphs_used,
        }

    def _execute_search(self, search_params: Dict[str, Any]) -> Tuple[List[Epigraph], int]:
        """Execute a search with the given parameters."""
        search_text = search_params.get("search_text", "")
        fields = ",".join(get_epigraph_search_field_keys())
        sort_field = search_params.get("sort_field")
        sort_order = search_params.get("sort_order")
        filters = search_params.get("filters")

        return self.opensearch_full_text_search(
            search_text=search_text,
            fields=fields,
            sort_field=sort_field,
            sort_order=sort_order,
            filters=filters
        )

    def semantic_search(
        self,
        text: str,
        distance_threshold: float = 0.5,
        limit: int = 25,
        filters: Optional[Dict[str, Any]] = None
    ) -> EpigraphsOut:
        """Perform semantic search using embeddings."""
        embeddings_service = EmbeddingsService(self.session)
        embedding = embeddings_service.generate_embedding(text)

        if embedding is None:
            logging.error("Failed to generate embedding for semantic search.")
            return EpigraphsOut(epigraphs=[], count=0)

        result = embeddings_service.get_nearest_embeddings(
            embedding=embedding,
            distance_threshold=distance_threshold,
            limit=limit,
            filters=filters
        )
        epigraphs = result.get("epigraphs", [])
        total_count = result.get("total_count", 0)
        logging.info(f"Semantic search found {len(epigraphs)} epigraphs out of {total_count} total.")

        return EpigraphsOut(epigraphs=epigraphs, count=total_count)

    def semantic_search_chunks(
        self,
        text: str,
        distance_threshold: float = 0.5,
        limit: int = 50,
        chunk_types: Optional[List[str]] = None,
        periods: Optional[List[str]] = None,
        languages: Optional[List[str]] = None
    ) -> List[Tuple[EpigraphChunk, Epigraph, float]]:
        """
        Perform semantic search using chunk embeddings for better RAG results.
        """
        embeddings_service = EmbeddingsService(self.session)
        query_embedding = embeddings_service.generate_embedding(text)

        if query_embedding is None:
            logging.error("Failed to generate embedding for chunk-based semantic search.")
            return []

        chunk_embedding_column = cast(Any, EpigraphChunk.embedding)
        chunk_epigraph_id_column = cast(Any, EpigraphChunk.epigraph_id)
        epigraph_id_column = cast(Any, Epigraph.id)
        epigraph_published_column = cast(Any, Epigraph.dasi_published)
        chunk_type_column = cast(Any, EpigraphChunk.chunk_type)

        query: Any = select(
            EpigraphChunk,
            chunk_embedding_column.cosine_distance(query_embedding).label('distance')
        ).join(
            Epigraph, chunk_epigraph_id_column == epigraph_id_column
        ).where(
            chunk_embedding_column.is_not(None),
            epigraph_published_column.is_not(False),
            epigraph_published_column.is_not(None),
        )

        if chunk_types:
            query = query.where(chunk_type_column.in_(chunk_types))

        if periods or languages:
            if periods:
                query = query.where(
                    sa_cast(EpigraphChunk.chunk_metadata['period'], String).in_(periods)
                )

            if languages:
                query = query.where(
                    sa_cast(EpigraphChunk.chunk_metadata['language'], String).in_(languages)
                )

        query = query.where(
            chunk_embedding_column.cosine_distance(query_embedding) < distance_threshold
        )

        query = query.order_by('distance').limit(limit)

        results = list(self.session.exec(query).all())

        chunk_results = []
        for chunk, distance in results:
            epigraph = self.session.get(Epigraph, chunk.epigraph_id)
            if epigraph:
                similarity_score = 1.0 - distance
                chunk_results.append((chunk, epigraph, similarity_score))

        logging.info(f"Chunk-based semantic search found {len(chunk_results)} relevant chunks from query: '{text}'")
        return chunk_results

    def opensearch_full_text_search(
        self,
        search_text: str,
        fields: Optional[str] = None,
        sort_field: Optional[str] = None,
        sort_order: Optional[str] = None,
        filters: Optional[str | Dict[str, Any]] = None,
        skip: int = 0,
        limit: int = 100,
        include_objects: bool = False,
        object_fields: Optional[str] = None,
    ) -> Tuple[List[Epigraph], int]:
        """
        Perform full text search using OpenSearch. Fallback to PostgreSQL.
        """
        if not self.opensearch:
            logging.info("OpenSearch not available, using PostgreSQL full text search")
            result = self.full_text_search(
                search_text=search_text,
                fields=fields,
                sort_field=sort_field,
                sort_order=sort_order,
                filters=filters,
                skip=skip,
                limit=limit,
                include_objects=include_objects,
                object_fields=object_fields
            )
            if isinstance(result, tuple) and len(result) == 2:
                return result
            else:
                return [], 0

        try:
            logging.info(
                "OpenSearch full text searching: %s, fields: %s, sort_field: %s, sort_order: %s",
                search_text,
                fields,
                sort_field,
                sort_order,
            )

            search_fields: Optional[List[str]] = None
            if fields:
                search_fields = [field.strip() for field in fields.split(",")]

            search_filters: Dict[str, Any] = {}
            if filters:
                filters_dict = json.loads(filters) if isinstance(filters, str) else filters
                search_filters.update(filters_dict)

            opensearch_results = self.opensearch.search_epigraphs(
                query=search_text,
                fields=search_fields,
                filters=search_filters,
                sort_field=sort_field,
                sort_order=sort_order or "asc",
                skip=skip,
                limit=limit,
            )

            epigraph_ids = [int(hit["_source"]["id"]) for hit in opensearch_results["hits"]]
            total_count = opensearch_results["total"]

            if not epigraph_ids:
                return [], 0

            epigraph_id_column = cast(Any, Epigraph.id)
            query = select(Epigraph).where(epigraph_id_column.in_(epigraph_ids))

            epigraphs_dict = {epigraph.id: epigraph for epigraph in list(self.session.exec(query).all())}
            ordered_epigraphs = [
                epigraphs_dict[eid]
                for eid in epigraph_ids
                if eid in epigraphs_dict
            ]

            logging.info(
                f"OpenSearch found {total_count} epigraphs, returned {len(ordered_epigraphs)}"
            )
            return ordered_epigraphs, int(total_count)

        except Exception as e:
            logging.error(f"OpenSearch error, falling back to PostgreSQL: {e}")
            result = self.full_text_search(
                search_text=search_text,
                fields=fields,
                sort_field=sort_field,
                sort_order=sort_order,
                filters=filters,
                skip=skip,
                limit=limit,
                include_objects=include_objects,
                object_fields=object_fields,
            )
            if isinstance(result, tuple) and len(result) == 2:
                return result
            else:
                return [], 0

    def _normalise_opensearch_facet_counts(
        self,
        aggregations: Dict[str, Any],
    ) -> Dict[str, List[Dict[str, Any]]]:
        facet_counts: Dict[str, List[Dict[str, Any]]] = {}

        for field in EPIGRAPH_FACET_FIELDS:
            buckets = aggregations.get(field.key, {}).get("values", {}).get("buckets", [])
            facet_counts[field.key] = sort_epigraph_facet_buckets(
                field.key,
                [
                    {
                        "value": self._normalise_facet_bucket_value(field.key, bucket["key"]),
                        "count": bucket["doc_count"],
                    }
                    for bucket in buckets
                    if bucket.get("key") is not None and bucket.get("key") != ""
                ],
            )

        return facet_counts

    def _normalise_facet_bucket_value(self, field_key: str, value: Any) -> Any:
        if field_key in BOOLEAN_FACET_FIELD_KEYS:
            if isinstance(value, bool):
                return value
            if value in (1, "1", "true", "True"):
                return True
            if value in (0, "0", "false", "False"):
                return False

        return value

    def opensearch_query_epigraphs(
        self,
        search_text: str,
        fields: Optional[str] = None,
        sort_field: Optional[str] = None,
        sort_order: Optional[str] = None,
        filters: Optional[str | Dict[str, Any]] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Dict[str, Any]:
        if not self.opensearch:
            raise RuntimeError("OpenSearch is required for the canonical epigraph query endpoint")

        search_fields: Optional[List[str]] = None
        if fields:
            search_fields = [field.strip() for field in fields.split(",")]

        search_filters: Dict[str, Any] = {}
        if filters:
            filters_dict = json.loads(filters) if isinstance(filters, str) else filters
            search_filters.update(filters_dict)

        search_filters.pop("dasi_published", None)

        opensearch_results = self.opensearch.search_epigraphs(
            query=search_text,
            fields=search_fields,
            filters=search_filters,
            facet_fields=[field.key for field in EPIGRAPH_FACET_FIELDS],
            sort_field=sort_field,
            sort_order=sort_order or "asc",
            skip=skip,
            limit=limit,
        )

        epigraph_ids = [int(hit["_source"]["id"]) for hit in opensearch_results["hits"]]
        total_count = int(opensearch_results["total"])

        ordered_epigraphs: List[Epigraph] = []
        if epigraph_ids:
            epigraph_id_column = cast(Any, Epigraph.id)
            query = select(Epigraph).where(epigraph_id_column.in_(epigraph_ids))

            epigraphs_dict = {epigraph.id: epigraph for epigraph in list(self.session.exec(query).all())}
            ordered_epigraphs = [
                epigraphs_dict[eid]
                for eid in epigraph_ids
                if eid in epigraphs_dict
            ]

        return {
            "epigraphs": ordered_epigraphs,
            "count": total_count,
            "facet_counts": self._normalise_opensearch_facet_counts(
                opensearch_results.get("aggregations", {})
            ),
        }

    def opensearch_locate_epigraph_result(
        self,
        dasi_id: int,
        page_size: int,
        search_text: str,
        fields: Optional[str] = None,
        sort_field: Optional[str] = None,
        sort_order: Optional[str] = None,
        filters: Optional[str | Dict[str, Any]] = None,
    ) -> Optional[Dict[str, int]]:
        if not self.opensearch:
            raise RuntimeError("OpenSearch is required for the epigraph result locator endpoint")

        search_fields: Optional[List[str]] = None
        if fields:
            search_fields = [field.strip() for field in fields.split(",")]

        search_filters: Dict[str, Any] = {}
        if filters:
            filters_dict = json.loads(filters) if isinstance(filters, str) else filters
            search_filters.update(filters_dict)

        search_filters.pop("dasi_published", None)

        batch_size = 1000
        skip = 0

        while True:
            opensearch_results = self.opensearch.search_epigraphs(
                query=search_text,
                fields=search_fields,
                filters=search_filters,
                sort_field=sort_field,
                sort_order=sort_order or "asc",
                skip=skip,
                limit=batch_size,
                source_includes=["dasi_id"],
                include_highlight=False,
            )

            hits = opensearch_results["hits"]
            if not hits:
                return None

            for index, hit in enumerate(hits):
                source = hit.get("_source", {})
                if not isinstance(source, dict):
                    continue

                hit_dasi_id = source.get("dasi_id")
                if hit_dasi_id is None:
                    continue

                try:
                    if int(hit_dasi_id) != dasi_id:
                        continue
                except (TypeError, ValueError):
                    continue

                absolute_index = skip + index
                return {
                    "page": absolute_index // page_size + 1,
                    "index": absolute_index,
                }

            skip += len(hits)
            if skip >= int(opensearch_results["total"]):
                return None

    @staticmethod
    def _normalise_epigraph_marker_coordinates(site: Dict[str, Any]) -> Optional[Tuple[float, float]]:
        coordinates = site.get("coordinates")
        latitude: Any = None
        longitude: Any = None

        if isinstance(coordinates, dict):
            latitude = coordinates.get("lat")
            longitude = coordinates.get("lon")
            if latitude is None:
                latitude = coordinates.get("latitude")
            if longitude is None:
                longitude = coordinates.get("longitude")
        elif isinstance(coordinates, (list, tuple)) and len(coordinates) == 2:
            latitude = coordinates[0]
            longitude = coordinates[1]

        if latitude is None:
            latitude = site.get("latitude")
        if longitude is None:
            longitude = site.get("longitude")

        try:
            return float(latitude), float(longitude)
        except (TypeError, ValueError):
            return None

    def _build_epigraph_marker_from_hit(self, source: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        sites = source.get("sites")
        if not isinstance(sites, list):
            return None

        for site in sites:
            if not isinstance(site, dict):
                continue

            coordinates = self._normalise_epigraph_marker_coordinates(site)
            if coordinates is None:
                continue

            title = str(source.get("title") or f"Epigraph {source.get('dasi_id')}")
            site_name = site.get("modern_name") or site.get("name")

            return {
                "id": int(source["id"]),
                "dasi_id": int(source["dasi_id"]),
                "title": title,
                "label": f"{title} - {site_name}" if site_name else title,
                "coordinates": coordinates,
                "site_name": site_name,
            }

        return None

    def opensearch_query_epigraph_markers(
        self,
        search_text: str,
        fields: Optional[str] = None,
        filters: Optional[str | Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not self.opensearch:
            raise RuntimeError("OpenSearch is required for the epigraph marker query endpoint")

        search_fields: Optional[List[str]] = None
        if fields:
            search_fields = [field.strip() for field in fields.split(",")]

        search_filters: Dict[str, Any] = {}
        if filters:
            filters_dict = json.loads(filters) if isinstance(filters, str) else filters
            search_filters.update(filters_dict)

        search_filters.pop("dasi_published", None)

        opensearch_results = self.opensearch.search_epigraphs(
            query=search_text,
            fields=search_fields,
            filters=search_filters,
            skip=0,
            limit=10_000,
            source_includes=["id", "dasi_id", "title", "sites"],
        )

        markers: List[Dict[str, Any]] = []
        for hit in opensearch_results["hits"]:
            source = hit.get("_source", {})
            if not isinstance(source, dict):
                continue

            marker = self._build_epigraph_marker_from_hit(source)
            if marker is not None:
                markers.append(marker)

        return {
            "markers": markers,
            "result_count": int(opensearch_results["total"]),
            "mapped_count": len(markers),
        }

    def index_epigraph_to_opensearch(self, epigraph: Epigraph):
        """Index a single epigraph to OpenSearch."""
        if self.opensearch:
            try:
                self.opensearch.index_epigraph(epigraph)
                logging.info(f"Indexed epigraph {epigraph.id} to OpenSearch")
            except Exception as e:
                logging.error(f"Failed to index epigraph {epigraph.id} to OpenSearch: {e}")

    def bulk_index_epigraphs_to_opensearch(self, epigraphs: List[Epigraph]):
        """Bulk index epigraphs to OpenSearch."""
        if self.opensearch:
            try:
                success, failed = self.opensearch.bulk_index_epigraphs(epigraphs)
                logging.info(
                    f"Bulk indexed {success} epigraphs to OpenSearch, {len(failed)} failed"
                )
                return success, failed
            except Exception as e:
                logging.error(f"Failed to bulk index epigraphs to OpenSearch: {e}")
                return 0, []

    def reindex_all_epigraphs(self):
        """Reindex all published epigraphs to OpenSearch."""
        if not self.opensearch:
            logging.warning("OpenSearch not available for reindexing")
            return

        try:
            self.opensearch.create_index(recreate=True)

            epigraph_published_column = cast(Any, Epigraph.dasi_published)
            query = (
                select(Epigraph)
                .where(epigraph_published_column.is_not(False))
                .options(
                    selectinload(Epigraph.sites_objs),
                    selectinload(Epigraph.objects),
                )
            )
            epigraphs = list(self.session.exec(query).all())

            batch_size = 100
            total_indexed = 0

            for i in range(0, len(epigraphs), batch_size):
                batch = epigraphs[i:i + batch_size]
                success, failed = self.bulk_index_epigraphs_to_opensearch(batch)
                if failed:
                    logging.warning(f"Failed to index the following epigraph IDs: {[e.id for e in failed]}")
                total_indexed += success

            logging.info(f"Reindexed {total_indexed} epigraphs to OpenSearch")
            return total_indexed

        except Exception as e:
            logging.error(f"Failed to reindex epigraphs: {e}")
            raise

    def get_opensearch_stats(self) -> Dict[str, Any]:
        """Get OpenSearch index statistics."""
        if self.opensearch:
            try:
                return self.opensearch.get_index_stats()
            except Exception as e:
                logging.error(f"Failed to get OpenSearch stats: {e}")
                return {}
        return {"error": "OpenSearch not available"}
