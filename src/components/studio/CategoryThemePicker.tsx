import { CATEGORY_THEMES, type OrderCategory } from "@/lib/store";
import { Check } from "lucide-react";

interface CategoryThemePickerProps {
  category: OrderCategory;
  selected: string;
  onSelect: (key: string) => void;
}

export function CategoryThemePicker({ category, selected, onSelect }: CategoryThemePickerProps) {
  const themes = CATEGORY_THEMES[category];
  if (!themes || themes.length === 0) return null;

  return (
    <div className="mt-6 animate-fade-in">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
        Personnalisez votre thème
      </p>
      <div className="flex flex-wrap gap-2">
        {themes.map((theme) => {
          const isSelected = selected === theme.key;
          return (
            <button
              key={theme.key}
              type="button"
              onClick={() => onSelect(theme.key)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                  : "border-black/10 bg-white text-foreground/70 hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              <span>{theme.icon}</span>
              <span>{theme.label}</span>
              {isSelected && <Check className="h-3 w-3 ml-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
