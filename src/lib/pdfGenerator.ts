import jsPDF from "jspdf";
import QRCode from "qrcode";
import { PaletteColor, StylePalette, COLOR_LETTERS } from "./palettes";
import { renderSmoothPreview } from "./imageProcessing";
import { BRAND as BRAND_CONFIG } from "./brand";
import { getPaintingStats, PAGE_GRID_COLS, PAGE_GRID_ROWS, SECTION_COLS, SECTION_ROWS, SECTIONS_PER_PAGE } from "./paintingLayout";
import { type PaintingManifest, resolveManifestPalette } from "./paintingManifest";

// ─── Brand Colors ───────────────────────────────────────────────────────
const BRAND = {
  gold: [184, 134, 11] as [number, number, number],
  goldLight: [230, 207, 155] as [number, number, number],
  goldPale: [250, 244, 230] as [number, number, number],
  burgundy: [114, 47, 55] as [number, number, number],
  burgundyLight: [180, 110, 118] as [number, number, number],
  cream: [250, 247, 242] as [number, number, number],
  charcoal: [35, 35, 35] as [number, number, number],
  warmGray: [120, 110, 100] as [number, number, number],
  lightGray: [240, 237, 232] as [number, number, number],
};

interface PdfOptions {
  indices: Uint8Array;
  gridCols: number;
  gridRows: number;
  palette: StylePalette;
  canvasSize: string;
  brandName?: string;
  orderRef?: string;
  instructionCode?: string;
  dedicationText?: string | null;
  referenceImageUrl?: string | null;
  sourceImageUrl?: string | null;
  viewerUrl?: string | null;
  estimatedHours?: string;
  difficultyLabel?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function countColors(indices: Uint8Array, paletteSize: number): number[] {
  const counts = new Array(paletteSize).fill(0);
  for (let i = 0; i < indices.length; i++) counts[indices[i]]++;
  return counts;
}

function tintColor(r: number, g: number, b: number, factor: number): [number, number, number] {
  return [
    Math.round(r + (255 - r) * factor),
    Math.round(g + (255 - g) * factor),
    Math.round(b + (255 - b) * factor),
  ];
}

function drawColorSwatch(doc: jsPDF, cx: number, cy: number, size: number, hex: string, rounded = true) {
  const [r, g, b] = hexToRgb(hex);
  doc.setFillColor(r, g, b);
  if (rounded) {
    doc.roundedRect(cx - size / 2, cy - size / 2, size, size, size * 0.2, size * 0.2, "F");
  } else {
    doc.circle(cx, cy, size / 2, "F");
  }
  doc.setDrawColor(...tintColor(r, g, b, -0.2));
  doc.setLineWidth(0.25);
  if (rounded) {
    doc.roundedRect(cx - size / 2, cy - size / 2, size, size, size * 0.2, size * 0.2, "S");
  } else {
    doc.circle(cx, cy, size / 2, "S");
  }
}

function drawGoldAccentLine(doc: jsPDF, x1: number, y: number, x2: number) {
  doc.setDrawColor(...BRAND.gold);
  doc.setLineWidth(0.6);
  doc.line(x1, y, x2, y);
}

function drawGoldDotDivider(doc: jsPDF, cx: number, y: number, _width: number) {
  const dots = 3;
  const spacing = 4;
  const startX = cx - ((dots - 1) * spacing) / 2;
  doc.setFillColor(...BRAND.gold);
  for (let i = 0; i < dots; i++) {
    doc.circle(startX + i * spacing, y, 0.6, "F");
  }
}

function tryAddImage(doc: jsPDF, imageUrl: string | null | undefined, format: "PNG" | "JPEG", x: number, y: number, w: number, h: number) {
  if (!imageUrl || typeof imageUrl !== "string") return false;
  if (!imageUrl.startsWith("data:image/")) return false;

  try {
    doc.addImage(imageUrl, format, x, y, w, h);
    return true;
  } catch {
    return false;
  }
}

// ─── Page Header (branded) ──────────────────────────────────────────────
function renderPageHeader(doc: jsPDF, brand: string, rightText: string) {
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(...BRAND.gold);
  doc.rect(0, 0, pageW, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.charcoal);
  doc.text(brand, 14, 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.warmGray);
  doc.text(rightText, pageW - 14, 10, { align: "right" });

  doc.setDrawColor(...BRAND.goldLight);
  doc.setLineWidth(0.4);
  doc.line(14, 13, pageW - 14, 13);
}

// ─── Page Footer (branded) ──────────────────────────────────────────────
function renderPageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  doc.setFillColor(...BRAND.gold);
  doc.rect(0, pageH - 2, pageW, 2, "F");

