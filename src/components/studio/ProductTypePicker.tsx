import { Check, Layers, Sparkles, Paintbrush } from "lucide-react";
import { type ProductType, PRODUCT_TYPE_META } from "@/lib/store";

const PRODUCT_CARDS: {
  key: ProductType;
  gradient: string;
  borderAccent: string;
  Icon: typeof Sparkles;
  badge?: string;
}[] = [
  {
    key: "paint_by_numbers",
    gradient: "from-primary/10 to-primary/5",
    borderAccent: "border-t-primary",
    Icon: Layers,
  },
  {
    key: "stencil_paint",
    gradient: "from-amber-600/10 to-amber-600/5",
    borderAccent: "border-t-amber-600",
    Icon: Paintbrush,
    badge: "Nouveau",
  },
  {
    key: "glitter_reveal",
    gradient: "from-purple-500/10 to-purple-500/5",
    borderAccent: "border-t-purple-500",
    Icon: Sparkles,
    badge: "Nouveau",
  },
];

interface ProductTypePickerProps {
  selected: ProductType;
  onSelect: (type: ProductType) => void;
}

export function ProductTypePicker({ selected, onSelect }: ProductTypePickerProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {PRODUCT_CARDS.map((card, idx) => {
        const meta = PRODUCT_TYPE_META[card.key];
        const isSelected = selected === card.key;
        const Icon = card.Icon;

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

            {card.badge && (
              <div className="absolute top-3 right-3 z-10">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30">
                  <Sparkles className="h-2.5 w-2.5" /> {card.badge}
                </span>
              </div>
            )}

            <div className={`bg-gradient-to-br ${card.gradient} flex items-center justify-center py-6`}>
              <div className="w-16 h-16 rounded-full bg-background/60 flex items-center justify-center shadow-sm">
                <Icon className="h-8 w-8 text-foreground/70" />
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{meta.icon}</span>
                <h3
                  className="text-base font-bold"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {meta.label}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {meta.description}
              </p>
              <div className="mt-3 text-[11px] font-semibold text-primary/80 tracking-wide">
                {meta.shortDescription}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
