from __future__ import annotations

import io

import cv2
import numpy as np
from PIL import Image

from app.pipeline.context import PipelineContext
from app.models.enums import STENCIL_PALETTE_SNAPSHOT, KIT_GRID


# Stencil palette colors as RGB tuples
_PALETTE_RGB = [
    (entry["r"], entry["g"], entry["b"]) for entry in STENCIL_PALETTE_SNAPSHOT
]


def _mask_to_indices(grid_mask_binary: np.ndarray, detail_level_levels: int) -> list[int]:
    """Convert a binary grid mask to a multi-level indices array.

    For stencil products, indices represent tonal levels:
    - 0: Background (exposed / vinyl removed — dark in preview)
    - 1-3: Subject detail levels (lighter = more protected)
    """
    h, w = grid_mask_binary.shape
    # Normalize to [0, 1]
    normalized = grid_mask_binary.astype(np.float32) / 255.0

    if detail_level_levels <= 2:
        # Binary: 0 = exposed, 1 = protected
        indices_2d = (normalized > 0.5).astype(np.uint8)
        # Map: exposed=0 (background), protected=3 (portrait)
        indices_2d = np.where(indices_2d == 0, 0, 3)
    elif detail_level_levels == 3:
        # 3 levels: 0, 1, 3
        indices_2d = np.zeros_like(normalized, dtype=np.uint8)
        indices_2d[normalized > 0.33] = 1
        indices_2d[normalized > 0.66] = 3
    else:
        # 4 levels: 0, 1, 2, 3
        indices_2d = np.zeros_like(normalized, dtype=np.uint8)
        indices_2d[normalized > 0.25] = 1
        indices_2d[normalized > 0.50] = 2
        indices_2d[normalized > 0.75] = 3

    return indices_2d.flatten().tolist()


def _render_preview(indices: list[int], cols: int, rows: int, scale: int = 4) -> bytes:
    """Render a preview PNG from the indices array."""
    arr = np.array(indices, dtype=np.uint8).reshape(rows, cols)

    preview = np.zeros((rows, cols, 3), dtype=np.uint8)
    for idx, (r, g, b) in enumerate(_PALETTE_RGB):
        preview[arr == idx] = [r, g, b]

    # Scale up for visibility
    if scale > 1:
        preview = cv2.resize(
            preview, (cols * scale, rows * scale), interpolation=cv2.INTER_NEAREST
        )

    img = Image.fromarray(preview, "RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _render_thumb(indices: list[int], cols: int, rows: int, target_width: int = 400) -> bytes:
    """Render a thumbnail PNG."""
    scale = max(1, target_width // cols)
    return _render_preview(indices, cols, rows, scale=scale)


def _render_comparison(source_rgb: np.ndarray, preview_png: bytes, target_height: int = 600) -> bytes:
    """Side-by-side comparison: original photo → stencil preview."""
    # Resize source to target height
    h, w = source_rgb.shape[:2]
    scale = target_height / h
    new_w = int(w * scale)
    source_resized = cv2.resize(source_rgb, (new_w, target_height), interpolation=cv2.INTER_AREA)

    # Load preview
    preview_img = Image.open(io.BytesIO(preview_png))
    preview_resized = preview_img.resize(
        (int(preview_img.width * target_height / preview_img.height), target_height),
        Image.NEAREST,
    )
    preview_arr = np.array(preview_resized)

    # Add separator
    sep_width = 4
    sep = np.ones((target_height, sep_width, 3), dtype=np.uint8) * 200

    # Concatenate
    comparison = np.concatenate([source_resized, sep, preview_arr], axis=1)

    img = Image.fromarray(comparison, "RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def run(ctx: PipelineContext) -> None:
    """Stage 9: Export — generate PNGs, PDF cut file, and indices array."""
    from app.models.enums import DetailLevel

    grid_cols, grid_rows = ctx.grid_cols, ctx.grid_rows

    # Get the grid-resolution mask
    grid_mask = getattr(ctx, "_grid_mask_binary", None)
    if grid_mask is None:
        # Fallback: downscale cleaned_mask
        grid_mask = cv2.resize(
            ctx.cleaned_mask.astype(np.uint8) * 255,
            (grid_cols, grid_rows),
            interpolation=cv2.INTER_AREA,
        )

    # Map detail level to number of tonal levels
    detail = ctx.effective_detail_level or ctx.detail_level
    level_count = {DetailLevel.bold: 2, DetailLevel.medium: 3, DetailLevel.fine: 4}
    levels = level_count.get(detail, 3)

    # Generate indices array
    ctx.indices = _mask_to_indices(grid_mask, levels)

    # Render previews
    ctx.preview_png = _render_preview(ctx.indices, grid_cols, grid_rows, scale=4)
    ctx.thumb_png = _render_thumb(ctx.indices, grid_cols, grid_rows, target_width=400)

    # Comparison
    if ctx.source_rgb is not None:
        ctx.comparison_png = _render_comparison(ctx.source_rgb, ctx.preview_png)

    # PDF cut file from SVG (optional, requires CairoSVG)
    try:
        import cairosvg
        ctx.cut_pdf_bytes = cairosvg.svg2pdf(bytestring=ctx.svg_bytes)
    except ImportError:
        ctx.cut_pdf_bytes = b""  # CairoSVG not available
