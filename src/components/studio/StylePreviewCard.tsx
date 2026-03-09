import { Check, Palette, Star } from "lucide-react";
import type { StylePalette } from "@/lib/palettes";

interface StylePreviewCardProps {
  badgeLabel?: string;
  colorCountLabel: string;
  isSelected: boolean;
  palette: StylePalette;
  previewUrl: string;
  styleDescription: string;
  styleName: string;
  onSelect: () => void;
}

export function StylePreviewCard({
  badgeLabel,
  colorCountLabel,
  isSelected,
  palette,
  previewUrl,
  styleDescription,
  styleName,
  onSelect,
}: StylePreviewCardProps) {
  return (
    <div
      className={`group cursor-pointer overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        isSelected ? "gold-glow scale-[1.02]" : "hover:shadow-lg"
      }`}
      onClick={onSelect}
    >
      {badgeLabel && (
        <div className="absolute top-2 right-2 z-10">
          <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold text-accent">
            <Star className="h-3 w-3" />
            {badgeLabel}
          </span>
        </div>
      )}
      <div className="relative aspect-[3/4] overflow-hidden">
        <div className="absolute bottom-2 left-2 z-10">
          <span className="inline-flex items-center gap-1 rounded-full border border-background/70 bg-background/85 px-2.5 py-1 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur-sm">
            <Palette className="h-3 w-3 text-primary" />
            {colorCountLabel}
          </span>
        </div>
        <img src={previewUrl} alt={styleName} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>
      <div className="p-4">
        <p className="text-center font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>{styleName}</p>
        <p className="mt-1 line-clamp-2 text-center text-xs text-muted-foreground">{styleDescription}</p>
        <div className="mt-3 flex justify-center gap-1.5">
          {palette.colors.map((color, index) => (
            <div
              key={`${styleName}-${index}`}
              className="h-5 w-5 rounded-full border-2 border-background shadow-sm transition-transform hover:scale-125"
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          ))}
        </div>
        {isSelected && (
          <div className="mt-3 flex justify-center">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary animate-scale-in">
              <Check className="h-3.5 w-3.5" /> Sélectionné
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
