from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from app.models.enums import DetailLevel, ManufacturingMode, KitSize


@dataclass
class PipelineContext:
    # Input parameters
    detail_level: DetailLevel = DetailLevel.medium
    manufacturing_mode: ManufacturingMode = ManufacturingMode.adhesive_mask
    kit_size: KitSize = KitSize.stamp_kit_30x40
    product_type: str = "stencil_paint"
    debug: bool = False

    # Stage 1: Load
    source_rgb: np.ndarray | None = None  # H×W×3 uint8 RGB
    lab: np.ndarray | None = None  # H×W×3 float32 CIELAB
    l_channel: np.ndarray | None = None  # H×W float32 [0,1] normalized L

    # Stage 2: Segmentation
    subject_mask: np.ndarray | None = None  # H×W bool — True = subject

    # Stage 3: Feature maps
    tone_map: np.ndarray | None = None  # H×W float32 [0,1]
    edge_map: np.ndarray | None = None  # H×W bool
    gradient_map: np.ndarray | None = None  # H×W float32
    face_landmarks: object | None = None  # Optional face mesh data

    # Stage 4: Reveal mask
    reveal_mask: np.ndarray | None = None  # H×W bool — True = exposed

    # Stage 5: Hair-biased mask
    hair_mask: np.ndarray | None = None  # H×W bool — detected hair region

    # Stage 6: Cleaned mask
    cleaned_mask: np.ndarray | None = None  # H×W bool — final cleaned mask

    # Stage 7: Quality
    exposed_ratio: float = 0.0
    subject_exposed_ratio: float = 0.0
    edge_preservation_score: float = 0.0
    island_count: int = 0
    quality_warnings: list[str] = field(default_factory=list)
    effective_detail_level: DetailLevel | None = None  # After fallback

    # Stage 8: Vectorize
    contours: list | None = None
    svg_content: str = ""

    # Stage 9: Export
    grid_cols: int = 0
    grid_rows: int = 0
    indices: list[int] = field(default_factory=list)
    preview_png: bytes = b""
    thumb_png: bytes = b""
    comparison_png: bytes = b""
    svg_bytes: bytes = b""
    cut_pdf_bytes: bytes = b""

    # Glitter zones
    glitter_zones: np.ndarray | None = None  # H×W int — zone labels
    glitter_zone_preview: bytes = b""
    glitter_zone_legend: list[dict] = field(default_factory=list)

    # Dedication
    dedication_text: str = ""

    # Debug outputs
    debug_images: dict[str, bytes] = field(default_factory=dict)
