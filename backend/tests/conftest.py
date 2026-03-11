import io
import numpy as np
from PIL import Image
import pytest


@pytest.fixture
def small_rgb_image() -> bytes:
    """Create a 64×48 test image with a bright center (subject) and dark edges (background)."""
    img = np.zeros((48, 64, 3), dtype=np.uint8)
    # Dark background
    img[:, :] = [30, 30, 30]
    # Bright center "subject"
    img[8:40, 12:52] = [200, 180, 160]
    # Mid-tone detail within subject
    img[16:32, 20:44] = [120, 100, 90]
    # Highlight in center
    img[20:28, 28:36] = [240, 230, 220]

    buf = io.BytesIO()
    Image.fromarray(img, "RGB").save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def uniform_image() -> bytes:
    """A uniform gray image — worst case for segmentation."""
    img = np.full((48, 64, 3), 128, dtype=np.uint8)
    buf = io.BytesIO()
    Image.fromarray(img, "RGB").save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def gradient_image() -> bytes:
    """A horizontal gradient from black to white."""
    img = np.zeros((48, 64, 3), dtype=np.uint8)
    for x in range(64):
        val = int(x / 63 * 255)
        img[:, x] = [val, val, val]
    buf = io.BytesIO()
    Image.fromarray(img, "RGB").save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def high_contrast_image() -> bytes:
    """Black and white checkerboard pattern."""
    img = np.zeros((48, 64, 3), dtype=np.uint8)
    for y in range(48):
        for x in range(64):
            if (x // 8 + y // 8) % 2 == 0:
                img[y, x] = [255, 255, 255]
    buf = io.BytesIO()
    Image.fromarray(img, "RGB").save(buf, format="PNG")
    return buf.getvalue()
