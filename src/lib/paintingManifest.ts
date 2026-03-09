import { BRAND, STORAGE_KEYS, buildViewerUrl } from "@/lib/brand";
import {
  applyDedicationOverlay,
  sanitizeDedicationText,
  type PaintingDedication,
} from "@/lib/dedicationOverlay";
import { renderSmoothPreview, type ProcessingResult } from "@/lib/imageProcessing";
import {
  DEFAULT_PUBLIC_KIT,
  getKitConfig,
  isKitSize,
  type KitSize,
} from "@/lib/kitCatalog";
import { COMPACT_PALETTES, PALETTES, type StylePalette } from "@/lib/palettes";
import type { ArtStyle, OrderState } from "@/lib/store";
import { getPhoto } from "@/lib/store";
import { getPaintingStats } from "@/lib/paintingLayout";

type LegacyViewerData = {
  indices: number[];
  gridCols: number;
  gridRows: number;
  paletteKey: string;
  previewDataUrl: string;
  createdAt?: string;
};

type RawManifest = Partial<PaintingManifest> & {
  dedicationText?: string | null;
  dedication?: PaintingDedication | null;
};

type ManifestBase = Omit<PaintingManifest, "version" | "dedication" | "referenceImageUrl" | "previewDataUrl">;

export interface PaintingManifest {
  version: 3;
  orderRef: string;
  instructionCode: string;
  category: string;
  kitSize: KitSize;
  canvasLabel: string;
  artStyle: ArtStyle;
  paletteKey: string;
  createdAt: string;
  dedicationText: string | null;
  dedication: PaintingDedication | null;
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
  if (gridCols === 120 && gridRows === 160) return "stamp_kit_30x40";
  if (gridCols === 84 && gridRows === 119) return "stamp_kit_A4";
  if (gridCols === 118 && gridRows === 168) return "stamp_kit_A3";
  if (gridCols === 168 && gridRows === 237) return "stamp_kit_A2";
  return DEFAULT_PUBLIC_KIT;
}

export function orderStyleToPaletteKey(style: ArtStyle | string) {
  return style === "pop_art" ? "popart" : style;
}

export function resolveManifestPalette(manifest: Pick<PaintingManifest, "kitSize" | "artStyle">): StylePalette {
  const paletteKey = orderStyleToPaletteKey(manifest.artStyle);
  const palettes = manifest.kitSize === "stamp_kit_A4" ? COMPACT_PALETTES : PALETTES;
  return palettes[paletteKey] || PALETTES.original;
}

function materializeManifest(base: ManifestBase): PaintingManifest {
  const palette = resolveManifestPalette(base);
  const applied = applyDedicationOverlay({
    indices: Uint8Array.from(base.indices),
    gridCols: base.gridCols,
    gridRows: base.gridRows,
    palette: palette.colors,
    kitSize: base.kitSize,
    dedicationText: base.dedicationText,
  });
  const referenceCanvas = renderSmoothPreview(
    applied.indices,
    palette.colors,
    base.gridCols,
    base.gridRows,
    6,
  );
  const referenceImageUrl = referenceCanvas.toDataURL("image/jpeg", 0.9);

  return {
    ...base,
    version: 3,
    dedicationText: applied.dedication?.text || null,
    dedication: applied.dedication,
    referenceImageUrl,
    previewDataUrl: referenceImageUrl,
    indices: Array.from(applied.indices),
  };
}

