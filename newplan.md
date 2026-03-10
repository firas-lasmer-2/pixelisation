# Plan: Add Stencil Paint Reveal & Glitter Reveal Products

## Context

Helma currently sells only paint-by-numbers kits. We're adding 2 new product types:

1. **Stencil Paint Reveal** — Canvas with adhesive stencil of portrait. Customer paints randomly, peels stencil, reveals white portrait.
2. **Glitter Reveal** — Same stencil concept but with colored glitter (4 palettes: Mercury, Mars, Neptune, Jupiter).

Both products work with ALL existing categories (classic, family, kids_dream, pet). The user picks product type FIRST on the landing page, then enters the studio flow. All 3 public sizes (30x40, 40x50, 40x60) are available. Stencil products offer 3 detail levels (bold, medium, fine).

---

## Architecture Decision

Add `ProductType = "paint_by_numbers" | "stencil_paint" | "glitter_reveal"` as a new dimension alongside the existing `OrderCategory`. These are orthogonal: category = subject matter, product type = production technique.

Stencil products reuse the `indices: Uint8Array` format with a synthetic 2-4 color "stencil palette" (index 0 = background/colored area, index 1+ = portrait white levels). This maximizes reuse of manifest, viewer, and storage systems.

---

## Implementation Phases

### Phase 1: Core Types & State

**File: `src/lib/store.ts`**
- Add types:
  ```ts
  export type ProductType = "paint_by_numbers" | "stencil_paint" | "glitter_reveal";
  export type StencilDetailLevel = "bold" | "medium" | "fine";
  export type GlitterPalette = "mercury" | "mars" | "neptune" | "jupiter";
  ```
- Add `PRODUCT_TYPE_META` constant (label, description, icon per product type)
- Extend `OrderState`:
  ```ts
  productType: ProductType;              // default "paint_by_numbers"
  stencilDetailLevel: StencilDetailLevel | null;
  glitterPalette: GlitterPalette | null;
  ```
- Add context methods: `setProductType`, `setStencilDetailLevel`, `setGlitterPalette`
- `setProductType` resets downstream state (style, detail level, glitter palette)
- Update `confirmOrder` to include `productType`, `stencilDetailLevel`, `glitterPalette` in payload
- Make `selectedStyle` validation conditional: required only for `paint_by_numbers`
- Add `getAvailableAddOns(productType)` helper: `extra_paint` only for paint_by_numbers
- Add new add-on: `extra_glitter` (for glitter_reveal only)

