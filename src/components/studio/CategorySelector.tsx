import { type OrderCategory, CATEGORY_META } from "@/lib/store";
import { Check, Sparkles } from "lucide-react";
import { CATEGORY_IMAGES } from "@/components/landing/CategoryShowcase";

const CATEGORY_CARDS: { key: OrderCategory; accentColor: string }[] = [
  { key: "classic", accentColor: "text-primary" },
  { key: "family", accentColor: "text-accent" },
  { key: "kids_dream", accentColor: "text-blue-500" },
  { key: "pet", accentColor: "text-amber-500" },
  { key: "superhero", accentColor: "text-red-500" },
  { key: "couple", accentColor: "text-pink-500" },
  { key: "historical", accentColor: "text-amber-700" },
  { key: "scifi", accentColor: "text-cyan-500" },
  { key: "anime", accentColor: "text-violet-500" },
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

            {isAI && (
              <div className="absolute top-4 right-4 z-10">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/5 text-foreground/70 backdrop-blur-md">
                  <Sparkles className="h-2.5 w-2.5" /> IA
                </span>
              </div>
            )}

            <div className={`bg-[#FAFAFA] rounded-[16px] flex items-center justify-center py-5 transition-colors group-hover:bg-[#F0F0F0]`}>
              <img
                src={CATEGORY_IMAGES[card.key]}
                alt={meta.label}
                className={`h-28 w-28 object-contain drop-shadow-sm transition-transform duration-500 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}
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
