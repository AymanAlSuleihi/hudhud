import logging
import time
import json
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Optional

import openai
import tiktoken
from sqlalchemy.orm import Session
from sqlmodel import select, func, and_

from app.models.epigraph import Epigraph
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
            self.tokenizer = tiktoken.encoding_for_model("text-embedding-3-large")
        else:
            self.client = None
            self.tokenizer = None
            logging.warning("OpenAI API key not configured. AI features will be disabled.")

    def _truncate_text_by_tokens(self, text: str, max_tokens: int = 8192) -> str:
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

    def generate_embedding(self, text: str):
        if not self.client:
            logging.error("OpenAI client is not initialized. Cannot generate embedding.")
            return None
        try:
            original_length = len(text)
            if self.tokenizer:
                token_count = len(self.tokenizer.encode(text))
                if token_count > 8192:
                    logging.debug(f"Input text is too long ({token_count} tokens, {original_length} characters). Truncating to 8192 tokens.")
                    text = self._truncate_text_by_tokens(text, max_tokens=8192)
                    logging.debug(f"Text truncated to {len(text)} characters")
            else:
                if len(text) > 8192 * 4:
                    logging.debug(f"Input text is too long ({len(text)} characters). Truncating to ~8192 tokens.")
                    text = text[:round(8192 * 4)]

            logging.debug(f"Generating embedding for text: {text[:50]}... | Length: {len(text)} characters")

            time.sleep(1)
            response = self.client.embeddings.create(
                input=text,
                model="text-embedding-3-large",
            )
            embedding = response.data[0].embedding
            token_usage = response.usage.total_tokens

            if hasattr(embedding, "tolist"):
                embedding = embedding.tolist()
            elif not isinstance(embedding, list):
                embedding = list(embedding)

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
                            model="text-embedding-3-large",
                        )
                        embedding = response.data[0].embedding
                        if hasattr(embedding, "tolist"):
                            embedding = embedding.tolist()
                        elif not isinstance(embedding, list):
                            embedding = list(embedding)
                        logging.debug(f"Successfully generated embedding after aggressive truncation")
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
        distance_threshold: float = None,
        limit: int = 25,
        filters: dict = None,
    ):
        logging.debug(f"Searching for nearest embeddings with limit {limit} and threshold {distance_threshold}")

        base_conditions = [Epigraph.embedding.is_not(None)]

        if distance_threshold is not None:
            base_conditions.append(Epigraph.embedding.cosine_distance(embedding) < distance_threshold)

        query = select(Epigraph).where(and_(*base_conditions))

        if filters:
            filter_conditions = []
            for key, value in filters.items():
                if isinstance(value, str):
                    filter_conditions.append(getattr(Epigraph, key).ilike(f"%{value}%"))
                elif isinstance(value, (int, float)):
                    filter_conditions.append(getattr(Epigraph, key) == value)
                elif isinstance(value, list):
                    filter_conditions.append(getattr(Epigraph, key).in_(value))
                elif isinstance(value, bool):
                    filter_conditions.append(getattr(Epigraph, key) == value)
            if filter_conditions:
                query = query.where(and_(*filter_conditions))

        query = query.order_by(Epigraph.embedding.cosine_distance(embedding))

        if limit:
            query = query.limit(limit)

        epigraphs = self.session.exec(query).all()

        count_query = select(func.count()).select_from(Epigraph).where(and_(*base_conditions))
        if filters and filter_conditions:
            count_query = count_query.where(and_(*filter_conditions))
        total_count = self.session.scalar(count_query)

        logging.debug(f"Found {len(epigraphs)} similar epigraphs out of {total_count} total.")

        return {"epigraphs": epigraphs, "total_count": total_count}

    def generate_embeddings_batch(
        self,
        texts: List[str],
        max_batch_size: int = 2048
    ) -> List[Optional[List[float]]]:
        """Generate embeddings for multiple texts in batch (up to 2048 per request)."""
        if not self.client:
            logging.error("OpenAI client is not initialized. Cannot generate embeddings.")
            return [None] * len(texts)

        if not texts:
            return []

        all_embeddings = []

        for i in range(0, len(texts), max_batch_size):
            batch = texts[i:i + max_batch_size]

            processed_batch = []
            for text in batch:
                if self.tokenizer:
                    token_count = len(self.tokenizer.encode(text))
                    if token_count > 8192:
                        text = self._truncate_text_by_tokens(text, max_tokens=8192)
                processed_batch.append(text)

            try:
                logging.debug(f"Generating embeddings for batch {i//max_batch_size + 1} ({len(batch)} texts)")

                response = self.client.embeddings.create(
                    input=processed_batch,
                    model="text-embedding-3-large",
                )

                batch_embeddings = []
                for item in response.data:
                    embedding = item.embedding
                    if hasattr(embedding, "tolist"):
                        embedding = embedding.tolist()
                    elif not isinstance(embedding, list):
                        embedding = list(embedding)
                    batch_embeddings.append(embedding)

                all_embeddings.extend(batch_embeddings)

                logging.debug(f"Generated {len(batch_embeddings)} embeddings. Total tokens: {response.usage.total_tokens}")

                if i + max_batch_size < len(texts):
                    time.sleep(1)

            except Exception as e:
                logging.error(f"Error generating batch embeddings: {e}")
                all_embeddings.extend([None] * len(batch))

        return all_embeddings

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

            return {
                "id": batch_job.id,
                "status": batch_job.status,
                "created_at": batch_job.created_at,
                "completed_at": batch_job.completed_at,
                "failed_at": batch_job.failed_at,
                "request_counts": {
                    "total": batch_job.request_counts.total,
                    "completed": batch_job.request_counts.completed,
                    "failed": batch_job.request_counts.failed,
                },
                "output_file_id": batch_job.output_file_id,
                "error_file_id": batch_job.error_file_id,
            }
        except Exception as e:
            logging.error(f"Error retrieving batch job status: {e}")
            return None

    def retrieve_batch_results(self, batch_id: str) -> Optional[Dict[str, List[float]]]:
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
                    results[custom_id] = embedding
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
                if embedding:
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

            if chunk and embedding:
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
