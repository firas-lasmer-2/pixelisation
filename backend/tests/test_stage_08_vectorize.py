import numpy as np

from app.pipeline.context import PipelineContext
from app.pipeline.stage_08_vectorize import run
from app.models.enums import KitSize


def test_vectorize_produces_svg():
    ctx = PipelineContext(kit_size=KitSize.stamp_kit_A4)
    h, w = 48, 64

    ctx.cleaned_mask = np.zeros((h, w), dtype=bool)
    ctx.cleaned_mask[10:40, 15:50] = True

    run(ctx)

    assert ctx.grid_cols == 84
    assert ctx.grid_rows == 119
    assert ctx.svg_content != ""
    assert ctx.svg_bytes != b""
    assert "<svg" in ctx.svg_content
    assert "viewBox" in ctx.svg_content


def test_vectorize_grid_dimensions():
    for kit_size, expected in [
        (KitSize.stamp_kit_30x40, (120, 160)),
        (KitSize.stamp_kit_40x50, (160, 200)),
        (KitSize.stamp_kit_A4, (84, 119)),
    ]:
        ctx = PipelineContext(kit_size=kit_size)
        ctx.cleaned_mask = np.ones((48, 64), dtype=bool)
        run(ctx)
        assert (ctx.grid_cols, ctx.grid_rows) == expected


def test_vectorize_empty_mask():
    ctx = PipelineContext(kit_size=KitSize.stamp_kit_A4)
    ctx.cleaned_mask = np.zeros((48, 64), dtype=bool)

    run(ctx)

    # Should still produce valid SVG even if no contours
    assert ctx.svg_content != ""
    assert ctx.grid_cols == 84
