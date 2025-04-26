from typing import List, Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.epigraph import Epigraph, EpigraphCreate, EpigraphUpdate
from app.models.links import EpigraphSiteLink, EpigraphObjectLink


class CRUDEpigraph(CRUDBase[Epigraph, EpigraphCreate, EpigraphUpdate]):
    def get_by_dasi_id(self, db: Session, *, dasi_id: int) -> Optional[Epigraph]:
        return db.query(self.model).filter(self.model.dasi_id == dasi_id).first()

    def link_to_site(self, db: Session, *, epigraph: Epigraph, site_id: int) -> Epigraph:
        link = db.query(EpigraphSiteLink).filter(
            EpigraphSiteLink.epigraph_id == epigraph.id,
            EpigraphSiteLink.site_id == site_id,
        ).first()

        if link:
            return epigraph

        link = EpigraphSiteLink(epigraph_id=epigraph.id, site_id=site_id)
        db.add(link)
        db.commit()
        return epigraph

    def link_to_object(self, db: Session, *, epigraph: Epigraph, object_id: int) -> Epigraph:
        link = db.query(EpigraphObjectLink).filter(
            EpigraphObjectLink.epigraph_id == epigraph.id,
            EpigraphObjectLink.object_id == object_id,
        ).first()

        if link:
            return epigraph

        link = EpigraphObjectLink(epigraph_id=epigraph.id, object_id=object_id)
        db.add(link)
        db.commit()
        return epigraph

    def unlink_from_site(self, db: Session, *, epigraph: Epigraph, site_id: int) -> Epigraph:
        link = db.query(EpigraphSiteLink).filter(
            EpigraphSiteLink.epigraph_id == epigraph.id,
            EpigraphSiteLink.site_id == site_id,
        ).first()

        if not link:
            return epigraph

        db.delete(link)
        db.commit()
        return epigraph

    def unlink_from_object(self, db: Session, *, epigraph: Epigraph, object_id: int) -> Epigraph:
        link = db.query(EpigraphObjectLink).filter(
            EpigraphObjectLink.epigraph_id == epigraph.id,
            EpigraphObjectLink.object_id == object_id,
        ).first()

        if not link:
            return epigraph

        db.delete(link)
        db.commit()
        return epigraph


epigraph = CRUDEpigraph(Epigraph)
