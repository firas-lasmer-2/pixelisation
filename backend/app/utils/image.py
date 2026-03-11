from __future__ import annotations

import cv2
import numpy as np
from PIL import Image
import io


def pil_to_cv2_rgb(pil_img: Image.Image) -> np.ndarray:
    """Convert PIL Image to OpenCV RGB ndarray."""
    return np.array(pil_img.convert("RGB"), dtype=np.uint8)


def cv2_rgb_to_pil(arr: np.ndarray) -> Image.Image:
    """Convert OpenCV RGB ndarray to PIL Image."""
    return Image.fromarray(arr, "RGB")


def rgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    """Convert RGB uint8 to CIELAB float32."""
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2Lab).astype(np.float32)


def apply_clahe(l_channel: np.ndarray, clip_limit: float = 2.0) -> np.ndarray:
    """Apply CLAHE to an L channel (float32 0-255 range)."""
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
    l_uint8 = np.clip(l_channel, 0, 255).astype(np.uint8)
    return clahe.apply(l_uint8).astype(np.float32)


def bilateral_smooth(rgb: np.ndarray, d: int = 9, sigma_color: float = 75, sigma_space: float = 75) -> np.ndarray:
    """Apply bilateral filter for edge-preserving smoothing."""
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    bgr = cv2.bilateralFilter(bgr, d, sigma_color, sigma_space)
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)


def encode_png(arr: np.ndarray) -> bytes:
    """Encode a numpy array as PNG bytes."""
    if arr.ndim == 2:
        # Grayscale
        _, buf = cv2.imencode(".png", arr)
    else:
        # RGB → BGR for OpenCV
        _, buf = cv2.imencode(".png", cv2.cvtColor(arr, cv2.COLOR_RGB2BGR))
    return buf.tobytes()


def decode_png(data: bytes) -> np.ndarray:
    """Decode PNG bytes to RGB numpy array."""
    arr = np.frombuffer(data, np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
