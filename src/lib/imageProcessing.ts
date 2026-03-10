import { PaletteColor, StylePalette, resolvePaletteForProcessing } from "./palettes";
import { DEFAULT_PUBLIC_KIT, PROCESSING_GRID_CONFIG, resolveProcessingKitSize } from "./kitCatalog";
import type { ProcessingKitSize as KitSize } from "./kitCatalog";
import type { ArtStyle } from "./store";
import { PUBLIC_STYLE_ORDER } from "./styles";
import { getStyleProcessingProfile } from "./styleProfiles";

export type { ProcessingKitSize as KitSize } from "./kitCatalog";

export const GRID_CONFIG: Record<KitSize, { cols: number; rows: number }> = PROCESSING_GRID_CONFIG;

function deltaE(
  L1: number,
  a1: number,
  b1: number,
  L2: number,
  a2: number,
  b2: number,
): number {
  const dL = L1 - L2;
  const da = a1 - a2;
  const db = b1 - b2;
  return Math.sqrt(dL * dL + da * da + db * db);
}

function srgbToLinear(c: number): number {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const x = (0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) * 100;
  const y = (0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb) * 100;
  const z = (0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb) * 100;
  const xn = 95.047;
  const yn = 100.0;
  const zn = 108.883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x / xn);
  const fy = f(y / yn);
  const fz = f(z / zn);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function findNearestColor(r: number, g: number, b: number, palette: PaletteColor[]): number {
  const [L, a, bVal] = rgbToLab(
    Math.max(0, Math.min(255, r)),
    Math.max(0, Math.min(255, g)),
    Math.max(0, Math.min(255, b)),
  );
  let minDist = Infinity;
  let nearestIdx = 0;

  for (let i = 0; i < palette.length; i++) {
    const color = palette[i];
    const dist = deltaE(L, a, bVal, color.L, color.a, color.bLab);
    if (dist < minDist) {
      minDist = dist;
      nearestIdx = i;
    }
  }

  return nearestIdx;
}

export function sigmoidContrast(data: Uint8ClampedArray, width: number, height: number, sigmoidK = 8): void {
  const total = width * height;
  const luminances = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    luminances[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  const sorted = Float32Array.from(luminances).sort();
  const pLow = sorted[Math.floor(sorted.length * 0.03)];
  const pHigh = sorted[Math.floor(sorted.length * 0.97)];
  const range = pHigh - pLow || 1;

  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let value = (i - pLow) / range;
    value = Math.max(0, Math.min(1, value));
    value = 1 / (1 + Math.exp(-sigmoidK * (value - 0.5)));
    const sigMin = 1 / (1 + Math.exp(-sigmoidK * -0.5));
    const sigMax = 1 / (1 + Math.exp(-sigmoidK * 0.5));
    value = (value - sigMin) / (sigMax - sigMin);
    lut[i] = Math.max(0, Math.min(255, Math.round(value * 255)));
  }

  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    data[idx] = lut[data[idx]];
    data[idx + 1] = lut[data[idx + 1]];
    data[idx + 2] = lut[data[idx + 2]];
  }
}

function localContrastBoost(data: Uint8ClampedArray, width: number, height: number, strength = 0.5): void {
  if (strength <= 0) return;

  const copy = new Uint8ClampedArray(data);
  const blockSize = 5;
  const halfBlock = Math.floor(blockSize / 2);

  for (let y = halfBlock; y < height - halfBlock; y++) {
    for (let x = halfBlock; x < width - halfBlock; x++) {
      let sumLum = 0;
      let count = 0;

      for (let dy = -halfBlock; dy <= halfBlock; dy++) {
        for (let dx = -halfBlock; dx <= halfBlock; dx++) {
          const ni = ((y + dy) * width + (x + dx)) * 4;
          sumLum += 0.299 * copy[ni] + 0.587 * copy[ni + 1] + 0.114 * copy[ni + 2];
          count++;
        }
      }

      const localMean = sumLum / count;
      const idx = (y * width + x) * 4;
      const pixelLum = 0.299 * copy[idx] + 0.587 * copy[idx + 1] + 0.114 * copy[idx + 2];
      const diff = pixelLum - localMean;

      for (let ch = 0; ch < 3; ch++) {
        const enhanced = copy[idx + ch] + strength * diff;
        data[idx + ch] = Math.max(0, Math.min(255, Math.round(enhanced)));
      }
    }
  }
}

