from __future__ import annotations

import io

import cv2
import numpy as np
from PIL import Image

from app.pipeline.context import PipelineContext


# Glitter palette definitions
GLITTER_PALETTES = {
    "mercury": {
        "name": "Mercury",
        "colors": [(192, 192, 192), (220, 220, 220), (245, 245, 245), (255, 215, 0)],
        "labels": ["Silver Base", "Bright Silver", "White Shimmer", "Gold Accent"],
    },
    "mars": {
        "name": "Mars",
        "colors": [(178, 34, 34), (220, 90, 60), (255, 165, 0), (255, 215, 0)],
        "labels": ["Deep Red", "Warm Red", "Orange Glow", "Gold Accent"],
    },
    "neptune": {
        "name": "Neptune",
        "colors": [(0, 105, 148), (65, 155, 200), (130, 200, 230), (255, 215, 0)],
        "labels": ["Deep Blue", "Ocean Blue", "Sky Shimmer", "Gold Accent"],
    },
    "jupiter": {
        "name": "Jupiter",
        "colors": [(139, 90, 43), (194, 148, 88), (222, 184, 135), (255, 215, 0)],
        "labels": ["Deep Bronze", "Warm Bronze", "Light Bronze", "Gold Accent"],
    },
}


def assign_glitter_zones(
    reveal_mask: np.ndarray,
    subject_mask: np.ndarray,
    hair_mask: np.ndarray | None,
    edge_map: np.ndarray,
    num_colors: int,
) -> np.ndarray:
    """Assign glitter zone labels to exposed pixels.

    Zone assignment strategy:
    - 1 color: all exposed = zone 0
    - 2 colors: bg+outer silhouette = zone 0, internal subject details = zone 1
    - 3 colors: bg = zone 0, hair/silhouette = zone 1, facial details = zone 2
    - 4 colors: bg = zone 0, hair = zone 1, facial = zone 2, accent = zone 3
    """
    h, w = reveal_mask.shape
    zones = np.full((h, w), -1, dtype=np.int32)  # -1 = not exposed

    if num_colors == 1:
        zones[reveal_mask] = 0
        return zones

    bg_exposed = reveal_mask & ~subject_mask
    subject_exposed = reveal_mask & subject_mask

    if num_colors == 2:
        zones[bg_exposed] = 0
        zones[subject_exposed] = 1
        return zones

    # For 3+ colors, distinguish hair from other subject details
    if hair_mask is None:
        hair_mask = np.zeros((h, w), dtype=bool)

    hair_exposed = subject_exposed & hair_mask
    face_exposed = subject_exposed & ~hair_mask

    if num_colors == 3:
        zones[bg_exposed] = 0
        zones[hair_exposed] = 1
        # Silhouette edges go to zone 1 too
        silhouette_edges = subject_exposed & edge_map & ~hair_mask
        zones[silhouette_edges] = 1
        zones[face_exposed & (zones < 0)] = 2
        # Fill any remaining unassigned exposed pixels
        zones[reveal_mask & (zones < 0)] = 0
        return zones

    # 4 colors
    zones[bg_exposed] = 0
    zones[hair_exposed] = 1
    zones[face_exposed] = 2
    # Accent: strong edges in face region
    accent = face_exposed & edge_map
    zones[accent] = 3
    zones[reveal_mask & (zones < 0)] = 0

    return zones


def _merge_tiny_fragments(zones: np.ndarray, min_area: int = 50) -> np.ndarray:
    """Merge small zone fragments into the nearest larger zone."""
    result = zones.copy()
    unique_zones = [z for z in np.unique(zones) if z >= 0]

    for zone_id in unique_zones:
        zone_mask = (zones == zone_id).astype(np.uint8) * 255
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(
            zone_mask, connectivity=8
        )
        for label_id in range(1, num_labels):
            area = stats[label_id, cv2.CC_STAT_AREA]
            if area < min_area:
                component = labels == label_id
                # Find nearest zone by dilating neighboring zones
                dilated = cv2.dilate(
                    (zones >= 0).astype(np.uint8) * 255 - zone_mask,
                    np.ones((5, 5), np.uint8),
                )
                neighbors = zones[component & (dilated > 0)]
                neighbors = neighbors[neighbors >= 0]
                if len(neighbors) > 0:
                    dominant = int(np.bincount(neighbors).argmax())
                    result[component] = dominant
                else:
                    result[component] = 0

    return result


def render_zone_preview(zones: np.ndarray, palette_name: str) -> bytes:
    """Render a color-coded zone preview PNG."""
    palette = GLITTER_PALETTES.get(palette_name, GLITTER_PALETTES["mercury"])
    colors = palette["colors"]

    h, w = zones.shape
    preview = np.zeros((h, w, 3), dtype=np.uint8)
    preview[zones < 0] = [40, 35, 32]  # Unexposed

    for zone_id, color in enumerate(colors):
        preview[zones == zone_id] = color

    img = Image.fromarray(preview, "RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def run(ctx: PipelineContext, palette_name: str | None = None) -> None:
    """Generate glitter zone assignment if product type is glitter_reveal."""
    if ctx.product_type != "glitter_reveal" or not palette_name:
        return

    palette = GLITTER_PALETTES.get(palette_name)
    if not palette:
        return

    num_colors = len(palette["colors"])

    zones = assign_glitter_zones(
        reveal_mask=ctx.cleaned_mask,
        subject_mask=ctx.subject_mask,
        hair_mask=ctx.hair_mask,
        edge_map=ctx.edge_map,
        num_colors=num_colors,
    )

    zones = _merge_tiny_fragments(zones)

    ctx.glitter_zones = zones
    ctx.glitter_zone_preview = render_zone_preview(zones, palette_name)
    ctx.glitter_zone_legend = [
        {"zone": i, "color": list(c), "label": palette["labels"][i]}
        for i, c in enumerate(palette["colors"])
    ]
