import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPaintingManifestStorageKey,
  loadPaintingManifestLocally,
  normalizePaintingManifest,
  persistPaintingManifestLocally,
  resolveManifestPalette,
  type PaintingManifest,
} from "@/lib/paintingManifest";
import { resolveLegacyPalette, resolvePaletteForProcessing } from "@/lib/palettes";

vi.mock("@/lib/imageProcessing", async () => {
  const actual = await vi.importActual<typeof import("@/lib/imageProcessing")>("@/lib/imageProcessing");

  return {
    ...actual,
    renderSmoothPreview: () => ({
      toDataURL: () => "data:image/jpeg;base64,GENERATED",
    } as HTMLCanvasElement),
  };
});

function createManifest(overrides: Partial<PaintingManifest> = {}): PaintingManifest {
  const paletteSnapshot = resolvePaletteForProcessing("vintage", "30x40");

  return {
    version: 5,
    orderRef: "HL-TEST",
    instructionCode: "ABC123",
    category: "classic",
    productType: "paint_by_numbers",
    kitSize: "stamp_kit_30x40",
    canvasLabel: "30 x 40 cm",
    artStyle: "vintage",
    paletteKey: "vintage",
    styleProfileKey: "vintage",
    styleProfileVersion: 1,
    paletteSnapshot,
    createdAt: "2026-03-09T00:00:00.000Z",
    dedicationText: null,
    dedication: null,
    sourceImageUrl: null,
    referenceImageUrl: "data:image/png;base64,AAAA",
    previewDataUrl: "data:image/png;base64,AAAA",
    viewerUrl: "/viewer/ABC123",
    gridCols: 2,
    gridRows: 2,
    indices: [0, 1, 2, 3],
    stencilDetailLevel: null,
    stencilBridgeCount: null,
    glitterPalette: null,
    stats: {
      totalCells: 4,
      totalSections: 1,
      totalPages: 1,
      sectionCols: 1,
      sectionRows: 1,
      totalGridPages: 1,
      colorCount: paletteSnapshot.colors.length,
      estimatedHours: "8-20 h",
      difficultyLabel: "Intermediaire",
      difficultyLevel: 2,
    },
    ...overrides,
  };
}

describe("paintingManifest", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("preserves version 4 palette snapshots during normalization", () => {
    const paletteSnapshot = resolvePaletteForProcessing("vintage", "30x40");
    const manifest = normalizePaintingManifest(createManifest({
      paletteSnapshot,
    }), "ABC123");

    expect(manifest?.version).toBe(5);
    expect(resolveManifestPalette(manifest!).colors).toHaveLength(10);
    expect(manifest?.styleProfileKey).toBe("vintage");
  });

  it("upgrades legacy v3 manifests to version 5 while keeping legacy palettes", () => {
    const manifest = normalizePaintingManifest({
      version: 3,
      orderRef: "HL-OLD",
      instructionCode: "OLD123",
      category: "classic",
      kitSize: "stamp_kit_30x40",
      canvasLabel: "30 x 40 cm",
      paletteKey: "vintage",
      createdAt: "2026-03-09T00:00:00.000Z",
      dedicationText: null,
      dedication: null,
      sourceImageUrl: null,
      referenceImageUrl: "data:image/png;base64,AAAA",
      previewDataUrl: "data:image/png;base64,AAAA",
      viewerUrl: "/viewer/OLD123",
      gridCols: 2,
      gridRows: 2,
      indices: [0, 1, 2, 3],
      stats: {
        totalCells: 4,
        totalSections: 1,
        totalPages: 1,
        sectionCols: 1,
        sectionRows: 1,
        totalGridPages: 1,
        colorCount: 8,
        estimatedHours: "8-20 h",
        difficultyLabel: "Intermediaire",
        difficultyLevel: 2,
      },
    }, "OLD123");

    expect(manifest?.version).toBe(5);
    expect(manifest?.artStyle).toBe("vintage");
    expect(manifest?.paletteSnapshot.colors).toHaveLength(resolveLegacyPalette("vintage").colors.length);
    expect(manifest?.stats.colorCount).toBe(8);
  });

  it("stores compact cached manifests and reconstructs inline previews on load", () => {
    const manifest = createManifest({
      sourceImageUrl: "data:image/jpeg;base64,SOURCE",
      referenceImageUrl: "data:image/jpeg;base64,REFERENCE",
      previewDataUrl: "data:image/jpeg;base64,PREVIEW",
    });

    persistPaintingManifestLocally(manifest);

    const stored = localStorage.getItem(getPaintingManifestStorageKey(manifest.instructionCode));
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed.referenceImageUrl).toBeUndefined();
    expect(parsed.previewDataUrl).toBeUndefined();
    expect(parsed.sourceImageUrl).toBeNull();

    const loaded = loadPaintingManifestLocally(manifest.instructionCode);
    expect(loaded?.referenceImageUrl).toMatch(/^data:image\/jpeg;base64,/);
    expect(loaded?.previewDataUrl).toBe(loaded?.referenceImageUrl);
    expect(loaded?.sourceImageUrl).toBeNull();
  });

  it("falls back to session storage when local storage is full", () => {
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (this === localStorage) {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }

      return originalSetItem.call(this, key, value);
    });

    const manifest = createManifest();
    const cacheKey = getPaintingManifestStorageKey(manifest.instructionCode);

    persistPaintingManifestLocally(manifest);

    expect(localStorage.getItem(cacheKey)).toBeNull();
    expect(sessionStorage.getItem(cacheKey)).toBeTruthy();
    expect(loadPaintingManifestLocally(manifest.instructionCode)?.instructionCode).toBe(manifest.instructionCode);
  });
});