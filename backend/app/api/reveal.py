from __future__ import annotations

import base64
import io
import json
import threading
from datetime import datetime, timezone

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, UploadFile, HTTPException

from app.dependencies import storage, job_manager
from app.services.job_manager import JobStatus
from app.models.enums import (
    DetailLevel,
    ManufacturingMode,
    KitSize,
    GlitterPalette,
    KIT_GRID,
    KIT_LABELS,
    STENCIL_PALETTE_SNAPSHOT,
)
from app.models.request import GenerateRequest, CropData
from app.models.response import GenerateResponse, JobStatusResponse, PreviewResponse
from app.models.manifest import PaintingManifestV5, ManifestStats
from app.pipeline.context import PipelineContext
from app.pipeline.orchestrator import run_full_pipeline, run_preview_pipeline
from app.utils.pdf import generate_instruction_pdf

router = APIRouter(prefix="/reveal", tags=["reveal"])


def _run_job(
    job_id: str,
    image_bytes: bytes,
    detail_level: DetailLevel,
    manufacturing_mode: ManufacturingMode,
    kit_size: KitSize,
    product_type: str,
    crop: CropData | None,
    order_ref: str,
    instruction_code: str,
    dedication_text: str,
    glitter_palette: str | None,
    debug: bool,
) -> None:
    """Background job runner."""
    def on_progress(pct: int, stage: str) -> None:
        job_manager.update(job_id, progress=pct, stage=stage)

    try:
        job_manager.update(job_id, status=JobStatus.processing, progress=0, stage="Starting")
        storage.ensure_job_dirs(job_id)

        # Save source
        source_path = storage.source_path(job_id)
        source_path.write_bytes(image_bytes)

        ctx = PipelineContext(
            detail_level=detail_level,
            manufacturing_mode=manufacturing_mode,
            kit_size=kit_size,
            product_type=product_type,
            debug=debug,
            dedication_text=dedication_text,
        )

        run_full_pipeline(
            ctx, image_bytes, crop=crop,
            glitter_palette=glitter_palette,
            on_progress=on_progress,
        )

        # Save assets
        assets = {}

        if ctx.preview_png:
            path = storage.render_path(job_id, "preview")
            path.write_bytes(ctx.preview_png)
            assets["preview"] = str(path)

        if ctx.thumb_png:
            path = storage.render_path(job_id, "thumb")
            path.write_bytes(ctx.thumb_png)
            assets["thumb"] = str(path)

        if ctx.comparison_png:
            path = storage.render_path(job_id, "comparison")
            path.write_bytes(ctx.comparison_png)
            assets["comparison"] = str(path)

        if ctx.svg_bytes:
            path = storage.vector_path(job_id, "svg")
            path.write_bytes(ctx.svg_bytes)
            assets["svg"] = str(path)

        if ctx.cut_pdf_bytes:
            path = storage.vector_path(job_id, "pdf")
            path.write_bytes(ctx.cut_pdf_bytes)
            assets["cut_pdf"] = str(path)

        if ctx.glitter_zone_preview:
            path = storage.render_path(job_id, "glitter_zones")
            path.write_bytes(ctx.glitter_zone_preview)
            assets["glitter_zones"] = str(path)

        # Save debug images
        if debug:
            for name, data in ctx.debug_images.items():
                path = storage.debug_path(job_id, name)
                path.write_bytes(data)
                assets[f"debug_{name}"] = str(path)

        # Generate instruction PDF
        guide_pdf = generate_instruction_pdf(
            product_type=product_type,
            kit_size_label=KIT_LABELS.get(kit_size, str(kit_size)),
            detail_level=detail_level.value,
            instruction_code=instruction_code,
            source_png=image_bytes,
            preview_png=ctx.preview_png or None,
            glitter_palette_name=glitter_palette,
            glitter_zone_legend=ctx.glitter_zone_legend or None,
        )
        guide_path = storage.guide_path(job_id)
        guide_path.write_bytes(guide_pdf)
        assets["guide"] = str(guide_path)

        # Build manifest
        grid_cols, grid_rows = ctx.grid_cols, ctx.grid_rows
        section_cols = (grid_cols + 11) // 12
        section_rows = (grid_rows + 11) // 12
        total_sections = section_cols * section_rows
        total_pages = (total_sections + 11) // 12 + 3  # sections + cover + legend + tips

        manifest = PaintingManifestV5(
            version=5,
            productType=product_type,
            orderRef=order_ref,
            instructionCode=instruction_code,
            kitSize=kit_size.value,
            canvasLabel=KIT_LABELS.get(kit_size, ""),
            artStyle="original",
            paletteKey="stencil",
            paletteSnapshot=list(STENCIL_PALETTE_SNAPSHOT),
            createdAt=datetime.now(timezone.utc).isoformat(),
            gridCols=grid_cols,
            gridRows=grid_rows,
            indices=ctx.indices,
            stencilDetailLevel=(ctx.effective_detail_level or detail_level).value,
            glitterPalette=glitter_palette,
            stats=ManifestStats(
                totalCells=grid_cols * grid_rows,
                totalSections=total_sections,
                totalPages=total_pages,
                sectionCols=section_cols,
                sectionRows=section_rows,
                colorCount=4,
                difficultyLabel="Stencil",
                difficultyLevel=1,
            ),
        )

        manifest_dict = manifest.model_dump()
        manifest_path = storage.manifest_path(job_id)
        manifest_path.write_text(json.dumps(manifest_dict, separators=(",", ":")))

        job_manager.update(
            job_id,
            status=JobStatus.completed,
            progress=100,
            stage="Complete",
            manifest=manifest_dict,
            quality_warnings=ctx.quality_warnings,
            assets=assets,
        )

    except Exception as e:
        job_manager.update(
            job_id,
            status=JobStatus.failed,
            error=str(e),
            stage="Failed",
        )


