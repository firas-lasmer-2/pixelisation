import { useTranslation } from "@/i18n";
import { PALETTES } from "@/lib/palettes";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Sparkles } from "lucide-react";

const styleKeys = ["original", "vintage", "popArt"] as const;
const paletteIds = ["original", "vintage", "popart"] as const;
const styleImages = [
  "/images/style-original.jpg",
  "/images/style-vintage.jpg",
  "/images/style-popart.jpg",
];

export function StyleShowcase() {
  const { t } = useTranslation();
  const sectionRef = useScrollReveal();
  return (
    <section id="styles" className="relative bg-card py-24 md:py-32">
      {/* Decorative top border */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="container mx-auto px-4">
        <div ref={sectionRef} className="scroll-reveal mx-auto mb-20 max-w-3xl text-center">
          <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            {t.styles.sectionTitle}
          </span>
          <h2 className="mb-6 text-4xl font-bold md:text-5xl">{t.styles.sectionTitle}</h2>
          <p className="text-lg text-muted-foreground">{t.styles.sectionSubtitle}</p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {styleKeys.map((key, i) => {
            const style = t.styles[key];
            const palette = PALETTES[paletteIds[i]];
            return (
              <StyleCard key={key} style={style} palette={palette} image={styleImages[i]} index={i} isFirst={i === 0} />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StyleCard({
  style,
  palette,
  image,
  index,
  isFirst,
}: {
  style: { name: string; description: string };
  palette: any;
  image: string;
  index: number;
  isFirst: boolean;
}) {
  const ref = useScrollReveal({ staggerDelay: index * 150 });

  return (
    <div ref={ref} className="scroll-reveal">
      <div className="group relative overflow-hidden rounded-2xl border-2 border-border bg-background transition-all duration-500 hover:border-primary/30 hover:shadow-2xl hover:-translate-y-3">
        {/* Popular badge */}
        {isFirst && (
          <div className="absolute top-4 end-4 z-10 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg">
            <Sparkles className="h-3 w-3" />
            Popular
          </div>
        )}

        {/* Image with overlay on hover */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={image}
            alt={style.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-60" />
          
          {/* Title overlay at bottom of image */}
          <div className="absolute inset-x-0 bottom-0 p-6">
            <h3 className="text-2xl font-bold text-foreground">{style.name}</h3>
          </div>
        </div>

        {/* Color palette strip */}
        <div className="flex h-2">
          {palette?.colors.slice(0, 8).map((c: any, j: number) => (
            <div key={j} className="flex-1 transition-all duration-300 group-hover:h-3" style={{ backgroundColor: c.hex }} />
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{style.description}</p>
          
          {/* Swatches with names */}
          <div className="flex flex-wrap gap-2">
            {palette?.colors.slice(0, 6).map((c: any, j: number) => (
              <div
                key={j}
                className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 transition-all group-hover:border-primary/20"
              >
                <div
                  className="h-3 w-3 rounded-full ring-1 ring-border"
                  style={{ backgroundColor: c.hex }}
                />
                <span className="text-[10px] font-medium text-muted-foreground">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
