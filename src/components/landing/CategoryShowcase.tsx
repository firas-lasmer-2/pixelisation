import { Link } from "react-router-dom";
import { CATEGORY_META, type OrderCategory } from "@/lib/store";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import catClassic from "@/assets/cat-classic.png";
import catFamily from "@/assets/cat-family.png";
import catKidsDream from "@/assets/cat-kids-dream.png";
import catPetRoyal from "@/assets/cat-pet-royal.png";
import catSuperhero from "@/assets/cat-superhero.png";
import catCouple from "@/assets/cat-couple.png";
import catHistorical from "@/assets/cat-historical.png";
import catScifi from "@/assets/cat-scifi.png";
import catAnime from "@/assets/cat-anime.png";

export const CATEGORY_IMAGES: Record<OrderCategory, string> = {
  classic: catClassic,
  family: catFamily,
  kids_dream: catKidsDream,
  pet: catPetRoyal,
  superhero: catSuperhero,
  couple: catCouple,
  historical: catHistorical,
  scifi: catScifi,
  anime: catAnime,
};

const CATEGORIES: { key: OrderCategory; gradient: string; hoverBg: string }[] = [
  { key: "classic", gradient: "from-primary/20 via-primary/10 to-transparent", hoverBg: "group-hover:bg-primary/5" },
  { key: "family", gradient: "from-accent/20 via-accent/10 to-transparent", hoverBg: "group-hover:bg-accent/5" },
  { key: "kids_dream", gradient: "from-blue-500/20 via-blue-500/10 to-transparent", hoverBg: "group-hover:bg-blue-500/5" },
  { key: "pet", gradient: "from-amber-500/20 via-amber-500/10 to-transparent", hoverBg: "group-hover:bg-amber-500/5" },
  { key: "superhero", gradient: "from-red-500/20 via-red-500/10 to-transparent", hoverBg: "group-hover:bg-red-500/5" },
  { key: "couple", gradient: "from-pink-500/20 via-pink-500/10 to-transparent", hoverBg: "group-hover:bg-pink-500/5" },
  { key: "historical", gradient: "from-amber-700/20 via-amber-700/10 to-transparent", hoverBg: "group-hover:bg-amber-700/5" },
  { key: "scifi", gradient: "from-cyan-500/20 via-cyan-500/10 to-transparent", hoverBg: "group-hover:bg-cyan-500/5" },
  { key: "anime", gradient: "from-violet-500/20 via-violet-500/10 to-transparent", hoverBg: "group-hover:bg-violet-500/5" },
];

export function CategoryShowcase() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
      
      <div className="container mx-auto px-4 relative">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
            4 expériences créatives
          </p>
          <h2
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Choisissez votre expérience
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Du portrait classique aux créations IA — chaque catégorie offre une expérience unique
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          {CATEGORIES.map((cat, idx) => {
            const meta = CATEGORY_META[cat.key];
            const isAI = cat.key !== "classic";

            return (
              <Link
                key={cat.key}
                to={`/studio?category=${cat.key}`}
                className={`group relative rounded-2xl border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${cat.hoverBg}`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`h-48 bg-gradient-to-br ${cat.gradient} flex items-center justify-center relative overflow-hidden`}>
                  <img
                    src={CATEGORY_IMAGES[cat.key]}
                    alt={meta.label}
                    className="h-40 w-40 object-contain transition-transform duration-500 group-hover:scale-110 drop-shadow-lg"
                  />
                  {isAI && (
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-card/80 backdrop-blur-sm border border-border text-primary">
                        <Sparkles className="h-2.5 w-2.5" /> IA
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h3
                    className="text-base font-bold mb-1.5"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {meta.label}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    {meta.description}
                  </p>
                  <div className="flex items-center gap-1 text-xs font-semibold text-primary transition-transform duration-200 group-hover:translate-x-1">
                    Commencer <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Button asChild size="lg" className="shimmer-btn rounded-full px-10 h-12 gap-2 shadow-lg shadow-primary/20">
            <Link to="/studio">
              <Sparkles className="h-4 w-4" />
              Explorer toutes les catégories
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
