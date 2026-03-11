from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from app.models.enums import STENCIL_PALETTE_SNAPSHOT


class ManifestStats(BaseModel):
    totalCells: int
    totalSections: int
    totalPages: int
    sectionCols: int
    sectionRows: int
    colorCount: int
    difficultyLabel: str
    difficultyLevel: int


class PaintingManifestV5(BaseModel):
    version: int = 5
    productType: str
    orderRef: str = ""
    instructionCode: str = ""
    category: str = "classic"
    kitSize: str
    canvasLabel: str = ""
    artStyle: str = "original"
    paletteKey: str = "stencil"
    paletteSnapshot: list[dict[str, Any]] = list(STENCIL_PALETTE_SNAPSHOT)
    createdAt: str = ""
    sourceImageUrl: str | None = None
    referenceImageUrl: str = ""
    gridCols: int = 0
    gridRows: int = 0
    indices: list[int] = []
    stencilDetailLevel: str | None = None
    stencilBridgeCount: int | None = None
    glitterPalette: str | None = None
    stats: ManifestStats = ManifestStats(
        totalCells=0,
        totalSections=0,
        totalPages=0,
        sectionCols=0,
        sectionRows=0,
        colorCount=4,
        difficultyLabel="Stencil",
        difficultyLevel=1,
    )
