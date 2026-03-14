import { Check } from "lucide-react";
import type { GlitterPalette } from "@/lib/store";
import { GLITTER_PALETTE_ORDER, GLITTER_PALETTES } from "@/lib/glitterPalettes";

const CARD_STYLES: Record<GlitterPalette, { accentColor: string }> = {
  mercury: { accentColor: "border-slate-400" },
  mars:    { accentColor: "border-red-500" },
  neptune: { accentColor: "border-blue-500" },
  jupiter: { accentColor: "border-purple-500" },
};

interface GlitterPalettePickerProps {
  selected: GlitterPalette | null;
  onSelect: (palette: GlitterPalette) => void;
}

export function GlitterPalettePicker({ selected, onSelect }: GlitterPalettePickerProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {GLITTER_PALETTE_ORDER.map((key, idx) => {
        const palette = GLITTER_PALETTES[key];
        const styles = CARD_STYLES[key];
        const isSelected = selected === key;

        return (
          <div
            key={key}
            onClick={() => onSelect(key)}
            className={`relative cursor-pointer rounded-[20px] bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.1)] group p-1 ${
              isSelected ? "ring-2 ring-primary ring-offset-2 scale-[1.02]" : "border border-black/[0.04]"
            }`}
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            {isSelected && (
              <div className="absolute top-4 left-4 z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-scale-in shadow-md">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            )}

            {/* Color swatch preview */}
            <div className={`bg-[#FAFAFA] rounded-[16px] px-4 pt-8 pb-6 flex flex-col items-center justify-center transition-colors group-hover:bg-[#F0F0F0]`}>
              <div className="flex gap-2 justify-center mb-4 transition-transform duration-500 group-hover:scale-110">
                {palette.colors.map((color) => (
                  <div
                    key={color.name}
                    className="w-10 h-10 rounded-full shadow-sm border border-black/10"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
              {/* Shimmer bar */}
              <div
                className="h-1.5 w-full max-w-[120px] rounded-full opacity-60 mt-2"
                style={{
                  background: `linear-gradient(90deg, ${palette.colors.map((c) => c.hex).join(", ")})`,
                }}
              />
            </div>

            <div className="p-4">
              <h3
                className="text-base font-bold mb-1"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {palette.name}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {palette.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {palette.colors.map((color) => (
                  <span
                    key={color.name}
                    className="inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: color.hex + "30",
                      borderColor: color.hex + "60",
                      color: "inherit",
                    }}
                  >
                    {color.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