**File: `src/lib/kitCatalog.ts`**
- Add product-type-aware pricing function or keep same prices (TBD based on user's pricing decision)

### Phase 2: Stencil Image Processing

**New file: `src/lib/stencilProcessing.ts`**

Core algorithm — converts photo to stencil mask:
1. Progressive downscale (reuse from imageProcessing.ts)
2. Grayscale conversion (luminance-weighted)
3. Bilateral filter for noise reduction (reuse from imageProcessing.ts)
4. Sigmoid contrast enhancement (reuse)
5. Adaptive multi-level thresholding:
   - `bold`: 2 levels (binary B&W) — strong Otsu threshold
   - `medium`: 3 levels — tri-level threshold with edge refinement
   - `fine`: 4 levels — fine detail with hair strands and facial features
6. Edge detection (reuse `computeEdgeMap`) for contour sharpening
7. Stencil bridge analysis — flood-fill to find disconnected background islands, add 2-3 cell wide connecting bridges
8. Small region cleanup — remove isolated regions too small to cut physically
9. Output: `StencilResult`

```ts
export interface StencilResult {
  detailLevel: StencilDetailLevel;
  indices: Uint8Array;       // 0=background, 1+=portrait levels
  gridCols: number;
  gridRows: number;
  canvas: HTMLCanvasElement;
  dataUrl: string;
  levels: number;
  bridgeCount: number;
}

export async function processStencilImage(
  imageSrc: string,
  cropData: { x: number; y: number; width: number; height: number },
  kitSize: ProcessingKitSize,
  detailLevel: StencilDetailLevel,
): Promise<StencilResult>
```

**File: `src/lib/imageProcessing.ts`** (refactor only)
- Export shared helper functions so stencilProcessing.ts can import them:
  - `progressiveDownscale()`
  - `bilateralFilter()`
  - `computeEdgeMap()`
  - `sigmoidContrast()`
  - `rgbToLab()`
- No behavioral changes — pure refactor to make functions importable

### Phase 3: Glitter Palettes

**New file: `src/lib/glitterPalettes.ts`**
- 4 glitter palette definitions: Mercury (silver/pearl), Mars (ruby/gold/copper), Neptune (ocean/teal/aqua), Jupiter (amethyst/bronze/stardust)
- Each palette: `{ name, description, colors: Array<{ name, hex, description }> }`
- `GLITTER_PALETTES: Record<GlitterPalette, GlitterPaletteDefinition>`

### Phase 4: Manifest & Persistence

**File: `src/lib/paintingManifest.ts`**
- Bump to version 5
- Add fields:
  ```ts
  productType: ProductType;                     // default "paint_by_numbers"
  stencilDetailLevel: StencilDetailLevel | null;
  stencilBridgeCount: number | null;
  glitterPalette: GlitterPalette | null;
  ```
- `artStyle` becomes optional for stencil products (set to `null`)
- Update `normalizePaintingManifest`: if `productType` missing, default to `"paint_by_numbers"` (backward compat with v4)
- Update `buildPaintingManifest` to accept `StencilResult | ProcessingResult` as union type
- For stencil manifests, generate a synthetic 2-color `paletteSnapshot` (background gray + white)

### Phase 5: Studio Wizard

**File: `src/pages/Studio.tsx`** (major changes)

Step flow changes:
- Rename `getStepMeta(category)` → `getStepMeta(category, productType)`
- For `stencil_paint`:
  - Replace "Style" step label with "Détail" (stencil detail level picker)
  - Same step count as current category flow
- For `glitter_reveal`:
  - Replace "Style" step label with "Palette" (glitter palette picker)
  - Same step count as current category flow
- Step 1 "Expérience" now includes ProductTypePicker below CategorySelector

Processing changes:
- `handleCropComplete` branches on `productType`:
  - `paint_by_numbers`: existing `processImage()` → 5 style previews
  - `stencil_paint`: `processStencilImage()` × 3 detail levels → 3 previews
  - `glitter_reveal`: `processStencilImage()` with `"medium"` default → 1 preview + palette picker

Step rendering:
- Style step: conditionally render `StencilDetailPicker` or `GlitterPalettePicker` instead of style grid
- Add-ons step: filter add-ons by product type via `getAvailableAddOns()`

**New file: `src/components/studio/ProductTypePicker.tsx`**
- 3 cards: Paint by Numbers, Stencil Paint Reveal, Glitter Reveal
- Each card: icon, name, short description, visual illustration
- Selected state with gold glow (matching existing CategorySelector style)

**New file: `src/components/studio/StencilDetailPicker.tsx`**
- 3 cards: Bold, Medium, Fine
- Each shows live preview rendered from `processStencilImage()` at that detail level
- Reuses visual style of `StylePreviewCard`

**New file: `src/components/studio/GlitterPalettePicker.tsx`**
- 4 cards: Mercury, Mars, Neptune, Jupiter
- Each shows color swatches + stencil preview tinted with palette's dominant color
- Visually similar to style selection but with glitter color circles

### Phase 6: PDF & Guide Generation

**New file: `src/lib/stencilGuideGenerator.ts`**
- Simpler PDF than paint-by-numbers (no numbered grid pages):
  - Page 1: Cover — stencil preview image, kit info, order ref
  - Page 2: Step-by-step instructions (unwrap → paint/sprinkle → dry → peel → admire)
  - Page 3: Expected result (before/after preview)
  - Page 4: Tips + care instructions
  - For glitter_reveal: extra page with glitter palette reference
- Reuse brand colors and layout helpers from pdfGenerator.ts

**File: `src/lib/pdfGenerator.ts`** (minor refactor)
- Extract shared helpers into importable functions if not already exported:
  - `renderPageHeader`, `renderPageFooter`, brand color constants

**File: `src/pages/Download.tsx`**
- Branch on `productType`:
  ```ts
  if (manifest.productType === "paint_by_numbers") {
    blob = await generatePdf(manifest);
  } else {
    blob = await generateStencilGuide(manifest);
  }
  ```

### Phase 7: Landing Page

**New file: `src/components/landing/ProductShowcase.tsx`**
- 3 product type cards displayed before CategoryShowcase
- Each card: illustration image, name, tagline, "Découvrir" CTA → `/studio?product=X`
- Visual differentiation: Paint by Numbers (gold), Stencil Paint (bronze), Glitter Reveal (sparkle purple)

**File: `src/pages/Landing.tsx`**
- Add `<ProductShowcase />` section between Hero and CategoryShowcase
- Update HowItWorks to be product-type-aware (or add tabbed view)

**File: `src/components/landing/CategoryShowcase.tsx`**
- Accept optional `productType` prop to pre-filter the CTA link

### Phase 8: i18n

**File: `src/i18n/fr.ts`**
- Add translation keys for: product types, stencil detail levels, glitter palettes, stencil guide instructions

**File: `src/i18n/ar.ts`**
- Mirror all French additions in Arabic

### Phase 9: Backend

**Database migration:**
```sql
ALTER TABLE orders ADD COLUMN product_type TEXT NOT NULL DEFAULT 'paint_by_numbers';
ALTER TABLE orders ADD COLUMN stencil_detail_level TEXT NULL;
ALTER TABLE orders ADD COLUMN glitter_palette TEXT NULL;
```

**File: `supabase/functions/create-order/index.ts`**
- Accept `productType`, `stencilDetailLevel`, `glitterPalette` in payload
- `selectedStyle` validation only for `paint_by_numbers`
- Pass new fields to `create_order_with_coupon` RPC

**File: `supabase/functions/save-abandoned-cart/index.ts`**
- Store `product_type` in cart data

**File: `supabase/functions/send-order-email/index.ts`**
- Product-type-specific email subject and body text

### Phase 10: Viewer & Pages

**File: `src/pages/ViewerPage.tsx`**
- For stencil manifests: render 2-color stencil view (gray background + white portrait)
- Change title from "Paint by Numbers" to product-type-appropriate label

**File: `src/pages/Confirmation.tsx`**
- Show product type in order summary

**File: `src/pages/admin/AdminOrders.tsx`**
- Add product_type column to orders table
- Add filter by product type

---

## Files Summary

### New files (7):
| File | Purpose |
|------|---------|
| `src/lib/stencilProcessing.ts` | Stencil image processing pipeline |
| `src/lib/glitterPalettes.ts` | Glitter palette definitions |
| `src/lib/stencilGuideGenerator.ts` | PDF guide for stencil/glitter products |
| `src/components/studio/ProductTypePicker.tsx` | Product type selection UI |
| `src/components/studio/StencilDetailPicker.tsx` | Stencil detail level picker |
| `src/components/studio/GlitterPalettePicker.tsx` | Glitter palette picker |
| `src/components/landing/ProductShowcase.tsx` | Landing page product showcase |

### Modified files (14):
| File | Change scope |
|------|-------------|
| `src/lib/store.ts` | Types, state, context methods |
| `src/lib/imageProcessing.ts` | Export shared helpers (refactor only) |
| `src/lib/paintingManifest.ts` | v5, new fields, stencil result support |
| `src/lib/pdfGenerator.ts` | Extract shared helpers |
| `src/pages/Studio.tsx` | Product type step, conditional processing, step routing |
| `src/pages/Download.tsx` | Branch PDF gen by product type |
| `src/pages/Landing.tsx` | Add ProductShowcase section |
| `src/pages/ViewerPage.tsx` | Product-type-aware rendering |
| `src/pages/Confirmation.tsx` | Show product type |
| `src/components/landing/CategoryShowcase.tsx` | Product type awareness |
| `src/i18n/fr.ts` | New translation keys |
| `src/i18n/ar.ts` | New translation keys |
| `supabase/functions/create-order/index.ts` | Accept new fields |
| `supabase/functions/save-abandoned-cart/index.ts` | Store product_type |

---

## Verification

1. **Unit test**: `stencilProcessing.ts` — test threshold outputs for known input, bridge connectivity, region cleanup
2. **Dev server**: `npm run dev` → navigate to `/studio`, select each product type, verify step flow
3. **Processing test**: Upload photo → crop → verify stencil preview renders correctly for all 3 detail levels
4. **PDF test**: Download stencil guide PDF → verify pages render correctly
5. **Manifest test**: Complete a stencil order → verify manifest saves/loads from localStorage
6. **Backward compat**: Existing paint-by-numbers orders still work (productType defaults to "paint_by_numbers")
7. **Build**: `npm run build` passes without errors
8. **Lint**: `npm run lint` passes
