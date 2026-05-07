import asyncio
import inspect
from typing import Any, cast

from sqlmodel import select

from app.core.config import settings
from app.models.epigraph import Epigraph
from app.models.epigraph_chunk import EpigraphChunk
from app.services.enrichment.chunking import ChunkingService
from app.services.importers.epigraph import EpigraphImportService
from app.services.importers.object import ObjectImportService
from app.services.importers.site import SiteImportService
from app.services.pipeline.run_service import PipelineRunService
from app.services.search.service import SearchService


class DasiPipelineOrchestrator:
    PIPELINE_NAME = "dasi_sync"

    IMPORT_STAGE_CONFIG: tuple[tuple[str, str, Any], ...] = (
        ("sites", "import_sites", SiteImportService),
        ("objects", "import_objects", ObjectImportService),
        ("epigraphs", "import_epigraphs", EpigraphImportService),
    )

    def __init__(self, session):
        self.session = session
        self.pipeline_runs = PipelineRunService(session)

    def run(self, run_uuid: str, parameters: dict[str, Any] | None = None) -> None:
        payload = parameters or {}

        try:
            import_metrics, import_totals = self._run_imports(run_uuid=run_uuid, parameters=payload)
            self.pipeline_runs.update_run(
                run_uuid,
                total_items=import_totals["total_items"],
                processed_items=import_totals["processed_items"],
                skipped_items=import_totals["skipped_items"],
                failed_items=import_totals["failed_items"],
                metrics={"imports": import_metrics},
                merge_metrics=True,
            )

            chunk_metrics = {
                "enabled": payload.get("run_chunking", True),
                "processed_epigraphs": 0,
                "chunks_created": 0,
                "failed_ids": [],
            }
            if payload.get("run_chunking", True):
                self.pipeline_runs.mark_running(run_uuid, current_step="chunk")
                chunk_metrics = self._run_chunking(parameters=payload)
                self.pipeline_runs.update_run(
                    run_uuid,
                    failed_items=import_totals["failed_items"] + len(chunk_metrics["failed_ids"]),
                    metrics={"chunking": chunk_metrics},
                    merge_metrics=True,
                )

            indexing_metrics = {"enabled": payload.get("reindex_search", True), "indexed": 0}
            if payload.get("reindex_search", True):
                self.pipeline_runs.mark_running(run_uuid, current_step="index")
                indexed = SearchService(self.session).reindex_all_epigraphs() or 0
                indexing_metrics["indexed"] = indexed

            self.pipeline_runs.mark_completed(
                run_uuid,
                metrics={"indexing": indexing_metrics},
                merge_metrics=True,
            )
        except Exception as exc:
            self.session.rollback()
            self.pipeline_runs.mark_failed(run_uuid, error=str(exc))
            raise

    def _run_imports(self, *, run_uuid: str, parameters: dict[str, Any]) -> tuple[dict[str, Any], dict[str, int]]:
        import_metrics = {}
        totals = {
            "total_items": 0,
            "processed_items": 0,
            "skipped_items": 0,
            "failed_items": 0,
        }

        for stage_name, _, _ in self._build_import_plan(parameters):
            stage_metrics, stage_totals = self._run_import_stage(
                run_uuid=run_uuid,
                stage_name=stage_name,
                parameters=parameters,
            )
            import_metrics[stage_name] = stage_metrics
            totals["total_items"] += stage_totals["total_items"]
            totals["processed_items"] += stage_totals["processed_items"]
            totals["skipped_items"] += stage_totals["skipped_items"]
            totals["failed_items"] += stage_totals["failed_items"]

        return import_metrics, totals

    def _run_import_stage(
        self,
        *,
        run_uuid: str,
        stage_name: str,
        parameters: dict[str, Any],
    ) -> tuple[dict[str, Any], dict[str, int]]:
        stage_lookup: dict[str, Any] = {
            name: service_class
            for name, _, service_class in self.IMPORT_STAGE_CONFIG
        }
        service_class: Any = stage_lookup[stage_name]
        self.pipeline_runs.mark_running(
            run_uuid,
            current_step=f"import_{stage_name}",
        )

        import_service = service_class(self.session)
        start_id = parameters.get("start_id")
        end_id = parameters.get("end_id")
        dasi_published = parameters.get("dasi_published")
        rate_limit_delay = parameters.get("rate_limit_delay", 10.0)
        update_existing = parameters.get("update_existing", False)

        if start_id is not None and end_id is not None:
            result = import_service.import_range(
                start_id=start_id,
                end_id=end_id,
                dasi_published=dasi_published,
                rate_limit_delay=rate_limit_delay,
                update_existing=update_existing,
            )
        elif parameters.get("incremental", False):
            result = import_service.import_incremental(
                rate_limit_delay=rate_limit_delay,
                update_existing=update_existing,
            )
        else:
            result = import_service.import_all(
                rate_limit_delay=rate_limit_delay,
                update_existing=update_existing,
            )

        if inspect.isawaitable(result):
            result = asyncio.run(cast(Any, result))

        result_data = cast(dict[str, Any], result)

        if result_data.get("status") == "error":
            raise RuntimeError(f"{stage_name} import failed: {result_data.get('error', 'unknown error')}")

        total_items = result_data.get("total_items")
        if total_items is None:
            total_items = (
                result_data.get("processed_items", 0)
                + result_data.get("skipped_items", 0)
                + result_data.get("failed_items", 0)
            )

        return result_data, {
            "total_items": total_items,
            "processed_items": result_data.get("processed_items", 0),
            "skipped_items": result_data.get("skipped_items", 0),
            "failed_items": result_data.get("failed_items", 0),
        }

    def _build_import_plan(self, parameters: dict[str, Any]) -> list[tuple[str, str, type]]:
        selected_stages = []
        for stage_name, flag_name, service_class in self.IMPORT_STAGE_CONFIG:
            if parameters.get(flag_name, True):
                selected_stages.append((stage_name, flag_name, service_class))
        return selected_stages

    def _run_chunking(self, *, parameters: dict[str, Any]) -> dict[str, Any]:
        chunking_service = ChunkingService(self.session)
        generate_embeddings = parameters.get("generate_embeddings", True)
        defer_embedding_generation = generate_embeddings and settings.EMBEDDING_DEFER_PIPELINE_REQUESTS
        rechunk = parameters.get("rechunk", False)

        epigraphs = self._select_epigraphs_for_chunking(
            rechunk=rechunk,
            chunk_limit=parameters.get("chunk_limit"),
        )

        processed = 0
        chunks_created = 0
        failed_ids = []

        for epigraph in epigraphs:
            try:
                if rechunk:
                    chunks = chunking_service.update_chunks_for_epigraph(
                        epigraph,
                        generate_embeddings=generate_embeddings,
                        defer_embedding_generation=defer_embedding_generation,
                    )
                else:
                    chunks = chunking_service.create_and_save_chunks(
                        epigraph,
                        generate_embeddings=generate_embeddings,
                        defer_embedding_generation=defer_embedding_generation,
                    )
                processed += 1
                chunks_created += len(chunks)
            except Exception:
                self.session.rollback()
                failed_ids.append(epigraph.id)

        return {
            "processed_epigraphs": processed,
            "candidate_epigraphs": len(epigraphs),
            "chunks_created": chunks_created,
            "failed_ids": failed_ids,
            "generate_embeddings": generate_embeddings,
            "rechunk": rechunk,
        }

    def _select_epigraphs_for_chunking(self, *, rechunk: bool, chunk_limit: int | None) -> list[Epigraph]:
        published_column = cast(Any, Epigraph.dasi_published)
        epigraph_id_column = cast(Any, Epigraph.id)
        chunk_epigraph_id_column = cast(Any, EpigraphChunk.epigraph_id)

        query = select(Epigraph).where(published_column.is_(True))
        if not rechunk:
            subquery = select(chunk_epigraph_id_column).distinct()
            query = query.where(epigraph_id_column.not_in(subquery))
        if chunk_limit:
            query = query.limit(chunk_limit)
        return list(self.session.exec(query).all())


EpigraphPipelineOrchestrator = DasiPipelineOrchestrator
