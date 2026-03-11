from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.enums import DetailLevel, ManufacturingMode, KitSize, GlitterPalette


class CropData(BaseModel):
    x: int
    y: int
    width: int
    height: int


class GenerateRequest(BaseModel):
    detail_level: DetailLevel = DetailLevel.medium
    manufacturing_mode: ManufacturingMode = ManufacturingMode.adhesive_mask
    kit_size: KitSize = KitSize.stamp_kit_30x40
    product_type: str = "stencil_paint"
    crop: CropData | None = None
    order_ref: str = ""
    instruction_code: str = ""
    dedication_text: str = ""
    glitter_palette: GlitterPalette | None = None
    debug: bool = False


class PreviewRequest(BaseModel):
    detail_level: DetailLevel = DetailLevel.medium
    kit_size: KitSize = KitSize.stamp_kit_30x40
    crop: CropData | None = None


class ExportRequest(BaseModel):
    job_id: str
    manufacturing_mode: ManufacturingMode = ManufacturingMode.adhesive_mask
    dedication_text: str = ""
    glitter_palette: GlitterPalette | None = None
