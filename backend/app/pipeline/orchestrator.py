from __future__ import annotations

import traceback
from typing import Callable

from app.pipeline.context import PipelineContext
from app.pipeline import (
    stage_01_load,
    stage_02_segment,
    stage_03_features,
    stage_04_reveal_mask,
    stage_05_hair,
    stage_06_cleanup,
    stage_07_quality,
    stage_08_vectorize,
    stage_09_export,
)
from app.pipeline.glitter_zones import run as run_glitter_zones
from app.pipeline.dedication import run as run_dedication
from app.models.enums import DetailLevel
from app.models.request import CropData


def _run_with_fallback(ctx: PipelineContext) -> None:
    """Run stages 4-7, handling auto-fallback if quality gate triggers."""
    # First pass
    stage_04_reveal_mask.run(ctx)
    stage_05_hair.run(ctx)
    stage_06_cleanup.run(ctx)
    stage_07_quality.run(ctx)

    # Check if fallback was triggered
    if ctx.effective_detail_level and ctx.effective_detail_level != ctx.detail_level:
        original = ctx.detail_level
        ctx.detail_level = ctx.effective_detail_level

        # Re-run stages 4-6 with new detail level
        stage_04_reveal_mask.run(ctx)
        stage_05_hair.run(ctx)
        stage_06_cleanup.run(ctx)

        # Re-check quality (without triggering another fallback)
        stage_07_quality.run(ctx)

        # Restore original for reporting
        ctx.quality_warnings.append(
            f"Used {ctx.effective_detail_level.value} instead of {original.value}"
        )


def run_full_pipeline(
    ctx: PipelineContext,
    image_bytes: bytes,
    crop: CropData | None = None,
    glitter_palette: str | None = None,
    on_progress: Callable[[int, str], None] | None = None,
) -> None:
    """Run the full 9-stage pipeline.

    Args:
        ctx: PipelineContext with configuration set
        image_bytes: Raw image file bytes
        crop: Optional crop rectangle
        glitter_palette: Glitter palette name (for glitter_reveal products)
        on_progress: Optional callback(percent, stage_name)
    """
    def progress(pct: int, stage: str) -> None:
        if on_progress:
            on_progress(pct, stage)

    try:
        progress(5, "Loading image")
        stage_01_load.run(ctx, image_bytes, crop)

        progress(15, "Segmenting subject")
        stage_02_segment.run(ctx)

        progress(25, "Analyzing features")
        stage_03_features.run(ctx)

        progress(40, "Computing reveal mask")
        _run_with_fallback(ctx)

        progress(60, "Vectorizing")
        stage_08_vectorize.run(ctx)

        progress(75, "Exporting assets")
        stage_09_export.run(ctx)

        progress(85, "Applying extras")
        # Glitter zones
        if glitter_palette:
            run_glitter_zones(ctx, glitter_palette)

        # Dedication
        if ctx.dedication_text:
            run_dedication(ctx)

        progress(100, "Complete")

    except Exception as e:
        ctx.quality_warnings.append(f"Pipeline error: {e}")
        traceback.print_exc()
        raise


def run_preview_pipeline(
    ctx: PipelineContext,
    image_bytes: bytes,
    crop: CropData | None = None,
) -> None:
    """Run stages 1-7 only for a quick preview (no vectorization/export)."""
    stage_01_load.run(ctx, image_bytes, crop)
    stage_02_segment.run(ctx)
    stage_03_features.run(ctx)
    _run_with_fallback(ctx)
