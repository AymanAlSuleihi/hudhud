import asyncio
from datetime import datetime
from pathlib import Path
import re
import time
from typing import Any, Generic, Optional, Type, TypeVar, cast
from urllib.parse import urlparse

import aiohttp
import requests
from sqlmodel import Session

from app.core.config import settings
from app.crud.base import CRUDBase
from app.models.dasi_sync import DasiImportCursor
from app.services.importers.sync_state import DasiSyncStateService

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")


class ImportService(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(
        self,
        session: Session,
        crud: CRUDBase,
        create_schema: Type[CreateSchemaType],
        update_schema: Type[UpdateSchemaType],
        api_endpoint: str,
    ):
        self.session = session
        self.base_url = f"{settings.DASI_API_URL}{api_endpoint}"
        self.entity_type = api_endpoint.strip("/")
        self.crud: Any = crud
        self.create_schema = create_schema
        self.update_schema = update_schema
        self.sync_state = DasiSyncStateService(session)

    def _camel_to_snake(self, name: str) -> str:
        name = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
        name = re.sub("([a-z0-9])([A-Z])", r"\1_\2", name).lower()
        return re.sub(r"([a-z])(\d+)", r"\1_\2", name)

    def _identify_link_entity(self, link: str) -> str:
        if "id=dasi_prj_epi" in link:
            return "epigraphs"
        if "id=dasi_prj_obj" in link:
            return "objects"
        if "id=dasi_all_sit" in link:
            return "sites"
        raise ValueError(f"Unknown link type: {link}")

    def _get_entity_local_id(self, entity: str, dasi_id: int) -> int | None:
        from app.crud.crud_epigraph import epigraph as crud_epigraph
        from app.crud.crud_object import obj as crud_object
        from app.crud.crud_site import site as crud_site

        crud_map = {
            "epigraphs": crud_epigraph,
            "objects": crud_object,
            "sites": crud_site,
        }
        try:
            crud = crud_map.get(entity)
            if not crud:
                raise ValueError(f"Unknown entity type: {entity}")

            local_entity = crud.get_by_dasi_id(self.session, dasi_id=dasi_id)
            if local_entity:
                return cast(int | None, getattr(local_entity, "id", None))

            raise ValueError(f"Entity with DASI ID {dasi_id} not found in local database.")
        except Exception:
            return None

    def _process_link(self, link: str) -> str:
        try:
            link_entity = self._identify_link_entity(link)
        except ValueError:
            return link

        rec_id_part = [part for part in link.split("&") if "recId=" in part]
        if rec_id_part:
            try:
                dasi_id = int(rec_id_part[0].split("=")[1])
            except (ValueError, IndexError):
                return link
        else:
            return link

        local_id = self._get_entity_local_id(link_entity, dasi_id)
        if local_id is None:
            return link

        return f"/{link_entity}/{local_id}"

    def _determine_entity_type(self) -> str:
        if "sites" in self.base_url:
            return "site"
        if "epigraphs" in self.base_url:
            return "epigraph"
        if "objects" in self.base_url:
            return "object"
        raise ValueError("Unknown entity type")

    def _link_to_related_entities(self, db_item: ModelType, detail_data: dict[str, Any]) -> ModelType:
        from app.crud.crud_epigraph import epigraph as crud_epigraph
        from app.crud.crud_object import obj as crud_object
        from app.crud.crud_site import site as crud_site

        entity_type = self._determine_entity_type()

        if entity_type == "site":
            site_item = cast(Any, db_item)
            epigraph_dasi_ids = [
                int(epigraph["@id"].split("/")[-1])
                for epigraph in detail_data.get("epigraphs", [])
                if "@id" in epigraph
            ]
            for epigraph_dasi_id in epigraph_dasi_ids:
                epigraph = crud_epigraph.get_by_dasi_id(self.session, dasi_id=epigraph_dasi_id)
                if epigraph and epigraph.id is not None:
                    crud_site.link_to_epigraph(self.session, site=site_item, epigraph_id=epigraph.id)

            object_dasi_ids = [
                int(obj["@id"].split("/")[-1])
                for obj in detail_data.get("objects", [])
                if "@id" in obj
            ]
            for object_dasi_id in object_dasi_ids:
                obj = crud_object.get_by_dasi_id(self.session, dasi_id=object_dasi_id)
                if obj and obj.id is not None:
                    crud_site.link_to_object(self.session, site=site_item, object_id=obj.id)

        elif entity_type == "epigraph":
            epigraph_item = cast(Any, db_item)
            site_dasi_ids = [
                int(site["@id"].split("/")[-1])
                for site in detail_data.get("sites", [])
                if "@id" in site
            ]
            for site_dasi_id in site_dasi_ids:
                site = crud_site.get_by_dasi_id(self.session, dasi_id=site_dasi_id)
                if site and site.id is not None:
                    crud_epigraph.link_to_site(self.session, epigraph=epigraph_item, site_id=site.id)

            object_dasi_ids = [
                int(obj["@id"].split("/")[-1])
                for obj in detail_data.get("objects", [])
                if "@id" in obj
            ]
            for object_dasi_id in object_dasi_ids:
                obj = crud_object.get_by_dasi_id(self.session, dasi_id=object_dasi_id)
                if obj and obj.id is not None:
                    crud_epigraph.link_to_object(self.session, epigraph=epigraph_item, object_id=obj.id)

        elif entity_type == "object":
            object_item = cast(Any, db_item)
            site_dasi_ids = [
                int(site["@id"].split("/")[-1])
                for site in detail_data.get("sites", [])
                if "@id" in site
            ]
            for site_dasi_id in site_dasi_ids:
                site = crud_site.get_by_dasi_id(self.session, dasi_id=site_dasi_id)
                if site and site.id is not None:
                    crud_object.link_to_site(self.session, obj=object_item, site_id=site.id)

            epigraph_dasi_ids = [
                int(epigraph["@id"].split("/")[-1])
                for epigraph in detail_data.get("epigraphs", [])
                if "@id" in epigraph
            ]
            for epigraph_dasi_id in epigraph_dasi_ids:
                epigraph = crud_epigraph.get_by_dasi_id(self.session, dasi_id=epigraph_dasi_id)
                if epigraph and epigraph.id is not None:
                    crud_object.link_to_epigraph(self.session, obj=object_item, epigraph_id=epigraph.id)

        return db_item

    def _parse_fields(self, data: dict[str, Any]) -> dict[str, Any]:
        parsed_data: dict[str, Any] = {}
        for key, value in data.items():
            snake_case_key = self._camel_to_snake(key)
            if key == "lastModified":
                parsed_data[snake_case_key] = datetime.strptime(value, "%Y-%m-%d")
            else:
                parsed_data[snake_case_key] = value
        return parsed_data

    def _detail_url(self, item_id: int) -> str:
        return f"{self.base_url}/{item_id}"

    def _extract_item_id(self, item: dict[str, Any]) -> int:
        item_url = item.get("@id", "")
        return int(urlparse(item_url).path.split("/")[-1])

    def _get_incremental_start_page(self, cursor: DasiImportCursor) -> int:
        if cursor.last_completed_page <= 0:
            return 1

        lookback_pages = max(settings.DASI_INCREMENTAL_LOOKBACK_PAGES, 1)
        return max(cursor.last_completed_page - lookback_pages + 1, 1)

    def _should_import_incremental_item(
        self,
        *,
        db_item: ModelType | None,
        item_id: int,
        current_page: int,
        cursor: DasiImportCursor,
        update_existing: bool,
    ) -> bool:
        if db_item is None:
            return True

        if cursor.last_completed_page <= 0:
            return update_existing

        in_refresh_window = current_page <= cursor.last_completed_page
        if in_refresh_window and update_existing:
            return True

        return item_id > (cursor.last_seen_dasi_id or 0)

    def _should_skip_existing_item(
        self,
        *,
        db_item: ModelType | None,
        update_existing: bool,
        mode: str,
    ) -> bool:
        return db_item is not None and not update_existing

    def _store_snapshot(
        self,
        *,
        item_id: int,
        detail_data: dict[str, Any],
        parsed_data: dict[str, Any],
    ) -> None:
        self.sync_state.upsert_snapshot(
            entity_type=self.entity_type,
            dasi_id=item_id,
            source_url=self._detail_url(item_id),
            payload=detail_data,
            source_last_modified=parsed_data.get("last_modified"),
        )

    def _persist_detail_data(
        self,
        *,
        item_id: int,
        detail_data: dict[str, Any],
        dasi_published: bool | None,
    ) -> ModelType:
        parsed_data = self._parse_fields(detail_data)
        self._store_snapshot(item_id=item_id, detail_data=detail_data, parsed_data=parsed_data)

        db_item = self.crud.get_by_dasi_id(self.session, dasi_id=item_id)
        if db_item:
            return cast(
                ModelType,
                self.crud.update(
                    db=self.session,
                    db_obj=db_item,
                    obj_in=self.update_schema(
                        dasi_id=item_id,
                        dasi_object=detail_data,
                        dasi_published=dasi_published,
                        **parsed_data,
                    ),
                ),
            )

        return cast(
            ModelType,
            self.crud.create(
                db=self.session,
                obj_in=self.create_schema(
                    dasi_id=item_id,
                    dasi_object=detail_data,
                    dasi_published=dasi_published,
                    **parsed_data,
                ),
            ),
        )

    def _fetch_detail_data(self, item_id: int, rate_limit_delay: float) -> dict[str, Any]:
        time.sleep(rate_limit_delay)
        detail_response = requests.get(self._detail_url(item_id), timeout=30)
        detail_response.raise_for_status()
        return cast(dict[str, Any], detail_response.json())

    def _fetch_page(self, page: int, rate_limit_delay: float) -> dict[str, Any]:
        time.sleep(rate_limit_delay)
        response = requests.get(self.base_url, params={"page": page}, timeout=30)
        response.raise_for_status()
        return cast(dict[str, Any], response.json())

    def _post_process_imported_item(
        self,
        db_item: ModelType,
        *,
        item_id: int,
        detail_data: dict[str, Any],
        dasi_published: bool | None,
        rate_limit_delay: float,
    ) -> ModelType:
        return db_item

    def _finalize_imported_item(self, db_item: ModelType, detail_data: dict[str, Any]) -> ModelType:
        return self._link_to_related_entities(db_item, detail_data)

    def import_single(
        self,
        item_id: int,
        dasi_published: bool | None = None,
        rate_limit_delay: float = 10.0,
    ) -> ModelType:
        detail_data = self._fetch_detail_data(item_id, rate_limit_delay)
        db_item = self._persist_detail_data(
            item_id=item_id,
            detail_data=detail_data,
            dasi_published=dasi_published,
        )
        db_item = self._post_process_imported_item(
            db_item,
            item_id=item_id,
            detail_data=detail_data,
            dasi_published=dasi_published,
            rate_limit_delay=rate_limit_delay,
        )
        return self._finalize_imported_item(db_item, detail_data)

    def import_all(
        self,
        rate_limit_delay: float = 10,
        update_existing: bool = False,
    ) -> dict[str, Any]:
        items_per_page = 30
        total_imported = 0
        total_skipped = 0
        total_items = None
        failed_items = 0
        current_page = (total_imported // items_per_page) + 1

        try:
            while True:
                data = self._fetch_page(current_page, rate_limit_delay)
                total_items = data.get("totalItems", total_items)

                for item in data.get("member", []):
                    item_id = self._extract_item_id(item)
                    db_item = self.crud.get_by_dasi_id(self.session, dasi_id=item_id)
                    if self._should_skip_existing_item(
                        db_item=db_item,
                        update_existing=update_existing,
                        mode="all",
                    ):
                        total_skipped += 1
                        continue

                    self.import_single(item_id)
                    total_imported += 1

                if "next" not in data.get("view", {}):
                    break

                current_page += 1

            return {
                "status": "success",
                "processed_items": total_imported,
                "skipped_items": total_skipped,
                "failed_items": failed_items,
                "total_items": total_items,
            }

        except Exception as exc:
            return {
                "status": "error",
                "error": str(exc),
                "processed_items": total_imported,
                "skipped_items": total_skipped,
                "failed_items": failed_items,
                "total_items": total_items,
            }

    def import_incremental(
        self,
        rate_limit_delay: float = 10,
        update_existing: bool = True,
    ) -> dict[str, Any]:
        cursor = self.sync_state.mark_cursor_started(self.entity_type)
        start_page = self._get_incremental_start_page(cursor)
        current_page = start_page
        last_completed_page = cursor.last_completed_page
        last_seen_dasi_id = cursor.last_seen_dasi_id
        total_imported = 0
        total_skipped = 0
        failed_items = 0
        total_items = cursor.total_items_hint

        try:
            while True:
                data = self._fetch_page(current_page, rate_limit_delay)
                total_items = data.get("totalItems", total_items)
                members = data.get("member", [])

                if not members:
                    break

                for item in members:
                    item_id = self._extract_item_id(item)
                    db_item = self.crud.get_by_dasi_id(self.session, dasi_id=item_id)
                    if not self._should_import_incremental_item(
                        db_item=db_item,
                        item_id=item_id,
                        current_page=current_page,
                        cursor=cursor,
                        update_existing=update_existing,
                    ):
                        total_skipped += 1
                        continue

                    self.import_single(item_id, rate_limit_delay=rate_limit_delay)
                    total_imported += 1
                    if last_seen_dasi_id is None or item_id > last_seen_dasi_id:
                        last_seen_dasi_id = item_id

                last_completed_page = current_page
                if "next" not in data.get("view", {}):
                    break
                current_page += 1

            self.sync_state.mark_cursor_completed(
                self.entity_type,
                last_completed_page=last_completed_page,
                last_seen_dasi_id=last_seen_dasi_id,
                total_items_hint=total_items,
            )
            return {
                "status": "success",
                "mode": "incremental",
                "processed_items": total_imported,
                "skipped_items": total_skipped,
                "failed_items": failed_items,
                "total_items": total_items,
                "start_page": start_page,
                "last_completed_page": last_completed_page,
                "last_seen_dasi_id": last_seen_dasi_id,
            }
        except Exception as exc:
            self.sync_state.mark_cursor_failed(self.entity_type, str(exc))
            return {
                "status": "error",
                "error": str(exc),
                "mode": "incremental",
                "processed_items": total_imported,
                "skipped_items": total_skipped,
                "failed_items": failed_items,
                "total_items": total_items,
                "start_page": start_page,
                "last_completed_page": last_completed_page,
                "last_seen_dasi_id": last_seen_dasi_id,
            }

    def transfer_fields(self, data: dict[str, Any]) -> UpdateSchemaType:
        item_fields: dict[str, Any] = {}
        for key, value in data.items():
            snake_case_key = self._camel_to_snake(key)
            if key == "lastModified":
                item_fields[snake_case_key] = datetime.strptime(value, "%Y-%m-%d")
            else:
                item_fields[snake_case_key] = value
        return self.update_schema(**item_fields, dasi_object=data)

    def import_range(
        self,
        start_id: int,
        end_id: int,
        dasi_published: bool | None = None,
        rate_limit_delay: float = 10,
        update_existing: bool = False,
    ) -> dict[str, Any]:
        total_imported = 0
        total_skipped = 0
        failed_items = 0
        total_items = end_id - start_id + 1

        try:
            for item_id in range(start_id, end_id + 1):
                db_item = self.crud.get_by_dasi_id(self.session, dasi_id=item_id)
                if self._should_skip_existing_item(
                    db_item=db_item,
                    update_existing=update_existing,
                    mode="range",
                ):
                    total_skipped += 1
                    continue

                try:
                    self.import_single(
                        item_id,
                        dasi_published=dasi_published,
                        rate_limit_delay=rate_limit_delay,
                    )
                    total_imported += 1
                except requests.exceptions.HTTPError as exc:
                    if exc.response.status_code == 404:
                        continue
                    if exc.response.status_code == 500:
                        time.sleep(rate_limit_delay * 2)
                        try:
                            self.import_single(
                                item_id,
                                dasi_published=dasi_published,
                                rate_limit_delay=rate_limit_delay,
                            )
                            total_imported += 1
                        except requests.exceptions.HTTPError as retry_exc:
                            if retry_exc.response.status_code == 404:
                                continue
                            if retry_exc.response.status_code == 500:
                                failed_items += 1
                                continue
                    raise

            return {
                "status": "success",
                "processed_items": total_imported,
                "skipped_items": total_skipped,
                "failed_items": failed_items,
                "total_items": total_items,
                "range": f"{start_id}-{end_id}",
            }
        except Exception as exc:
            return {
                "status": "error",
                "error": str(exc),
                "processed_items": total_imported,
                "skipped_items": total_skipped,
                "failed_items": failed_items,
                "total_items": total_items,
            }

    async def import_image(
        self,
        rec_id: int,
        size: str = "high",
        save_directory: str = "public",
        rate_limit_delay: float = 1.0,
    ) -> Optional[str]:
        await asyncio.sleep(rate_limit_delay)

        image_url = f"https://dasi.cnr.it/de/cgi-bin/wsimg.pl?recId={rec_id}&size={size}"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(image_url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                    response.raise_for_status()

                    content_type = response.headers.get("content-type", "")
                    if not content_type.startswith("image/"):
                        return None

                    images_dir = Path(save_directory) / "images"
                    images_dir.mkdir(parents=True, exist_ok=True)

                    filename = f"rec_{rec_id}_{size}.jpg"
                    file_path = images_dir / filename

                    with open(file_path, "wb") as file_handle:
                        async for chunk in response.content.iter_chunked(8192):
                            file_handle.write(chunk)

                    return f"images/{filename}"

        except aiohttp.ClientError:
            return None
        except Exception:
            return None

    async def import_images_range(
        self,
        start_id: int,
        end_id: int,
        image_size: str = "high",
        rate_limit_delay: float = 1.0,
    ) -> dict[str, Any]:
        successful_downloads = 0
        failed_downloads = 0
        downloaded_images: list[dict[str, Any]] = []
        total_range = end_id - start_id + 1

        try:
            for rec_id in range(start_id, end_id + 1):
                image_path = await self.import_image(
                    rec_id=rec_id,
                    size=image_size,
                    save_directory="public",
                    rate_limit_delay=rate_limit_delay,
                )

                if image_path:
                    successful_downloads += 1
                    downloaded_images.append({"rec_id": rec_id, "image_path": image_path})
                else:
                    failed_downloads += 1

            return {
                "status": "success",
                "processed_items": total_range,
                "total_items": total_range,
                "successful_downloads": successful_downloads,
                "failed_items": failed_downloads,
                "downloaded_images": downloaded_images[:100],
            }
        except Exception as exc:
            return {
                "status": "error",
                "error": str(exc),
                "processed_items": successful_downloads + failed_downloads,
                "total_items": total_range,
                "failed_items": failed_downloads,
            }

    async def import_all_images(
        self,
        start_rec_id: int = 1,
        image_size: str = "high",
        rate_limit_delay: float = 2.0,
        max_consecutive_failures: int = 50,
    ) -> dict[str, Any]:
        try:
            current_rec_id = start_rec_id
            consecutive_failures = 0
            successful_downloads = 0
            total_attempts = 0
            downloaded_images: list[dict[str, Any]] = []

            while consecutive_failures < max_consecutive_failures:
                total_attempts += 1

                image_path = await self.import_image(
                    rec_id=current_rec_id,
                    size=image_size,
                    save_directory="public",
                    rate_limit_delay=rate_limit_delay,
                )

                if image_path:
                    consecutive_failures = 0
                    successful_downloads += 1
                    downloaded_images.append({"rec_id": current_rec_id, "image_path": image_path})
                else:
                    consecutive_failures += 1

                current_rec_id += 1

            return {
                "status": "success",
                "processed_items": successful_downloads,
                "total_items": total_attempts,
                "failed_items": total_attempts - successful_downloads,
                "final_rec_id": current_rec_id - 1,
                "consecutive_failures": consecutive_failures,
                "downloaded_images": downloaded_images[:100],
            }
        except Exception as exc:
            total_attempts = total_attempts if "total_attempts" in locals() else 0
            return {
                "status": "error",
                "error": str(exc),
                "processed_items": 0,
                "total_items": total_attempts,
                "failed_items": total_attempts,
            }