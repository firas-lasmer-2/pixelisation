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
    sigmoidK: 5.0,
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
    filterPasses: 3,
    sigmoidK: 5.0,
    localContrastStrength: 0.30,
    bilateralSpatialSigma: 3.2,
    bilateralColorSigma: 10,
    bilateralRadius: 3,
    sharpenAmount: 0.35,
    denoiseConfig: { small: 3, medium: 2, large: 1 },
    smallRegionMerge: { minArea: 3, maxAverageEdge: 0.2 },
  },
  pop_art: {
    key: "pop_art",
    version: STYLE_DEFINITIONS.pop_art.profileVersion,
    hiResMult: 4,
    filterPasses: 1,
    sigmoidK: 7.5,
    localContrastStrength: 0.80,
    bilateralSpatialSigma: 2.5,
    bilateralColorSigma: 14,
    bilateralRadius: 3,
    sharpenAmount: 0.85,
    denoiseConfig: { small: 2, medium: 2, large: 0 },
    smallRegionMerge: { minArea: 2, maxAverageEdge: 0.16 },
  },
  watercolor: {
    key: "watercolor",
    version: STYLE_DEFINITIONS.watercolor.profileVersion,
    hiResMult: 4,
    filterPasses: 3,
    sigmoidK: 3.8,
    localContrastStrength: 0.15,
    bilateralSpatialSigma: 4.0,
    bilateralColorSigma: 25,
    bilateralRadius: 3,
    sharpenAmount: 0.20,
    denoiseConfig: { small: 3, medium: 2, large: 1 },
    smallRegionMerge: { minArea: 2, maxAverageEdge: 0.24 },
  },
  poster: {
    key: "poster",
    version: STYLE_DEFINITIONS.poster.profileVersion,
    hiResMult: 4,
    filterPasses: 2,
    sigmoidK: 8.0,
    localContrastStrength: 0.85,
    bilateralSpatialSigma: 2.5,
    bilateralColorSigma: 11,
    bilateralRadius: 3,
    sharpenAmount: 0.95,
    denoiseConfig: { small: 3, medium: 2, large: 1 },
    smallRegionMerge: { minArea: 5, maxAverageEdge: 0.16 },
  },
};

export function getStyleProcessingProfile(style: ArtStyle | string) {
  const key = style === "popart" ? "pop_art" : (style as ArtStyle);
  return STYLE_PROCESSING_PROFILES[key] || STYLE_PROCESSING_PROFILES.original;
}
