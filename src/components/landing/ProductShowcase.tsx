import { ArrowRight, Layers, Paintbrush, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PRODUCT_TYPE_META, type ProductType } from "@/lib/store";

const PRODUCT_CARDS: {
  key: ProductType;
  gradient: string;
  borderColor: string;
  accentBg: string;
  Icon: typeof Sparkles;
  howItWorks: string[];
  badge?: string;
  badgeColor?: string;
}[] = [
  {
    key: "paint_by_numbers",
    gradient: "from-amber-900/10 via-amber-700/5 to-transparent",
    borderColor: "border-amber-700/30",
    accentBg: "bg-amber-900/10",
    Icon: Layers,
    howItWorks: ["Choisissez votre photo", "Peignez case par case", "Admirez le résultat"],
  },
  {
    key: "stencil_paint",
    gradient: "from-blue-800/10 via-blue-600/5 to-transparent",
    borderColor: "border-blue-600/30",
    accentBg: "bg-blue-800/10",
    Icon: Paintbrush,
    howItWorks: ["Peignez librement sur la toile", "Laissez sécher", "Décollez le pochoir — révélation !"],
    badge: "Nouveau",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300",
  },
  {
    key: "glitter_reveal",
    gradient: "from-purple-800/10 via-purple-600/5 to-transparent",
    borderColor: "border-purple-600/30",
    accentBg: "bg-purple-800/10",
    Icon: Sparkles,
    howItWorks: ["Saupoudrez les paillettes", "Pressez doucement", "Décollez — la magie opère !"],
    badge: "Nouveau",
    badgeColor: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300",
  },
];

export function ProductShowcase() {
  const navigate = useNavigate();

  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
            Nos créations
          </p>
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Trois façons de sublimer vos souvenirs
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
            Choisissez la technique qui vous correspond. Toutes transforment vos photos en œuvres d'art personnalisées.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {PRODUCT_CARDS.map((card) => {
            const meta = PRODUCT_TYPE_META[card.key];
            const Icon = card.Icon;

            return (
              <div
                key={card.key}
                className={`relative rounded-2xl border ${card.borderColor} bg-gradient-to-b ${card.gradient} overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group`}
              >
                {card.badge && (
                  <div className="absolute top-4 right-4">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${card.badgeColor}`}>
                      <Sparkles className="h-2.5 w-2.5" /> {card.badge}
                    </span>
                  </div>
                )}

                {/* Icon area */}
                <div className={`${card.accentBg} flex items-center justify-center py-10`}>
                  <div className="w-20 h-20 rounded-full bg-background/70 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-10 w-10 text-foreground/70" />
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{meta.icon}</span>
                    <h3
                      className="text-lg font-bold"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {meta.label}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                    {meta.description}
                  </p>

                  {/* How it works mini-steps */}
                  <div className="space-y-2 mb-6">
                    {card.howItWorks.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                          {i + 1}
                        </span>
                        {step}
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() =>
                      navigate(
                        card.key === "paint_by_numbers"
                          ? `/studio?product=${card.key}`
                          : `/studio/manual?product=${card.key}`
                      )
                    }
                    variant="outline"
                    className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors"
                    size="sm"
                  >
                    Commencer <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
