import numpy as np

from app.pipeline.context import PipelineContext
from app.pipeline.stage_07_quality import run
from app.models.enums import DetailLevel


def test_quality_metrics_computed():
    ctx = PipelineContext(detail_level=DetailLevel.medium)
    h, w = 48, 64

    ctx.cleaned_mask = np.zeros((h, w), dtype=bool)
    ctx.cleaned_mask[:24, :] = True  # Top half exposed

    ctx.subject_mask = np.zeros((h, w), dtype=bool)
    ctx.subject_mask[5:43, 10:54] = True

    ctx.edge_map = np.zeros((h, w), dtype=bool)
    ctx.edge_map[12, :] = True

    run(ctx)

    assert 0.0 <= ctx.exposed_ratio <= 1.0
    assert 0.0 <= ctx.subject_exposed_ratio <= 1.0
    assert 0.0 <= ctx.edge_preservation_score <= 1.0
    assert ctx.island_count >= 0


def test_auto_fallback_triggers_on_deviation():
    ctx = PipelineContext(detail_level=DetailLevel.fine)
    h, w = 48, 64

    # Create a mask where subject exposure is way off target
    ctx.cleaned_mask = np.zeros((h, w), dtype=bool)
    ctx.cleaned_mask[:5, :5] = True  # Very little exposed

    ctx.subject_mask = np.ones((h, w), dtype=bool)
    ctx.edge_map = np.zeros((h, w), dtype=bool)

    run(ctx)

    # Should trigger fallback from fine to medium
    assert ctx.effective_detail_level is not None
    assert ctx.effective_detail_level != DetailLevel.fine
    assert len(ctx.quality_warnings) > 0


def test_no_fallback_when_within_tolerance():
    ctx = PipelineContext(detail_level=DetailLevel.medium)
    h, w = 48, 64

    ctx.subject_mask = np.zeros((h, w), dtype=bool)
    ctx.subject_mask[5:43, 10:54] = True

    # Create a mask with ~50% subject exposure (target for medium)
    ctx.cleaned_mask = np.zeros((h, w), dtype=bool)
    subject_count = np.sum(ctx.subject_mask)
    # Expose roughly 50% of subject
    ctx.cleaned_mask[:24, :] = True
    ctx.cleaned_mask[~ctx.subject_mask] = False
    # Add background exposure
    ctx.cleaned_mask[~ctx.subject_mask] = True

    ctx.edge_map = np.zeros((h, w), dtype=bool)

    run(ctx)

    # No fallback if within tolerance
    assert ctx.effective_detail_level == DetailLevel.medium
