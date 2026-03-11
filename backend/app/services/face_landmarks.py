from __future__ import annotations


class FaceLandmarkDetector:
    """Optional MediaPipe FaceMesh integration (P3).

    Stub implementation — returns None for all detections.
    """

    def __init__(self) -> None:
        self._detector = None

    def detect(self, rgb):
        """Detect face landmarks. Returns None (stub)."""
        return None
