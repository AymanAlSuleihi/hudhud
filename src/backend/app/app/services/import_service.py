from datetime import datetime
import re
import os
import shutil
from pathlib import Path
from typing import Dict, Any, Generic, TypeVar, Type, Optional
import requests
import time
import asyncio
from urllib.parse import urlparse

import aiohttp
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.services.task_progress import TaskProgressService
from app.core.config import settings

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")

class ImportService(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(
        self,
        session: Session,
        task_progress_service: TaskProgressService,
        crud: CRUDBase,
        create_schema: Type[CreateSchemaType],
        update_schema: Type[UpdateSchemaType],
        api_endpoint: str,
    ):
        self.session = session
        self.base_url = f"{settings.DASI_API_URL}{api_endpoint}"
        self.task_progress_service = task_progress_service
        self.crud = crud
        self.create_schema = create_schema
        self.update_schema = update_schema

    def _camel_to_snake(self, name: str) -> str:
        name = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
        name = re.sub("([a-z0-9])([A-Z])", r"\1_\2", name).lower()
        return re.sub(r"([a-z])(\d+)", r"\1_\2", name)

    def _identify_link_entity(self, link: str) -> str:
        """Identify the entity type from the link."""
        if "id=dasi_prj_epi" in link:
            return "epigraphs"
        elif "id=dasi_prj_obj" in link:
            return "objects"
        elif "id=dasi_all_sit" in link:
            return "sites"
        else:
            raise ValueError(f"Unknown link type: {link}")

    def _get_entity_local_id(self, entity: str, dasi_id: int) -> int:
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
            entity = crud.get_by_dasi_id(self.session, dasi_id=dasi_id)
            if entity:
                return entity.id
            else:
                raise ValueError(f"Entity with DASI ID {dasi_id} not found in local database.")
        except Exception as e:
            # TODO: logging.error(f"Error fetching entity with DASI ID {dasi_id}: {e}")
            return None

    def _process_link(self, link: str) -> str:
        """Process <a> tags to replace href with local URLs."""
        try:
            link_entity = self._identify_link_entity(link)
        except ValueError:
            return link

        rec_id_part = [p for p in link.split("&") if "recId=" in p]
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

        local_url = f"/{link_entity}/{local_id}"
        return local_url

    def _determine_entity_type(self) -> str:
        """Determine the entity type being handled by this import service."""
        if "sites" in self.base_url:
            return "site"
        elif "epigraphs" in self.base_url:
            return "epigraph"
        elif "objects" in self.base_url:
            return "object"
        raise ValueError("Unknown entity type")

    def _link_to_related_entities(self, db_item: ModelType, detail_data: dict) -> ModelType:
        """Link the imported entity to related entities based on entity type."""
        from app.crud.crud_epigraph import epigraph as crud_epigraph
        from app.crud.crud_object import obj as crud_object
        from app.crud.crud_site import site as crud_site

        entity_type = self._determine_entity_type()

        if entity_type == "site":
            epigraph_list = detail_data.get("epigraphs", [])
            epigraph_dasi_ids = [
                int(epigraph["@id"].split("/")[-1])
                for epigraph in epigraph_list
                if "@id" in epigraph
            ]
            for epigraph_dasi_id in epigraph_dasi_ids:
                epigraph = crud_epigraph.get_by_dasi_id(self.session, dasi_id=epigraph_dasi_id)
                if epigraph:
                    crud_site.link_to_epigraph(self.session, site=db_item, epigraph_id=epigraph.id)

            object_list = detail_data.get("objects", [])
            object_dasi_ids = [
                int(obj["@id"].split("/")[-1])
                for obj in object_list
                if "@id" in obj
            ]
            for object_dasi_id in object_dasi_ids:
                obj = crud_object.get_by_dasi_id(self.session, dasi_id=object_dasi_id)
                if obj:
                    crud_site.link_to_object(self.session, site=db_item, object_id=obj.id)

        elif entity_type == "epigraph":
            site_list = detail_data.get("sites", [])
            site_dasi_ids = [
                int(site["@id"].split("/")[-1])
                for site in site_list
                if "@id" in site
            ]
            for site_dasi_id in site_dasi_ids:
                site = crud_site.get_by_dasi_id(self.session, dasi_id=site_dasi_id)
                if site:
                    crud_epigraph.link_to_site(self.session, epigraph=db_item, site_id=site.id)

            object_list = detail_data.get("objects", [])
            object_dasi_ids = [
                int(obj["@id"].split("/")[-1])
                for obj in object_list
                if "@id" in obj
            ]
            for object_dasi_id in object_dasi_ids:
                obj = crud_object.get_by_dasi_id(self.session, dasi_id=object_dasi_id)
                if obj:
                    crud_epigraph.link_to_object(self.session, epigraph=db_item, object_id=obj.id)

        elif entity_type == "object":
            site_list = detail_data.get("sites", [])
            site_dasi_ids = [
                int(site["@id"].split("/")[-1])
                for site in site_list
                if "@id" in site
            ]
            for site_dasi_id in site_dasi_ids:
                site = crud_site.get_by_dasi_id(self.session, dasi_id=site_dasi_id)
                if site:
                    crud_object.link_to_site(self.session, obj=db_item, site_id=site.id)

            epigraph_list = detail_data.get("epigraphs", [])
            epigraph_dasi_ids = [
                int(epigraph["@id"].split("/")[-1])
                for epigraph in epigraph_list
                if "@id" in epigraph
            ]
            for epigraph_dasi_id in epigraph_dasi_ids:
                epigraph = crud_epigraph.get_by_dasi_id(self.session, dasi_id=epigraph_dasi_id)
                if epigraph:
                    crud_object.link_to_epigraph(self.session, obj=db_item, epigraph_id=epigraph.id)

        return db_item

    def _parse_fields(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse fields from the DASI API response."""
        parsed_data = {}
        for key, value in data.items():
            snake_case_key = self._camel_to_snake(key)
            if key == "lastModified":
                parsed_data[snake_case_key] = datetime.strptime(value, "%Y-%m-%d")
            else:
                parsed_data[snake_case_key] = value
        return parsed_data

    def import_single(
        self,
        item_id: int,
        dasi_published: bool = None,
        rate_limit_delay: float = 10.0,
    ) -> ModelType:
        time.sleep(rate_limit_delay)
        detail_response = requests.get(
            f"{self.base_url}/{item_id}",
            timeout=30
        )
        detail_response.raise_for_status()
        detail_data = detail_response.json()
        parsed_data = self._parse_fields(detail_data)

        db_item = self.crud.create(
            db=self.session,
            obj_in=self.create_schema(
                dasi_id=item_id,
                dasi_object=detail_data,
                dasi_published=dasi_published, # TODO: Scrape check
                **parsed_data,
            ),
        )

        return self._link_to_related_entities(db_item, detail_data)

    def import_all(
        self,
        task_id: str,
        rate_limit_delay: float = 10,
    ) -> Dict[str, Any]:
        task = self.task_progress_service.get_task(task_id)
        items_per_page = 30
        total_imported = task.processed_items
        total_skipped = 0
        current_page = (total_imported // items_per_page) + 1

        try:
            self.task_progress_service.update_progress(
                uuid=task_id,
                processed=0,
                total=None,
                status="running",
            )

            while True:
                time.sleep(rate_limit_delay)
                response = requests.get(
                    self.base_url,
                    params={"page": current_page},
                    timeout=30
                )
                response.raise_for_status()
                data = response.json()

                for item in data.get("member", []):
                    item_url = item.get("@id", "")
                    item_id = int(urlparse(item_url).path.split("/")[-1])

                    db_item = self.crud.get_by_dasi_id(self.session, dasi_id=item_id)
                    if db_item:
                        total_skipped += 1
                        self.task_progress_service.update_progress(
                            uuid=task_id,
                            processed=total_imported + 1,
                            total=data.get("totalItems", None),
                            skipped=total_skipped,
                            status="running",
                        )
                        continue

                    self.import_single(item_id)
                    total_imported += 1

                    self.task_progress_service.update_progress(
                        uuid=task_id,
                        processed=total_imported,
                        total=data.get("totalItems", None),
                        status="running",
                    )

                if "next" not in data.get("view", {}):
                    break

                current_page += 1

            self.task_progress_service.update_progress(
                uuid=task_id,
                processed=total_imported,
                total=None,
                status="completed",
            )

            return {"status": "success", "total_imported": total_imported}

        except Exception as e:
            self.task_progress_service.update_progress(
                uuid=task_id,
                processed=total_imported,
                status="failed",
                error=str(e),
            )
            return {"status": "error", "error": str(e)}

    def transfer_fields(self, data: Dict[str, Any]) -> UpdateSchemaType:
        item_fields = {}
        for key, value in data.items():
            snake_case_key = self._camel_to_snake(key)
            if key == "lastModified":
                item_fields[snake_case_key] = datetime.strptime(value, "%Y-%m-%d")
            else:
                item_fields[snake_case_key] = value
        return self.update_schema(**item_fields, dasi_object=data)

    def import_range(
        self,
        task_id: str,
        start_id: int, 
        end_id: int,
        dasi_published: bool = None,
        rate_limit_delay: float = 10,
        update_existing: bool = False,
    ) -> Dict[str, Any]:
        """
        Import a range of entities by their DASI IDs.
        """
        task = self.task_progress_service.get_task(task_id)
        total_imported = task.processed_items
        total_skipped = 0

        try:
            self.task_progress_service.update_progress(
                uuid=task_id,
                processed=total_imported,
                total=(end_id - start_id + 1),
                status="running",
            )

            for item_id in range(start_id, end_id + 1):
                db_item = self.crud.get_by_dasi_id(self.session, dasi_id=item_id)
                if db_item:
                    if update_existing:
                        pass
                    else:
                        total_skipped += 1
                        self.task_progress_service.update_progress(
                            uuid=task_id,
                            processed=total_imported + (item_id - start_id + 1),
                            total=(end_id - start_id + 1),
                            skipped=total_skipped,
                            status="running",
                        )
                        continue

                try:
                    self.import_single(
                        item_id,
                        dasi_published=dasi_published,
                        rate_limit_delay=rate_limit_delay,
                    )
                    total_imported += 1

                    self.task_progress_service.update_progress(
                        uuid=task_id,
                        processed=total_imported + (item_id - start_id + 1),
                        total=(end_id - start_id + 1),
                        status="running",
                    )
                except requests.exceptions.HTTPError as e:
                    if e.response.status_code == 404:
                        continue
                    if e.response.status_code == 500:
                        time.sleep(rate_limit_delay * 2)
                        try:
                            self.import_single(
                                item_id,
                                dasi_published=dasi_published,
                                rate_limit_delay=rate_limit_delay,
                            )
                            total_imported += 1
                            self.task_progress_service.update_progress(
                                uuid=task_id,
                                processed=total_imported + (item_id - start_id + 1),
                                total=(end_id - start_id + 1),
                                status="running",
                            )
                        except requests.exceptions.HTTPError as e:
                            if e.response.status_code == 404:
                                continue
                            elif e.response.status_code == 500:
                                # TODO: logging.error(f"Error importing item {item_id}: {e}")
                                continue
                    raise

            self.task_progress_service.update_progress(
                uuid=task_id,
                processed=total_imported,
                total=(end_id - start_id + 1),
                status="completed",
            )

            return {
                "status": "success", 
                "total_imported": total_imported,
                "range": f"{start_id}-{end_id}"
            }

        except Exception as e:
            self.task_progress_service.update_progress(
                uuid=task_id,
                processed=total_imported,
                total=(end_id - start_id + 1),
                status="failed",
                error=str(e),
            )
            return {"status": "error", "error": str(e)}

    async def import_image(
        self,
        rec_id: int,
        size: str = "high",
        save_directory: str = "public",
        rate_limit_delay: float = 1.0,
    ) -> Optional[str]:
        """
        Import an image from DASI.
        """
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

                    with open(file_path, "wb") as f:
                        async for chunk in response.content.iter_chunked(8192):
                            f.write(chunk)

                    relative_path = f"images/{filename}"
                    return relative_path

        except aiohttp.ClientError as e:
            # TODO: logging.error(f"Error downloading image for rec ID {rec_id}: {e}")
            return None
        except Exception as e:
            # TODO: logging.error(f"Error saving image for rec ID {rec_id}: {e}")
            return None

    async def import_images_range(
        self,
        task_id: str,
        start_id: int,
        end_id: int,
        image_size: str = "high",
        rate_limit_delay: float = 1.0,
    ) -> dict:
        """
        Import images for a range of record IDs.
        """
        successful_downloads = 0
        failed_downloads = 0
        downloaded_images = []
        total_range = end_id - start_id + 1

        try:
            self.task_progress_service.update_progress(
                uuid=task_id,
                processed=0,
                total=total_range,
                status="running",
            )

            for i, rec_id in enumerate(range(start_id, end_id + 1)):
                image_path = await self.import_image(
                    rec_id=rec_id,
                    size=image_size,
                    save_directory="public",
                    rate_limit_delay=rate_limit_delay,
                )

                if image_path:
                    successful_downloads += 1
                    downloaded_images.append({
                        "rec_id": rec_id,
                        "image_path": image_path
                    })
                else:
                    failed_downloads += 1

                if (i + 1) % 10 == 0 or (i + 1) == total_range:
                    self.task_progress_service.update_progress(
                        uuid=task_id,
                        processed=i + 1,
                        total=total_range,
                        status="running",
                    )

            self.task_progress_service.update_progress(
                uuid=task_id,
                processed=total_range,
                total=total_range,
                status="completed",
            )

            return {
                "status": "success",
                "total_processed": total_range,
                "successful_downloads": successful_downloads,
                "failed_downloads": failed_downloads,
                "downloaded_images": downloaded_images[:100]
            }

        except Exception as e:
            self.task_progress_service.update_progress(
                uuid=task_id,
                processed=successful_downloads + failed_downloads,
                total=total_range,
                status="failed",
                error=str(e),
            )
            return {"status": "error", "error": str(e)}

    async def import_all_images(
        self,
        task_id: str,
        start_rec_id: int = 1,
        image_size: str = "high",
        rate_limit_delay: float = 2.0,
        max_consecutive_failures: int = 50,
    ) -> dict:
        """
        Import all images from DASI.
        """
        try:
            current_rec_id = start_rec_id
            consecutive_failures = 0
            successful_downloads = 0
            total_attempts = 0
            downloaded_images = []

            self.task_progress_service.update_progress(
                uuid=task_id,
                processed=0,
                total=None,
                status="running",
            )

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
                    downloaded_images.append({
                        "rec_id": current_rec_id,
                        "image_path": image_path
                    })

                    if successful_downloads % 10 == 0:
                        self.task_progress_service.update_progress(
                            uuid=task_id,
                            processed=successful_downloads,
                            total=None,
                            status="running",
                        )
                else:
                    consecutive_failures += 1
                current_rec_id += 1

                if total_attempts % 100 == 0:
                    self.task_progress_service.update_progress(
                        uuid=task_id,
                        processed=successful_downloads,
                        total=None,
                        status="running",
                    )

            self.task_progress_service.update_progress(
                uuid=task_id,
                processed=successful_downloads,
                total=total_attempts,
                status="completed",
            )

            return {
                "status": "success",
                "total_attempts": total_attempts,
                "successful_downloads": successful_downloads,
                "final_rec_id": current_rec_id - 1,
                "consecutive_failures": consecutive_failures,
                "downloaded_images": downloaded_images[:100]
            }

        except Exception as e:
            self.task_progress_service.update_progress(
                uuid=task_id,
                processed=0,
                status="failed",
                error=str(e),
            )
            return {"status": "error", "error": str(e)}
