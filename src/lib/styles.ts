import type { Translations } from "@/i18n";
import type { ArtStyle } from "@/lib/store";

export type StyleTranslationKey = "original" | "vintage" | "grayscale";

export interface StyleDefinition {
  key: ArtStyle;
  translationKey: StyleTranslationKey;
  profileVersion: number;
  publicVisible: boolean;
  badgeLabel?: string;
  showcase: {
    imageUrl?: string;
    background: string;
    accent: string;
  };
}

export const STYLE_DEFINITIONS: Record<ArtStyle, StyleDefinition> = {
  original: {
    key: "original",
    translationKey: "original",
    profileVersion: 3,
    publicVisible: true,
    badgeLabel: "Popular",
    showcase: {
      imageUrl: "/images/style-original.jpg",
      background: "linear-gradient(145deg, #f3ebdf, #d5b294 45%, #4a5a67 100%)",
      accent: "#d79c7b",
    },
  },
  vintage: {
    key: "vintage",
    translationKey: "vintage",
    profileVersion: 5,
    publicVisible: true,
    showcase: {
      imageUrl: "/images/style-vintage.jpg",
      background: "linear-gradient(145deg, #FAF0E0, #D4A660 40%, #501808 100%)",
      accent: "#8C5020",
    },
  },
  grayscale: {
    key: "grayscale",
    translationKey: "grayscale",
    profileVersion: 5,
    publicVisible: true,
    showcase: {
      background: "linear-gradient(145deg, #F0F0F0, #9A9A9A 50%, #141414 100%)",
      accent: "#4A4A4A",
    },
  },
};

export const PUBLIC_STYLE_ORDER: ArtStyle[] = [
  "original",
  "vintage",
  "grayscale",
];

export function isArtStyle(value: unknown): value is ArtStyle {
  return typeof value === "string" && value in STYLE_DEFINITIONS;
}

export function normalizeArtStyle(value: unknown): ArtStyle {
  if (isArtStyle(value)) return value;
  return "original";
}

export function getStyleDefinition(style: ArtStyle | string) {
  return STYLE_DEFINITIONS[normalizeArtStyle(style)];
}

export function getPublicStyles() {
  return PUBLIC_STYLE_ORDER.map((key) => STYLE_DEFINITIONS[key]).filter((style) => style.publicVisible);
}

export function getStyleCopy(t: Translations, style: ArtStyle | string) {
  const definition = getStyleDefinition(style);
  return t.styles[definition.translationKey];
}

export function getStyleLabel(t: Translations, style: ArtStyle | string) {
  return getStyleCopy(t, style).name;
}

export function getStyleDescription(t: Translations, style: ArtStyle | string) {
  return getStyleCopy(t, style).description;
}

export function orderStyleResults<T extends { styleKey: ArtStyle }>(results: T[]) {
  const resultsByStyle = new Map(results.map((result) => [normalizeArtStyle(result.styleKey), result]));
  return PUBLIC_STYLE_ORDER.flatMap((style) => {
    const result = resultsByStyle.get(style);
    return result ? [result] : [];
  });
}
