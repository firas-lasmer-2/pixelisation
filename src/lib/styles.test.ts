import { describe, expect, it } from "vitest";
import { getPublicStyles, normalizeArtStyle, orderStyleResults } from "@/lib/styles";

describe("styles", () => {
  it("exposes five public styles in the intended order", () => {
    expect(getPublicStyles().map((style) => style.key)).toEqual([
      "original",
      "vintage",
      "pop_art",
      "watercolor",
      "poster",
    ]);
  });

  it("normalizes legacy popart keys", () => {
    expect(normalizeArtStyle("popart")).toBe("pop_art");
    expect(normalizeArtStyle("poster")).toBe("poster");
  });

  it("orders studio results by shared public style order", () => {
    const ordered = orderStyleResults([
      { styleKey: "poster" as const, id: 1 },
      { styleKey: "original" as const, id: 2 },
      { styleKey: "watercolor" as const, id: 3 },
      { styleKey: "pop_art" as const, id: 4 },
      { styleKey: "vintage" as const, id: 5 },
    ]);

    expect(ordered.map((result) => result.styleKey)).toEqual([
      "original",
      "vintage",
      "pop_art",
      "watercolor",
      "poster",
    ]);
  });
});
