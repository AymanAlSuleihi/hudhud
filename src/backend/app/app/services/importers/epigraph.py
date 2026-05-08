import requests
import re
import logging
import os
import shutil
import asyncio

from bs4 import BeautifulSoup
from bs4.element import Tag
from sqlmodel import Session

from app.crud.crud_epigraph import epigraph as crud_epigraph
from app.models.epigraph import Epigraph, EpigraphCreate, EpigraphUpdate
from app.services.importers.base import ImportService
from app.core.config import settings


class EpigraphImportService(ImportService[Epigraph, EpigraphCreate, EpigraphUpdate]):
    def __init__(self, session: Session):
        super().__init__(
            session=session,
            crud=crud_epigraph,
            create_schema=EpigraphCreate,
            update_schema=EpigraphUpdate,
            api_endpoint="/epigraphs",
        )

    def import_single(
        self,
        item_id: int,
        dasi_published: bool | None = None,
        rate_limit_delay: float = 10,
    ) -> Epigraph:
        return asyncio.run(
            self._import_single_async(
                item_id,
                dasi_published=dasi_published,
                rate_limit_delay=rate_limit_delay,
            )
        )

    async def _import_single_async(
        self,
        item_id: int,
        dasi_published: bool | None = None,
        rate_limit_delay: float = 10,
    ) -> Epigraph:
        await asyncio.sleep(rate_limit_delay)
        detail_data = self._fetch_detail_data(item_id, rate_limit_delay=0)
        db_item = self._persist_detail_data(
            item_id=item_id,
            detail_data=detail_data,
            dasi_published=dasi_published,
        )

        if db_item.uri:
            db_item = await self.scrape_single(db_item.dasi_id, rate_limit_delay)

        return self._finalize_imported_item(db_item, detail_data)

    def _process_copyright_free_images(self, image_data: list) -> list:
        """
        Move copyright-free images from private to public storage.
        """
        processed_image_data = []

        for image in image_data:
            image_id = image.get("image_id")
            caption = image.get("caption", "")

            copyright_free = "free from copyright" in caption.lower()

            image_copy = image.copy()
            image_copy["copyright_free"] = copyright_free

            if copyright_free and image_id:
                private_path = f"private/images/rec_{image_id}_high.jpg"
                public_path = f"public/images/rec_{image_id}_high.jpg"

                try:
                    os.makedirs(os.path.dirname(public_path), exist_ok=True)

                    if os.path.exists(private_path):
                        shutil.move(private_path, public_path)
                        logging.info(f"Moved copyright-free image {image_id} from private to public storage")
                    else:
                        logging.warning(f"Copyright-free image {image_id} not found in private storage at {private_path}")
                except Exception as e:
                    logging.error(f"Error moving copyright-free image {image_id}: {str(e)}")

            processed_image_data.append(image_copy)

        return processed_image_data

    def _should_skip_existing_item(
        self,
        *,
        db_item: Epigraph | None,
        update_existing: bool,
        mode: str,
    ) -> bool:
        if not db_item or update_existing:
            return False

        if mode == "all" and not db_item.dasi_published:
            logging.info(f"Item {db_item.dasi_id} exists and is not published. Importing...")
            return False

        if mode == "all":
            logging.info(f"Item {db_item.dasi_id} already exists and is published. Skipping.")

        return True

    async def scrape_single(
        self,
        dasi_id: int,
        rate_limit_delay: float = 10,
        max_retries: int = 1,
    ):
        epigraph = self.crud.get_by_dasi_id(self.session, dasi_id=dasi_id)
        if not epigraph:
            raise ValueError(f"Epigraph with DASI ID {dasi_id} not found.")

        for attempt in range(max_retries + 1):
            try:
                await asyncio.sleep(rate_limit_delay)
                response = requests.get(
                    f"{settings.DASI_ADDRESS}/project/1/epigraphs/{dasi_id}",
                    timeout=30,
                )
                response.raise_for_status()
                soup = BeautifulSoup(response.content, "html.parser")

                alert_box = soup.find("div", {"id": "alert_box"})
                if alert_box:
                    alert_content = alert_box.get_text().strip()
                    if "not found or not yet published" in alert_content.lower():
                        updated_epigraph = self.crud.update(
                            db=self.session,
                            db_obj=epigraph,
                            obj_in={"dasi_published": False, "images": []}
                        )
                        return updated_epigraph
                break

            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 500:
                    if attempt < max_retries:
                        logging.warning(f"500 Server Error for DASI ID {dasi_id}, attempt {attempt + 1}/{max_retries + 1}. Retrying...")
                        continue
                    else:
                        logging.warning(f"500 Server Error for DASI ID {dasi_id} after {max_retries + 1} attempts. Skipping and marking as scraped with no images.")
                        updated_epigraph = self.crud.update(
                            db=self.session,
                            db_obj=epigraph,
                            obj_in={"images": []}
                        )
                        return updated_epigraph
                else:
                    raise
            except Exception:
                raise

        image_data = []

        main_img = soup.find("img", {"class": "cloudzoom"})
        if isinstance(main_img, Tag):
            main_src = str(main_img.get("src", "") or "")
            main_title = str(main_img.get("title", "") or "")

            rec_id_match = re.search(r"recId=(\d+)", main_src)
            if rec_id_match:
                image_id = rec_id_match.group(1)

                caption_id = str(main_img.get("data-cloudzoom", "") or "")
                caption_match = re.search(r'"captionSource":"#([^"]+)"', caption_id)
                caption_text = main_title

                if caption_match:
                    caption_element_id = caption_match.group(1)
                    caption_element = soup.find("div", {"id": caption_element_id})
                    if caption_element:
                        caption_text = caption_element.get_text(separator=" ").strip()

                image_data.append({
                    "image_id": image_id,
                    "caption": caption_text,
                    "is_main": True
                })

        thumbnail_links = soup.find_all("a", {"class": "cloudzoom-gallery"})
        for link in thumbnail_links:
            if not isinstance(link, Tag):
                continue

            data_cloudzoom = str(link.get("data-cloudzoom", "") or "")
            title = str(link.get("title", "") or "")

            image_url_match = re.search(r"image: '([^']+)'", data_cloudzoom)
            if image_url_match:
                image_url = image_url_match.group(1)
                rec_id_match = re.search(r"recId=(\d+)", image_url)

                if rec_id_match:
                    image_id = rec_id_match.group(1)

                    caption_source_match = re.search(r"captionSource: '#([^']+)'", data_cloudzoom)
                    caption_text = title

                    if caption_source_match:
                        caption_element_id = caption_source_match.group(1)
                        caption_element = soup.find("div", {"id": caption_element_id})
                        if caption_element:
                            caption_text = caption_element.get_text(separator=" ").strip()

                    if not any(img["image_id"] == image_id for img in image_data):
                        image_data.append({
                            "image_id": image_id,
                            "caption": caption_text,
                            "is_main": False
                        })

        for image in image_data:
            image_id = image.get("image_id")
            if image_id:
                try:
                    image_path = await self.import_image(
                        rec_id=int(image_id),
                        size="high",
                        save_directory="private",
                        rate_limit_delay=1.0,
                    )
                    if image_path:
                        logging.info(f"Downloaded image {image_id} to private storage: {image_path}")
                    else:
                        logging.warning(f"Failed to download image {image_id}")
                except Exception as e:
                    logging.error(f"Error downloading image {image_id}: {str(e)}")

        processed_image_data = self._process_copyright_free_images(image_data)
        updated_epigraph = self.crud.update(
            db=self.session,
            db_obj=epigraph,
            obj_in={"dasi_published": True, "images": processed_image_data}
        )
        return updated_epigraph