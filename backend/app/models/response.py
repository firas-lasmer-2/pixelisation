from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int = 0
    stage: str = ""
    error: str | None = None
    quality_warnings: list[str] = []
    assets: dict[str, str] = {}
    manifest: dict[str, Any] | None = None


class PreviewResponse(BaseModel):
    preview_base64: str
    detail_level: str
    exposed_ratio: float
    quality_warnings: list[str] = []


class GenerateResponse(BaseModel):
    job_id: str
    status: str
