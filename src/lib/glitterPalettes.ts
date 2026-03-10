import type { GlitterPalette } from "./store";

export interface GlitterColor {
  name: string;
  hex: string;
  r: number;
  g: number;
  b: number;
  description: string;
}

export interface GlitterPaletteDefinition {
  key: GlitterPalette;
  name: string;
  description: string;
  /** Dominant display color (used for card tinting in UI) */
  dominantHex: string;
  colors: GlitterColor[];
}

function hex(h: string): { r: number; g: number; b: number } {
  const v = parseInt(h.replace("#", ""), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

function c(name: string, hexStr: string, description: string): GlitterColor {
  return { name, hex: hexStr, ...hex(hexStr), description };
}

export const GLITTER_PALETTES: Record<GlitterPalette, GlitterPaletteDefinition> = {
  mercury: {
    key: "mercury",
    name: "Mercury",
    description: "Argent et blanc lumineux — élégance pure",
    dominantHex: "#C0C0C0",
    colors: [
      c("Silver Dust",  "#C0C0C0", "Paillettes argentées fines"),
      c("Pearl White",  "#F0EDE6", "Paillettes blanc nacré"),
      c("Crystal",      "#E2DDD6", "Paillettes cristal transparent"),
      c("Moonstone",    "#A8A9AD", "Paillettes gris lunaire"),
    ],
  },
  mars: {
    key: "mars",
    name: "Mars",
    description: "Rouge et or chaud — passion et chaleur",
    dominantHex: "#C0392B",
    colors: [
      c("Ruby Red",     "#C0392B", "Paillettes rouge rubis vif"),
      c("Molten Gold",  "#D4AA70", "Paillettes or fondu"),
      c("Copper Flame", "#B87333", "Paillettes cuivre flamboyant"),
      c("Crimson",      "#8B0000", "Paillettes bordeaux profond"),
    ],
  },
  neptune: {
    key: "neptune",
    name: "Neptune",
    description: "Bleu et turquoise profond — fraîcheur marine",
    dominantHex: "#0077BE",
    colors: [
      c("Ocean Blue",   "#0077BE", "Paillettes bleu océan"),
      c("Teal Shimmer", "#3E8A88", "Paillettes sarcelle irisée"),
      c("Aquamarine",   "#7FFFD4", "Paillettes aigue-marine"),
      c("Deep Navy",    "#003399", "Paillettes bleu marine nuit"),
    ],
  },
  jupiter: {
    key: "jupiter",
    name: "Jupiter",
    description: "Violet et bronze cosmique — mystère et profondeur",
    dominantHex: "#8E44AD",
    colors: [
      c("Amethyst",     "#9B59B6", "Paillettes améthyste"),
      c("Cosmic Bronze","#8B6914", "Paillettes bronze cosmique"),
      c("Stardust",     "#C8A2C8", "Paillettes lilas étoilé"),
      c("Deep Violet",  "#4B0082", "Paillettes violet indigo"),
    ],
  },
};

export function getGlitterPalette(key: GlitterPalette): GlitterPaletteDefinition {
  return GLITTER_PALETTES[key];
}

export const GLITTER_PALETTE_ORDER: GlitterPalette[] = ["mercury", "mars", "neptune", "jupiter"];
