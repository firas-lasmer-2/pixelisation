import numpy as np

from app.pipeline.context import PipelineContext
from app.pipeline.stage_06_cleanup import run, _remove_small_components
from app.models.enums import DetailLevel


def test_removes_small_exposed_islands():
    mask = np.zeros((48, 64), dtype=bool)
    # Large exposed region
    mask[5:40, 5:55] = True
    # Small isolated exposed pixel
    mask[2, 2] = True

    cleaned = _remove_small_components(mask, min_area=5, value=True)
    # The tiny island should be removed
    assert not cleaned[2, 2]
    # The large region should remain
    assert np.sum(cleaned[5:40, 5:55]) > 0


def test_fills_small_holes():
    mask = np.ones((48, 64), dtype=bool)
    # Small hole
    mask[20, 30] = False

    filled = _remove_small_components(mask, min_area=5, value=False)
    # Small hole should be filled
    assert filled[20, 30]


def test_cleanup_preserves_large_features():
    ctx = PipelineContext(detail_level=DetailLevel.medium)
    mask = np.zeros((48, 64), dtype=bool)
    mask[5:40, 10:54] = True
    ctx.reveal_mask = mask.copy()

    run(ctx)

    # Large feature should be mostly preserved
    assert np.sum(ctx.cleaned_mask[5:40, 10:54]) > 0.8 * np.sum(mask[5:40, 10:54])
