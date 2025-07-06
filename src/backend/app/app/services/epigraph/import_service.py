import requests
import time
import re
import logging
import os
import shutil
from bs4 import BeautifulSoup

from sqlalchemy.orm import Session

from app.crud.crud_epigraph import epigraph as crud_epigraph
from app.crud.crud_site import site as crud_site
from app.crud.crud_object import obj as crud_object
from app.models.epigraph import Epigraph, EpigraphCreate, EpigraphUpdate
from app.services.task_progress import TaskProgressService
from app.services.import_service import ImportService
from app.core.config import settings

class EpigraphImportService(ImportService[Epigraph, EpigraphCreate, EpigraphUpdate]):
    def __init__(self, session: Session, task_progress_service: TaskProgressService):
        super().__init__(
            session=session,
            task_progress_service=task_progress_service,
            crud=crud_epigraph,
            create_schema=EpigraphCreate,
            update_schema=EpigraphUpdate,
            api_endpoint="/epigraphs",
        )

    def _link_to_related_entities(self, db_item, detail_data):
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

        return db_item

    def import_single(
        self,
        item_id: int,
        dasi_published: bool = None,
        rate_limit_delay: float = 10,
    ):
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

        db_item = self._link_to_related_entities(db_item, detail_data)
        return db_item

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

    def scrape_single(
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
                time.sleep(rate_limit_delay)
                response = requests.get(
                    f"{settings.DASI_ADDRESS}/project/1/epigraphs/{dasi_id}",
                    timeout=30,
                )
                response.raise_for_status()
                soup = BeautifulSoup(response.content, "html.parser")
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
            except Exception as e:
                raise

        image_data = []

        main_img = soup.find("img", {"class": "cloudzoom"})
        if main_img:
            main_src = main_img.get("src", "")
            main_title = main_img.get("title", "")

            rec_id_match = re.search(r"recId=(\d+)", main_src)
            if rec_id_match:
                image_id = rec_id_match.group(1)

                caption_id = main_img.get("data-cloudzoom", "")
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
            data_cloudzoom = link.get("data-cloudzoom", "")
            title = link.get("title", "")

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

        processed_image_data = self._process_copyright_free_images(image_data)
        updated_epigraph = self.crud.update(
            db=self.session,
            db_obj=epigraph,
            obj_in={"images": processed_image_data}
        )
        return updated_epigraph

