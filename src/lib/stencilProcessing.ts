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
import { bilateralFilter, computeEdgeMap, progressiveDownscale, sigmoidContrast } from "./imageProcessing";
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
  bold:   { levels: 2, bilateralPasses: 3, minRegionSize: 12, sigmoidK: 10 },
  medium: { levels: 3, bilateralPasses: 2, minRegionSize: 6,  sigmoidK: 8  },
  fine:   { levels: 4, bilateralPasses: 1, minRegionSize: 3,  sigmoidK: 6  },
};

// Visual palette for rendering the stencil preview on canvas
// index 0 = dark background (painted/glittered area), 1+ = portrait levels (light → white)
const STENCIL_RENDER_COLORS = [
  { r: 70,  g: 60,  b: 55  }, // background — dark warm (painted/glittered area)
  { r: 255, g: 255, b: 255 }, // portrait level 1 — white (stencil)
  { r: 210, g: 205, b: 200 }, // portrait level 2 — very light warm gray
  { r: 160, g: 155, b: 150 }, // portrait level 3 — light-medium warm gray
];

// ─── Main entry point ────────────────────────────────────────────────────────

export async function processStencilImage(
  imageSrc: string,
  cropData: { x: number; y: number; width: number; height: number },
  kitSize: ProcessingKitSize,
  detailLevel: StencilDetailLevel,
): Promise<StencilResult> {
  const cfg = DETAIL_CONFIG[detailLevel];
  const grid = PROCESSING_GRID_CONFIG[kitSize];
  const cols = grid.cols;
  const rows = grid.rows;

  // 1. Load image
  const img = await loadImage(imageSrc);

  // 2. Apply crop and draw to an offscreen canvas
  const cropped = applyCrop(img, cropData);

  // 3. Progressive downscale to grid dimensions
  const imageData = progressiveDownscale(cropped, cols, rows);

  // 4. Grayscale conversion (luminance-weighted)
  const gray = toGrayscale(imageData);

  // 5. Sigmoid contrast enhancement to stretch tonal range
  sigmoidContrast(gray.data, gray.width, gray.height, cfg.sigmoidK);

  // 6. Bilateral filter for noise reduction while preserving edges
  for (let i = 0; i < cfg.bilateralPasses; i++) {
    bilateralFilter(gray.data, gray.width, gray.height, 2.5, 20, 2);
  }

  // 7. Edge map for contour-aware thresholding
  const edgeMap = computeEdgeMap(gray.data, cols, rows);

  // 8. Adaptive multi-level thresholding
  const indices = adaptiveThreshold(gray.data, cols, rows, edgeMap, cfg.levels);

  // 9. Stencil bridge analysis — connect floating background islands
  const { bridgeCount } = addStencilBridges(indices, cols, rows);

  // 10. Clean up physically impractical tiny regions
  cleanSmallRegions(indices, cols, rows, cfg.minRegionSize, cfg.levels);

  // 11. Auto-correct if the stencil looks inverted.
  // Otsu thresholding treats "bright = portrait", but for photos with bright
  // backgrounds (most indoor/studio shots) the background gets labelled as
  // portrait and the face ends up as background (all dark). Detect this by
  // checking border pixels: image borders almost always belong to the
  // background, so if the majority of border pixels are portrait (index > 0)
  // the classification is inverted. Also catch the degenerate "all background"
  // case where no portrait was detected at all.
  autoCorrectInversion(indices, cols, rows, cfg.levels);

  // 12. Render preview canvas
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
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const cropCanvas = document.createElement("canvas");
  const cropW = (crop.width / 100) * img.naturalWidth;
  const cropH = (crop.height / 100) * img.naturalHeight;
  const cropX = (crop.x / 100) * img.naturalWidth;
  const cropY = (crop.y / 100) * img.naturalHeight;
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const cropCtx = cropCanvas.getContext("2d")!;
  cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
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
 * Adaptive multi-level thresholding using Otsu's method extended to N levels.
 * Produces indices: 0=background (dark pixels), 1+=portrait levels (bright pixels).
 *
 * The convention is inverted from natural grayscale: bright areas → portrait (white
 * after stencil removal), dark areas → background (where glitter/paint goes).
 */
function adaptiveThreshold(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  edgeMap: Float32Array,
  levels: number,
): Uint8Array {
  const n = w * h;
  const indices = new Uint8Array(n);

  // Build histogram
  const hist = new Float64Array(256);
  for (let i = 0; i < n; i++) hist[data[i * 4]]++;
  for (let i = 0; i < 256; i++) hist[i] /= n;

  // Find thresholds using multi-level Otsu
  const thresholds = multiLevelOtsu(hist, levels);

  // Assign levels: 0=background(dark), levels-1=portrait(bright)
  for (let i = 0; i < n; i++) {
    const lum = data[i * 4];
    let level = 0;
    for (let t = 0; t < thresholds.length; t++) {
      if (lum > thresholds[t]) level = t + 1;
    }
    // Invert: bright → high index (portrait), dark → 0 (background)
    indices[i] = level;
  }

  // Edge refinement: snap edge pixels to binary (0 or max) for clean stencil cuts
  const maxLevel = levels - 1;
  for (let i = 0; i < n; i++) {
    if (edgeMap[i] > 0.35) {
      // On strong edges, snap to nearest extreme
      indices[i] = indices[i] >= Math.ceil(maxLevel / 2) ? maxLevel : 0;
    }
  }

  return indices;
}

/**
 * Multi-level Otsu thresholding.
 * Returns (levels - 1) threshold values that separate `levels` classes.
 */
function multiLevelOtsu(hist: Float64Array, levels: number): number[] {
  const numThresholds = levels - 1;

  if (numThresholds === 1) {
    // Classic single-threshold Otsu
    return [otsuSingleThreshold(hist)];
  }

  // For 2 thresholds (3 levels): exhaustive search over (t1, t2)
  if (numThresholds === 2) {
    let bestVar = -Infinity;
    let bestT1 = 85;
    let bestT2 = 170;

    const mu = computeMean(hist, 0, 255);

    for (let t1 = 1; t1 < 254; t1++) {
      for (let t2 = t1 + 1; t2 < 255; t2++) {
        const w0 = computeWeight(hist, 0, t1 - 1);
        const w1 = computeWeight(hist, t1, t2 - 1);
        const w2 = computeWeight(hist, t2, 255);
        if (w0 === 0 || w1 === 0 || w2 === 0) continue;

        const mu0 = computeMean(hist, 0, t1 - 1) / w0;
        const mu1 = computeMean(hist, t1, t2 - 1) / w1;
        const mu2 = computeMean(hist, t2, 255) / w2;

        const varBetween =
          w0 * (mu0 - mu) ** 2 +
          w1 * (mu1 - mu) ** 2 +
          w2 * (mu2 - mu) ** 2;

        if (varBetween > bestVar) {
          bestVar = varBetween;
          bestT1 = t1;
          bestT2 = t2;
        }
      }
    }
    return [bestT1, bestT2];
  }

  // For 3 thresholds (4 levels — "fine"): use evenly spaced quantiles as approximation
  // Full exhaustive search over 3 thresholds is O(256^3) = ~16M which may be slow on mobile
  // Using quantile approach as a fast approximation
  const cdf = new Float64Array(256);
  cdf[0] = hist[0];
  for (let i = 1; i < 256; i++) cdf[i] = cdf[i - 1] + hist[i];

  const thresholds: number[] = [];
  for (let k = 1; k <= numThresholds; k++) {
    const target = k / levels;
    for (let v = 0; v < 256; v++) {
      if (cdf[v] >= target) {
        thresholds.push(v);
        break;
      }
    }
  }
  return thresholds;
}

function otsuSingleThreshold(hist: Float64Array): number {
  let sumB = 0;
  let wB = 0;
  const total = computeMean(hist, 0, 255);
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

function computeWeight(hist: Float64Array, from: number, to: number): number {
  let w = 0;
  for (let i = from; i <= to; i++) w += hist[i];
  return w;
}

function computeMean(hist: Float64Array, from: number, to: number): number {
  let s = 0;
  for (let i = from; i <= to; i++) s += i * hist[i];
  return s;
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
 * Two inversion signals:
 *   1. Border-based: image borders belong to background in ≥95% of portraits.
 *      If >65% of border pixels are portrait (index > 0) the result is inverted.
 *   2. Coverage-based: if <5% of all pixels are portrait, the threshold missed
 *      the subject entirely.
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

  for (let i = 0; i < n; i++) {
    const x = i % w;
    const y = Math.floor(i / w);
    const isBorder =
      x < borderRadius || x >= w - borderRadius ||
      y < borderRadius || y >= h - borderRadius;

    if (isBorder) {
      borderTotal++;
      if (indices[i] > 0) borderPortrait++;
    }
    if (indices[i] > 0) totalPortrait++;
  }

  const borderPortraitRatio = borderPortrait / Math.max(1, borderTotal);
  const totalPortraitRatio = totalPortrait / n;

  const shouldInvert = borderPortraitRatio > 0.65 || totalPortraitRatio < 0.05;
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

  const colorsToUse = STENCIL_RENDER_COLORS.slice(0, Math.max(levels, 2));

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
