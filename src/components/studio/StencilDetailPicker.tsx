import { Check } from "lucide-react";
import { type StencilDetailLevel, STENCIL_DETAIL_META } from "@/lib/store";

const DETAIL_CARDS: {
  key: StencilDetailLevel;
  gradient: string;
  borderAccent: string;
  previewLines: number; // Visual hint for complexity
}[] = [
  { key: "bold",   gradient: "from-orange-500/10 to-orange-500/5", borderAccent: "border-t-orange-500", previewLines: 3 },
  { key: "medium", gradient: "from-primary/10 to-primary/5",       borderAccent: "border-t-primary",    previewLines: 5 },
  { key: "fine",   gradient: "from-purple-500/10 to-purple-500/5", borderAccent: "border-t-purple-500", previewLines: 8 },
];

/** Simple SVG silhouette complexity preview */
function SilhouettePreview({ lines }: { lines: number }) {
  const allLines = [
    { x1: 20, y1: 15, x2: 60, y2: 15, thickness: 4 },
    { x1: 15, y1: 28, x2: 65, y2: 28, thickness: 3 },
    { x1: 18, y1: 40, x2: 62, y2: 40, thickness: 3 },
    { x1: 22, y1: 52, x2: 58, y2: 52, thickness: 2 },
    { x1: 25, y1: 63, x2: 55, y2: 63, thickness: 2 },
    { x1: 28, y1: 73, x2: 52, y2: 73, thickness: 1.5 },
    { x1: 30, y1: 82, x2: 50, y2: 82, thickness: 1.5 },
    { x1: 32, y1: 90, x2: 48, y2: 90, thickness: 1 },
  ];

  return (
    <svg viewBox="0 0 80 100" className="h-20 w-16 opacity-60">
      {/* Silhouette head */}
      <ellipse cx="40" cy="22" rx="18" ry="20" fill="white" stroke="#888" strokeWidth="1.5" />
      {/* Body outline */}
      <path d="M 22 42 Q 15 65 18 90 L 62 90 Q 65 65 58 42 Z" fill="white" stroke="#888" strokeWidth="1.5" />
      {/* Detail lines — more lines = finer detail */}
      {allLines.slice(0, lines).map((line, i) => (
        <line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="#555"
          strokeWidth={line.thickness}
          strokeLinecap="round"
          opacity={0.6}
        />
      ))}
    </svg>
  );
}

interface StencilDetailPickerProps {
  selected: StencilDetailLevel | null;
  onSelect: (level: StencilDetailLevel) => void;
  previewDataUrls?: Partial<Record<StencilDetailLevel, string>>;
}

export function StencilDetailPicker({
  selected,
  onSelect,
  previewDataUrls = {},
}: StencilDetailPickerProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {DETAIL_CARDS.map((card, idx) => {
        const meta = STENCIL_DETAIL_META[card.key];
        const isSelected = selected === card.key;
        const previewUrl = previewDataUrls[card.key];

        return (
          <div
            key={card.key}
            onClick={() => onSelect(card.key)}
            className={`relative cursor-pointer rounded-xl border-2 border-t-[3px] ${card.borderAccent} bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              isSelected ? "gold-glow scale-[1.02]" : "border-border hover:shadow-lg"
            }`}
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            {isSelected && (
              <div className="absolute top-3 left-3 z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                <Check className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}

            <div className={`bg-gradient-to-br ${card.gradient} flex items-center justify-center py-4 min-h-[112px]`}>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={meta.label}
                  className="h-24 object-contain rounded shadow"
                />
              ) : (
                <SilhouettePreview lines={card.previewLines} />
              )}
            </div>

            <div className="p-4">
              <h3
                className="text-base font-bold mb-1"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {meta.label}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {meta.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
