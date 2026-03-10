# Helma — What We Are Building (User Stories)

## What is Helma?

Helma (`helma.tn`) is a Tunisian e-commerce platform that turns any photo into a **personalized art kit**. A customer uploads their favorite photo, picks a product type, and receives a physical kit + a digital PDF guide to recreate their photo as art on canvas.

Three product types are available:

---

## Product 1 — Paint by Numbers

**What the customer gets:**
- A physical canvas pre-divided into numbered zones
- A set of numbered paints matching each zone
- A PDF instruction booklet with color legend and numbered grid

**How it works:**
1. Customer uploads a photo (family, pet, portrait, kids…)
2. The app processes the photo into a pixel grid (e.g. 160×200 cells)
3. Each cell is assigned a color from a palette (8-12 colors)
4. The customer receives the kit and paints each zone with the matching numbered paint
5. When complete, the canvas looks like a pixelated portrait of the photo

**What the guide shows:**
- Cover page with reference preview (what the finished painting should look like)
- Color legend (which number = which paint color)
- Grid pages showing the numbered zones section by section
- Beginner tips

---

## Product 2 — Stencil Paint Reveal

**The magic:** The customer's portrait is **hidden** in the canvas. They reveal it by painting over a stencil.

**What the customer gets:**
- A physical canvas
- A large adhesive stencil cut in the shape of their portrait
- A PDF instruction booklet

**How the physical kit works:**
1. Lay the stencil on the white canvas (the stencil protects the portrait shape)
2. Apply black or dark paint over the entire canvas (on top of and around the stencil)
3. Let it dry, then gently peel the stencil away
4. The portrait silhouette is REVEALED as white canvas underneath
5. Magic: what was hidden comes to life

**What the guide preview shows:**
- Left side: original customer photo
- Arrow →
- Right side: the stencil preview — shows **white portrait silhouette on dark background** (exactly how it looks before painting)
- Step-by-step instructions for applying the stencil and paint
- Visual reminder "the white zones = your portrait"

**Detail levels available:**
- Bold (2 levels): sharp high-contrast silhouette — easiest
- Medium (3 levels): silhouette with some shadow detail
- Fine (4 levels): most detailed, shows subtle tones

---

## Product 3 — Glitter Reveal

**Identical concept to Stencil Paint Reveal but with glitter instead of paint.**

**What the customer gets:**
- A physical canvas with adhesive stencil
- A set of colored glitters (the customer chooses a palette: gold, rose gold, galaxy, etc.)
- A PDF instruction booklet

**How the physical kit works:**
1. Lay the stencil on the canvas
2. Apply glue to the exposed areas, then pour the glitter
3. Let dry, shake off excess, peel stencil
4. A glittery portrait emerges

**What the guide preview shows:**
- Same as Stencil Paint Reveal but with a page showing which glitter color to use where
- Includes a glitter palette reference page

---

## The Customer Journey (Studio Flow)

1. **Landing page** — Customer sees examples of finished products, pricing, reviews. Clicks "Start".

2. **Choose a category** — Classic portrait / Family / Pets / Kids' Dream job

3. **Upload photo** — Customer uploads a personal photo. For "Kids' Dream" or "Pet", they can also trigger an AI-generated illustration (child as astronaut, etc.).

4. **Crop** — Customer adjusts the crop area to frame exactly what they want.

5. **Choose product type** — Paint by Numbers / Stencil Paint Reveal / Glitter Reveal

6. **Configure product**
   - Paint by numbers: choose art style (original / vintage / pop art) and canvas size
   - Stencil: choose detail level (bold / medium / fine) and canvas size
   - Glitter: choose glitter palette and canvas size

7. **Personal dedication (optional)** — Add a short message (max 22 chars) that gets baked into the bottom-right corner of the artwork

8. **Contact & Shipping** — Name, phone, governorate, delivery address

9. **Confirm & Pay** — Order summary + payment (cash on delivery for Tunisia)

10. **Download page** — Immediately after order, customer can:
    - Download the PDF instruction guide
    - Open the live viewer (interactive grid with their painting code)
    - Save the reference image

---

## The Download Page

After ordering, the customer lands on a page where they can:

### PDF Guide
- Generates a multi-page PDF booklet for their specific product
- For paint-by-numbers: includes color legend, all numbered grid pages, tips
- For stencil/glitter: includes cover with original photo + stencil preview, step-by-step instructions, tips
- Shows a real-time progress bar while generating
- Can be re-downloaded any time

### Live Viewer
- An interactive pixel grid the customer can view on their phone/tablet while painting
- They tap a color zone to mark it as done
- Progress is saved between sessions
- Accessible via a unique instruction code (e.g. HL-MMKDONAP)

### Reference Image
- The processed stencil or paint-by-numbers preview image
- Can be saved or shared

---

## The Viewer Page

Each order has a unique instruction code. The customer can go to `helma.tn/viewer/HL-XXXX` and:
- See their complete grid on screen
- Tap each zone to mark it done (paint-by-numbers)
- View their color palette
- Navigate between grid sections
- See overall progress

---

## Order Tracking

Customer can go to `helma.tn/track` with their order reference to see delivery status.

---

## Admin Panel

The Helma team sees:
- All orders with status, customer info, product type
- Abandoned carts (people who started but didn't finish)
- Coupon codes
- Regeneration requests (reprocess a photo with different settings)
- Revenue dashboard

---

## Technical Highlights (for agents)

- **All image processing is client-side** (browser canvas) — no server processes the photo
- **Manifests**: after processing, a "painting manifest" JSON captures everything about the order (grid, colors, stencil indices, preview image). This is stored in localStorage and Supabase.
- **Manifest version 5** is the current format, supporting all 3 product types
- **Stencil algorithm**: converts a photo to a binary/multi-level mask where index 0 = painted area (dark background) and index 1+ = portrait (white stencil area). Uses Otsu thresholding after sigmoid contrast + bilateral filter.
- **Key store**: `src/lib/store.ts` — all order state lives here
- **Key processing**: `src/lib/imageProcessing.ts` (paint-by-numbers) and `src/lib/stencilProcessing.ts` (stencil/glitter)
- **Key PDF generators**: `src/lib/pdfGenerator.ts` (paint-by-numbers) and `src/lib/stencilGuideGenerator.ts` (stencil/glitter)
- **Languages**: French (primary) + Arabic
- **Currency**: Tunisian Dinar (DT)
- **Delivery**: cash on delivery, Tunisian addresses only

---

## Pricing (DT)

| Kit Size | Price |
|----------|-------|
| 40×50 cm (160×200 cells) | 449 DT |
| 30×40 cm (120×160 cells) | 349 DT |
| A4 (84×119 cells) | 249 DT |
| Bundle (two sizes) | 749 DT |

---

## Current State / Known Issues

- Stencil/Glitter products are NEW (just built). The stencil preview in the PDF was all-black for several sessions — root cause traced and fixed across multiple sessions:
  1. Wrong renderer used (`renderSmoothPreview` instead of `renderStencilPreview`) → FIXED
  2. Render colors had near-zero contrast (background was near-white) → FIXED
  3. PNG format mismatch with jsPDF JPEG parameter → FIXED
  4. Stencil algorithm inverts for photos with bright backgrounds → FIXED (border-based auto-correction added)
- The live viewer for stencil products shows the correct dark/white grid (uses `STENCIL_PALETTE_SNAPSHOT`)
- Paint-by-numbers PDF generation is stable and working