  doc.setDrawColor(...BRAND.goldLight);
  doc.setLineWidth(0.2);
  doc.line(14, pageH - 10, pageW - 14, pageH - 10);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.warmGray);
  doc.text(BRAND_CONFIG.domain, 14, pageH - 6);
  doc.setTextColor(...BRAND.gold);
  doc.text(`${pageNum} / ${totalPages}`, pageW / 2, pageH - 6, { align: "center" });
  doc.setTextColor(...BRAND.warmGray);
  doc.text("Paint by Numbers Kit", pageW - 14, pageH - 6, { align: "right" });
}

// ─── Decorative Cover Border ────────────────────────────────────────────
function drawPremiumBorder(doc: jsPDF, margin: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = margin;

  doc.setDrawColor(...BRAND.gold);
  doc.setLineWidth(1.2);
  doc.rect(m, m, pageW - 2 * m, pageH - 2 * m, "S");

  doc.setDrawColor(...BRAND.goldLight);
  doc.setLineWidth(0.3);
  doc.rect(m + 3, m + 3, pageW - 2 * m - 6, pageH - 2 * m - 6, "S");

  const corners = [
    [m, m], [pageW - m, m],
    [m, pageH - m], [pageW - m, pageH - m],
  ];
  corners.forEach(([cx, cy]) => {
    doc.setFillColor(...BRAND.gold);
    const s = 2.5;
    doc.triangle(cx, cy - s, cx + s, cy, cx - s, cy, "F");
    doc.triangle(cx + s, cy, cx, cy + s, cx - s, cy, "F");
  });
}

