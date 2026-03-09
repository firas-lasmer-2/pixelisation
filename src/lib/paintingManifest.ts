import { BRAND, STORAGE_KEYS, buildViewerUrl } from "@/lib/brand";
import { renderSmoothPreview, type ProcessingResult } from "@/lib/imageProcessing";
import { COMPACT_PALETTES, PALETTES, type StylePalette } from "@/lib/palettes";
import type { ArtStyle, KitSize, OrderState } from "@/lib/store";
import { getPhoto } from "@/lib/store";
import { getPaintingStats } from "@/lib/paintingLayout";

const KIT_META: Record<KitSize, { label: string; estimatedHours: string; difficultyLabel: string; difficultyLevel: number }> = {
  stamp_kit_40x50: { label: "40 x 50 cm", estimatedHours: "15-30 h", difficultyLabel: "Avance", difficultyLevel: 3 },
  stamp_kit_30x40: { label: "30 x 40 cm", estimatedHours: "8-20 h", difficultyLabel: "Intermediaire", difficultyLevel: 2 },
  stamp_kit_A4: { label: "A4 (21 x 30 cm)", estimatedHours: "4-8 h", difficultyLabel: "Debutant", difficultyLevel: 1 },
};

type LegacyViewerData = {
  indices: number[];
  gridCols: number;
  gridRows: number;
  paletteKey: string;
  previewDataUrl: string;
  createdAt?: string;
};

export interface PaintingManifest {
  version: 2;
  orderRef: string;
  instructionCode: string;
  category: string;
  kitSize: KitSize;
  canvasLabel: string;
  artStyle: ArtStyle;
  paletteKey: string;
  createdAt: string;
  dedicationText: string | null;
  sourceImageUrl: string | null;
  referenceImageUrl: string;
  previewDataUrl: string;
  viewerUrl: string;
  gridCols: number;
  gridRows: number;
  indices: number[];
  stats: {
    totalCells: number;
    totalSections: number;
    totalPages: number;
    sectionCols: number;
    sectionRows: number;
    totalGridPages: number;
    colorCount: number;
    estimatedHours: string;
    difficultyLabel: string;
    difficultyLevel: number;
  };
}

function inferKitSize(gridCols: number, gridRows: number): KitSize {
  if (gridCols === 160 && gridRows === 200) return "stamp_kit_40x50";
  if (gridCols === 84 && gridRows === 119) return "stamp_kit_A4";
  return "stamp_kit_30x40";
}

export function orderStyleToPaletteKey(style: ArtStyle | string) {
  return style === "pop_art" ? "popart" : style;
}

export function resolveManifestPalette(manifest: PaintingManifest): StylePalette {
  const paletteKey = orderStyleToPaletteKey(manifest.artStyle);
  const palettes = manifest.kitSize === "stamp_kit_A4" ? COMPACT_PALETTES : PALETTES;
  return palettes[paletteKey] || PALETTES.original;
}

export function getPaintingManifestStorageKey(instructionCode: string) {
  return `${STORAGE_KEYS.viewerDataPrefix}${instructionCode.toUpperCase()}`;
}

export function getViewerProgressStorageKey(instructionCode: string) {
  return `${STORAGE_KEYS.progressPrefix}${instructionCode.toUpperCase()}`;
}

export function persistPaintingManifestLocally(manifest: PaintingManifest) {
  localStorage.setItem(getPaintingManifestStorageKey(manifest.instructionCode), JSON.stringify(manifest));
}

