from __future__ import annotations

import uuid
from pathlib import Path

from app.config import settings


_SUBDIRS = ("source", "masks", "vectors", "renders", "guide", "debug")


class StorageService:
    def __init__(self, root: str | None = None) -> None:
        self.root = Path(root or settings.storage_root)

    def job_dir(self, job_id: str) -> Path:
        return self.root / "jobs" / job_id

    def ensure_job_dirs(self, job_id: str) -> Path:
        base = self.job_dir(job_id)
        for sub in _SUBDIRS:
            (base / sub).mkdir(parents=True, exist_ok=True)
        return base

    def new_job_id(self) -> str:
        return uuid.uuid4().hex[:12]

    def source_path(self, job_id: str) -> Path:
        return self.job_dir(job_id) / "source" / "input.png"

    def mask_path(self, job_id: str, name: str = "reveal") -> Path:
        return self.job_dir(job_id) / "masks" / f"{name}.png"

    def vector_path(self, job_id: str, ext: str = "svg") -> Path:
        return self.job_dir(job_id) / "vectors" / f"cut.{ext}"

    def render_path(self, job_id: str, name: str = "preview") -> Path:
        return self.job_dir(job_id) / "renders" / f"{name}.png"

    def guide_path(self, job_id: str) -> Path:
        return self.job_dir(job_id) / "guide" / "instructions.pdf"

    def debug_path(self, job_id: str, name: str) -> Path:
        return self.job_dir(job_id) / "debug" / f"{name}.png"

    def manifest_path(self, job_id: str) -> Path:
        return self.job_dir(job_id) / "manifest.json"
