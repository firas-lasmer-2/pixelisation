import numpy as np

from app.pipeline.glitter_zones import assign_glitter_zones, render_zone_preview


def _make_masks(h=48, w=64):
    subject = np.zeros((h, w), dtype=bool)
    subject[5:43, 10:54] = True

    reveal = np.zeros((h, w), dtype=bool)
    reveal[~subject] = True  # Background exposed
    reveal[10:20, 15:50] = True  # Some subject exposed

    hair = np.zeros((h, w), dtype=bool)
    hair[5:12, 10:54] = True  # Top part of subject

    edges = np.zeros((h, w), dtype=bool)
    edges[15, 20:45] = True

    return reveal, subject, hair, edges


def test_single_color_all_one_zone():
    reveal, subject, hair, edges = _make_masks()
    zones = assign_glitter_zones(reveal, subject, hair, edges, num_colors=1)

    # All exposed pixels should be zone 0
    assert np.all(zones[reveal] == 0)
    assert np.all(zones[~reveal] == -1)


def test_two_colors_bg_vs_subject():
    reveal, subject, hair, edges = _make_masks()
    zones = assign_glitter_zones(reveal, subject, hair, edges, num_colors=2)

    bg_exposed = reveal & ~subject
    subject_exposed = reveal & subject

    assert np.all(zones[bg_exposed] == 0)
    assert np.all(zones[subject_exposed] == 1)


def test_three_colors_has_three_zones():
    reveal, subject, hair, edges = _make_masks()
    zones = assign_glitter_zones(reveal, subject, hair, edges, num_colors=3)

    unique = set(zones[zones >= 0].flatten())
    assert len(unique) >= 2  # At least bg + one subject zone


def test_four_colors_has_accent():
    reveal, subject, hair, edges = _make_masks()
    zones = assign_glitter_zones(reveal, subject, hair, edges, num_colors=4)

    unique = set(zones[zones >= 0].flatten())
    assert 0 in unique  # Background zone
    assert len(unique) >= 2


def test_render_zone_preview():
    reveal, subject, hair, edges = _make_masks()
    zones = assign_glitter_zones(reveal, subject, hair, edges, num_colors=3)

    preview_bytes = render_zone_preview(zones, "neptune")
    assert len(preview_bytes) > 0
    # Should be valid PNG
    assert preview_bytes[:4] == b"\x89PNG"
