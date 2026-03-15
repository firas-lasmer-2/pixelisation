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
    <div className={`grid gap-3 ${visibleCards.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
      {visibleCards.map((card, idx) => {
        const meta = PRODUCT_TYPE_META[card.key];
        const isSelected = selected === card.key;
        const Icon = card.Icon;

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelect(card.key)}
            className={`group relative overflow-hidden rounded-[28px] border p-4 text-left transition-all duration-300 ease-out hover:-translate-y-0.5 sm:p-5 ${
              isSelected
                ? "border-primary/20 bg-primary/[0.035] shadow-[0_12px_32px_-16px_rgba(0,0,0,0.18)]"
                : "border-black/[0.05] bg-[#FBFBFA] hover:border-black/10 hover:bg-white hover:shadow-[0_12px_30px_-18px_rgba(0,0,0,0.16)]"
            }`}
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-black/[0.04] bg-white shadow-sm transition-transform duration-300 ${isSelected ? "scale-105 ring-4 ring-primary/5" : "group-hover:scale-105"}`}>
                  <Icon className={`h-6 w-6 ${card.accentColor}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg leading-none">{meta.icon}</span>
                    <h3
                      className="text-[15px] font-bold text-foreground"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {meta.label}
                    </h3>
                    {card.badge && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-foreground/70">
                        <Sparkles className="h-2.5 w-2.5" /> {card.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {meta.shortDescription}
                  </p>
                </div>
              </div>
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                isSelected ? "border-primary bg-primary" : "border-black/12 bg-white"
              }`}>
                {isSelected && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {meta.features.slice(0, 2).map((feature) => (
                <span
                  key={feature}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    isSelected ? "bg-primary/10 text-primary" : "bg-black/[0.035] text-foreground/70"
                  }`}
                >
                  {feature}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {meta.description}
            </p>
            {isSelected && (
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                <Check className="h-3 w-3" />
                Sélectionné
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
