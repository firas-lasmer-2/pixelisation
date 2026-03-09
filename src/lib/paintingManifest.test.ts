import { describe, expect, it } from "vitest";
import { normalizePaintingManifest, resolveManifestPalette } from "@/lib/paintingManifest";
import { resolveLegacyPalette, resolvePaletteForProcessing } from "@/lib/palettes";

describe("paintingManifest", () => {
  it("preserves version 4 palette snapshots during normalization", () => {
    const paletteSnapshot = resolvePaletteForProcessing("watercolor", "A3");
    const manifest = normalizePaintingManifest({
      version: 4,
      orderRef: "HL-TEST",
      instructionCode: "ABC123",
      category: "classic",
      kitSize: "stamp_kit_A3",
      canvasLabel: "A3",
      artStyle: "watercolor",
      paletteKey: "watercolor",
      styleProfileKey: "watercolor",
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
    }, "ABC123");

    expect(manifest?.version).toBe(4);
    expect(resolveManifestPalette(manifest!).colors).toHaveLength(10);
    expect(manifest?.styleProfileKey).toBe("watercolor");
  });

  it("upgrades legacy v3 manifests to version 4 while keeping legacy palettes", () => {
    const manifest = normalizePaintingManifest({
      version: 3,
      orderRef: "HL-OLD",
      instructionCode: "OLD123",
      category: "classic",
      kitSize: "stamp_kit_A3",
      canvasLabel: "A3",
      paletteKey: "popart",
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

    expect(manifest?.version).toBe(4);
    expect(manifest?.artStyle).toBe("pop_art");
    expect(manifest?.paletteSnapshot.colors).toHaveLength(resolveLegacyPalette("pop_art").colors.length);
    expect(manifest?.stats.colorCount).toBe(8);
  });
});