function laplacianSharpen(data: Uint8ClampedArray, width: number, height: number, amount = 0.6): void {
  const copy = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let ch = 0; ch < 3; ch++) {
        const center = copy[(y * width + x) * 4 + ch];
        const top = copy[((y - 1) * width + x) * 4 + ch];
        const bottom = copy[((y + 1) * width + x) * 4 + ch];
        const left = copy[(y * width + (x - 1)) * 4 + ch];
        const right = copy[(y * width + (x + 1)) * 4 + ch];

        const laplacian = 4 * center - top - bottom - left - right;
        const sharpened = center + amount * laplacian;
        data[(y * width + x) * 4 + ch] = Math.max(0, Math.min(255, Math.round(sharpened)));
      }
    }
  }
}

export function bilateralFilter(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  spatialSigma = 3.0,
  colorSigma = 25,
  radius = 3,
): void {
  const copy = new Uint8ClampedArray(data);
  const spatialCoeff = -1 / (2 * spatialSigma * spatialSigma);
  const colorCoeff = -1 / (2 * colorSigma * colorSigma);

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const cidx = (y * width + x) * 4;
      const cr = copy[cidx];
      const cg = copy[cidx + 1];
      const cb = copy[cidx + 2];

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumW = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nidx = ((y + dy) * width + (x + dx)) * 4;
          const nr = copy[nidx];
          const ng = copy[nidx + 1];
          const nb = copy[nidx + 2];

          const spatialDist = dx * dx + dy * dy;
          const colorDist = (nr - cr) ** 2 + (ng - cg) ** 2 + (nb - cb) ** 2;
          const weight = Math.exp(spatialCoeff * spatialDist + colorCoeff * colorDist);

          sumR += nr * weight;
          sumG += ng * weight;
          sumB += nb * weight;
          sumW += weight;
        }
      }

      data[cidx] = Math.round(sumR / sumW);
      data[cidx + 1] = Math.round(sumG / sumW);
      data[cidx + 2] = Math.round(sumB / sumW);
    }
  }
}

export function computeEdgeMap(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const edges = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const getLum = (px: number, py: number) => {
        const i = (py * width + px) * 4;
        return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      };

      const gx =
        -getLum(x - 1, y - 1) + getLum(x + 1, y - 1) +
        -2 * getLum(x - 1, y) + 2 * getLum(x + 1, y) +
        -getLum(x - 1, y + 1) + getLum(x + 1, y + 1);
      const gy =
        -getLum(x - 1, y - 1) - 2 * getLum(x, y - 1) - getLum(x + 1, y - 1) +
        getLum(x - 1, y + 1) + 2 * getLum(x, y + 1) + getLum(x + 1, y + 1);

      edges[y * width + x] = Math.sqrt(gx * gx + gy * gy) / 255;
    }
  }

  return edges;
}

function directQuantize(imageData: ImageData, palette: PaletteColor[]): Uint8Array {
  const w = imageData.width;
  const h = imageData.height;
  const indices = new Uint8Array(w * h);

  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    indices[i] = findNearestColor(
      imageData.data[idx],
      imageData.data[idx + 1],
      imageData.data[idx + 2],
      palette,
    );
  }

  return indices;
}

function edgeContourCleanup(
  indices: Uint8Array,
  w: number,
  h: number,
  edgeMap: Float32Array,
  paletteSize: number,
): void {
  const copy = Uint8Array.from(indices);
  const counts = new Uint8Array(paletteSize);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const edge = edgeMap[y * w + x];
      if (edge < 0.15 || edge > 0.8) continue;

      const center = copy[y * w + x];
      const left = copy[y * w + (x - 1)];
      const right = copy[y * w + (x + 1)];
      const top = copy[(y - 1) * w + x];
      const bottom = copy[(y + 1) * w + x];

      const horizontalMatch = center === left || center === right;
      const verticalMatch = center === top || center === bottom;

      if (!horizontalMatch && !verticalMatch) {
        counts.fill(0);
        counts[left]++;
        counts[right]++;
        counts[top]++;
        counts[bottom]++;

        let maxCount = 0;
        let modeColor = center;
        for (let i = 0; i < paletteSize; i++) {
          if (counts[i] > maxCount) {
            maxCount = counts[i];
            modeColor = i;
          }
        }
        indices[y * w + x] = modeColor;
      }
    }
  }
}

