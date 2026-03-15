import { useTranslation } from "@/i18n";
import { Grid3X3, Stamp, BookOpen, Package } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ProductContextBadge } from "@/components/shared/ProductContextBadge";

const icons = [Grid3X3, Stamp, BookOpen, Package];
const accentColors = [
  "bg-primary/10 text-primary",
  "bg-accent/10 text-accent",
  "bg-primary/10 text-primary",
  "bg-accent/10 text-accent",
];

export function KitExplainer() {
  const { t } = useTranslation();
  const sectionRef = useScrollReveal();
  const imageRef = useScrollReveal({ staggerDelay: 100 });
  const kitImg = "/images/kit-flatlay.jpg";

  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background accent */}
      <div className="absolute end-0 top-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />

      <div className="container relative mx-auto px-4">
        <div ref={sectionRef} className="scroll-reveal mx-auto mb-20 max-w-3xl text-center">
          <ProductContextBadge />
          <h2 className="mb-6 text-4xl font-bold md:text-5xl">{t.kit.sectionTitle}</h2>
          <p className="text-lg text-muted-foreground">{t.kit.sectionSubtitle}</p>
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
          {/* Kit image with layered frame */}
          <div ref={imageRef} className="scroll-reveal relative">
            <div className="absolute -inset-3 rounded-3xl border border-primary/10 rotate-1" />
            <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-primary/10 ring-1 ring-border">
              <img
                src={kitImg}
                alt="Kit contents flat lay"
                className="w-full aspect-[4/3] object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/10 to-transparent" />
            </div>
          </div>

          {/* Kit items as numbered list */}
          <div className="space-y-6">
            {t.kit.items.map((item, i) => (
              <KitItem key={i} item={item} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function KitItem({
  item,
  index,
}: {
  item: { title: string; description: string };
  index: number;
}) {
  const ref = useScrollReveal({ staggerDelay: index * 120 });
  const Icon = icons[index];

  return (
    <div ref={ref} className="scroll-reveal group flex items-start gap-5 rounded-2xl border border-transparent p-5 transition-all duration-300 hover:border-border hover:bg-card hover:shadow-lg">
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${accentColors[index]} transition-all duration-300 group-hover:scale-110`}>
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
            {index + 1}
          </span>
          <h3 className="text-lg font-bold">{item.title}</h3>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
      </div>
    </div>
  );
}
