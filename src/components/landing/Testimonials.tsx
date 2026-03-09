import { useTranslation } from "@/i18n";
import { Star, Quote, BadgeCheck } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export function Testimonials() {
  const { t } = useTranslation();
  const sectionRef = useScrollReveal();

  return (
    <section className="relative bg-card py-24 md:py-32 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute start-10 top-20 text-primary/5">
        <Quote className="h-40 w-40" />
      </div>
      <div className="absolute end-10 bottom-20 text-primary/5 rotate-180">
        <Quote className="h-40 w-40" />
      </div>

      <div className="container relative mx-auto px-4">
        <div ref={sectionRef} className="scroll-reveal mx-auto mb-20 max-w-3xl text-center">
          <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            {t.testimonials.sectionTitle}
          </span>
          <h2 className="mb-6 text-4xl font-bold md:text-5xl">{t.testimonials.sectionTitle}</h2>
          <p className="text-lg text-muted-foreground">{t.testimonials.sectionSubtitle}</p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {t.testimonials.items.map((item, i) => (
            <TestimonialCard key={i} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({
  item,
  index,
}: {
  item: { name: string; location: string; text: string; rating: number };
  index: number;
}) {
  const ref = useScrollReveal({ staggerDelay: index * 150 });
  const initials = item.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const bgColors = [
    "bg-primary/15 text-primary",
    "bg-accent/15 text-accent",
    "bg-primary/10 text-primary",
  ];

  return (
    <div ref={ref} className="scroll-reveal">
      <div className="group relative h-full rounded-2xl border-2 border-border bg-background p-8 transition-all duration-300 hover:border-primary/20 hover:shadow-xl hover:-translate-y-2">
        {/* Quote mark */}
        <Quote className="absolute top-6 end-6 h-8 w-8 text-primary/10 transition-colors group-hover:text-primary/20" />

        {/* Stars */}
        <div className="mb-6 flex gap-1">
          {Array.from({ length: item.rating }).map((_, j) => (
            <Star key={j} className="h-5 w-5 fill-primary text-primary" />
          ))}
        </div>

        {/* Quote text */}
        <p className="mb-8 text-base leading-relaxed text-muted-foreground">"{item.text}"</p>

        {/* Author */}
        <div className="flex items-center gap-3 border-t border-border pt-6">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${bgColors[index % 3]}`}>
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold">{item.name}</p>
              <BadgeCheck className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">{item.location}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
