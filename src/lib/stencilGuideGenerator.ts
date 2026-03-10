/**
 * stencilGuideGenerator.ts
 *
 * Generates a simple instruction booklet PDF for Stencil Paint Reveal
 * and Glitter Reveal products. Much simpler than the paint-by-numbers PDF —
 * no numbered grid pages, just instructions and tips.
 */

import jsPDF from "jspdf";
import QRCode from "qrcode";
import { BRAND as BRAND_CONFIG } from "./brand";
import type { PaintingManifest } from "./paintingManifest";
import { GLITTER_PALETTES } from "./glitterPalettes";
import { STENCIL_DETAIL_META } from "./store";
import type { GlitterPalette, StencilDetailLevel } from "./store";

// ─── Brand colors (shared with pdfGenerator) ─────────────────────────────────
const BRAND = {
  gold: [184, 134, 11] as [number, number, number],
  goldLight: [230, 207, 155] as [number, number, number],
  goldPale: [250, 244, 230] as [number, number, number],
  burgundy: [114, 47, 55] as [number, number, number],
  cream: [250, 247, 242] as [number, number, number],
  charcoal: [35, 35, 35] as [number, number, number],
  warmGray: [120, 110, 100] as [number, number, number],
  lightGray: [240, 237, 232] as [number, number, number],
  stencilBlue: [60, 100, 160] as [number, number, number],
  glitterPurple: [120, 60, 180] as [number, number, number],
};

// ─── Layout constants ─────────────────────────────────────────────────────────
const PAGE_W = 210; // A4 mm
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function setFont(doc: jsPDF, style: "normal" | "bold" | "italic" = "normal", size = 10) {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
}

