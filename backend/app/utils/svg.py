from __future__ import annotations

import svgwrite


def create_svg_drawing(width_mm: float, height_mm: float) -> svgwrite.Drawing:
    """Create an SVG drawing with viewBox in mm."""
    return svgwrite.Drawing(
        size=(f"{width_mm}mm", f"{height_mm}mm"),
        viewBox=f"0 0 {width_mm} {height_mm}",
    )


def add_cut_path(dwg: svgwrite.Drawing, path_data: str, stroke_width_mm: float = 0.2) -> None:
    """Add a cut path to the SVG drawing."""
    dwg.add(dwg.path(
        d=path_data,
        fill="black",
        stroke="black",
        stroke_width=stroke_width_mm,
    ))
