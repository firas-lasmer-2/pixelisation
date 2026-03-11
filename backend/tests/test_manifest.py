from app.models.manifest import PaintingManifestV5, ManifestStats
from app.models.enums import STENCIL_PALETTE_SNAPSHOT


def test_manifest_v5_defaults():
    manifest = PaintingManifestV5(
        productType="stencil_paint",
        kitSize="stamp_kit_30x40",
    )
    assert manifest.version == 5
    assert manifest.paletteKey == "stencil"
    assert manifest.artStyle == "original"
    assert len(manifest.paletteSnapshot) == 4


def test_manifest_v5_serialization():
    manifest = PaintingManifestV5(
        productType="stencil_paint",
        kitSize="stamp_kit_30x40",
        orderRef="TEST-001",
        instructionCode="ABC123",
        gridCols=120,
        gridRows=160,
        indices=[0, 1, 2, 3] * 100,
        stencilDetailLevel="medium",
        stats=ManifestStats(
            totalCells=19200,
            totalSections=140,
            totalPages=15,
            sectionCols=10,
            sectionRows=14,
            colorCount=4,
            difficultyLabel="Stencil",
            difficultyLevel=1,
        ),
    )

    data = manifest.model_dump()

    assert data["version"] == 5
    assert data["productType"] == "stencil_paint"
    assert data["kitSize"] == "stamp_kit_30x40"
    assert data["orderRef"] == "TEST-001"
    assert data["gridCols"] == 120
    assert data["gridRows"] == 160
    assert len(data["indices"]) == 400
    assert data["stencilDetailLevel"] == "medium"
    assert data["stats"]["totalCells"] == 19200


def test_manifest_palette_snapshot_matches():
    manifest = PaintingManifestV5(
        productType="stencil_paint",
        kitSize="stamp_kit_30x40",
    )

    for i, entry in enumerate(manifest.paletteSnapshot):
        assert entry["hex"] == STENCIL_PALETTE_SNAPSHOT[i]["hex"]
        assert entry["r"] == STENCIL_PALETTE_SNAPSHOT[i]["r"]
        assert entry["g"] == STENCIL_PALETTE_SNAPSHOT[i]["g"]
        assert entry["b"] == STENCIL_PALETTE_SNAPSHOT[i]["b"]


def test_manifest_glitter_fields():
    manifest = PaintingManifestV5(
        productType="glitter_reveal",
        kitSize="stamp_kit_40x50",
        glitterPalette="neptune",
    )

    data = manifest.model_dump()
    assert data["productType"] == "glitter_reveal"
    assert data["glitterPalette"] == "neptune"
