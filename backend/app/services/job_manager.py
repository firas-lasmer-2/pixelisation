from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any


class JobStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


@dataclass
class RevealJob:
    job_id: str
    status: JobStatus = JobStatus.pending
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    progress: int = 0
    stage: str = ""
    error: str | None = None
    manifest: dict[str, Any] | None = None
    quality_warnings: list[str] = field(default_factory=list)
    assets: dict[str, str] = field(default_factory=dict)


class JobManager:
    def __init__(self) -> None:
        self._jobs: dict[str, RevealJob] = {}

    def create(self, job_id: str) -> RevealJob:
        job = RevealJob(job_id=job_id)
        self._jobs[job_id] = job
        return job

    def get(self, job_id: str) -> RevealJob | None:
        return self._jobs.get(job_id)

    def update(self, job_id: str, **kwargs) -> RevealJob | None:
        job = self._jobs.get(job_id)
        if not job:
            return None
        for k, v in kwargs.items():
            if hasattr(job, k):
                setattr(job, k, v)
        job.updated_at = datetime.now(timezone.utc).isoformat()
        return job

    def list_jobs(self) -> list[RevealJob]:
        return list(self._jobs.values())
