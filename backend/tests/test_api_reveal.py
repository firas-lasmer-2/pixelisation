import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def test_image_file():
    """Create a test image as file-like bytes."""
    img = Image.new("RGB", (200, 300), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_health_ready(client):
    res = client.get("/api/health/ready")
    assert res.status_code == 200
    assert res.json()["status"] == "ready"


def test_generate_returns_job_id(client, test_image_file):
    res = client.post(
        "/api/reveal/generate",
        files={"file": ("test.png", test_image_file, "image/png")},
        data={
            "detail_level": "medium",
            "kit_size": "stamp_kit_A4",
            "product_type": "stencil_paint",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "job_id" in data
    assert data["status"] == "pending"


def test_get_nonexistent_job(client):
    res = client.get("/api/reveal/nonexistent123")
    assert res.status_code == 404


def test_preview_returns_base64(client, test_image_file):
    res = client.post(
        "/api/reveal/preview",
        files={"file": ("test.png", test_image_file, "image/png")},
        data={
            "detail_level": "medium",
            "kit_size": "stamp_kit_A4",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "preview_base64" in data
    assert data["detail_level"] in ("bold", "medium", "fine")
    assert 0.0 <= data["exposed_ratio"] <= 1.0


def test_debug_returns_images(client, test_image_file):
    res = client.post(
        "/api/reveal/debug",
        files={"file": ("test.png", test_image_file, "image/png")},
        data={
            "detail_level": "bold",
            "kit_size": "stamp_kit_A4",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "debug_images" in data
    assert "exposed_ratio" in data
