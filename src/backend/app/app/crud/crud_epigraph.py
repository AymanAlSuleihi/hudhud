from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, or_

from app.crud.base import CRUDBase
from app.models.epigraph import Epigraph, EpigraphCreate, EpigraphUpdate
from app.models.links import EpigraphSiteLink, EpigraphObjectLink


class CRUDEpigraph(CRUDBase[Epigraph, EpigraphCreate, EpigraphUpdate]):
    def get_by_dasi_id(self, db: Session, *, dasi_id: int) -> Optional[Epigraph]:
        return db.query(self.model).filter(self.model.dasi_id == dasi_id).first()

    def get_by_title(self, db: Session, *, title: str) -> Optional[Epigraph]:
        return (
            db.query(self.model)
            .filter(self.model.title.ilike(f"%{title.strip()}%"))
            .first()
        )

    def get_by_titles(
        self, db: Session, *, titles: List[str], limit: Optional[int] = None
    ) -> List[Epigraph]:
        if not titles:
            return []

        title_filters = [
            self.model.title.ilike(f"%{title.strip()}%") for title in titles
        ]
        query = db.query(self.model).filter(or_(*title_filters))

        if limit:
            query = query.limit(limit)

        return query.all()

    def get_id_and_dasi_id(
        self, db: Session, *, dasi_published=None, skip: int = 0, limit: int = 100
    ) -> List[tuple[int, int]]:
        query = db.query(self.model.id, self.model.dasi_id)
        if dasi_published is not None:
            query = query.filter(self.model.dasi_published == dasi_published)
        query = query.offset(skip).limit(limit)
        return query.all()

    def find_similar(
        self, db: Session, *, embedding: List[float], limit: int = 5
    ) -> List[Epigraph]:
        query = (
            select(self.model)
            .order_by(self.model.embedding.l2_distance(embedding))
            .limit(limit)
        )
        return db.exec(query).all()

    def link_to_site(
        self, db: Session, *, epigraph: Epigraph, site_id: int
    ) -> Epigraph:
        link = (
            db.query(EpigraphSiteLink)
            .filter(
                EpigraphSiteLink.epigraph_id == epigraph.id,
                EpigraphSiteLink.site_id == site_id,
            )
            .first()
        )

        if link:
            return epigraph

        link = EpigraphSiteLink(epigraph_id=epigraph.id, site_id=site_id)
        db.add(link)
        db.commit()
        return epigraph

    def link_to_object(
        self, db: Session, *, epigraph: Epigraph, object_id: int
    ) -> Epigraph:
        link = (
            db.query(EpigraphObjectLink)
            .filter(
                EpigraphObjectLink.epigraph_id == epigraph.id,
                EpigraphObjectLink.object_id == object_id,
            )
            .first()
        )

        if link:
            return epigraph

        link = EpigraphObjectLink(epigraph_id=epigraph.id, object_id=object_id)
        db.add(link)
        db.commit()
        return epigraph

    def unlink_from_site(
        self, db: Session, *, epigraph: Epigraph, site_id: int
    ) -> Epigraph:
        link = (
            db.query(EpigraphSiteLink)
            .filter(
                EpigraphSiteLink.epigraph_id == epigraph.id,
                EpigraphSiteLink.site_id == site_id,
            )
            .first()
        )

        if not link:
            return epigraph

        db.delete(link)
        db.commit()
        return epigraph

    def unlink_all_sites(self, db: Session, *, epigraph: Epigraph) -> Epigraph:
        links = (
            db.query(EpigraphSiteLink)
            .filter(
                EpigraphSiteLink.epigraph_id == epigraph.id,
            )
            .all()
        )

        for link in links:
            db.delete(link)
        db.commit()
        return epigraph

    def unlink_from_object(
        self, db: Session, *, epigraph: Epigraph, object_id: int
    ) -> Epigraph:
        link = (
            db.query(EpigraphObjectLink)
            .filter(
                EpigraphObjectLink.epigraph_id == epigraph.id,
                EpigraphObjectLink.object_id == object_id,
            )
            .first()
        )

        if not link:
            return epigraph

        db.delete(link)
        db.commit()
        return epigraph


epigraph = CRUDEpigraph(Epigraph)