function adaptiveDenoise(
  indices: Uint8Array,
  w: number,
  h: number,
  edgeMap: Float32Array,
  paletteSize: number,
  passConfig: { small: number; medium: number; large: number } = { small: 3, medium: 2, large: 0 },
): void {
  const counts = new Uint8Array(paletteSize);

  for (let pass = 0; pass < passConfig.small; pass++) {
    const copy = Uint8Array.from(indices);

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (edgeMap[y * w + x] > 0.3) continue;

        const centerColor = copy[y * w + x];
        counts.fill(0);

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            counts[copy[(y + dy) * w + (x + dx)]]++;
          }
        }

        if (counts[centerColor] <= 3) {
          let maxCount = 0;
          let modeColor = centerColor;
          for (let i = 0; i < paletteSize; i++) {
            if (counts[i] > maxCount) {
              maxCount = counts[i];
              modeColor = i;
            }
          }
          indices[y * w + x] = modeColor;
        }
      }
    }
  }

  for (let pass = 0; pass < passConfig.medium; pass++) {
    const copy = Uint8Array.from(indices);
    const counts5 = new Uint8Array(paletteSize);

    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        if (edgeMap[y * w + x] > 0.15) continue;

        counts5.fill(0);
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            counts5[copy[(y + dy) * w + (x + dx)]]++;
          }
        }

        const centerColor = copy[y * w + x];
        if (counts5[centerColor] < 10) {
          let maxCount = 0;
          let modeColor = centerColor;
          for (let i = 0; i < paletteSize; i++) {
            if (counts5[i] > maxCount) {
              maxCount = counts5[i];
              modeColor = i;
            }
          }
          indices[y * w + x] = modeColor;
        }
      }
    }
  }

  if (passConfig.large > 0) {
    const copy = Uint8Array.from(indices);
    const counts7 = new Uint8Array(paletteSize);

    for (let y = 3; y < h - 3; y++) {
      for (let x = 3; x < w - 3; x++) {
        if (edgeMap[y * w + x] > 0.08) continue;

        counts7.fill(0);
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            counts7[copy[(y + dy) * w + (x + dx)]]++;
          }
        }

        const centerColor = copy[y * w + x];
        if (counts7[centerColor] < 20) {
          let maxCount = 0;
          let modeColor = centerColor;
          for (let i = 0; i < paletteSize; i++) {
            if (counts7[i] > maxCount) {
              maxCount = counts7[i];
              modeColor = i;
            }
          }
          indices[y * w + x] = modeColor;
        }
      }
    }
  }
}

export function progressiveDownscale(img: HTMLImageElement | HTMLCanvasElement, cols: number, rows: number): ImageData {
  const srcW = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const srcH = img instanceof HTMLImageElement ? img.naturalHeight : img.height;

  let currentCanvas = document.createElement("canvas");
  currentCanvas.width = srcW;
  currentCanvas.height = srcH;
  const initCtx = currentCanvas.getContext("2d")!;
  initCtx.drawImage(img, 0, 0);

  let curW = srcW;
  let curH = srcH;

  while (curW > cols * 2 || curH > rows * 2) {
    const nextW = Math.max(cols, Math.ceil(curW / 2));
    const nextH = Math.max(rows, Math.ceil(curH / 2));
    const next = document.createElement("canvas");
    next.width = nextW;
    next.height = nextH;
    const nCtx = next.getContext("2d")!;
    nCtx.imageSmoothingEnabled = true;
    nCtx.imageSmoothingQuality = "high";
    nCtx.drawImage(currentCanvas, 0, 0, nextW, nextH);
    currentCanvas = next;
    curW = nextW;
    curH = nextH;
  }

  const final = document.createElement("canvas");
  final.width = cols;
  final.height = rows;
  const fCtx = final.getContext("2d")!;
  fCtx.imageSmoothingEnabled = true;
  fCtx.imageSmoothingQuality = "high";
  fCtx.drawImage(currentCanvas, 0, 0, cols, rows);
  return fCtx.getImageData(0, 0, cols, rows);
}

