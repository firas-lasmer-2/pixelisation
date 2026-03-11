import numpy as np

from app.pipeline.context import PipelineContext
from app.pipeline.stage_01_load import run
from app.models.enums import DetailLevel


def test_load_produces_rgb_and_lab(small_rgb_image):
    ctx = PipelineContext()
    run(ctx, small_rgb_image)

    assert ctx.source_rgb is not None
    assert ctx.source_rgb.ndim == 3
    assert ctx.source_rgb.shape[2] == 3
    assert ctx.source_rgb.dtype == np.uint8

    assert ctx.lab is not None
    assert ctx.lab.ndim == 3
    assert ctx.lab.dtype == np.float32

    assert ctx.l_channel is not None
    assert ctx.l_channel.ndim == 2
    assert ctx.l_channel.min() >= 0.0
    assert ctx.l_channel.max() <= 1.0


def test_load_with_crop(small_rgb_image):
    from app.models.request import CropData

    crop = CropData(x=10, y=5, width=30, height=20)
    ctx = PipelineContext()
    run(ctx, small_rgb_image, crop=crop)

    assert ctx.source_rgb is not None
    # Cropped image should be smaller than or equal to original
    h, w = ctx.source_rgb.shape[:2]
    assert w <= 64
    assert h <= 48


def test_load_debug_output(small_rgb_image):
    ctx = PipelineContext(debug=True)
    run(ctx, small_rgb_image)

    assert "stage01_l_channel" in ctx.debug_images
    assert len(ctx.debug_images["stage01_l_channel"]) > 0
