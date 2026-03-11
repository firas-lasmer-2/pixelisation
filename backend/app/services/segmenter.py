from __future__ import annotations

from typing import Protocol, runtime_checkable

import numpy as np

from app.config import settings


@runtime_checkable
class SubjectSegmenter(Protocol):
    def segment(self, rgb: np.ndarray) -> np.ndarray:
        """Return a boolean mask (H×W) where True = subject."""
        ...


class RembgSegmenter:
    """Segmenter using rembg for background removal."""

    def __init__(self) -> None:
        self._session = None

    def _get_session(self):
        if self._session is None:
            from rembg import new_session
            self._session = new_session("u2net")
        return self._session

    def segment(self, rgb: np.ndarray) -> np.ndarray:
        from rembg import remove

        # rembg expects RGB uint8, returns RGBA
        result = remove(
            rgb,
            session=self._get_session(),
            only_mask=True,
        )
        # result is a grayscale mask 0-255
        mask = result > 127
        return mask.astype(bool)


class FallbackSegmenter:
    """Returns all-True mask — treats entire image as subject."""

    def segment(self, rgb: np.ndarray) -> np.ndarray:
        h, w = rgb.shape[:2]
        return np.ones((h, w), dtype=bool)


_segmenter: SubjectSegmenter | None = None


def get_segmenter() -> SubjectSegmenter:
    global _segmenter
    if _segmenter is None:
        if settings.enable_segmentation:
            try:
                _segmenter = RembgSegmenter()
            except Exception:
                _segmenter = FallbackSegmenter()
        else:
            _segmenter = FallbackSegmenter()
    return _segmenter
