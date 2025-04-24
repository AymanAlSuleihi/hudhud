from typing import Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.object import Object, ObjectCreate, ObjectUpdate


class CRUDObject(CRUDBase[Object, ObjectCreate, ObjectUpdate]):
    def get_by_dasi_id(self, db: Session, *, dasi_id: int) -> Optional[Object]:
        return db.query(self.model).filter(self.model.dasi_id == dasi_id).first()


obj = CRUDObject(Object)
