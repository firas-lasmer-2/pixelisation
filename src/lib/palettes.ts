export interface PaletteColor {
  name: string;
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

const c = (name: string, hex: string): PaletteColor => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const [L, a, bLab] = rgbToLab(r, g, b);
  return { name, r, g, b, hex, L, a, bLab };
};

// ─── DMC-style palettes: fewer, perceptually distinct colors ────────────
// Each palette uses Delta-E > 10 between neighbors for easy distinction

export const PALETTES: Record<string, StylePalette> = {
  original: {
    name: "Original",
    description: "14-shade grayscale, evenly spaced in L*",
    colors: [
      c("White",          "#F2F2F2"), // L* ~96
      c("Pearl",          "#DEDEDE"), // L* ~89
      c("Silver",         "#CACACA"), // L* ~82
      c("Light Gray",     "#B6B6B6"), // L* ~75
      c("Ash",            "#A2A2A2"), // L* ~68
      c("Mid Gray",       "#8E8E8E"), // L* ~61
      c("Slate",          "#7A7A7A"), // L* ~54
      c("Steel",          "#686868"), // L* ~47
      c("Iron",           "#565656"), // L* ~40
      c("Graphite",       "#444444"), // L* ~33
      c("Charcoal",       "#333333"), // L* ~26
      c("Dark Gray",      "#232323"), // L* ~19
      c("Onyx",           "#151515"), // L* ~12
      c("Black",          "#080808"), // L* ~6
    ],
  },
  vintage: {
    name: "Vintage",
    description: "15-color warm sepia, wide Delta-E spacing",
    colors: [
      c("Cream",          "#F5EDDA"), // Lightest warm
      c("Ivory",          "#E0D0AA"), // Warm light
      c("Wheat",          "#CCB580"), // Golden light
      c("Sand",           "#B89A58"), // Sand
      c("Goldenrod",      "#A08030"), // Deep gold
      c("Warm Gray",      "#A09890"), // Neutral warm
      c("Copper",         "#A06840"), // Copper
      c("Terra Cotta",    "#8E5838"), // Terra cotta
      c("Raw Sienna",     "#7A4820"), // Raw sienna
      c("Medium Gray",    "#706860"), // Mid warm gray
      c("Rust",           "#884830"), // Rust red
      c("Brown",          "#5A3818"), // Brown
      c("Dark Slate",     "#3A4048"), // Cool dark
      c("Deep Brown",     "#3C2410"), // Deep brown
      c("Near Black",     "#140C04"), // Near black
    ],
  },
  popart: {
    name: "Pop Art",
    description: "12-color bold Warhol-style, max hue separation",
    colors: [
      c("Off White",      "#F0E8D8"), // Light base
      c("Canary",         "#F8E030"), // Yellow
      c("Lime",           "#58D828"), // Green
      c("Tangerine",      "#F08828"), // Orange
      c("Hot Pink",       "#E03080"), // Pink
      c("Sky Blue",       "#40A8E0"), // Blue
      c("Red",            "#D82020"), // Red
      c("Electric Blue",  "#2850D8"), // Deep blue
      c("Purple",         "#8028C0"), // Purple
      c("Crimson",        "#901830"), // Dark red
      c("Dark Teal",      "#104848"), // Dark teal
      c("Black",          "#181818"), // Black
    ],
  },
};

// ─── Compact 8-color palettes for A4 size ──────────────────────────────
export const COMPACT_PALETTES: Record<string, StylePalette> = {
  original: {
    name: "Original Compact",
    description: "8-shade grayscale, Delta-E ~13",
    colors: [
      c("White",          "#F0F0F0"),
      c("Light Gray",     "#C8C8C8"),
      c("Silver",         "#A0A0A0"),
      c("Mid Gray",       "#7C7C7C"),
      c("Steel",          "#5C5C5C"),
      c("Dark Gray",      "#404040"),
      c("Charcoal",       "#242424"),
      c("Black",          "#0A0A0A"),
    ],
  },
  vintage: {
    name: "Vintage Compact",
    description: "8-tone warm sepia",
    colors: [
      c("Cream",          "#F5EDDA"),
      c("Sand",           "#CCB580"),
      c("Warm Gray",      "#A09890"),
      c("Copper",         "#A06840"),
      c("Terra Cotta",    "#8E5838"),
      c("Brown",          "#5A3818"),
      c("Dark Slate",     "#3A4048"),
      c("Near Black",     "#140C04"),
    ],
  },
  popart: {
    name: "Pop Art Compact",
    description: "8-color bold Warhol-style",
    colors: [
      c("Off White",      "#F0E8D8"),
      c("Canary",         "#F8E030"),
      c("Red",            "#D82020"),
      c("Hot Pink",       "#E03080"),
      c("Sky Blue",       "#40A8E0"),
      c("Lime",           "#58D828"),
      c("Purple",         "#8028C0"),
      c("Black",          "#181818"),
    ],
  },
};

export const STYLE_KEYS = Object.keys(PALETTES) as Array<keyof typeof PALETTES>;
