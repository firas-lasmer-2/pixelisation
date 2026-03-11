from __future__ import annotations

import cv2
import numpy as np

from app.pipeline.context import PipelineContext


def run(ctx: PipelineContext) -> None:
    """Stage 5: Hair-biased exposure.

    Detect the head boundary from the subject mask and bias darker tones
    and strong gradients toward exposure in the hair region (~15% of head height
    band around the upper contour).
    """
    subject = ctx.subject_mask
    reveal = ctx.reveal_mask.copy()
    tone = ctx.tone_map
    gradient = ctx.gradient_map

    h, w = subject.shape

    # Find subject bounding box
    rows = np.any(subject, axis=1)
    if not np.any(rows):
        ctx.reveal_mask = reveal
        ctx.hair_mask = np.zeros((h, w), dtype=bool)
        return

    row_min = np.argmax(rows)
    row_max = h - 1 - np.argmax(rows[::-1])
    subject_height = row_max - row_min + 1

    # Hair band: top ~15% of subject height
    hair_band_height = max(int(subject_height * 0.15), 10)
    hair_band_bottom = row_min + hair_band_height

    # Create hair region mask
    hair_region = np.zeros((h, w), dtype=bool)
    hair_region[row_min:hair_band_bottom, :] = True
    hair_region &= subject  # Only within subject

    # Also extend slightly along the left/right silhouette edges
    # Find contour of subject and expand hair band along top contour
    subject_uint8 = subject.astype(np.uint8) * 255
    contours, _ = cv2.findContours(subject_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if contours:
        # Create a band around the upper portion of the contour
        contour_band = np.zeros((h, w), dtype=np.uint8)
        cv2.drawContours(contour_band, contours, -1, 255, thickness=max(3, hair_band_height // 4))
        upper_contour = contour_band[:hair_band_bottom + hair_band_height // 2, :] > 0
        hair_region[:upper_contour.shape[0], :] |= upper_contour

    hair_region &= subject

    ctx.hair_mask = hair_region

    # Bias: expose darker tones and strong gradients in hair region
    # Use a lower threshold for hair region (expose more)
    subject_tones = tone[subject]
    if len(subject_tones) == 0:
        ctx.reveal_mask = reveal
        return

    q40 = np.percentile(subject_tones, 40)

    hair_dark = hair_region & (tone <= q40)
    hair_gradient = hair_region & (gradient > 0.08)
    reveal |= hair_dark | hair_gradient

    ctx.reveal_mask = reveal

    if ctx.debug:
        vis = np.zeros((h, w, 3), dtype=np.uint8)
        vis[hair_region] = [255, 100, 0]  # Orange for hair region
        vis[hair_dark] = [255, 200, 0]  # Yellow for exposed hair
        _, buf = cv2.imencode(".png", vis)
        ctx.debug_images["stage05_hair"] = buf.tobytes()
