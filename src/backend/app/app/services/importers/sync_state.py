import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from sqlmodel import Session, select

from app.models.dasi_sync import DasiImportCursor, DasiSourceSnapshot


class DasiSyncStateService:
    def __init__(self, session: Session):
        self.session = session

    def get_cursor(self, entity_type: str) -> DasiImportCursor | None:
        statement = select(DasiImportCursor).where(DasiImportCursor.entity_type == entity_type)
        return self.session.exec(statement).first()

    def get_or_create_cursor(self, entity_type: str) -> DasiImportCursor:
        cursor = self.get_cursor(entity_type)
        if cursor:
            return cursor

        cursor = DasiImportCursor(entity_type=entity_type)
        self.session.add(cursor)
        self.session.commit()
        self.session.refresh(cursor)
        return cursor

    def mark_cursor_started(self, entity_type: str) -> DasiImportCursor:
        cursor = self.get_or_create_cursor(entity_type)
        cursor.last_started_at = datetime.now(timezone.utc)
        cursor.last_error = None
        self.session.add(cursor)
        self.session.commit()
        self.session.refresh(cursor)
        return cursor

    def mark_cursor_completed(
        self,
        entity_type: str,
        *,
        last_completed_page: int,
        last_seen_dasi_id: int | None,
        total_items_hint: int | None,
    ) -> DasiImportCursor:
        cursor = self.get_or_create_cursor(entity_type)
        cursor.last_completed_page = last_completed_page
        cursor.last_seen_dasi_id = last_seen_dasi_id
        cursor.total_items_hint = total_items_hint
        cursor.last_completed_at = datetime.now(timezone.utc)
        cursor.last_error = None
        self.session.add(cursor)
        self.session.commit()
        self.session.refresh(cursor)
        return cursor

    def mark_cursor_failed(self, entity_type: str, error: str) -> DasiImportCursor:
        cursor = self.get_or_create_cursor(entity_type)
        cursor.last_error = error
        self.session.add(cursor)
        self.session.commit()
        self.session.refresh(cursor)
        return cursor

    def get_snapshot(self, entity_type: str, dasi_id: int) -> DasiSourceSnapshot | None:
        statement = select(DasiSourceSnapshot).where(
            DasiSourceSnapshot.entity_type == entity_type,
            DasiSourceSnapshot.dasi_id == dasi_id,
        )
        return self.session.exec(statement).first()

    def upsert_snapshot(
        self,
        *,
        entity_type: str,
        dasi_id: int,
        source_url: str,
        payload: dict[str, Any],
        source_last_modified: datetime | None,
    ) -> tuple[DasiSourceSnapshot, bool]:
        payload_hash = hashlib.sha256(
            json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str).encode("utf-8")
        ).hexdigest()
        snapshot = self.get_snapshot(entity_type, dasi_id)
        has_changed = (
            snapshot is None
            or snapshot.payload_hash != payload_hash
            or snapshot.source_last_modified != source_last_modified
        )

        if snapshot is None:
            snapshot = DasiSourceSnapshot(
                entity_type=entity_type,
                dasi_id=dasi_id,
                source_url=source_url,
                source_last_modified=source_last_modified,
                payload_hash=payload_hash,
                payload=payload,
            )
        else:
            snapshot.source_url = source_url
            snapshot.source_last_modified = source_last_modified
            snapshot.payload_hash = payload_hash
            snapshot.payload = payload

        self.session.add(snapshot)
        self.session.commit()
        self.session.refresh(snapshot)
        return snapshot, has_changed
