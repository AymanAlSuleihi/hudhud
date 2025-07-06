import requests
import time

from sqlalchemy.orm import Session

from app.crud.crud_object import obj as crud_object
from app.crud.crud_site import site as crud_site
from app.crud.crud_epigraph import epigraph as crud_epigraph
from app.models.object import Object, ObjectCreate, ObjectUpdate
from app.services.task_progress import TaskProgressService
from app.services.import_service import ImportService


class ObjectImportService(ImportService[Object, ObjectCreate, ObjectUpdate]):
    def __init__(self, session: Session, task_progress_service: TaskProgressService):
        super().__init__(
            session=session,
            task_progress_service=task_progress_service,
            crud=crud_object,
            create_schema=ObjectCreate,
            update_schema=ObjectUpdate,
            api_endpoint="/objects",
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

    def import_single(
        self,
        item_id: int,
        dasi_published: bool = None,
        rate_limit_delay: float = 10
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
                dasi_published=dasi_published,
                **parsed_data,
            ),
        )

        db_item = self._link_to_related_entities(db_item, detail_data)
        return db_item
