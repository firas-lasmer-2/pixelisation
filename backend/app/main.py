from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.api.router import api_router
from app.dependencies import storage


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure storage root exists
    storage.root.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="Helma Reveal Backend",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

# Serve job assets as static files
try:
    storage_path = storage.root / "jobs"
    storage_path.mkdir(parents=True, exist_ok=True)
    app.mount("/files", StaticFiles(directory=str(storage_path)), name="files")
except Exception:
    pass
