from fastapi import FastAPI, Depends
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from sqlmodel import Session

from app.api.api_v1.api import api_router
from app.core.config import settings
from app.db.engine import engine


def custom_generate_unique_id(route: APIRoute):
    return f"{route.tags[0]}-{route.name}"

middleware = [
    Middleware(
        CORSMiddleware,
        allow_origins=["*"],
        # allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["POST", "PUT", "DELETE"],
        allow_headers=["*"],
    )
]

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    generate_unique_id_function=custom_generate_unique_id,
    middleware=middleware,
)

@app.get("/api/v1/", tags=["read_root"])
def read_root():
    return {"Hello": "World"}

app.include_router(api_router, prefix=settings.API_V1_STR)
app.mount("/public", StaticFiles(directory="public"), name="public")
