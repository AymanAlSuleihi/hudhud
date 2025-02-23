from xml.etree import ElementTree as ET
from sqlalchemy.orm import Session

from app.models.epigraph import Epigraph
from app.models.word import Word, WordCreate
from app.crud.crud_word import word as crud_word


class WordParser:
    def __init__(self, session: Session, epigraph: Epigraph):
        self.session = session
        self.epigraph = epigraph

    def _process_text(
        self,
        text: str,
        classification: str = None,
        attributes: dict = {},
        previous_word: Word = None,
    ) -> Word:
        if not text or text.isspace():
            return None

        for word_text in text.split():
            db_word = crud_word.get_by_word(self.session, word=word_text)
            if not db_word or db_word.classification != classification:
                db_word = crud_word.create(
                    db=self.session,
                    obj_in=WordCreate(
                        word=word_text,
                        classification=classification,
                        attributes=attributes,
                    ),
                )

            db_word = crud_word.link_to_epigraph(
                self.session,
                word=db_word,
                epigraph_id=self.epigraph.id,
            )
            if previous_word:
                db_word = crud_word.link_words(
                    self.session,
                    from_word=db_word,
                    to_word=previous_word,
                )

        return db_word

    def parse(self):
        """Parse epigraph text xml and create words."""
        root = ET.fromstring(self.epigraph.epigraph_text)
        words = []

        for element in root.iter():
            word = self._process_text(
                text=element.text,
                classification=element.tag,
                attributes=element.attrib,
                previous_word=words[-1] if words else None,
            )
            if word:
                words.append(word)

            for child in element:
                if child.tail:
                    word = self._process_text(
                        child.tail,
                        previous_word=words[-1] if words else None,
                    )
                    if word:
                        words.append(word)

        return words
