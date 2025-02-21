from typing import List, Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.word import Word, WordCreate, WordUpdate


class CRUDWord(CRUDBase[Word, WordCreate, WordUpdate]):
    def get_by_word(self, db: Session, *, word: str) -> Optional[Word]:
        return db.query(self.model).filter(self.model.word == word).first()


word = CRUDWord(Word)
