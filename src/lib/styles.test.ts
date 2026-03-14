import { describe, expect, it } from "vitest";
import { getPublicStyles, normalizeArtStyle, orderStyleResults } from "@/lib/styles";

describe("styles", () => {
  it("exposes three public styles in the intended order", () => {
    expect(getPublicStyles().map((style) => style.key)).toEqual([
      "original",
      "vintage",
      "grayscale",
    ]);
  });

  it("normalizes unknown keys to original", () => {
    expect(normalizeArtStyle("unknown")).toBe("original");
    expect(normalizeArtStyle("vintage")).toBe("vintage");
  });

  it("orders studio results by shared public style order", () => {
    const ordered = orderStyleResults([
      { styleKey: "grayscale" as const, id: 3 },
      { styleKey: "original" as const, id: 1 },
      { styleKey: "vintage" as const, id: 2 },
    ]);

    expect(ordered.map((result) => result.styleKey)).toEqual([
      "original",
      "vintage",
      "grayscale",
    ]);
  });
});
