import re
from dataclasses import dataclass, field
from typing import Optional
from xml.etree import ElementTree as ET

from sqlalchemy.orm import Session

from app.crud.crud_word import word as crud_word
from app.models.epigraph import Epigraph
from app.models.word import Word, WordCreate


@dataclass(frozen=True)
class ParsedWordToken:
    text: str
    classification: Optional[str] = None
    attributes: dict = field(default_factory=dict)
    position: Optional[int] = None


class WordParser:
    _STRUCTURAL_TAGS = {
        "ab",
        "app",
        "choice",
        "subst",
        "w",
        "g",
        "rdg",
        "lem",
        "corr",
        "surplus",
        "seg",
        "rs",
        "num",
    }
    _BOUNDARY_TAGS = {"cb", "milestone", "pb"}
    _ANNOTATION_TAGS = {"unclear", "supplied"}

    def __init__(self, session: Session, epigraph: Epigraph):
        self.session = session
        self.epigraph = epigraph
        self._buffer_parts: list[str] = []
        self._buffer_classification: Optional[str] = None
        self._buffer_attributes: dict = {}
        self._tokens: list[ParsedWordToken] = []

    def _reset_state(self) -> None:
        self._buffer_parts = []
        self._buffer_classification = None
        self._buffer_attributes = {}
        self._tokens = []

    def _normalize_tag(self, tag: str) -> str:
        if "}" in tag:
            return tag.rsplit("}", 1)[1]
        return tag

    def _clean_attributes(self, attributes: Optional[dict]) -> dict:
        if not attributes:
            return {}
        return {
            k: v
            for k, v in attributes.items()
            if k not in ("prev", "next", "{http://www.w3.org/XML/1998/namespace}id")
        }

    def _is_boundary_element(self, tag: str, attributes: dict[str, str]) -> bool:
        if tag in self._BOUNDARY_TAGS:
            return True
        return tag == "lb" and attributes.get("break") != "no"

    def _resolve_context(
        self,
        tag: str,
        attributes: dict[str, str],
        inherited_classification: Optional[str],
        inherited_attributes: dict,
    ) -> tuple[Optional[str], dict]:
        if tag == "gap":
            return inherited_classification, self._clean_attributes(inherited_attributes)
        if tag in self._STRUCTURAL_TAGS or self._is_boundary_element(tag, attributes):
            if tag == "rs" and attributes.get("type"):
                return tag, self._clean_attributes(attributes)
            return inherited_classification, self._clean_attributes(inherited_attributes)

        if tag in self._ANNOTATION_TAGS:
            return inherited_classification, self._clean_attributes(inherited_attributes)

        return tag, self._clean_attributes(attributes)

    def _flush_token(self) -> None:
        if not self._buffer_parts:
            return
        word_text = "".join(self._buffer_parts).strip()
        word_text = word_text.lower()
        if word_text and any(character.isalnum() for character in word_text):
            self._tokens.append(
                ParsedWordToken(
                    text=word_text,
                    classification=self._buffer_classification,
                    attributes=dict(self._buffer_attributes),
                    position=len(self._tokens),
                )
            )

        self._buffer_parts = []
        self._buffer_classification = None
        self._buffer_attributes = {}

    def _append_text(
        self,
        text: Optional[str],
        classification: Optional[str],
        attributes: dict,
    ) -> None:
        if not text:
            return

        for chunk in re.findall(r"\[[^\]]+\]|\S+|\s+", text):
            if chunk.isspace():
                self._flush_token()
                continue

            if not self._buffer_parts:
                self._buffer_classification = classification
                self._buffer_attributes = dict(attributes)

            self._buffer_parts.append(chunk)

    def _walk_element(
        self,
        element: ET.Element,
        inherited_classification: Optional[str] = None,
        inherited_attributes: Optional[dict] = None,
    ) -> None:
        inherited_attributes = inherited_attributes or {}
        tag = self._normalize_tag(element.tag)
        attributes = dict(element.attrib)

        if self._is_boundary_element(tag, attributes):
            self._flush_token()

        classification, context_attributes = self._resolve_context(
            tag,
            attributes,
            inherited_classification,
            inherited_attributes,
        )

        if tag == "gap":
            gap_text = self._format_gap(attributes)
            self._append_text(gap_text, classification, context_attributes)
            return

        self._append_text(element.text, classification, context_attributes)
        for child in element:
            self._walk_element(child, classification, context_attributes)
            tail = child.tail
            child_tag = self._normalize_tag(child.tag)
            child_attribs = dict(child.attrib)
            if child_tag == "lb" and child_attribs.get("break") == "no" and tail:
                tail = tail.lstrip()
                if tail == "":
                    tail = None

            self._append_text(tail, classification, context_attributes)

    def _format_gap(self, attributes: dict) -> str:
        quantity = attributes.get("quantity")
        extent = attributes.get("extent")
        if quantity:
            try:
                n = int(quantity)
            except (TypeError, ValueError):
                n = 1
            n = max(1, n)
            return "[" + ("." * n) + "]"
        if extent == "unknown":
            return "[... ...]"
        return "[...]"

    def parse_tokens(self) -> list[ParsedWordToken]:
        self._reset_state()

        try:
            root = ET.fromstring(self.epigraph.epigraph_text)
        except ET.ParseError as exc:
            raise ValueError(
                f"Invalid epigraph_text for epigraph {self.epigraph.id}"
            ) from exc

        self._walk_element(root)
        self._flush_token()
        return list(self._tokens)

    def _get_or_create_word(self, token: ParsedWordToken) -> Word:
        db_word = crud_word.get_by_word(
            self.session,
            word=token.text,
            classification=token.classification,
            attributes=token.attributes,
            language_level_1=self.epigraph.language_level_1,
            language_level_2=self.epigraph.language_level_2,
            language_level_3=self.epigraph.language_level_3,
        )
        if db_word:
            return crud_word.increment_frequency(self.session, word=db_word)

        return crud_word.create(
            db=self.session,
            obj_in=WordCreate(
                word=token.text,
                classification=token.classification,
                attributes=token.attributes,
                language_level_1=self.epigraph.language_level_1,
                language_level_2=self.epigraph.language_level_2,
                language_level_3=self.epigraph.language_level_3,
            ),
        )

    def parse(self):
        """Parse epigraph text xml and create words."""
        words = []

        for token in self.parse_tokens():
            word = self._get_or_create_word(token)
            word = crud_word.link_to_epigraph(
                self.session,
                word=word,
                epigraph_id=self.epigraph.id,
                position=token.position,
            )
            if words:
                word = crud_word.link_words(
                    self.session,
                    from_word=word,
                    to_word=words[-1],
                )
            words.append(word)

        return words
