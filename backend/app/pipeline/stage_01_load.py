from __future__ import annotations

import io

import cv2
import numpy as np
from PIL import Image, ImageOps

from app.config import settings
from app.pipeline.context import PipelineContext
from app.models.request import CropData


def _progressive_downscale(img: np.ndarray, target_w: int, target_h: int) -> np.ndarray:
    """Downscale in multiple 50% steps for higher quality, then final resize."""
    h, w = img.shape[:2]
    while w > target_w * 2 and h > target_h * 2:
        w //= 2
        h //= 2
        img = cv2.resize(img, (w, h), interpolation=cv2.INTER_AREA)
    return cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)


def run(ctx: PipelineContext, image_bytes: bytes, crop: CropData | None = None) -> None:
    """Stage 1: Load, EXIF fix, crop, resize, filter, CIELAB + CLAHE."""
    # Load image via PIL for EXIF handling
    pil_img = Image.open(io.BytesIO(image_bytes))
    pil_img = ImageOps.exif_transpose(pil_img)
    pil_img = pil_img.convert("RGB")

    rgb = np.array(pil_img, dtype=np.uint8)

    # Apply crop if provided
    if crop:
        x, y, w, h = crop.x, crop.y, crop.width, crop.height
        img_h, img_w = rgb.shape[:2]
        x = max(0, min(x, img_w - 1))
        y = max(0, min(y, img_h - 1))
        w = min(w, img_w - x)
        h = min(h, img_h - y)
        if w > 0 and h > 0:
            rgb = rgb[y : y + h, x : x + w]

    # Resize long side to max_long_side while preserving aspect ratio
    h, w = rgb.shape[:2]
    max_side = settings.max_long_side
    if max(h, w) > max_side:
        if h >= w:
            new_h = max_side
            new_w = int(w * max_side / h)
        else:
            new_w = max_side
            new_h = int(h * max_side / w)
        rgb = _progressive_downscale(rgb, new_w, new_h)

    # Convert RGB → BGR for OpenCV
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

    # Bilateral filter for noise reduction while preserving edges
    bgr = cv2.bilateralFilter(bgr, d=9, sigmaColor=75, sigmaSpace=75)

    # Mild median blur
    bgr = cv2.medianBlur(bgr, 3)

    # Convert to CIELAB
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2Lab).astype(np.float32)

    # CLAHE on L channel
    l_raw = lab[:, :, 0]
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_uint8 = np.clip(l_raw, 0, 255).astype(np.uint8)
    l_enhanced = clahe.apply(l_uint8).astype(np.float32)
    lab[:, :, 0] = l_enhanced

    # Normalize L to [0, 1]
    l_norm = l_enhanced / 255.0

    # Store results — convert back to RGB for later use
    ctx.source_rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    ctx.lab = lab
    ctx.l_channel = l_norm

    if ctx.debug:
        # Save L channel as debug image
        l_vis = (l_norm * 255).astype(np.uint8)
        _, buf = cv2.imencode(".png", l_vis)
        ctx.debug_images["stage01_l_channel"] = buf.tobytes()
