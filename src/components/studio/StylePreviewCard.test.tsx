import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StylePreviewCard } from "@/components/studio/StylePreviewCard";
import { resolvePaletteForProcessing } from "@/lib/palettes";

describe("StylePreviewCard", () => {
  it("shows the exact color count badge for a processed style", () => {
    const palette = resolvePaletteForProcessing("original", "A3");

    render(
      <StylePreviewCard
        badgeLabel="Popular"
        colorCountLabel={`${palette.colors.length} couleurs`}
        isSelected={false}
        onSelect={vi.fn()}
        palette={palette}
        previewUrl="/images/style-original.jpg"
        styleDescription="Description"
        styleName="Original"
      />,
    );

    expect(screen.getByText(`${palette.colors.length} couleurs`)).toBeInTheDocument();
    expect(screen.getByText("Original")).toBeInTheDocument();
  });
});

