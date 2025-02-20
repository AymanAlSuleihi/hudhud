from collections import Counter, defaultdict
from datetime import datetime
from typing import List

from app.models.analytics_cache import AnalyticsCache, AnalyticsCacheCreate, AnalyticsCacheUpdate
from app.crud.crud_analytics_cache import analytics_cache as crud_analytics_cache


class AnalyticsCacheService:
    def __init__(self, session):
        self.session = session

    def get_cache(self, key: str) -> dict:
        cache = crud_analytics_cache.get_by_key(self.session, key=key)
        return cache.data if cache else {}

    def set_cache(self, key: str, data: dict) -> AnalyticsCache:
        cache = crud_analytics_cache.get_by_key(self.session, key=key)
        if cache:
            return crud_analytics_cache.update(
                self.session,
                db_obj=cache,
                obj_in=AnalyticsCacheUpdate(data=data)
            )

        return crud_analytics_cache.create(
            self.session,
            obj_in=AnalyticsCacheCreate(key=key, data=data),
        )
