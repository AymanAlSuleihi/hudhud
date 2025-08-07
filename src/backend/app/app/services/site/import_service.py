from typing import Any
import requests
import time

from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from app.crud.crud_site import site as crud_site
from app.crud.crud_epigraph import epigraph as crud_epigraph
from app.crud.crud_object import obj as crud_object
from app.models.site import Site, SiteCreate, SiteUpdate
from app.services.task_progress import TaskProgressService
from app.services.import_service import ImportService


class SiteImportService(ImportService[Site, SiteCreate, SiteUpdate]):
    def __init__(self, session: Session, task_progress_service: TaskProgressService):
        super().__init__(
            session=session,
            task_progress_service=task_progress_service,
            crud=crud_site,
            create_schema=SiteCreate,
            update_schema=SiteUpdate,
            api_endpoint="/sites",
        )

    def _parse_coordinates(self, coord_string: str) -> tuple[float, float] | None:
        """
        Parse coordinates from a string format to a tuple of floats.
        """
        if "Longitude:" in coord_string:
            lat_part, lon_part = coord_string.split("Longitude:")
            lat_part = lat_part.replace("Latitude:", "").strip()
            lon_part = lon_part.strip()
        else:
            return None

        def dms_to_decimal(dms_str: str) -> float | None:
            parts = dms_str.replace(" ", "").replace("°", " ").replace("'", " ").replace('"', " ").strip().split()

            if len(parts) < 2:
                return None

            try:
                degrees = float(parts[0])
                minutes = float(parts[1])
                seconds = float(parts[2]) if len(parts) >= 3 else 0.0

                decimal = degrees + minutes/60 + seconds/3600

                if dms_str.strip()[0] == "-":
                    decimal = -decimal

                return decimal
            except (ValueError, IndexError):
                return None

        lat = dms_to_decimal(lat_part)
        lon = dms_to_decimal(lon_part)

        if lat is None or lon is None:
            return None

        return (lat, lon)

    def parse_table(self, table) -> dict | list:
        """Parse table content into either a dictionary or list."""
        for br in table.find_all("br"):
            br.replace_with("\n")

        rows = table.find_all("tr")

        has_headers = False
        for row in rows:
            cells = row.find_all(["td", "th"])
            if len(cells) == 2 and cells[0].find("strong"):
                has_headers = True
                break

        if has_headers:
            result = {}
            for row in rows:
                cells = row.find_all(["td", "th"])
                if len(cells) == 2:
                    key = cells[0].get_text(strip=True).replace(":", "")

                    cell = cells[1]

                    for a in cell.find_all("a"):
                        href = a.get("href")
                        if href:
                            processed_link = self._process_link(href)
                            if processed_link:
                                a["href"] = processed_link

                    for tag in cell.find_all(True):
                        if tag.name != "a":
                            tag.unwrap()

                    value = cell.decode_contents()

                    if key:
                        result[key] = value
            return result
        else:
            result = []
            for row in rows:
                cells = row.find_all(["td", "th"])
                if cells:
                    for cell in cells:
                        for a in cell.find_all("a"):
                            href = a.get("href")
                            if href:
                                processed_link = self._process_link(href)
                                if processed_link:
                                    a["href"] = processed_link
                        for tag in cell.find_all(True):
                            if tag.name != "a":
                                tag.unwrap()
                        result.append(cell.decode_contents())
            return result

    def scrape_single(self, site_id: int, rate_limit_delay: float = 10.0) -> Site:
        """Scrape additional data from a site's URI page and update the database record."""
        site = self.crud.get(self.session, id=site_id)
        if not site or not site.uri:
            raise ValueError(f"Site {site_id} not found or has no URI")

        time.sleep(rate_limit_delay)

        try:
            uri = site.uri.replace("csai-", "")
            response = requests.get(uri, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, "html.parser")
            content_dict = {}

            inner_row_fluid = soup.find("div", class_="row-fluid").find("div", class_="row-fluid")
            accordion = inner_row_fluid.find("div", class_="accordion") if inner_row_fluid else None
            if not accordion:
                p = inner_row_fluid.find("p")
                if p and "not published" in p.get_text():
                    content_dict["SITE NOT PUBLISHED"] = {
                        "header": "Site not published",
                        "sections": [p.get_text(strip=True)],
                        "parsed_data": {
                            "not published": p.get_text(strip=True)
                        }
                    }
            else:
                h3_elements = accordion.find_all("h3")

                for h3 in h3_elements:
                    header_text = h3.get_text(strip=True)
                    content_dict[header_text] = {
                        "header": header_text,
                        "sections": [],
                        "parsed_data": {},
                    }

                    current = h3.next_sibling
                    while current and current.name != "h3":
                        if current.name == "table":
                            content_dict[header_text]["sections"].append({
                                "section": header_text,
                                "table": str(current),
                            })
                            content_dict[header_text]["parsed_data"] = self.parse_table(current)

                        elif current.name == "div" and "accordion-group" in current.get("class", []):
                            accordion_inner = current.find("div", class_="accordion-inner")
                            table = accordion_inner.find("table") if accordion_inner else None

                            if table:
                                section_title = current.find("a", class_="accordion-toggle").get_text(strip=True)
                                parsed_data = self.parse_table(table)

                                content_dict[header_text]["sections"].append({
                                    "section": section_title,
                                    "table": str(table),
                                })
                                content_dict[header_text]["parsed_data"][section_title] = parsed_data

                        current = current.next_sibling

            updated_site = self.crud.update(
                self.session,
                db_obj=site,
                obj_in=SiteUpdate(
                    dasi_object={**site.dasi_object, "scraped_data": content_dict}
                ),
            )
            return updated_site

        except requests.RequestException as e:
            raise Exception(f"Failed to scrape URI {site.uri}: {str(e)}")

    def scrape_all(self, task_id: str, rate_limit_delay: float = 10.0) -> dict[str, Any]:
        """Scrape data for all sites with URIs."""
        task = self.task_progress_service.get_task(task_id)
        total_scraped = task.processed_items

        try:
            self.task_progress_service.update_progress(
                uuid=task_id,
                processed=0,
                total=None,
                status="running",
            )

            sites = self.crud.get_multi(self.session, skip=0, limit=10000)
            total_sites = len(sites)

            for site in sites:
                if site.uri:
                    try:
                        self.scrape_single(site.id, rate_limit_delay)
                        total_scraped += 1
                    except Exception as e:
                        print(f"Error scraping site {site.id}: {str(e)}")
                        continue

                self.task_progress_service.update_progress(
                    uuid=task_id,
                    processed=total_scraped,
                    total=total_sites,
                    status="running",
                )

            self.task_progress_service.update_progress(
                uuid=task_id,
                processed=total_scraped,
                total=total_sites,
                status="completed",
            )

            return {"status": "success", "total_scraped": total_scraped}

        except Exception as e:
            self.task_progress_service.update_progress(
                uuid=task_id,
                processed=total_scraped,
                status="failed",
                error=str(e),
            )
            return {"status": "error", "error": str(e)}

    def transfer_scraped_data(self, data: dict[str, Any]) -> SiteUpdate:
        """Transfer scraped data to the update schema."""
        update_data = {}

        for header, content in data.items():
            parsed_data = content.get("parsed_data", {})
            if parsed_data:
                if header == "SITE NOT PUBLISHED":
                    update_data["dasi_published"] = False
                    return SiteUpdate(**update_data)
                if header == "SITE INFORMATION":
                    for key, value in parsed_data.items():
                        key = key.replace(" ", "_").lower()
                        if key == "coordinates":
                            value = self._parse_coordinates(value)
                        elif key == "classical_sources":
                            value = [source.strip() for source in value.split("\n") if source.strip()]
                            value = [source for source in value if source]
                        elif key == "archaeological_missions":
                            value = [mission.strip() for mission in value.split("\n") if mission.strip()]
                            value = [mission for mission in value if mission]
                        elif key == "travellers":
                            value = [traveller.strip() for traveller in value.split("\n") if traveller.strip()]
                            value = [traveller for traveller in value if traveller]
                        elif key == "structures":
                            value = [structure.strip() for structure in value.split("\n") if structure.strip()]
                            value = [structure for structure in value if structure]
                        elif key == "deities":
                            value = [deity.strip() for deity in value.split("\n") if deity.strip()]
                            value = [deity for deity in value if deity]
                        elif key == "tribe":
                            value = [tribe.strip() for tribe in value.split("\n") if tribe.strip()]
                            value = [tribe for tribe in value if tribe]
                        elif key == "kingdom":
                            value = [kingdom.strip() for kingdom in value.split("\n") if kingdom.strip()]
                            value = [kingdom for kingdom in value if kingdom]

                        update_data[key] = value
                elif header == "BIBLIOGRAPHY":
                    bibliography = []
                    for short_ref, ref in parsed_data.items():
                        bibliography.append({
                            "short reference": short_ref,
                            "reference": ref,
                        })
                    update_data["bibliography"] = bibliography
                elif header == "MONUMENTS":
                    monuments = []
                    for monument, description in parsed_data.items():
                        monuments.append({
                            "monument": monument,
                            "description": description,
                        })
                    update_data["monuments"] = monuments
                else:
                    if isinstance(parsed_data, list):
                        parsed_data = [item for item in parsed_data if item]
                    key = header.replace(" ", "_").lower()
                    update_data[key] = parsed_data

        return SiteUpdate(**update_data)

    def _link_to_related_entities(self, db_item, detail_data):
        epigraph_list = detail_data.get("epigraphs", [])
        epigraph_dasi_ids = [
            int(epigraph["@id"].split("/")[-1])
            for epigraph in epigraph_list
            if "@id" in epigraph
        ]
        for epigraph_dasi_id in epigraph_dasi_ids:
            epigraph = crud_epigraph.get_by_dasi_id(
                self.session, dasi_id=epigraph_dasi_id
            )
            if epigraph:
                crud_site.link_to_epigraph(
                    self.session, site=db_item, epigraph_id=epigraph.id
                )
        object_list = detail_data.get("objects", [])
        object_dasi_ids = [
            int(obj["@id"].split("/")[-1])
            for obj in object_list
            if "@id" in obj
        ]
        for object_dasi_id in object_dasi_ids:
            obj = crud_object.get_by_dasi_id(
                self.session, dasi_id=object_dasi_id
            )
            if obj:
                crud_site.link_to_object(
                    self.session, site=db_item, object_id=obj.id
                )
        return db_item

    def import_single(self, item_id: int, rate_limit_delay: float = 10, dasi_published: bool = True) -> Site:
        time.sleep(rate_limit_delay)
        detail_response = requests.get(
            f"{self.base_url}/{item_id}",
            timeout=30
        )
        detail_response.raise_for_status()
        detail_data = detail_response.json()
        parsed_data = self._parse_fields(detail_data)

        db_item = self.crud.get_by_dasi_id(self.session, dasi_id=item_id)
        if db_item:
            db_item = self.crud.update(
                db=self.session,
                db_obj=db_item,
                obj_in=self.update_schema(
                    dasi_id=item_id,
                    dasi_object=detail_data,
                    dasi_published=dasi_published,
                    **parsed_data,
                ),
            )
        else:
            db_item = self.crud.create(
                db=self.session,
                obj_in=self.create_schema(
                    dasi_id=item_id,
                    dasi_object=detail_data,
                    **parsed_data,
                ),
            )

        if db_item.uri:
            db_item = self.scrape_single(db_item.id, rate_limit_delay)

        scraped_data = db_item.dasi_object.get("scraped_data", {})
        if scraped_data:
            site_update = self.transfer_scraped_data(scraped_data)
        else:
            if not dasi_published is None:
                site_update = self.update_schema(
                    dasi_published=dasi_published,
                )

        if site_update:
            db_item = self.crud.update(
                self.session,
                db_obj=db_item,
                obj_in=site_update,
            )

        db_item = self._link_to_related_entities(db_item, detail_data)
        return db_item
