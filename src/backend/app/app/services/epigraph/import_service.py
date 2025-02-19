from typing import Dict, Any
import requests
import time
from urllib.parse import urlparse
from datetime import datetime
import re

from sqlalchemy.orm import Session

from app.crud.crud_epigraph import epigraph as crud_epigraph
from app.models.epigraph import Epigraph, EpigraphCreate, EpigraphUpdate
from app.services.task_progress import TaskProgressService
from app.core.config import settings

class EpigraphImportService:
    def __init__(self, session: Session, task_progress_service: TaskProgressService):
        self.session = session
        self.base_url = settings.DASI_API_URL
        self.task_progress_service = task_progress_service

    def import_all(
        self,
        task_id: str,
        rate_limit_delay: float = 10,
    ) -> Dict[str, Any]:
        task = self.task_progress_service.get_task(task_id)
        epigrahs_per_page = 30 # TODO: Remove hardcoded value
        total_imported = task.processed_items
        current_page = total_imported // epigrahs_per_page

        try:
            self.task_progress_service.update_progress(
                task_id=task_id,
                processed=0,
                total=None,
                status="running",
            )

            while True:
                response = requests.get(
                    self.base_url,
                    params={"page": current_page},
                    timeout=30
                )
                response.raise_for_status()
                data = response.json()

                for epigraph in data.get("member", []):
                    epigraph_url = epigraph.get("@id", "")
                    epigraph_id = int(urlparse(epigraph_url).path.split("/")[-1])

                    db_epigraph = crud_epigraph.get_by_dasi_id(self.session, dasi_id=epigraph_id)
                    if db_epigraph:
                        continue

                    time.sleep(rate_limit_delay)
                    self._import_single(epigraph_id)
                    total_imported += 1

                    self.task_progress_service.update_progress(
                        task_id=task_id,
                        processed=total_imported,
                        total=data.get("totalItems", None),
                        status="running",
                    )

                if "next" not in data.get("view", {}):
                    break

                current_page += 1

            self.task_progress_service.update_progress(
                task_id=task_id,
                processed=total_imported,
                total=None,
                status="completed",
            )

            return {"status": "success", "total_imported": total_imported}

        except Exception as e:
            self.task_progress_service.update_progress(
                task_id=task_id,
                processed=total_imported,
                status="failed",
                error=str(e),
            )
            return {"status": "error", "error": str(e)}

    def _camel_to_snake(self, name: str) -> str:
        name = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
        return re.sub("([a-z0-9])([A-Z])", r"\1_\2", name).lower()

    def transfer_fields(self, epigraph_data: Dict[str, Any]) -> EpigraphUpdate:
        epigraph_fields = {}
        for key, value in epigraph_data.items():
            snake_case_key = self._camel_to_snake(key)
            if key == "lastModified":
                epigraph_fields[snake_case_key] = datetime.strptime(value, "%Y-%m-%d")
            else:
                epigraph_fields[snake_case_key] = value
        return EpigraphUpdate(**epigraph_fields, dasi_object=epigraph_data)

    def _import_single(self, epigraph_id: int) -> Epigraph:
        detail_response = requests.get(
            f"{self.base_url}/{epigraph_id}",
            timeout=30
        )
        detail_response.raise_for_status()
        detail_data = detail_response.json()

        return crud_epigraph.create(
            db=self.session,
            obj_in=EpigraphCreate(
                dasi_id=epigraph_id,
                dasi_object=detail_data,
            ),
        )
