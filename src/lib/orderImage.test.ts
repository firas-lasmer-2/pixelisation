import { describe, expect, it } from "vitest";
import {
  MAX_CREATE_ORDER_PAYLOAD_BYTES,
  estimateDataUrlBytes,
  estimateJsonBytes,
  isCreateOrderPayloadTooLarge,
} from "@/lib/orderImage";

describe("orderImage", () => {
  it("estimates decoded bytes for a base64 data url", () => {
    const value = "hello world";
    const dataUrl = `data:text/plain;base64,${btoa(value)}`;

    expect(estimateDataUrlBytes(dataUrl)).toBe(value.length);
  });

  it("keeps compact request payloads under the guard rail", () => {
    const payload = {
      photos: ["small-image"],
      selectedSize: "stamp_kit_A4",
      selectedStyle: "original",
    };

    expect(estimateJsonBytes(payload)).toBeLessThan(MAX_CREATE_ORDER_PAYLOAD_BYTES);
    expect(isCreateOrderPayloadTooLarge(payload)).toBe(false);
  });

  it("flags oversized create-order payloads before the network call", () => {
    const payload = {
      photos: ["x".repeat(MAX_CREATE_ORDER_PAYLOAD_BYTES)],
      selectedSize: "stamp_kit_40x50",
      selectedStyle: "vintage",
    };

    expect(isCreateOrderPayloadTooLarge(payload)).toBe(true);
  });
});