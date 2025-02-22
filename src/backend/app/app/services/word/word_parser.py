from xml.etree import ElementTree as ET
from sqlalchemy.orm import Session

from app.models.epigraph import Epigraph
from app.models.word import Word, WordCreate
from app.crud.crud_word import word as crud_word


class WordParser:
    def __init__(self, session: Session, epigraph: Epigraph):
        self.session = session
        self.epigraph = epigraph

    def parse(self):
        """Parse epigraph text xml and create words."""
        root = ET.fromstring(self.epigraph.epigraph_text)
        words = []

        for element in root.iter():
            word_text = element.text
            word_classification = element.tag
            word_attributes = element.attrib

            if not word_text:
                continue

            db_word = crud_word.get_by_word(self.session, word=element.text)
            if db_word:
                if db_word.classification == word_classification:
                    db_word = crud_word.link_to_epigraph(
                        self.session,
                        word=db_word,
                        epigraph_id=self.epigraph.id,
                    )
                    previous_word = words[-1] if words else None
                    if previous_word:
                        db_word = crud_word.link_words(
                            self.session,
                            from_word=db_word,
                            to_word=previous_word
                        )
                else:
                    db_word = crud_word.create(
                        db=self.session,
                        obj_in=WordCreate(
                            word=word_text,
                            classification=word_classification,
                            attributes=word_attributes,
                        ),
                    )
            else:
                db_word = crud_word.create(
                    db=self.session,
                    obj_in=WordCreate(
                        word=word_text,
                        classification=word_classification,
                        attributes=word_attributes,
                    ),
                )
                db_word = crud_word.link_to_epigraph(
                    self.session,
                    word=db_word,
                    epigraph_id=self.epigraph.id
                )
                previous_word = words[-1] if words else None
                if previous_word:
                    db_word = crud_word.link_words(
                        self.session,
                        from_word=db_word,
                        to_word=previous_word
                    )

            words.append(db_word)

        return words
