from __future__ import annotations

from fastapi import APIRouter

from app.api.health import router as health_router
from app.api.reveal import router as reveal_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(reveal_router)
