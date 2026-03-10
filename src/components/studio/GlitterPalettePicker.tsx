import { Check } from "lucide-react";
import type { GlitterPalette } from "@/lib/store";
import { GLITTER_PALETTE_ORDER, GLITTER_PALETTES } from "@/lib/glitterPalettes";

const CARD_STYLES: Record<GlitterPalette, { gradient: string; borderAccent: string }> = {
  mercury: { gradient: "from-slate-300/20 to-slate-100/10",  borderAccent: "border-t-slate-400" },
  mars:    { gradient: "from-red-600/15 to-amber-500/10",    borderAccent: "border-t-red-500" },
  neptune: { gradient: "from-blue-600/15 to-teal-500/10",    borderAccent: "border-t-blue-500" },
  jupiter: { gradient: "from-purple-600/15 to-violet-400/10",borderAccent: "border-t-purple-500" },
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
            className={`relative cursor-pointer rounded-xl border-2 border-t-[3px] ${styles.borderAccent} bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              isSelected ? "gold-glow scale-[1.02]" : "border-border hover:shadow-lg"
            }`}
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            {isSelected && (
              <div className="absolute top-3 left-3 z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                <Check className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}

            {/* Color swatch preview */}
            <div className={`bg-gradient-to-br ${styles.gradient} px-4 pt-5 pb-3`}>
              <div className="flex gap-2 justify-center mb-3">
                {palette.colors.map((color) => (
                  <div
                    key={color.name}
                    className="w-8 h-8 rounded-full shadow-md border-2 border-white/50"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
              {/* Shimmer bar */}
              <div
                className="h-2 rounded-full opacity-60"
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
