import { Link } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Sparkles, Truck, Banknote, ShieldCheck, ArrowRight } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export function CTABanner() {
  const { t } = useTranslation();
  const ref = useScrollReveal();

  const trustItems = [
    { icon: Truck, label: t.ctaBanner.trustShipping },
    { icon: Banknote, label: t.ctaBanner.trustCod },
    { icon: ShieldCheck, label: t.ctaBanner.trustSatisfaction },
  ];

  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      {/* Dramatic gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/8 to-accent/15" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
        backgroundSize: '24px 24px'
      }} />
      <div className="absolute -start-32 top-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-primary/15 blur-[120px]" />
      <div className="absolute -end-32 top-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-accent/15 blur-[120px]" />

      <div ref={ref} className="scroll-reveal container relative mx-auto px-4 text-center">
        <h2 className="mb-6 text-4xl font-bold md:text-5xl lg:text-6xl">
          {t.ctaBanner.title}
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground md:text-xl">
          {t.ctaBanner.subtitle}
        </p>

        <Button
          asChild
          size="lg"
          className="shimmer-btn group mb-12 h-14 rounded-full px-12 text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.03]"
        >
          <Link to="/studio">
            <Sparkles className="me-2 h-5 w-5" />
            {t.ctaBanner.cta}
            <ArrowRight className="ms-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>

        <div className="flex flex-col items-center justify-center gap-8 sm:flex-row">
          {trustItems.map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm font-medium text-foreground/80">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/10">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
