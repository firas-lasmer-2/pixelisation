from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    storage_root: str = "./storage"
    max_long_side: int = 2560
    enable_segmentation: bool = True
    cors_origins: list[str] = [
        "http://localhost:8080",
        "https://helma.tn",
    ]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
