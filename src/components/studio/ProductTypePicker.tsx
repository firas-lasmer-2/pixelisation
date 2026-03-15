import { Check, Layers, Sparkles, Paintbrush } from "lucide-react";
import { type ProductType, PRODUCT_TYPE_META } from "@/lib/store";

const PRODUCT_CARDS: {
  key: ProductType;
  accentColor: string;
  Icon: typeof Sparkles;
  badge?: string;
}[] = [
  {
    key: "paint_by_numbers",
    accentColor: "text-primary",
    Icon: Layers,
  },
  {
    key: "stencil_paint",
    accentColor: "text-amber-600",
    Icon: Paintbrush,
    badge: "Nouveau",
  },
  {
    key: "glitter_reveal",
    accentColor: "text-purple-500",
    Icon: Sparkles,
    badge: "Nouveau",
  },
];

interface ProductTypePickerProps {
  selected: ProductType;
  onSelect: (type: ProductType) => void;
  products?: ProductType[];
}

export function ProductTypePicker({ selected, onSelect, products }: ProductTypePickerProps) {
  const visibleCards = products
    ? PRODUCT_CARDS.filter((card) => products.includes(card.key))
    : PRODUCT_CARDS;

  return (
    <div className={`grid gap-4 ${visibleCards.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
      {visibleCards.map((card, idx) => {
        const meta = PRODUCT_TYPE_META[card.key];
        const isSelected = selected === card.key;
        const Icon = card.Icon;

        return (
          <div
            key={card.key}
            onClick={() => onSelect(card.key)}
            className={`relative cursor-pointer rounded-[32px] bg-white overflow-hidden transition-all duration-400 ease-out hover:-translate-y-1 group p-2 ${
              isSelected ? "ring-1 ring-primary/20 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.1)] bg-primary/[0.02]" : "border border-black/[0.04] bg-[#FAFAFA] hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.05)] hover:bg-white"
            }`}
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            {isSelected && (
              <div className="absolute top-4 left-4 z-10 w-7 h-7 rounded-full bg-primary flex items-center justify-center animate-scale-in shadow-sm">
                <Check className="h-4 w-4 text-white" />
              </div>
            )}

            {card.badge && (
              <div className="absolute top-4 right-4 z-10">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/5 text-foreground/70 backdrop-blur-md">
                  <Sparkles className="h-2.5 w-2.5" /> {card.badge}
                </span>
              </div>
            )}

            <div className={`bg-transparent rounded-[24px] flex items-center justify-center py-10 transition-colors`}>
              <div className={`w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm border border-black/[0.03] transition-transform duration-500 ease-out ${isSelected ? 'scale-110 shadow-md ring-4 ring-primary/5' : 'group-hover:scale-110 group-hover:shadow-md'}`}>
                <Icon className={`h-10 w-10 ${card.accentColor}`} />
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
