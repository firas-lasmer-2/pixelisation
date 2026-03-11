from __future__ import annotations

import numpy as np

from app.pipeline.context import PipelineContext
from app.services.segmenter import SubjectSegmenter, get_segmenter


def run(ctx: PipelineContext) -> None:
    """Stage 2: Subject segmentation.

    Produces a boolean mask where True = subject pixel.
    Background pixels will always be EXPOSED in the final reveal.
    """
    segmenter = get_segmenter()
    ctx.subject_mask = segmenter.segment(ctx.source_rgb)

    if ctx.debug:
        import cv2

        vis = np.zeros_like(ctx.source_rgb)
        vis[ctx.subject_mask] = ctx.source_rgb[ctx.subject_mask]
        vis[~ctx.subject_mask] = (ctx.source_rgb[~ctx.subject_mask] * 0.3).astype(np.uint8)
        _, buf = cv2.imencode(".png", cv2.cvtColor(vis, cv2.COLOR_RGB2BGR))
        ctx.debug_images["stage02_segmentation"] = buf.tobytes()
