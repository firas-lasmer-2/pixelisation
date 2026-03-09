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
import { resolveLegacyPalette, type StylePalette } from "@/lib/palettes";
import type { ArtStyle, OrderState } from "@/lib/store";
import { getPhoto } from "@/lib/store";
import { getPaintingStats } from "@/lib/paintingLayout";
import { getStyleDefinition, normalizeArtStyle } from "@/lib/styles";

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
  styleProfileKey?: string;
  styleProfileVersion?: number;
  paletteSnapshot?: StylePalette | null;
};

type ManifestBase = Omit<PaintingManifest, "version" | "dedication" | "referenceImageUrl" | "previewDataUrl">;

export interface PaintingManifest {
  version: 4;
  orderRef: string;
  instructionCode: string;
  category: string;
  kitSize: KitSize;
  canvasLabel: string;
  artStyle: ArtStyle;
  paletteKey: string;
  styleProfileKey: ArtStyle;
  styleProfileVersion: number;
  paletteSnapshot: StylePalette;
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

function resolveStyleProfileVersion(style: ArtStyle, version?: number | null) {
  if (typeof version === "number" && Number.isFinite(version)) return version;
  return getStyleDefinition(style).profileVersion;
}

function resolveManifestStylePalette(rawPalette: unknown, style: ArtStyle): StylePalette {
  if (
    rawPalette &&
    typeof rawPalette === "object" &&
    Array.isArray((rawPalette as StylePalette).colors) &&
    (rawPalette as StylePalette).colors.length > 0
  ) {
    return rawPalette as StylePalette;
  }

  return resolveLegacyPalette(style);
}

export function orderStyleToPaletteKey(style: ArtStyle | string) {
  return normalizeArtStyle(style);
}

export function resolveManifestPalette(
  manifest: Pick<PaintingManifest, "paletteSnapshot" | "artStyle">,
): StylePalette {
  return resolveManifestStylePalette(manifest.paletteSnapshot, normalizeArtStyle(manifest.artStyle));
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
    version: 4,
    paletteSnapshot: palette,
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
  styleProfileKey: ArtStyle;
  styleProfileVersion: number;
  paletteSnapshot: StylePalette;
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

  return {
    orderRef: input.orderRef,
    instructionCode: input.instructionCode.toUpperCase(),
    category: input.category,
    kitSize: input.kitSize,
    canvasLabel: kit.manifestLabel,
    artStyle: input.artStyle,
    paletteKey: input.paletteKey,
    styleProfileKey: input.styleProfileKey,
    styleProfileVersion: input.styleProfileVersion,
    paletteSnapshot: input.paletteSnapshot,
    createdAt: input.createdAt,
    dedicationText: sanitizeDedicationText(input.dedicationText) || null,
    sourceImageUrl: input.sourceImageUrl,
    viewerUrl: input.viewerUrl,
    gridCols: input.gridCols,
    gridRows: input.gridRows,
    indices: input.indices,
    stats: {
      ...stats,
      colorCount: input.paletteSnapshot.colors.length,
      estimatedHours: kit.hoursLabel,
      difficultyLabel: kit.manifestDifficultyLabel,
      difficultyLevel: kit.difficultyLevel,
    },
  } satisfies ManifestBase;
}

function finalizeManifest(base: ManifestBase, raw: RawManifest | null) {
  const referenceImageUrl = typeof raw?.referenceImageUrl === "string" && raw.referenceImageUrl.length > 0
    ? raw.referenceImageUrl
    : null;

  if (referenceImageUrl) {
    return {
      ...base,
      version: 4,
      dedication: raw?.dedication || null,
      referenceImageUrl,
      previewDataUrl:
        typeof raw?.previewDataUrl === "string" && raw.previewDataUrl.length > 0
          ? raw.previewDataUrl
          : referenceImageUrl,
      indices: base.indices,
    } satisfies PaintingManifest;
  }

  return materializeManifest(base);
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

    const artStyle = normalizeArtStyle(legacy.paletteKey);
    const paletteSnapshot = resolveLegacyPalette(artStyle);
    const inferredKitSize = inferKitSize(legacy.gridCols, legacy.gridRows);

    return finalizeManifest(
      buildBaseManifest({
        orderRef: "",
        instructionCode,
        category: "classic",
        kitSize: inferredKitSize,
        artStyle,
        paletteKey: orderStyleToPaletteKey(artStyle),
        styleProfileKey: artStyle,
        styleProfileVersion: 0,
        paletteSnapshot,
        createdAt: legacy.createdAt || new Date().toISOString(),
        dedicationText: null,
        sourceImageUrl: null,
        viewerUrl: buildViewerUrl(instructionCode),
        gridCols: legacy.gridCols,
        gridRows: legacy.gridRows,
        indices: legacy.indices,
      }),
      {
        referenceImageUrl: legacy.previewDataUrl,
        previewDataUrl: legacy.previewDataUrl,
      } as RawManifest,
    );
  }

  const inferredKitSize =
    candidate.kitSize && isKitSize(candidate.kitSize)
      ? candidate.kitSize
      : inferKitSize(candidate.gridCols, candidate.gridRows);
  const artStyle = normalizeArtStyle(candidate.artStyle || candidate.paletteKey || "original");
  const styleProfileKey = normalizeArtStyle(candidate.styleProfileKey || artStyle);
  const paletteSnapshot = resolveManifestStylePalette(candidate.paletteSnapshot, artStyle);
  const base = buildBaseManifest({
    orderRef: candidate.orderRef || "",
    instructionCode: candidate.instructionCode || instructionCode,
    category: candidate.category || "classic",
    kitSize: inferredKitSize,
    artStyle,
    paletteKey: candidate.paletteKey || orderStyleToPaletteKey(artStyle),
    styleProfileKey,
    styleProfileVersion: resolveStyleProfileVersion(styleProfileKey, candidate.styleProfileVersion),
    paletteSnapshot,
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

  return finalizeManifest(base, candidate);
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
      artStyle: normalizeArtStyle(order.selectedStyle || result.styleKey),
      paletteKey: orderStyleToPaletteKey(result.styleKey),
      styleProfileKey: result.styleProfileKey,
      styleProfileVersion: result.styleProfileVersion,
      paletteSnapshot: result.palette,
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
