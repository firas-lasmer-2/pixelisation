import { PaletteColor, getColorLabel } from "@/lib/palettes";

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

interface PalettePanelProps {
  colors: PaletteColor[];
  sectionColorStats: number[];
  highlightColor: number | null;
  onHighlight: (idx: number | null) => void;
  cellsLabel: string;
}

export function PalettePanel({ colors, sectionColorStats, highlightColor, onHighlight, cellsLabel }: PalettePanelProps) {
  const totalInSection = sectionColorStats.reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-1">
      {colors.map((color, i) => {
        const [r, g, b] = hexToRgb(color.hex);
        const inSection = sectionColorStats[i] > 0;
        const isHighlighted = highlightColor === i;
        const pct = totalInSection > 0 ? (sectionColorStats[i] / totalInSection) * 100 : 0;

        return (
          <button
            key={i}
            onClick={() => onHighlight(isHighlighted ? null : i)}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all border ${
              isHighlighted
                ? "border-primary bg-primary/10 ring-1 ring-primary"
                : inSection
                  ? "border-border bg-card hover:border-primary/50"
                  : "border-transparent bg-muted/20 opacity-40"
            }`}
          >
            <div
              className="w-5 h-5 rounded border border-border flex-shrink-0 shadow-sm"
              style={{ backgroundColor: `rgb(${r},${g},${b})` }}
            />
            <span className="font-bold w-4 text-foreground">{getColorLabel(i)}</span>
            <span className="text-muted-foreground truncate flex-1 text-left">{color.name}</span>
            {inSection && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(4, pct)}%`,
                      backgroundColor: `rgb(${r},${g},${b})`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground w-6 text-right">{sectionColorStats[i]}</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

