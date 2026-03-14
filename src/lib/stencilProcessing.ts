/**
 * stencilProcessing.ts
 *
 * Converts a photo into a stencil mask for Stencil Paint Reveal and
 * Glitter Reveal products. Unlike paint-by-numbers (which quantizes to
 * 8-12 colors), this pipeline produces a binary/multi-level grayscale
 * mask where:
 *   index 0 = background (painted/glittered area)
 *   index 1 = portrait area (white — revealed when stencil is peeled)
 *   index 2 = mid-tone (fine/medium only — partial reveal or shadow)
 *   index 3 = dark-tone  (fine only — deepest shadow detail)
 *
 * The output `indices` array is compatible with the existing
 * PaintingManifest storage and viewer system.
 */

import type { ProcessingKitSize } from "./kitCatalog";
import { PROCESSING_GRID_CONFIG } from "./kitCatalog";
import { bilateralFilter, progressiveDownscale, sigmoidContrast } from "./imageProcessing";
import type { StencilDetailLevel } from "./store";

// ─── Public types ────────────────────────────────────────────────────────────

export interface StencilResult {
  detailLevel: StencilDetailLevel;
  /** 0=background, 1+=portrait levels (white after reveal) */
  indices: Uint8Array;
  gridCols: number;
  gridRows: number;
  canvas: HTMLCanvasElement;
  dataUrl: string;
  levels: number;
  bridgeCount: number;
}

// Detail level → processing params
const DETAIL_CONFIG: Record<
  StencilDetailLevel,
  { levels: number; bilateralPasses: number; minRegionSize: number; sigmoidK: number }
> = {
  bold:   { levels: 2, bilateralPasses: 1, minRegionSize: 10, sigmoidK: 12 },
  medium: { levels: 3, bilateralPasses: 1, minRegionSize: 3,  sigmoidK: 10 },
  fine:   { levels: 4, bilateralPasses: 0, minRegionSize: 2,  sigmoidK: 8  },
};

/**
 * Generate render colors for stencil preview.
 * Index 0 = dark background, higher indices = progressively brighter (portrait).
 * 2-level: [dark, white]
 * 3-level: [dark, warm-gray, white]
 * 4-level: [dark, gray, light-gray, white]
 */
function getStencilRenderColors(levels: number) {
  const bg = { r: 40, g: 35, b: 32 };
  if (levels <= 2) return [bg, { r: 255, g: 255, b: 255 }];

  const colors = [bg];
  for (let i = 1; i < levels; i++) {
    const t = i / (levels - 1);
    colors.push({
      r: Math.round(120 + t * 135),
      g: Math.round(115 + t * 140),
      b: Math.round(110 + t * 145),
    });
  }
  return colors;
}

export function getStencilLevels(detailLevel: StencilDetailLevel | null | undefined): number {
  if (!detailLevel || !(detailLevel in DETAIL_CONFIG)) return 2;
  return DETAIL_CONFIG[detailLevel].levels;
}

// ─── Main entry point ────────────────────────────────────────────────────────

