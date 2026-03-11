from __future__ import annotations

import cv2
import numpy as np


def extract_contours(binary_mask: np.ndarray, simplify_epsilon: float = 1.0):
    """Extract and simplify contours from a binary mask.

    Returns a list of simplified contour arrays.
    """
    mask_uint8 = binary_mask.astype(np.uint8) * 255
    contours, hierarchy = cv2.findContours(
        mask_uint8, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE
    )

    simplified = []
    for cnt in contours:
        approx = cv2.approxPolyDP(cnt, simplify_epsilon, closed=True)
        if len(approx) >= 3:
            simplified.append(approx)

    return simplified, hierarchy


def contour_to_svg_path(contour: np.ndarray, scale_x: float = 1.0, scale_y: float = 1.0) -> str:
    """Convert an OpenCV contour to an SVG path data string."""
    points = []
    for pt in contour:
        x = pt[0][0] * scale_x
        y = pt[0][1] * scale_y
        points.append(f"{x:.2f},{y:.2f}")

    if not points:
        return ""

    return "M " + " L ".join(points) + " Z"


def contours_area(contours: list) -> list[float]:
    """Compute areas for a list of contours."""
    return [cv2.contourArea(cnt) for cnt in contours]
