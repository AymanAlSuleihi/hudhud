from datetime import datetime, timedelta, timezone
from typing import Any, cast

from sqlmodel import select

from app.models.epigraph import Epigraph
from app.models.epigraph_chunk import EpigraphChunk, EpigraphChunkCreate
from app.crud.crud_epigraph_chunk import epigraph_chunk as crud_epigraph_chunk
from app.services.enrichment.embeddings import EmbeddingsService


def _embedding(value: float) -> list[float]:
    return [value] * 3072


def _create_epigraph(session, epigraph_id: int) -> Epigraph:
    epigraph = Epigraph(
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
    session.add(epigraph)
    session.commit()
    session.refresh(epigraph)
    return epigraph


def _create_pending_chunk(session, *, epigraph_id: int, text: str, token_count: int) -> EpigraphChunk:
    return crud_epigraph_chunk.create(
        session,
        obj_in=EpigraphChunkCreate(
            epigraph_id=epigraph_id,
            chunk_text=text,
            chunk_type="epigraph_text",
            chunk_index=0,
            token_count=token_count,
            chunk_metadata={},
            embedding=None,
        ),
    )


def test_flush_pending_chunk_embeddings_waits_for_more_data(session, monkeypatch):
    _create_epigraph(session, epigraph_id=1)
    chunk = _create_pending_chunk(session, epigraph_id=1, text="recent pending", token_count=10)
    service = EmbeddingsService(session)

    monkeypatch.setattr("app.services.enrichment.embeddings.settings.EMBEDDING_MAX_BATCH_INPUTS", 4)
    monkeypatch.setattr("app.services.enrichment.embeddings.settings.EMBEDDING_MAX_BATCH_TOKENS", 100)
    monkeypatch.setattr("app.services.enrichment.embeddings.settings.EMBEDDING_PENDING_MAX_AGE_SECONDS", 300)

    result = service.flush_pending_chunk_embeddings(force=False)

    refreshed = session.exec(select(EpigraphChunk).where(EpigraphChunk.id == chunk.id)).first()
    assert result["status"] == "waiting"
    assert result["pending"] == 1
    assert refreshed.embedding is None


def test_flush_pending_chunk_embeddings_processes_stale_chunks(session, monkeypatch):
    _create_epigraph(session, epigraph_id=1)
    first = _create_pending_chunk(session, epigraph_id=1, text="first", token_count=10)
    second = _create_pending_chunk(session, epigraph_id=1, text="second", token_count=12)

    stale_time = datetime.now(timezone.utc) - timedelta(minutes=10)
    first.created_at = stale_time
    second.created_at = stale_time
    session.add(first)
    session.add(second)
    session.commit()

    monkeypatch.setattr("app.services.enrichment.embeddings.settings.EMBEDDING_MAX_BATCH_INPUTS", 10)
    monkeypatch.setattr("app.services.enrichment.embeddings.settings.EMBEDDING_MAX_BATCH_TOKENS", 1000)
    monkeypatch.setattr("app.services.enrichment.embeddings.settings.EMBEDDING_PENDING_MAX_AGE_SECONDS", 60)

    service = EmbeddingsService(session)
    batch_calls = []

    monkeypatch.setattr(
        service,
        "generate_embeddings_batch",
        lambda texts, max_batch_size=None, max_total_tokens=None: batch_calls.append(
            {
                "texts": list(texts),
                "max_batch_size": max_batch_size,
                "max_total_tokens": max_total_tokens,
            }
        ) or [_embedding(0.1), _embedding(0.3)],
    )

    result = service.flush_pending_chunk_embeddings(force=False)

    assert result["status"] == "completed"
    assert result["processed"] == 2
    assert batch_calls == [
        {
            "texts": ["first", "second"],
            "max_batch_size": 10,
            "max_total_tokens": 1000,
        }
    ]

    updated_chunks = session.exec(select(EpigraphChunk).order_by(cast(Any, EpigraphChunk.id))).all()
    assert list(updated_chunks[0].embedding) == _embedding(0.1)
    assert list(updated_chunks[1].embedding) == _embedding(0.3)


def test_flush_pending_chunk_embeddings_processes_full_batch(session, monkeypatch):
    _create_epigraph(session, epigraph_id=1)
    _create_pending_chunk(session, epigraph_id=1, text="first", token_count=10)
    _create_pending_chunk(session, epigraph_id=1, text="second", token_count=12)

    monkeypatch.setattr("app.services.enrichment.embeddings.settings.EMBEDDING_MAX_BATCH_INPUTS", 2)
    monkeypatch.setattr("app.services.enrichment.embeddings.settings.EMBEDDING_MAX_BATCH_TOKENS", 1000)
    monkeypatch.setattr("app.services.enrichment.embeddings.settings.EMBEDDING_PENDING_MAX_AGE_SECONDS", 300)

    service = EmbeddingsService(session)
    batch_calls = []

    monkeypatch.setattr(
        service,
        "generate_embeddings_batch",
        lambda texts, max_batch_size=None, max_total_tokens=None: batch_calls.append(list(texts))
        or [_embedding(0.1), _embedding(0.3)],
    )

    result = service.flush_pending_chunk_embeddings(force=False)

    assert result["status"] == "completed"
    assert result["processed"] == 2
    assert batch_calls == [["first", "second"]]
