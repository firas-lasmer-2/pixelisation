import { describe, expect, it } from "vitest";
import { countUsedColors, mergeSmallRegions } from "@/lib/imageProcessing";

describe("imageProcessing", () => {
  it("counts unique palette indexes", () => {
    expect(countUsedColors(new Uint8Array([0, 1, 1, 2, 2, 2]))).toBe(3);
  });

  it("merges isolated singleton regions in low-edge areas", () => {
    const indices = new Uint8Array([
      1, 1, 1,
      1, 0, 1,
      1, 1, 1,
    ]);
    const edgeMap = new Float32Array(9);

    mergeSmallRegions(indices, 3, 3, edgeMap, 2, 0.2);

    expect(Array.from(indices)).toEqual([
      1, 1, 1,
      1, 1, 1,
      1, 1, 1,
    ]);
  });

  it("keeps small high-edge regions when they are above the edge threshold", () => {
    const indices = new Uint8Array([
      1, 1, 1,
      1, 0, 0,
      1, 1, 1,
    ]);
    const edgeMap = new Float32Array(9).fill(0.4);

    mergeSmallRegions(indices, 3, 3, edgeMap, 2, 0.2);

    expect(Array.from(indices)).toEqual([
      1, 1, 1,
      1, 0, 0,
      1, 1, 1,
    ]);
  });
});
