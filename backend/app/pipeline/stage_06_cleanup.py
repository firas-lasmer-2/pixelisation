from __future__ import annotations

import cv2
import numpy as np

from app.pipeline.context import PipelineContext
from app.models.enums import DetailLevel


# Morphological kernel sizes per detail level
_KERNEL_SIZE: dict[DetailLevel, int] = {
    DetailLevel.bold: 5,
    DetailLevel.medium: 3,
    DetailLevel.fine: 2,
}

# Min region area thresholds (pixels)
_MIN_REGION: dict[DetailLevel, int] = {
    DetailLevel.bold: 120,
    DetailLevel.medium: 70,
    DetailLevel.fine: 35,
}

# Min hole area thresholds (pixels)
_MIN_HOLE: dict[DetailLevel, int] = {
    DetailLevel.bold: 220,
    DetailLevel.medium: 140,
    DetailLevel.fine: 70,
}


def _remove_small_components(mask: np.ndarray, min_area: int, value: bool) -> np.ndarray:
    """Remove connected components smaller than min_area of the given value."""
    target = mask if value else ~mask
    target_uint8 = target.astype(np.uint8) * 255

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(
        target_uint8, connectivity=8
    )

    result = mask.copy()
    for label_id in range(1, num_labels):
        area = stats[label_id, cv2.CC_STAT_AREA]
        if area < min_area:
            component = labels == label_id
            result[component] = not value

    return result


def run(ctx: PipelineContext) -> None:
    """Stage 6: Morphological cleanup of the reveal mask."""
    detail = ctx.effective_detail_level or ctx.detail_level
    mask = ctx.reveal_mask.copy()

    k = _KERNEL_SIZE[detail]
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))

    mask_uint8 = mask.astype(np.uint8) * 255

    # Morphological open: remove small exposed noise
    mask_uint8 = cv2.morphologyEx(mask_uint8, cv2.MORPH_OPEN, kernel)

    # Morphological close: fill small unexposed gaps
    mask_uint8 = cv2.morphologyEx(mask_uint8, cv2.MORPH_CLOSE, kernel)

    mask = mask_uint8 > 127

    # Remove small exposed islands
    mask = _remove_small_components(mask, _MIN_REGION[detail], value=True)

    # Fill small unexposed holes
    mask = _remove_small_components(mask, _MIN_HOLE[detail], value=False)

    # Edge smoothing: light Gaussian blur + re-threshold
    if detail != DetailLevel.fine:
        smoothed = cv2.GaussianBlur(
            mask.astype(np.uint8) * 255, (3, 3), sigmaX=0.8
        )
        mask = smoothed > 127

    ctx.cleaned_mask = mask

    if ctx.debug:
        vis = np.zeros((*mask.shape, 3), dtype=np.uint8)
        vis[mask] = [255, 255, 255]
        _, buf = cv2.imencode(".png", vis)
        ctx.debug_images["stage06_cleaned"] = buf.tobytes()
