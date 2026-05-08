from typing import Any
import requests
import time

from bs4 import BeautifulSoup
from bs4.element import Tag
from sqlmodel import Session

from app.crud.crud_site import site as crud_site
from app.models.site import Site, SiteCreate, SiteUpdate
from app.services.importers.base import ImportService


class SiteImportService(ImportService[Site, SiteCreate, SiteUpdate]):
    def __init__(self, session: Session):
        super().__init__(
            session=session,
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

                decimal = degrees + minutes / 60 + seconds / 3600

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

            first_row_fluid = soup.find("div", class_="row-fluid")
            inner_row_fluid = (
                first_row_fluid.find("div", class_="row-fluid")
                if isinstance(first_row_fluid, Tag)
                else None
            )
            accordion = inner_row_fluid.find("div", class_="accordion") if isinstance(inner_row_fluid, Tag) else None
            if not accordion:
                p = inner_row_fluid.find("p") if isinstance(inner_row_fluid, Tag) else None
                if p and "not published" in p.get_text():
                    content_dict["SITE NOT PUBLISHED"] = {
                        "header": "Site not published",
                        "sections": [p.get_text(strip=True)],
                        "parsed_data": {
                            "not published": p.get_text(strip=True)
                        }
                    }
            else:
                accordion_tag = accordion if isinstance(accordion, Tag) else None
                h3_elements = accordion_tag.find_all("h3") if accordion_tag else []

                for h3 in h3_elements:
                    header_text = h3.get_text(strip=True)
                    content_dict[header_text] = {
                        "header": header_text,
                        "sections": [],
                        "parsed_data": {},
                    }

                    current = h3.next_sibling
                    while current:
                        if isinstance(current, Tag):
                            if current.name == "h3":
                                break

                            class_names: list[str] = []
                            if current.name == "table":
                                content_dict[header_text]["sections"].append({
                                    "section": header_text,
                                    "table": str(current),
                                })
                                content_dict[header_text]["parsed_data"] = self.parse_table(current)

                            else:
                                raw_class_names = current.get("class")
                                if isinstance(raw_class_names, list):
                                    class_names = [str(class_name) for class_name in raw_class_names]
                                elif isinstance(raw_class_names, str):
                                    class_names = [raw_class_names]
                                else:
                                    class_names = []

                            if current.name == "div" and "accordion-group" in class_names:
                                accordion_inner = current.find("div", class_="accordion-inner")
                                table = accordion_inner.find("table") if isinstance(accordion_inner, Tag) else None
                                accordion_toggle = current.find("a", class_="accordion-toggle")

                                if table and isinstance(accordion_toggle, Tag):
                                    section_title = accordion_toggle.get_text(strip=True)
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

    def scrape_all(self, rate_limit_delay: float = 10.0) -> dict[str, Any]:
        """Scrape data for all sites with URIs."""
        total_scraped = 0
        failed_items = 0

        try:
            sites = self.crud.get_multi(self.session, skip=0, limit=10000)
            total_sites = len(sites)

            for site in sites:
                if site.uri:
                    try:
                        self.scrape_single(site.id, rate_limit_delay)
                        total_scraped += 1
                    except Exception as e:
                        print(f"Error scraping site {site.id}: {str(e)}")
                        failed_items += 1
                        continue

            return {
                "status": "success",
                "processed_items": total_scraped,
                "failed_items": failed_items,
                "total_items": total_sites,
            }

        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "processed_items": total_scraped,
                "failed_items": failed_items,
                "total_items": total_scraped + failed_items,
            }

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

    def _post_process_imported_item(
        self,
        db_item: Site,
        *,
        item_id: int,
        detail_data: dict[str, Any],
        dasi_published: bool | None = None,
        rate_limit_delay: float = 10,
    ) -> Site:
        if db_item.uri and db_item.id is not None:
            db_item = self.scrape_single(db_item.id, rate_limit_delay)

        scraped_data = db_item.dasi_object.get("scraped_data", {})
        site_update: SiteUpdate | None = None
        if scraped_data:
            site_update = self.transfer_scraped_data(scraped_data)
        elif dasi_published is not None:
            site_update = self.update_schema(
                dasi_published=dasi_published,
            )

        if site_update:
            db_item = self.crud.update(
                self.session,
                db_obj=db_item,
                obj_in=site_update,
            )

        return db_item