// ─── Page 1: Premium Cover ─────────────────────────────────────────────
function renderCoverPage(doc: jsPDF, options: PdfOptions, colorCounts: number[], totalPages: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const { palette, canvasSize, brandName = BRAND_CONFIG.pdfName } = options;

  doc.setFillColor(...BRAND.cream);
  doc.rect(0, 0, pageW, pageH, "F");

  drawPremiumBorder(doc, 8);

  doc.setFillColor(...BRAND.gold);
  doc.rect(12, 12, pageW - 24, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(...BRAND.charcoal);
  doc.text(brandName, pageW / 2, 28, { align: "center" });

  drawGoldAccentLine(doc, pageW / 2 - 25, 31, pageW / 2 + 25);
  drawGoldDotDivider(doc, pageW / 2, 34, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.burgundy);
  doc.text(`INSTRUCTIONS — Kit ${canvasSize}`, pageW / 2, 40, { align: "center" });
  if (options.orderRef) {
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.warmGray);
    doc.text(`Order ${options.orderRef} • Code ${options.instructionCode || "—"}`, pageW / 2, 45, { align: "center" });
  }

  // Preview image
  const imgAspect = options.gridCols / options.gridRows;
  const imgMaxW = pageW - 55;
  const imgMaxH = pageH - 172;
  let imgW = imgMaxW;
  let imgH = imgW / imgAspect;
  if (imgH > imgMaxH) { imgH = imgMaxH; imgW = imgH * imgAspect; }
  const imgX = (pageW - imgW) / 2;
  const imgY = 50;

  doc.setFillColor(200, 195, 185);
  doc.rect(imgX + 2, imgY + 2, imgW, imgH, "F");
  doc.setFillColor(...BRAND.gold);
  doc.rect(imgX - 1.5, imgY - 1.5, imgW + 3, imgH + 3, "F");
  doc.setFillColor(255, 255, 255);
  doc.rect(imgX - 0.5, imgY - 0.5, imgW + 1, imgH + 1, "F");
  const coverImage = options.referenceImageUrl || renderSmoothPreview(options.indices, palette.colors, options.gridCols, options.gridRows, 16).toDataURL("image/jpeg", 0.9);
  if (!tryAddImage(doc, coverImage, "JPEG", imgX, imgY, imgW, imgH)) {
    const hiResCanvas = renderSmoothPreview(options.indices, palette.colors, options.gridCols, options.gridRows, 16);
    doc.addImage(hiResCanvas.toDataURL("image/jpeg", 0.9), "JPEG", imgX, imgY, imgW, imgH);
  }

  // Info badges
  const badgeY = imgY + imgH + 7;
  const stats = getPaintingStats(options.gridCols, options.gridRows);

  const infos = [
    `${options.gridCols}×${options.gridRows} cells`,
    `${palette.colors.length} colors`,
    `${stats.totalSections} sections`,
    `${totalPages} pages`,
  ];
  const badgeW = 34;
  const infoTotalW = infos.length * (badgeW + 2);
  const infoStartX = (pageW - infoTotalW) / 2;
  infos.forEach((info, i) => {
    const bx = infoStartX + i * (badgeW + 2);
    doc.setFillColor(...BRAND.goldPale);
    doc.setDrawColor(...BRAND.gold);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, badgeY, badgeW, 8, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.charcoal);
    doc.text(info, bx + badgeW / 2, badgeY + 5.2, { align: "center" });
  });

  // Compact palette strip
  const paletteY = badgeY + 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.charcoal);
  doc.text("COLOR PALETTE", pageW / 2, paletteY, { align: "center" });
  drawGoldAccentLine(doc, pageW / 2 - 18, paletteY + 2, pageW / 2 + 18);

  const stripY = paletteY + 7;
  const numColors = palette.colors.length;
  const stripW = pageW - 30;
  const spacing = stripW / numColors;
  const startX = 15 + spacing / 2;

  palette.colors.forEach((color, i) => {
    const cx = startX + i * spacing;
    drawColorSwatch(doc, cx, stripY, Math.min(6, spacing * 0.8), color.hex, false);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(Math.min(5, spacing * 0.6));
    doc.setTextColor(...BRAND.charcoal);
    doc.text(COLOR_LETTERS[i], cx, stripY + 5.5, { align: "center" });
  });

  if (options.dedicationText) {
    const dedicationY = stripY + 12;
    doc.setFillColor(...BRAND.goldPale);
    doc.setDrawColor(...BRAND.goldLight);
    doc.roundedRect(22, dedicationY - 4, pageW - 44, 14, 3, 3, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.warmGray);
    doc.text("DEDICATION", pageW / 2, dedicationY, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.charcoal);
    doc.text(options.dedicationText, pageW / 2, dedicationY + 5, { align: "center" });
  }

  if (options.viewerUrl && options.instructionCode) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.gold);
    doc.text(`Open the live viewer with code ${options.instructionCode}`, pageW / 2, pageH - 22, { align: "center" });
  }

  // Bottom branding
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.warmGray);
  doc.text(`${BRAND_CONFIG.domain} — Custom Paint by Numbers`, pageW / 2, pageH - 14, { align: "center" });

  renderPageFooter(doc, 1, totalPages);
}

