import { type OrderCategory, CATEGORY_META } from "@/lib/store";
import { Check, Sparkles } from "lucide-react";
import { CATEGORY_IMAGES } from "@/components/landing/CategoryShowcase";

const CATEGORY_CARDS: { key: OrderCategory; gradient: string; borderAccent: string }[] = [
  { key: "classic", gradient: "from-primary/10 to-primary/5", borderAccent: "border-t-primary" },
  { key: "family", gradient: "from-accent/10 to-accent/5", borderAccent: "border-t-accent" },
  { key: "kids_dream", gradient: "from-blue-500/10 to-blue-500/5", borderAccent: "border-t-blue-500" },
  { key: "pet", gradient: "from-amber-500/10 to-amber-500/5", borderAccent: "border-t-amber-500" },
];

interface CategorySelectorProps {
  selected: OrderCategory;
  onSelect: (cat: OrderCategory) => void;
}

export function CategorySelector({ selected, onSelect }: CategorySelectorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CATEGORY_CARDS.map((card, idx) => {
        const meta = CATEGORY_META[card.key];
        const isSelected = selected === card.key;
        const isAI = card.key !== "classic";

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

            {isAI && (
              <div className="absolute top-3 right-3 z-10">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30">
                  <Sparkles className="h-2.5 w-2.5" /> IA
                </span>
              </div>
            )}

            <div className={`bg-gradient-to-br ${card.gradient} flex items-center justify-center py-4`}>
              <img
                src={CATEGORY_IMAGES[card.key]}
                alt={meta.label}
                className="h-24 w-24 object-contain drop-shadow-md"
              />
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
              <div className="mt-2 text-[10px] font-medium text-muted-foreground/70">
                {meta.photosNeeded === 2 ? "2 photos requises" : "1 photo requise"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
