import logging
import re
from typing import Dict, List, Optional, Any

from opensearchpy import OpenSearch
from opensearchpy.exceptions import NotFoundError, RequestError
from sqlmodel import Session

from app.core.config import settings
from app.models.epigraph import Epigraph

logger = logging.getLogger(__name__)


class QueryParser:
    """Parse search queries with boolean operators."""

    def __init__(self):
        self.must_terms = []
        self.should_terms = []
        self.must_not_terms = []

    def parse_query(self, query: str) -> Dict[str, List[str]]:
        self.must_terms = []
        self.should_terms = []
        self.must_not_terms = []

        quoted_pattern = r'"([^"]*)"'
        quoted_matches = re.findall(quoted_pattern, query)
        for match in quoted_matches:
            if match.strip():
                self.must_terms.append(f'"{match}"')

        query_without_quotes = re.sub(quoted_pattern, "", query)

        tokens = query_without_quotes.split()

        for token in tokens:
            if not token.strip():
                continue

            if token.startswith("+"):
                term = token[1:].strip()
                if term:
                    self.must_terms.append(term)
            elif token.startswith("-"):
                term = token[1:].strip()
                if term:
                    self.must_not_terms.append(term)
            else:
                self.should_terms.append(token.strip())

        return {
            "must": self.must_terms,
            "should": self.should_terms,
            "must_not": self.must_not_terms
        }


