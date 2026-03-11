from __future__ import annotations

import re

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from app.pipeline.context import PipelineContext
from app.models.enums import KIT_GRID, KIT_PHYSICAL_MM


_MAX_CHARS = 22
_MIN_HEIGHT_MM = 3.0
_MIN_STROKE_MM = 0.3


def sanitize_text(text: str) -> str:
    """Sanitize dedication text: max 22 chars, no emoji, alphanumeric + basic punct."""
    text = text.strip()
    # Remove emoji and non-basic characters
    text = re.sub(r"[^\w\s.,!?'-]", "", text, flags=re.UNICODE)
    return text[:_MAX_CHARS]


def render_dedication_mask(
    text: str,
    grid_cols: int,
    grid_rows: int,
    phys_w_mm: float,
    phys_h_mm: float,
) -> np.ndarray | None:
    """Render dedication text as a binary mask at grid resolution.

    Text is placed bottom-right. Returns a bool array (grid_rows × grid_cols)
    where True = dedication pixel (will be exposed).
    """
    text = sanitize_text(text)
    if not text:
        return None

    cell_w_mm = phys_w_mm / grid_cols
    cell_h_mm = phys_h_mm / grid_rows

    # Minimum height in grid cells
    min_height_cells = max(int(_MIN_HEIGHT_MM / cell_h_mm), 3)

    # Font size in pixels (at grid resolution)
    font_size = min_height_cells

    # Create a temporary image to render text
    tmp = Image.new("L", (grid_cols, grid_rows), 0)
    draw = ImageDraw.Draw(tmp)

    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except (OSError, IOError):
        font = ImageFont.load_default()

    # Measure text
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    # Position: bottom-right with small margin
    margin = max(2, int(grid_cols * 0.02))
    x = grid_cols - text_w - margin
    y = grid_rows - text_h - margin

    if x < 0 or y < 0:
        # Text too large, skip
        return None

    draw.text((x, y), text, fill=255, font=font)

    mask = np.array(tmp) > 127
    return mask


def apply_dedication_to_indices(
    indices: list[int],
    dedication_mask: np.ndarray,
    grid_cols: int,
    grid_rows: int,
) -> list[int]:
    """Apply dedication mask to indices array — dedication pixels become exposed (index 0)."""
    indices_arr = np.array(indices, dtype=np.uint8).reshape(grid_rows, grid_cols)
    indices_arr[dedication_mask] = 0  # Exposed
    return indices_arr.flatten().tolist()


def run(ctx: PipelineContext) -> None:
    """Apply dedication text overlay if provided."""
    if not ctx.dedication_text:
        return

    phys_w, phys_h = KIT_PHYSICAL_MM[ctx.kit_size]

    dedication_mask = render_dedication_mask(
        text=ctx.dedication_text,
        grid_cols=ctx.grid_cols,
        grid_rows=ctx.grid_rows,
        phys_w_mm=phys_w,
        phys_h_mm=phys_h,
    )

    if dedication_mask is not None:
        ctx.indices = apply_dedication_to_indices(
            ctx.indices, dedication_mask, ctx.grid_cols, ctx.grid_rows
        )

        # Also update SVG — add text paths
        # For now, the text is rendered as raster in the indices; SVG text is P2
