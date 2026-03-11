from __future__ import annotations

import cv2
import numpy as np
from skimage.feature import canny

from app.pipeline.context import PipelineContext
from app.models.enums import DetailLevel


# Canny sigma values per detail level
_CANNY_SIGMA: dict[DetailLevel, tuple[float, float]] = {
    DetailLevel.bold: (2.5, 1.5),
    DetailLevel.medium: (2.0, 1.0),
    DetailLevel.fine: (1.5, 0.7),
}


def run(ctx: PipelineContext) -> None:
    """Stage 3: Compute tone map, edge map, gradient magnitude, face landmarks."""
    l_channel = ctx.l_channel  # H×W float32 [0,1]

    # Tone map: normalized L channel (already [0,1])
    ctx.tone_map = l_channel.copy()

    # Edge map: dual-scale Canny
    sigma_coarse, sigma_fine = _CANNY_SIGMA.get(ctx.detail_level, (2.0, 1.0))
    edges_coarse = canny(l_channel, sigma=sigma_coarse)
    edges_fine = canny(l_channel, sigma=sigma_fine)
    ctx.edge_map = edges_coarse | edges_fine

    # Gradient magnitude: Sobel dx + dy
    l_uint8 = (l_channel * 255).astype(np.uint8)
    grad_x = cv2.Sobel(l_uint8, cv2.CV_64F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(l_uint8, cv2.CV_64F, 0, 1, ksize=3)
    gradient = np.sqrt(grad_x ** 2 + grad_y ** 2)
    # Normalize to [0, 1]
    gmax = gradient.max()
    if gmax > 0:
        gradient /= gmax
    ctx.gradient_map = gradient.astype(np.float32)

    # Face landmarks: stub for P3
    ctx.face_landmarks = None

    if ctx.debug:
        # Debug: edge overlay
        edge_vis = np.zeros((*l_channel.shape, 3), dtype=np.uint8)
        edge_vis[ctx.edge_map] = [0, 255, 0]
        _, buf = cv2.imencode(".png", edge_vis)
        ctx.debug_images["stage03_edges"] = buf.tobytes()

        # Debug: gradient
        grad_vis = (gradient * 255).astype(np.uint8)
        _, buf = cv2.imencode(".png", grad_vis)
        ctx.debug_images["stage03_gradient"] = buf.tobytes()