export async function processStencilImage(
  imageSrc: string,
  cropData: { x: number; y: number; width: number; height: number },
  kitSize: ProcessingKitSize,
  detailLevel: StencilDetailLevel,
  adjustments: { brightness: number; contrast: number } = { brightness: 100, contrast: 100 }
): Promise<StencilResult> {
  const cfg = DETAIL_CONFIG[detailLevel];
  const grid = PROCESSING_GRID_CONFIG[kitSize];
  const cols = grid.cols;
  const rows = grid.rows;

  // 1. Load image
  const img = await loadImage(imageSrc);

  // 2. Apply crop and draw to an offscreen canvas
  const cropped = applyCrop(img, cropData, adjustments);

  // 3. Progressive downscale to grid dimensions
  const imageData = progressiveDownscale(cropped, cols, rows);

  // 4. Grayscale conversion (luminance-weighted)
  const gray = toGrayscale(imageData);

  // 5. Save original grayscale for luminance band splitting (before sigmoid crushes it)
  const originalGray = new Uint8ClampedArray(gray.data);

  // 6. Sigmoid contrast enhancement for binary bg/portrait separation
  sigmoidContrast(gray.data, gray.width, gray.height, cfg.sigmoidK);

  // 7. Light bilateral filter for noise reduction while preserving edges
  //    Use smaller sigma/radius than paint-by-numbers to keep stencil edges crisp
  for (let i = 0; i < cfg.bilateralPasses; i++) {
    bilateralFilter(gray.data, gray.width, gray.height, 1.5, 15, 1);
  }

  // 8. Adaptive multi-level thresholding using luminance bands
  //    - gray.data (post-sigmoid) for binary bg/portrait split
  //    - originalGray for luminance band subdivision within portrait
  const indices = adaptiveThreshold(gray.data, originalGray, cols, rows, cfg.levels);

  // 8. Stencil bridge analysis — connect floating background islands
  const { bridgeCount } = addStencilBridges(indices, cols, rows);

  // 9. Clean up physically impractical tiny regions
  cleanSmallRegions(indices, cols, rows, cfg.minRegionSize, cfg.levels);

  // 10. Auto-correct if the stencil looks inverted.
  // Otsu thresholding treats "bright = portrait", but for photos with bright
  // backgrounds (most indoor/studio shots) the background gets labelled as
  // portrait and the face ends up as background (all dark). Detect this by
  // checking border pixels: image borders almost always belong to the
  // background, so if the majority of border pixels are portrait (index > 0)
  // the classification is inverted. Also catch the degenerate "all background"
  // case where no portrait was detected at all.
  autoCorrectInversion(indices, cols, rows, cfg.levels);

  // 11. Render preview canvas
  const canvas = renderStencilPreview(indices, cols, rows, cfg.levels);

  return {
    detailLevel,
    indices,
    gridCols: cols,
    gridRows: rows,
    canvas,
    dataUrl: canvas.toDataURL("image/png"),
    levels: cfg.levels,
    bridgeCount,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function applyCrop(
  img: HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number },
  adjustments?: { brightness: number; contrast: number }
): HTMLCanvasElement {
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = crop.width;
  cropCanvas.height = crop.height;
  const cropCtx = cropCanvas.getContext("2d")!;
  if (adjustments) {
    cropCtx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%)`;
  }
  cropCtx.drawImage(
    img,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, crop.width, crop.height,
  );
  if (adjustments) {
    cropCtx.filter = "none";
  }
  return cropCanvas;
}

/** Convert RGBA ImageData to grayscale (luminance in R channel, A=255) */
function toGrayscale(src: ImageData): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext("2d")!;
  const dst = ctx.createImageData(src.width, src.height);

  for (let i = 0; i < src.width * src.height; i++) {
    const si = i * 4;
    const lum = Math.round(0.299 * src.data[si] + 0.587 * src.data[si + 1] + 0.114 * src.data[si + 2]);
    dst.data[si] = lum;
    dst.data[si + 1] = lum;
    dst.data[si + 2] = lum;
    dst.data[si + 3] = 255;
  }

  return dst;
}

/**
 * Adaptive thresholding using binary Otsu + luminance bands.
 *
 * 1. Single-threshold Otsu on post-sigmoid data separates background from portrait.
 * 2. For levels > 2: within the portrait region, use ORIGINAL (pre-sigmoid)
 *    luminance to split into tonal bands. Sigmoid crushes all values toward
 *    0 or 255, destroying the tonal variation needed for bands — so we must
 *    read from the original grayscale.
 */
function adaptiveThreshold(
  data: Uint8ClampedArray,
  originalGray: Uint8ClampedArray,
  w: number,
  h: number,
  levels: number,
): Uint8Array {
  const n = w * h;
  const indices = new Uint8Array(n);

  // Build histogram from post-sigmoid data (good for binary split)
  const hist = new Float64Array(256);
  for (let i = 0; i < n; i++) hist[data[i * 4]]++;
  for (let i = 0; i < 256; i++) hist[i] /= n;

  // Single-threshold Otsu — reliable binary separation
  const threshold = otsuSingleThreshold(hist);
  const maxLevel = levels - 1;

  // Binary assignment: 0 = background (dark), maxLevel = portrait (bright)
  for (let i = 0; i < n; i++) {
    indices[i] = data[i * 4] > threshold ? maxLevel : 0;
  }

  // For levels > 2: split portrait region into luminance bands
  // using ORIGINAL grayscale (pre-sigmoid) which preserves tonal variation
  if (levels > 2) {
    // Collect original luminance values of all portrait pixels
    const portraitLuminances: number[] = [];
    for (let i = 0; i < n; i++) {
      if (indices[i] === maxLevel) {
        portraitLuminances.push(originalGray[i * 4]);
      }
    }

    if (portraitLuminances.length > 0) {
      portraitLuminances.sort((a, b) => a - b);

      // Compute percentile thresholds to split portrait into bands
      // 3 levels → dark 30% = contour, bright 70% = white
      // 4 levels → dark 25% = deep contour, mid 25% = light contour, bright 50% = white
      const bandThresholds: number[] = [];
      if (levels === 3) {
        bandThresholds.push(portraitLuminances[Math.floor(portraitLuminances.length * 0.30)]);
      } else {
        bandThresholds.push(portraitLuminances[Math.floor(portraitLuminances.length * 0.25)]);
        bandThresholds.push(portraitLuminances[Math.floor(portraitLuminances.length * 0.50)]);
      }

      // Reassign portrait pixels to bands using ORIGINAL luminance
      for (let i = 0; i < n; i++) {
        if (indices[i] === maxLevel) {
          const lum = originalGray[i * 4];
          let band = 1;
          for (let t = 0; t < bandThresholds.length; t++) {
            if (lum > bandThresholds[t]) {
              band = t + 2;
            }
          }
          indices[i] = Math.min(band, maxLevel);
        }
      }
    }
  }

  return indices;
}

function otsuSingleThreshold(hist: Float64Array): number {
  let sumB = 0;
  let wB = 0;
  // Total weighted mean (equivalent of sum(i * hist[i]) for i=0..255)
  let total = 0;
  for (let i = 0; i < 256; i++) total += i * hist[i];
  let maxVar = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = 1 - wB;
    if (wF === 0) break;

    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (total - sumB) / wF;
    const varBetween = wB * wF * (mB - mF) ** 2;

    if (varBetween > maxVar) {
      maxVar = varBetween;
      threshold = t;
    }
  }
  return threshold;
}

/**
 * Stencil bridge analysis.
 * Finds background (index=0) regions that are isolated (not connected to the
 * main background region at the image border), and draws thin bridges to
 * connect them. Without bridges, floating stencil islands would fall off
 * when the adhesive is cut.
 */
function addStencilBridges(
  indices: Uint8Array,
  w: number,
  h: number,
): { bridgeCount: number } {
  const n = w * h;
  const visited = new Uint8Array(n);
  let bridgeCount = 0;

  // Label each background pixel with its connected component
  const labels = new Int32Array(n).fill(-1);
  let nextLabel = 0;
  const componentSizes: number[] = [];

  // BFS flood fill for background pixels
  for (let start = 0; start < n; start++) {
    if (indices[start] !== 0 || visited[start]) continue;

    const queue: number[] = [start];
    visited[start] = 1;
    labels[start] = nextLabel;
    let size = 0;

    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      size++;
      const cx = cur % w;
      const cy = (cur - cx) / w;

      const neighbors = [
        cy > 0     ? cur - w : -1,
        cy < h - 1 ? cur + w : -1,
        cx > 0     ? cur - 1 : -1,
        cx < w - 1 ? cur + 1 : -1,
      ];

      for (const nb of neighbors) {
        if (nb >= 0 && indices[nb] === 0 && !visited[nb]) {
          visited[nb] = 1;
          labels[nb] = nextLabel;
          queue.push(nb);
        }
      }
    }

    componentSizes.push(size);
    nextLabel++;
  }

  if (nextLabel <= 1) return { bridgeCount: 0 };

  // Find the main background component (largest component that touches a border)
  let mainLabel = -1;
  let mainSize = 0;

  for (let x = 0; x < w; x++) {
    const topLabel = labels[x];
    const botLabel = labels[(h - 1) * w + x];
    if (topLabel >= 0 && componentSizes[topLabel] > mainSize) {
      mainSize = componentSizes[topLabel];
      mainLabel = topLabel;
    }
    if (botLabel >= 0 && componentSizes[botLabel] > mainSize) {
      mainSize = componentSizes[botLabel];
      mainLabel = botLabel;
    }
  }
  for (let y = 0; y < h; y++) {
    const leftLabel = labels[y * w];
    const rightLabel = labels[y * w + w - 1];
    if (leftLabel >= 0 && componentSizes[leftLabel] > mainSize) {
      mainSize = componentSizes[leftLabel];
      mainLabel = leftLabel;
    }
    if (rightLabel >= 0 && componentSizes[rightLabel] > mainSize) {
      mainSize = componentSizes[rightLabel];
      mainLabel = rightLabel;
    }
  }

  if (mainLabel === -1) return { bridgeCount: 0 };

  // For each isolated background component, draw a 2-pixel-wide bridge to
  // the nearest main-component background pixel
  for (let label = 0; label < nextLabel; label++) {
    if (label === mainLabel) continue;
    if (componentSizes[label] < 3) continue; // Too small to matter physically

    // Find centroid of this island
    let sumX = 0;
    let sumY = 0;
    let cnt = 0;
    for (let i = 0; i < n; i++) {
      if (labels[i] === label) {
        sumX += i % w;
        sumY += Math.floor(i / w);
        cnt++;
      }
    }
    if (cnt === 0) continue;
    const cx = Math.round(sumX / cnt);
    const cy = Math.round(sumY / cnt);

    // Find nearest main-component pixel
    let nearestDist = Infinity;
    let nearestX = -1;
    let nearestY = -1;

    for (let i = 0; i < n; i++) {
      if (labels[i] === mainLabel) {
        const mx = i % w;
        const my = Math.floor(i / w);
        const dist = (mx - cx) ** 2 + (my - cy) ** 2;
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestX = mx;
          nearestY = my;
        }
      }
    }

    if (nearestX === -1) continue;

    // Draw 2-pixel-wide bridge along the shorter axis (Manhattan path)
    drawBridge(indices, labels, w, h, cx, cy, nearestX, nearestY, mainLabel);
    bridgeCount++;
  }

  return { bridgeCount };
}

function drawBridge(
  indices: Uint8Array,
  labels: Int32Array,
  w: number,
  h: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  mainLabel: number,
): void {
  // Bresenham line + 1-pixel thickness
  let x = x1;
  let y = y1;
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    // Set this and adjacent pixel to background (0), update label
    for (let oy = -1; oy <= 1; oy++) {
      const ny = y + oy;
      if (ny >= 0 && ny < h) {
        const idx = ny * w + x;
        indices[idx] = 0;
        labels[idx] = mainLabel;
      }
    }

    if (x === x2 && y === y2) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx)  { err += dx; y += sy; }
  }
}

/**
 * Remove physically impractical tiny stencil regions.
 * Small portrait (non-zero) regions that are too small to hold adhesive
 * in place are merged into the surrounding background.
 */
function cleanSmallRegions(
  indices: Uint8Array,
  w: number,
  h: number,
  minSize: number,
  levels: number,
): void {
  const n = w * h;

  for (let targetLevel = 1; targetLevel < levels; targetLevel++) {
    const visited = new Uint8Array(n);

    for (let start = 0; start < n; start++) {
      if (indices[start] !== targetLevel || visited[start]) continue;

      // BFS to measure region size
      const region: number[] = [start];
      visited[start] = 1;
      let head = 0;

      while (head < region.length) {
        const cur = region[head++];
        const cx = cur % w;
        const cy = (cur - cx) / w;
        const neighbors = [
          cy > 0     ? cur - w : -1,
          cy < h - 1 ? cur + w : -1,
          cx > 0     ? cur - 1 : -1,
          cx < w - 1 ? cur + 1 : -1,
        ];
        for (const nb of neighbors) {
          if (nb >= 0 && indices[nb] === targetLevel && !visited[nb]) {
            visited[nb] = 1;
            region.push(nb);
          }
        }
      }

      if (region.length < minSize) {
        // Merge into background (0)
        for (const idx of region) {
          indices[idx] = 0;
        }
      }
    }
  }
}

/**
 * Detect and correct an inverted stencil.
 *
 * The Otsu-based threshold maps BRIGHT pixels → portrait (index > 0) and
 * DARK pixels → background (index 0). This works well when the subject is
 * lighter than the background. But for photos with a bright background
 * (white wall, outdoor sky) the background is classified as portrait and the
 * face ends up as background — the preview looks nearly all-dark.
 *
 * Three inversion signals:
 *   1. Border-based: image borders belong to background in ≥95% of portraits.
 *      If >55% of border pixels are portrait (index > 0) the result is inverted.
 *   2. Coverage-based: if <5% of all pixels are portrait, the threshold missed
 *      the subject entirely.
 *   3. Center-region: the center 40% of the image should contain the portrait.
 *      If center pixels are mostly background while borders are mostly portrait,
 *      the classification is inverted.
 *
 * Inversion: for N levels, level k becomes (N-1-k).
 *   2-level: 0↔1
 *   3-level: 0↔2, 1 stays
 *   4-level: 0↔3, 1↔2
 */
function autoCorrectInversion(
  indices: Uint8Array,
  w: number,
  h: number,
  levels: number,
): void {
  const n = w * h;
  const maxLevel = levels - 1;
  const borderRadius = 4; // cells from edge to consider "border"

  let borderPortrait = 0;
  let borderTotal = 0;
  let totalPortrait = 0;
  let centerPortrait = 0;
  let centerTotal = 0;

  // Center region bounds (middle 40%)
  const cx0 = Math.floor(w * 0.3);
  const cx1 = Math.ceil(w * 0.7);
  const cy0 = Math.floor(h * 0.3);
  const cy1 = Math.ceil(h * 0.7);

  for (let i = 0; i < n; i++) {
    const x = i % w;
    const y = Math.floor(i / w);
    const isBorder =
      x < borderRadius || x >= w - borderRadius ||
      y < borderRadius || y >= h - borderRadius;
    const isCenter = x >= cx0 && x < cx1 && y >= cy0 && y < cy1;

    if (isBorder) {
      borderTotal++;
      if (indices[i] > 0) borderPortrait++;
    }
    if (isCenter) {
      centerTotal++;
      if (indices[i] > 0) centerPortrait++;
    }
    if (indices[i] > 0) totalPortrait++;
  }

  const borderPortraitRatio = borderPortrait / Math.max(1, borderTotal);
  const totalPortraitRatio = totalPortrait / n;
  const centerPortraitRatio = centerPortrait / Math.max(1, centerTotal);

  // Signal 1: border mostly portrait (lowered from 0.65 to 0.55)
  // Signal 2: almost no portrait detected at all
  // Signal 3: center is mostly background while borders are mostly portrait
  const shouldInvert =
    borderPortraitRatio > 0.55 ||
    totalPortraitRatio < 0.02 ||
    (centerPortraitRatio < 0.3 && borderPortraitRatio > 0.4);

  if (!shouldInvert) return;

  for (let i = 0; i < n; i++) {
    indices[i] = maxLevel - indices[i];
  }
}

/**
 * Render the stencil indices to a canvas for preview display.
 * Background (0) = light gray, portrait levels (1+) = progressively lighter
 * to pure white.
 */
export function renderStencilPreview(
  indices: Uint8Array,
  cols: number,
  rows: number,
  levels: number,
): HTMLCanvasElement {
  const CELL_SIZE = 4; // Small cell for preview
  const canvas = document.createElement("canvas");
  canvas.width = cols * CELL_SIZE;
  canvas.height = rows * CELL_SIZE;
  const ctx = canvas.getContext("2d")!;

  const colorsToUse = getStencilRenderColors(Math.max(levels, 2));

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const level = Math.min(indices[y * cols + x], colorsToUse.length - 1);
      const color = colorsToUse[level];
      ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }

  return canvas;
}

// ─── Upload-based stencil conversion ─────────────────────────────────────────

/**
 * Convert an uploaded pre-made stencil image (PNG/SVG) into a StencilResult.
 *
 * The uploaded image is expected to be a black-and-white (or grayscale) stencil
 * where dark areas = background and light areas = portrait/reveal.
 * It is downscaled to the grid dimensions and thresholded into 2 levels.
 */
export async function convertUploadedStencil(
  dataUrl: string,
  kitSize: ProcessingKitSize,
): Promise<StencilResult> {
  const grid = PROCESSING_GRID_CONFIG[kitSize];
  const cols = grid.cols;
  const rows = grid.rows;

  const img = await loadImage(dataUrl);

  // Downscale to grid dimensions
  const imageData = progressiveDownscale(img, cols, rows);

  // Convert to grayscale
  const n = cols * rows;
  const indices = new Uint8Array(n);

  // Compute Otsu threshold on grayscale luminance
  const luminances = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const si = i * 4;
    luminances[i] = Math.round(0.299 * imageData.data[si] + 0.587 * imageData.data[si + 1] + 0.114 * imageData.data[si + 2]);
  }

  const hist = new Float64Array(256);
  for (let i = 0; i < n; i++) hist[luminances[i]]++;
  for (let i = 0; i < 256; i++) hist[i] /= n;

  let sumB = 0, wB = 0, total = 0;
  for (let i = 0; i < 256; i++) total += i * hist[i];
  let maxVar = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = 1 - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (total - sumB) / wF;
    const v = wB * wF * (mB - mF) ** 2;
    if (v > maxVar) { maxVar = v; threshold = t; }
  }

  // Binary classification: bright = portrait (1), dark = background (0)
  for (let i = 0; i < n; i++) {
    indices[i] = luminances[i] > threshold ? 1 : 0;
  }

  // Auto-correct inversion using border analysis
  autoCorrectInversion(indices, cols, rows, 2);

  // Clean tiny regions
  cleanSmallRegions(indices, cols, rows, 5, 2);

  // Render preview
  const canvas = renderStencilPreview(indices, cols, rows, 2);

  return {
    detailLevel: "medium",
    indices,
    gridCols: cols,
    gridRows: rows,
    canvas,
    dataUrl: canvas.toDataURL("image/png"),
    levels: 2,
    bridgeCount: 0,
  };
}
