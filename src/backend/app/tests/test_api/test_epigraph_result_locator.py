from app.services.search.service import SearchService


def test_locate_epigraph_query_result_returns_page_and_index(client, monkeypatch):
    def mock_locate(self, **kwargs):
        assert kwargs["dasi_id"] == 12345
        assert kwargs["page_size"] == 25
        assert kwargs["search_text"] == "sabaean"
        assert kwargs["sort_field"] == "dasi_id"
        assert kwargs["sort_order"] == "asc"
        return {"page": 3, "index": 52}

    monkeypatch.setattr(SearchService, "opensearch_locate_epigraph_result", mock_locate)

    response = client.post(
        "/api/v1/epigraphs/query/locate",
        json={
            "dasi_id": 12345,
            "search_text": "sabaean",
            "page_size": 25,
            "sort_field": "dasi_id",
            "sort_order": "asc",
            "filters": {},
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "dasi_id": 12345,
        "found": True,
        "page": 3,
        "index": 52,
    }


def test_locate_epigraph_query_result_returns_not_found(client, monkeypatch):
    def mock_locate(self, **kwargs):
        assert kwargs["dasi_id"] == 99999
        return None

    monkeypatch.setattr(SearchService, "opensearch_locate_epigraph_result", mock_locate)

    response = client.post(
        "/api/v1/epigraphs/query/locate",
        json={
            "dasi_id": 99999,
            "page_size": 25,
            "filters": {},
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "dasi_id": 99999,
        "found": False,
        "page": None,
        "index": None,
    }