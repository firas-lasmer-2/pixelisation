import { describe, expect, it } from "vitest";
import { getColorLabel, getShowcasePalette, resolveLegacyPalette, resolvePaletteForProcessing } from "@/lib/palettes";
import { PUBLIC_STYLE_ORDER } from "@/lib/styles";

describe("palettes", () => {
  it("supports safe color labels beyond Z", () => {
    expect(getColorLabel(0)).toBe("A");
    expect(getColorLabel(25)).toBe("Z");
    expect(getColorLabel(26)).toBe("AA");
    expect(getColorLabel(27)).toBe("AB");
  });

  it("uses fixed public kit color counts across all public styles", () => {
    for (const style of PUBLIC_STYLE_ORDER) {
      expect(resolvePaletteForProcessing(style, "A3").colors).toHaveLength(10);
      expect(resolvePaletteForProcessing(style, "A2").colors).toHaveLength(12);
    }
  });

  it("keeps legacy palettes at eight colors", () => {
    expect(resolveLegacyPalette("original").colors).toHaveLength(8);
    expect(resolveLegacyPalette("poster").colors).toHaveLength(8);
  });

  it("makes the original public palette truly colorful instead of grayscale", () => {
    const original = getShowcasePalette("original");
    expect(original.colors.some((color) => color.r !== color.g || color.g !== color.b)).toBe(true);
  });
});