function areaAverageDownscale(src: ImageData, dstW: number, dstH: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext("2d")!;
  const dst = ctx.createImageData(dstW, dstH);
  const srcData = src.data;
  const dstData = dst.data;

  const scaleX = Math.round(src.width / dstW);
  const scaleY = Math.round(src.height / dstH);
  const blockSize = scaleX * scaleY;

  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const sx = x * scaleX;
      const sy = y * scaleY;
      let r = 0;
      let g = 0;
      let b = 0;

      for (let dy = 0; dy < scaleY; dy++) {
        for (let dx = 0; dx < scaleX; dx++) {
          const si = ((sy + dy) * src.width + (sx + dx)) * 4;
          r += srcData[si];
          g += srcData[si + 1];
          b += srcData[si + 2];
        }
      }

      const di = (y * dstW + x) * 4;
      dstData[di] = (r / blockSize) | 0;
      dstData[di + 1] = (g / blockSize) | 0;
      dstData[di + 2] = (b / blockSize) | 0;
      dstData[di + 3] = 255;
    }
  }

  return dst;
}

export function renderPixelGrid(
  indices: Uint8Array,
  palette: PaletteColor[],
  cols: number,
  rows: number,
  cellSize: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;
  const ctx = canvas.getContext("2d")!;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const color = palette[indices[y * cols + x]];
      ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  return canvas;
}

export function renderSmoothPreview(
  indices: Uint8Array,
  palette: PaletteColor[],
  cols: number,
  rows: number,
  cellSize: number,
): HTMLCanvasElement {
  const w = cols * cellSize;
  const h = rows * cellSize;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  const half = cellSize / 2;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const cx = (px - half) / cellSize;
      const cy = (py - half) / cellSize;

      const x0 = Math.max(0, Math.min(cols - 1, Math.floor(cx)));
      const y0 = Math.max(0, Math.min(rows - 1, Math.floor(cy)));
      const x1 = Math.min(cols - 1, x0 + 1);
      const y1 = Math.min(rows - 1, y0 + 1);

      const fx = Math.max(0, Math.min(1, cx - x0));
      const fy = Math.max(0, Math.min(1, cy - y0));

      const c00 = palette[indices[y0 * cols + x0]];
      const c10 = palette[indices[y0 * cols + x1]];
      const c01 = palette[indices[y1 * cols + x0]];
      const c11 = palette[indices[y1 * cols + x1]];

      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const i = (py * w + px) * 4;
      data[i] = Math.round(c00.r * w00 + c10.r * w10 + c01.r * w01 + c11.r * w11);
      data[i + 1] = Math.round(c00.g * w00 + c10.g * w10 + c01.g * w01 + c11.g * w11);
      data[i + 2] = Math.round(c00.b * w00 + c10.b * w10 + c01.b * w01 + c11.b * w11);
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const blurred = document.createElement("canvas");
  blurred.width = w;
  blurred.height = h;
  const bCtx = blurred.getContext("2d")!;
  bCtx.filter = "blur(1.5px)";
  bCtx.drawImage(canvas, 0, 0);
  bCtx.filter = "none";
  bCtx.globalAlpha = 0.35;
  bCtx.drawImage(canvas, 0, 0);
  bCtx.globalAlpha = 1.0;

  return blurred;
}

export function countUsedColors(indices: Uint8Array) {
  return new Set(indices).size;
}

