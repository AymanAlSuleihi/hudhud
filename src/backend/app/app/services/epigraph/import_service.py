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

