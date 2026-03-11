# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server (port 8080)
npm run build        # Production build
npm run build:dev    # Dev-mode build
npm run preview      # Preview production build
npm run lint         # ESLint
npm run test         # Run tests once (vitest)
npm run test:watch   # Run tests in watch mode
npx vitest run src/lib/palettes.test.ts  # Run a single test file
```

Supabase edge functions are deployed via the Supabase CLI (`supabase functions deploy <name>`). Local dev of edge functions requires `supabase start`.

## Project Overview

**Helma** (`helma.tn`) is a Tunisian e-commerce platform that converts photos into paint-by-numbers kits. The entire image processing pipeline runs **client-side in browser canvas** — no server involved.

## Architecture

### Global State
`src/lib/store.ts` — `OrderProvider` / `useOrder()` context holds the entire order flow state (`OrderState`). This is the single source of truth for the multi-step Studio wizard. Call `useOrder()` inside any component that needs order data.

Key constants exported from `store.ts`: `PRICING`, `CATEGORY_META`, `DREAM_JOBS`, `TUNISIAN_GOVERNORATES`, `SIZE_LABELS`.

### Core Libraries
| File | Purpose |
|---|---|
| `src/lib/imageProcessing.ts` | Full image → pixel-grid pipeline: progressive downscale, bilateral filter, sigmoid contrast, Laplacian sharpen, CIELAB deltaE quantization, edge-aware denoising |
| `src/lib/palettes.ts` | DMC-style color palettes in CIELAB space. `PALETTES` for 30×40/40×50, `COMPACT_PALETTES` for A4. Style keys: `original`, `vintage`, `popart` |
| `src/lib/paintingManifest.ts` | `PaintingManifest` (v3) type, build/normalize/persist logic. Manifest stored in localStorage with `helma-viewer-data-{CODE}` key |
| `src/lib/pdfGenerator.ts` | jsPDF multi-page booklet: cover, studio guide, color legend, grid sections (12 per page), assembly tips |
| `src/lib/dedicationOverlay.ts` | Burns a personalized text plaque onto the pixel grid at the bottom-right using canvas mask rendering |
| `src/lib/brand.ts` | Brand constants (`BRAND`, `STORAGE_KEYS`), URL builders (`buildViewerUrl`, `buildTrackUrl`), legacy `flink-` → `helma-` storage key migration |

### Key Types
```ts
OrderCategory = "classic" | "family" | "kids_dream" | "pet"
KitSize       = "stamp_kit_40x50" | "stamp_kit_30x40" | "stamp_kit_A4"
ArtStyle      = "original" | "vintage" | "pop_art"
```

Grid dimensions (2.5mm cells):
- `stamp_kit_40x50` → 160 × 200 cells
- `stamp_kit_30x40` → 120 × 160 cells
- `stamp_kit_A4`    → 84 × 119 cells

**Style → palette key mapping**: `pop_art` maps to `popart` (use `orderStyleToPaletteKey()` from `paintingManifest.ts`).

### Pages & Routing (src/App.tsx)
- `/` — Landing page
- `/studio` — Multi-step order wizard (category → upload → crop → AI gen → style → size → contact/shipping → confirm)
- `/confirmation` — Post-order summary
- `/download` — PDF generation from `PaintingManifest`
- `/track` — Order tracking
- `/viewer/:code` — Interactive pixel-grid viewer (loads manifest from localStorage then Supabase)
- `/my-painting/:code` — Customer painting status page
- `/admin/*` — Admin panel (login, dashboard, orders, coupons, abandoned carts, regenerations)

### Supabase Edge Functions (`supabase/functions/`)
| Function | Purpose |
|---|---|
| `create-order` | Validates order, calls `create_order_with_coupon` RPC, uploads photos to `order-photos` bucket, sends confirmation email |
| `upsert-painting-manifest` | Saves `PaintingManifest` JSON to Supabase for remote viewer access |
| `get-painting-manifest` | Fetches manifest by instruction code |
| `send-order-email` | Transactional email via `_shared/mail.ts` |
| `track-order` | Order status lookup |
| `save-abandoned-cart` / `send-cart-recovery` / `recover-cart` | Cart recovery flow |
| `generate-creative` | AI image generation for family/kids_dream/pet categories |
| `regeneration-request` | Admin-triggered image regeneration |

Shared code in `supabase/functions/_shared/`: `cors.ts`, `mail.ts`, `brand.ts`.

### i18n
`src/i18n/` — French (`fr.ts`) and Arabic (`ar.ts`). `I18nProvider` wraps the app; use `useTranslation()` hook for translated strings.

### UI Components
- `src/components/ui/` — shadcn/ui primitives (Radix UI based)
- `src/components/shared/` — Shared layout (Navbar, Footer, WhatsAppButton, PromoBanner, LanguageSwitcher)
- `src/components/studio/` — Studio wizard sub-components
- `src/components/viewer/` — Viewer toolbar, palette panel, section minimap, color tooltip
- `src/components/admin/` — Admin dashboard charts and layout

## Important Conventions

- **Path alias**: `@/` maps to `src/` (configured in vite, vitest, and tsconfig). Always use `@/` imports.
- **TypeScript strictness**: `strictNullChecks` and `noImplicitAny` are **off**. Don't add explicit null guards where the project style doesn't use them.
- **KitSize in `imageProcessing.ts` vs `store.ts`**: `imageProcessing.ts` uses `"40x50" | "30x40" | "A4"` (short form), while `store.ts` uses `"stamp_kit_40x50"` etc. The Studio maps between them when calling `processImage()`.
- **Dedication text**: Max 22 chars, no emoji, sanitized via `sanitizeDedicationText()`. Applied by `applyDedicationOverlay()` which modifies the `indices` array and returns a `PaintingDedication` metadata object.
- **Manifest versioning**: `normalizePaintingManifest()` handles both legacy viewer data format and v3 manifests. Always use it when reading raw manifest JSON.
- **Pricing** (DT): 40×50 → 449, 30×40 → 349, A4 → 249. Bundle price 749 DT. Defined in both `store.ts` (frontend display) and `create-order/index.ts` (server-side validation).
- **Phone validation**: Tunisia — must be exactly 8 digits after stripping non-digits.

## Environment Variables

Frontend (prefixed with `VITE_`):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

Edge functions:
- `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL` (optional)
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `HELMA_SITE_URL`, `HELMA_SUPPORT_EMAIL`
