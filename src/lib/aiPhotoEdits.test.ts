import {
  buildAiInputImages,
  getPendingPhotoEditIndices,
  getPhotoPreviewSource,
  type PhotoEdit,
} from "@/lib/aiPhotoEdits";

const edit = (croppedDataUrl: string): PhotoEdit => ({
  crop: { x: 0, y: 0, width: 100, height: 100 },
  adjustments: { brightness: 110, contrast: 95 },
  croppedDataUrl,
});

describe("aiPhotoEdits", () => {
  it("prefers cropped photo edits when building AI generation inputs", () => {
    expect(buildAiInputImages(
      ["raw-1", "raw-2"],
      [edit("cropped-1"), edit("cropped-2")],
    )).toEqual(["cropped-1", "cropped-2"]);
  });

  it("reports which uploaded photos still need cropping", () => {
    expect(getPendingPhotoEditIndices(
      ["raw-1", "raw-2"],
      2,
      [edit("cropped-1"), null],
    )).toEqual([1]);
  });

  it("falls back to the raw photo when no cropped preview exists", () => {
    expect(getPhotoPreviewSource(
      ["raw-1"],
      [null],
      0,
    )).toBe("raw-1");
  });
});
