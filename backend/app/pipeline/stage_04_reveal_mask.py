from __future__ import annotations

import numpy as np

from app.pipeline.context import PipelineContext
from app.models.enums import DetailLevel


# Target exposed ratios for the subject region per detail level
TARGET_SUBJECT_EXPOSED: dict[DetailLevel, float] = {
    DetailLevel.bold: 0.35,
    DetailLevel.medium: 0.50,
    DetailLevel.fine: 0.60,
}

# Edge thresholds: gradient strength required to be exposed
_EDGE_GRADIENT_THRESH: dict[DetailLevel, float] = {
    DetailLevel.bold: 0.15,
    DetailLevel.medium: 0.10,
    DetailLevel.fine: 0.06,
}


def compute_reveal_mask(
    tone_map: np.ndarray,
    edge_map: np.ndarray,
    gradient_map: np.ndarray,
    subject_mask: np.ndarray,
    detail_level: DetailLevel,
) -> np.ndarray:
    """Compute reveal mask using subject-relative percentile thresholding.

    Returns a boolean mask where True = exposed (paint shows through / vinyl removed).
    """
    h, w = tone_map.shape
    reveal = np.zeros((h, w), dtype=bool)

    # 1. Background is ALWAYS exposed
    reveal[~subject_mask] = True

    # 2. Compute percentiles ONLY within subject pixels
    subject_tones = tone_map[subject_mask]
    if len(subject_tones) == 0:
        return reveal

    q20 = np.percentile(subject_tones, 20)
    q35 = np.percentile(subject_tones, 35)
    q50 = np.percentile(subject_tones, 50)
    q60 = np.percentile(subject_tones, 60)
    q75 = np.percentile(subject_tones, 75)

    # 3. Tone-based exposure within subject
    if detail_level == DetailLevel.bold:
        # Expose darkest 35% of subject
        tone_exposed = subject_mask & (tone_map <= q35)
    elif detail_level == DetailLevel.medium:
        # Expose darkest 50% of subject
        tone_exposed = subject_mask & (tone_map <= q50)
    else:  # fine
        # Expose darkest 60% of subject
        tone_exposed = subject_mask & (tone_map <= q60)
    reveal |= tone_exposed

    # 4. Edge-based exposure: important edges within subject
    if detail_level == DetailLevel.bold:
        # Only essential edges
        edge_exposed = subject_mask & edge_map
    elif detail_level == DetailLevel.medium:
        # Medium edges + gradient-assisted where tone is below median
        edge_exposed = subject_mask & edge_map
        gradient_assisted = (
            subject_mask
            & (gradient_map > _EDGE_GRADIENT_THRESH[detail_level])
            & (tone_map <= q60)
        )
        edge_exposed |= gradient_assisted
    else:  # fine
        # Fine edges + gradient-assisted with higher tone threshold
        edge_exposed = subject_mask & edge_map
        gradient_assisted = (
            subject_mask
            & (gradient_map > _EDGE_GRADIENT_THRESH[detail_level])
            & (tone_map <= q75)
        )
        edge_exposed |= gradient_assisted

    reveal |= edge_exposed

    return reveal


def run(ctx: PipelineContext) -> None:
    """Stage 4: Generate the core reveal mask."""
    ctx.reveal_mask = compute_reveal_mask(
        tone_map=ctx.tone_map,
        edge_map=ctx.edge_map,
        gradient_map=ctx.gradient_map,
        subject_mask=ctx.subject_mask,
        detail_level=ctx.detail_level,
    )

    if ctx.debug:
        import cv2

        vis = np.zeros((*ctx.reveal_mask.shape, 3), dtype=np.uint8)
        vis[ctx.reveal_mask] = [255, 255, 255]
        vis[~ctx.reveal_mask] = [40, 35, 32]
        _, buf = cv2.imencode(".png", vis)
        ctx.debug_images["stage04_reveal_mask"] = buf.tobytes()
