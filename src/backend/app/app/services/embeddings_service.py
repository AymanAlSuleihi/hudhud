import logging
import time

import openai
from sqlalchemy.orm import Session
from sqlmodel import select, func, asc, desc, update, text, or_, and_

from app.models.epigraph import Epigraph
from app.core.config import settings


logging.basicConfig(
    filename="epigraph_search.log",
    level=logging.DEBUG,
    format="%(asctime)s - %(message)s",
    datefmt="%d-%b-%y %H:%M:%S",
)

class EmbeddingsService:
    """
    Service for handling embeddings-related operations.
    """

    def __init__(self, session: Session):
        self.session = session
        if hasattr(settings, "OPENAI_API_KEY"):
            self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        else:
            self.client = None
            logging.warning("OpenAI API key not configured. AI features will be disabled.")

    def generate_embedding(self, text: str):
        if not self.client:
            logging.error("OpenAI client is not initialized. Cannot generate embedding.")
            return None
        try:
            if len(text) > 8192 * 2.6:
                logging.debug(f"Input text is too long ({len(text)} characters). Truncating to 8192 tokens.")
                text = text[:round(8192 * 2.6)]

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
            return embedding
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
