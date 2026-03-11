from __future__ import annotations

from pathlib import Path


def load_stencil_font(size: int = 12):
    """Load a stencil-safe font for dedication text.

    Falls back to PIL default if no TTF available.
    """
    from PIL import ImageFont

    # Try common system fonts
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibri.ttf",
    ]

    for path in font_paths:
        if Path(path).exists():
            return ImageFont.truetype(path, size)

    return ImageFont.load_default()
