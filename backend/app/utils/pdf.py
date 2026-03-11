from __future__ import annotations

import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from app.models.enums import KIT_LABELS


# Brand colors
GOLD = colors.Color(184 / 255, 134 / 255, 11 / 255)
CHARCOAL = colors.Color(35 / 255, 35 / 255, 35 / 255)
CREAM = colors.Color(250 / 255, 247 / 255, 242 / 255)


def _brand_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "BrandTitle", parent=styles["Title"],
        textColor=CHARCOAL, fontSize=22, spaceAfter=12,
    ))
    styles.add(ParagraphStyle(
        "BrandHeading", parent=styles["Heading2"],
        textColor=GOLD, fontSize=16, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        "BrandBody", parent=styles["Normal"],
        textColor=CHARCOAL, fontSize=11, spaceAfter=6, leading=14,
    ))
    styles.add(ParagraphStyle(
        "BrandCenter", parent=styles["Normal"],
        textColor=CHARCOAL, fontSize=11, alignment=TA_CENTER, spaceAfter=6,
    ))
    return styles


_STENCIL_STEPS = [
    ("1. Unpack", "Carefully remove all kit components from the packaging."),
    ("2. Prepare Surface", "Clean and dry the canvas or wall surface thoroughly."),
    ("3. Position Stencil", "Align the stencil mask on the surface. Use painter's tape to secure edges."),
    ("4. Apply Paint", "Use a sponge or roller to apply paint evenly through the openings. Use light, even coats."),
    ("5. Let Dry", "Allow the paint to dry completely before removing the stencil (15-30 min for most paints)."),
    ("6. Peel Carefully", "Gently peel the stencil mask away from the surface at a 45° angle."),
    ("7. Admire", "Your portrait reveal is complete! Touch up any edges if needed."),
]

_GLITTER_STEPS = [
    ("1. Unpack", "Carefully remove all kit components and glitter packets from the packaging."),
    ("2. Prepare Surface", "Clean and dry the canvas surface thoroughly."),
    ("3. Apply Adhesive", "Peel the adhesive backing and position on the canvas."),
    ("4. Apply Glitter", "Apply each glitter color to its designated zone following the zone map."),
    ("5. Press & Seal", "Press glitter firmly into the adhesive. Shake off excess."),
    ("6. Peel Stencil", "Carefully peel away the stencil mask to reveal your design."),
    ("7. Fix & Admire", "Apply fixative spray to seal the glitter. Your sparkle reveal is complete!"),
]

_TIPS = [
    "Store unused stencils flat in a cool, dry place.",
    "For best results, use high-quality acrylic paint.",
    "Apply thin coats — multiple thin coats are better than one thick coat.",
    "Clean brushes and sponges immediately after use.",
    "Use painter's tape around the edges for crisp lines.",
]


