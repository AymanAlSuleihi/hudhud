from app.models.epigraph import Epigraph
from app.services.enrichment.chunking import ChunkingService


def _build_epigraph(epigraph_id: int) -> Epigraph:
    return Epigraph(
        id=epigraph_id,
        dasi_object={},
        dasi_id=epigraph_id,
        title=f"Epigraph {epigraph_id}",
        uri=f"/epigraphs/{epigraph_id}",
        epigraph_text="Sample epigraph text",
        translations=[],
        chronology_conjectural=False,
        sites=[],
        language_level_1=None,
        language_level_2=None,
        language_level_3=None,
        alphabet=None,
        script_typology=None,
        script_cursus=[],
        textual_typology=None,
        textual_typology_conjectural=False,
        letter_measure=None,
        writing_techniques=[],
        royal_inscription=False,
        cultural_notes=[],
        apparatus_notes=[],
        general_notes=None,
        bibliography=[],
        concordances=[],
        license="test-license",
        first_published=None,
        editors=[],
        last_modified=None,
        dasi_published=True,
        images=[],
    )


def _persist_epigraph(session, epigraph_id: int) -> Epigraph:
    epigraph = _build_epigraph(epigraph_id)
    session.add(epigraph)
    session.commit()
    session.refresh(epigraph)
    return epigraph


def test_create_chunks_for_epigraph_batches_embeddings(session, monkeypatch):
    service = ChunkingService(session)

    chunk_dicts = [
        {
            "text": "first chunk",
            "type": "epigraph_text",
            "index": 0,
            "tokens": 2,
            "metadata": {"section": "first"},
        },
        {
            "text": "second chunk",
            "type": "translation",
            "index": 1,
            "tokens": 2,
            "metadata": {"section": "second"},
        },
    ]
    batch_calls = []

    monkeypatch.setattr(service, "chunk_epigraph", lambda epigraph: chunk_dicts)

    class FakeEmbeddingsService:
        def __init__(self, session):
            self.session = session

        def generate_embeddings_batch(self, texts):
            batch_calls.append(list(texts))
            return [[0.1, 0.2], [0.3, 0.4]]

        def generate_embedding(self, text):
            raise AssertionError("single-item embedding path should not be used")

    monkeypatch.setattr(
        "app.services.enrichment.chunking.EmbeddingsService",
        FakeEmbeddingsService,
    )

    epigraph = _build_epigraph(123)
    chunks = service.create_chunks_for_epigraph(epigraph, generate_embeddings=True)

    assert batch_calls == [["first chunk", "second chunk"]]
    assert [chunk.embedding for chunk in chunks] == [[0.1, 0.2], [0.3, 0.4]]


def test_create_and_save_chunks_defers_pipeline_embedding_flush(session, monkeypatch):
    service = ChunkingService(session)

    chunk_dicts = [
        {
            "text": "queued chunk",
            "type": "epigraph_text",
            "index": 0,
            "tokens": 2,
            "metadata": {"section": "queued"},
        }
    ]
    flush_calls = []

    monkeypatch.setattr(service, "chunk_epigraph", lambda epigraph: chunk_dicts)

    class FakeEmbeddingsService:
        def __init__(self, session):
            self.session = session

        def flush_pending_chunk_embeddings(self, force=False):
            flush_calls.append(force)
            return {"status": "waiting", "processed": 0}

        def generate_embeddings_batch(self, texts):
            raise AssertionError("immediate batch generation should not run in deferred mode")

    monkeypatch.setattr(
        "app.services.enrichment.chunking.EmbeddingsService",
        FakeEmbeddingsService,
    )

    epigraph = _persist_epigraph(session, 456)
    chunks = service.create_and_save_chunks(
        epigraph,
        generate_embeddings=True,
        defer_embedding_generation=True,
    )

    assert len(chunks) == 1
    assert chunks[0].embedding is None
    assert flush_calls == [False]
