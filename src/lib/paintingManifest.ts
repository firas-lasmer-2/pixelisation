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
import type { ArtStyle, GlitterPalette, OrderState, ProductType, StencilDetailLevel } from "@/lib/store";
import { getPhoto } from "@/lib/store";
import { getPaintingStats } from "@/lib/paintingLayout";
import { getStyleDefinition, normalizeArtStyle } from "@/lib/styles";
import { type StencilResult, renderStencilPreview } from "@/lib/stencilProcessing";

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
  productType?: ProductType;
  stencilDetailLevel?: StencilDetailLevel | null;
  stencilBridgeCount?: number | null;
  glitterPalette?: GlitterPalette | null;
};

type ManifestBase = Omit<PaintingManifest, "version" | "dedication" | "referenceImageUrl" | "previewDataUrl">;
type StoredPaintingManifest = Omit<PaintingManifest, "referenceImageUrl" | "previewDataUrl" | "sourceImageUrl"> & {
  referenceImageUrl?: string | null;
  previewDataUrl?: string | null;
  sourceImageUrl?: string | null;
};

export interface PaintingManifest {
  version: 5;
  productType: ProductType;
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
  /** Stencil-specific fields (null for paint_by_numbers) */
  stencilDetailLevel: StencilDetailLevel | null;
  stencilBridgeCount: number | null;
  glitterPalette: GlitterPalette | null;
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
  if (gridCols === 160 && gridRows === 240) return "stamp_kit_40x60";
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
    version: 5,
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
  productType?: ProductType;
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
  stencilDetailLevel?: StencilDetailLevel | null;
  stencilBridgeCount?: number | null;
  glitterPalette?: GlitterPalette | null;
}) {
  const kit = getKitConfig(input.kitSize);
  const stats = getPaintingStats(input.gridCols, input.gridRows);

  return {
    orderRef: input.orderRef,
    instructionCode: input.instructionCode.toUpperCase(),
    category: input.category,
    productType: input.productType ?? "paint_by_numbers",
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
    stencilDetailLevel: input.stencilDetailLevel ?? null,
    stencilBridgeCount: input.stencilBridgeCount ?? null,
    glitterPalette: input.glitterPalette ?? null,
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
      version: 5,
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

function isInlineDataUrl(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith("data:");
}

function toStoredPaintingManifest(manifest: PaintingManifest): StoredPaintingManifest {
  const {
    referenceImageUrl,
    previewDataUrl,
    sourceImageUrl,
    ...manifestBase
  } = manifest;

  return {
    ...manifestBase,
    sourceImageUrl: isInlineDataUrl(sourceImageUrl) ? null : sourceImageUrl,
    ...(isInlineDataUrl(referenceImageUrl) ? {} : { referenceImageUrl }),
    ...(isInlineDataUrl(previewDataUrl) ? {} : { previewDataUrl }),
  };
}

function getManifestCacheStorages(): Storage[] {
  if (typeof window === "undefined") return [];
  return [window.localStorage, window.sessionStorage];
}

function tryWriteManifestToStorage(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function tryReadManifestFromStorage(storage: Storage, key: string, instructionCode: string) {
  try {
    const stored = storage.getItem(key);
    if (!stored) return null;
    return normalizePaintingManifest(JSON.parse(stored), instructionCode);
  } catch {
    return null;
  }
}

function tryRemoveManifestFromStorage(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // Ignore cache cleanup failures.
  }
}

export function persistPaintingManifestLocally(manifest: PaintingManifest) {
  const storages = getManifestCacheStorages();
  if (storages.length === 0) return;

  const [localStorageCache, sessionStorageCache] = storages;
  const cacheKey = getPaintingManifestStorageKey(manifest.instructionCode);
  const serializedManifest = JSON.stringify(toStoredPaintingManifest(manifest));

  if (localStorageCache && tryWriteManifestToStorage(localStorageCache, cacheKey, serializedManifest)) {
    if (sessionStorageCache) {
      tryRemoveManifestFromStorage(sessionStorageCache, cacheKey);
    }
    return;
  }

  if (sessionStorageCache && tryWriteManifestToStorage(sessionStorageCache, cacheKey, serializedManifest)) {
    return;
  }

  console.warn("Unable to cache painting manifest locally", {
    instructionCode: manifest.instructionCode,
  });
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
    productType: candidate.productType ?? "paint_by_numbers",
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
    stencilDetailLevel: candidate.stencilDetailLevel ?? null,
    stencilBridgeCount: candidate.stencilBridgeCount ?? null,
    glitterPalette: candidate.glitterPalette ?? null,
  });

  return finalizeManifest(base, candidate);
}

