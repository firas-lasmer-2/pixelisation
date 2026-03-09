export interface PaletteColor {
  name: string;
  ref: string;       // Common acrylic paint name — what to buy at the store
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

// Shared letter labels for up to 26 colors (used in PDF, GridViewer, tooltips)
export const COLOR_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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
  const xn = 95.047, yn = 100.0, zn = 108.883;
  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fx = f(x / xn), fy = f(y / yn), fz = f(z / zn);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

const c = (name: string, hex: string, ref: string): PaletteColor => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const [L, a, bLab] = rgbToLab(r, g, b);
  return { name, ref, r, g, b, hex, L, a, bLab };
};

// ─── 8-color palettes — perceptually spaced, all sourced as standard acrylics ─

export const PALETTES: Record<string, StylePalette> = {
  original: {
    name: "Original",
    description: "8 distinct grays — evenly spaced in L*, easy to tell apart",
    colors: [
      // L* steps of ~13 each — Delta-E > 13 between every adjacent pair
      c("White",       "#F5F5F5", "Titanium White"),       // L* ~96
      c("Light Gray",  "#C8C8C8", "Light Gray"),           // L* ~80
      c("Silver",      "#9A9A9A", "Silver Gray"),          // L* ~63
      c("Medium Gray", "#727272", "Medium Gray"),          // L* ~47
      c("Dim Gray",    "#505050", "Dim Gray"),             // L* ~34
      c("Dark Gray",   "#323232", "Dark Gray"),            // L* ~22
      c("Charcoal",    "#1A1A1A", "Charcoal"),             // L* ~11
      c("Black",       "#080808", "Mars Black"),           // L* ~4
    ],
  },
  vintage: {
    name: "Vintage",
    description: "8 warm earth tones — all standard artist acrylic colors",
    colors: [
      c("Cream",       "#F5EDDA", "Unbleached Titanium"),  // Warm light base
      c("Yellow Ochre","#D4AA70", "Yellow Ochre"),         // Classic warm yellow
      c("Raw Sienna",  "#A07040", "Raw Sienna"),           // Mid warm brown
      c("Burnt Sienna","#8B4C2A", "Burnt Sienna"),         // Deep warm orange
      c("Terra Cotta", "#6E3018", "Terra Cotta Red"),      // Warm red-brown
      c("Raw Umber",   "#503020", "Raw Umber"),            // Neutral dark brown
      c("Burnt Umber", "#3A2010", "Burnt Umber"),          // Very dark brown
      c("Near Black",  "#150C04", "Ivory Black"),          // Warm near-black
    ],
  },
  popart: {
    name: "Pop Art",
    description: "8 vivid Warhol-inspired colors — warm gradient + bold accents",
    colors: [
      c("White",       "#F8F3EB", "Titanium White"),       // Bright warm white
      c("Yellow",      "#FFD600", "Cadmium Yellow"),       // Vivid cadmium yellow
      c("Orange",      "#FF6B00", "Cadmium Orange"),       // Hot cadmium orange
      c("Red",         "#E81028", "Cadmium Red"),          // Vivid cadmium red
      c("Magenta",     "#CC0068", "Quinacridone Magenta"), // Hot vivid pink
      c("Violet",      "#6500B8", "Dioxazine Violet"),     // Deep electric violet
      c("Blue",        "#0097D8", "Cerulean Blue"),        // Vivid cerulean blue
      c("Black",       "#0C0A08", "Mars Black"),           // Deep black
    ],
  },
};

// ─── Compact palettes for A4 — same 8 colors, no separate set needed ─────
export const COMPACT_PALETTES: Record<string, StylePalette> = PALETTES;

export const STYLE_KEYS = Object.keys(PALETTES) as Array<keyof typeof PALETTES>;
