import { type OrderCategory, CATEGORY_META } from "@/lib/store";
import { Check, Sparkles } from "lucide-react";
import { CATEGORY_IMAGES } from "@/components/landing/CategoryShowcase";

const CATEGORY_CARDS: { key: OrderCategory; accentBg: string; accentText: string; ring: string }[] = [
  { key: "classic",    accentBg: "bg-amber-50",  accentText: "text-amber-700",  ring: "ring-amber-200/60"  },
  { key: "family",     accentBg: "bg-rose-50",   accentText: "text-rose-600",   ring: "ring-rose-200/60"   },
  { key: "kids_dream", accentBg: "bg-blue-50",   accentText: "text-blue-600",   ring: "ring-blue-200/60"   },
  { key: "pet",        accentBg: "bg-amber-50",  accentText: "text-amber-600",  ring: "ring-amber-200/60"  },
  { key: "superhero",  accentBg: "bg-red-50",    accentText: "text-red-600",    ring: "ring-red-200/60"    },
  { key: "couple",     accentBg: "bg-pink-50",   accentText: "text-pink-600",   ring: "ring-pink-200/60"   },
  { key: "historical", accentBg: "bg-yellow-50", accentText: "text-yellow-700", ring: "ring-yellow-200/60" },
  { key: "scifi",      accentBg: "bg-cyan-50",   accentText: "text-cyan-600",   ring: "ring-cyan-200/60"   },
  { key: "anime",      accentBg: "bg-violet-50", accentText: "text-violet-600", ring: "ring-violet-200/60" },
];

interface CategorySelectorProps {
  selected: OrderCategory;
  onSelect: (cat: OrderCategory) => void;
}

export function CategorySelector({ selected, onSelect }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {CATEGORY_CARDS.map((card) => {
        const meta = CATEGORY_META[card.key];
        const isSelected = selected === card.key;
        const isAI = card.key !== "classic";

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelect(card.key)}
            className={`group relative overflow-hidden rounded-[20px] border flex flex-col text-left transition-all duration-200 focus:outline-none ${
              isSelected
                ? `border-primary/25 ring-2 ${card.ring} shadow-[0_10px_28px_-14px_rgba(0,0,0,0.18)]`
                : "border-black/[0.06] hover:border-black/10 hover:shadow-[0_8px_20px_-14px_rgba(0,0,0,0.13)]"
            }`}
          >
            {/* Image area */}
            <div className={`relative flex items-center justify-center ${card.accentBg} aspect-square w-full pt-6 pb-5 px-5`}>
              <img
                src={CATEGORY_IMAGES[card.key]}
                alt={meta.label}
                className="h-24 w-24 object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-[1.08]"
              />
              {/* AI badge */}
              {isAI && (
                <span className={`absolute top-2 right-2 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/90 backdrop-blur-sm ${card.accentText} shadow-sm`}>
                  <Sparkles className="h-2 w-2" /> IA
                </span>
              )}
              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-2 left-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </div>
              )}
            </div>

            {/* Label area */}
            <div className={`px-3.5 py-3 flex-1 transition-colors ${isSelected ? "bg-primary/[0.03]" : "bg-white"}`}>
              <p
                className="text-[13px] font-bold text-foreground leading-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {meta.label}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {meta.photosNeeded === 2 ? "2 photos" : "1 photo"}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