async function renderStudioPage(doc: jsPDF, options: PdfOptions, totalPages: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const { brandName = BRAND_CONFIG.pdfName } = options;

  doc.addPage();
  doc.setFillColor(...BRAND.cream);
  doc.rect(0, 0, pageW, pageH, "F");

  renderPageHeader(doc, brandName, "Studio Guide");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...BRAND.charcoal);
  doc.text("Your Painting Manifest", 14, 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.warmGray);
  doc.text("The PDF, viewer, and section checklist all follow this same layout.", 14, 30);

  const cardY = 38;
  const cardH = 62;
  const cardW = (pageW - 34) / 2;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BRAND.goldLight);
  doc.roundedRect(14, cardY, cardW, cardH, 3, 3, "FD");
  doc.roundedRect(20 + cardW, cardY, cardW, cardH, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.burgundy);
  doc.text("Reference Preview", 18, cardY + 8);
  doc.text("Painting Stats", 24 + cardW, cardY + 8);

  const referenceImage = options.referenceImageUrl || null;
  if (!tryAddImage(doc, referenceImage, "JPEG", 18, cardY + 12, cardW - 8, 42, 42)) {
    const fallbackPreview = renderSmoothPreview(options.indices, options.palette.colors, options.gridCols, options.gridRows, 10);
    doc.addImage(fallbackPreview.toDataURL("image/jpeg", 0.9), "JPEG", 18, cardY + 12, cardW - 8, 42, 42);
  }

  const statsLines = [
    `Grid: ${options.gridCols} x ${options.gridRows}`,
    `Colors: ${options.palette.colors.length}`,
    `Sections: ${getPaintingStats(options.gridCols, options.gridRows).totalSections}`,
    `Difficulty: ${options.difficultyLabel || "Custom"}`,
    `Estimated time: ${options.estimatedHours || "Flexible"}`,
  ];
  statsLines.forEach((line, index) => {
    doc.setFont("helvetica", index === 0 ? "bold" : "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...(index === 0 ? BRAND.charcoal : BRAND.warmGray));
    doc.text(line, 24 + cardW, cardY + 18 + index * 8);
  });

  const detailY = 112;
  doc.setFillColor(...BRAND.goldPale);
  doc.setDrawColor(...BRAND.goldLight);
  doc.roundedRect(14, detailY, pageW - 28, 44, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.burgundy);
  doc.text("How to use this guide", 18, detailY + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.charcoal);
  [
    "1. Use the viewer for zoom and color isolation, then paint from the printed sections.",
    "2. Match the letter in each cell with the legend page before opening a new paint pot.",
    "3. Work section by section and mark completed sections in the viewer as you go.",
    "4. Keep this page nearby for the QR code and the instruction code if you switch devices.",
  ].forEach((line, index) => {
    doc.text(line, 18, detailY + 16 + index * 6);
  });

  if (options.viewerUrl) {
    const qrY = 168;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.charcoal);
    doc.text("Open the live viewer", 14, qrY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.warmGray);
    doc.text(`Viewer code: ${options.instructionCode || "—"}`, 14, qrY + 6);

    try {
      const qrDataUrl = await QRCode.toDataURL(options.viewerUrl, {
        width: 220,
        margin: 1,
        color: { dark: "#2B2B2B", light: "#FAF7F2" },
      });
      doc.setFillColor(...BRAND.gold);
      doc.rect(pageW - 58, qrY - 2, 44, 44, "F");
      doc.addImage(qrDataUrl, "PNG", pageW - 56, qrY, 40, 40);
    } catch {
      // Ignore QR rendering failures and keep the page usable.
    }
  }

  renderPageFooter(doc, 2, totalPages);
}

