from __future__ import annotations

import cv2
import numpy as np

from app.pipeline.context import PipelineContext
from app.models.enums import DetailLevel
from app.pipeline.stage_04_reveal_mask import TARGET_SUBJECT_EXPOSED


def run(ctx: PipelineContext) -> None:
    """Stage 7: Quality gates and auto-fallback.

    Checks exposed_ratio, subject_exposed_ratio, edge_preservation_score,
    and island_count. If quality is poor, falls back to a coarser detail level.
    """
    mask = ctx.cleaned_mask
    subject = ctx.subject_mask
    edges = ctx.edge_map

    h, w = mask.shape
    total_pixels = h * w

    # Metrics
    ctx.exposed_ratio = float(np.sum(mask)) / total_pixels

    subject_pixels = np.sum(subject)
    if subject_pixels > 0:
        ctx.subject_exposed_ratio = float(np.sum(mask & subject)) / float(subject_pixels)
    else:
        ctx.subject_exposed_ratio = ctx.exposed_ratio

    # Edge preservation: fraction of edges that are in exposed regions
    edge_pixels = np.sum(edges)
    if edge_pixels > 0:
        ctx.edge_preservation_score = float(np.sum(mask & edges)) / float(edge_pixels)
    else:
        ctx.edge_preservation_score = 1.0

    # Island count: distinct exposed connected components within subject
    subject_exposed = (mask & subject).astype(np.uint8) * 255
    num_labels, _, _, _ = cv2.connectedComponentsWithStats(subject_exposed, connectivity=8)
    ctx.island_count = max(0, num_labels - 1)  # Subtract background label

    # Quality warnings
    warnings = []
    detail = ctx.detail_level
    target = TARGET_SUBJECT_EXPOSED.get(detail, 0.50)

    if abs(ctx.subject_exposed_ratio - target) > 0.20:
        warnings.append(
            f"Subject exposure ratio {ctx.subject_exposed_ratio:.2f} deviates significantly "
            f"from target {target:.2f} for {detail.value} detail"
        )

    if ctx.edge_preservation_score < 0.3:
        warnings.append(
            f"Low edge preservation score ({ctx.edge_preservation_score:.2f}). "
            "Important details may be lost."
        )

    if ctx.island_count > 500 and detail == DetailLevel.fine:
        warnings.append(
            f"High fragment count ({ctx.island_count}). Consider using medium or bold detail."
        )

    ctx.quality_warnings = warnings

    # Auto-fallback: if subject_exposed_ratio is way off target
    if abs(ctx.subject_exposed_ratio - target) > 0.15:
        fallback_order = {
            DetailLevel.fine: DetailLevel.medium,
            DetailLevel.medium: DetailLevel.bold,
        }
        fallback = fallback_order.get(detail)
        if fallback:
            ctx.quality_warnings.append(
                f"Auto-fallback: {detail.value} → {fallback.value} due to exposure deviation"
            )
            ctx.effective_detail_level = fallback
        else:
            ctx.effective_detail_level = detail
    else:
        ctx.effective_detail_level = detail
