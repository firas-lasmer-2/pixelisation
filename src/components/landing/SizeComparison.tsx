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

function DifficultyDots({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: MAX_KIT_DIFFICULTY }).map((_, index) => (
        <div
          key={index}
          className={`h-2 w-2 rounded-full transition-colors ${
            index < level ? "bg-primary" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

export function SizeComparison() {
  const ref = useScrollReveal();

  return (
    <section className="bg-background py-24 md:py-32" id="compare">
      <div className="container mx-auto px-4">
        <div ref={ref} className="scroll-reveal mb-14 text-center">
          <Badge variant="secondary" className="mb-4 border-primary/20 bg-primary/5 text-xs uppercase tracking-widest text-primary">
            Formats
          </Badge>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            Deux formats, même qualité
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            A3 pour commencer ou offrir, A2 pour un rendu mural ambitieux.
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
          {SIZES.map((size) => {
            const BadgeIcon = size.badge ? BADGE_ICONS[size.badge.icon] : null;
            const stats = size.stats;

            return (
              <div
                key={size.id}
                className={`group relative overflow-hidden rounded-3xl border-2 bg-card p-6 shadow-sm transition-all hover:shadow-lg sm:p-7 ${
                  size.isDefault ? "border-primary/30" : "border-border/60"
                }`}
              >
                {/* Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="font-serif text-3xl font-bold text-foreground">{size.shortLabel}</span>
                    {BadgeIcon && size.badge && (
                      <Badge className="gap-1 border border-primary/15 bg-primary/5 text-[10px] font-semibold text-primary">
                        <BadgeIcon className="h-3 w-3" />
                        {size.badge.label}
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="mt-1 text-sm text-muted-foreground">{size.dimensionsLabel}</p>
                <p className="mt-3 text-sm leading-relaxed text-foreground/80">{size.summary}</p>

                {/* Key specs */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    { label: "Cellules", value: stats.totalCells.toLocaleString("fr-FR") },
                    { label: "Couleurs", value: size.colorsLabel },
                    { label: "Durée", value: size.hoursLabel },
                    { label: "Pages PDF", value: `${stats.totalPages} pages` },
                  ].map((spec) => (
                    <div key={spec.label} className="rounded-xl bg-secondary/50 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{spec.label}</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{spec.value}</p>
                    </div>
                  ))}
                </div>

                {/* Difficulty */}
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Difficulté</span>
                  <DifficultyDots level={size.difficultyLevel} />
                  <span className="text-xs font-medium text-foreground">{size.displayDifficultyLabel}</span>
                </div>

                {/* Price + CTA */}
                <div className="mt-6 flex items-end justify-between border-t border-border/50 pt-5">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-foreground">{size.price}</span>
                      <span className="text-sm text-muted-foreground">DT</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="line-through">{size.originalPrice} DT</span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">-{size.discount}%</span>
                    </div>
                  </div>
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
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {["Livraison gratuite", "Paiement à la livraison", "PDF et viewer inclus"].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-primary" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
