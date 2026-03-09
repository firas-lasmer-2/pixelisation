import type { PaletteColor } from "./palettes";
import type { KitSize } from "./store";

export const DEDICATION_MAX_LENGTH = 22;

const OVERLAY_MARGIN_CELLS = 4;
const MASK_SCALE = 12;

const BOX_SPECS: Record<KitSize, { width: number; height: number }> = {
  stamp_kit_40x50: { width: 48, height: 14 },
  stamp_kit_30x40: { width: 40, height: 12 },
  stamp_kit_40x60: { width: 52, height: 14 },
  stamp_kit_A4: { width: 32, height: 10 },
  stamp_kit_A3: { width: 40, height: 12 },
  stamp_kit_A2: { width: 52, height: 14 },
};

export interface PaintingDedication {
  text: string;
  placement: "bottom_right_overlay";
  style: "signature_plaque_v1";
  lines: string[];
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  paletteIndexes: {
    fill: number;
    text: number;
    border: number;
  };
}

function stripEmoji(value: string) {
  return value.replace(/\p{Extended_Pictographic}/gu, "");
}

export function normalizeDedicationDraft(value: string) {
  return stripEmoji(value.normalize("NFKC"))
    .replace(/[\r\n]+/g, " ")
    .slice(0, DEDICATION_MAX_LENGTH);
}

export function sanitizeDedicationText(value: string | null | undefined) {
  if (!value) return "";

  return normalizeDedicationDraft(value)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, DEDICATION_MAX_LENGTH);
}

function hexToRgb(hex: string) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ] as const;
}

