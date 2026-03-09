import { Check } from "lucide-react";

interface SectionMinimapProps {
  totalSections: number;
  sectionCols: number;
  activeSection: number;
  completedSections: Set<number>;
  onSelect: (idx: number) => void;
}

export function SectionMinimap({ totalSections, sectionCols, activeSection, completedSections, onSelect }: SectionMinimapProps) {
  return (
    <div
      className="inline-grid gap-0.5 w-full"
      style={{ gridTemplateColumns: `repeat(${sectionCols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: totalSections }, (_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`relative aspect-square rounded text-[10px] font-bold transition-all duration-200 border ${
            i === activeSection
              ? "bg-primary text-primary-foreground border-primary shadow-md scale-110 z-10"
              : completedSections.has(i)
                ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:border-primary/50"
          }`}
        >
          {completedSections.has(i) && i !== activeSection ? (
            <Check className="h-3 w-3 mx-auto" />
          ) : (
            i + 1
          )}
        </button>
      ))}
    </div>
  );
}
