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

type PaletteTier = "legacy" | "public_a3" | "public_a2";

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
  if (kitSize === "A3") return "public_a3";
  if (kitSize === "A2") return "public_a2";
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
    public_a3: {
      name: "Original",
      description: "Natural portrait palette with balanced skin tones, fabrics, and clear shadows.",
      colors: [
        c("Linen", "#F6EFE6", "Unbleached Titanium"),
        c("Light Peach", "#E7C2A2", "Portrait Pink"),
        c("Rose Beige", "#D69A84", "Light Portrait Pink"),
        c("Golden Ochre", "#C69A5A", "Yellow Ochre"),
        c("Soft Sage", "#8E9B7A", "Sap Green"),
        c("Dusty Blue", "#7388A8", "Cerulean Blue"),
        c("Clay Rose", "#A56853", "Burnt Sienna"),
        c("Walnut", "#6A4A38", "Burnt Umber"),
        c("Cool Shadow", "#4C5967", "Payne's Grey"),
        c("Carbon", "#111417", "Mars Black"),
      ],
    },
    public_a2: {
      name: "Original",
      description: "Extended natural palette with cleaner facial transitions and background separation.",
      colors: [
        c("Linen", "#F6EFE6", "Unbleached Titanium"),
        c("Warm Ivory", "#EDD9BF", "Naples Yellow"),
        c("Light Peach", "#E7C2A2", "Portrait Pink"),
        c("Rose Beige", "#D69A84", "Light Portrait Pink"),
        c("Blush Clay", "#C77A74", "Quinacridone Rose"),
        c("Golden Ochre", "#C69A5A", "Yellow Ochre"),
        c("Soft Sage", "#8E9B7A", "Sap Green"),
        c("Dusty Blue", "#7388A8", "Cerulean Blue"),
        c("Clay Rose", "#A56853", "Burnt Sienna"),
        c("Walnut", "#6A4A38", "Burnt Umber"),
        c("Cool Shadow", "#4C5967", "Payne's Grey"),
        c("Carbon", "#111417", "Mars Black"),
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
    public_a3: {
      name: "Vintage",
      description: "Warm nostalgic earth palette with elegant sepia depth.",
      colors: [
        c("Cream", "#F6E9D4", "Unbleached Titanium"),
        c("Sand", "#E3C090", "Naples Yellow"),
        c("Honey Ochre", "#C89552", "Yellow Ochre"),
        c("Muted Rose", "#B47A68", "Venetian Red"),
        c("Raw Sienna", "#9E6A3C", "Raw Sienna"),
        c("Moss", "#7C7250", "Olive Green"),
        c("Terracotta", "#8B4D36", "Burnt Sienna"),
        c("Umber", "#5B3D2E", "Raw Umber"),
        c("Sepia", "#39251B", "Burnt Umber"),
        c("Near Black", "#150E09", "Ivory Black"),
      ],
    },
    public_a2: {
      name: "Vintage",
      description: "Expanded sepia palette with richer midtones and softer background transitions.",
      colors: [
        c("Cream", "#F6E9D4", "Unbleached Titanium"),
        c("Pale Straw", "#E9D3AF", "Buff Titanium"),
        c("Sand", "#E3C090", "Naples Yellow"),
        c("Honey Ochre", "#C89552", "Yellow Ochre"),
        c("Muted Rose", "#B47A68", "Venetian Red"),
        c("Raw Sienna", "#9E6A3C", "Raw Sienna"),
        c("Olive Dust", "#8E8462", "Green Gold"),
        c("Moss", "#7C7250", "Olive Green"),
        c("Terracotta", "#8B4D36", "Burnt Sienna"),
        c("Umber", "#5B3D2E", "Raw Umber"),
        c("Sepia", "#39251B", "Burnt Umber"),
        c("Near Black", "#150E09", "Ivory Black"),
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
    public_a3: {
      name: "Pop Art",
      description: "High-chroma palette with bold comic-book separation.",
      colors: [
        c("Warm White", "#FBF5EC", "Titanium White"),
        c("Lemon", "#FFE000", "Cadmium Lemon"),
        c("Orange", "#FF8C00", "Cadmium Orange"),
        c("Red", "#F1362F", "Cadmium Red"),
        c("Hot Pink", "#EC2B8C", "Quinacridone Magenta"),
        c("Violet", "#A329C9", "Dioxazine Violet"),
        c("Electric Blue", "#1D7CF2", "Phthalo Blue"),
        c("Aqua", "#00B8D9", "Cerulean Blue"),
        c("Lime", "#8CCF2E", "Permanent Green"),
        c("Black", "#0E0B0A", "Mars Black"),
      ],
    },
    public_a2: {
      name: "Pop Art",
      description: "Expanded pop palette with deeper cool accents for cleaner posterized separation.",
      colors: [
        c("Warm White", "#FBF5EC", "Titanium White"),
        c("Lemon", "#FFE000", "Cadmium Lemon"),
        c("Orange", "#FF8C00", "Cadmium Orange"),
        c("Red", "#F1362F", "Cadmium Red"),
        c("Hot Pink", "#EC2B8C", "Quinacridone Magenta"),
        c("Deep Fuchsia", "#C81F78", "Permanent Rose"),
        c("Violet", "#A329C9", "Dioxazine Violet"),
        c("Royal Blue", "#0057D8", "Ultramarine Blue"),
        c("Electric Blue", "#1D7CF2", "Phthalo Blue"),
        c("Aqua", "#00B8D9", "Cerulean Blue"),
        c("Lime", "#8CCF2E", "Permanent Green"),
        c("Black", "#0E0B0A", "Mars Black"),
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
    public_a3: {
      name: "Watercolor",
      description: "Soft painterly palette with airy washes and gentle edges.",
      colors: [
        c("Paper White", "#FAF5EB", "Titanium White"),
        c("Petal Pink", "#E8C5C2", "Portrait Pink"),
        c("Apricot Wash", "#E7C29B", "Naples Yellow"),
        c("Buttercream", "#E7D89A", "Naples Yellow Deep"),
        c("Mist Sage", "#B6C7B0", "Green Gold"),
        c("Seafoam", "#8FBAB3", "Cobalt Teal"),
        c("Cornflower", "#9DB3D8", "Cerulean Blue"),
        c("Lavender", "#B6A2CC", "Dioxazine Violet"),
        c("Dusty Mauve", "#A07A83", "Permanent Rose"),
        c("Ink", "#3A4654", "Payne's Grey"),
      ],
    },
    public_a2: {
      name: "Watercolor",
      description: "Expanded wash palette with extra floral mids and deeper anchors.",
      colors: [
        c("Paper White", "#FAF5EB", "Titanium White"),
        c("Warm Paper", "#F0E4D5", "Buff Titanium"),
        c("Petal Pink", "#E8C5C2", "Portrait Pink"),
        c("Blush Coral", "#DDA4A0", "Permanent Rose"),
        c("Apricot Wash", "#E7C29B", "Naples Yellow"),
        c("Buttercream", "#E7D89A", "Naples Yellow Deep"),
        c("Mist Sage", "#B6C7B0", "Green Gold"),
        c("Seafoam", "#8FBAB3", "Cobalt Teal"),
        c("Cornflower", "#9DB3D8", "Cerulean Blue"),
        c("Lavender", "#B6A2CC", "Dioxazine Violet"),
        c("Dusty Mauve", "#A07A83", "Mauve"),
        c("Ink", "#3A4654", "Payne's Grey"),
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
    public_a3: {
      name: "Poster",
      description: "Graphic poster palette with strong value breaks and readable blocks.",
      colors: [
        c("Off White", "#F6F1E7", "Titanium White"),
        c("Buff", "#D9C5A4", "Buff Titanium"),
        c("Mustard", "#C49A2E", "Yellow Ochre"),
        c("Vermilion", "#D8563A", "Cadmium Red Light"),
        c("Coral Pink", "#D17B78", "Permanent Rose"),
        c("Olive", "#798155", "Olive Green"),
        c("Teal", "#3E8A88", "Phthalo Green"),
        c("Cobalt", "#4574B6", "Cobalt Blue"),
        c("Aubergine", "#5C4B6F", "Dioxazine Violet"),
        c("Charcoal", "#1A1C20", "Mars Black"),
      ],
    },
    public_a2: {
      name: "Poster",
      description: "Expanded graphic palette with more separation in warm highlights and cool shadows.",
      colors: [
        c("Off White", "#F6F1E7", "Titanium White"),
        c("Buff", "#D9C5A4", "Buff Titanium"),
        c("Warm Sand", "#CDB187", "Naples Yellow"),
        c("Mustard", "#C49A2E", "Yellow Ochre"),
        c("Vermilion", "#D8563A", "Cadmium Red Light"),
        c("Coral Pink", "#D17B78", "Permanent Rose"),
        c("Olive", "#798155", "Olive Green"),
        c("Teal", "#3E8A88", "Phthalo Green"),
        c("Cobalt", "#4574B6", "Cobalt Blue"),
        c("Aubergine", "#5C4B6F", "Dioxazine Violet"),
        c("Dark Umber", "#4A3427", "Burnt Umber"),
        c("Charcoal", "#1A1C20", "Mars Black"),
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
  return resolvePaletteForProcessing(style, "A3");
}