// ─── Page 2: Color Legend + Section Map ─────────────────────────────────
function renderLegendPage(doc: jsPDF, options: PdfOptions, colorCounts: number[], totalPages: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const { palette, brandName = BRAND_CONFIG.pdfName } = options;

  doc.addPage();
  doc.setFillColor(...BRAND.cream);
  doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), "F");

  renderPageHeader(doc, brandName, "Color Legend & Section Map");

  const totalPixels = options.gridCols * options.gridRows;
  const sectionCols = Math.ceil(options.gridCols / SECTION_COLS);
  const sectionRows = Math.ceil(options.gridRows / SECTION_ROWS);
  const numColors = palette.colors.length;

  // ─── Compact 2-column color legend ─────────────────────────────────
  let y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.charcoal);
  doc.text("Color Reference", 14, y);
  y += 3;
  drawGoldAccentLine(doc, 14, y, 49);
  y += 5;

  const colsPerSide = Math.ceil(numColors / 2);
  const rowH = 9;
  const col1X = 14;
  const col2X = pageW / 2 + 4;
  const colW = pageW / 2 - 18;

  palette.colors.forEach((color, i) => {
    const isRightCol = i >= colsPerSide;
    const colX = isRightCol ? col2X : col1X;
    const rowIdx = isRightCol ? i - colsPerSide : i;
    const rowY = y + rowIdx * rowH;
    const [r, g, b] = hexToRgb(color.hex);

    if (rowIdx % 2 === 0) {
      doc.setFillColor(...BRAND.goldPale);
      doc.roundedRect(colX - 1, rowY - 2.5, colW + 2, rowH - 1, 1, 1, "F");
    }

    drawColorSwatch(doc, colX + 4, rowY + 1.5, 5, color.hex, false);

    doc.setFillColor(...BRAND.gold);
    doc.circle(colX + 11, rowY + 1.5, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(COLOR_LETTERS[i], colX + 11, rowY + 2.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.charcoal);
    doc.text(color.name, colX + 17, rowY + 1);

    const pct = ((colorCounts[i] / totalPixels) * 100).toFixed(1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...BRAND.warmGray);
    doc.text(`${colorCounts[i]} (${pct}%)`, colX + 17, rowY + 4.5);

    const barX = colX + colW - 18;
    const barW = 16;
    const barFill = (colorCounts[i] / totalPixels) * barW;
    doc.setFillColor(...BRAND.lightGray);
    doc.roundedRect(barX, rowY + 3, barW, 2, 0.5, 0.5, "F");
    doc.setFillColor(r, g, b);
    doc.roundedRect(barX, rowY + 3, Math.max(barFill, 0.5), 2, 0.5, 0.5, "F");
  });

  // ─── Section Map ───────────────────────────────────────────────────
  const legendBottom = y + colsPerSide * rowH + 8;
  let sy = legendBottom;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.charcoal);
  doc.text("Section Map", 14, sy);
  sy += 3;
  drawGoldAccentLine(doc, 14, sy, 49);
  sy += 5;

  const mapMaxW = pageW - 28;
  const mapMaxH = 60;
  const mapCellW = Math.min(mapMaxW / sectionCols, mapMaxH / sectionRows);
  const mapCellH = mapCellW * (options.gridRows / options.gridCols) * (sectionCols / sectionRows);
  const actualMapW = sectionCols * mapCellW;
  const mapStartX = 14 + (mapMaxW - actualMapW) / 2;

  for (let sr = 0; sr < sectionRows; sr++) {
    for (let sc = 0; sc < sectionCols; sc++) {
      const idx = sr * sectionCols + sc;
      const mx = mapStartX + sc * mapCellW;
      const my = sy + sr * mapCellH;

      const startCol = sc * SECTION_COLS;
      const startRow = sr * SECTION_ROWS;
      const colorFreq = new Array(palette.colors.length).fill(0);
      for (let r = startRow; r < Math.min(startRow + SECTION_ROWS, options.gridRows); r++) {
        for (let c = startCol; c < Math.min(startCol + SECTION_COLS, options.gridCols); c++) {
          colorFreq[options.indices[r * options.gridCols + c]]++;
        }
      }
      const dominantIdx = colorFreq.indexOf(Math.max(...colorFreq));
      const [dr, dg, db] = hexToRgb(palette.colors[dominantIdx].hex);
      const [tR, tG, tB] = tintColor(dr, dg, db, 0.45);
      doc.setFillColor(tR, tG, tB);
      doc.setDrawColor(...tintColor(dr, dg, db, 0.2));
      doc.setLineWidth(0.3);
      doc.roundedRect(mx + 0.5, my + 0.5, mapCellW - 1, mapCellH - 1, 0.5, 0.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(Math.min(6, mapCellW * 0.4));
      doc.setTextColor(...BRAND.charcoal);
      doc.text(String(idx + 1), mx + mapCellW / 2, my + mapCellH / 2 + 1, { align: "center" });
    }
  }

  doc.setDrawColor(...BRAND.gold);
  doc.setLineWidth(0.8);
  doc.rect(mapStartX, sy, sectionCols * mapCellW, sectionRows * mapCellH, "S");

  const mapBottomY = sy + sectionRows * mapCellH + 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.warmGray);
  doc.text(
    `${options.gridCols} × ${options.gridRows} cells — ${sectionCols * sectionRows} sections (${SECTION_COLS}×${SECTION_ROWS} each)`,
    pageW / 2, mapBottomY, { align: "center" }
  );

  // How to read
  const guideY = mapBottomY + 6;
  doc.setFillColor(...BRAND.goldPale);
  doc.setDrawColor(...BRAND.goldLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, guideY - 2, pageW - 28, 28, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.burgundy);
  doc.text("How to Read", 18, guideY + 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...BRAND.charcoal);
  const guideLines = [
    "• Each cell shows a letter (A, B, C...)",
    "• Match the letter to this color legend",
    "• Cells are tinted for quick reference",
    "• Work one section at a time",
    "• Start with lighter colors first",
  ];
  guideLines.forEach((line, i) => {
    doc.text(line, 18, guideY + 8 + i * 4);
  });

  renderPageFooter(doc, 3, totalPages);
}

