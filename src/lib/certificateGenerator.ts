import jsPDF from "jspdf";

interface CertificateOptions {
  name: string;
  date: string;
  previewDataUrl?: string;
  style: string;
  size: string;
}

export async function generateCertificate(options: CertificateOptions): Promise<Blob> {
  const { name, date, previewDataUrl, style, size } = options;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(250, 247, 242); // --background warm
  doc.rect(0, 0, w, h, "F");

  // Decorative border
  doc.setDrawColor(200, 175, 120); // gold
  doc.setLineWidth(1.5);
  doc.rect(10, 10, w - 20, h - 20);
  doc.setLineWidth(0.5);
  doc.rect(13, 13, w - 26, h - 26);

  // Corner ornaments
  const corners = [
    [16, 16], [w - 16, 16], [16, h - 16], [w - 16, h - 16],
  ];
  doc.setFillColor(200, 175, 120);
  corners.forEach(([cx, cy]) => {
    doc.circle(cx, cy, 2, "F");
  });

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(43, 43, 43);
  doc.text("Certificat d'accomplissement", w / 2, 40, { align: "center" });

  // Subtitle
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("Flink Atelier — Peinture par numéros", w / 2, 50, { align: "center" });

  // Decorative line
  doc.setDrawColor(200, 175, 120);
  doc.setLineWidth(0.8);
  doc.line(w / 2 - 40, 55, w / 2 + 40, 55);

  // Preview image (centered)
  if (previewDataUrl) {
    try {
      const imgSize = 55;
      doc.addImage(previewDataUrl, "PNG", w / 2 - imgSize / 2, 62, imgSize, imgSize);
      doc.setDrawColor(200, 175, 120);
      doc.setLineWidth(0.5);
      doc.rect(w / 2 - imgSize / 2 - 1, 61, imgSize + 2, imgSize + 2);
    } catch {}
  }

  // "This certifies that"
  const textY = previewDataUrl ? 128 : 80;
  doc.setFontSize(14);
  doc.setTextColor(120, 120, 120);
  doc.text("Ce certificat atteste que", w / 2, textY, { align: "center" });

  // Name
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(43, 43, 43);
  doc.text(name, w / 2, textY + 15, { align: "center" });

  // Underline under name
  const nameWidth = doc.getTextWidth(name);
  doc.setDrawColor(200, 175, 120);
  doc.setLineWidth(0.5);
  doc.line(w / 2 - nameWidth / 2, textY + 17, w / 2 + nameWidth / 2, textY + 17);

  // Achievement text
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(
    `a complété avec succès sa peinture par numéros personnalisée`,
    w / 2, textY + 27, { align: "center" }
  );
  doc.text(
    `Style: ${style} — Taille: ${size}`,
    w / 2, textY + 34, { align: "center" }
  );

  // Date
  doc.setFontSize(11);
  doc.setTextColor(120, 120, 120);
  doc.text(`Achevé le ${date}`, w / 2, textY + 44, { align: "center" });

  // Signature line
  const sigY = h - 30;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(w / 2 - 30, sigY, w / 2 + 30, sigY);
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text("Flink Atelier", w / 2, sigY + 5, { align: "center" });

  return doc.output("blob");
}
