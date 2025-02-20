from typing import List, Optional

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.analytics_cache import AnalyticsCache, AnalyticsCacheCreate, AnalyticsCacheUpdate


class CRUDAnalyticsCache(CRUDBase[AnalyticsCache, AnalyticsCacheCreate, AnalyticsCacheUpdate]):
    def get_by_key(self, db: Session, *, key: str) -> Optional[AnalyticsCache]:
        return db.query(self.model).filter(self.model.key == key).first()


analytics_cache = CRUDAnalyticsCache(AnalyticsCache)
