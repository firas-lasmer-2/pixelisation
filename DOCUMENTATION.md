# 📖 Project Documentation — Helma

> Custom paint-by-numbers kit creator for the Tunisian market. Users upload a photo, choose a style and size, then order a physical kit delivered to their door.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Design System](#design-system)
4. [Pages & Routing](#pages--routing)
5. [Studio Workflow (5-Step Flow)](#studio-workflow)
6. [Landing Page Sections](#landing-page-sections)
7. [State Management](#state-management)
8. [Internationalization (i18n)](#internationalization-i18n)
9. [Utility Libraries](#utility-libraries)
10. [Shared Components](#shared-components)
11. [Key Design Decisions](#key-design-decisions)

---

## Tech Stack

| Layer        | Technology                              |
| ------------ | --------------------------------------- |
| Framework    | React 18 + TypeScript                   |
| Build        | Vite                                    |
| Styling      | Tailwind CSS + shadcn/ui components     |
| Routing      | React Router v6                         |
| State        | React Context (`OrderProvider`)         |
| Data fetch   | TanStack React Query                    |
| Fonts        | Playfair Display (headings) + Inter (body) |
| PDF          | jsPDF                                   |
| Image crop   | react-easy-crop                         |
| Icons        | Lucide React                            |
| Testing      | Vitest                                  |

---

## Project Structure

```
src/
├── assets/                  # Imported images (ES6 modules)
├── components/
│   ├── landing/             # Landing page sections
│   │   ├── Hero.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── StyleShowcase.tsx
│   │   ├── KitExplainer.tsx
│   │   ├── SizeVisualComparison.tsx  # Interactive visual canvas sizes
│   │   ├── SizeComparison.tsx        # Specs comparison table
│   │   ├── Testimonials.tsx
│   │   ├── CTABanner.tsx
│   │   ├── FAQ.tsx
│   │   └── Footer.tsx
│   ├── shared/              # Reusable across pages
│   │   ├── Navbar.tsx
│   │   ├── PromoBanner.tsx
│   │   ├── LanguageSwitcher.tsx
│   │   ├── WhatsAppButton.tsx
│   │   ├── SocialProofToast.tsx
│   │   └── SaveProgressModal.tsx
│   ├── viewer/              # PDF viewer components
│   │   ├── ColorTooltip.tsx
│   │   ├── PalettePanel.tsx
│   │   ├── ProgressRing.tsx
│   │   ├── SectionMinimap.tsx
│   │   └── ViewerToolbar.tsx
│   ├── ui/                  # shadcn/ui primitives
│   ├── CropScreen.tsx       # Step 3: crop interface
│   ├── GridViewer.tsx        # Grid overlay viewer
│   ├── ProcessingScreen.tsx  # Processing animation
│   ├── ResultsScreen.tsx     # Results display
│   └── UploadZone.tsx        # Step 2: photo upload
├── hooks/
│   ├── use-mobile.tsx        # Mobile breakpoint detection
│   ├── use-toast.ts          # Toast notifications
│   └── useScrollReveal.ts    # Intersection Observer scroll animations
├── i18n/
│   ├── index.ts              # I18n provider & useTranslation hook
│   ├── fr.ts                 # French translations
│   └── ar.ts                 # Arabic translations (RTL supported)
├── lib/
│   ├── store.ts              # OrderContext, pricing, constants
│   ├── imageProcessing.ts    # Canvas-based image manipulation
│   ├── palettes.ts           # Color palette definitions
│   ├── pdfGenerator.ts       # PDF generation for paint-by-numbers
│   ├── certificateGenerator.ts # Certificate PDF creation
│   └── utils.ts              # cn() and general utilities
├── pages/
│   ├── Landing.tsx           # Home / marketing page
│   ├── Studio.tsx            # 5-step order flow
│   ├── Confirmation.tsx      # Order confirmed
│   ├── Download.tsx          # Download kit files
│   ├── Track.tsx             # Order tracking
│   ├── Gallery.tsx           # Customer gallery
│   ├── ViewerPage.tsx        # PDF viewer page
│   ├── MyPainting.tsx        # Personal painting page
│   └── NotFound.tsx          # 404 page
├── index.css                 # Global styles, CSS variables, animations
└── main.tsx                  # App entry point
```

---

## Design System

### Color Palette (HSL tokens in `index.css`)

| Token           | Light Mode             | Purpose              |
| --------------- | ---------------------- | -------------------- |
| `--background`  | `37 53% 96%`           | Off-white / cream    |
| `--foreground`  | `0 0% 17%`             | Near-black text      |
| `--primary`     | `40 64% 55%`           | Gold accent          |
| `--accent`      | `354 42% 32%`          | Burgundy accent      |
| `--muted`       | `33 8% 88%`            | Subtle backgrounds   |
| `--border`      | `33 15% 85%`           | Soft borders         |
| `--card`        | `0 0% 100%`            | White cards          |

Dark mode is fully supported with matching dark tokens.

### Typography

- **Headings**: `font-serif` → Playfair Display (400–800 weights)
- **Body**: `font-sans` → Inter (400–700 weights)
- Loaded via Google Fonts in `index.css`

### Custom Utility Classes (defined in `index.css`)

| Class              | Purpose                                       |
| ------------------ | --------------------------------------------- |
| `.scroll-reveal`   | Fade-up on scroll via IntersectionObserver     |
| `.gold-glow`       | Gold box-shadow for selected/active elements   |
| `.step-gold-pulse` | Animated gold ring pulse for step indicators   |
| `.glass-summary`   | Glassmorphism card (backdrop-blur + border)    |
| `.btn-premium`     | Gold gradient button with shimmer animation    |
| `.studio-bg`       | Subtle dot-grid background pattern             |
| `.hover-scale`     | Scale 1.05 on hover                           |

---

## Pages & Routing

| Route                | Page Component    | Description                          |
| -------------------- | ----------------- | ------------------------------------ |
| `/`                  | `Landing`         | Marketing landing page               |
| `/studio`            | `Studio`          | 5-step kit creation flow             |
| `/confirmation`      | `Confirmation`    | Order confirmation + reference code  |
| `/download`          | `Download`        | Download kit PDF files               |
| `/track`             | `Track`           | Track order status                   |
| `/gallery`           | `Gallery`         | Community/customer gallery           |
| `/viewer/:code`      | `ViewerPage`      | Interactive PDF section viewer       |
| `/my-painting/:code` | `MyPainting`      | Personal painting progress page      |
| `*`                  | `NotFound`        | 404 fallback                         |

---

## Studio Workflow

The Studio page implements a **5-step linear flow**, each rendered as a full-page section:

### Step 1 — Kit Selection
- Three size options: A4 (21×30cm), 30×40cm, 40×50cm
- Premium cards with color-coded accents (green/gold/burgundy)
- Shows savings percentage badge, specs, and relative canvas scale
- Kit contents strip (canvas, paints, brushes, guide)

### Step 2 — Photo Upload
- Drag & drop or file picker (`UploadZone` component)
- Sample photos available for testing
- Tips for best results (portraits, couples, pets)
- Accepts JPG, PNG, WebP

### Step 3 — Crop & Adjust
- `react-easy-crop` with aspect ratio locked to selected size
- Zoom slider control
- Real-time crop preview

### Step 4 — Style Selection
- Three art styles: Original, Vintage, Pop Art
- Style preview thumbnails
- Selected style gets gold glow border

### Step 5 — Confirmation & Order
- Contact info form (name, phone, email)
- Shipping form (address, city, governorate, postal code)
- Tunisian governorates dropdown (24 options)
- Gift option with custom message
- Order summary card with glassmorphism effect
- Gold gradient confirm button

### Navigation
- Step indicator with numbered gold circles + connecting lines
- Active step has animated gold pulse ring
- Completed steps show gold-filled checkmark
- Back/Next buttons with step validation

---

## Landing Page Sections

Rendered in order in `Landing.tsx`:

1. **PromoBanner** — Top sticky promotional strip
2. **Navbar** — Frosted glass navigation with logo, links, language switcher
3. **Hero** — Full-width hero with CTA and social proof
4. **HowItWorks** — 4-step visual process explanation
5. **StyleShowcase** — Art style previews (original, vintage, pop art)
6. **KitExplainer** — What's included in the physical kit
7. **SizeVisualComparison** — Interactive proportional canvas frames with click-to-reveal details
8. **SizeComparison** — Detailed specs comparison table (cells, colors, sections, difficulty)
9. **Testimonials** — Customer reviews
10. **CTABanner** — Final call-to-action section
11. **FAQ** — Accordion-style frequently asked questions
12. **Footer** — Links, contact, social media

---

## State Management

### `OrderProvider` (React Context in `src/lib/store.ts`)

Global state for the entire order flow:

```typescript
interface OrderState {
  photo: string;              // Base64 data URL
  croppedArea: Area | null;   // Crop coordinates
  selectedStyle: ArtStyle;    // "original" | "vintage" | "pop_art"
  stylePreviewUrl: string;    // Preview image URL
  selectedSize: KitSize;      // "stamp_kit_40x50" | "stamp_kit_30x40" | "stamp_kit_A4"
  contact: ContactInfo;       // firstName, lastName, phone, email
  shipping: ShippingInfo;     // address, city, governorate, postalCode
  orderRef: string;           // Generated on confirm (FK-XXXXX)
  instructionCode: string;    // Random 6-char code
  isGift: boolean;
  giftMessage: string;
}
```

### Pricing Constants

| Size       | Price  | Original | Bundle        |
| ---------- | ------ | -------- | ------------- |
| A4         | 249 DT | 329 DT   | —             |
| 30×40 cm   | 349 DT | 429 DT   | —             |
| 40×50 cm   | 449 DT | 549 DT   | —             |
| Bundle     | 749 DT | 898 DT   | 2-kit bundle  |

---

## Internationalization (i18n)

### Supported Locales

- **French (`fr`)** — Default, LTR
- **Arabic (`ar`)** — RTL support

### Implementation

- `I18nProvider` wraps the app, provides `useTranslation()` hook
- Locale persisted in `localStorage` (`helma-locale`)
- `document.dir` and `document.lang` auto-updated on locale change
- Translation files: `src/i18n/fr.ts`, `src/i18n/ar.ts`

---

## Utility Libraries

### `imageProcessing.ts`
Canvas-based image manipulation for applying art styles to uploaded photos.

### `palettes.ts`
Predefined color palettes used for the paint-by-numbers grid system.

### `pdfGenerator.ts`
Generates downloadable PDF files containing the numbered painting grid, color legend, and section maps using jsPDF.

### `certificateGenerator.ts`
Creates a completion certificate PDF that users can download after finishing their painting.

### `useScrollReveal.ts`
Custom hook using IntersectionObserver to trigger `.scroll-reveal` CSS animations when elements enter the viewport.

---

## Shared Components

| Component           | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `Navbar`            | Frosted glass nav with links + language switcher   |
| `PromoBanner`       | Sticky promotional banner at top                   |
| `WhatsAppButton`    | Floating WhatsApp contact button                   |
| `SocialProofToast`  | Auto-appearing social proof notifications          |
| `LanguageSwitcher`  | FR/AR language toggle                              |
| `SaveProgressModal` | Modal to save in-progress orders                   |

---

## Key Design Decisions

### 1. Five-Step Studio Flow
The kit selection and photo upload were separated into distinct steps for clarity. Users reported confusion when both were on the same page. Each step now has its own full-page section with clear navigation.

### 2. Premium Editorial Aesthetic
The design follows a luxury editorial direction with:
- Gold (#B8860B) + Burgundy (#722F37) + Off-white (#FAF7F2) palette
- Playfair Display serif headings for elegance
- Glassmorphism effects on summary cards
- Gold shimmer animations on primary CTAs

### 3. Tunisian Market Focus
- Prices in Tunisian Dinar (DT)
- Cash on delivery payment model
- 24 Tunisian governorates in shipping form
- French as primary language with Arabic RTL support
- WhatsApp as primary customer support channel

### 4. Supabase-Backed Operations
The storefront uses Supabase for order persistence, tracking, admin auth, storage, email triggers, and public edge functions such as order creation and tracking verification.

### 5. Scroll-Reveal Animations
All landing page sections use IntersectionObserver-based reveal animations for a polished, progressive disclosure experience without impacting initial page load.

---

## File Size Notes

- `src/pages/Studio.tsx` — Largest file, contains the full 5-step flow. Consider extracting each step into its own component if further features are added.
- `src/components/landing/SizeComparison.tsx` — Comparison table, could be merged with or replaced by `SizeVisualComparison.tsx`.

---

*Last updated: March 2026*
