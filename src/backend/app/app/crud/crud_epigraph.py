from typing import List, Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.epigraph import Epigraph, EpigraphCreate, EpigraphUpdate


class CRUDEpigraph(CRUDBase[Epigraph, EpigraphCreate, EpigraphUpdate]):
    def get_by_dasi_id(self, db: Session, *, dasi_id: int) -> Optional[Epigraph]:
        return db.query(self.model).filter(self.model.dasi_id == dasi_id).first()


epigraph = CRUDEpigraph(Epigraph)
