import numpy as np

from app.pipeline.context import PipelineContext
from app.pipeline.stage_01_load import run as load
from app.pipeline.stage_02_segment import run as segment


def test_segment_produces_bool_mask(small_rgb_image):
    ctx = PipelineContext()
    load(ctx, small_rgb_image)
    segment(ctx)

    assert ctx.subject_mask is not None
    assert ctx.subject_mask.dtype == bool
    assert ctx.subject_mask.shape == ctx.source_rgb.shape[:2]


def test_segment_fallback_when_disabled(small_rgb_image):
    """When segmentation is disabled, mask should be all True."""
    from app.config import settings

    original = settings.enable_segmentation
    settings.enable_segmentation = False

    # Reset the cached segmenter
    import app.services.segmenter as seg_mod
    seg_mod._segmenter = None

    try:
        ctx = PipelineContext()
        load(ctx, small_rgb_image)
        segment(ctx)

        assert ctx.subject_mask is not None
        assert np.all(ctx.subject_mask)
    finally:
        settings.enable_segmentation = original
        seg_mod._segmenter = None
