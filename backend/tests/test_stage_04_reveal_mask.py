import numpy as np

from app.pipeline.context import PipelineContext
from app.pipeline.stage_04_reveal_mask import compute_reveal_mask, TARGET_SUBJECT_EXPOSED
from app.models.enums import DetailLevel


def _make_test_data(h=48, w=64):
    """Create synthetic feature maps for testing."""
    tone = np.random.rand(h, w).astype(np.float32)
    edge = np.zeros((h, w), dtype=bool)
    edge[10:12, :] = True  # horizontal edges
    edge[:, 30:32] = True  # vertical edges
    gradient = np.abs(np.random.randn(h, w)).astype(np.float32) * 0.3
    subject = np.zeros((h, w), dtype=bool)
    subject[5:43, 10:54] = True
    return tone, edge, gradient, subject


def test_background_always_exposed():
    tone, edge, gradient, subject = _make_test_data()
    mask = compute_reveal_mask(tone, edge, gradient, subject, DetailLevel.medium)

    # All non-subject pixels must be exposed
    assert np.all(mask[~subject])


def test_bold_exposes_less_subject_than_fine():
    tone, edge, gradient, subject = _make_test_data()

    mask_bold = compute_reveal_mask(tone, edge, gradient, subject, DetailLevel.bold)
    mask_fine = compute_reveal_mask(tone, edge, gradient, subject, DetailLevel.fine)

    subject_exposed_bold = np.sum(mask_bold & subject)
    subject_exposed_fine = np.sum(mask_fine & subject)

    # Fine should expose more subject detail than bold
    assert subject_exposed_fine >= subject_exposed_bold


def test_medium_between_bold_and_fine():
    tone, edge, gradient, subject = _make_test_data()

    mask_bold = compute_reveal_mask(tone, edge, gradient, subject, DetailLevel.bold)
    mask_medium = compute_reveal_mask(tone, edge, gradient, subject, DetailLevel.medium)
    mask_fine = compute_reveal_mask(tone, edge, gradient, subject, DetailLevel.fine)

    bold_count = np.sum(mask_bold & subject)
    medium_count = np.sum(mask_medium & subject)
    fine_count = np.sum(mask_fine & subject)

    assert medium_count >= bold_count
    assert fine_count >= medium_count


def test_empty_subject_returns_all_exposed():
    h, w = 48, 64
    tone = np.random.rand(h, w).astype(np.float32)
    edge = np.zeros((h, w), dtype=bool)
    gradient = np.zeros((h, w), dtype=np.float32)
    subject = np.zeros((h, w), dtype=bool)  # No subject

    mask = compute_reveal_mask(tone, edge, gradient, subject, DetailLevel.medium)

    # Everything exposed (all background)
    assert np.all(mask)
