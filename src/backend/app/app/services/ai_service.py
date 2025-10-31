import json
import logging
from typing import List, Dict, Any, Optional, Tuple, AsyncGenerator
from sqlmodel import Session
import openai

from app.models.epigraph import Epigraph
from app.models.epigraph_chunk import EpigraphChunk
from app.core.config import settings


logging.basicConfig(
    filename="epigraph_search.log",
    level=logging.DEBUG,
    format="%(asctime)s - %(message)s",
    datefmt="%d-%b-%y %H:%M:%S",
)


class AIService:
    """Service for handling AI-related operations including answer generation and query resolution."""

    def __init__(self, session: Session):
        self.session = session
        if hasattr(settings, "OPENAI_API_KEY"):
            self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        else:
            self.client = None
            logging.warning("OpenAI API key not configured. AI features will be disabled.")

    def resolve_query_with_context(
        self, 
        user_query: str, 
        conversation_history: List
    ) -> str:
        """
        Resolve the actual search query by analyzing conversation history.
        Handles follow-up questions like "tell me more", "search wider", etc.
        """
        if not self.client or not conversation_history:
            return user_query

        history_text = "\n".join([
            f"{(msg.role if hasattr(msg, 'role') else msg['role']).capitalize()}: {(msg.content if hasattr(msg, 'content') else msg['content'])[:300]}" 
            for msg in conversation_history[-4:]
        ])

        system_prompt = """You are a query resolution assistant for a semantic search system that uses embeddings.

        Your task: Convert follow-up queries into natural language search queries based on conversation context.

        Rules:
        1. For follow-up queries like "tell me more", "search wider", "what else", etc., identify the main topic from conversation history
        2. For "search wider" requests, expand the topic naturally (e.g., "Karib il Watar" → "information about Karib il Watar and his reign in Saba")
        3. For new standalone questions, return them as-is
        4. Write natural phrases, NOT keyword lists - the system uses semantic search with embeddings
        5. Return ONLY the search query text - no explanations, no extra words
        6. Keep queries concise but natural (1-2 sentences max)
        7. For Ancient South Arabian names, you can include both romanized and transliterated forms for better recall (e.g., "Karib il Watar" and "Krbʾl Wtr")

        Examples:
        - History: "tell me about Karib il Watar", Response: "..."
        User: "search wider" → Output: "Karib il Watar Krbʾl Wtr reign campaigns military activities Saba kingdom"

        - History: "trade routes in ancient arabia"
        User: "tell me more" → Output: "ancient Arabian trade routes incense trade caravan networks"

        - User: "what about temples?" → Output: "what about temples?"

        - User: "give full passages" (after asking about Karib il Watar) → Output: "Karib il Watar Krbʾl Wtr inscriptions full text translations"
        """

        user_prompt = f"""Conversation history:
        {history_text}

        User's new query: "{user_query}"

        Search query:"""

        try:
            response = self.client.responses.create(
                model="gpt-5-mini",
                input=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )
            logging.info(f"OpenAI response: {response}")

            resolved_query = response.output_text
            if resolved_query:
                resolved_query = resolved_query.strip()
            else:
                logging.warning(f"OpenAI returned empty content for query: '{user_query}'. Using original query.")
                return user_query

            logging.info(f"Query resolved from '{user_query}' to '{resolved_query}'")

            if not resolved_query:
                logging.warning(f"Query resolved to empty string. Using original: '{user_query}'")
                return user_query

            return resolved_query
        except Exception as e:
            logging.error(f"Error resolving query: {e}")
            return user_query

    def generate_answer_with_chunks(
        self, 
        user_query: str, 
        chunk_results: List[Tuple[EpigraphChunk, Epigraph, float]], 
        chunk_limit: int = 15
    ) -> Tuple[str, Optional[List[int]]]:
        """Generate an answer using chunk-based context for better RAG."""
        if not self.client:
            return "AI answer generation is not available. Please configure the OpenAI API key.", None

        if not chunk_results:
            return "I couldn't find any information related to your query in our database.", None

        formatted_chunks = []
        epigraph_ids_used = set()

        for chunk, epigraph, similarity_score in chunk_results[:chunk_limit]:
            epigraph_ids_used.add(epigraph.id)

            chunk_info = {
                "epigraph_id": epigraph.dasi_id or epigraph.id,
                "epigraph_title": epigraph.title,
                "period": epigraph.period,
                "language": f"{epigraph.language_level_1 or ''} > {epigraph.language_level_2 or ''} > {epigraph.language_level_3 or ''}".strip(),
                "chunk_type": chunk.chunk_type,
                "relevance_score": round(similarity_score, 3),
                "content": chunk.chunk_text,
            }

            if chunk.chunk_metadata:
                if "language" in chunk.chunk_metadata:
                    chunk_info["translation_language"] = chunk.chunk_metadata["language"]
                if "notes_type" in chunk.chunk_metadata:
                    chunk_info["notes_type"] = chunk.chunk_metadata["notes_type"]

            formatted_chunks.append(chunk_info)

        formatted_json = json.dumps(formatted_chunks, indent=2, ensure_ascii=False)

        system_prompt = """
        You are Hudhud, a knowledgeable historian specialising in Ancient South Arabia and epigraphy. 
        You have access to a database of ancient inscriptions and can search them to answer questions.
        Use the relevant excerpts found in the database to answer the user's question accurately.

        Each excerpt includes:
        - Content: The actual text (translation, notes, or inscription)
        - Context: Epigraph ID, title, period, and type
        - Relevance: How related this excerpt is to the query (0-1 scale)

        When responding:
        1. Focus on the most relevant excerpts (higher relevance scores)
        2. Synthesise information from multiple sources when appropriate
        3. Reference specific epigraph titles when citing information - IMPORTANT: 
           - Wrap ONLY the epigraph_title value (without any other metadata) in the format [EPIGRAPH:title]
           - Each epigraph must have its own separate [EPIGRAPH:...] marker
           - You can reference epigraphs inline: "The inscription [EPIGRAPH:RES 4176] mentions..." or "According to [EPIGRAPH:MIbb 72]..."
           - You can also list references at the end: "Coastal campaigns involved seaports [EPIGRAPH:ʿAbadān 1], [EPIGRAPH:Ir 31]."
           - NEVER write multiple titles in one marker like [EPIGRAPH:title1; EPIGRAPH:title2]
           - Do NOT include epigraph_id numbers, chunk_type, or other metadata inside the brackets
        4. If the database doesn't contain enough information to fully answer the question, say so naturally (e.g., "Based on the inscriptions in the database..." or "The available evidence suggests...")
        5. Structure your response clearly and informatively
        6. Do not make up or infer information beyond what's in the database
        7. Never refer to "the data you provided" or similar phrases - the user only asked a question, they didn't provide data
        8. Consider the source type (translation, cultural_notes, etc.) when interpreting content

        Respond as an expert historian drawing from the inscription database, providing scholarly context.
        """

        try:
            response = self.client.responses.create(
                model="gpt-5-mini",
                input=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Question: {user_query}\n\nRelevant excerpts from inscriptions:\n{formatted_json}"}
                ]
            )
            logging.info(f"AI response with chunks: {response}")
            logging.info(f"Token usage: {response.usage.input_tokens} input, {response.usage.output_tokens} output")

            answer = response.output_text
            logging.info(f"AI generated answer using {len(formatted_chunks)} chunks from {len(epigraph_ids_used)} epigraphs")

            return answer, list(epigraph_ids_used)
        except Exception as e:
            logging.error(f"Error generating answer with AI: {e}")
            return f"Found {len(chunk_results)} relevant excerpts for your query, but couldn't generate an AI answer due to an error. Please review the search results directly.", None

    async def generate_answer_with_chunks_streaming(
        self, 
        user_query: str, 
        chunk_results: List[Tuple[EpigraphChunk, Epigraph, float]], 
        chunk_limit: int = 15,
        conversation_history: List[Dict[str, str]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Generate an answer using chunk-based context with streaming support."""
        if not self.client:
            yield {"type": "error", "content": "AI answer generation is not available."}
            return

        if not chunk_results:
            yield {"type": "error", "content": "No relevant information found."}
            return

        formatted_chunks = []
        epigraph_ids_used = set()

        for chunk, epigraph, similarity_score in chunk_results[:chunk_limit]:
            epigraph_ids_used.add(epigraph.id)

            chunk_info = {
                "epigraph_id": epigraph.dasi_id or epigraph.id,
                "epigraph_title": epigraph.title,
                "period": epigraph.period,
                "language": f"{epigraph.language_level_1 or ''} > {epigraph.language_level_2 or ''} > {epigraph.language_level_3 or ''}".strip(),
                "chunk_type": chunk.chunk_type,
                "relevance_score": round(similarity_score, 3),
                "content": chunk.chunk_text,
            }

            if chunk.chunk_metadata:
                if "language" in chunk.chunk_metadata:
                    chunk_info["translation_language"] = chunk.chunk_metadata["language"]
                if "notes_type" in chunk.chunk_metadata:
                    chunk_info["notes_type"] = chunk.chunk_metadata["notes_type"]

            formatted_chunks.append(chunk_info)

        formatted_json = json.dumps(formatted_chunks, indent=2, ensure_ascii=False)

        system_prompt = """
        You are Hudhud, a knowledgeable historian specialising in Ancient South Arabia and epigraphy. 
        You have access to a database of ancient inscriptions and can search them to answer questions.
        Use the relevant excerpts found in the database to answer the user's question accurately.

        Each excerpt includes:
        - Content: The actual text (translation, notes, or inscription)
        - Context: Epigraph ID, title, period, and type
        - Relevance: How related this excerpt is to the query (0-1 scale)

        When responding:
        1. Focus on the most relevant excerpts (higher relevance scores)
        2. Synthesise information from multiple sources when appropriate
        3. Reference specific epigraph titles when citing information - IMPORTANT: 
           - Wrap ONLY the epigraph_title value (without any other metadata) in the format [EPIGRAPH:title]
           - Each epigraph must have its own separate [EPIGRAPH:...] marker
           - You can reference epigraphs inline: "The inscription [EPIGRAPH:RES 4176] mentions..." or "According to [EPIGRAPH:MIbb 72]..."
           - You can also list references at the end: "Coastal campaigns involved seaports [EPIGRAPH:ʿAbadān 1], [EPIGRAPH:Ir 31]."
           - NEVER write multiple titles in one marker like [EPIGRAPH:title1; EPIGRAPH:title2]
           - Do NOT include epigraph_id numbers, chunk_type, or other metadata inside the brackets
        4. If the database doesn't contain enough information to fully answer the question, say so naturally (e.g., "Based on the inscriptions in the database..." or "The available evidence suggests...")
        5. Structure your response clearly and informatively
        6. Do not make up or infer information beyond what's in the database
        7. Never refer to "the data you provided" or similar phrases - the user only asked a question, they didn't provide data
        8. Consider the source type (translation, cultural_notes, etc.) when interpreting content

        Respond as an expert historian drawing from the inscription database, providing scholarly context.
        """

        try:
            logging.info(f"Starting streaming response for query: {user_query}")

            messages = [{"role": "system", "content": system_prompt}]

            if conversation_history:
                messages.extend(conversation_history)

            messages.append({
                "role": "user", 
                "content": f"Question: {user_query}\n\nRelevant excerpts from inscriptions:\n{formatted_json}"
            })

            stream = self.client.chat.completions.create(
                model="gpt-5-mini",
                messages=messages,
                stream=True
            )

            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield {"type": "token", "content": chunk.choices[0].delta.content}

            yield {"type": "epigraph_ids", "ids": list(epigraph_ids_used)}

            logging.info(f"Streaming completed using {len(formatted_chunks)} chunks from {len(epigraph_ids_used)} epigraphs")

        except Exception as e:
            logging.error(f"Error generating streaming answer with AI: {e}", exc_info=True)
            yield {"type": "error", "content": f"Error generating answer: {str(e)}"}

    async def generate_answer_with_epigraphs_streaming(
        self, 
        user_query: str, 
        epigraphs: List[Any],
        conversation_history: List[Dict[str, str]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Generate an answer using full epigraph context with streaming support."""
        logging.info(f"=== Starting answer generation ===")
        logging.info(f"User query: {user_query}")
        logging.info(f"Number of epigraphs provided: {len(epigraphs)}")
        logging.info(f"Conversation history length: {len(conversation_history) if conversation_history else 0}")

        if not self.client:
            yield {"type": "error", "content": "AI answer generation is not available."}
            return

        if not epigraphs:
            yield {"type": "error", "content": "No relevant epigraphs found."}
            return

        formatted_epigraphs = []
        epigraph_ids_used = set()

        for epigraph in epigraphs:
            epigraph_ids_used.add(epigraph.id)

            epigraph_info = epigraph.model_dump(
                exclude={
                    'embedding',
                    'created_at',
                    'updated_at',
                    'last_modified',
                    'bibliography',
                    'sites',
                },
            )

            if epigraph_info.get("sites_objs") and len(epigraph_info["sites_objs"]) > 0:
                epigraph_info["sites_objs"] = [epigraph_info["sites_objs"][0]]

            formatted_epigraphs.append(epigraph_info)

        formatted_json = json.dumps(formatted_epigraphs, indent=2, ensure_ascii=False)

        system_prompt = """
        You are Hudhud, a knowledgeable historian specialising in Ancient South Arabia and epigraphy. 
        You have access to a database of ancient inscriptions and can search them to answer questions.
        Use the complete epigraphs provided to answer the user's question accurately.

        Each epigraph includes comprehensive information:
        - Complete inscription text and translations (with translation notes)
        - Historical context: ID, title, period, chronology certainty, and mentioned dates
        - Linguistic details: language hierarchy and script typology
        - Textual classification: textual typology and whether it's a royal inscription
        - Cultural notes: scholarly commentary on religious, social, and cultural aspects
        - Apparatus notes: technical philological notes on specific lines
        - General notes: broader scholarly context and interpretations
        - Archaeological context: site information and object descriptions
        - Physical details: materials, measurements, decorations (when objects are present)

        When responding:
        1. Draw from the full context of each epigraph, including all available scholarly notes
        2. Consider cultural_notes for religious and social context
        3. Use apparatus_notes for linguistic and philological details
        4. Reference general_notes for broader historical interpretations
        5. Mention site and object information when relevant to the question
        6. Note when chronology is conjectural or dates are mentioned
        7. Distinguish between royal inscriptions and other types
        8. Synthesise information from multiple epigraphs when appropriate
        9. Reference specific epigraph titles when citing information - IMPORTANT: 
           - Wrap ONLY the epigraph_title value (without any other metadata) in the format [EPIGRAPH:title]
           - Each epigraph must have its own separate [EPIGRAPH:...] marker
           - You can reference epigraphs inline: "The inscription [EPIGRAPH:RES 4176] mentions..." or "According to [EPIGRAPH:MIbb 72]..."
           - You can also list references at the end: "Coastal campaigns involved seaports [EPIGRAPH:ʿAbadān 1], [EPIGRAPH:Ir 31]."
           - NEVER write multiple titles in one marker like [EPIGRAPH:title1; EPIGRAPH:title2]
           - Do NOT include epigraph_id numbers or other metadata inside the brackets
        10. If the epigraphs don't contain enough information to fully answer the question, say so naturally
        11. Structure your response clearly and informatively with proper historical context
        12. Do not make up or infer information beyond what's in the epigraphs
        13. IMPORTANT: Never refer to "the data you provided", "the inscriptions you gave", "the epigraphs you shared", or similar phrases
            - The user only asked a question - they didn't provide any data
            - The system automatically retrieves relevant inscriptions from the database
            - Phrase responses naturally as "Based on the inscriptions...", "The evidence shows...", "According to the records...", etc.
        14. Use the complete epigraphic evidence including all scholarly annotations

        Respond as an expert historian drawing from complete ancient inscriptions with full scholarly apparatus, providing thorough and nuanced answers.
        """

        try:
            messages = [{"role": "system", "content": system_prompt}]

            if conversation_history:
                messages.extend(conversation_history)

            messages.append({
                "role": "user", 
                "content": f"Question: {user_query}\n\nComplete epigraphs from the database:\n{formatted_json}"
            })

            stream = self.client.chat.completions.create(
                model="gpt-5-mini",
                messages=messages,
                stream=True,
                stream_options={"include_usage": True}
            )

            full_response = ""
            usage_data = None

            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    yield {"type": "token", "content": content}

                if hasattr(chunk, 'usage') and chunk.usage is not None:
                    usage_data = chunk.usage

            logging.info(f"Full response: {full_response[:500]}...")

            if usage_data:
                logging.info(f"Token usage - Input: {usage_data.prompt_tokens}, Output: {usage_data.completion_tokens}, Total: {usage_data.total_tokens}")
            else:
                logging.warning("Token usage data not available from OpenAI")

            yield {"type": "epigraph_ids", "ids": list(epigraph_ids_used)}

            logging.info(f"Streaming completed using {len(formatted_epigraphs)} complete epigraphs")

        except Exception as e:
            logging.error(f"Error generating streaming answer with full epigraphs: {e}", exc_info=True)
            yield {"type": "error", "content": f"Error generating answer: {str(e)}"}