@router.post("/generate", response_model=GenerateResponse)
async def generate(
    file: UploadFile = File(...),
    detail_level: str = Form("medium"),
    manufacturing_mode: str = Form("adhesive_mask"),
    kit_size: str = Form("stamp_kit_30x40"),
    product_type: str = Form("stencil_paint"),
    crop_x: int = Form(0),
    crop_y: int = Form(0),
    crop_width: int = Form(0),
    crop_height: int = Form(0),
    order_ref: str = Form(""),
    instruction_code: str = Form(""),
    dedication_text: str = Form(""),
    glitter_palette: str = Form(""),
    debug: bool = Form(False),
):
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    job_id = storage.new_job_id()
    job_manager.create(job_id)

    crop = None
    if crop_width > 0 and crop_height > 0:
        crop = CropData(x=crop_x, y=crop_y, width=crop_width, height=crop_height)

    thread = threading.Thread(
        target=_run_job,
        args=(
            job_id,
            image_bytes,
            DetailLevel(detail_level),
            ManufacturingMode(manufacturing_mode),
            KitSize(kit_size),
            product_type,
            crop,
            order_ref,
            instruction_code,
            dedication_text,
            glitter_palette or None,
            debug,
        ),
        daemon=True,
    )
    thread.start()

    return GenerateResponse(job_id=job_id, status="pending")


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job(job_id: str):
    job = job_manager.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobStatusResponse(
        job_id=job.job_id,
        status=job.status.value,
        progress=job.progress,
        stage=job.stage,
        error=job.error,
        quality_warnings=job.quality_warnings,
        assets=job.assets,
        manifest=job.manifest,
    )


@router.post("/preview", response_model=PreviewResponse)
async def preview(
    file: UploadFile = File(...),
    detail_level: str = Form("medium"),
    kit_size: str = Form("stamp_kit_30x40"),
    crop_x: int = Form(0),
    crop_y: int = Form(0),
    crop_width: int = Form(0),
    crop_height: int = Form(0),
):
    """Lightweight preview — runs stages 1-7 only, returns base64 preview."""
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    crop = None
    if crop_width > 0 and crop_height > 0:
        crop = CropData(x=crop_x, y=crop_y, width=crop_width, height=crop_height)

    ctx = PipelineContext(
        detail_level=DetailLevel(detail_level),
        kit_size=KitSize(kit_size),
    )

    run_preview_pipeline(ctx, image_bytes, crop=crop)

    # Render a quick preview from the cleaned mask
    mask = ctx.cleaned_mask
    preview_img = np.zeros((*mask.shape, 3), dtype=np.uint8)
    preview_img[mask] = [255, 255, 255]
    preview_img[~mask] = [40, 35, 32]

    # Resize to reasonable preview size
    h, w = mask.shape
    target_w = 400
    scale = target_w / w
    preview_resized = cv2.resize(
        preview_img, (target_w, int(h * scale)), interpolation=cv2.INTER_AREA
    )

    _, buf = cv2.imencode(".png", cv2.cvtColor(preview_resized, cv2.COLOR_RGB2BGR))
    b64 = base64.b64encode(buf.tobytes()).decode("ascii")

    return PreviewResponse(
        preview_base64=b64,
        detail_level=(ctx.effective_detail_level or ctx.detail_level).value,
        exposed_ratio=ctx.exposed_ratio,
        quality_warnings=ctx.quality_warnings,
    )


@router.post("/debug")
async def debug_job(
    file: UploadFile = File(...),
    detail_level: str = Form("medium"),
    kit_size: str = Form("stamp_kit_30x40"),
    crop_x: int = Form(0),
    crop_y: int = Form(0),
    crop_width: int = Form(0),
    crop_height: int = Form(0),
):
    """Returns intermediate pipeline layer images as base64."""
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    crop = None
    if crop_width > 0 and crop_height > 0:
        crop = CropData(x=crop_x, y=crop_y, width=crop_width, height=crop_height)

    ctx = PipelineContext(
        detail_level=DetailLevel(detail_level),
        kit_size=KitSize(kit_size),
        debug=True,
    )

    run_preview_pipeline(ctx, image_bytes, crop=crop)

    result = {}
    for name, data in ctx.debug_images.items():
        result[name] = base64.b64encode(data).decode("ascii")

    return {
        "debug_images": result,
        "quality_warnings": ctx.quality_warnings,
        "exposed_ratio": ctx.exposed_ratio,
        "subject_exposed_ratio": ctx.subject_exposed_ratio,
        "edge_preservation_score": ctx.edge_preservation_score,
        "island_count": ctx.island_count,
    }
