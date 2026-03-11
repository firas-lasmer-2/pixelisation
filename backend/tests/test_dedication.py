import numpy as np

from app.pipeline.dedication import sanitize_text, render_dedication_mask, apply_dedication_to_indices


def test_sanitize_text_max_length():
    result = sanitize_text("A" * 30)
    assert len(result) == 22


def test_sanitize_text_removes_emoji():
    result = sanitize_text("Hello 🎨 World")
    assert "🎨" not in result
    assert "Hello" in result


def test_sanitize_text_preserves_basic_chars():
    result = sanitize_text("John's Art!")
    assert result == "John's Art!"


def test_render_dedication_mask_shape():
    mask = render_dedication_mask("Test", 84, 119, 210, 297)
    if mask is not None:
        assert mask.shape == (119, 84)
        assert mask.dtype == bool
        assert np.any(mask)  # Should have some True pixels


def test_render_empty_text():
    mask = render_dedication_mask("", 84, 119, 210, 297)
    assert mask is None


def test_apply_dedication_to_indices():
    cols, rows = 10, 10
    indices = [3] * (cols * rows)  # All portrait
    mask = np.zeros((rows, cols), dtype=bool)
    mask[8:10, 7:10] = True  # Bottom-right corner

    result = apply_dedication_to_indices(indices, mask, cols, rows)
    assert len(result) == cols * rows

    # Bottom-right should be exposed (0)
    idx_2d = np.array(result).reshape(rows, cols)
    assert idx_2d[9, 9] == 0
    # Top-left should still be portrait (3)
    assert idx_2d[0, 0] == 3
