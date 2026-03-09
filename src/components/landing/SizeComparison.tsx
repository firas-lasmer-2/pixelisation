import { Link } from "react-router-dom";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, Crown, Sparkles, Star } from "lucide-react";
import {
  DEFAULT_PUBLIC_KIT,
  MAX_KIT_DIFFICULTY,
  getKitComparisonStats,
  getKitSavings,
  getPublicKitConfigs,
  type KitBadgeIcon,
} from "@/lib/kitCatalog";

const BADGE_ICONS: Record<KitBadgeIcon, typeof Sparkles> = {
  sparkles: Sparkles,
  star: Star,
  crown: Crown,
};

const SIZES = getPublicKitConfigs().map((kit) => {
  const stats = getKitComparisonStats(kit.id);

  return {
    ...kit,
    stats,
    discount: getKitSavings(kit.id),
    isDefault: kit.id === DEFAULT_PUBLIC_KIT,
  };
});

const ROWS = [
  { key: "dimensions", label: "Format" },
  { key: "cells", label: "Cellules" },
  { key: "colors", label: "Couleurs" },
  { key: "sections", label: "Sections" },
  { key: "pages", label: "Pages PDF" },
  { key: "hours", label: "Durée estimée" },
  { key: "difficulty", label: "Difficulté" },
] as const;

function DifficultyDots({ level }: { level: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: MAX_KIT_DIFFICULTY }).map((_, index) => (
        <div
          key={index}
          className={`h-2.5 w-2.5 rounded-full transition-colors ${
            index < level ? "bg-primary" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

function DiscountBadge({ discount }: { discount: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
      -{discount}%
    </span>
  );
}

function getRowValue(size: (typeof SIZES)[number], key: (typeof ROWS)[number]["key"]) {
  switch (key) {
    case "dimensions":
      return size.dimensionsLabel;
    case "cells":
      return size.stats.totalCells.toLocaleString("fr-FR");
    case "colors":
      return size.colorsLabel;
    case "sections":
      return size.stats.totalSections.toLocaleString("fr-FR");
    case "pages":
      return size.stats.totalPages.toLocaleString("fr-FR");
    case "hours":
      return size.hoursLabel;
    case "difficulty":
      return size.displayDifficultyLabel;
    default:
      return "";
  }
}

export function SizeComparison() {
  const ref = useScrollReveal();

  return (
    <section className="bg-background py-24 md:py-32" id="compare">
      <div className="container mx-auto px-4">
        <div ref={ref} className="scroll-reveal mb-16 text-center">
          <Badge variant="secondary" className="mb-4 border-primary/20 bg-primary/5 text-xs uppercase tracking-widest text-primary">
            Comparez
          </Badge>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            Choisissez votre format Helma
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            A3 est désormais notre point de départ recommandé. Ensuite, la gamme monte vers 30 × 40, 40 × 50 et A2 selon le niveau de détail et l&apos;ambition du projet.
          </p>
        </div>

        <div className="hidden md:block">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-border bg-card shadow-lg shadow-primary/5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px]">
                <thead>
                  <tr className="border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
                    <th className="w-[180px] p-5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Spécifications
                    </th>
                    {SIZES.map((size) => {
                      const BadgeIcon = size.badge ? BADGE_ICONS[size.badge.icon] : null;
                      return (
                        <th key={size.id} className="p-5 text-center align-top">
                          <div className="mx-auto flex max-w-[180px] flex-col items-center">
                            {BadgeIcon && size.badge ? (
                              <Badge className="mb-2 gap-1 border border-primary/15 bg-primary/5 text-[10px] font-semibold text-primary">
                                <BadgeIcon className="h-3 w-3" />
                                {size.badge.label}
                              </Badge>
                            ) : (
                              <div className="mb-2 h-5" />
                            )}
                            <p className="font-serif text-lg font-bold text-foreground">{size.shortLabel}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">{size.dimensionsLabel}</p>
                            <p className="mt-3 text-sm font-medium text-foreground">{size.price} DT</p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="line-through">{size.originalPrice} DT</span>
                              <DiscountBadge discount={size.discount} />
                            </div>
                            <p className="mt-3 text-xs leading-5 text-muted-foreground">{size.chooserNote}</p>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, rowIndex) => (
                    <tr key={row.key} className={rowIndex % 2 === 0 ? "bg-muted/20" : ""}>
                      <td className="p-4 pl-5 text-sm font-medium text-muted-foreground">{row.label}</td>
                      {SIZES.map((size) => (
                        <td key={`${size.id}-${row.key}`} className="p-4 text-center text-sm font-semibold text-foreground">
                          {row.key === "difficulty" ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <DifficultyDots level={size.difficultyLevel} />
                              <span className="text-[11px] font-normal text-muted-foreground">{size.displayDifficultyLabel}</span>
                            </div>
                          ) : (
                            getRowValue(size, row.key)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t border-border bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
                    <td className="p-5" />
                    {SIZES.map((size) => (
                      <td key={`${size.id}-cta`} className="p-5 text-center">
                        <Button
                          asChild
                          size="sm"
                          variant={size.isDefault ? "default" : "outline"}
                          className={`rounded-full px-6 font-semibold transition-all hover:scale-105 ${
                            size.isDefault
                              ? "btn-premium border-0 text-primary-foreground"
                              : "border-border hover:border-primary hover:text-primary"
                          }`}
                        >
                          <Link to="/studio">
                            Choisir {size.shortLabel}
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-5 md:hidden">
          {SIZES.map((size) => {
            const BadgeIcon = size.badge ? BADGE_ICONS[size.badge.icon] : null;
            return (
              <div key={size.id} className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/25 via-transparent to-accent/25" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-serif text-xl font-bold text-foreground">{size.displayLabel}</p>
                      {BadgeIcon && size.badge && (
                        <Badge className="gap-1 border border-primary/15 bg-primary/5 text-[10px] font-semibold text-primary">
                          <BadgeIcon className="h-3 w-3" />
                          {size.badge.label}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{size.summary}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{size.price} DT</p>
                    <div className="mt-1 flex items-center justify-end gap-2 text-xs text-muted-foreground">
                      <span className="line-through">{size.originalPrice} DT</span>
                      <DiscountBadge discount={size.discount} />
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  {ROWS.map((row) => (
                    <div key={`${size.id}-${row.key}`} className="flex items-center justify-between gap-3 rounded-xl bg-muted/25 px-3 py-2">
                      <span className="text-xs text-muted-foreground">{row.label}</span>
                      {row.key === "difficulty" ? (
                        <DifficultyDots level={size.difficultyLevel} />
                      ) : (
                        <span className="font-semibold text-foreground">{getRowValue(size, row.key)}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Idéal pour {size.idealFor}</span>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant={size.isDefault ? "default" : "outline"}
                    className={`rounded-full px-5 font-semibold ${
                      size.isDefault ? "btn-premium border-0 text-primary-foreground" : "border-border hover:border-primary hover:text-primary"
                    }`}
                  >
                    <Link to="/studio">
                      Choisir
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-primary" />
          <span>Livraison gratuite • Paiement à la livraison • PDF et viewer alignés sur le même format</span>
        </div>
      </div>
    </section>
  );
}
