import type { ProcessingKitSize } from "./kitCatalog";
import type { ArtStyle } from "./store";
import { normalizeArtStyle } from "./styles";

export interface PaletteColor {
  name: string;
  ref: string;
  r: number;
  g: number;
  b: number;
  hex: string;
  L: number;
  a: number;
  bLab: number;
}

export interface StylePalette {
  name: string;
  description: string;
  colors: PaletteColor[];
}

type PaletteTier = "legacy" | "public_standard" | "public_premium";

const COLOR_LABEL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function srgbToLinear(c: number): number {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  return [
    (0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) * 100,
    (0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb) * 100,
    (0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb) * 100,
  ];
}

function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const xn = 95.047;
  const yn = 100.0;
  const zn = 108.883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x / xn);
  const fy = f(y / yn);
  const fz = f(z / zn);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

function c(name: string, hex: string, ref: string): PaletteColor {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const [L, a, bLab] = rgbToLab(r, g, b);
  return { name, ref, r, g, b, hex, L, a, bLab };
}

function clonePalette(palette: StylePalette): StylePalette {
  return {
    ...palette,
    colors: palette.colors.map((color) => ({ ...color })),
  };
}

function resolvePaletteTier(kitSize: ProcessingKitSize): PaletteTier {
  if (kitSize === "30x40" || kitSize === "A3") return "public_standard";
  if (kitSize === "40x50" || kitSize === "40x60" || kitSize === "A2") return "public_premium";
  return "legacy";
}
const PALETTE_LIBRARY: Record<ArtStyle, Record<PaletteTier, StylePalette>> = {
  original: {
    legacy: {
      name: "Original",
      description: "8 distinct grays - evenly spaced for simple legacy kits.",
      colors: [
        c("White", "#F5F5F5", "Titanium White"),
        c("Light Gray", "#C8C8C8", "Light Gray"),
        c("Silver", "#9A9A9A", "Silver Gray"),
        c("Medium Gray", "#727272", "Medium Gray"),
        c("Dim Gray", "#505050", "Dim Gray"),
        c("Dark Gray", "#323232", "Dark Gray"),
        c("Charcoal", "#1A1A1A", "Charcoal"),
        c("Black", "#080808", "Mars Black"),
      ],
    },
    public_standard: {
      name: "Original",
      description: "Natural portrait palette with clear skin-tone separation, cool shadows, and warm highlights.",
      colors: [
        c("Cream", "#F7F0E3", "Unbleached Titanium"),
        c("Peach", "#E4B48C", "Portrait Pink"),
        c("Golden Ochre", "#C8962E", "Yellow Ochre"),
        c("Terra Rose", "#C06A5A", "Venetian Red"),
        c("Sage Green", "#6A9B6A", "Sap Green"),
        c("Steel Blue", "#5580B0", "Cerulean Blue"),
        c("Chestnut", "#8B4528", "Burnt Sienna"),
        c("Walnut", "#5C3A22", "Burnt Umber"),
        c("Slate", "#3E5068", "Payne's Grey"),
        c("Carbon", "#0E1118", "Mars Black"),
      ],
    },
    public_premium: {
      name: "Original",
      description: "Extended natural palette with refined transitions from warm skin to cool backgrounds.",
      colors: [
        c("Cream", "#F7F0E3", "Unbleached Titanium"),
        c("Warm Ivory", "#EEDCC0", "Naples Yellow"),
        c("Peach", "#E4B48C", "Portrait Pink"),
        c("Golden Ochre", "#C8962E", "Yellow Ochre"),
        c("Terra Rose", "#C06A5A", "Venetian Red"),
        c("Sage Green", "#6A9B6A", "Sap Green"),
        c("Steel Blue", "#5580B0", "Cerulean Blue"),
        c("Chestnut", "#8B4528", "Burnt Sienna"),
        c("Walnut", "#5C3A22", "Burnt Umber"),
        c("Slate", "#3E5068", "Payne's Grey"),
        c("Blue Shadow", "#2C3E55", "Indigo"),
        c("Carbon", "#0E1118", "Mars Black"),
      ],
    },
  },
  vintage: {
    legacy: {
      name: "Sépia",
      description: "8 warm browns — vellum to espresso, pure monochromatic duotone.",
      colors: [
        c("Vellum",     "#FAF0E0", "Unbleached Titanium"),
        c("Ivory",      "#F0D8A8", "Naples Yellow"),
        c("Sand",       "#D4A660", "Yellow Ochre"),
        c("Amber",      "#8C5020", "Raw Sienna"),
        c("Sienna",     "#6A3010", "Burnt Sienna"),
        c("Umber",      "#501808", "Raw Umber"),
        c("Espresso",   "#260A02", "Burnt Umber"),
        c("Near Black", "#160402", "Ivory Black"),
      ],
    },
    public_standard: {
      name: "Sépia",
      description: "Warm monochromatic duotone — only browns from vellum to espresso, no blues or greens.",
      colors: [
        c("Vellum",     "#FAF0E0", "Unbleached Titanium"),
        c("Ivory",      "#F0D8A8", "Naples Yellow"),
        c("Sand",       "#D4A660", "Yellow Ochre"),
        c("Ochre",      "#B07830", "Yellow Ochre Deep"),
        c("Amber",      "#8C5020", "Raw Sienna"),
        c("Sienna",     "#6A3010", "Burnt Sienna"),
        c("Umber",      "#501808", "Raw Umber"),
        c("Dark Brown", "#3A1006", "Burnt Umber"),
        c("Espresso",   "#260A02", "Ivory Black"),
        c("Near Black", "#160402", "Mars Black"),
      ],
    },
    public_premium: {
      name: "Sépia",
      description: "Extended warm duotone with finer mid-tone steps through 12 pure browns.",
      colors: [
        c("Vellum",     "#FAF0E0", "Unbleached Titanium"),
        c("Ivory",      "#F0D8A8", "Naples Yellow"),
        c("Straw",      "#E8CA88", "Buff Titanium"),
        c("Sand",       "#D4A660", "Yellow Ochre"),
        c("Ochre",      "#B07830", "Yellow Ochre Deep"),
        c("Copper",     "#A86030", "Raw Sienna Light"),
        c("Amber",      "#8C5020", "Raw Sienna"),
        c("Sienna",     "#6A3010", "Burnt Sienna"),
        c("Umber",      "#501808", "Raw Umber"),
        c("Dark Brown", "#3A1006", "Burnt Umber"),
        c("Espresso",   "#260A02", "Ivory Black"),
        c("Near Black", "#160402", "Mars Black"),
      ],
    },
  },
  grayscale: {
    legacy: {
      name: "Noir & Blanc",
      description: "8 pure grays — high contrast monochrome.",
      colors: [
        c("Pure White", "#FFFFFF", "Titanium White"),
        c("Soft Gray", "#E2E2E2", "Light Gray"),
        c("Silver", "#C0C0C0", "Silver Gray"),
        c("Ash", "#9A9A9A", "Medium Gray"),
        c("Steel", "#727272", "Dark Gray"),
        c("Gunmetal", "#4A4A4A", "Payne's Grey"),
        c("Charcoal", "#262626", "Lamp Black"),
        c("True Black", "#000000", "Mars Black"),
      ],
    },
    public_standard: {
      name: "Noir & Blanc",
      description: "Classic black and white photography look with clear tonal steps.",
      colors: [
        c("Pure White", "#FFFFFF", "Titanium White"),
        c("Ice Gray", "#F0F0F0", "Light Gray Light"),
        c("Soft Gray", "#E2E2E2", "Light Gray"),
        c("Silver", "#C0C0C0", "Silver Gray"),
        c("Ash", "#9A9A9A", "Medium Gray"),
        c("Steel", "#727272", "Dark Gray"),
        c("Gunmetal", "#4A4A4A", "Payne's Grey"),
        c("Charcoal", "#262626", "Lamp Black"),
        c("Deep Shadow", "#141414", "Ivory Black"),
        c("True Black", "#000000", "Mars Black"),
      ],
    },
    public_premium: {
      name: "Noir & Blanc",
      description: "Extended grayscale palette for maximum detail and smooth monochrome gradients.",
      colors: [
        c("Pure White", "#FFFFFF", "Titanium White"),
        c("Ice Gray", "#F0F0F0", "Light Gray Light"),
        c("Soft Gray", "#E2E2E2", "Light Gray"),
        c("Mist", "#D2D2D2", "Light Gray Dark"),
        c("Silver", "#C0C0C0", "Silver Gray"),
        c("Ash", "#9A9A9A", "Medium Gray"),
        c("Steel", "#727272", "Dark Gray"),
        c("Gunmetal", "#4A4A4A", "Payne's Grey"),
        c("Charcoal", "#262626", "Lamp Black"),
        c("Onyx", "#1E1E1E", "Lamp Black Deep"),
        c("Deep Shadow", "#141414", "Ivory Black"),
        c("True Black", "#000000", "Mars Black"),
      ],
    },
  },
};

export function getColorLabel(index: number): string {
  if (!Number.isFinite(index) || index < 0) return "?";

  let value = Math.floor(index);
  let label = "";

  do {
    label = COLOR_LABEL_ALPHABET[value % 26] + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);

  return label;
}

export function getTargetColorCount(kitSize: ProcessingKitSize) {
  return resolvePaletteForProcessing("original", kitSize).colors.length;
}

export function resolvePaletteForProcessing(style: ArtStyle | string, kitSize: ProcessingKitSize): StylePalette {
  const normalizedStyle = normalizeArtStyle(style);
  const tier = resolvePaletteTier(kitSize);
  return clonePalette(PALETTE_LIBRARY[normalizedStyle][tier] || PALETTE_LIBRARY.original.legacy);
}

export function resolveLegacyPalette(style: ArtStyle | string): StylePalette {
  const normalizedStyle = normalizeArtStyle(style);
  return clonePalette(PALETTE_LIBRARY[normalizedStyle].legacy || PALETTE_LIBRARY.original.legacy);
}

export function getShowcasePalette(style: ArtStyle | string) {
  return resolvePaletteForProcessing(style, "30x40");
}