export function loadPaintingManifestLocally(instructionCode: string) {
  const cacheKey = getPaintingManifestStorageKey(instructionCode);

  for (const storage of getManifestCacheStorages()) {
    const manifest = tryReadManifestFromStorage(storage, cacheKey, instructionCode);
    if (manifest) {
      return manifest;
    }
  }

  return null;
}

/** Synthetic 4-level palette used to render stencil previews in the viewer */
const STENCIL_PALETTE_SNAPSHOT: StylePalette = {
  name: "Stencil",
  description: "Stencil reveal palette",
  colors: [
    { name: "Background", ref: "background", r: 70,  g: 60,  b: 55,  hex: "#463C37", L: 25,  a: 1,   bLab: 2   },
    { name: "Portrait",   ref: "portrait",   r: 255, g: 255, b: 255, hex: "#FFFFFF", L: 100, a: 0,   bLab: 0   },
    { name: "Mid Shadow", ref: "mid_shadow", r: 210, g: 205, b: 200, hex: "#D2CDC8", L: 81,  a: 0.5, bLab: 1.5 },
    { name: "Deep Shadow",ref: "deep_shadow",r: 160, g: 155, b: 150, hex: "#A09B96", L: 63,  a: 0.5, bLab: 1.5 },
  ],
};

export function buildPaintingManifest(input: {
  order: OrderState;
  result: ProcessingResult | StencilResult;
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

  const isStencil = order.productType === "stencil_paint" || order.productType === "glitter_reveal";

  if (isStencil) {
    const stencilResult = result as StencilResult;
    const base = buildBaseManifest({
      orderRef: order.orderRef,
      instructionCode: order.instructionCode,
      category: order.category,
      productType: order.productType,
      kitSize,
      artStyle: "original",
      paletteKey: "stencil",
      styleProfileKey: "original",
      styleProfileVersion: 1,
      paletteSnapshot: STENCIL_PALETTE_SNAPSHOT,
      createdAt: new Date().toISOString(),
      dedicationText: input.dedicationText ?? order.dedicationText ?? null,
      sourceImageUrl: order.aiGeneratedUrl || getPhoto(order) || null,
      viewerUrl: buildViewerUrl(order.instructionCode, origin || BRAND.siteUrl),
      gridCols: stencilResult.gridCols,
      gridRows: stencilResult.gridRows,
      indices: Array.from(stencilResult.indices),
      stencilDetailLevel: order.stencilDetailLevel,
      stencilBridgeCount: stencilResult.bridgeCount,
      glitterPalette: order.glitterPalette,
    });

    // Apply dedication overlay so the text is baked into the preview
    const applied = applyDedicationOverlay({
      indices: Uint8Array.from(base.indices),
      gridCols: base.gridCols,
      gridRows: base.gridRows,
      palette: STENCIL_PALETTE_SNAPSHOT.colors,
      kitSize: base.kitSize,
      dedicationText: base.dedicationText,
    });

    // Use the stencil-specific renderer (solid cells, real contrast) — NOT renderSmoothPreview
    const previewCanvas = renderStencilPreview(
      applied.indices,
      base.gridCols,
      base.gridRows,
      stencilResult.levels,
    );
    const previewDataUrl = previewCanvas.toDataURL("image/jpeg", 0.92);

    return {
      ...base,
      version: 5 as const,
      paletteSnapshot: STENCIL_PALETTE_SNAPSHOT,
      dedicationText: applied.dedication?.text || null,
      dedication: applied.dedication,
      referenceImageUrl: previewDataUrl,
      previewDataUrl,
      indices: Array.from(applied.indices),
    } satisfies PaintingManifest;
  }

  const paintResult = result as ProcessingResult;
  return materializeManifest(
    buildBaseManifest({
      orderRef: order.orderRef,
      instructionCode: order.instructionCode,
      category: order.category,
      productType: "paint_by_numbers",
      kitSize,
      artStyle: normalizeArtStyle(order.selectedStyle || paintResult.styleKey),
      paletteKey: orderStyleToPaletteKey(paintResult.styleKey),
      styleProfileKey: paintResult.styleProfileKey,
      styleProfileVersion: paintResult.styleProfileVersion,
      paletteSnapshot: paintResult.palette,
      createdAt: new Date().toISOString(),
      dedicationText: input.dedicationText ?? order.dedicationText ?? null,
      sourceImageUrl: order.aiGeneratedUrl || getPhoto(order) || null,
      viewerUrl: buildViewerUrl(order.instructionCode, origin || BRAND.siteUrl),
      gridCols: paintResult.gridCols,
      gridRows: paintResult.gridRows,
      indices: Array.from(paintResult.indices),
    }),
  );
}
