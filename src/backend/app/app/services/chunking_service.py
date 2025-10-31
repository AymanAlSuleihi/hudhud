import logging
import re
from typing import List, Dict, Any, Optional
from sqlmodel import Session, select, func
import tiktoken
import numpy as np

from app.models.epigraph import Epigraph
from app.models.epigraph_chunk import EpigraphChunk, EpigraphChunkCreate
from app.models.site import Site
from app.crud.crud_epigraph_chunk import epigraph_chunk as crud_epigraph_chunk
from app.services.embeddings_service import EmbeddingsService

logging.basicConfig(
    filename="epigraph_search.log",
    level=logging.DEBUG,
    format="%(asctime)s - %(message)s",
    datefmt="%d-%b-%y %H:%M:%S",
)


class ChunkingService:
    """
    Service for chunking epigraphs into smaller, semantically meaningful pieces.
    """

    def __init__(self, session: Session):
        self.session = session
        try:
            self.tokenizer = tiktoken.encoding_for_model("text-embedding-3-large")
        except Exception as e:
            logging.warning(f"Failed to load tiktoken encoder: {e}. Using cl100k_base.")
            self.tokenizer = tiktoken.get_encoding("cl100k_base")

        self.spacy_nlp = None
        try:
            import spacy
            self.spacy_nlp = spacy.load("en_core_web_sm", disable=["ner", "tagger", "lemmatizer"])
            if not self.spacy_nlp.has_pipe("parser"):
                if not self.spacy_nlp.has_pipe("sentencizer"):
                    self.spacy_nlp.add_pipe("sentencizer")
            logging.info("Loaded spaCy for advanced sentence splitting")
        except Exception as e:
            logging.info(f"spaCy not available, using regex-based sentence splitting: {e}")

        self.max_chunk_tokens = 512
        self.overlap_sentences = 1
        self.semantic_threshold = 0.7

    def chunk_epigraph(self, epigraph: Epigraph) -> List[Dict[str, Any]]:
        """Chunk an epigraph into smaller pieces based on semantic boundaries."""
        chunks = []

        base_metadata = {
            "title": epigraph.title,
            "dasi_id": epigraph.dasi_id,
            "period": epigraph.period,
            "language": f"{epigraph.language_level_1 or ''} > {epigraph.language_level_2 or ''} > {epigraph.language_level_3 or ''}".strip(),
            "textual_typology": epigraph.textual_typology,
            "royal_inscription": epigraph.royal_inscription,
        }

        if epigraph.sites_objs:
            base_metadata["site_ids"] = [site.dasi_id for site in epigraph.sites_objs if hasattr(site, 'dasi_id')]
            base_metadata["site_names"] = [
                getattr(site, 'modern_name', None) or getattr(site, 'name', None) 
                for site in epigraph.sites_objs 
                if hasattr(site, 'modern_name') or hasattr(site, 'name')
            ]

        if epigraph.editors:
            base_metadata["epigraph_editors"] = self._format_editors(epigraph.editors)

        if epigraph.bibliography:
            base_metadata["epigraph_bibliography"] = self._format_bibliography(epigraph.bibliography)

        if epigraph.epigraph_text and epigraph.epigraph_text.strip():
            clean_text = re.sub(r'<[^>]+>', '', epigraph.epigraph_text)
            clean_text = clean_text.strip()

            if len(clean_text) > 5:
                chunk_text = f"{epigraph.title}: {clean_text}"
                tokens = len(self.tokenizer.encode(chunk_text))

                chunks.append({
                    "text": chunk_text,
                    "type": "epigraph_text",
                    "index": 0,
                    "tokens": tokens,
                    "metadata": base_metadata
                })
                logging.debug(f"Created epigraph text chunk for {epigraph.title}")

        if epigraph.translations:
            trans_chunks = self._process_translations(
                epigraph.translations,
                base_metadata
            )
            chunks.extend(trans_chunks)
            logging.debug(f"Created {len(trans_chunks)} translation chunks for {epigraph.title}")

        if epigraph.cultural_notes:
            cultural_chunks = self._process_notes_array(
                epigraph.cultural_notes,
                chunk_type="cultural_notes",
                base_metadata=base_metadata
            )
            chunks.extend(cultural_chunks)
            logging.debug(f"Created {len(cultural_chunks)} cultural note chunks for {epigraph.title}")

        if epigraph.apparatus_notes:
            apparatus_chunks = self._process_notes_array(
                epigraph.apparatus_notes,
                chunk_type="apparatus_notes",
                base_metadata=base_metadata
            )
            chunks.extend(apparatus_chunks)
            logging.debug(f"Created {len(apparatus_chunks)} apparatus note chunks for {epigraph.title}")

        if epigraph.general_notes and epigraph.general_notes.strip():
            general_chunks = self._chunk_long_text(
                epigraph.general_notes,
                chunk_type="general_notes",
                metadata=base_metadata
            )
            chunks.extend(general_chunks)
            logging.debug(f"Created {len(general_chunks)} general note chunks for {epigraph.title}")

        if hasattr(epigraph, 'support_notes') and epigraph.support_notes and epigraph.support_notes.strip():
            support_chunks = self._chunk_long_text(
                epigraph.support_notes,
                chunk_type="support_notes",
                metadata=base_metadata
            )
            chunks.extend(support_chunks)
            logging.debug(f"Created {len(support_chunks)} support note chunks for {epigraph.title}")

        if hasattr(epigraph, 'deposit_notes') and epigraph.deposit_notes and epigraph.deposit_notes.strip():
            deposit_chunks = self._chunk_long_text(
                epigraph.deposit_notes,
                chunk_type="deposit_notes",
                metadata=base_metadata
            )
            chunks.extend(deposit_chunks)
            logging.debug(f"Created {len(deposit_chunks)} deposit note chunks for {epigraph.title}")

        if epigraph.objects:
            object_chunks = self._process_objects(
                epigraph.objects,
                base_metadata
            )
            chunks.extend(object_chunks)
            logging.debug(f"Created {len(object_chunks)} object description chunks for {epigraph.title}")

        logging.info(f"Total chunks created for {epigraph.title}: {len(chunks)}")
        return chunks

    def _format_editors(self, editors: List[Dict[str, Any]]) -> List[str]:
        """Format editors array into readable strings."""
        formatted = []
        if not editors or not isinstance(editors, list):
            return formatted

        for editor in editors:
            if not isinstance(editor, dict):
                continue

            parts = []
            if editor.get("name"):
                parts.append(editor["name"])
            if editor.get("responsibility"):
                parts.append(f"({editor['responsibility']})")
            if editor.get("date"):
                parts.append(f"[{editor['date']}]")

            if parts:
                formatted.append(" ".join(parts))

        return formatted

    def _format_bibliography(self, bibliography: List[Dict[str, Any]]) -> List[str]:
        """Format bibliography array into readable citation strings."""
        formatted = []
        if not bibliography or not isinstance(bibliography, list):
            return formatted

        for bib in bibliography:
            if not isinstance(bib, dict):
                continue

            parts = []

            if bib.get("reference"):
                parts.append(bib["reference"])
            elif bib.get("reference_short"):
                parts.append(bib["reference_short"])
            elif bib.get("first_authors"):
                parts.append(bib["first_authors"])

            if bib.get("page"):
                parts.append(f"p. {bib['page']}")

            if bib.get("quotation_label"):
                parts.append(f"[{bib['quotation_label']}]")

            if parts:
                formatted.append(" ".join(parts))

        return formatted

    def _process_translations(
        self,
        translations: List[Dict[str, Any]],
        base_metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Process translation array into chunks, including translation notes."""
        chunks = []

        for idx, translation in enumerate(translations):
            if not isinstance(translation, dict):
                continue

            text = translation.get("text", "")
            if not text or not text.strip():
                continue

            lang = translation.get("language") or translation.get("lang", "Unknown")

            label = translation.get("label")
            editors = translation.get("editors", [])
            bibliography = translation.get("bibliography", [])

            trans_metadata = {
                **base_metadata,
                "translation_language": lang,
                "translation_index": idx,
            }

            if label:
                trans_metadata["translation_label"] = label

            if editors:
                trans_metadata["translation_editors"] = self._format_editors(editors)

            if bibliography:
                trans_metadata["translation_bibliography"] = self._format_bibliography(bibliography)

            tokens = len(self.tokenizer.encode(text))

            if tokens <= self.max_chunk_tokens:
                chunks.append({
                    "text": text.strip(),
                    "type": "translation",
                    "index": idx,
                    "tokens": tokens,
                    "metadata": trans_metadata
                })
            else:
                sub_chunks = self._chunk_long_text(
                    text,
                    chunk_type="translation",
                    metadata=trans_metadata
                )
                chunks.extend(sub_chunks)

            translation_notes = translation.get("notes", [])
            if translation_notes and isinstance(translation_notes, list):
                for note_idx, note in enumerate(translation_notes):
                    if not isinstance(note, dict):
                        continue

                    note_text = note.get("note", "")
                    if not note_text or not note_text.strip():
                        continue

                    note_metadata = {
                        **base_metadata,
                        "translation_language": lang,
                        "translation_index": idx,
                        "note_index": note_idx,
                        "note_type": "translation_note",
                    }

                    if "line" in note:
                        note_metadata["lines"] = note["line"]

                    note_tokens = len(self.tokenizer.encode(note_text))

                    if note_tokens <= self.max_chunk_tokens:
                        chunks.append({
                            "text": note_text.strip(),
                            "type": "translation_notes",
                            "index": len(chunks),
                            "tokens": note_tokens,
                            "metadata": note_metadata
                        })
                    else:
                        sub_chunks = self._chunk_long_text(
                            note_text,
                            chunk_type="translation_notes",
                            metadata=note_metadata
                        )
                        chunks.extend(sub_chunks)

        return chunks

    def _process_notes_array(
        self,
        notes_array: List[Dict[str, Any]],
        chunk_type: str,
        base_metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Process an array of note objects (cultural_notes, apparatus_notes)."""
        chunks = []

        for idx, note in enumerate(notes_array):
            if not isinstance(note, dict):
                continue

            text = note.get("text") or note.get("note") or note.get("content", "")
            if not text or not text.strip():
                continue

            note_metadata = {**base_metadata}

            if "topic" in note:
                note_metadata["topic"] = note["topic"]
            if "line" in note or "lines" in note:
                note_metadata["lines"] = note.get("line") or note.get("lines")
            if "language" in note:
                note_metadata["note_language"] = note["language"]

            note_metadata["note_index"] = idx

            tokens = len(self.tokenizer.encode(text))

            if tokens <= self.max_chunk_tokens:
                chunks.append({
                    "text": text.strip(),
                    "type": chunk_type,
                    "index": idx,
                    "tokens": tokens,
                    "metadata": note_metadata
                })
            else:
                sub_chunks = self._chunk_long_text(
                    text,
                    chunk_type=chunk_type,
                    metadata=note_metadata
                )
                chunks.extend(sub_chunks)

        return chunks

    def _process_objects(
        self,
        objects: List[Any],
        base_metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Extract meaningful descriptions from object data."""
        chunks = []

        for idx, obj in enumerate(objects):
            if not hasattr(obj, '__dict__'):
                continue

            description_parts = []

            support_types = []
            if hasattr(obj, 'support_type_level_1') and obj.support_type_level_1:
                support_types.append(obj.support_type_level_1)
            if hasattr(obj, 'support_type_level_2') and obj.support_type_level_2:
                support_types.append(obj.support_type_level_2)
            if hasattr(obj, 'support_type_level_3') and obj.support_type_level_3:
                support_types.append(obj.support_type_level_3)
            if hasattr(obj, 'support_type_level_4') and obj.support_type_level_4:
                support_types.append(obj.support_type_level_4)

            if support_types:
                description_parts.append(f"Support type: {' > '.join(support_types)}")

            if hasattr(obj, 'materials') and obj.materials:
                materials_str = ", ".join(obj.materials) if isinstance(obj.materials, list) else str(obj.materials)
                description_parts.append(f"Material: {materials_str}")

            if hasattr(obj, 'shape') and obj.shape:
                description_parts.append(f"Shape: {obj.shape}")

            if hasattr(obj, 'description') and obj.description:
                description_parts.append(obj.description)

            if hasattr(obj, 'deposits') and obj.deposits:
                deposit_info = []
                for deposit in obj.deposits if isinstance(obj.deposits, list) else [obj.deposits]:
                    if isinstance(deposit, dict):
                        if deposit.get('settlement'):
                            deposit_info.append(f"From {deposit['settlement']}")

                        if deposit.get('institution'):
                            deposit_info.append(f"housed at {deposit['institution']}")
                        elif deposit.get('repository'):
                            deposit_info.append(f"housed at {deposit['repository']}")

                        if deposit.get('identificationNumber'):
                            deposit_info.append(f"({deposit['identificationNumber']})")

                if deposit_info:
                    description_parts.append(" ".join(deposit_info))

            if hasattr(obj, 'decorations') and obj.decorations:
                decor_texts = []
                decorations = obj.decorations if isinstance(obj.decorations, list) else [obj.decorations]

                for decor in decorations:
                    if isinstance(decor, dict):
                        if decor.get('typeLevel1'):
                            decor_texts.append(f"Type: {decor['typeLevel1']}")
                        if decor.get('typeLevel2'):
                            decor_texts.append(f"Subtype: {decor['typeLevel2']}")

                        if 'figurativeSubjects' in decor:
                            subjects = decor['figurativeSubjects']
                            if isinstance(subjects, list):
                                for subj_idx, subj in enumerate(subjects):
                                    if isinstance(subj, dict):
                                        subj_parts = []

                                        if subj.get('subjectLevel1'):
                                            subj_parts.append(f"Subject: {subj['subjectLevel1']}")
                                        if subj.get('subjectLevel2'):
                                            subj_parts.append(f"Detail: {subj['subjectLevel2']}")
                                        if subj.get('view'):
                                            subj_parts.append(f"View: {subj['view']}")

                                        if subj.get('humanGender'):
                                            subj_parts.append(f"Gender: {subj['humanGender']}")
                                        if subj.get('partOfHumanBody'):
                                            subj_parts.append(f"Body part: {subj['partOfHumanBody']}")
                                        if subj.get('humanClothes'):
                                            clothes = subj['humanClothes']
                                            if isinstance(clothes, list):
                                                subj_parts.append(f"Clothes: {', '.join(clothes)}")
                                        if subj.get('humanWeapons'):
                                            weapons = subj['humanWeapons']
                                            if isinstance(weapons, list):
                                                subj_parts.append(f"Weapons: {', '.join(weapons)}")
                                        if subj.get('humanGestures'):
                                            gestures = subj['humanGestures']
                                            if isinstance(gestures, list):
                                                subj_parts.append(f"Gestures: {', '.join(gestures)}")
                                        if subj.get('humanJewellery'):
                                            jewellery = subj['humanJewellery']
                                            if isinstance(jewellery, list):
                                                subj_parts.append(f"Jewellery: {', '.join(jewellery)}")

                                        if subj.get('partOfAnimalBody'):
                                            subj_parts.append(f"Animal part: {subj['partOfAnimalBody']}")
                                        if subj.get('animalGestures'):
                                            animal_gest = subj['animalGestures']
                                            if isinstance(animal_gest, list):
                                                subj_parts.append(f"Animal gestures: {', '.join(animal_gest)}")

                                        if subj.get('symbolShape'):
                                            subj_parts.append(f"Symbol: {subj['symbolShape']}")
                                        if subj.get('symbolReference'):
                                            subj_parts.append(f"Reference: {subj['symbolReference']}")
                                        if subj.get('symbolReferenceText'):
                                            subj_parts.append(f"({subj['symbolReferenceText']})")

                                        if subj.get('monogramName'):
                                            subj_parts.append(f"Monogram: {subj['monogramName']}")

                                        if subj_parts:
                                            decor_texts.append(f"Figure {subj_idx + 1}: " + ", ".join(subj_parts))

                if decor_texts:
                    description_parts.append("Decorations: " + "; ".join(decor_texts))

            if hasattr(obj, 'cultural_notes') and obj.cultural_notes:
                if isinstance(obj.cultural_notes, list):
                    for note in obj.cultural_notes:
                        if isinstance(note, dict):
                            note_text = note.get('note', '')
                            if note_text and len(note_text.strip()) > 0:
                                description_parts.append(note_text.strip())
                        elif isinstance(note, str) and len(note.strip()) > 0:
                            description_parts.append(note.strip())
                elif isinstance(obj.cultural_notes, str) and len(obj.cultural_notes.strip()) > 0:
                    description_parts.append(obj.cultural_notes.strip())

            if hasattr(obj, 'deposit_notes') and obj.deposit_notes:
                if isinstance(obj.deposit_notes, str) and len(obj.deposit_notes.strip()) > 0:
                    description_parts.append(obj.deposit_notes.strip())

            if hasattr(obj, 'support_notes') and obj.support_notes:
                if isinstance(obj.support_notes, str) and len(obj.support_notes) > 20:
                    description_parts.append(obj.support_notes)

            if not description_parts:
                continue

            text = ". ".join(description_parts)
            tokens = len(self.tokenizer.encode(text))

            chunks.append({
                "text": text,
                "type": "object_description",
                "index": idx,
                "tokens": tokens,
                "metadata": {
                    **base_metadata,
                    "object_index": idx,
                    "materials": getattr(obj, 'materials', None),
                }
            })

        return chunks

    def chunk_site(self, site: Any) -> Optional[Dict[str, Any]]:
        """Chunk a single site into a searchable text chunk."""
        if not (hasattr(site, '__dict__') or isinstance(site, dict)):
            return None

        description_parts = []

        name = getattr(site, 'modern_name', None) if hasattr(site, 'modern_name') else site.get("modern_name") or site.get("name")
        ancient_name = getattr(site, 'ancient_name', None) if hasattr(site, 'ancient_name') else site.get("ancient_name")

        if name:
            description_parts.append(f"Site: {name}")
        if ancient_name and ancient_name != "Unknown":
            description_parts.append(f"(ancient name: {ancient_name})")

        location_parts = []
        geographical_area = getattr(site, 'geographical_area', None) if hasattr(site, 'geographical_area') else site.get("geographical_area")
        governorate = getattr(site, 'governorate', None) if hasattr(site, 'governorate') else site.get("governorate")
        country = getattr(site, 'country', None) if hasattr(site, 'country') else site.get("country")

        if geographical_area:
            location_parts.append(geographical_area)
        if governorate:
            location_parts.append(governorate)
        if country:
            location_parts.append(country)

        if location_parts:
            description_parts.append(f"Located in {', '.join(location_parts)}")

        site_type = getattr(site, 'type_of_site', None) if hasattr(site, 'type_of_site') else site.get("type_of_site")
        if site_type:
            description_parts.append(f"Type: {site_type}")

        kingdom = getattr(site, 'kingdom', None) if hasattr(site, 'kingdom') else site.get("kingdom")
        if kingdom:
            if isinstance(kingdom, list):
                description_parts.append(f"Part of {', '.join(kingdom)} kingdom")
            else:
                description_parts.append(f"Part of {kingdom} kingdom")

        deities = getattr(site, 'deities', None) if hasattr(site, 'deities') else site.get("deities")
        if deities:
            if isinstance(deities, list) and len(deities) > 0:
                deity_list = ", ".join(deities[:8])
                if len(deities) > 8:
                    deity_list += f" and {len(deities) - 8} others"
                description_parts.append(f"Associated deities: {deity_list}")

        language = getattr(site, 'language', None) if hasattr(site, 'language') else site.get("language")
        if language:
            description_parts.append(f"Language: {language}")

        description = getattr(site, 'description', None) if hasattr(site, 'description') else site.get("description")
        if description:
            description_parts.append(description)

        identification = getattr(site, 'identification', None) if hasattr(site, 'identification') else site.get("identification")
        if identification:
            description_parts.append(f"Identification: {identification}")

        # TODO: Add tribes/lineages up to a limit to avoid noise
        # Or consider filters

        if not description_parts:
            return None

        text = ". ".join(description_parts)
        tokens = len(self.tokenizer.encode(text))

        site_id = getattr(site, 'id', None) if hasattr(site, 'id') else site.get("id")
        dasi_id = getattr(site, 'dasi_id', None) if hasattr(site, 'dasi_id') else site.get("dasi_id")

        return {
            "text": text,
            "type": "site_information",
            "index": 0,
            "tokens": tokens,
            "metadata": {
                "site_id": site_id,
                "dasi_id": dasi_id,
                "site_name": name,
                "ancient_name": ancient_name if ancient_name != "Unknown" else None,
                "site_type": site_type,
                "kingdom": kingdom,
                "geographical_area": geographical_area,
                "governorate": governorate,
                "country": country,
            }
        }

    def chunk_all_sites(self) -> List[Dict[str, Any]]:
        """Chunk all unique sites in the database."""
        sites = self.session.exec(select(Site)).all()

        site_chunks = []
        for site in sites:
            chunk = self.chunk_site(site)
            if chunk:
                site_chunks.append(chunk)

        logging.info(f"Created {len(site_chunks)} site chunks from {len(sites)} total sites")
        return site_chunks

    def _process_sites(
        self,
        sites: List[Any],
        base_metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Process site information into chunks."""
        chunks = []

        for idx, site in enumerate(sites):
            if not (hasattr(site, '__dict__') or isinstance(site, dict)):
                continue

            description_parts = []

            name = getattr(site, 'modern_name', None) if hasattr(site, 'modern_name') else site.get("modern_name") or site.get("name")
            ancient_name = getattr(site, 'ancient_name', None) if hasattr(site, 'ancient_name') else site.get("ancient_name")

            if name:
                description_parts.append(f"Site: {name}")
            if ancient_name and ancient_name != "Unknown":
                description_parts.append(f"(ancient name: {ancient_name})")

            location_parts = []
            geographical_area = getattr(site, 'geographical_area', None) if hasattr(site, 'geographical_area') else site.get("geographical_area")
            governorate = getattr(site, 'governorate', None) if hasattr(site, 'governorate') else site.get("governorate")
            country = getattr(site, 'country', None) if hasattr(site, 'country') else site.get("country")

            if geographical_area:
                location_parts.append(geographical_area)
            if governorate:
                location_parts.append(governorate)
            if country:
                location_parts.append(country)

            if location_parts:
                description_parts.append(f"Located in {', '.join(location_parts)}")

            site_type = getattr(site, 'type_of_site', None) if hasattr(site, 'type_of_site') else site.get("type_of_site")
            if site_type:
                description_parts.append(f"Type: {site_type}")

            kingdom = getattr(site, 'kingdom', None) if hasattr(site, 'kingdom') else site.get("kingdom")
            if kingdom:
                if isinstance(kingdom, list):
                    description_parts.append(f"Part of {', '.join(kingdom)} kingdom")
                else:
                    description_parts.append(f"Part of {kingdom} kingdom")

            deities = getattr(site, 'deities', None) if hasattr(site, 'deities') else site.get("deities")
            if deities:
                if isinstance(deities, list) and len(deities) > 0:
                    deity_list = ", ".join(deities[:8])
                    if len(deities) > 8:
                        deity_list += f" and {len(deities) - 8} others"
                    description_parts.append(f"Associated deities: {deity_list}")

            language = getattr(site, 'language', None) if hasattr(site, 'language') else site.get("language")
            if language:
                description_parts.append(f"Language: {language}")

            description = getattr(site, 'description', None) if hasattr(site, 'description') else site.get("description")
            if description:
                description_parts.append(description)

            identification = getattr(site, 'identification', None) if hasattr(site, 'identification') else site.get("identification")
            if identification:
                description_parts.append(f"Identification: {identification}")

            # TODO: Add tribes/lineages up to a limit to avoid noise
            # Or consider filters

            if not description_parts:
                continue

            text = ". ".join(description_parts)
            tokens = len(self.tokenizer.encode(text))

            chunks.append({
                "text": text,
                "type": "site_information",
                "index": idx,
                "tokens": tokens,
                "metadata": {
                    **base_metadata,
                    "site_name": name,
                    "ancient_name": ancient_name if ancient_name != "Unknown" else None,
                    "site_index": idx,
                    "site_type": site_type,
                    "kingdom": kingdom,
                }
            })

        return chunks

    def _chunk_long_text(
        self,
        text: str,
        chunk_type: str,
        metadata: Dict[str, Any],
        use_semantic_chunking: bool = False
    ) -> List[Dict[str, Any]]:
        """Chunk long text with optional semantic chunking."""
        return self._chunk_long_text_semantic(
            text,
            chunk_type,
            metadata,
            use_embeddings=use_semantic_chunking
        )

    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences using spaCy's trained sentence boundary detection."""
        if not text or not text.strip():
            return []

        if self.spacy_nlp:
            try:
                doc = self.spacy_nlp(text)
                sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
                if sentences:
                    return sentences
            except Exception as e:
                logging.warning(f"spaCy sentence splitting failed: {e}")
                return []

        logging.warning("spaCy not available for sentence splitting. Install with: pip install spacy && python -m spacy download en_core_web_sm")
        return [text.strip()]

    def _chunk_long_text_semantic(
        self,
        text: str,
        chunk_type: str,
        metadata: Dict[str, Any],
        use_embeddings: bool = False
    ) -> List[Dict[str, Any]]:
        """Chunk long text using semantic similarity to determine boundaries."""
        sentences = self._split_sentences(text)

        if not sentences:
            return []

        if use_embeddings:
            try:
                embeddings_service = EmbeddingsService(self.session)
                return self._semantic_chunking_with_embeddings(
                    sentences, 
                    chunk_type, 
                    metadata, 
                    embeddings_service
                )
            except Exception as e:
                logging.warning(f"Semantic chunking failed: {e}. Falling back to token-based chunking.")

        return self._token_based_chunking(sentences, chunk_type, metadata)

    def _semantic_chunking_with_embeddings(
        self,
        sentences: List[str],
        chunk_type: str,
        metadata: Dict[str, Any],
        embeddings_service
    ) -> List[Dict[str, Any]]:
        """Advanced semantic chunking using sentence embeddings."""
        logging.info(f"Generating embeddings for {len(sentences)} sentences for semantic chunking")
        sentence_embeddings = []

        for sentence in sentences:
            try:
                embedding = embeddings_service.generate_embedding(sentence)
                if embedding:
                    sentence_embeddings.append(np.array(embedding))
                else:
                    logging.warning("Failed to generate embedding for sentence, falling back")
                    return self._token_based_chunking(sentences, chunk_type, metadata)
            except Exception as e:
                logging.error(f"Error generating sentence embedding: {e}")
                return self._token_based_chunking(sentences, chunk_type, metadata)

        similarities = []
        for i in range(len(sentence_embeddings) - 1):
            sim = np.dot(sentence_embeddings[i], sentence_embeddings[i + 1])
            similarities.append(sim)

        split_points = [0]

        current_chunk_tokens = 0
        for i, sentence in enumerate(sentences):
            sentence_tokens = len(self.tokenizer.encode(sentence))

            should_split = False

            if i < len(similarities) and similarities[i] < self.semantic_threshold:
                should_split = True
                logging.debug(f"Semantic boundary detected at sentence {i}: similarity={similarities[i]:.3f}")

            if current_chunk_tokens + sentence_tokens > self.max_chunk_tokens and current_chunk_tokens > 0:
                should_split = True
                logging.debug(f"Token limit boundary at sentence {i}: {current_chunk_tokens + sentence_tokens} tokens")

            if should_split and i > split_points[-1]:
                split_points.append(i)
                current_chunk_tokens = sentence_tokens
            else:
                current_chunk_tokens += sentence_tokens

        if split_points[-1] < len(sentences):
            split_points.append(len(sentences))

        chunks = []
        for i in range(len(split_points) - 1):
            start_idx = split_points[i]
            end_idx = split_points[i + 1]

            chunk_sentences = sentences[start_idx:end_idx]
            chunk_text = " ".join(chunk_sentences)
            chunk_tokens = len(self.tokenizer.encode(chunk_text))

            if end_idx - start_idx > 1:
                chunk_similarities = [similarities[j] for j in range(start_idx, min(end_idx - 1, len(similarities)))]
                avg_similarity = np.mean(chunk_similarities) if chunk_similarities else 1.0
            else:
                avg_similarity = 1.0

            chunks.append({
                "text": chunk_text,
                "type": chunk_type,
                "index": len(chunks),
                "tokens": chunk_tokens,
                "metadata": {
                    **metadata,
                    "sentence_range": f"{start_idx}-{end_idx}",
                    "num_sentences": end_idx - start_idx,
                    "avg_coherence": round(float(avg_similarity), 3),
                    "chunking_method": "semantic_embedding"
                }
            })

        logging.info(f"Created {len(chunks)} semantic chunks from {len(sentences)} sentences")
        return chunks

    def _token_based_chunking(
        self,
        sentences: List[str],
        chunk_type: str,
        metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Traditional token-based chunking with sentence overlap."""
        chunks = []
        current_chunk = []
        current_tokens = 0

        for i, sentence in enumerate(sentences):
            sentence_tokens = len(self.tokenizer.encode(sentence))

            if current_tokens + sentence_tokens > self.max_chunk_tokens and current_chunk:
                chunk_text = " ".join(current_chunk)
                chunks.append({
                    "text": chunk_text,
                    "type": chunk_type,
                    "index": len(chunks),
                    "tokens": current_tokens,
                    "metadata": {
                        **metadata,
                        "sentence_range": f"{i - len(current_chunk)}-{i}",
                        "num_sentences": len(current_chunk),
                        "chunking_method": "token_based"
                    }
                })

                overlap_start = max(0, len(current_chunk) - self.overlap_sentences)
                current_chunk = current_chunk[overlap_start:]
                current_tokens = sum(len(self.tokenizer.encode(s)) for s in current_chunk)

            current_chunk.append(sentence)
            current_tokens += sentence_tokens

        if current_chunk:
            chunk_text = " ".join(current_chunk)
            chunks.append({
                "text": chunk_text,
                "type": chunk_type,
                "index": len(chunks),
                "tokens": current_tokens,
                "metadata": {
                    **metadata,
                    "num_sentences": len(current_chunk),
                    "chunking_method": "token_based"
                }
            })

        return chunks

    def create_chunks_for_epigraph(
        self,
        epigraph: Epigraph,
        generate_embeddings: bool = False
    ) -> List[EpigraphChunk]:
        """Create and return chunk objects for an epigraph."""
        chunk_dicts = self.chunk_epigraph(epigraph)
        chunk_objects = []

        embeddings_service = None
        if generate_embeddings:
            embeddings_service = EmbeddingsService(self.session)

        for chunk_dict in chunk_dicts:
            chunk = EpigraphChunk(
                epigraph_id=epigraph.id,
                chunk_text=chunk_dict["text"],
                chunk_type=chunk_dict["type"],
                chunk_index=chunk_dict["index"],
                token_count=chunk_dict["tokens"],
                chunk_metadata=chunk_dict["metadata"],
                embedding=None
            )

            if embeddings_service:
                try:
                    embedding = embeddings_service.generate_embedding(chunk_dict["text"])
                    chunk.embedding = embedding
                except Exception as e:
                    logging.error(f"Failed to generate embedding for chunk: {e}")

            chunk_objects.append(chunk)

        return chunk_objects

    def create_and_save_chunks(
        self,
        epigraph: Epigraph,
        generate_embeddings: bool = False
    ) -> List[EpigraphChunk]:
        """Create chunks and save them to the database."""
        chunks = self.create_chunks_for_epigraph(epigraph, generate_embeddings)

        saved_chunks = []
        for chunk in chunks:
            try:
                chunk_create = EpigraphChunkCreate(
                    epigraph_id=chunk.epigraph_id,
                    chunk_text=chunk.chunk_text,
                    chunk_type=chunk.chunk_type,
                    chunk_index=chunk.chunk_index,
                    token_count=chunk.token_count,
                    chunk_metadata=chunk.chunk_metadata,
                    embedding=chunk.embedding
                )
                saved_chunk = crud_epigraph_chunk.create(self.session, obj_in=chunk_create)
                saved_chunks.append(saved_chunk)
            except Exception as e:
                logging.error(f"Failed to save chunk {chunk.chunk_index} for epigraph {epigraph.id}: {e}")
                raise

        logging.info(f"Saved {len(saved_chunks)} chunks for epigraph {epigraph.id}")
        return saved_chunks

    def update_chunks_for_epigraph(
        self,
        epigraph: Epigraph,
        generate_embeddings: bool = False
    ) -> List[EpigraphChunk]:
        """Delete existing chunks and create new ones."""
        deleted_count = crud_epigraph_chunk.delete_by_epigraph_id(self.session, epigraph_id=epigraph.id)
        logging.info(f"Deleted {deleted_count} existing chunks for epigraph {epigraph.id}")

        return self.create_and_save_chunks(epigraph, generate_embeddings)

    def get_chunk_statistics(self) -> Dict[str, Any]:
        """Get statistics about chunks in the database."""

        total_chunks = self.session.exec(
            select(func.count(EpigraphChunk.id))
        ).one()

        chunks_by_type = self.session.exec(
            select(
                EpigraphChunk.chunk_type,
                func.count(EpigraphChunk.id)
            ).group_by(EpigraphChunk.chunk_type)
        ).all()

        avg_tokens = self.session.exec(
            select(func.avg(EpigraphChunk.token_count))
        ).one()

        chunks_with_embeddings = self.session.exec(
            select(func.count(EpigraphChunk.id))
            .where(EpigraphChunk.embedding.is_not(None))
        ).one()

        return {
            "total_chunks": total_chunks,
            "chunks_by_type": dict(chunks_by_type),
            "average_tokens_per_chunk": round(avg_tokens, 2) if avg_tokens else 0,
            "chunks_with_embeddings": chunks_with_embeddings,
            "embedding_coverage": f"{(chunks_with_embeddings / total_chunks * 100):.1f}%" if total_chunks > 0 else "0%"
        }