def generate_instruction_pdf(
    *,
    product_type: str,
    kit_size_label: str,
    detail_level: str,
    instruction_code: str,
    source_png: bytes | None = None,
    preview_png: bytes | None = None,
    glitter_palette_name: str | None = None,
    glitter_zone_legend: list[dict] | None = None,
) -> bytes:
    """Generate the instruction PDF booklet.

    Returns PDF as bytes.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=15 * mm, rightMargin=15 * mm,
        topMargin=15 * mm, bottomMargin=15 * mm,
    )
    styles = _brand_styles()
    story = []

    is_glitter = product_type == "glitter_reveal"
    title = "Glitter Reveal Guide" if is_glitter else "Stencil Reveal Guide"

    # -- Cover Page --
    story.append(Paragraph("HELMA", styles["BrandTitle"]))
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph(title, styles["BrandHeading"]))
    story.append(Spacer(1, 4 * mm))

    # Kit info table
    info_data = [
        ["Format", kit_size_label],
        ["Detail", detail_level.capitalize()],
        ["Code", instruction_code or "—"],
    ]
    if is_glitter and glitter_palette_name:
        info_data.append(["Palette", glitter_palette_name.capitalize()])

    info_table = Table(info_data, colWidths=[35 * mm, 80 * mm])
    info_table.setStyle(TableStyle([
        ("TEXTCOLOR", (0, 0), (-1, -1), CHARCOAL),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 8 * mm))

    # Source + preview side by side
    images_row = []
    if source_png:
        src_img = RLImage(io.BytesIO(source_png), width=70 * mm, height=90 * mm, kind="proportional")
        images_row.append(src_img)
    if preview_png:
        prev_img = RLImage(io.BytesIO(preview_png), width=70 * mm, height=90 * mm, kind="proportional")
        images_row.append(prev_img)

    if images_row:
        img_table = Table([images_row], colWidths=[85 * mm] * len(images_row))
        img_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(img_table)

    # Page break
    from reportlab.platypus import PageBreak
    story.append(PageBreak())

    # -- Instructions Page --
    story.append(Paragraph("Instructions", styles["BrandHeading"]))
    story.append(Spacer(1, 4 * mm))

    steps = _GLITTER_STEPS if is_glitter else _STENCIL_STEPS
    for step_title, step_desc in steps:
        story.append(Paragraph(f"<b>{step_title}</b>", styles["BrandBody"]))
        story.append(Paragraph(step_desc, styles["BrandBody"]))
        story.append(Spacer(1, 3 * mm))

    story.append(PageBreak())

    # -- Result Preview Page --
    story.append(Paragraph("Expected Result", styles["BrandHeading"]))
    story.append(Spacer(1, 6 * mm))
    if preview_png:
        result_img = RLImage(io.BytesIO(preview_png), width=140 * mm, height=180 * mm, kind="proportional")
        story.append(result_img)

    story.append(PageBreak())

    # -- Glitter Palette Page (if glitter) --
    if is_glitter and glitter_zone_legend:
        story.append(Paragraph("Glitter Palette Reference", styles["BrandHeading"]))
        story.append(Spacer(1, 4 * mm))
        story.append(Paragraph(
            f"Palette: <b>{(glitter_palette_name or 'Custom').capitalize()}</b>",
            styles["BrandBody"],
        ))
        story.append(Spacer(1, 4 * mm))

        for entry in glitter_zone_legend:
            color_rgb = entry.get("color", [128, 128, 128])
            label = entry.get("label", f"Zone {entry.get('zone', '?')}")
            r, g, b = color_rgb[0] / 255, color_rgb[1] / 255, color_rgb[2] / 255

            swatch_data = [[
                "",
                Paragraph(f"<b>Zone {entry.get('zone', 0) + 1}</b>: {label}", styles["BrandBody"]),
            ]]
            swatch_table = Table(swatch_data, colWidths=[12 * mm, 120 * mm])
            swatch_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (0, 0), colors.Color(r, g, b)),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (0, 0), 0),
                ("RIGHTPADDING", (0, 0), (0, 0), 4 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]))
            story.append(swatch_table)
            story.append(Spacer(1, 2 * mm))

        story.append(PageBreak())

    # -- Tips Page --
    story.append(Paragraph("Tips & Care", styles["BrandHeading"]))
    story.append(Spacer(1, 4 * mm))
    for tip in _TIPS:
        story.append(Paragraph(f"• {tip}", styles["BrandBody"]))
    story.append(Spacer(1, 8 * mm))

    # QR code
    if instruction_code:
        try:
            import qrcode

            qr = qrcode.make(f"https://helma.tn/viewer/{instruction_code}")
            qr_buf = io.BytesIO()
            qr.save(qr_buf, format="PNG")
            qr_buf.seek(0)
            qr_img = RLImage(qr_buf, width=30 * mm, height=30 * mm)
            story.append(Paragraph("Scan to view your painting online:", styles["BrandCenter"]))
            story.append(Spacer(1, 2 * mm))

            qr_table = Table([[qr_img]], colWidths=[35 * mm])
            qr_table.setStyle(TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]))
            story.append(qr_table)
        except ImportError:
            pass

    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph("helma.tn", styles["BrandCenter"]))

    doc.build(story)
    return buf.getvalue()
