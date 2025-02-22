from typing import List, Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.epigraph import Epigraph
from app.models.word import Word, WordCreate, WordUpdate
from app.models.links import EpigraphWordLink, WordLink


class CRUDWord(CRUDBase[Word, WordCreate, WordUpdate]):
    def get_by_word(self, db: Session, *, word: str) -> Optional[Word]:
        return db.query(self.model).filter(self.model.word == word).first()

    def link_words(self, db: Session, *, from_word: Word, to_word: Word) -> Word:
        link = db.query(WordLink).filter(
            WordLink.from_word_id == from_word.id,
            WordLink.to_word_id == to_word.id
        ).first()

        if not link:
            link = WordLink(from_word_id=from_word.id, to_word_id=to_word.id)
            db.add(link)
        else:
            link.count += 1

        db.commit()
        return from_word

    def link_to_epigraph(self, db: Session, *, word: Word, epigraph_id: int) -> Word:
        epigraph = db.query(Epigraph).get(epigraph_id)
        if not epigraph:
            raise ValueError(f"Epigraph with id {epigraph_id} not found")

        link = EpigraphWordLink(epigraph_id=epigraph_id, word_id=word.id)
        db.add(link)
        db.commit()
        return word


word = CRUDWord(Word)