export function mergeSmallRegions(
  indices: Uint8Array,
  w: number,
  h: number,
  edgeMap: Float32Array,
  minArea: number,
  maxAverageEdge: number,
): void {
  if (minArea <= 1) return;

  const visited = new Uint8Array(w * h);
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const start = y * w + x;
      if (visited[start]) continue;

      const regionColor = indices[start];
      const queue = [start];
      const region: number[] = [];
      const borderCounts = new Map<number, number>();
      let edgeTotal = 0;
      visited[start] = 1;

      while (queue.length > 0) {
        const current = queue.pop()!;
        region.push(current);
        edgeTotal += edgeMap[current] || 0;

        const cy = Math.floor(current / w);
        const cx = current % w;

        for (const [dx, dy] of directions) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;

          const next = ny * w + nx;
          const nextColor = indices[next];
          if (nextColor === regionColor) {
            if (!visited[next]) {
              visited[next] = 1;
              queue.push(next);
            }
          } else {
            borderCounts.set(nextColor, (borderCounts.get(nextColor) || 0) + 1);
          }
        }
      }

      const avgEdge = edgeTotal / Math.max(region.length, 1);
      const shouldMerge = region.length === 1 || (region.length <= minArea && avgEdge <= maxAverageEdge);
      if (!shouldMerge || borderCounts.size === 0) continue;

      let replacementColor = regionColor;
      let maxBorderCount = -1;
      for (const [candidateColor, borderCount] of borderCounts.entries()) {
        if (borderCount > maxBorderCount) {
          maxBorderCount = borderCount;
          replacementColor = candidateColor;
        }
      }

      if (replacementColor === regionColor) continue;
      for (const idx of region) {
        indices[idx] = replacementColor;
      }
    }
  }
}

export interface ProcessingResult {
  styleKey: ArtStyle;
  palette: StylePalette;
  styleProfileKey: ArtStyle;
  styleProfileVersion: number;
  canvas: HTMLCanvasElement;
  dataUrl: string;
  indices: Uint8Array;
  gridCols: number;
  gridRows: number;
}

export async function processImage(
  imageSrc: string,
  cropData: { x: number; y: number; width: number; height: number },
  kitSize: KitSize = resolveProcessingKitSize(DEFAULT_PUBLIC_KIT),
): Promise<ProcessingResult[]> {
  const { cols, rows } = GRID_CONFIG[kitSize];

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = cropData.width;
        cropCanvas.height = cropData.height;
        const cropCtx = cropCanvas.getContext("2d")!;
        cropCtx.drawImage(
          img,
          cropData.x,
          cropData.y,
          cropData.width,
          cropData.height,
          0,
          0,
          cropData.width,
          cropData.height,
        );

        const results: ProcessingResult[] = [];
        const cellSize = 16;

        for (const styleKey of PUBLIC_STYLE_ORDER) {
          const profile = getStyleProcessingProfile(styleKey);
          const palette = resolvePaletteForProcessing(styleKey, kitSize);
          const hiRes = progressiveDownscale(cropCanvas, cols * profile.hiResMult, rows * profile.hiResMult);
          const hiW = cols * profile.hiResMult;
          const hiH = rows * profile.hiResMult;

          sigmoidContrast(hiRes.data, hiW, hiH, profile.sigmoidK);
          localContrastBoost(hiRes.data, hiW, hiH, profile.localContrastStrength);

          for (let pass = 0; pass < profile.filterPasses; pass++) {
            bilateralFilter(
              hiRes.data,
              hiW,
              hiH,
              profile.bilateralSpatialSigma,
              profile.bilateralColorSigma,
              profile.bilateralRadius,
            );
          }

          laplacianSharpen(hiRes.data, hiW, hiH, profile.sharpenAmount);

          const downscaled = areaAverageDownscale(hiRes, cols, rows);
          const edgeMap = computeEdgeMap(downscaled.data, cols, rows);
          const indices = directQuantize(downscaled, palette.colors);

          edgeContourCleanup(indices, cols, rows, edgeMap, palette.colors.length);
          adaptiveDenoise(indices, cols, rows, edgeMap, palette.colors.length, profile.denoiseConfig);
          mergeSmallRegions(
            indices,
            cols,
            rows,
            edgeMap,
            profile.smallRegionMerge.minArea,
            profile.smallRegionMerge.maxAverageEdge,
          );

          const canvas = renderPixelGrid(indices, palette.colors, cols, rows, cellSize);

          results.push({
            styleKey,
            palette,
            styleProfileKey: styleKey,
            styleProfileVersion: profile.version,
            canvas,
            dataUrl: canvas.toDataURL("image/png"),
            indices,
            gridCols: cols,
            gridRows: rows,
          });
        }

        resolve(results);
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}
