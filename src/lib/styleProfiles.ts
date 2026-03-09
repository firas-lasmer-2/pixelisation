import type { ArtStyle } from "@/lib/store";
import { STYLE_DEFINITIONS } from "@/lib/styles";

export interface StyleProcessingProfile {
  key: ArtStyle;
  version: number;
  hiResMult: number;
  filterPasses: number;
  sigmoidK: number;
  localContrastStrength: number;
  bilateralSpatialSigma: number;
  bilateralColorSigma: number;
  bilateralRadius: number;
  sharpenAmount: number;
  denoiseConfig: {
    small: number;
    medium: number;
    large: number;
  };
  smallRegionMerge: {
    minArea: number;
    maxAverageEdge: number;
  };
}

export const STYLE_PROCESSING_PROFILES: Record<ArtStyle, StyleProcessingProfile> = {
  original: {
    key: "original",
    version: STYLE_DEFINITIONS.original.profileVersion,
    hiResMult: 4,
    filterPasses: 2,
    sigmoidK: 5,
    localContrastStrength: 0.42,
    bilateralSpatialSigma: 3,
    bilateralColorSigma: 18,
    bilateralRadius: 3,
    sharpenAmount: 0.55,
    denoiseConfig: { small: 2, medium: 1, large: 0 },
    smallRegionMerge: { minArea: 2, maxAverageEdge: 0.18 },
  },
  vintage: {
    key: "vintage",
    version: STYLE_DEFINITIONS.vintage.profileVersion,
    hiResMult: 4,
    filterPasses: 2,
    sigmoidK: 4.6,
    localContrastStrength: 0.34,
    bilateralSpatialSigma: 3,
    bilateralColorSigma: 15,
    bilateralRadius: 3,
    sharpenAmount: 0.45,
    denoiseConfig: { small: 3, medium: 2, large: 1 },
    smallRegionMerge: { minArea: 2, maxAverageEdge: 0.2 },
  },
  pop_art: {
    key: "pop_art",
    version: STYLE_DEFINITIONS.pop_art.profileVersion,
    hiResMult: 4,
    filterPasses: 1,
    sigmoidK: 6.6,
    localContrastStrength: 0.66,
    bilateralSpatialSigma: 2.5,
    bilateralColorSigma: 14,
    bilateralRadius: 3,
    sharpenAmount: 0.8,
    denoiseConfig: { small: 2, medium: 2, large: 0 },
    smallRegionMerge: { minArea: 2, maxAverageEdge: 0.16 },
  },
  watercolor: {
    key: "watercolor",
    version: STYLE_DEFINITIONS.watercolor.profileVersion,
    hiResMult: 4,
    filterPasses: 2,
    sigmoidK: 4.2,
    localContrastStrength: 0.22,
    bilateralSpatialSigma: 3.4,
    bilateralColorSigma: 20,
    bilateralRadius: 3,
    sharpenAmount: 0.28,
    denoiseConfig: { small: 3, medium: 2, large: 1 },
    smallRegionMerge: { minArea: 2, maxAverageEdge: 0.24 },
  },
  poster: {
    key: "poster",
    version: STYLE_DEFINITIONS.poster.profileVersion,
    hiResMult: 4,
    filterPasses: 2,
    sigmoidK: 6.8,
    localContrastStrength: 0.74,
    bilateralSpatialSigma: 2.8,
    bilateralColorSigma: 13,
    bilateralRadius: 3,
    sharpenAmount: 0.92,
    denoiseConfig: { small: 3, medium: 2, large: 1 },
    smallRegionMerge: { minArea: 3, maxAverageEdge: 0.16 },
  },
};

export function getStyleProcessingProfile(style: ArtStyle | string) {
  const key = style === "popart" ? "pop_art" : (style as ArtStyle);
  return STYLE_PROCESSING_PROFILES[key] || STYLE_PROCESSING_PROFILES.original;
}
