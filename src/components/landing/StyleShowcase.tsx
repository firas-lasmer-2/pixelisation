import { useTranslation } from "@/i18n";
import { getShowcasePalette } from "@/lib/palettes";
import { getPublicStyles } from "@/lib/styles";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Sparkles } from "lucide-react";
import { ProductContextBadge } from "@/components/shared/ProductContextBadge";

export function StyleShowcase() {
  const { t } = useTranslation();
  const sectionRef = useScrollReveal();
  const styles = getPublicStyles();

  return (
    <section id="styles" className="relative bg-card py-24 md:py-32">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="container mx-auto px-4">
        <div ref={sectionRef} className="scroll-reveal mx-auto mb-20 max-w-3xl text-center">
          <ProductContextBadge />
          <h2 className="mb-6 text-4xl font-bold md:text-5xl">{t.styles.sectionTitle}</h2>
          <p className="text-lg text-muted-foreground">{t.styles.sectionSubtitle}</p>
        </div>

        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 xl:grid-cols-5">
          {styles.map((style, index) => {
            const copy = t.styles[style.translationKey];
            const palette = getShowcasePalette(style.key);
            return (
              <StyleCard
                key={style.key}
                title={copy.name}
                description={copy.description}
                palette={palette}
                styleIndex={index}
                badgeLabel={style.badgeLabel}
                imageUrl={style.showcase.imageUrl}
                background={style.showcase.background}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StyleCard({
  title,
  description,
  palette,
  styleIndex,
  badgeLabel,
  imageUrl,
  background,
}: {
  title: string;
  description: string;
  palette: ReturnType<typeof getShowcasePalette>;
  styleIndex: number;
  badgeLabel?: string;
  imageUrl?: string;
  background: string;
}) {
  const ref = useScrollReveal({ staggerDelay: styleIndex * 110 });

  return (
    <div ref={ref} className="scroll-reveal">
      <div className="group relative overflow-hidden rounded-2xl border-2 border-border bg-background transition-all duration-500 hover:border-primary/30 hover:shadow-2xl hover:-translate-y-3">
        {badgeLabel && (
          <div className="absolute top-4 end-4 z-10 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg">
            <Sparkles className="h-3 w-3" />
            {badgeLabel}
          </div>
        )}

        <div className="relative aspect-[3/4] overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="relative h-full w-full transition-transform duration-700 group-hover:scale-105" style={{ background }}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_40%)]" />
              <div className="absolute bottom-10 left-8 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
              <div className="absolute right-8 top-12 h-16 w-28 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm" />
              <div className="absolute inset-x-8 bottom-8 h-24 rounded-[28px] border border-white/20 bg-white/10 backdrop-blur-sm" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-60" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            <h3 className="text-2xl font-bold text-foreground">{title}</h3>
          </div>
        </div>

        <div className="flex h-2">
          {palette.colors.map((color, index) => (
            <div key={`${title}-${index}`} className="flex-1 transition-all duration-300 group-hover:h-3" style={{ backgroundColor: color.hex }} />
          ))}
        </div>

        <div className="p-6">
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{description}</p>
          <div className="flex flex-wrap gap-2">
            {palette.colors.slice(0, 6).map((color) => (
              <div
                key={`${title}-${color.hex}`}
                className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 transition-all group-hover:border-primary/20"
              >
                <div className="h-3 w-3 rounded-full ring-1 ring-border" style={{ backgroundColor: color.hex }} />
                <span className="text-[10px] font-medium text-muted-foreground">{color.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
