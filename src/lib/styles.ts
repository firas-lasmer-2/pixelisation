import type { Translations } from "@/i18n";
import type { ArtStyle } from "@/lib/store";

export type StyleTranslationKey = "original" | "vintage" | "popArt" | "watercolor" | "poster";

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
  pop_art: {
    key: "pop_art",
    translationKey: "popArt",
    profileVersion: 5,
    publicVisible: true,
    showcase: {
      imageUrl: "/images/style-popart.jpg",
      background: "linear-gradient(145deg, #fff0b3, #ff6f61 38%, #1956df 100%)",
      accent: "#ec2b8c",
    },
  },
  watercolor: {
    key: "watercolor",
    translationKey: "watercolor",
    profileVersion: 4,
    publicVisible: true,
    badgeLabel: "New",
    showcase: {
      background: "radial-gradient(circle at 30% 25%, rgba(250,248,245,0.95), rgba(236,160,180,0.9) 30%, rgba(112,128,224,0.82) 62%, rgba(26,36,56,0.9) 100%)",
      accent: "#ECA0B4",
    },
  },
  poster: {
    key: "poster",
    translationKey: "poster",
    profileVersion: 4,
    publicVisible: true,
    badgeLabel: "New",
    showcase: {
      background: "linear-gradient(145deg, #F0F4F8, #508898 38%, #1848A0 72%, #080C10 100%)",
      accent: "#508898",
    },
  },
};

export const PUBLIC_STYLE_ORDER: ArtStyle[] = [
  "original",
  "vintage",
  "pop_art",
  "watercolor",
  "poster",
];

export function isArtStyle(value: unknown): value is ArtStyle {
  return typeof value === "string" && value in STYLE_DEFINITIONS;
}

export function normalizeArtStyle(value: unknown): ArtStyle {
  if (value === "popart") return "pop_art";
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
