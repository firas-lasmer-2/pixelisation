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
  ditherStrength: number;
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
    bilateralSpatialSigma: 4.5,
    bilateralColorSigma: 25,
    bilateralRadius: 5,
    sharpenAmount: 0.3,
    ditherStrength: 0.75,
    denoiseConfig: { small: 2, medium: 1, large: 0 },
    smallRegionMerge: { minArea: 4, maxAverageEdge: 0.3 },
  },
  vintage: {
    key: "vintage",
    version: STYLE_DEFINITIONS.vintage.profileVersion,
    hiResMult: 4,
    filterPasses: 2,
    sigmoidK: 7.5,
    localContrastStrength: 0.55,
    bilateralSpatialSigma: 4.5,
    bilateralColorSigma: 22,
    bilateralRadius: 5,
    sharpenAmount: 0.35,
    ditherStrength: 0.7,
    denoiseConfig: { small: 2, medium: 1, large: 0 },
    smallRegionMerge: { minArea: 4, maxAverageEdge: 0.3 },
  },
  grayscale: {
    key: "grayscale",
    version: STYLE_DEFINITIONS.grayscale.profileVersion,
    hiResMult: 4,
    filterPasses: 2,
    sigmoidK: 6.0,
    localContrastStrength: 0.6,
    bilateralSpatialSigma: 5.0,
    bilateralColorSigma: 25,
    bilateralRadius: 5,
    sharpenAmount: 0.35,
    ditherStrength: 0.8,
    denoiseConfig: { small: 2, medium: 1, large: 0 },
    smallRegionMerge: { minArea: 4, maxAverageEdge: 0.3 },
  },
};

export function getStyleProcessingProfile(style: ArtStyle | string) {
  return STYLE_PROCESSING_PROFILES[style as ArtStyle] || STYLE_PROCESSING_PROFILES.original;
}
