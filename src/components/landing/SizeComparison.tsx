import { Link } from "react-router-dom";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Sparkles, ArrowRight, Crown } from "lucide-react";

const SIZES = [
  {
    id: "A4",
    label: "A4 (21 × 30 cm)",
    cells: "~10 000",
    colors: "8",
    sections: "100",
    pages: "12",
    difficulty: 1,
    difficultyLabel: "Débutant",
    hours: "4–8h",
    price: 249,
    originalPrice: 329,
    discount: "-24%",
    badge: { label: "Débutant", icon: Sparkles, cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400" },
    accentCls: "from-emerald-500/10 to-transparent",
    headerBorder: "border-emerald-500/30",
  },
  {
    id: "30x40",
    label: "30 × 40 cm",
    cells: "19 200",
    colors: "12–15",
    sections: "182",
    pages: "19",
    difficulty: 2,
    difficultyLabel: "Intermédiaire",
    hours: "8–20h",
    price: 349,
    originalPrice: 429,
    discount: "-19%",
    badge: null,
    accentCls: "from-primary/10 to-transparent",
    headerBorder: "border-primary/30",
  },
  {
    id: "40x50",
    label: "40 × 50 cm",
    cells: "32 000",
    colors: "12–15",
    sections: "288",
    pages: "27",
    difficulty: 3,
    difficultyLabel: "Avancé",
    hours: "15–30h",
    price: 449,
    originalPrice: 549,
    discount: "-18%",
    badge: { label: "Populaire", icon: Crown, cls: "bg-accent/10 text-accent border-accent/20" },
    accentCls: "from-accent/10 to-transparent",
    headerBorder: "border-accent/30",
  },
];

const ROWS = [
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
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`h-2.5 w-2.5 rounded-full transition-colors ${
            i <= level ? "bg-primary" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

function DiscountBadge({ discount }: { discount: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary">
      {discount}
    </span>
  );
}

export function SizeComparison() {
  const ref = useScrollReveal();

  return (
    <section className="py-24 md:py-32 bg-background" id="compare">
      <div className="container mx-auto px-4">
        <div ref={ref} className="text-center mb-16 scroll-reveal">
          <Badge variant="secondary" className="mb-4 text-xs tracking-widest uppercase border-primary/20 bg-primary/5 text-primary">
            Comparez
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold font-serif tracking-tight text-foreground">
            Choisissez votre format
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-base">
            Du format compact pour débuter au grand format pour les passionnés.
          </p>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block max-w-4xl mx-auto">
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg shadow-primary/5">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
                  <th className="p-5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[160px]">
                    Spécifications
                  </th>
                  {SIZES.map((s) => (
                    <th key={s.id} className="p-5 text-center relative">
                      {s.badge && (
                        <Badge className={`mb-2 gap-1 text-[10px] font-semibold border ${s.badge.cls}`}>
                          <s.badge.icon className="h-3 w-3" />
                          {s.badge.label}
                        </Badge>
                      )}
                      {!s.badge && <div className="mb-2 h-5" />}
                      <p className="text-lg font-bold font-serif text-foreground">{s.label}</p>
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <span className="text-sm text-muted-foreground line-through">{s.originalPrice} DT</span>
                        <span className="text-2xl font-bold text-primary">{s.price} DT</span>
                        <DiscountBadge discount={s.discount} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, ri) => (
                  <tr
                    key={row.key}
                    className={`transition-colors hover:bg-primary/[0.03] ${ri % 2 === 0 ? "bg-muted/20" : ""}`}
                  >
                    <td className="p-4 pl-5 text-sm font-medium text-muted-foreground">
                      {row.label}
                    </td>
                    {SIZES.map((s) => (
                      <td key={s.id} className="p-4 text-center text-sm font-semibold text-foreground">
                        {row.key === "difficulty" ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <DifficultyDots level={s.difficulty} />
                            <span className="text-[11px] text-muted-foreground font-normal">{s.difficultyLabel}</span>
                          </div>
                        ) : (
                          (s as any)[row.key]
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* CTA row */}
                <tr className="border-t border-border bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
                  <td className="p-5" />
                  {SIZES.map((s) => (
                    <td key={s.id} className="p-5 text-center">
                      <Button
                        asChild
                        size="sm"
                        variant={s.id === "40x50" ? "default" : "outline"}
                        className={`rounded-full gap-1.5 px-6 font-semibold transition-all hover:scale-105 ${
                          s.id === "40x50"
                            ? "bg-accent hover:bg-accent/90 text-accent-foreground shadow-md shadow-accent/20"
                            : "border-border hover:border-primary hover:text-primary"
                        }`}
                      >
                        <Link to="/studio">
                          Choisir
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-5">
          {SIZES.map((s) => (
            <div
              key={s.id}
              className={`rounded-2xl border border-border bg-card p-5 relative overflow-hidden shadow-sm`}
            >
              {/* Accent gradient top strip */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${s.accentCls}`} />

              {s.badge && (
                <Badge className={`absolute top-4 right-4 gap-1 text-[10px] font-semibold border ${s.badge.cls}`}>
                  <s.badge.icon className="h-3 w-3" />
                  {s.badge.label}
                </Badge>
              )}
              <p className="text-xl font-bold font-serif text-foreground mb-1">{s.label}</p>
              <div className="mb-5 flex items-center gap-2">
                <span className="text-sm text-muted-foreground line-through">{s.originalPrice} DT</span>
                <span className="text-2xl font-bold text-primary">{s.price} DT</span>
                <DiscountBadge discount={s.discount} />
              </div>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mb-5">
                {ROWS.map((row) => (
                  <div key={row.key} className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">{row.label}</span>
                    {row.key === "difficulty" ? (
                      <DifficultyDots level={s.difficulty} />
                    ) : (
                      <span className="font-semibold text-foreground">{(s as any)[row.key]}</span>
                    )}
                  </div>
                ))}
              </div>
              <Button
                asChild
                size="sm"
                variant={s.id === "40x50" ? "default" : "outline"}
                className={`w-full rounded-full gap-1.5 font-semibold ${
                  s.id === "40x50"
                    ? "bg-accent hover:bg-accent/90 text-accent-foreground shadow-md shadow-accent/20"
                    : "border-border hover:border-primary hover:text-primary"
                }`}
              >
                <Link to="/studio">
                  Choisir <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Trust line */}
        <div className="flex items-center justify-center gap-2 mt-10 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-primary" />
          <span>Livraison gratuite • Paiement à la livraison • Satisfaction garantie</span>
        </div>
      </div>
    </section>
  );
}