function buildBaseManifest(input: {
  orderRef: string;
  instructionCode: string;
  category: string;
  kitSize: KitSize;
  artStyle: ArtStyle;
  paletteKey: string;
  createdAt: string;
  dedicationText: string | null;
  sourceImageUrl: string | null;
  viewerUrl: string;
  gridCols: number;
  gridRows: number;
  indices: number[];
}) {
  const kit = getKitConfig(input.kitSize);
  const stats = getPaintingStats(input.gridCols, input.gridRows);
  const palette = resolveManifestPalette({
    kitSize: input.kitSize,
    artStyle: input.artStyle,
  });

  return {
    orderRef: input.orderRef,
    instructionCode: input.instructionCode.toUpperCase(),
    category: input.category,
    kitSize: input.kitSize,
    canvasLabel: kit.manifestLabel,
    artStyle: input.artStyle,
    paletteKey: input.paletteKey,
    createdAt: input.createdAt,
    dedicationText: sanitizeDedicationText(input.dedicationText) || null,
    sourceImageUrl: input.sourceImageUrl,
    viewerUrl: input.viewerUrl,
    gridCols: input.gridCols,
    gridRows: input.gridRows,
    indices: input.indices,
    stats: {
      ...stats,
      colorCount: palette.colors.length,
      estimatedHours: kit.hoursLabel,
      difficultyLabel: kit.manifestDifficultyLabel,
      difficultyLevel: kit.difficultyLevel,
    },
  } satisfies ManifestBase;
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

export function normalizePaintingManifest(raw: unknown, instructionCode: string) {
  if (!raw || typeof raw !== "object") return null;

  const candidate = raw as RawManifest;
  if (!Array.isArray(candidate.indices) || !candidate.gridCols || !candidate.gridRows) {
    const legacy = raw as LegacyViewerData;
    if (!Array.isArray(legacy.indices) || !legacy.gridCols || !legacy.gridRows || !legacy.paletteKey) {
      return null;
    }

    const inferredKitSize = inferKitSize(legacy.gridCols, legacy.gridRows);
    return materializeManifest(
      buildBaseManifest({
        orderRef: "",
        instructionCode,
        category: "classic",
        kitSize: inferredKitSize,
        artStyle: legacy.paletteKey === "popart" ? "pop_art" : (legacy.paletteKey as ArtStyle),
        paletteKey: legacy.paletteKey,
        createdAt: legacy.createdAt || new Date().toISOString(),
        dedicationText: null,
        sourceImageUrl: null,
        viewerUrl: buildViewerUrl(instructionCode),
        gridCols: legacy.gridCols,
        gridRows: legacy.gridRows,
        indices: legacy.indices,
      }),
    );
  }

  const inferredKitSize =
    candidate.kitSize && isKitSize(candidate.kitSize)
      ? candidate.kitSize
      : inferKitSize(candidate.gridCols, candidate.gridRows);
  const artStyle = candidate.artStyle || (candidate.paletteKey === "popart" ? "pop_art" : "original");
  const base = buildBaseManifest({
    orderRef: candidate.orderRef || "",
    instructionCode: candidate.instructionCode || instructionCode,
    category: candidate.category || "classic",
    kitSize: inferredKitSize,
    artStyle,
    paletteKey: candidate.paletteKey || orderStyleToPaletteKey(artStyle),
    createdAt: candidate.createdAt || new Date().toISOString(),
    dedicationText: candidate.dedication?.text || candidate.dedicationText || null,
    sourceImageUrl:
      typeof candidate.sourceImageUrl === "string" && candidate.sourceImageUrl.length > 0
        ? candidate.sourceImageUrl
        : null,
    viewerUrl:
      typeof candidate.viewerUrl === "string" && candidate.viewerUrl.length > 0
        ? candidate.viewerUrl
        : buildViewerUrl(candidate.instructionCode || instructionCode),
    gridCols: candidate.gridCols,
    gridRows: candidate.gridRows,
    indices: candidate.indices,
  });

  if (candidate.version === 3 && typeof candidate.referenceImageUrl === "string") {
    return {
      ...base,
      version: 3,
      dedication: candidate.dedication || null,
      referenceImageUrl: candidate.referenceImageUrl,
      previewDataUrl:
        typeof candidate.previewDataUrl === "string" && candidate.previewDataUrl.length > 0
          ? candidate.previewDataUrl
          : candidate.referenceImageUrl,
      indices: candidate.indices,
    } satisfies PaintingManifest;
  }

  return materializeManifest(base);
}

export function loadPaintingManifestLocally(instructionCode: string) {
  try {
    const stored = localStorage.getItem(getPaintingManifestStorageKey(instructionCode));
    if (!stored) return null;
    return normalizePaintingManifest(JSON.parse(stored), instructionCode);
  } catch {
    return null;
  }
}

export function buildPaintingManifest(input: {
  order: OrderState;
  result: ProcessingResult;
  origin?: string;
  dedicationText?: string | null;
}) {
  const { order, result, origin } = input;
  if (!order.instructionCode) {
    throw new Error("Instruction code is required to build the painting manifest");
  }

  const kitSize = order.selectedSize;
  if (!kitSize) {
    throw new Error("Kit size is required to build the painting manifest");
  }

  return materializeManifest(
    buildBaseManifest({
      orderRef: order.orderRef,
      instructionCode: order.instructionCode,
      category: order.category,
      kitSize,
      artStyle: order.selectedStyle || "original",
      paletteKey: result.styleKey,
      createdAt: new Date().toISOString(),
      dedicationText: input.dedicationText ?? order.dedicationText ?? null,
      sourceImageUrl: order.aiGeneratedUrl || getPhoto(order) || null,
      viewerUrl: buildViewerUrl(order.instructionCode, origin || BRAND.siteUrl),
      gridCols: result.gridCols,
      gridRows: result.gridRows,
      indices: Array.from(result.indices),
    }),
  );
}