function colorLuminance(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function choosePaletteIndexes(palette: PaletteColor[]) {
  const sorted = palette
    .map((color, index) => ({ index, luminance: colorLuminance(color.hex) }))
    .sort((a, b) => a.luminance - b.luminance);

  const darkest = sorted[0]?.index ?? 0;
  const secondDarkest = sorted[1]?.index ?? darkest;
  const lightest = sorted[sorted.length - 1]?.index ?? darkest;
  const secondLightest = sorted[sorted.length - 2]?.index ?? lightest;
  const defaultContrast = Math.abs(
    colorLuminance(palette[lightest]?.hex || "#ffffff") -
      colorLuminance(palette[darkest]?.hex || "#000000"),
  );

  if (defaultContrast < 110) {
    return {
      fill: darkest,
      text: lightest,
      border: secondLightest,
    };
  }

  return {
    fill: lightest,
    text: darkest,
    border: secondDarkest,
  };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function truncateToWidth(ctx: CanvasRenderingContext2D, value: string, maxWidth: number) {
  const ellipsis = "...";
  if (ctx.measureText(value).width <= maxWidth) return value;

  let trimmed = value;
  while (trimmed.length > 0 && ctx.measureText(`${trimmed}${ellipsis}`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }

  return `${trimmed.trimEnd()}${ellipsis}`;
}

function wrapText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, maxLines: number) {
  const words = value.split(" ").filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (!currentLine || ctx.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const preserved = lines.slice(0, maxLines - 1);
  const overflow = lines.slice(maxLines - 1).join(" ");
  preserved.push(truncateToWidth(ctx, overflow, maxWidth));
  return preserved;
}

function buildTextLayout(
  ctx: CanvasRenderingContext2D,
  text: string,
  canvasWidth: number,
  canvasHeight: number,
) {
  const maxWidth = canvasWidth - MASK_SCALE * 5;
  const minFontSize = Math.max(14, Math.floor(canvasHeight * 0.18));
  let fontSize = Math.max(minFontSize, Math.floor(canvasHeight * 0.34));
  let lines = [text];

  while (fontSize >= minFontSize) {
    ctx.font = `italic 700 ${fontSize}px Georgia, "Times New Roman", serif`;
    lines = wrapText(ctx, text, maxWidth, 2);

    if (
      lines.length <= 2 &&
      lines.every((line) => ctx.measureText(line).width <= maxWidth)
    ) {
      return { fontSize, lines };
    }

    fontSize -= 2;
  }

  ctx.font = `italic 700 ${minFontSize}px Georgia, "Times New Roman", serif`;
  return {
    fontSize: minFontSize,
    lines: wrapText(ctx, text, maxWidth, 2),
  };
}

function renderOverlayMask(width: number, height: number, text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = width * MASK_SCALE;
  canvas.height = height * MASK_SCALE;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is required to render the dedication overlay");
  }

  const pad = MASK_SCALE;
  drawRoundedRect(
    ctx,
    pad,
    pad,
    canvas.width - pad * 2,
    canvas.height - pad * 2,
    Math.max(MASK_SCALE * 1.6, canvas.height * 0.16),
  );
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.lineWidth = Math.max(2, MASK_SCALE * 0.85);
  ctx.strokeStyle = "#888888";
  ctx.stroke();

  const { fontSize, lines } = buildTextLayout(ctx, text, canvas.width, canvas.height);
  ctx.font = `italic 700 ${fontSize}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lineHeight = fontSize * 0.95;
  const totalHeight = lines.length * lineHeight;
  const startY = canvas.height / 2 - totalHeight / 2 + lineHeight / 2 + MASK_SCALE * 0.2;

  lines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, startY + index * lineHeight);
  });

  return { canvas, lines };
}

export function applyDedicationOverlay(params: {
  indices: Uint8Array;
  gridCols: number;
  gridRows: number;
  palette: PaletteColor[];
  kitSize: KitSize;
  dedicationText: string | null | undefined;
}) {
  const text = sanitizeDedicationText(params.dedicationText);
  if (!text) {
    return {
      indices: new Uint8Array(params.indices),
      dedication: null as PaintingDedication | null,
    };
  }

  const boxSpec = BOX_SPECS[params.kitSize];
  const boxWidth = Math.min(boxSpec.width, Math.max(10, params.gridCols - OVERLAY_MARGIN_CELLS * 2));
  const boxHeight = Math.min(boxSpec.height, Math.max(6, params.gridRows - OVERLAY_MARGIN_CELLS * 2));
  const boxX = Math.max(OVERLAY_MARGIN_CELLS, params.gridCols - boxWidth - OVERLAY_MARGIN_CELLS);
  const boxY = Math.max(OVERLAY_MARGIN_CELLS, params.gridRows - boxHeight - OVERLAY_MARGIN_CELLS);
  const paletteIndexes = choosePaletteIndexes(params.palette);
  const nextIndices = new Uint8Array(params.indices);
  const { canvas, lines } = renderOverlayMask(boxWidth, boxHeight, text);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return {
      indices: nextIndices,
      dedication: null as PaintingDedication | null,
    };
  }

  const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  for (let y = 0; y < boxHeight; y++) {
    for (let x = 0; x < boxWidth; x++) {
      let fillCoverage = 0;
      let borderCoverage = 0;
      let textCoverage = 0;
      let visibleCoverage = 0;

      for (let py = 0; py < MASK_SCALE; py++) {
        for (let px = 0; px < MASK_SCALE; px++) {
          const offset =
            ((y * MASK_SCALE + py) * canvas.width + (x * MASK_SCALE + px)) * 4;
          const alpha = maskData[offset + 3];

          if (alpha < 10) continue;

          visibleCoverage++;

          const red = maskData[offset];
          const green = maskData[offset + 1];
          const blue = maskData[offset + 2];

          if (red < 48 && green < 48 && blue < 48) {
            textCoverage++;
          } else if (red > 220 && green > 220 && blue > 220) {
            fillCoverage++;
          } else {
            borderCoverage++;
          }
        }
      }

      if (visibleCoverage === 0) continue;

      const gridIndex = (boxY + y) * params.gridCols + (boxX + x);
      if (textCoverage / visibleCoverage > 0.12) {
        nextIndices[gridIndex] = paletteIndexes.text;
      } else if (borderCoverage / visibleCoverage > 0.18) {
        nextIndices[gridIndex] = paletteIndexes.border;
      } else if ((fillCoverage + borderCoverage) / visibleCoverage > 0.08) {
        nextIndices[gridIndex] = paletteIndexes.fill;
      }
    }
  }

  return {
    indices: nextIndices,
    dedication: {
      text,
      placement: "bottom_right_overlay",
      style: "signature_plaque_v1",
      lines,
      box: {
        x: boxX,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
      },
      paletteIndexes,
    } satisfies PaintingDedication,
  };
}
