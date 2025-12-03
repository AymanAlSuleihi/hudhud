from typing import Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.object import Object, ObjectCreate, ObjectUpdate
from app.models.links import EpigraphObjectLink, ObjectSiteLink


class CRUDObject(CRUDBase[Object, ObjectCreate, ObjectUpdate]):
    def get_by_dasi_id(self, db: Session, *, dasi_id: int) -> Optional[Object]:
        return db.query(self.model).filter(self.model.dasi_id == dasi_id).first()

    def link_to_site(self, db: Session, *, obj: Object, site_id: int) -> Object:
        link = (
            db.query(ObjectSiteLink)
            .filter(
                ObjectSiteLink.object_id == obj.id,
                ObjectSiteLink.site_id == site_id,
            )
            .first()
        )

        if link:
            return obj

        link = ObjectSiteLink(object_id=obj.id, site_id=site_id)
        db.add(link)
        db.commit()
        return obj

    def link_to_epigraph(self, db: Session, *, obj: Object, epigraph_id: int) -> Object:
        link = (
            db.query(EpigraphObjectLink)
            .filter(
                EpigraphObjectLink.object_id == obj.id,
                EpigraphObjectLink.epigraph_id == epigraph_id,
            )
            .first()
        )

        if link:
            return obj

        link = EpigraphObjectLink(object_id=obj.id, epigraph_id=epigraph_id)
        db.add(link)
        db.commit()
        return obj

    def unlink_from_site(self, db: Session, *, obj: Object, site_id: int) -> Object:
        link = (
            db.query(ObjectSiteLink)
            .filter(
                ObjectSiteLink.object_id == obj.id,
                ObjectSiteLink.site_id == site_id,
            )
            .first()
        )

        if not link:
            return obj

        db.delete(link)
        db.commit()
        return obj

    def unlink_all_sites(self, db: Session, *, obj: Object) -> Object:
        links = (
            db.query(ObjectSiteLink)
            .filter(
                ObjectSiteLink.object_id == obj.id,
            )
            .all()
        )

        for link in links:
            db.delete(link)
        db.commit()
        return obj

    def unlink_from_epigraph(
        self, db: Session, *, obj: Object, epigraph_id: int
    ) -> Object:
        link = (
            db.query(EpigraphObjectLink)
            .filter(
                EpigraphObjectLink.object_id == obj.id,
                EpigraphObjectLink.epigraph_id == epigraph_id,
            )
            .first()
        )

        if not link:
            return obj

        db.delete(link)
        db.commit()
        return obj


obj = CRUDObject(Object)