function normalizeManifest(raw: unknown, instructionCode: string): PaintingManifest | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<PaintingManifest>;

  if (candidate.version === 2 && Array.isArray(candidate.indices) && typeof candidate.referenceImageUrl === "string") {
    return candidate as PaintingManifest;
  }

  const legacy = raw as LegacyViewerData;
  if (!Array.isArray(legacy.indices) || !legacy.gridCols || !legacy.gridRows || !legacy.paletteKey) {
    return null;
  }

  const inferredKitSize = inferKitSize(legacy.gridCols, legacy.gridRows);
  const stats = getPaintingStats(legacy.gridCols, legacy.gridRows);
  const kitMeta = KIT_META[inferredKitSize];

  return {
    version: 2,
    orderRef: "",
    instructionCode: instructionCode.toUpperCase(),
    category: "classic",
    kitSize: inferredKitSize,
    canvasLabel: kitMeta.label,
    artStyle: legacy.paletteKey === "popart" ? "pop_art" : (legacy.paletteKey as ArtStyle),
    paletteKey: legacy.paletteKey,
    createdAt: legacy.createdAt || new Date().toISOString(),
    dedicationText: null,
    sourceImageUrl: null,
    referenceImageUrl: legacy.previewDataUrl,
    previewDataUrl: legacy.previewDataUrl,
    viewerUrl: buildViewerUrl(instructionCode),
    gridCols: legacy.gridCols,
    gridRows: legacy.gridRows,
    indices: legacy.indices,
    stats: {
      ...stats,
      colorCount: resolveManifestPalette({
        version: 2,
        orderRef: "",
        instructionCode,
        category: "classic",
        kitSize: inferredKitSize,
        canvasLabel: kitMeta.label,
        artStyle: legacy.paletteKey === "popart" ? "pop_art" : (legacy.paletteKey as ArtStyle),
        paletteKey: legacy.paletteKey,
        createdAt: legacy.createdAt || new Date().toISOString(),
        dedicationText: null,
        sourceImageUrl: null,
        referenceImageUrl: legacy.previewDataUrl,
        previewDataUrl: legacy.previewDataUrl,
        viewerUrl: buildViewerUrl(instructionCode),
        gridCols: legacy.gridCols,
        gridRows: legacy.gridRows,
        indices: legacy.indices,
        stats: {
          ...stats,
          colorCount: 0,
          estimatedHours: kitMeta.estimatedHours,
          difficultyLabel: kitMeta.difficultyLabel,
          difficultyLevel: kitMeta.difficultyLevel,
        },
      }).colors.length,
      estimatedHours: kitMeta.estimatedHours,
      difficultyLabel: kitMeta.difficultyLabel,
      difficultyLevel: kitMeta.difficultyLevel,
    },
  };
}

export function loadPaintingManifestLocally(instructionCode: string) {
  try {
    const stored = localStorage.getItem(getPaintingManifestStorageKey(instructionCode));
    if (!stored) return null;
    return normalizeManifest(JSON.parse(stored), instructionCode);
  } catch {
    return null;
  }
}

export function buildPaintingManifest(input: {
  order: OrderState;
  result: ProcessingResult;
  origin?: string;
}) {
  const { order, result, origin } = input;
  if (!order.instructionCode) {
    throw new Error("Instruction code is required to build the painting manifest");
  }

  const kitSize = order.selectedSize;
  if (!kitSize) {
    throw new Error("Kit size is required to build the painting manifest");
  }

  const kitMeta = KIT_META[kitSize];
  const stats = getPaintingStats(result.gridCols, result.gridRows);
  const referenceCanvas = renderSmoothPreview(result.indices, result.palette.colors, result.gridCols, result.gridRows, 6);
  const referenceImageUrl = referenceCanvas.toDataURL("image/jpeg", 0.9);
  const sourceImageUrl = order.aiGeneratedUrl || getPhoto(order) || null;

  return {
    version: 2 as const,
    orderRef: order.orderRef,
    instructionCode: order.instructionCode.toUpperCase(),
    category: order.category,
    kitSize,
    canvasLabel: kitMeta.label,
    artStyle: order.selectedStyle || "original",
    paletteKey: result.styleKey,
    createdAt: new Date().toISOString(),
    dedicationText: order.dedicationText?.trim() || null,
    sourceImageUrl,
    referenceImageUrl,
    previewDataUrl: referenceImageUrl,
    viewerUrl: buildViewerUrl(order.instructionCode, origin || BRAND.siteUrl),
    gridCols: result.gridCols,
    gridRows: result.gridRows,
    indices: Array.from(result.indices),
    stats: {
      ...stats,
      colorCount: result.palette.colors.length,
      estimatedHours: kitMeta.estimatedHours,
      difficultyLabel: kitMeta.difficultyLabel,
      difficultyLevel: kitMeta.difficultyLevel,
    },
  };
}
