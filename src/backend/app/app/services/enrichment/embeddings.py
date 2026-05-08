import logging
import time
import json
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional, cast

import openai
import tiktoken
from sqlmodel import Session, select, func, and_

from app.models.epigraph import Epigraph
from app.models.epigraph_chunk import EpigraphChunk
from app.crud.crud_epigraph_chunk import epigraph_chunk as crud_epigraph_chunk
from app.core.config import settings


logging.basicConfig(
    filename="epigraph_search.log",
    level=logging.DEBUG,
    format="%(asctime)s - %(message)s",
    datefmt="%d-%b-%y %H:%M:%S",
)

class EmbeddingsService:
    """Service for handling embeddings-related operations."""

    def __init__(self, session: Session):
        self.session = session
        if hasattr(settings, "OPENAI_API_KEY"):
            self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
            self.tokenizer = tiktoken.encoding_for_model(settings.EMBEDDING_MODEL)
        else:
            self.client = None
            self.tokenizer = None
            logging.warning("OpenAI API key not configured. AI features will be disabled.")

    def _truncate_text_by_tokens(self, text: str, max_tokens: int | None = None) -> str:
        max_tokens = max_tokens or settings.EMBEDDING_MAX_INPUT_TOKENS
        if not self.tokenizer:
            logging.warning("Tokenizer not available, using character-based truncation")
            return text[:max_tokens * 4]

        tokens = self.tokenizer.encode(text)

        if len(tokens) <= max_tokens:
            return text

        truncated_tokens = tokens[:max_tokens]
        truncated_text = self.tokenizer.decode(truncated_tokens)

        logging.debug(f"Text truncated from {len(tokens)} tokens to {len(truncated_tokens)} tokens")
        return truncated_text

    def get_token_count(self, text: str) -> int:
        if not self.tokenizer:
            return len(text) // 4

        return len(self.tokenizer.encode(text))

    def _prepare_embedding_text(self, text: str) -> tuple[str, int]:
        prepared_text = text
        if self.tokenizer:
            token_count = len(self.tokenizer.encode(prepared_text))
            if token_count > settings.EMBEDDING_MAX_INPUT_TOKENS:
                prepared_text = self._truncate_text_by_tokens(
                    prepared_text,
                    max_tokens=settings.EMBEDDING_MAX_INPUT_TOKENS,
                )
                token_count = len(self.tokenizer.encode(prepared_text))
        else:
            max_chars = settings.EMBEDDING_MAX_INPUT_TOKENS * 4
            if len(prepared_text) > max_chars:
                prepared_text = prepared_text[:max_chars]
            token_count = len(prepared_text) // 4

        return prepared_text, token_count

    def _split_embedding_batches(
        self,
        texts: List[str],
        *,
        max_inputs: int | None = None,
        max_total_tokens: int | None = None,
    ) -> List[List[str]]:
        if not texts:
            return []

        max_inputs = min(max_inputs or settings.EMBEDDING_MAX_BATCH_INPUTS, settings.EMBEDDING_MAX_BATCH_INPUTS)
        max_total_tokens = min(
            max_total_tokens or settings.EMBEDDING_MAX_BATCH_TOKENS,
            settings.EMBEDDING_MAX_BATCH_TOKENS,
        )

        batches: List[List[str]] = []
        current_batch: List[str] = []
        current_token_total = 0

        for text in texts:
            prepared_text, token_count = self._prepare_embedding_text(text)
            if current_batch and (
                len(current_batch) >= max_inputs
                or current_token_total + token_count > max_total_tokens
            ):
                batches.append(current_batch)
                current_batch = []
                current_token_total = 0

            current_batch.append(prepared_text)
            current_token_total += token_count

        if current_batch:
            batches.append(current_batch)

        return batches

    def _normalize_embedding(self, embedding: Any) -> list[float]:
        if hasattr(embedding, "tolist"):
            raw_embedding = embedding.tolist()
        elif isinstance(embedding, list):
            raw_embedding = embedding
        else:
            raw_embedding = list(embedding)

        return [float(value) for value in raw_embedding]

    def generate_embedding(self, text: str) -> list[float] | None:
        if not self.client:
            logging.error("OpenAI client is not initialized. Cannot generate embedding.")
            return None
        try:
            original_length = len(text)
            text, token_count = self._prepare_embedding_text(text)

            logging.debug(f"Generating embedding for text: {text[:50]}... | Length: {len(text)} characters")

            time.sleep(1)
            response = self.client.embeddings.create(
                input=text,
                model=settings.EMBEDDING_MODEL,
            )
            embedding = self._normalize_embedding(response.data[0].embedding)
            token_usage = response.usage.total_tokens if response.usage is not None else 0

            logging.debug(f"Embedding type: {type(embedding)} | Length: {len(embedding)}")
            logging.debug(f"Generated embedding for text: {text[:50]}... | Tokens used: {token_usage}")

            if original_length != len(text):
                logging.debug(f"Text was truncated from {original_length} to {len(text)} characters due to token limit")

            return embedding
        except openai.BadRequestError as e:
            if "maximum context length" in str(e):
                logging.error(f"Request still too long after truncation: {e}")
                if self.tokenizer:
                    current_tokens = len(self.tokenizer.encode(text))
                    new_max_tokens = min(8000, current_tokens // 2)
                    logging.debug(f"Retrying with more aggressive truncation: {new_max_tokens} tokens")
                    text = self._truncate_text_by_tokens(text, max_tokens=new_max_tokens)
                    try:
                        response = self.client.embeddings.create(
                            input=text,
                            model=settings.EMBEDDING_MODEL,
                        )
                        embedding = self._normalize_embedding(response.data[0].embedding)
                        logging.debug("Successfully generated embedding after aggressive truncation")
                        return embedding
                    except Exception as retry_e:
                        logging.error(f"Failed even after aggressive truncation: {retry_e}")
                        return None
                else:
                    logging.error("Cannot retry without tokenizer available")
                    return None
            else:
                logging.error(f"Bad request error: {e}")
                return None
        except Exception as e:
            logging.error(f"Error generating embedding: {e}")
            return None

    def get_nearest_embeddings(
        self,
        embedding: list[float],
        distance_threshold: float | None = None,
        limit: int = 25,
        filters: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        logging.debug(f"Searching for nearest embeddings with limit {limit} and threshold {distance_threshold}")

        embedding_column = cast(Any, Epigraph.embedding)
        base_conditions: list[Any] = [embedding_column.is_not(None)]

        if distance_threshold is not None:
            base_conditions.append(embedding_column.cosine_distance(embedding) < distance_threshold)

        query = select(Epigraph).where(and_(*base_conditions))

        if filters:
            filter_conditions: list[Any] = []
            for key, value in filters.items():
                column = getattr(Epigraph, key, None)
                if column is None:
                    continue
                typed_column = cast(Any, column)
                if isinstance(value, str):
                    filter_conditions.append(typed_column.ilike(f"%{value}%"))
                elif isinstance(value, (int, float)):
                    filter_conditions.append(typed_column == value)
                elif isinstance(value, list):
                    filter_conditions.append(typed_column.in_(value))
                elif isinstance(value, bool):
                    filter_conditions.append(typed_column == value)
            if filter_conditions:
                query = query.where(and_(*filter_conditions))
        else:
            filter_conditions = []

        query = query.order_by(embedding_column.cosine_distance(embedding))

        if limit:
            query = query.limit(limit)

        epigraphs = self.session.exec(query).all()

        count_query = select(func.count()).select_from(Epigraph).where(and_(*base_conditions))
        if filters and filter_conditions:
            count_query = count_query.where(and_(*filter_conditions))
        total_count = int(self.session.scalar(count_query) or 0)

        logging.debug(f"Found {len(epigraphs)} similar epigraphs out of {total_count} total.")

        return {"epigraphs": epigraphs, "total_count": total_count}

    def generate_embeddings_batch(
        self,
        texts: List[str],
        max_batch_size: int | None = None,
        max_total_tokens: int | None = None,
    ) -> List[Optional[List[float]]]:
        """Generate embeddings for multiple texts in request-sized batches."""
        if not self.client:
            logging.error("OpenAI client is not initialized. Cannot generate embeddings.")
            return [None] * len(texts)

        if not texts:
            return []

        all_embeddings = []

        batches = self._split_embedding_batches(
            texts,
            max_inputs=max_batch_size,
            max_total_tokens=max_total_tokens,
        )

        for batch_index, batch in enumerate(batches, start=1):

            try:
                logging.debug(f"Generating embeddings for batch {batch_index} ({len(batch)} texts)")

                response = self.client.embeddings.create(
                    input=batch,
                    model=settings.EMBEDDING_MODEL,
                )

                batch_embeddings: list[list[float]] = []
                for item in response.data:
                    batch_embeddings.append(self._normalize_embedding(item.embedding))

                all_embeddings.extend(batch_embeddings)

                total_tokens = response.usage.total_tokens if response.usage is not None else 0
                logging.debug(f"Generated {len(batch_embeddings)} embeddings. Total tokens: {total_tokens}")

                if batch_index < len(batches):
                    time.sleep(1)

            except Exception as e:
                logging.error(f"Error generating batch embeddings: {e}")
                all_embeddings.extend([None] * len(batch))

        return all_embeddings

    def flush_pending_chunk_embeddings(self, force: bool = False) -> Dict[str, Any]:
        chunk_id_column = cast(Any, EpigraphChunk.id)
        token_count_column = cast(Any, EpigraphChunk.token_count)
        created_at_column = cast(Any, EpigraphChunk.created_at)
        embedding_column = cast(Any, EpigraphChunk.embedding)

        pending_query = select(EpigraphChunk).where(embedding_column.is_(None))
        pending_count = int(
            self.session.exec(
                select(func.count(chunk_id_column)).where(embedding_column.is_(None))
            ).one()
            or 0
        )

        if pending_count == 0:
            return {"status": "no_work", "processed": 0, "pending": 0}

        pending_token_total = int(
            self.session.exec(
                select(func.coalesce(func.sum(token_count_column), 0)).where(
                    embedding_column.is_(None)
                )
            ).one()
            or 0
        )
        oldest_pending = self.session.exec(
            select(func.min(created_at_column)).where(embedding_column.is_(None))
        ).one()

        max_age_cutoff = datetime.now(timezone.utc) - timedelta(
            seconds=settings.EMBEDDING_PENDING_MAX_AGE_SECONDS
        )
        if oldest_pending is not None and oldest_pending.tzinfo is None:
            oldest_pending = oldest_pending.replace(tzinfo=timezone.utc)
        is_stale = oldest_pending is not None and oldest_pending <= max_age_cutoff
        reached_capacity = (
            pending_count >= settings.EMBEDDING_MAX_BATCH_INPUTS
            or pending_token_total >= settings.EMBEDDING_MAX_BATCH_TOKENS
        )

        if not force and not reached_capacity and not is_stale:
            return {
                "status": "waiting",
                "processed": 0,
                "pending": pending_count,
                "pending_tokens": pending_token_total,
            }

        pending_chunks = list(
            self.session.exec(
                pending_query.order_by(created_at_column.asc(), chunk_id_column.asc())
            ).all()
        )

        selected_chunks: list[EpigraphChunk] = []
        selected_texts: list[str] = []
        selected_tokens = 0
        for chunk in pending_chunks:
            chunk_tokens = chunk.token_count or self.get_token_count(chunk.chunk_text)
            if selected_chunks and (
                len(selected_chunks) >= settings.EMBEDDING_MAX_BATCH_INPUTS
                or selected_tokens + chunk_tokens > settings.EMBEDDING_MAX_BATCH_TOKENS
            ):
                break

            selected_chunks.append(chunk)
            selected_texts.append(chunk.chunk_text)
            selected_tokens += chunk_tokens

        if not selected_chunks:
            return {
                "status": "no_work",
                "processed": 0,
                "pending": pending_count,
                "pending_tokens": pending_token_total,
            }

        embeddings = self.generate_embeddings_batch(
            selected_texts,
            max_batch_size=settings.EMBEDDING_MAX_BATCH_INPUTS,
            max_total_tokens=settings.EMBEDDING_MAX_BATCH_TOKENS,
        )

        processed = 0
        failed = 0
        for chunk, embedding in zip(selected_chunks, embeddings):
            if embedding is None:
                failed += 1
                continue

            crud_epigraph_chunk.update(
                self.session,
                db_obj=chunk,
                obj_in={"embedding": embedding},
            )
            processed += 1

        return {
            "status": "completed" if processed else "error",
            "processed": processed,
            "failed": failed,
            "selected": len(selected_chunks),
            "pending_before": pending_count,
            "pending_after": max(pending_count - processed, 0),
            "selected_tokens": selected_tokens,
        }

    def create_batch_embedding_job(
        self,
        texts: List[str],
        custom_ids: List[str],
        description: str = "Batch embedding generation"
    ) -> Optional[str]:
        """Create a batch embedding job using OpenAI's Batch API (50% cost savings)."""
        if not self.client:
            logging.error("OpenAI client is not initialized.")
            return None

        if len(texts) != len(custom_ids):
            logging.error("texts and custom_ids must have the same length")
            return None

        batch_requests = []
        for custom_id, text in zip(custom_ids, texts):
            if self.tokenizer:
                token_count = len(self.tokenizer.encode(text))
                if token_count > 8192:
                    text = self._truncate_text_by_tokens(text, max_tokens=8192)

            request = {
                "custom_id": str(custom_id),
                "method": "POST",
                "url": "/v1/embeddings",
                "body": {
                    "model": "text-embedding-3-large",
                    "input": text
                }
            }
            batch_requests.append(request)

        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
                for request in batch_requests:
                    f.write(json.dumps(request) + '\n')
                temp_file_path = f.name

            logging.debug(f"Created batch file with {len(batch_requests)} requests: {temp_file_path}")

            with open(temp_file_path, 'rb') as f:
                batch_input_file = self.client.files.create(
                    file=f,
                    purpose="batch"
                )

            logging.debug(f"Uploaded batch file: {batch_input_file.id}")

            # Create batch job
            batch_job = self.client.batches.create(
                input_file_id=batch_input_file.id,
                endpoint="/v1/embeddings",
                completion_window="24h",
                metadata={
                    "description": description
                }
            )

            logging.debug(f"Created batch job: {batch_job.id} (status: {batch_job.status})")

            Path(temp_file_path).unlink()

            return batch_job.id

        except Exception as e:
            logging.error(f"Error creating batch embedding job: {e}")
            return None

    def get_batch_job_status(self, batch_id: str) -> Optional[Dict[str, Any]]:
        """Check the status of a batch embedding job."""
        if not self.client:
            logging.error("OpenAI client is not initialized.")
            return None

        try:
            batch_job = self.client.batches.retrieve(batch_id)
            request_counts = batch_job.request_counts

            return {
                "id": batch_job.id,
                "status": batch_job.status,
                "created_at": batch_job.created_at,
                "completed_at": batch_job.completed_at,
                "failed_at": batch_job.failed_at,
                "request_counts": {
                    "total": request_counts.total if request_counts is not None else 0,
                    "completed": request_counts.completed if request_counts is not None else 0,
                    "failed": request_counts.failed if request_counts is not None else 0,
                },
                "output_file_id": batch_job.output_file_id,
                "error_file_id": batch_job.error_file_id,
            }
        except Exception as e:
            logging.error(f"Error retrieving batch job status: {e}")
            return None

    def retrieve_batch_results(self, batch_id: str) -> Optional[Dict[str, Optional[List[float]]]]:
        """Retrieve results from a completed batch job."""
        if not self.client:
            logging.error("OpenAI client is not initialized.")
            return None

        try:
            batch_job = self.client.batches.retrieve(batch_id)

            if batch_job.status != "completed":
                logging.warning(f"Batch job {batch_id} is not completed yet (status: {batch_job.status})")
                return None

            if not batch_job.output_file_id:
                logging.error(f"Batch job {batch_id} has no output file")
                return None

            file_response = self.client.files.content(batch_job.output_file_id)

            results = {}
            for line in file_response.text.strip().split('\n'):
                result = json.loads(line)
                custom_id = result['custom_id']

                if result['response']['status_code'] == 200:
                    embedding = result['response']['body']['data'][0]['embedding']
                    results[custom_id] = [float(value) for value in embedding]
                else:
                    logging.error(f"Failed to generate embedding for {custom_id}: {result['response']['body']}")
                    results[custom_id] = None

            logging.debug(f"Retrieved {len(results)} results from batch {batch_id}")
            return results

        except Exception as e:
            logging.error(f"Error retrieving batch results: {e}")
            return None

    def process_chunks_batch(
        self,
        chunk_ids: List[int],
        use_batch_api: bool = True
    ) -> Dict[str, Any]:
        """Generate embeddings for multiple chunks using sync or async batch API."""
        all_chunks = [crud_epigraph_chunk.get(self.session, id=chunk_id) for chunk_id in chunk_ids]
        chunks = [chunk for chunk in all_chunks if chunk is not None and chunk.embedding is None]

        if not chunks:
            logging.debug("No chunks found or all already have embeddings")
            return {"status": "no_work", "processed": 0}

        logging.debug(f"Processing {len(chunks)} chunks")

        texts = [chunk.chunk_text for chunk in chunks]
        custom_ids = [str(chunk.id) for chunk in chunks]

        if use_batch_api:
            batch_id = self.create_batch_embedding_job(
                texts=texts,
                custom_ids=custom_ids,
                description=f"Embedding generation for {len(chunks)} epigraph chunks"
            )

            if batch_id:
                return {
                    "status": "batch_created",
                    "batch_id": batch_id,
                    "chunk_count": len(chunks),
                    "message": "Batch job created. Check status with get_batch_job_status()"
                }
            else:
                return {"status": "error", "message": "Failed to create batch job"}

        else:
            embeddings = self.generate_embeddings_batch(texts)

            success_count = 0
            for chunk, embedding in zip(chunks, embeddings):
                if embedding is not None:
                    crud_epigraph_chunk.update(
                        self.session,
                        db_obj=chunk,
                        obj_in={"embedding": embedding}
                    )
                    success_count += 1

            return {
                "status": "completed",
                "processed": success_count,
                "failed": len(chunks) - success_count,
                "chunk_count": len(chunks)
            }

    def apply_batch_results_to_chunks(self, batch_id: str) -> Dict[str, Any]:
        """Apply embeddings from a completed batch job to chunks."""
        results = self.retrieve_batch_results(batch_id)

        if not results:
            return {"status": "error", "message": "Failed to retrieve batch results"}

        success_count = 0
        failed_count = 0

        for custom_id, embedding in results.items():
            chunk_id = int(custom_id)
            chunk = crud_epigraph_chunk.get(self.session, id=chunk_id)

            if chunk and embedding is not None:
                crud_epigraph_chunk.update(
                    self.session,
                    db_obj=chunk,
                    obj_in={"embedding": embedding}
                )
                success_count += 1
            else:
                failed_count += 1

        logging.debug(f"Applied {success_count} embeddings from batch {batch_id}")

        return {
            "status": "completed",
            "batch_id": batch_id,
            "updated": success_count,
            "failed": failed_count
        }
