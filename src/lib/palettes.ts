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
      name: "Vintage",
      description: "8 warm earth tones for the original legacy vintage look.",
      colors: [
        c("Cream", "#F5EDDA", "Unbleached Titanium"),
        c("Yellow Ochre", "#D4AA70", "Yellow Ochre"),
        c("Raw Sienna", "#A07040", "Raw Sienna"),
        c("Burnt Sienna", "#8B4C2A", "Burnt Sienna"),
        c("Terra Cotta", "#6E3018", "Terra Cotta Red"),
        c("Raw Umber", "#503020", "Raw Umber"),
        c("Burnt Umber", "#3A2010", "Burnt Umber"),
        c("Near Black", "#150C04", "Ivory Black"),
      ],
    },
    public_standard: {
      name: "Vintage",
      description: "Rich sepia palette with golden highlights and deep warm shadows.",
      colors: [
        c("Parchment", "#F5ECD5", "Unbleached Titanium"),
        c("Gold Highlight", "#DBAD42", "Yellow Ochre Deep"),
        c("Amber", "#C4862E", "Raw Sienna"),
        c("Dusty Rose", "#B86A60", "Venetian Red"),
        c("Olive", "#6E7A3A", "Olive Green"),
        c("Copper", "#9E5028", "Burnt Sienna"),
        c("Umber", "#6B3E1E", "Raw Umber"),
        c("Forest", "#3A4A28", "Hooker's Green"),
        c("Sepia", "#2E1A0E", "Burnt Umber"),
        c("Near Black", "#120C06", "Ivory Black"),
      ],
    },
    public_premium: {
      name: "Vintage",
      description: "Expanded warm palette with richer accents and deeper antiqued shadows.",
      colors: [
        c("Parchment", "#F5ECD5", "Unbleached Titanium"),
        c("Straw", "#E8CFA0", "Buff Titanium"),
        c("Gold Highlight", "#DBAD42", "Yellow Ochre Deep"),
        c("Amber", "#C4862E", "Raw Sienna"),
        c("Dusty Rose", "#B86A60", "Venetian Red"),
        c("Olive", "#6E7A3A", "Olive Green"),
        c("Copper", "#9E5028", "Burnt Sienna"),
        c("Umber", "#6B3E1E", "Raw Umber"),
        c("Forest", "#3A4A28", "Hooker's Green"),
        c("Burgundy", "#5C1A2A", "Alizarin Crimson"),
        c("Sepia", "#2E1A0E", "Burnt Umber"),
        c("Near Black", "#120C06", "Ivory Black"),
      ],
    },
  },
  pop_art: {
    legacy: {
      name: "Pop Art",
      description: "8 vivid legacy colors with strong Warhol-inspired contrast.",
      colors: [
        c("White", "#F8F3EB", "Titanium White"),
        c("Yellow", "#FFD600", "Cadmium Yellow"),
        c("Orange", "#FF6B00", "Cadmium Orange"),
        c("Red", "#E81028", "Cadmium Red"),
        c("Magenta", "#CC0068", "Quinacridone Magenta"),
        c("Violet", "#6500B8", "Dioxazine Violet"),
        c("Blue", "#0097D8", "Cerulean Blue"),
        c("Black", "#0C0A08", "Mars Black"),
      ],
    },
    public_standard: {
      name: "Pop Art",
      description: "Maximum chroma Warhol palette — pure primaries and secondaries, no muted tones.",
      colors: [
        c("Pure White", "#FEFCF8", "Titanium White"),
        c("Cadmium Yellow", "#FFD500", "Cadmium Yellow"),
        c("Cadmium Orange", "#FF6D00", "Cadmium Orange"),
        c("Cadmium Red", "#E81020", "Cadmium Red"),
        c("Hot Pink", "#FF1493", "Quinacridone Magenta"),
        c("Violet", "#7B20D0", "Dioxazine Violet"),
        c("Electric Blue", "#0066FF", "Phthalo Blue"),
        c("Cyan", "#00B4E6", "Cerulean Blue"),
        c("Lime Green", "#66CC00", "Permanent Green"),
        c("Jet Black", "#0A0808", "Mars Black"),
      ],
    },
    public_premium: {
      name: "Pop Art",
      description: "Expanded maximum chroma palette with full rainbow coverage for bold posterized prints.",
      colors: [
        c("Pure White", "#FEFCF8", "Titanium White"),
        c("Cadmium Yellow", "#FFD500", "Cadmium Yellow"),
        c("Cadmium Orange", "#FF6D00", "Cadmium Orange"),
        c("Cadmium Red", "#E81020", "Cadmium Red"),
        c("Hot Pink", "#FF1493", "Quinacridone Magenta"),
        c("Deep Magenta", "#CC0077", "Permanent Rose"),
        c("Violet", "#7B20D0", "Dioxazine Violet"),
        c("Royal Blue", "#0044CC", "Ultramarine Blue"),
        c("Electric Blue", "#0066FF", "Phthalo Blue"),
        c("Cyan", "#00B4E6", "Cerulean Blue"),
        c("Lime Green", "#66CC00", "Permanent Green"),
        c("Jet Black", "#0A0808", "Mars Black"),
      ],
    },
  },
  watercolor: {
    legacy: {
      name: "Watercolor",
      description: "8 soft washes for internal or legacy kits.",
      colors: [
        c("Paper White", "#FAF5EB", "Titanium White"),
        c("Petal Pink", "#E8C5C2", "Portrait Pink"),
        c("Apricot", "#E7C29B", "Naples Yellow"),
        c("Buttercream", "#E7D89A", "Naples Yellow Deep"),
        c("Mist Sage", "#B6C7B0", "Green Gold"),
        c("Cornflower", "#9DB3D8", "Cerulean Blue"),
        c("Lavender", "#B6A2CC", "Dioxazine Violet"),
        c("Ink", "#3A4654", "Payne's Grey"),
      ],
    },
    public_standard: {
      name: "Watercolor",
      description: "Airy pastel washes with distinct hues — cool and chromatic with minimal warm neutrals.",
      colors: [
        c("Paper White", "#FAF6F0", "Titanium White"),
        c("Blush Pink", "#F0A0A8", "Permanent Rose"),
        c("Peach Wash", "#F0C090", "Naples Yellow"),
        c("Lemon Wash", "#E8DC80", "Naples Yellow Deep"),
        c("Mint Green", "#80CCA0", "Cobalt Teal"),
        c("Sky Blue", "#78B8E8", "Cerulean Blue"),
        c("Lavender", "#A090D8", "Dioxazine Violet"),
        c("Warm Shadow", "#887060", "Raw Umber"),
        c("Ink", "#2C3848", "Payne's Grey"),
        c("Deep Indigo", "#1A2438", "Indigo"),
      ],
    },
    public_premium: {
      name: "Watercolor",
      description: "Expanded pastel wash palette with full hue range and delicate floral tones.",
      colors: [
        c("Paper White", "#FAF6F0", "Titanium White"),
        c("Blush Pink", "#F0A0A8", "Permanent Rose"),
        c("Coral Wash", "#E8907A", "Cadmium Red Light"),
        c("Peach Wash", "#F0C090", "Naples Yellow"),
        c("Lemon Wash", "#E8DC80", "Naples Yellow Deep"),
        c("Mint Green", "#80CCA0", "Cobalt Teal"),
        c("Sky Blue", "#78B8E8", "Cerulean Blue"),
        c("Lavender", "#A090D8", "Dioxazine Violet"),
        c("Warm Shadow", "#887060", "Raw Umber"),
        c("Ink", "#2C3848", "Payne's Grey"),
        c("Deep Indigo", "#1A2438", "Indigo"),
        c("Charcoal", "#101418", "Mars Black"),
      ],
    },
  },
  poster: {
    legacy: {
      name: "Poster",
      description: "8 clean graphic colors for internal or legacy kits.",
      colors: [
        c("Off White", "#F6F1E7", "Titanium White"),
        c("Mustard", "#C49A2E", "Yellow Ochre"),
        c("Vermilion", "#D8563A", "Cadmium Red Light"),
        c("Coral", "#D17B78", "Permanent Rose"),
        c("Olive", "#798155", "Olive Green"),
        c("Teal", "#3E8A88", "Phthalo Green"),
        c("Cobalt", "#4574B6", "Cobalt Blue"),
        c("Charcoal", "#1A1C20", "Mars Black"),
      ],
    },
    public_standard: {
      name: "Poster",
      description: "Bold graphic palette — maximum hue spread, each color unmistakable. Screen-print look.",
      colors: [
        c("White", "#F8F4EA", "Titanium White"),
        c("Signal Yellow", "#E8B800", "Cadmium Yellow"),
        c("Scarlet", "#D83028", "Cadmium Red"),
        c("Deep Magenta", "#B8206A", "Permanent Rose"),
        c("Forest Green", "#2A7840", "Permanent Green"),
        c("Teal", "#1A8888", "Phthalo Green"),
        c("Cobalt Blue", "#2260B8", "Cobalt Blue"),
        c("Deep Purple", "#5A2888", "Dioxazine Violet"),
        c("Dark Umber", "#4A2E18", "Burnt Umber"),
        c("True Black", "#101214", "Mars Black"),
      ],
    },
    public_premium: {
      name: "Poster",
      description: "Expanded graphic palette — full hue wheel coverage for bold, flat screen-print blocks.",
      colors: [
        c("White", "#F8F4EA", "Titanium White"),
        c("Signal Yellow", "#E8B800", "Cadmium Yellow"),
        c("Burnt Orange", "#D87020", "Cadmium Orange"),
        c("Scarlet", "#D83028", "Cadmium Red"),
        c("Deep Magenta", "#B8206A", "Permanent Rose"),
        c("Forest Green", "#2A7840", "Permanent Green"),
        c("Teal", "#1A8888", "Phthalo Green"),
        c("Cobalt Blue", "#2260B8", "Cobalt Blue"),
        c("Deep Purple", "#5A2888", "Dioxazine Violet"),
        c("Dark Umber", "#4A2E18", "Burnt Umber"),
        c("Gunmetal", "#30383E", "Payne's Grey"),
        c("True Black", "#101214", "Mars Black"),
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