// ─── Render a single mini-section within a multi-section page ───────────
function renderMiniSection(
  doc: jsPDF,
  indices: Uint8Array,
  gridCols: number,
  gridRows: number,
  palette: PaletteColor[],
  sectionIndex: number,
  sectionCol: number,
  sectionRow: number,
  blockX: number,
  blockY: number,
  blockW: number,
  blockH: number,
) {
  const startGridCol = sectionCol * SECTION_COLS;
  const startGridRow = sectionRow * SECTION_ROWS;
  const actualCols = Math.min(SECTION_COLS, gridCols - startGridCol);
  const actualRows = Math.min(SECTION_ROWS, gridRows - startGridRow);

  // Layout within block
  const headerH = 5;
  const labelSpace = 4;
  const gridAreaW = blockW - labelSpace * 2;
  const gridAreaH = blockH - headerH - labelSpace * 2 - 1;
  const cellSize = Math.min(gridAreaW / actualCols, gridAreaH / actualRows);
  const gridW = actualCols * cellSize;
  const gridH = actualRows * cellSize;
  const gridX = blockX + labelSpace + (gridAreaW - gridW) / 2;
  const gridY = blockY + headerH + labelSpace;

  // Section number header bar
  doc.setFillColor(...BRAND.gold);
  doc.roundedRect(blockX, blockY, blockW, headerH, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(String(sectionIndex + 1), blockX + blockW / 2, blockY + headerH / 2 + 1.2, { align: "center" });

  // Column headers
  doc.setFont("helvetica", "normal");
  doc.setFontSize(Math.min(4.5, cellSize * 0.55));
  doc.setTextColor(...BRAND.warmGray);
  for (let c = 0; c < actualCols; c++) {
    doc.text(
      String(startGridCol + c + 1),
      gridX + c * cellSize + cellSize / 2,
      gridY - 1,
      { align: "center" }
    );
  }

  // Row headers
  for (let r = 0; r < actualRows; r++) {
    doc.text(
      String(startGridRow + r + 1),
      gridX - 1.5,
      gridY + r * cellSize + cellSize / 2 + 1,
      { align: "right" }
    );
  }

  // Draw cells
  for (let r = 0; r < actualRows; r++) {
    const globalRow = startGridRow + r;
    if (globalRow >= gridRows) break;
    for (let c = 0; c < actualCols; c++) {
      const globalCol = startGridCol + c;
      if (globalCol >= gridCols) break;

      const colorIdx = indices[globalRow * gridCols + globalCol];
      const color = palette[colorIdx];
      const [cr, cg, cb] = hexToRgb(color.hex);

      const x = gridX + c * cellSize;
      const y = gridY + r * cellSize;

      // Tinted background
      const [ctR, ctG, ctB] = tintColor(cr, cg, cb, 0.35);
      doc.setFillColor(ctR, ctG, ctB);
      doc.rect(x, y, cellSize, cellSize, "F");

      // Cell border
      doc.setDrawColor(...tintColor(cr, cg, cb, 0.25));
      doc.setLineWidth(0.08);
      doc.rect(x, y, cellSize, cellSize, "S");

      // Letter
      const lum = luminance(ctR, ctG, ctB);
      const textColor = lum > 170 ? BRAND.charcoal : [10, 10, 10] as [number, number, number];
      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(Math.min(5.5, cellSize * 0.6));
      doc.text(
        COLOR_LETTERS[colorIdx] || String(colorIdx),
        x + cellSize / 2,
        y + cellSize / 2 + cellSize * 0.2,
        { align: "center" }
      );
    }
  }

  // Grid border
  doc.setDrawColor(...BRAND.gold);
  doc.setLineWidth(0.4);
  doc.rect(gridX, gridY, gridW, gridH, "S");
}

// ─── Grid Pages: 12 sections per page (3×4 layout) ─────────────────────
function renderGridPages(doc: jsPDF, options: PdfOptions, totalPages: number) {
  const { indices, gridCols, gridRows, palette, brandName = BRAND_CONFIG.pdfName } = options;

  const sectionCols = Math.ceil(gridCols / SECTION_COLS);
  const sectionRows = Math.ceil(gridRows / SECTION_ROWS);
  const totalSections = sectionCols * sectionRows;

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Layout constants
  const marginX = 8;
  const marginTop = 16;
  const marginBottom = 14;
  const gapX = 3;
  const gapY = 3;

  const usableW = pageW - 2 * marginX;
  const usableH = pageH - marginTop - marginBottom;
  const blockW = (usableW - (PAGE_GRID_COLS - 1) * gapX) / PAGE_GRID_COLS;
  const blockH = (usableH - (PAGE_GRID_ROWS - 1) * gapY) / PAGE_GRID_ROWS;

  const totalGridPages = Math.ceil(totalSections / SECTIONS_PER_PAGE);

  for (let pageIdx = 0; pageIdx < totalGridPages; pageIdx++) {
    doc.addPage();
    doc.setFillColor(...BRAND.cream);
    doc.rect(0, 0, pageW, pageH, "F");

    const firstSection = pageIdx * SECTIONS_PER_PAGE;
    const lastSection = Math.min(firstSection + SECTIONS_PER_PAGE - 1, totalSections - 1);

    renderPageHeader(doc, brandName, `Sections ${firstSection + 1}–${lastSection + 1}`);

    for (let slot = 0; slot < SECTIONS_PER_PAGE; slot++) {
      const sectionIdx = firstSection + slot;
      if (sectionIdx >= totalSections) break;

      const slotCol = slot % PAGE_GRID_COLS;
      const slotRow = Math.floor(slot / PAGE_GRID_COLS);

      const blockX = marginX + slotCol * (blockW + gapX);
      const blockY = marginTop + slotRow * (blockH + gapY);

      const sCol = sectionIdx % sectionCols;
      const sRow = Math.floor(sectionIdx / sectionCols);

      renderMiniSection(
        doc, indices, gridCols, gridRows, palette.colors,
        sectionIdx, sCol, sRow,
        blockX, blockY, blockW, blockH
      );
    }

    renderPageFooter(doc, pageIdx + 4, totalPages);
  }
}

// ─── Final Page: Assembly Tips + QR Code ────────────────────────────────
async function renderAssemblyPage(doc: jsPDF, options: PdfOptions, totalPages: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const { palette, brandName = BRAND_CONFIG.pdfName } = options;

  doc.addPage();
  doc.setFillColor(...BRAND.cream);
  doc.rect(0, 0, pageW, pageH, "F");

  renderPageHeader(doc, brandName, "Assembly Guide");

  let y = 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...BRAND.charcoal);
  doc.text("Painting Tips & Guide", pageW / 2, y, { align: "center" });
  y += 4;
  drawGoldAccentLine(doc, pageW / 2 - 30, y, pageW / 2 + 30);
  drawGoldDotDivider(doc, pageW / 2, y + 3, 20);
  y += 10;

  const tips = [
    { num: "1", title: "Start with Light Colors", desc: "Begin with the lightest shades and gradually work toward darker ones.", color: BRAND.gold },
    { num: "2", title: "Work Section by Section", desc: "Follow the numbered sections in order. Complete one fully before moving to the next.", color: BRAND.burgundy },
    { num: "3", title: "Apply Thin Layers", desc: "Use thin, even coats. Two thin layers look better than one thick layer.", color: BRAND.gold },
    { num: "4", title: "Clean Your Brushes", desc: "Rinse brushes thoroughly between color changes. Pat dry before dipping.", color: BRAND.burgundy },
    { num: "5", title: "Match Letters to Colors", desc: "Each cell contains a letter code. Refer to the Color Legend page to find the matching paint.", color: BRAND.gold },
    { num: "6", title: "Let Sections Dry", desc: "Allow each section to dry before painting adjacent areas to prevent bleeding.", color: BRAND.burgundy },
    { num: "7", title: "Final Review", desc: "Review under good lighting and touch up any thin spots for a polished finish.", color: BRAND.gold },
  ];

  tips.forEach((tip) => {
    doc.setFillColor(...tip.color);
    doc.circle(22, y + 2, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(tip.num, 22, y + 3.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.charcoal);
    doc.text(tip.title, 30, y + 3);
    y += 5.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.warmGray);
    const lines = doc.splitTextToSize(tip.desc, pageW - 50);
    doc.text(lines, 30, y);
    y += lines.length * 3.5 + 4;
  });

  // Painting order diagram
  y += 2;
  doc.setFillColor(...BRAND.goldPale);
  doc.setDrawColor(...BRAND.goldLight);
  doc.setLineWidth(0.3);

  const sorted = palette.colors.map((c, i) => ({ color: c, letter: COLOR_LETTERS[i], idx: i }))
    .sort((a, b) => {
      const [ar, ag, ab] = hexToRgb(a.color.hex);
      const [br, bg, bb] = hexToRgb(b.color.hex);
      return luminance(br, bg, bb) - luminance(ar, ag, ab);
    }).reverse();

  const showColors = sorted.slice(0, Math.min(sorted.length, 15));
  const boxH = 20;
  doc.roundedRect(14, y - 4, pageW - 28, boxH, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.burgundy);
  doc.text("Recommended Color Order (Light → Dark)", pageW / 2, y, { align: "center" });
  y += 4;

  const arrowW = pageW - 50;
  const step = arrowW / showColors.length;
  showColors.forEach((item, i) => {
    const cx = 25 + i * step + step / 2;
    drawColorSwatch(doc, cx, y + 2, Math.min(7, step * 0.7), item.color.hex, false);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(Math.min(6, step * 0.5));
    doc.setTextColor(...BRAND.charcoal);
    doc.text(item.letter, cx, y + 8, { align: "center" });

    if (i < showColors.length - 1) {
      doc.setDrawColor(...BRAND.goldLight);
      doc.setLineWidth(0.3);
      const arrowX1 = cx + step * 0.3;
      const arrowX2 = cx + step * 0.7;
      doc.line(arrowX1, y + 2, arrowX2, y + 2);
    }
  });

  y += boxH;

  // QR Code
  const qrUrl = options.viewerUrl || BRAND_CONFIG.siteUrl;
  const qrLabel = options.viewerUrl ? "Open your Helma viewer" : "Visit Helma Online";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.charcoal);
  doc.text(qrLabel, pageW / 2, y, { align: "center" });
  y += 5;

  try {
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 200,
      margin: 1,
      color: { dark: "#2B2B2B", light: "#FAF7F2" },
    });
    const qrSize = 38;
    doc.setFillColor(...BRAND.gold);
    doc.rect(pageW / 2 - qrSize / 2 - 1.5, y - 1.5, qrSize + 3, qrSize + 3, "F");
    doc.addImage(qrDataUrl, "PNG", pageW / 2 - qrSize / 2, y, qrSize, qrSize);
    y += qrSize + 5;
  } catch {
    y += 35;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.gold);
  doc.text(qrUrl.replace(/^https?:\/\//, ""), pageW / 2, y, { align: "center" });
  y += 10;

  doc.setFillColor(...BRAND.burgundy);
  doc.roundedRect(pageW / 2 - 70, y - 3, 140, 18, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("Finish, scan, and keep painting with confidence", pageW / 2, y + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("Your viewer and this PDF stay aligned through the same instruction code.", pageW / 2, y + 10, { align: "center" });

  renderPageFooter(doc, totalPages, totalPages);
}

// ─── Main Export ────────────────────────────────────────────────────────
export async function generatePaintByNumbersPDF(manifest: PaintingManifest): Promise<Blob> {
  const options: PdfOptions = {
    indices: new Uint8Array(manifest.indices),
    gridCols: manifest.gridCols,
    gridRows: manifest.gridRows,
    palette: resolveManifestPalette(manifest),
    canvasSize: manifest.canvasLabel,
    brandName: BRAND_CONFIG.pdfName,
    orderRef: manifest.orderRef,
    instructionCode: manifest.instructionCode,
    dedicationText: manifest.dedicationText,
    referenceImageUrl: manifest.referenceImageUrl,
    sourceImageUrl: manifest.sourceImageUrl,
    viewerUrl: manifest.viewerUrl,
    estimatedHours: manifest.stats.estimatedHours,
    difficultyLabel: manifest.stats.difficultyLabel,
  };
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const colorCounts = countColors(options.indices, options.palette.colors.length);
  const { totalGridPages } = getPaintingStats(options.gridCols, options.gridRows);
  const totalPages = 1 + 1 + 1 + totalGridPages + 1;

  renderCoverPage(doc, options, colorCounts, totalPages);
  await renderStudioPage(doc, options, totalPages);
  renderLegendPage(doc, options, colorCounts, totalPages);
  renderGridPages(doc, options, totalPages);
  await renderAssemblyPage(doc, options, totalPages);

  return doc.output("blob");
}

export function getSectionStats(gridCols: number, gridRows: number) {
  const { totalSections, totalPages, sectionCols, sectionRows } = getPaintingStats(gridCols, gridRows);
  return { totalSections, totalPages, sectionCols, sectionRows };
}
