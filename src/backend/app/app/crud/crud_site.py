from typing import Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.site import Site, SiteCreate, SiteUpdate
from app.models.links import EpigraphSiteLink, ObjectSiteLink


class CRUDSite(CRUDBase[Site, SiteCreate, SiteUpdate]):
    def get_by_dasi_id(self, db: Session, *, dasi_id: int) -> Optional[Site]:
        return db.query(self.model).filter(self.model.dasi_id == dasi_id).first()

    def link_to_epigraph(self, db: Session, *, site: Site, epigraph_id: int) -> Site:
        link = (
            db.query(EpigraphSiteLink)
            .filter(
                EpigraphSiteLink.epigraph_id == epigraph_id,
                EpigraphSiteLink.site_id == site.id,
            )
            .first()
        )

        if link:
            return site

        link = EpigraphSiteLink(epigraph_id=epigraph_id, site_id=site.id)
        db.add(link)
        db.commit()
        return site

    def link_to_object(self, db: Session, *, site: Site, object_id: int) -> Site:
        link = (
            db.query(ObjectSiteLink)
            .filter(
                ObjectSiteLink.object_id == object_id,
                ObjectSiteLink.site_id == site.id,
            )
            .first()
        )

        if link:
            return site

        link = ObjectSiteLink(object_id=object_id, site_id=site.id)
        db.add(link)
        db.commit()
        return site

    def unlink_from_epigraph(
        self, db: Session, *, site: Site, epigraph_id: int
    ) -> Site:
        link = (
            db.query(EpigraphSiteLink)
            .filter(
                EpigraphSiteLink.epigraph_id == epigraph_id,
                EpigraphSiteLink.site_id == site.id,
            )
            .first()
        )

        if not link:
            return site

        db.delete(link)
        db.commit()
        return site

    def unlink_from_object(self, db: Session, *, site: Site, object_id: int) -> Site:
        link = (
            db.query(ObjectSiteLink)
            .filter(
                ObjectSiteLink.object_id == object_id,
                ObjectSiteLink.site_id == site.id,
            )
            .first()
        )

        if not link:
            return site

        db.delete(link)
        db.commit()
        return site


site = CRUDSite(Site)
