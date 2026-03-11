from __future__ import annotations

import cv2
import numpy as np
import svgwrite

from app.pipeline.context import PipelineContext
from app.models.enums import KIT_GRID, KIT_PHYSICAL_MM


def run(ctx: PipelineContext) -> None:
    """Stage 8: Vectorize the cleaned reveal mask into SVG cut paths.

    Downscale the mask to grid dimensions, extract contours, simplify,
    and produce an SVG with viewBox in physical mm.
    """
    grid_cols, grid_rows = KIT_GRID[ctx.kit_size]
    phys_w, phys_h = KIT_PHYSICAL_MM[ctx.kit_size]

    ctx.grid_cols = grid_cols
    ctx.grid_rows = grid_rows

    # Downscale mask to grid dimensions
    mask = ctx.cleaned_mask
    grid_mask = cv2.resize(
        mask.astype(np.uint8) * 255,
        (grid_cols, grid_rows),
        interpolation=cv2.INTER_AREA,
    )
    grid_mask_binary = (grid_mask > 127).astype(np.uint8) * 255

    # Extract contours
    contours, hierarchy = cv2.findContours(
        grid_mask_binary, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE
    )

    # Simplify contours
    epsilon_factor = 0.5  # pixels — balance between fidelity and file size
    simplified = []
    for cnt in contours:
        approx = cv2.approxPolyDP(cnt, epsilon_factor, closed=True)
        if len(approx) >= 3:
            simplified.append(approx)

    ctx.contours = simplified

    # Generate SVG
    # Cell size in mm
    cell_w = phys_w / grid_cols
    cell_h = phys_h / grid_rows

    dwg = svgwrite.Drawing(
        size=(f"{phys_w}mm", f"{phys_h}mm"),
        viewBox=f"0 0 {phys_w} {phys_h}",
    )

    # Minimum stroke width for cutting machines
    min_stroke_mm = 0.2

    for cnt in simplified:
        points = []
        for pt in cnt:
            px, py = pt[0]
            # Convert grid pixels to mm
            x_mm = px * cell_w
            y_mm = py * cell_h
            points.append(f"{x_mm:.2f},{y_mm:.2f}")

        if len(points) >= 3:
            path_data = "M " + " L ".join(points) + " Z"
            dwg.add(
                dwg.path(
                    d=path_data,
                    fill="black",
                    stroke="black",
                    stroke_width=min_stroke_mm,
                )
            )

    ctx.svg_content = dwg.tostring()
    ctx.svg_bytes = ctx.svg_content.encode("utf-8")

    # Store the grid-resolution binary mask for indices generation
    ctx._grid_mask_binary = grid_mask_binary

    if ctx.debug:
        _, buf = cv2.imencode(".png", grid_mask_binary)
        ctx.debug_images["stage08_grid_mask"] = buf.tobytes()
