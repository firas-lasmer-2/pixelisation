import { describe, expect, it } from "vitest";
import { getStepNumberForFlow, getWorkflowStepIds } from "@/pages/Studio";

describe("studio workflow", () => {
  it("uses dedicated subject and theme steps for themed AI categories", () => {
    expect(getWorkflowStepIds("superhero", "paint_by_numbers")).toEqual([
      "experience",
      "subject",
      "theme",
      "format",
      "upload",
      "crop",
      "ai",
      "style",
      "confirm",
    ]);
  });

  it("skips the theme step for AI categories without theme variants", () => {
    expect(getWorkflowStepIds("kids_dream", "paint_by_numbers")).toEqual([
      "experience",
      "subject",
      "format",
      "upload",
      "crop",
      "ai",
      "style",
      "confirm",
    ]);
  });

  it("keeps manual products on the direct classic flow", () => {
    expect(getWorkflowStepIds("classic", "stencil_paint")).toEqual([
      "experience",
      "format",
      "upload",
      "crop",
      "style",
      "confirm",
    ]);
    expect(getStepNumberForFlow("classic", "stencil_paint", "format")).toBe(2);
    expect(getStepNumberForFlow("classic", "stencil_paint", "subject")).toBe(0);
  });
});
