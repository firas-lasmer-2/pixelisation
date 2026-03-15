import { type OrderCategory, CATEGORY_META } from "@/lib/store";
import { Check, Sparkles } from "lucide-react";
import { CATEGORY_IMAGES } from "@/components/landing/CategoryShowcase";

const CATEGORY_CARDS: { key: OrderCategory; accentBg: string; accentText: string }[] = [
  { key: "classic",    accentBg: "bg-amber-50",   accentText: "text-amber-700" },
  { key: "family",     accentBg: "bg-rose-50",     accentText: "text-rose-600" },
  { key: "kids_dream", accentBg: "bg-blue-50",     accentText: "text-blue-600" },
  { key: "pet",        accentBg: "bg-amber-50",    accentText: "text-amber-600" },
  { key: "superhero",  accentBg: "bg-red-50",      accentText: "text-red-600" },
  { key: "couple",     accentBg: "bg-pink-50",     accentText: "text-pink-600" },
  { key: "historical", accentBg: "bg-yellow-50",   accentText: "text-yellow-700" },
  { key: "scifi",      accentBg: "bg-cyan-50",     accentText: "text-cyan-600" },
  { key: "anime",      accentBg: "bg-violet-50",   accentText: "text-violet-600" },
];

interface CategorySelectorProps {
  selected: OrderCategory;
  onSelect: (cat: OrderCategory) => void;
}

export function CategorySelector({ selected, onSelect }: CategorySelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      {CATEGORY_CARDS.map((card) => {
        const meta = CATEGORY_META[card.key];
        const isSelected = selected === card.key;
        const isAI = card.key !== "classic";

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelect(card.key)}
            className={`group relative flex items-center gap-4 w-full rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
              isSelected
                ? "border-primary/30 bg-primary/[0.03] shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)]"
                : "border-black/[0.05] bg-white hover:border-black/10 hover:shadow-[0_4px_16px_-6px_rgba(0,0,0,0.06)]"
            }`}
          >
            {/* Category image */}
            <div className={`shrink-0 w-14 h-14 rounded-xl flex items-center justify-center ${card.accentBg} transition-transform duration-300 ${isSelected ? "scale-105" : "group-hover:scale-105"}`}>
              <img
                src={CATEGORY_IMAGES[card.key]}
                alt={meta.label}
                className="h-10 w-10 object-contain"
              />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {meta.label}
                </span>
                {isAI && (
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${card.accentBg} ${card.accentText}`}>
                    <Sparkles className="h-2.5 w-2.5" /> IA
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground/80 leading-snug line-clamp-1">
                {meta.description}
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5 font-medium">
                {meta.photosNeeded === 2 ? "2 photos requises" : "1 photo requise"}
              </p>
            </div>

            {/* Selection indicator */}
            <div className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
              isSelected ? "border-primary bg-primary scale-110" : "border-black/15 bg-white"
            }`}>
              {isSelected && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
