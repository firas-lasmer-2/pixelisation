import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n";
import { StyleShowcase } from "@/components/landing/StyleShowcase";

describe("StyleShowcase", () => {
  it("renders all five public styles", () => {
    render(
      <I18nProvider>
        <StyleShowcase />
      </I18nProvider>,
    );

    expect(screen.getByText("Original")).toBeInTheDocument();
    expect(screen.getByText("Vintage")).toBeInTheDocument();
    expect(screen.getByText("Pop Art")).toBeInTheDocument();
    expect(screen.getByText("Aquarelle")).toBeInTheDocument();
    expect(screen.getByText("Poster")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(5);
  });
});
