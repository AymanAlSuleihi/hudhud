from app.services.sitemap_service import SitemapService


def test_generate_sitemap_includes_current_public_routes():
    service = SitemapService(base_url="https://example.com")

    sitemap = service.generate_sitemap([101, 202])

    assert "<loc>https://example.com/</loc>" in sitemap
    assert "<loc>https://example.com/epigraphs</loc>" in sitemap
    assert "<loc>https://example.com/words</loc>" in sitemap
    assert "<loc>https://example.com/terms-of-service</loc>" in sitemap
    assert "<loc>https://example.com/privacy-policy</loc>" in sitemap
    assert "<loc>https://example.com/epigraphs/101</loc>" in sitemap
    assert "<loc>https://example.com/epigraphs/202</loc>" in sitemap
    assert "word/101" not in sitemap


def test_write_sitemap_creates_public_file(tmp_path):
    service = SitemapService(base_url="https://example.com", output_dir=tmp_path)

    output_path = service.write_sitemap([303])

    assert output_path == tmp_path / "sitemap.xml"
    assert output_path.exists()
    assert "<loc>https://example.com/epigraphs/303</loc>" in output_path.read_text(encoding="utf-8")