function setColor(doc: jsPDF, rgb: [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function drawBorderFrame(doc: jsPDF) {
  doc.setDrawColor(...BRAND.goldLight);
  doc.setLineWidth(0.4);
  doc.rect(8, 8, PAGE_W - 16, PAGE_H - 16, "S");
  doc.setLineWidth(0.15);
  doc.rect(10, 10, PAGE_W - 20, PAGE_H - 20, "S");
}

function drawPageHeader(doc: jsPDF, title: string) {
  // Background strip
  doc.setFillColor(...BRAND.charcoal);
  doc.rect(0, 0, PAGE_W, 22, "F");
  // Gold accent line
  doc.setFillColor(...BRAND.gold);
  doc.rect(0, 22, PAGE_W, 1.5, "F");

  // Brand name
  setFont(doc, "bold", 9);
  setColor(doc, BRAND.goldLight);
  doc.text(BRAND_CONFIG.name.toUpperCase(), MARGIN, 13);

  // Title
  setFont(doc, "normal", 8);
  setColor(doc, [200, 200, 200]);
  doc.text(title, PAGE_W - MARGIN, 13, { align: "right" });
}

function drawPageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  doc.setFillColor(...BRAND.lightGray);
  doc.rect(0, PAGE_H - 12, PAGE_W, 12, "F");
  setFont(doc, "normal", 7);
  setColor(doc, BRAND.warmGray);
  doc.text(BRAND_CONFIG.siteUrl, MARGIN, PAGE_H - 4.5);
  doc.text(`${pageNum} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 4.5, { align: "right" });
}

async function tryLoadImage(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    if (url.startsWith("data:")) return url;
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function generateQrCode(url: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(url, { width: 120, margin: 1, color: { dark: "#222", light: "#FAF7F2" } });
  } catch {
    return null;
  }
}

function drawStepCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  stepNum: number,
  title: string,
  description: string,
  accentColor: [number, number, number],
) {
  const cardH = 32;
  // Card background
  doc.setFillColor(...BRAND.cream);
  doc.roundedRect(x, y, w, cardH, 3, 3, "F");
  // Left accent stripe
  doc.setFillColor(...accentColor);
  doc.roundedRect(x, y, 3, cardH, 1.5, 1.5, "F");
  // Step number circle
  doc.setFillColor(...accentColor);
  doc.circle(x + 14, y + cardH / 2, 7, "F");
  setFont(doc, "bold", 12);
  setColor(doc, [255, 255, 255]);
  doc.text(String(stepNum), x + 14, y + cardH / 2 + 1.5, { align: "center" });
  // Title
  setFont(doc, "bold", 10);
  setColor(doc, BRAND.charcoal);
  doc.text(title, x + 26, y + 11);
  // Description
  setFont(doc, "normal", 8);
  setColor(doc, BRAND.warmGray);
  const lines = doc.splitTextToSize(description, w - 30) as string[];
  doc.text(lines, x + 26, y + 19);
}

// ─── Page generators ──────────────────────────────────────────────────────────

async function addCoverPage(
  doc: jsPDF,
  manifest: PaintingManifest,
  previewImgData: string | null,
  sourceImgData: string | null,
  totalPages: number,
) {
  // Background
  doc.setFillColor(...BRAND.cream);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  drawBorderFrame(doc);

  // Header band
  doc.setFillColor(...BRAND.charcoal);
  doc.rect(0, 0, PAGE_W, 55, "F");
  doc.setFillColor(...BRAND.gold);
  doc.rect(0, 55, PAGE_W, 1.5, "F");

  // Brand name
  setFont(doc, "bold", 22);
  setColor(doc, BRAND.goldLight);
  doc.text(BRAND_CONFIG.name.toUpperCase(), PAGE_W / 2, 28, { align: "center" });

  // Subtitle
  setFont(doc, "normal", 10);
  setColor(doc, [180, 180, 180]);
  const productLabel = manifest.productType === "glitter_reveal"
    ? "Glitter Reveal — Guide de réalisation"
    : "Stencil Paint Reveal — Guide de réalisation";
  doc.text(productLabel, PAGE_W / 2, 42, { align: "center" });

  // Order ref
  setFont(doc, "normal", 8);
  setColor(doc, [140, 130, 120]);
  doc.text(`Réf. ${manifest.orderRef || "—"}`, PAGE_W / 2, 50, { align: "center" });

  // Images section
  const imgY = 68;
  const imgH = 108;

  if (sourceImgData && previewImgData) {
    // Side-by-side: original photo (left) + stencil preview (right)
    const imgW = (CONTENT_W - 6) / 2; // 6mm gap
    const leftX = MARGIN;
    const rightX = MARGIN + imgW + 6;

    // Source photo frame
    doc.setFillColor(...BRAND.lightGray);
    doc.roundedRect(leftX - 2, imgY - 2, imgW + 4, imgH + 4, 3, 3, "F");
    doc.addImage(sourceImgData, "JPEG", leftX, imgY, imgW, imgH, undefined, "MEDIUM");
    setFont(doc, "bold", 7.5);
    setColor(doc, BRAND.warmGray);
    doc.text("VOTRE PHOTO", leftX + imgW / 2, imgY + imgH + 7, { align: "center" });

    // Stencil preview frame
    doc.setFillColor(70, 60, 55);
    doc.roundedRect(rightX - 2, imgY - 2, imgW + 4, imgH + 4, 3, 3, "F");
    doc.addImage(previewImgData, "JPEG", rightX, imgY, imgW, imgH, undefined, "MEDIUM");
    setFont(doc, "bold", 7.5);
    setColor(doc, BRAND.warmGray);
    doc.text("VOTRE POCHOIR", rightX + imgW / 2, imgY + imgH + 7, { align: "center" });

    // Arrow between images
    setFont(doc, "bold", 16);
    setColor(doc, BRAND.gold);
    doc.text("→", PAGE_W / 2, imgY + imgH / 2 + 4, { align: "center" });
  } else if (previewImgData) {
    // Only stencil preview
    const previewW = 78;
    const previewX = (PAGE_W - previewW) / 2;
    doc.setFillColor(70, 60, 55);
    doc.roundedRect(previewX - 2, imgY - 2, previewW + 4, imgH + 4, 4, 4, "F");
    doc.addImage(previewImgData, "JPEG", previewX, imgY, previewW, imgH, undefined, "MEDIUM");
    setFont(doc, "italic", 8);
    setColor(doc, BRAND.warmGray);
    doc.text("Aperçu de votre portrait", PAGE_W / 2, imgY + imgH + 8, { align: "center" });
  }

  // Kit info section
  const infoY = (sourceImgData || previewImgData) ? 193 : 80;
  doc.setFillColor(...BRAND.lightGray);
  doc.roundedRect(MARGIN, infoY, CONTENT_W, 45, 4, 4, "F");

  const colW = CONTENT_W / 3;
  const items = [
    { label: "Format", value: manifest.canvasLabel || "—" },
    {
      label: manifest.productType === "glitter_reveal" ? "Palette" : "Détail",
      value: manifest.productType === "glitter_reveal"
        ? (manifest.glitterPalette ? GLITTER_PALETTES[manifest.glitterPalette as GlitterPalette]?.name : "—")
        : (manifest.stencilDetailLevel ? STENCIL_DETAIL_META[manifest.stencilDetailLevel as StencilDetailLevel]?.label : "—"),
    },
    { label: "Code", value: manifest.instructionCode || "—" },
  ];

  items.forEach((item, i) => {
    const cx = MARGIN + colW * i + colW / 2;
    setFont(doc, "bold", 14);
    setColor(doc, BRAND.gold);
    doc.text(item.value, cx, infoY + 18, { align: "center" });
    setFont(doc, "normal", 8);
    setColor(doc, BRAND.warmGray);
    doc.text(item.label.toUpperCase(), cx, infoY + 28, { align: "center" });
  });

  drawPageFooter(doc, 1, totalPages);
}

async function addInstructionsPage(
  doc: jsPDF,
  manifest: PaintingManifest,
  totalPages: number,
) {
  doc.addPage();
  doc.setFillColor(...BRAND.cream);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  drawBorderFrame(doc);
  drawPageHeader(doc, "Instructions");

  const isGlitter = manifest.productType === "glitter_reveal";
  const accentColor = isGlitter ? BRAND.glitterPurple : BRAND.stencilBlue;

  // Section title
  setFont(doc, "bold", 16);
  setColor(doc, BRAND.charcoal);
  doc.text("Comment réaliser votre création", MARGIN, 40);
  doc.setFillColor(...BRAND.gold);
  doc.rect(MARGIN, 43, 60, 1, "F");

  // Steps
  const steps = isGlitter ? [
    { title: "Déballez votre kit", desc: "Sortez délicatement la toile adhésive et les pots de paillettes de leur emballage." },
    { title: "Préparez votre espace", desc: "Posez la toile à plat sur une surface propre. Préparez vos pots de paillettes." },
    { title: "Saupoudrez les paillettes", desc: `Appliquez les paillettes de la palette ${manifest.glitterPalette ? GLITTER_PALETTES[manifest.glitterPalette as GlitterPalette]?.name || "" : ""} en couche généreuse sur toute la surface. Faites attention aux bords.` },
    { title: "Pressez doucement", desc: "Pressez légèrement avec la paume de la main pour faire adhérer les paillettes à la surface collante." },
    { title: "Retirez l'excédent", desc: "Inclinez doucement la toile pour faire tomber les paillettes en excès sur une feuille de papier." },
    { title: "Décollez le pochoir", desc: "En partant d'un coin, décollez lentement et régulièrement le pochoir adhésif. Le portrait apparaît !" },
    { title: "Admirez votre œuvre !", desc: "Votre portrait scintillant est révélé. Partagez ce moment magique avec vos proches." },
  ] : [
    { title: "Déballez votre kit", desc: "Sortez délicatement la toile avec son pochoir adhésif déjà appliqué et les peintures fournies." },
    { title: "Préparez votre palette", desc: "Disposez vos couleurs de peinture. Vous pouvez les mélanger librement — aucune règle !" },
    { title: "Peignez librement", desc: "Appliquez la peinture sur toute la surface du pochoir en faisant des coups de pinceau dans toutes les directions. C'est votre création artistique !" },
    { title: "Laissez sécher", desc: "Attendez que la peinture soit complètement sèche (environ 20-30 minutes selon l'épaisseur)." },
    { title: "Décollez le pochoir", desc: "En partant d'un coin, décollez lentement et régulièrement le pochoir adhésif. Le portrait blanc apparaît magiquement !" },
    { title: "Retouchez si nécessaire", desc: "Si des zones blanches ont été légèrement couvertes par la peinture, retouchez-les délicatement avec un coton-tige." },
    { title: "Admirez votre œuvre !", desc: "Votre portrait personnel est révélé sur un fond artistique unique que vous avez créé vous-même." },
  ];

  let stepY = 52;
  const stepH = 34;
  const stepGap = 4;
  steps.forEach((step, i) => {
    drawStepCard(doc, MARGIN, stepY, CONTENT_W, i + 1, step.title, step.desc, accentColor);
    stepY += stepH + stepGap;
  });

  drawPageFooter(doc, 2, totalPages);
}

async function addResultPreviewPage(
  doc: jsPDF,
  manifest: PaintingManifest,
  previewImgData: string | null,
  sourceImgData: string | null,
  totalPages: number,
) {
  doc.addPage();
  doc.setFillColor(...BRAND.cream);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  drawBorderFrame(doc);
  drawPageHeader(doc, "Résultat attendu");

  setFont(doc, "bold", 16);
  setColor(doc, BRAND.charcoal);
  doc.text("Votre résultat final", MARGIN, 40);
  doc.setFillColor(...BRAND.gold);
  doc.rect(MARGIN, 43, 40, 1, "F");

  setFont(doc, "normal", 9);
  setColor(doc, BRAND.warmGray);
  doc.text(
    "Les zones blanches du pochoir forment la silhouette de votre portrait.",
    MARGIN, 52,
  );

  const imgY = 62;
  if (sourceImgData && previewImgData) {
    // Side by side
    const imgW = (CONTENT_W - 6) / 2;
    const imgH = Math.round(imgW * 1.25);
    const leftX = MARGIN;
    const rightX = MARGIN + imgW + 6;

    // Source photo
    doc.setFillColor(...BRAND.lightGray);
    doc.roundedRect(leftX - 2, imgY - 2, imgW + 4, imgH + 4, 3, 3, "F");
    doc.addImage(sourceImgData, "JPEG", leftX, imgY, imgW, imgH, undefined, "MEDIUM");
    setFont(doc, "bold", 7.5);
    setColor(doc, BRAND.warmGray);
    doc.text("PHOTO ORIGINALE", leftX + imgW / 2, imgY + imgH + 7, { align: "center" });

    // Stencil
    doc.setFillColor(70, 60, 55);
    doc.roundedRect(rightX - 2, imgY - 2, imgW + 4, imgH + 4, 3, 3, "F");
    doc.addImage(previewImgData, "JPEG", rightX, imgY, imgW, imgH, undefined, "MEDIUM");
    setFont(doc, "bold", 7.5);
    setColor(doc, BRAND.warmGray);
    doc.text("POCHOIR (ZONES BLANCHES)", rightX + imgW / 2, imgY + imgH + 7, { align: "center" });

    const reminderY = imgY + imgH + 18;
    doc.setFillColor(...[240, 250, 240]);
    doc.roundedRect(MARGIN, reminderY, CONTENT_W, 30, 3, 3, "F");
    doc.setDrawColor(100, 180, 100);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, reminderY, CONTENT_W, 30, 3, 3, "S");
    setFont(doc, "bold", 9);
    setColor(doc, [40, 120, 40]);
    doc.text("Conseil", MARGIN + 6, reminderY + 10);
    setFont(doc, "normal", 8);
    setColor(doc, BRAND.charcoal);
    doc.text(
      "Plus votre couche de peinture/paillettes est épaisse et régulière, plus le contraste avec le portrait blanc sera saisissant !",
      MARGIN + 6, reminderY + 18,
      { maxWidth: CONTENT_W - 12 },
    );
  } else if (previewImgData) {
    const imgW = 100;
    const imgH = 130;
    const imgX = (PAGE_W - imgW) / 2;
    doc.setFillColor(70, 60, 55);
    doc.roundedRect(imgX - 3, imgY, imgW + 6, imgH + 6, 4, 4, "F");
    doc.addImage(previewImgData, "JPEG", imgX, imgY + 3, imgW, imgH, undefined, "MEDIUM");
    setFont(doc, "italic", 8);
    setColor(doc, BRAND.warmGray);
    doc.text("Aperçu généré avant révélation", PAGE_W / 2, imgY + imgH + 15, { align: "center" });

    const reminderY = 230;
    doc.setFillColor(...[240, 250, 240]);
    doc.roundedRect(MARGIN, reminderY, CONTENT_W, 30, 3, 3, "F");
    doc.setDrawColor(100, 180, 100);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, reminderY, CONTENT_W, 30, 3, 3, "S");
    setFont(doc, "bold", 9);
    setColor(doc, [40, 120, 40]);
    doc.text("Conseil", MARGIN + 6, reminderY + 10);
    setFont(doc, "normal", 8);
    setColor(doc, BRAND.charcoal);
    doc.text(
      "Plus votre couche de peinture/paillettes est épaisse et régulière, plus le contraste avec le portrait blanc sera saisissant !",
      MARGIN + 6, reminderY + 18,
      { maxWidth: CONTENT_W - 12 },
    );
  }

  drawPageFooter(doc, 3, totalPages);
}

async function addTipsPage(
  doc: jsPDF,
  manifest: PaintingManifest,
  qrData: string | null,
  totalPages: number,
) {
  doc.addPage();
  doc.setFillColor(...BRAND.cream);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  drawBorderFrame(doc);
  drawPageHeader(doc, "Conseils & Entretien");

  const isGlitter = manifest.productType === "glitter_reveal";

  setFont(doc, "bold", 16);
  setColor(doc, BRAND.charcoal);
  doc.text("Conseils pour la réussite", MARGIN, 40);
  doc.setFillColor(...BRAND.gold);
  doc.rect(MARGIN, 43, 50, 1, "F");

  const tips = isGlitter ? [
    "Utilisez les pots dans l'ordre suggéré sur l'image de référence pour un dégradé harmonieux.",
    "Travaillez dans un espace sans courant d'air pour éviter que les paillettes ne s'envolent.",
    "Récupérez l'excédent de paillettes sur une feuille de papier — vous pourrez les réutiliser !",
    "Si vous souhaitez mélanger les palettes, commencez par les couleurs les plus claires.",
    "Pour un effet encore plus brillant, appliquez une deuxième couche de paillettes avant de décolleer.",
    "Filmez le moment de la révélation — c'est un souvenir magique à partager !",
  ] : [
    "Utilisez des peintures acryliques ou aquarelles — pas d'huile, cela prend trop de temps à sécher.",
    "Des coups de pinceau variés (horizontaux, verticaux, circulaires) créent un effet plus riche.",
    "Peignez d'abord les zones sombres, puis les claires pour une meilleure profondeur.",
    "N'hésitez pas à charger votre pinceau — une couche épaisse rend le contraste plus saisissant.",
    "Laissez bien sécher avant de décoller le pochoir pour éviter que la peinture ne coule.",
    "Si un bord est légèrement décollé, recollez-le avec un peu de ruban adhésif pendant que vous peignez.",
  ];

  let tipY = 52;
  tips.forEach((tip, i) => {
    doc.setFillColor(...BRAND.goldPale);
    doc.roundedRect(MARGIN, tipY, CONTENT_W, 20, 2, 2, "F");
    doc.setFillColor(...BRAND.gold);
    doc.circle(MARGIN + 8, tipY + 10, 4, "F");
    setFont(doc, "bold", 9);
    setColor(doc, [255, 255, 255]);
    doc.text(String(i + 1), MARGIN + 8, tipY + 10 + 1.5, { align: "center" });
    setFont(doc, "normal", 8);
    setColor(doc, BRAND.charcoal);
    const lines = doc.splitTextToSize(tip, CONTENT_W - 22) as string[];
    doc.text(lines, MARGIN + 18, tipY + 9);
    tipY += 23;
  });

  // QR code
  if (qrData) {
    const qrSize = 35;
    const qrX = PAGE_W - MARGIN - qrSize;
    const qrY = PAGE_H - 65;
    doc.setFillColor(...BRAND.lightGray);
    doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 22, 3, 3, "F");
    doc.addImage(qrData, "PNG", qrX, qrY, qrSize, qrSize);
    setFont(doc, "normal", 6.5);
    setColor(doc, BRAND.warmGray);
    doc.text("Viewer en ligne", qrX + qrSize / 2, qrY + qrSize + 7, { align: "center" });
    doc.text(manifest.instructionCode, qrX + qrSize / 2, qrY + qrSize + 14, { align: "center" });
  }

  // Thank you
  setFont(doc, "bold", 11);
  setColor(doc, BRAND.gold);
  doc.text("Merci d'avoir choisi Helma !", MARGIN, PAGE_H - 28);
  setFont(doc, "normal", 8);
  setColor(doc, BRAND.warmGray);
  doc.text("Partagez votre création sur Instagram avec le hashtag #helmatn", MARGIN, PAGE_H - 20);

  drawPageFooter(doc, totalPages, totalPages);
}

async function addGlitterPalettePage(
  doc: jsPDF,
  manifest: PaintingManifest,
  totalPages: number,
) {
  if (!manifest.glitterPalette) return;
  const palette = GLITTER_PALETTES[manifest.glitterPalette as GlitterPalette];
  if (!palette) return;

  doc.addPage();
  doc.setFillColor(...BRAND.cream);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  drawBorderFrame(doc);
  drawPageHeader(doc, "Référence Palette");

  setFont(doc, "bold", 18);
  setColor(doc, BRAND.charcoal);
  doc.text(`Palette ${palette.name}`, MARGIN, 40);
  doc.setFillColor(...BRAND.gold);
  doc.rect(MARGIN, 44, 50, 1.5, "F");

  setFont(doc, "normal", 9);
  setColor(doc, BRAND.warmGray);
  doc.text(palette.description, MARGIN, 52);

  // Color swatches
  const swatchSize = 32;
  const swatchGap = 12;
  const startX = (PAGE_W - (palette.colors.length * (swatchSize + swatchGap) - swatchGap)) / 2;

  palette.colors.forEach((color, i) => {
    const sx = startX + i * (swatchSize + swatchGap);
    const sy = 64;
    const rgb = hexToRgb(color.hex);
    // Swatch
    doc.setFillColor(...rgb);
    doc.roundedRect(sx, sy, swatchSize, swatchSize, 4, 4, "F");
    doc.setDrawColor(...BRAND.warmGray);
    doc.setLineWidth(0.3);
    doc.roundedRect(sx, sy, swatchSize, swatchSize, 4, 4, "S");
    // Color name
    setFont(doc, "bold", 8);
    setColor(doc, BRAND.charcoal);
    doc.text(color.name, sx + swatchSize / 2, sy + swatchSize + 8, { align: "center" });
    // Hex
    setFont(doc, "normal", 7);
    setColor(doc, BRAND.warmGray);
    doc.text(color.hex, sx + swatchSize / 2, sy + swatchSize + 14, { align: "center" });
    // Description
    const descLines = doc.splitTextToSize(color.description, swatchSize + 10) as string[];
    setFont(doc, "normal", 7);
    setColor(doc, BRAND.warmGray);
    doc.text(descLines, sx + swatchSize / 2, sy + swatchSize + 22, { align: "center" });
  });

  // Gradient bar
  const barY = 130;
  const barW = CONTENT_W;
  const barH = 12;
  // Simulate gradient with colored segments
  const segW = barW / palette.colors.length;
  palette.colors.forEach((color, i) => {
    const rgb = hexToRgb(color.hex);
    doc.setFillColor(...rgb);
    doc.rect(MARGIN + i * segW, barY, segW, barH, "F");
  });
  doc.setDrawColor(...BRAND.warmGray);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, barY, barW, barH, "S");

  drawPageFooter(doc, totalPages - 1, totalPages);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateStencilGuide(manifest: PaintingManifest): Promise<Blob> {
  const isGlitter = manifest.productType === "glitter_reveal";

  // Preload assets in parallel
  const [previewImgData, sourceImgData, qrData] = await Promise.all([
    tryLoadImage(manifest.referenceImageUrl || manifest.previewDataUrl),
    tryLoadImage(manifest.sourceImageUrl),
    manifest.viewerUrl ? generateQrCode(manifest.viewerUrl) : Promise.resolve(null),
  ]);

  const totalPages = isGlitter ? 5 : 4;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  await addCoverPage(doc, manifest, previewImgData, sourceImgData, totalPages);
  await addInstructionsPage(doc, manifest, totalPages);
  await addResultPreviewPage(doc, manifest, previewImgData, sourceImgData, totalPages);
  if (isGlitter) {
    await addGlitterPalettePage(doc, manifest, totalPages);
  }
  await addTipsPage(doc, manifest, qrData, totalPages);

  return doc.output("blob");
}
