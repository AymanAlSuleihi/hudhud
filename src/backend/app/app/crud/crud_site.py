from typing import Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.site import Site, SiteCreate, SiteUpdate


class CRUDSite(CRUDBase[Site, SiteCreate, SiteUpdate]):
    def get_by_dasi_id(self, db: Session, *, dasi_id: int) -> Optional[Site]:
        return db.query(self.model).filter(self.model.dasi_id == dasi_id).first()


site = CRUDSite(Site)
