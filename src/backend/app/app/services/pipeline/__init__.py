from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.services.pipeline.dispatch import dispatch_dasi_pipeline
    from app.services.pipeline.orchestrator import (
        DasiPipelineOrchestrator,
        EpigraphPipelineOrchestrator,
    )
    from app.services.pipeline.run_service import PipelineRunService

__all__ = [
    "dispatch_dasi_pipeline",
    "DasiPipelineOrchestrator",
    "EpigraphPipelineOrchestrator",
    "PipelineRunService",
]


def __getattr__(name: str) -> Any:
    if name == "dispatch_dasi_pipeline":
        from app.services.pipeline.dispatch import dispatch_dasi_pipeline

        return dispatch_dasi_pipeline

    if name in {"DasiPipelineOrchestrator", "EpigraphPipelineOrchestrator"}:
        from app.services.pipeline.orchestrator import (
            DasiPipelineOrchestrator,
            EpigraphPipelineOrchestrator,
        )

        return {
            "DasiPipelineOrchestrator": DasiPipelineOrchestrator,
            "EpigraphPipelineOrchestrator": EpigraphPipelineOrchestrator,
        }[name]

    if name == "PipelineRunService":
        from app.services.pipeline.run_service import PipelineRunService

        return PipelineRunService

    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")