import type { Area } from "react-easy-crop";

export type ImageAdjustments = {
  brightness: number;
  contrast: number;
};

export type PhotoEdit = {
  crop: Area;
  adjustments: ImageAdjustments;
  croppedDataUrl: string;
};

export function buildAiInputImages(photos: string[], photoEdits: Array<PhotoEdit | null>) {
  return photos
    .map((photo, index) => photoEdits[index]?.croppedDataUrl || photo)
    .filter(Boolean);
}

export function getPendingPhotoEditIndices(
  photos: string[],
  requiredCount: number,
  photoEdits: Array<PhotoEdit | null>,
) {
  const pending: number[] = [];

  for (let index = 0; index < requiredCount; index++) {
    if (!photos[index]) continue;
    if (!photoEdits[index]?.croppedDataUrl) {
      pending.push(index);
    }
  }

  return pending;
}

export function getPhotoPreviewSource(
  photos: string[],
  photoEdits: Array<PhotoEdit | null>,
  index: number,
) {
  return photoEdits[index]?.croppedDataUrl || photos[index] || "";
}