class OpenSearchService:
    def __init__(self):
        """Initialize OpenSearch client."""
        self.client = OpenSearch(
            hosts=[{"host": "opensearch", "port": 9200}],
            http_auth=(
                settings.OPENSEARCH_USERNAME,
                settings.OPENSEARCH_PASSWORD,
            ),
            use_ssl=False,
            verify_certs=False,
            ssl_show_warn=False,
        )
        self.index_name = "epigraphs"

        try:
            info = self.client.info()
            logger.info(f"Connected to OpenSearch: {info['version']['number']}")
        except Exception as e:
            logger.error(f"Failed to connect to OpenSearch: {e}")
            raise

    def create_index(self):
        """Create the epigraphs index with mapping."""
        mapping = {
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 0,
                "analysis": {
                    "analyzer": {
                        "custom_text_analyzer": {
                            "type": "custom",
                            "tokenizer": "standard",
                            "filter": ["lowercase", "stop", "kstem"]
                        },
                        "edge_ngram_analyzer": {
                            "type": "custom",
                            "tokenizer": "edge_ngram_tokenizer",
                            "filter": ["lowercase"]
                        }
                    },
                    "tokenizer": {
                        "edge_ngram_tokenizer": {
                            "type": "edge_ngram",
                            "min_gram": 2,
                            "max_gram": 10,
                            "token_chars": ["letter", "digit"]
                        }
                    }
                },
            },
            "mappings": {
                "properties": {
                    "id": {"type": "integer"},
                    "created_at": {"type": "date", "format": "strict_date_optional_time||epoch_millis"},
                    "updated_at": {"type": "date", "format": "strict_date_optional_time||epoch_millis"},
                    "dasi_id": {"type": "integer"},
                    "title": {
                        "type": "text",
                        "analyzer": "edge_ngram_analyzer",
                        "search_analyzer": "custom_text_analyzer",
                        "fields": {
                            "keyword": {"type": "keyword"}
                        }
                    },
                    "uri": {"type": "keyword"},
                    "epigraph_text": {
                        "type": "text",
                        "analyzer": "edge_ngram_analyzer",
                        "search_analyzer": "custom_text_analyzer",
                        "fields": {
                            "keyword": {"type": "keyword"},
                            "raw": {
                                "type": "text",
                                "analyzer": "standard"
                            }
                        }
                    },
                    "translations": {
                        "type": "nested",
                        "dynamic": "true",
                        "properties": {
                            "text": {
                                "type": "text",
                                "analyzer": "custom_text_analyzer"
                            },
                            "language": {"type": "keyword"},
                            "label": {"type": "keyword"},
                            "notes": {
                                "type": "nested",
                                "properties": {
                                    "line": {"type": "keyword"},
                                    "note": {
                                        "type": "text",
                                        "analyzer": "custom_text_analyzer"
                                    }
                                }
                            },
                            "bibliography": {
                                "type": "nested",
                                "properties": {
                                    "page": {"type": "keyword"},
                                    "reference": {
                                        "type": "text",
                                        "analyzer": "custom_text_analyzer"
                                    },
                                    "id": {"type": "keyword"},
                                    "first_authors": {"type": "keyword"},
                                    "quotation_label": {"type": "keyword"},
                                    "reference_short": {
                                        "type": "text",
                                        "analyzer": "custom_text_analyzer"
                                    }
                                }
                            },
                            "editors": {
                                "type": "nested",
                                "properties": {
                                    "date": {
                                        "type": "date",
                                        "format": "yyyy/MM/dd||yyyy-MM-dd||dd/MM/yyyy||dd-MM-yyyy||d/M/yy||dd/MM/yy||d/M/yyyy||dd/MM/yyyy||yyyy/M/d||yyyy/M/dd||yyyy/MM/d||dd/M/yyyy||strict_date_optional_time||epoch_millis"
                                    },
                                    "name": {"type": "keyword"},
                                    "responsibility": {"type": "keyword"}
                                }
                            }
                        }
                    },
                    "period": {"type": "keyword"},
                    "chronology_conjectural": {"type": "boolean"},
                    "mentioned_date": {"type": "text"},
                    "sites": {
                        "type": "nested",
                        "properties": {
                            "name": {"type": "keyword"},
                            "id": {"type": "integer"},
                            "uri": {"type": "keyword"},
                            "coordinates": {"type": "geo_point"},
                            "latitude": {"type": "float"},
                            "longitude": {"type": "float"},
                            "region": {"type": "keyword"},
                            "country": {"type": "keyword"}
                        }
                    },
                    "language_level_1": {"type": "keyword"},
                    "language_level_2": {"type": "keyword"},
                    "language_level_3": {"type": "keyword"},
                    "alphabet": {"type": "keyword"},
                    "script_typology": {"type": "keyword"},
                    "script_cursus": {"type": "keyword"},
                    "textual_typology": {"type": "keyword"},
                    "textual_typology_conjectural": {"type": "boolean"},
                    "letter_measure": {"type": "text"},
                    "writing_techniques": {"type": "keyword"},
                    "royal_inscription": {"type": "boolean"},
                    "cultural_notes": {
                        "type": "nested",
                        "dynamic": "true",
                        "properties": {
                            "note": {
                                "type": "text",
                                "analyzer": "custom_text_analyzer"
                            },
                            "topic": {"type": "keyword"}
                        }
                    },
                    "apparatus_notes": {
                        "type": "nested",
                        "properties": {
                            "line": {"type": "keyword"},
                            "note": {
                                "type": "text",
                                "analyzer": "custom_text_analyzer"
                            }
                        }
                    },
                    "general_notes": {
                        "type": "text",
                        "analyzer": "custom_text_analyzer"
                    },
                    "bibliography": {
                        "type": "nested",
                        "properties": {
                            "text": {
                                "type": "text",
                                "analyzer": "custom_text_analyzer"
                            },
                            "reference": {
                                "type": "text",
                                "analyzer": "custom_text_analyzer"
                            },
                            "page": {"type": "keyword"},
                            "title": {
                                "type": "text",
                                "analyzer": "custom_text_analyzer"
                            },
                            "author": {"type": "keyword"},
                            "year": {"type": "keyword"},
                            "id": {"type": "keyword"},
                            "first_authors": {"type": "keyword"},
                            "quotation_label": {"type": "keyword"},
                            "reference_short": {
                                "type": "text",
                                "analyzer": "custom_text_analyzer"
                            }
                        }
                    },
                    "concordances": {"type": "keyword"},
                    "license": {"type": "keyword"},
                    "first_published": {"type": "date", "format": "yyyy||yyyy-MM||yyyy-MM-dd"},
                    "editors": {
                        "type": "nested",
                        "properties": {
                            "date": {
                                "type": "date",
                                "format": "yyyy/MM/dd||yyyy-MM-dd||dd/MM/yyyy||dd-MM-yyyy||d/M/yy||dd/MM/yy||d/M/yyyy||dd/MM/yyyy||yyyy/M/d||yyyy/M/dd||yyyy/MM/d||strict_date_optional_time||epoch_millis"
                            },
                            "name": {"type": "keyword"},
                            "role": {"type": "keyword"},
                            "institution": {"type": "keyword"}
                        }
                    },
                    "last_modified": {"type": "date"},
                    "dasi_published": {"type": "boolean"},
                    "images": {
                        "type": "nested",
                        "properties": {
                            "caption": {"type": "text"},
                            "is_main": {"type": "boolean"},
                            "image_id": {"type": "keyword"},
                            "copyright_free": {"type": "boolean"}
                        }
                    },
                    # Object
                    "support_notes": {
                        "type": "text",
                        "analyzer": "custom_text_analyzer"
                    },
                    "deposit_notes": {
                        "type": "text",
                        "analyzer": "custom_text_analyzer"
                    },
                    "object_cultural_notes": {
                        "type": "nested",
                        "dynamic": "true",
                        "properties": {
                            "note": {
                                "type": "text",
                                "analyzer": "custom_text_analyzer"
                            },
                            "topic": {"type": "keyword"}
                        }
                    },
                    "deposits": {
                        "type": "nested",
                        "dynamic": "true",
                        "properties": {
                            "settlement": {
                                "type": "text",
                                "analyzer": "custom_text_analyzer"
                            },
                            "institution": {
                                "type": "text",
                                "analyzer": "custom_text_analyzer"
                            },
                            "privateCollection": {"type": "boolean"},
                            "identificationNumber": {"type": "keyword"},
                            "repository": {
                                "type": "text",
                                "analyzer": "custom_text_analyzer"
                            }
                        }
                    },
                    "decorations": {
                        "type": "nested",
                        "dynamic": "true",
                        "properties": {
                            "typeLevel1": {"type": "text", "analyzer": "custom_text_analyzer"},
                            "type": {"type": "text", "analyzer": "custom_text_analyzer"},
                            "typeLevel2": {"type": "text", "analyzer": "custom_text_analyzer"},
                            "subjectLevel1": {"type": "text", "analyzer": "custom_text_analyzer"},
                            "partOfHumanBody": {"type": "text", "analyzer": "custom_text_analyzer"},
                            "subjectLevel2": {"type": "text", "analyzer": "custom_text_analyzer"},
                            "view": {"type": "text", "analyzer": "custom_text_analyzer"},
                            "humanGender": {"type": "text", "analyzer": "custom_text_analyzer"},
                            "humanClothes": {"type": "text", "analyzer": "custom_text_analyzer"},
                            "humanWeapons": {"type": "text", "analyzer": "custom_text_analyzer"},
                            "humanGestures": {"type": "text", "analyzer": "custom_text_analyzer"},
                            "humanJewellery": {"type": "text", "analyzer": "custom_text_analyzer"},
                            "partOfAnimalBody": {"type": "text", "analyzer": "custom_text_analyzer"},
                            "symbolShape": {"type": "text", "analyzer": "custom_text_analyzer"},
                            "symbolReference": {"type": "text", "analyzer": "custom_text_analyzer"},
                            "symbolReferenceText": {"type": "text", "analyzer": "custom_text_analyzer"},
                            "monogramName": {"type": "text", "analyzer": "custom_text_analyzer"},
                            "animalGestures": {"type": "text", "analyzer": "custom_text_analyzer"}
                        }
                    }
                }
            }
        }

        try:
            if self.client.indices.exists(index=self.index_name):
                logger.info(f"Index '{self.index_name}' already exists")
                return

            response = self.client.indices.create(index=self.index_name, body=mapping)
            logger.info(f"Created index '{self.index_name}': {response}")
        except Exception as e:
            logger.error(f"Error creating index: {e}")
            raise

    def index_epigraph(self, epigraph: Epigraph):
        """Index a single epigraph."""
        try:
            doc = self._epigraph_to_document(epigraph)

            response = self.client.index(
                index=self.index_name,
                id=epigraph.id,
                body=doc,
                refresh=True
            )
            logger.debug(f"Indexed epigraph {epigraph.id}: {response['result']}")
            return response
        except Exception as e:
            logger.error(f"Error indexing epigraph {epigraph.id}: {e}")
            raise

    def bulk_index_epigraphs(self, epigraphs: List[Epigraph]):
        """Bulk index multiple epigraphs."""
        from opensearchpy.helpers import bulk
        
        def generate_docs():
            for epigraph in epigraphs:
                yield {
                    "_index": self.index_name,
                    "_id": epigraph.id,
                    "_source": self._epigraph_to_document(epigraph)
                }

        try:
            success, failed = bulk(self.client, generate_docs(), refresh=True)
            logger.info(f"Bulk indexed {success} epigraphs, {len(failed)} failed")
            return success, failed
        except Exception as e:
            logger.error(f"Error bulk indexing epigraphs: {e}")
            raise

    def search_epigraphs(
        self,
        query: str,
        fields: Optional[List[str]] = None,
        filters: Optional[Dict[str, Any]] = None,
        sort_field: Optional[str] = None,
        sort_order: str = "asc",
        skip: int = 0,
        limit: int = 100
    ) -> Dict[str, Any]:
        """Searches epigraphs in the OpenSearch index"""

        searchable_fields = {
            "title": None,
            "epigraph_text": None,
            "general_notes": None,
            "support_notes": None,
            "deposit_notes": None,
            "decorations": [
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
                "animalGestures"
            ],
            "translations": [
                "text",
                "notes.note",
                "bibliography.reference",
                "bibliography.reference_short",
                "editors.name"
            ],
            "cultural_notes": ["note"],
            "apparatus_notes": ["note"],
            "bibliography": ["text", "reference", "title", "reference_short"],
            "sites": ["name"],
            "editors": ["name"],
            "images": ["caption"],
            "object_cultural_notes": ["note"],
            "deposits": ["settlement", "institution", "repository"]
        }

        if not fields:
            search_fields = []
            for field_name, subfields in searchable_fields.items():
                if subfields is None:
                    search_fields.append(field_name)
                else:
                    search_fields.extend([field_name + "." + subfield for subfield in subfields])
        else:
            search_fields = []
            for f in fields:
                if f in searchable_fields and searchable_fields[f] is not None:
                    search_fields.extend([f + "." + sub for sub in searchable_fields[f]])
                else:
                    search_fields.append(f)

        top_fields = [f for f in search_fields if "." not in f]
        nested_fields = [f for f in search_fields if "." in f]

        ngram_fields = [f for f in top_fields]
        stemmed_fields = [f for f in top_fields]
        keyword_fields = [f + ".keyword" for f in top_fields]

        parser = QueryParser()
        parsed_query = parser.parse_query(query)

        must_queries = []
        should_queries = []
        must_not_queries = []

        for term in parsed_query["must"]:
            has_wildcard = "*" in term or "?" in term
            if has_wildcard:
                wildcard_queries = []
                if top_fields:
                    wildcard_queries.append({
                        "query_string": {
                            "query": term.strip('"'),
                            "fields": top_fields,
                            "default_operator": "OR",
                            "analyze_wildcard": True,
                            "boost": 3
                        }
                    })
                    if keyword_fields:
                        wildcard_queries.append({
                            "query_string": {
                                "query": term.strip('"'),
                                "fields": keyword_fields,
                                "default_operator": "OR",
                                "analyze_wildcard": True,
                                "boost": 5
                            }
                        })
                for nf in nested_fields:
                    path, field = nf.split(".", 1)
                    wildcard_queries.append({
                        "nested": {
                            "path": path,
                            "query": {
                                "query_string": {
                                    "query": term.strip('"'),
                                    "fields": [nf],
                                    "default_operator": "OR",
                                    "analyze_wildcard": True
                                }
                            }
                        }
                    })
                if len(wildcard_queries) == 1:
                    must_queries.append(wildcard_queries[0])
                else:
                    must_queries.append({
                        "bool": {
                            "should": wildcard_queries,
                            "minimum_should_match": 1
                        }
                    })
            else:
                is_phrase = term.startswith('"') and term.endswith('"')
                clean_term = term.strip('"')

                term_should_queries = []
                if top_fields:
                    if is_phrase:
                        term_should_queries.append({
                            "match_phrase": {
                                "epigraph_text.raw": {
                                    "query": clean_term,
                                    "boost": 15
                                }
                            }
                        })

                        term_should_queries.append({
                            "match_phrase": {
                                "epigraph_text": {
                                    "query": clean_term,
                                    "boost": 10
                                }
                            }
                        })

                        for field in stemmed_fields:
                            if field != "epigraph_text":
                                term_should_queries.append({
                                    "match_phrase": {
                                        f"{field}.raw": {
                                            "query": clean_term,
                                            "boost": 12
                                        }
                                    }
                                })
                                term_should_queries.append({
                                    "match_phrase": {
                                        field: {
                                            "query": clean_term,
                                            "boost": 8
                                        }
                                    }
                                })

                        term_should_queries.append({
                            "multi_match": {
                                "query": clean_term,
                                "fields": [f + ".raw" for f in stemmed_fields if f + ".raw"],
                                "type": "phrase",
                                "boost": 6
                            }
                        })

                        term_should_queries.append({
                            "query_string": {
                                "query": f'"{clean_term}"',
                                "fields": [f + ".raw" for f in top_fields],
                                "default_operator": "AND",
                                "boost": 5
                            }
                        })

                        term_should_queries.append({
                            "multi_match": {
                                "query": clean_term,
                                "fields": [f + ".raw" for f in stemmed_fields],
                                "type": "phrase_prefix",
                                "boost": 4
                            }
                        })
                    else:
                        term_should_queries.append({
                            "multi_match": {
                                "query": clean_term,
                                "fields": stemmed_fields,
                                "type": "best_fields",
                                "boost": 3
                            }
                        })
                        term_should_queries.append({
                            "multi_match": {
                                "query": clean_term,
                                "fields": ngram_fields,
                                "type": "best_fields",
                                "boost": 2
                            }
                        })

                    if keyword_fields:
                        if is_phrase:
                            term_should_queries.append({
                                "query_string": {
                                    "query": f'"{clean_term}"',
                                    "fields": keyword_fields,
                                    "default_operator": "AND",
                                    "boost": 6
                                }
                            })
                        else:
                            term_should_queries.append({
                                "multi_match": {
                                    "query": clean_term,
                                    "fields": keyword_fields,
                                    "type": "best_fields",
                                    "boost": 5
                                }
                            })

                for nf in nested_fields:
                    path, field = nf.split(".", 1)
                    if is_phrase:
                        term_should_queries.append({
                            "nested": {
                                "path": path,
                                "query": {
                                    "match_phrase": {
                                        nf: {
                                            "query": clean_term,
                                            "boost": 5
                                        }
                                    }
                                }
                            }
                        })
                        term_should_queries.append({
                            "nested": {
                                "path": path,
                                "query": {
                                    "multi_match": {
                                        "query": clean_term,
                                        "fields": [nf],
                                        "type": "phrase",
                                        "boost": 4
                                    }
                                }
                            }
                        })
                        term_should_queries.append({
                            "nested": {
                                "path": path,
                                "query": {
                                    "query_string": {
                                        "query": f'"{clean_term}"',
                                        "fields": [nf],
                                        "default_operator": "AND",
                                        "boost": 3
                                    }
                                }
                            }
                        })
                    else:
                        term_should_queries.append({
                            "nested": {
                                "path": path,
                                "query": {
                                    "multi_match": {
                                        "query": clean_term,
                                        "fields": [nf],
                                        "type": "best_fields"
                                    }
                                }
                            }
                        })

                if len(term_should_queries) == 1:
                    must_queries.append(term_should_queries[0])
                else:
                    must_queries.append({
                        "bool": {
                            "should": term_should_queries,
                            "minimum_should_match": 1
                        }
                    })

        if parsed_query["should"]:
            should_term_query = " ".join(parsed_query["should"])
            has_wildcard = "*" in should_term_query or "?" in should_term_query
            
            if has_wildcard:
                if top_fields:
                    should_queries.append({
                        "query_string": {
                            "query": should_term_query,
                            "fields": top_fields,
                            "default_operator": "OR",
                            "analyze_wildcard": True,
                            "boost": 3
                        }
                    })
                    if keyword_fields:
                        should_queries.append({
                            "query_string": {
                                "query": should_term_query,
                                "fields": keyword_fields,
                                "default_operator": "OR",
                                "analyze_wildcard": True,
                                "boost": 5
                            }
                        })
                for nf in nested_fields:
                    path, field = nf.split(".", 1)
                    should_queries.append({
                        "nested": {
                            "path": path,
                            "query": {
                                "query_string": {
                                    "query": should_term_query,
                                    "fields": [nf],
                                    "default_operator": "OR",
                                    "analyze_wildcard": True
                                }
                            }
                        }
                    })
            else:
                if top_fields:
                    should_queries.append({
                        "multi_match": {
                            "query": should_term_query,
                            "fields": stemmed_fields,
                            "type": "best_fields",
                            "minimum_should_match": "50%",
                            "boost": 3
                        }
                    })
                    should_queries.append({
                        "multi_match": {
                            "query": should_term_query,
                            "fields": ngram_fields,
                            "type": "best_fields",
                            "minimum_should_match": "50%",
                            "boost": 2
                        }
                    })
                    if keyword_fields:
                        should_queries.append({
                            "multi_match": {
                                "query": should_term_query,
                                "fields": keyword_fields,
                                "type": "best_fields",
                                "boost": 5
                            }
                        })
                for nf in nested_fields:
                    path, field = nf.split(".", 1)
                    should_queries.append({
                        "nested": {
                            "path": path,
                            "query": {
                                "multi_match": {
                                    "query": should_term_query,
                                    "fields": [nf],
                                    "type": "best_fields",
                                    "minimum_should_match": "50%"
                                }
                            }
                        }
                    })

        for term in parsed_query["must_not"]:
            has_wildcard = "*" in term or "?" in term
            term_must_not_queries = []
            
            if has_wildcard:
                if top_fields:
                    term_must_not_queries.append({
                        "query_string": {
                            "query": term.strip('"'),
                            "fields": top_fields,
                            "default_operator": "OR",
                            "analyze_wildcard": True
                        }
                    })
                    if keyword_fields:
                        term_must_not_queries.append({
                            "query_string": {
                                "query": term.strip('"'),
                                "fields": keyword_fields,
                                "default_operator": "OR",
                                "analyze_wildcard": True
                            }
                        })
                for nf in nested_fields:
                    path, field = nf.split(".", 1)
                    term_must_not_queries.append({
                        "nested": {
                            "path": path,
                            "query": {
                                "query_string": {
                                    "query": term.strip('"'),
                                    "fields": [nf],
                                    "default_operator": "OR",
                                    "analyze_wildcard": True
                                }
                            }
                        }
                    })
            else:
                if top_fields:
                    term_must_not_queries.append({
                        "multi_match": {
                            "query": term.strip('"'),
                            "fields": stemmed_fields + ngram_fields,
                            "type": "best_fields"
                        }
                    })
                    if keyword_fields:
                        term_must_not_queries.append({
                            "multi_match": {
                                "query": term.strip('"'),
                                "fields": keyword_fields,
                                "type": "best_fields"
                            }
                        })
                for nf in nested_fields:
                    path, field = nf.split(".", 1)
                    term_must_not_queries.append({
                        "nested": {
                            "path": path,
                            "query": {
                                "multi_match": {
                                    "query": term.strip('"'),
                                    "fields": [nf],
                                    "type": "best_fields"
                                }
                            }
                        }
                    })
            
            must_not_queries.append({
                "bool": {
                    "should": term_must_not_queries,
                    "minimum_should_match": 1
                }
            })

        bool_query = {
            "filter": [
                {"term": {"dasi_published": True}}
            ]
        }

        if must_queries:
            bool_query["must"] = must_queries
            
        if should_queries:
            bool_query["should"] = should_queries
            if not must_queries:
                bool_query["minimum_should_match"] = 1
                
        if must_not_queries:
            bool_query["must_not"] = must_not_queries

        search_body = {
            "query": {
                "bool": bool_query
            },
            "from": skip,
            "size": limit,
            "highlight": {
                "fields": {
                    "title": {},
                    "epigraph_text": {},
                    "general_notes": {},
                    "translations.text": {},
                    "translations.notes.note": {},
                    "translations.bibliography.reference": {},
                    "translations.bibliography.reference_short": {},
                    "cultural_notes.note": {},
                    "apparatus_notes.note": {},
                    "bibliography.text": {},
                    "bibliography.reference": {},
                    "bibliography.title": {},
                    "bibliography.reference_short": {},
                    "images.caption": {},
                    "support_notes": {},
                    "deposit_notes": {},
                    "object_cultural_notes.note": {},
                    "deposits.settlement": {},
                    "deposits.institution": {},
                    "decorations.typeLevel1": {},
                    "decorations.type": {},
                    "decorations.typeLevel2": {},
                    "decorations.subjectLevel1": {},
                    "decorations.partOfHumanBody": {},
                    "decorations.subjectLevel2": {},
                    "decorations.view": {},
                    "decorations.humanGender": {},
                    "decorations.humanClothes": {},
                    "decorations.humanWeapons": {},
                    "decorations.humanGestures": {},
                    "decorations.humanJewellery": {},
                    "decorations.partOfAnimalBody": {},
                    "decorations.symbolShape": {},
                    "decorations.symbolReference": {},
                    "decorations.symbolReferenceText": {},
                    "decorations.monogramName": {},
                    "decorations.animalGestures": {}
                }
            }
        }

        if filters:
            for field, value in filters.items():
                if isinstance(value, bool):
                    search_body["query"]["bool"]["filter"].append({"term": {field: value}})
                elif isinstance(value, list):
                    search_body["query"]["bool"]["filter"].append({"terms": {field: value}})
                else:
                    search_body["query"]["bool"]["filter"].append({"term": {field: value}})

        if sort_field and sort_field != "_score":
            search_body["sort"] = [{sort_field: {"order": sort_order}}]
        else:
            if sort_order == "asc":
                search_body["sort"] = [{"_score": {"order": "asc"}}]
            else:
                search_body["sort"] = ["_score"]

        try:
            response = self.client.search(index=self.index_name, body=search_body)
            return {
                "hits": response["hits"]["hits"],
                "total": response["hits"]["total"]["value"],
                "max_score": response["hits"]["max_score"]
            }
        except Exception as e:
            logger.error(f"Error searching epigraphs: {e}")
            raise

    def suggest_terms(self, query: str, field: str = "title") -> List[str]:
        """Get search suggestions."""
        suggest_body = {
            "suggest": {
                "term_suggestion": {
                    "text": query,
                    "term": {
                        "field": field
                    }
                }
            }
        }

        try:
            response = self.client.search(index=self.index_name, body=suggest_body)
            suggestions = []
            for suggestion in response["suggest"]["term_suggestion"]:
                for option in suggestion["options"]:
                    suggestions.append(option["text"])
            return suggestions
        except Exception as e:
            logger.error(f"Error getting suggestions: {e}")
            return []

    def delete_epigraph(self, epigraph_id: int):
        """Delete an epigraph from the index."""
        try:
            response = self.client.delete(index=self.index_name, id=epigraph_id)
            logger.debug(f"Deleted epigraph {epigraph_id}: {response['result']}")
            return response
        except NotFoundError:
            logger.warning(f"Epigraph {epigraph_id} not found in index")
        except Exception as e:
            logger.error(f"Error deleting epigraph {epigraph_id}: {e}")
            raise

    def delete_index(self):
        """Delete the epigraphs index."""
        try:
            if self.client.indices.exists(index=self.index_name):
                response = self.client.indices.delete(index=self.index_name)
                logger.info(f"Deleted index '{self.index_name}': {response}")
                return response
            else:
                logger.info(f"Index '{self.index_name}' does not exist")
        except Exception as e:
            logger.error(f"Error deleting index: {e}")
            raise

    def _clean_date_value(self, value):
        """Return None for empty or unparseable dates, else the normalized value."""
        if not value or not isinstance(value, str):
            return None
        try:
            from dateutil.parser import parse
            dt = parse(value, dayfirst=False, yearfirst=False, fuzzy=True)
            return dt.date().isoformat()
        except Exception:
            return None

    def _clean_editors_dates(self, editors):
        """Ensure editors.date is None if empty string or misformatted, for both list and dict cases."""
        if isinstance(editors, list):
            for ed in editors:
                if isinstance(ed, dict) and "date" in ed:
                    ed["date"] = self._clean_date_value(ed["date"])
        elif isinstance(editors, dict):
            if "date" in editors:
                editors["date"] = self._clean_date_value(editors["date"])
        return editors

    def _epigraph_to_document(self, epigraph: Epigraph) -> Dict[str, Any]:
        """Convert an Epigraph object to an OpenSearch document."""
        doc = {
            "id": epigraph.id,
            "dasi_id": epigraph.dasi_id,
            "title": epigraph.title,
            "uri": epigraph.uri,
            "period": epigraph.period,
            "chronology_conjectural": epigraph.chronology_conjectural,
            "mentioned_date": epigraph.mentioned_date,
            "language_level_1": epigraph.language_level_1,
            "language_level_2": epigraph.language_level_2,
            "language_level_3": epigraph.language_level_3,
            "alphabet": epigraph.alphabet,
            "script_typology": epigraph.script_typology,
            "textual_typology": epigraph.textual_typology,
            "textual_typology_conjectural": epigraph.textual_typology_conjectural,
            "letter_measure": epigraph.letter_measure,
            "royal_inscription": epigraph.royal_inscription,
            "general_notes": epigraph.general_notes,
            "license": epigraph.license,
            "first_published": epigraph.first_published,
            "last_modified": epigraph.last_modified.isoformat() if epigraph.last_modified else None,
            "dasi_published": epigraph.dasi_published,
            "created_at": epigraph.created_at.isoformat() if epigraph.created_at else None,
            "updated_at": epigraph.updated_at.isoformat() if epigraph.updated_at else None
        }

        if epigraph.epigraph_text:
            epigraph_text = epigraph.epigraph_text
            epigraph_text = re.sub(r"<milestone unit=\"clitic\"/>", " ", epigraph_text)
            epigraph_text = re.sub(r"<[^>]*>", "", epigraph_text)
            doc["epigraph_text"] = epigraph_text

        if epigraph.translations:
            translations = epigraph.translations
            for t in translations:
                if "editors" in t:
                    t["editors"] = self._clean_editors_dates(t["editors"])
            doc["translations"] = translations

        if epigraph.sites:
            doc["sites"] = epigraph.sites

        if epigraph.script_cursus:
            doc["script_cursus"] = epigraph.script_cursus

        if epigraph.writing_techniques:
            doc["writing_techniques"] = epigraph.writing_techniques

        if epigraph.cultural_notes:
            doc["cultural_notes"] = epigraph.cultural_notes

        if epigraph.apparatus_notes:
            doc["apparatus_notes"] = epigraph.apparatus_notes

        if epigraph.bibliography:
            doc["bibliography"] = epigraph.bibliography

        if epigraph.concordances:
            doc["concordances"] = epigraph.concordances

        if epigraph.editors:
            doc["editors"] = self._clean_editors_dates(epigraph.editors)

        if epigraph.images:
            doc["images"] = epigraph.images

        if hasattr(epigraph, "objects") and epigraph.objects:
            all_support_notes = []
            all_deposit_notes = []
            all_object_cultural_notes = []
            all_deposits = []
            all_decorations = []
            for obj in epigraph.objects:
                if obj.support_notes:
                    all_support_notes.append(obj.support_notes)
                if obj.deposit_notes:
                    all_deposit_notes.append(obj.deposit_notes)
                if obj.cultural_notes:
                    all_object_cultural_notes.extend(obj.cultural_notes)
                if obj.deposits:
                    all_deposits.extend(obj.deposits)
                if hasattr(obj, "decorations") and obj.decorations:
                    # Flatten
                    for decoration in obj.decorations:
                        if isinstance(decoration, dict):
                            flattened_decoration = {}
                            for key in ["typeLevel1", "type", "typeLevel2"]:
                                if key in decoration:
                                    flattened_decoration[key] = decoration[key]

                            if "figurativeSubjects" in decoration:
                                fig_subjects = decoration["figurativeSubjects"]
                                if isinstance(fig_subjects, list):
                                    for fig_subject in fig_subjects:
                                        if isinstance(fig_subject, dict):
                                            for key, value in fig_subject.items():
                                                flattened_decoration[key] = value
                                elif isinstance(fig_subjects, dict):
                                    for key, value in fig_subjects.items():
                                        flattened_decoration[key] = value

                            all_decorations.append(flattened_decoration)
                        else:
                            all_decorations.append(decoration)
            if all_support_notes:
                doc["support_notes"] = " ".join(all_support_notes)
            if all_deposit_notes:
                doc["deposit_notes"] = " ".join(all_deposit_notes)
            if all_object_cultural_notes:
                doc["object_cultural_notes"] = all_object_cultural_notes
            if all_deposits:
                doc["deposits"] = all_deposits
            if all_decorations:
                doc["decorations"] = all_decorations
        return doc

    def get_index_stats(self) -> Dict[str, Any]:
        """Get index statistics."""
        try:
            stats = self.client.indices.stats(index=self.index_name)
            return {
                "document_count": stats["indices"][self.index_name]["total"]["docs"]["count"],
                "index_size": stats["indices"][self.index_name]["total"]["store"]["size_in_bytes"]
            }
        except Exception as e:
            logger.error(f"Error getting index stats: {e}")
            return {}

    def test_nested_search(self, query: str, nested_path: str = "translations", nested_field: str = "text") -> Dict[str, Any]:
        """Test search specifically for nested fields - useful for debugging."""
        search_body = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "nested": {
                                "path": nested_path,
                                "query": {
                                    "match": {
                                        f"{nested_path}.{nested_field}": query
                                    }
                                }
                            }
                        }
                    ],
                    "filter": [
                        {"term": {"dasi_published": True}}
                    ]
                }
            },
            "size": 10,
            "highlight": {
                "fields": {
                    f"{nested_path}.{nested_field}": {}
                }
            },
            "_source": ["id", "title", nested_path]
        }

        try:
            response = self.client.search(index=self.index_name, body=search_body)
            return {
                "hits": response["hits"]["hits"],
                "total": response["hits"]["total"]["value"],
                "query_used": search_body
            }
        except Exception as e:
            logger.error(f"Error in nested search test: {e}")
            raise
