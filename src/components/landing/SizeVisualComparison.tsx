import { useState } from "react";
import { Link } from "react-router-dom";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Crown, Grid3X3, Palette, Ruler, Sparkles, Star } from "lucide-react";
import {
  DEFAULT_PUBLIC_KIT,
  KIT_TONE_STYLES,
  getKitComparisonStats,
  getKitSavings,
  getPublicKitConfigs,
  type KitBadgeIcon,
  type KitCatalogEntry,
} from "@/lib/kitCatalog";

const BADGE_ICONS: Record<KitBadgeIcon, typeof Sparkles> = {
  sparkles: Sparkles,
  star: Star,
  crown: Crown,
};

const CANVAS_SIZES = getPublicKitConfigs();
const DEFAULT_ACTIVE_INDEX = Math.max(
  CANVAS_SIZES.findIndex((kit) => kit.id === DEFAULT_PUBLIC_KIT),
  0,
);
const MAX_VISUAL_H = 220;
const SCALE = MAX_VISUAL_H / Math.max(...CANVAS_SIZES.map((kit) => kit.heightCm));

function CanvasFrame({
  size,
  isActive,
  onClick,
}: {
  size: KitCatalogEntry;
  isActive: boolean;
  onClick: () => void;
}) {
  const toneStyles = KIT_TONE_STYLES[size.tone];
  const width = size.widthCm * SCALE;
  const height = size.heightCm * SCALE;

  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center gap-4 transition-all duration-500 ${
        isActive ? "scale-105" : "scale-95 opacity-50 hover:opacity-80"
      }`}
      type="button"
    >
      <div className="relative">
        <div
          className={`rounded-md border-2 transition-all duration-500 ${
            isActive
              ? `${toneStyles.glowBorder} ${toneStyles.softBg} shadow-xl shadow-primary/15`
              : "border-border bg-muted/20 shadow-sm"
          }`}
          style={{ width, height }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-serif font-bold transition-all duration-500 ${isActive ? "text-lg text-foreground" : "text-sm text-muted-foreground"}`}>
              {size.shortLabel}
            </span>
          </div>
        </div>
        <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium transition-colors duration-300 ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
          {size.dimensionsLabel}
        </div>
      </div>
    </button>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Ruler;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function SizeVisualComparison() {
  const ref = useScrollReveal();
  const [activeIdx, setActiveIdx] = useState(DEFAULT_ACTIVE_INDEX);
  const active = CANVAS_SIZES[activeIdx];
  const activeStats = getKitComparisonStats(active.id);
  const savings = getKitSavings(active.id);
  const toneStyles = KIT_TONE_STYLES[active.tone];
  const BadgeIcon = active.badge ? BADGE_ICONS[active.badge.icon] : null;

  return (
    <section className="overflow-hidden py-24 md:py-32" id="sizes">
      <div className="container mx-auto px-4">
        <div ref={ref} className="scroll-reveal mb-14 text-center">
          <Badge variant="secondary" className="mb-4 border-primary/20 bg-primary/5 text-xs uppercase tracking-widest text-primary">
            Dimensions
          </Badge>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            Comparez les dimensions réelles
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Cliquez pour voir les détails de chaque format.
          </p>
        </div>

        <div className="mx-auto max-w-4xl">
          <div className="mb-14 flex items-end justify-center gap-8 px-4 pb-8 pt-4 md:gap-12">
            {CANVAS_SIZES.map((size, index) => (
              <CanvasFrame
                key={size.id}
                size={size}
                isActive={index === activeIdx}
                onClick={() => setActiveIdx(index)}
              />
            ))}
          </div>

          <div key={active.id} className="relative animate-fade-in overflow-hidden rounded-3xl border-2 border-border/60 bg-card p-6 shadow-lg md:p-8">
            <div className={`absolute inset-x-0 top-0 h-1 ${toneStyles.accentStrip}`} />

            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-serif text-2xl font-bold text-foreground">{active.displayLabel}</h3>
                  {BadgeIcon && active.badge && (
                    <Badge className="gap-1 border border-primary/15 bg-primary/5 text-[10px] font-semibold text-primary">
                      <BadgeIcon className="h-3 w-3" />
                      {active.badge.label}
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{active.summary}</p>
              </div>

              <div className="text-left md:text-right">
                <div className="flex items-baseline gap-2 md:justify-end">
                  <span className="text-3xl font-bold text-primary">{active.price}</span>
                  <span className="text-sm text-muted-foreground">DT</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground md:justify-end">
                  <span className="line-through">{active.originalPrice} DT</span>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">-{savings}%</span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatItem icon={Grid3X3} label="Cellules" value={activeStats.totalCells.toLocaleString("fr-FR")} />
              <StatItem icon={Palette} label="Couleurs" value={active.colorsLabel} />
              <StatItem icon={Clock} label="Durée" value={active.hoursLabel} />
              <StatItem icon={Ruler} label="Format" value={active.dimensionsLabel} />
            </div>

            <div className="mt-6 flex flex-col items-start justify-between gap-4 border-t border-border/50 pt-5 sm:flex-row sm:items-center">
              <p className="text-sm text-muted-foreground">
                {activeStats.totalPages} pages PDF • {activeStats.totalSections} sections
              </p>
              <Button asChild className="rounded-full px-8 font-semibold btn-premium border-0 text-primary-foreground">
                <Link to="/studio">
                  Commencer avec {active.shortLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
