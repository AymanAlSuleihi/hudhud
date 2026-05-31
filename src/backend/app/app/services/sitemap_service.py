from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from xml.sax.saxutils import escape


@dataclass(slots=True)
class SitemapURL:
    loc: str
    lastmod: str
    changefreq: str = "weekly"
    priority: str = "0.5"

    def to_xml(self) -> str:
        return (
            "    <url>\n"
            f"        <loc>{escape(self.loc)}</loc>\n"
            f"        <lastmod>{self.lastmod}</lastmod>\n"
            f"        <changefreq>{self.changefreq}</changefreq>\n"
            f"        <priority>{self.priority}</priority>\n"
            "    </url>"
        )


class SitemapService:
    STATIC_PATHS = (
        "",
        "epigraphs",
        "words",
        "maps",
        "stats",
        "about",
        "terms-of-service",
        "privacy-policy",
    )

    def __init__(self, base_url: str, output_dir: Path | str = "public"):
        self.base_url = str(base_url).rstrip("/") + "/"
        self.output_dir = Path(output_dir)

    @staticmethod
    def _today() -> str:
        return datetime.now(timezone.utc).date().isoformat()

    def build_static_urls(self) -> list[SitemapURL]:
        today = self._today()
        return [SitemapURL(loc=f"{self.base_url}{path}", lastmod=today) for path in self.STATIC_PATHS]

    def build_dynamic_urls(self, epigraphs: Iterable[int | str]) -> list[SitemapURL]:
        today = self._today()
        return [
            SitemapURL(loc=f"{self.base_url}epigraphs/{epigraph_key}", lastmod=today)
            for epigraph_key in epigraphs
        ]

    def generate_sitemap(self, epigraphs: Iterable[int | str]) -> str:
        urls = self.build_static_urls() + self.build_dynamic_urls(epigraphs)
        urlset = "\n".join(url.to_xml() for url in urls)
        return (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            f"{urlset}\n"
            "</urlset>\n"
        )

    def write_sitemap(self, epigraphs: Iterable[int | str], filename: str = "sitemap.xml") -> Path:
        self.output_dir.mkdir(parents=True, exist_ok=True)
        output_path = self.output_dir / filename
        output_path.write_text(self.generate_sitemap(epigraphs), encoding="utf-8")
        return output_path
