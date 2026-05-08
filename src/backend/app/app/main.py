import time
from collections import deque
from typing import Deque, Dict

from fastapi import FastAPI
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.api.api_v1.api import api_router
from app.api.api_v1.endpoints.social_meta import router as social_meta_router
from app.core.config import settings


def custom_generate_unique_id(route: APIRoute):
    first_tag = route.tags[0] if route.tags else "default"
    return f"{first_tag}-{route.name}"

app = FastAPI(
    title=settings.PROJECT_NAME,
    summary="API for epigraph search, enrichment pipelines, and editorial operations.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    generate_unique_id_function=custom_generate_unique_id,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    # allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 60, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = int(max_requests)
        self.window = int(window_seconds)
        self.clients: Dict[str, Deque[float]] = {}

    def _get_client_ip(self, request):
        xff = request.headers.get("x-forwarded-for")
        if xff:
            return xff.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"

    async def dispatch(self, request, call_next):
        path = request.url.path
        epigraphs_paths = [f"{settings.API_V1_STR}/epigraphs", "/epigraphs"]
        if any(path.startswith(p) for p in epigraphs_paths):
            ip = self._get_client_ip(request)
            now = time.monotonic()
            dq = self.clients.get(ip)
            if dq is None:
                dq = deque()
                self.clients[ip] = dq

            while dq and dq[0] <= now - self.window:
                dq.popleft()

            if len(dq) >= self.max_requests:
                return Response(
                    content="Too many requests, slow down.",
                    status_code=429,
                    media_type="text/plain",
                )

            dq.append(now)

        return await call_next(request)


@app.get("/api/v1/", include_in_schema=False)
def read_root() -> dict[str, str]:
    return {"Hello": "World"}

app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(social_meta_router)
app.mount("/public", StaticFiles(directory="public"), name="public")
app.add_middleware(RateLimitMiddleware, max_requests=60, window_seconds=60)
