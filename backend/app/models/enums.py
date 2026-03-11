from __future__ import annotations

from enum import Enum


class DetailLevel(str, Enum):
    bold = "bold"
    medium = "medium"
    fine = "fine"


class ManufacturingMode(str, Enum):
    adhesive_mask = "adhesive_mask"
    bridged_stencil = "bridged_stencil"


class KitSize(str, Enum):
    stamp_kit_30x40 = "stamp_kit_30x40"
    stamp_kit_40x50 = "stamp_kit_40x50"
    stamp_kit_40x60 = "stamp_kit_40x60"
    stamp_kit_A4 = "stamp_kit_A4"
    stamp_kit_A3 = "stamp_kit_A3"
    stamp_kit_A2 = "stamp_kit_A2"


class GlitterPalette(str, Enum):
    mercury = "mercury"
    mars = "mars"
    neptune = "neptune"
    jupiter = "jupiter"


# Grid dimensions for each kit size (cols, rows) — 2.5 mm cells
KIT_GRID: dict[KitSize, tuple[int, int]] = {
    KitSize.stamp_kit_30x40: (120, 160),
    KitSize.stamp_kit_40x50: (160, 200),
    KitSize.stamp_kit_40x60: (160, 240),
    KitSize.stamp_kit_A4: (84, 119),
    KitSize.stamp_kit_A3: (118, 168),
    KitSize.stamp_kit_A2: (168, 237),
}

# Physical dimensions in mm
KIT_PHYSICAL_MM: dict[KitSize, tuple[float, float]] = {
    KitSize.stamp_kit_30x40: (300, 400),
    KitSize.stamp_kit_40x50: (400, 500),
    KitSize.stamp_kit_40x60: (400, 600),
    KitSize.stamp_kit_A4: (210, 297),
    KitSize.stamp_kit_A3: (297, 420),
    KitSize.stamp_kit_A2: (420, 594),
}

# Display labels
KIT_LABELS: dict[KitSize, str] = {
    KitSize.stamp_kit_30x40: "30 × 40 cm",
    KitSize.stamp_kit_40x50: "40 × 50 cm",
    KitSize.stamp_kit_40x60: "40 × 60 cm",
    KitSize.stamp_kit_A4: "A4 (21 × 29.7 cm)",
    KitSize.stamp_kit_A3: "A3 (29.7 × 42 cm)",
    KitSize.stamp_kit_A2: "A2 (42 × 59.4 cm)",
}

# Stencil palette snapshot — matches frontend STENCIL_PALETTE_SNAPSHOT exactly
STENCIL_PALETTE_SNAPSHOT = [
    {"hex": "#282320", "name": "Background", "r": 40, "g": 35, "b": 32, "L": 14.5, "aLab": 1.2, "bLab": 4.1},
    {"hex": "#A5A29E", "name": "Deep Contour", "r": 165, "g": 162, "b": 158, "L": 66.3, "aLab": -0.3, "bLab": 2.1},
    {"hex": "#D2D0CE", "name": "Light Contour", "r": 210, "g": 208, "b": 206, "L": 83.4, "aLab": 0.1, "bLab": 0.8},
    {"hex": "#FFFFFF", "name": "Portrait", "r": 255, "g": 255, "b": 255, "L": 100.0, "aLab": 0.0, "bLab": 0.0},
]
