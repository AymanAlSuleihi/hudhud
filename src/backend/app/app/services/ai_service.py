import json
import logging
import re
from typing import List, Dict, Any, Optional, Tuple, AsyncGenerator
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

    # GPT-5-mini
    INPUT_COST_PER_1M = 0.250  # $0.250 per 1M input tokens
    OUTPUT_COST_PER_1M = 2.000  # $2.000 per 1M output tokens

    def __init__(self):
        if hasattr(settings, "OPENAI_API_KEY"):
            self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        else:
            self.client = None
            logging.warning("OpenAI API key not configured. AI features will be disabled.")

    @staticmethod
    def calculate_cost(input_tokens: int, output_tokens: int) -> dict:
        """Calculate the cost of an API call based on token usage."""
        input_cost = (input_tokens / 1_000_000) * AIService.INPUT_COST_PER_1M
        output_cost = (output_tokens / 1_000_000) * AIService.OUTPUT_COST_PER_1M
        total_cost = input_cost + output_cost
        return {
            "input_cost": input_cost,
            "output_cost": output_cost,
            "total_cost": total_cost
        }

    def process_query(
        self, 
        user_query: str,
        conversation_history: List = None
    ) -> Tuple[str, Optional[str], str, List[str]]:
        """
        Combined query processing: classify intent + resolve search query in one LLM call.

        Returns:
            Tuple of (intent_type, direct_response, resolved_query, epigraph_titles)
            - intent_type: "domain" | "greeting" | "thanks" | "meta" | "help" | "unclear"
            - direct_response: Response if no search needed, None otherwise
            - resolved_query: Natural language search query for semantic search
            - epigraph_titles: List of specific epigraph titles mentioned
        """
        if not self.client:
            return "domain", None, user_query, []

        history_text = ""
        if conversation_history and len(conversation_history) > 0:
            history_text = "\n".join([
                f"{(msg.role if hasattr(msg, 'role') else msg['role']).capitalize()}: {(msg.content if hasattr(msg, 'content') else msg['content'])[:300]}" 
                for msg in conversation_history[-4:]
            ])

        system_prompt = """You are Hudhud's query processor. Process each user query by:
        1. Classifying the intent
        2. Resolving the search query (for domain queries)
        3. Extracting epigraph title references
        4. Providing direct responses (for non-domain queries)

        **BACKGROUND INFORMATION ABOUT HUDHUD (for meta queries):**
        - **Project**: Hudhud is a digital research database dedicated to Ancient South Arabian epigraphy and inscriptions, operated by Sheba's Caravan
        - **Operator**: Sheba's Caravan - Follow on [Instagram](https://instagram.com/shebascaravan)
        - **Contact**: For inquiries, email [contact@shebascaravan.com](mailto:contact@shebascaravan.com) or message on [Instagram](https://instagram.com/shebascaravan)
        - **Coverage**: Thousands of inscriptions from Ancient South Arabian kingdoms (Saba, Qataban, Hadramawt, Maʿīn, Awsān, etc.) dating from the late second millennium BC to the sixth century AD
        - **Data Source**: Epigraphic data sourced from DASI (Digital Archive for the Study of pre-Islamic Arabian Inscriptions)
        - **Technology**: Built with semantic search using AI embeddings for natural language queries, streaming responses, and comprehensive historical context
        - **Purpose**: Provides researchers, students, and enthusiasts with accessible, searchable access to Ancient South Arabian inscriptions with scholarly annotations, translations, and cultural context
        - **More Info**: Visit the [About page](/about) for details about the project

        **INTENT CATEGORIES:**
        - "domain": Questions about Ancient South Arabia, inscriptions, epigraphs, rulers, places, dates, archaeology, deities, languages, scripts, etc. (requires database search)
        - "greeting": Greetings, introductions, casual conversation starters (e.g., "hi", "hello", "good morning")
        - "thanks": Thank you messages, expressions of gratitude, appreciation
        - "meta": Questions about the website/system itself - who made it, how it works, data sources, contact info, technology
        - "help": Questions about how to use the system, what it can do, how to search, what data is available
        - "unclear": Ambiguous, nonsensical, or completely unrelated queries

        **QUERY RESOLUTION RULES (for domain queries):**
        - For follow-up queries like "tell me more", "search wider", "what else", use conversation history to identify the topic
        - For "search wider" requests, expand the topic naturally (e.g., "Karib il Watar" → "information about Karib il Watar and his reign in Saba")
        - For new standalone questions, return them as-is or slightly expanded
        - Write natural phrases, NOT keyword lists - the system uses semantic search with embeddings
        - Keep queries concise but natural (1-2 sentences max)
        - For Ancient South Arabian names, include both romanized and transliterated forms for better recall (e.g., "Karib il Watar" and "Krbʾl Wtr")
        - When users ask about specific epigraphs by title (e.g., "Ja 1028", "RES 4176"), extract these titles

        **DIRECT RESPONSE GUIDELINES (for non-domain queries):**
        - **greeting**: Warm welcome + brief intro to what Hudhud does + invite to ask questions
        - **thanks**: Polite acknowledgment + offer to help with more questions
        - **meta**: Use the background information provided. **IMPORTANT**: Format ALL links using markdown syntax [text](url). Keep responses concise but informative.
        - **help**: Concise explanation of capabilities + 2-3 example questions they can ask
        - **unclear**: null (will default to domain search to avoid missing edge cases)
        - **CRITICAL**: Always use markdown format for links: [Link Text](URL). Never use plain URLs.

        **RETURN FORMAT:**
        Return JSON with FOUR fields:
        - "intent": the category above
        - "direct_response": a response (ONLY if intent is NOT "domain" or "unclear"), otherwise null
        - "resolved_query": the natural language search query (ONLY if intent is "domain" or "unclear"), otherwise null
        - "titles": array of specific epigraph titles mentioned (e.g., ["Ja 1028", "RES 4176"]), empty array if none

        **EXAMPLES:**

        Input: "hi"
        Output: {"intent": "greeting", "direct_response": "Hello! I'm Hudhud, your guide to Ancient South Arabian inscriptions and epigraphy. I can help you explore thousands of texts from kingdoms like Saba, Qataban, Hadramawt, and more. What would you like to know?", "resolved_query": null, "titles": []}

        Input: "thank you so much!"
        Output: {"intent": "thanks", "direct_response": "You're very welcome! Feel free to ask if you have more questions about Ancient South Arabian history or inscriptions.", "resolved_query": null, "titles": []}

        Input: "who created this website?"
        Output: {"intent": "meta", "direct_response": "Hudhud is operated by Sheba's Caravan, a project dedicated to making Ancient South Arabian history more accessible. Learn more on the [About page](/about) or follow on [Instagram](https://instagram.com/shebascaravan)", "resolved_query": null, "titles": []}

        Input: "how do I contact you?"
        Output: {"intent": "meta", "direct_response": "You can reach us at [contact@shebascaravan.com](mailto:contact@shebascaravan.com), message us on [Instagram](https://instagram.com/shebascaravan), or visit our [About page](/about) for more information.", "resolved_query": null, "titles": []}

        Input: "what can you help me with?"
        Output: {"intent": "help", "direct_response": "I can help you explore Ancient South Arabian inscriptions! Ask me about:\\n- Specific epigraphs (e.g., 'What does RES 4176 say?')\\n- Historical figures (e.g., 'Tell me about Karib'il Watar')\\n- Sites and archaeology (e.g., 'What inscriptions are from Marib?')\\n- Deities and religion (e.g., 'Who was Almaqah?')\\n- Any historical topic from this region!", "resolved_query": null, "titles": []}

        Input: "tell me about Almaqah"
        Output: {"intent": "domain", "direct_response": null, "resolved_query": "tell me about Almaqah", "titles": []}

        Input: "what does RES 4176 say?"
        Output: {"intent": "domain", "direct_response": null, "resolved_query": "what does RES 4176 say", "titles": ["RES 4176"]}

        Input: "tell me about epigraph Ja 1028"
        Output: {"intent": "domain", "direct_response": null, "resolved_query": "information about Ja 1028", "titles": ["Ja 1028"]}

        Input: "show me Ja 1028 and RES 4176"
        Output: {"intent": "domain", "direct_response": null, "resolved_query": "inscriptions Ja 1028 RES 4176", "titles": ["Ja 1028", "RES 4176"]}

        Conversation history: "User: tell me about Karib il Watar\\nAssistant: [previous response]"
        Input: "search wider"
        Output: {"intent": "domain", "direct_response": null, "resolved_query": "Karib il Watar Krbʾl Wtr reign campaigns military activities Saba kingdom", "titles": []}

        Conversation history: "User: what inscriptions mention temples?\\nAssistant: [previous response]"
        Input: "tell me more"
        Output: {"intent": "domain", "direct_response": null, "resolved_query": "tell me more about temples and temple inscriptions in Ancient South Arabia", "titles": []}

        Return ONLY the JSON object."""

        user_prompt = f'User query: "{user_query}"'
        if history_text:
            user_prompt = f'Conversation history:\n{history_text}\n\n{user_prompt}'
        user_prompt += '\n\nReturn JSON with intent, direct_response, resolved_query, and titles:'

        try:
            response = self.client.responses.create(
                model="gpt-5-mini",
                input=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )

            result = response.output_text
            if not result:
                logging.warning(f"Empty response for query: {user_query}")
                return "domain", None, user_query, []

            if hasattr(response, 'usage'):
                input_tokens = response.usage.input_tokens
                output_tokens = response.usage.output_tokens
                costs = self.calculate_cost(input_tokens, output_tokens)
                logging.info(f"[process_query] Tokens - Input: {input_tokens}, Output: {output_tokens}")
                logging.info(f"[process_query] Costs - Input: ${costs['input_cost']:.6f}, Output: ${costs['output_cost']:.6f}, Total: ${costs['total_cost']:.6f}")

            parsed = json.loads(result.strip())
            intent = parsed.get("intent", "unclear")
            direct_response = parsed.get("direct_response")
            resolved_query = parsed.get("resolved_query", user_query)
            titles = parsed.get("titles", [])

            if intent == "unclear":
                intent = "domain"
                resolved_query = user_query if not resolved_query else resolved_query

            if intent == "domain" and not resolved_query:
                resolved_query = user_query

            logging.info(f"Query processed - Intent: {intent}, Titles: {titles}, Resolved: {resolved_query[:100] if resolved_query else None}")

            return intent, direct_response, resolved_query or user_query, titles

        except Exception as e:
            logging.error(f"Error processing query: {e}")
            return "domain", None, user_query, []

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

        CRITICAL: The user did NOT provide any data. The system automatically retrieves inscriptions from the database based on their query. NEVER say "you provided", "you gave", "in the data you provided", or similar phrases. Instead use: "Based on the inscriptions...", "The database shows...", "The available evidence...", "According to the records...", etc.

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
        7. Consider the source type (translation, cultural_notes, etc.) when interpreting content

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

            if hasattr(response, 'usage'):
                input_tokens = response.usage.input_tokens
                output_tokens = response.usage.output_tokens
                costs = self.calculate_cost(input_tokens, output_tokens)
                logging.info(f"[generate_answer_with_chunks] Tokens - Input: {input_tokens}, Output: {output_tokens}")
                logging.info(f"[generate_answer_with_chunks] Costs - Input: ${costs['input_cost']:.6f}, Output: ${costs['output_cost']:.6f}, Total: ${costs['total_cost']:.6f}")

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

        CRITICAL: The user did NOT provide any data. The system automatically retrieves inscriptions from the database based on their query. NEVER say "you provided", "you gave", "in the data you provided", or similar phrases. Instead use: "Based on the inscriptions...", "The database shows...", "The available evidence...", "According to the records...", etc.

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
        7. Consider the source type (translation, cultural_notes, etc.) when interpreting content

        Respond as an expert historian drawing from the inscription database, providing scholarly context.
        """

        try:
            logging.info(f"Starting streaming response for query: {user_query}")

            messages = [{"role": "system", "content": system_prompt}]

            if conversation_history:
                messages.extend(conversation_history)

            messages.append({
                "role": "user", 
                "content": f"Question: {user_query}\n\n[System retrieved these relevant excerpts from inscriptions]:\n{formatted_json}"
            })

            stream = self.client.responses.create(
                model="gpt-5-mini",
                input=messages,
                stream=True
            )

            input_tokens = 0
            output_tokens = 0
            accumulated_output = ""

            for event in stream:
                if event.type == "response.output_text.delta":
                    content = event.delta
                    accumulated_output += content
                    yield {"type": "token", "content": content}

                elif event.type == "response.completed":
                    if hasattr(event, 'response') and event.response:
                        if hasattr(event.response, 'usage') and event.response.usage:
                            input_tokens = event.response.usage.input_tokens
                            output_tokens = event.response.usage.output_tokens

            if input_tokens > 0 or output_tokens > 0:
                costs = self.calculate_cost(input_tokens, output_tokens)
                logging.info(f"[generate_answer_with_chunks_streaming] Tokens - Input: {input_tokens}, Output: {output_tokens}")
                logging.info(f"[generate_answer_with_chunks_streaming] Costs - Input: ${costs['input_cost']:.6f}, Output: ${costs['output_cost']:.6f}, Total: ${costs['total_cost']:.6f}")
            else:
                logging.warning(f"[generate_answer_with_chunks_streaming] No token usage data available")

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
                    "id",
                    "uri",
                    "created_at",
                    "updated_at",
                    "first_published",
                    "last_modified",
                    "bibliography",
                    "license",
                    "dasi_object",
                    "sites",
                    "embedding",
                    "objects",
                    "sites_objs",
                    "words",
                },
            )

            if epigraph_info.get("epigraph_text"):
                cleaned = re.sub(r'<[^>]+>', '', epigraph_info["epigraph_text"])
                cleaned = re.sub(r'\s+', ' ', cleaned)

                epigraph_info["epigraph_text_cleaned"] = cleaned

            if hasattr(epigraph, 'sites_objs') and epigraph.sites_objs:
                epigraph_info["sites_objs"] = [
                    site.model_dump(
                        include={
                            "dasi_id",
                            "modern_name", 
                            "ancient_name",
                            "country",
                            "governorate",
                            "geographical_area",
                            "type_of_site",
                            "kingdom",
                        }
                    )
                    for site in epigraph.sites_objs[:1]
                ]
            else:
                epigraph_info["sites_objs"] = []

            if hasattr(epigraph, 'objects') and epigraph.objects:
                epigraph_info["objects"] = [
                    obj.model_dump(exclude={
                        "id",
                        "uri",
                        "embedding",
                        "created_at",
                        "updated_at",
                        "first_published",
                        "last_modified",
                        "dasi_object",
                        "bibliography",
                        "concordances",
                        "license",
                        "editors",
                        "epigraphs",
                        "sites",
                    })
                    for obj in epigraph.objects
                ]
                    
                logging.info(f"Epigraph {epigraph.title} has {len(epigraph_info['objects'])} objects")
                for obj in epigraph_info['objects']:
                    if obj.get('decorations'):
                        logging.info(f"  Object {obj.get('title', 'Unknown')} has decorations: {obj['decorations'][:200] if isinstance(obj['decorations'], str) else str(obj['decorations'])[:200]}")
            else:
                epigraph_info["objects"] = []
                logging.debug(f"Epigraph {epigraph.title} has no objects")

            formatted_epigraphs.append(epigraph_info)

        formatted_json = json.dumps(formatted_epigraphs, indent=2, ensure_ascii=False)

        system_prompt = """
        You are Hudhud, a knowledgeable historian specialising in Ancient South Arabia and epigraphy. 
        You have access to a database of ancient inscriptions and can search them to answer questions.
        Use the complete epigraphs provided to answer the user's question accurately.

        CRITICAL: The user did NOT provide any data. The system automatically retrieves inscriptions from the database based on their query. NEVER say "you provided", "you gave", "in the set you gave", "the inscriptions you shared", or similar phrases. Instead use: "Based on the inscriptions...", "The database contains...", "The available evidence shows...", "According to the records...", etc.

        Each epigraph includes comprehensive information:
        - Original inscription text (provided in both XML markup and plain text formats)
        - Complete translations with translation notes
        - Historical context: ID, title, period, chronology certainty, and mentioned dates
        - Linguistic details: language hierarchy and script typology
        - Textual classification: textual typology and whether it's a royal inscription
        - Cultural notes: scholarly commentary on religious, social, and cultural aspects
        - Apparatus notes: technical philological notes on specific lines
        - General notes: broader scholarly context and interpretations
        - Archaeological context: site information and object descriptions
        - **Physical appearance and decorations**: When an epigraph has associated "objects", the objects array contains detailed decoration information including:
          * figurativeSubjects: detailed descriptions of depicted subjects (animals, humans, symbols, monograms)
          * subjectLevel1 and subjectLevel2: hierarchical classification of depicted subjects (e.g., "Animal" > "Snake", "Symbol" > "Crescent moon")
          * Materials, shape, measurements, support types
          * Deposit information and cultural notes about the physical objects
          * **CRITICAL**: For questions about physical appearance, symbols, depictions, decorations, or what's shown on objects, ALWAYS check the "objects" array and its "decorations" field

        When responding:
        1. Draw from the full context of each epigraph, including all available scholarly notes
        2. Consider cultural_notes for religious and social context
        3. Use apparatus_notes for linguistic and philological details
        4. Reference general_notes for broader historical interpretations
        5. Mention site and object information when relevant to the question
        6. **IMPORTANT: For questions about physical appearance, symbols, animals, or decorations, examine the objects array and specifically look at the decorations field with figurativeSubjects**
        7. Distinguish between royal inscriptions and other types when relevant
        8. Synthesise information from multiple epigraphs when appropriate
        9. **CRITICAL: When quoting inscription text, use natural language**
           - Simply present the text naturally as "the inscription reads", "the text says", "the opening lines are", etc.
           - NEVER mention technical field names like "epigraph_text_cleaned", "epigraph_text", or other database fields
           - Quote the plain text version (without XML markup) when showing inscription content
           - Present excerpts naturally without referencing how the data is stored internally
        10. Reference specific epigraph titles when citing information - IMPORTANT: 
           - Wrap ONLY the epigraph_title value (without any other metadata) in the format [EPIGRAPH:title]
           - Each epigraph must have its own separate [EPIGRAPH:...] marker
           - You can reference epigraphs inline: "The inscription [EPIGRAPH:RES 4176] mentions..." or "According to [EPIGRAPH:MIbb 72]..."
           - You can also list references at the end: "Coastal campaigns involved seaports [EPIGRAPH:ʿAbadān 1], [EPIGRAPH:Ir 31]."
           - NEVER write multiple titles in one marker like [EPIGRAPH:title1; EPIGRAPH:title2]
           - Do NOT include epigraph_id numbers or other metadata inside the brackets
        11. If the epigraphs don't contain enough information to fully answer the question, say so naturally
        12. Structure your response clearly and informatively with proper historical context
        13. Do not make up or infer information beyond what's in the epigraphs
        14. Use the complete epigraphic evidence including all scholarly annotations

        Respond as an expert historian drawing from complete ancient inscriptions with full scholarly apparatus, providing thorough and nuanced answers.
        """

        try:
            messages = [{"role": "system", "content": system_prompt}]

            if conversation_history:
                messages.extend(conversation_history)

            messages.append({
                "role": "user", 
                "content": f"Question: {user_query}\n\n[System retrieved these epigraphs from the database for context]:\n{formatted_json}"
            })

            stream = self.client.responses.create(
                model="gpt-5-mini",
                input=messages,
                stream=True
            )

            full_response = ""
            input_tokens = 0
            output_tokens = 0

            for event in stream:
                if event.type == "response.output_text.delta":
                    content = event.delta
                    full_response += content
                    yield {"type": "token", "content": content}

                elif event.type == "response.completed":
                    if hasattr(event, 'response') and event.response:
                        if hasattr(event.response, 'usage') and event.response.usage:
                            input_tokens = event.response.usage.input_tokens
                            output_tokens = event.response.usage.output_tokens

            logging.info(f"Full response: {full_response[:500]}...")

            if input_tokens > 0 or output_tokens > 0:
                costs = self.calculate_cost(input_tokens, output_tokens)
                logging.info(f"[generate_answer_with_epigraphs_streaming] Tokens - Input: {input_tokens}, Output: {output_tokens}")
                logging.info(f"[generate_answer_with_epigraphs_streaming] Costs - Input: ${costs['input_cost']:.6f}, Output: ${costs['output_cost']:.6f}, Total: ${costs['total_cost']:.6f}")
            else:
                logging.warning(f"[generate_answer_with_epigraphs_streaming] No token usage data available")

            yield {"type": "epigraph_ids", "ids": list(epigraph_ids_used)}

            logging.info(f"Streaming completed using {len(formatted_epigraphs)} complete epigraphs")

        except Exception as e:
            logging.error(f"Error generating streaming answer with full epigraphs: {e}", exc_info=True)
            yield {"type": "error", "content": f"Error generating answer: {str(e)}"}
