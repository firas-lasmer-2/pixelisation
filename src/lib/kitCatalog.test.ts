import { describe, expect, it } from "vitest";
import {
  DEFAULT_PUBLIC_KIT,
  getKitConfig,
  getPublicKitConfigs,
  resolveProcessingKitSize,
} from "@/lib/kitCatalog";

describe("kitCatalog", () => {
  it("exposes the new public launch lineup in the intended order", () => {
    expect(DEFAULT_PUBLIC_KIT).toBe("stamp_kit_30x40");
    expect(getPublicKitConfigs().map((kit) => kit.id)).toEqual([
      "stamp_kit_30x40",
      "stamp_kit_40x50",
      "stamp_kit_40x60",
    ]);
  });

  it("maps the premium 40x60 kit to the correct processing grid", () => {
    const kit = getKitConfig("stamp_kit_40x60");

    expect(kit.widthCm).toBe(40);
    expect(kit.heightCm).toBe(60);
    expect(kit.gridCols).toBe(160);
    expect(kit.gridRows).toBe(240);
    expect(resolveProcessingKitSize("stamp_kit_40x60")).toBe("40x60");
  });
});