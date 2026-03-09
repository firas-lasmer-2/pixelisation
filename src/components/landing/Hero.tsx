import { Link } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Sparkles, Star, CheckCircle, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 2000;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{count.toLocaleString()}{suffix}</span>;
}

export function Hero() {
  const { t } = useTranslation();
  const heroImg = "/images/hero-kit.jpg";
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Layered background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/8" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
        backgroundSize: '32px 32px'
      }} />
      
      {/* Decorative blobs */}
      <div className="absolute top-0 end-0 h-[600px] w-[600px] rounded-full bg-primary/6 blur-[120px]" />
      <div className="absolute bottom-0 start-0 h-[400px] w-[400px] rounded-full bg-accent/5 blur-[100px]" />

      <div className="container relative mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-12">
          {/* Text — 7 cols */}
          <div className="text-center lg:col-span-7 lg:text-start">
            <div className="animate-fade-in-up">
              <Badge variant="secondary" className="mb-8 gap-2 rounded-full border-primary/20 px-5 py-2.5 text-sm font-medium">
                <Truck className="h-4 w-4 text-primary" />
                {t.hero.badge}
              </Badge>
            </div>

            <h1 className="mb-8 animate-fade-in-up text-5xl font-extrabold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl [animation-delay:150ms]">
              <span className="bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
                {t.hero.title}
              </span>
            </h1>

            <p className="mx-auto mb-12 max-w-2xl animate-fade-in-up text-lg leading-relaxed text-muted-foreground md:text-xl lg:mx-0 [animation-delay:300ms]">
              {t.hero.subtitle}
            </p>

            {/* CTA row */}
            <div className="flex animate-fade-in-up flex-col items-center gap-5 sm:flex-row sm:justify-center lg:justify-start [animation-delay:450ms]">
              <Button
                asChild
                size="lg"
                className="shimmer-btn group h-14 rounded-full px-10 text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.03]"
              >
                <Link to="/studio">
                  <Sparkles className="me-2 h-5 w-5" />
                  {t.hero.cta}
                  <ArrowRight className="ms-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>

            {/* Stats row */}
            <div className="mt-16 flex animate-fade-in-up flex-wrap items-center justify-center gap-8 lg:justify-start [animation-delay:600ms]">
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">
                  <AnimatedCounter target={500} suffix="+" />
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.hero.trustPortraits}</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground flex items-center gap-1.5">
                  4.9 <Star className="h-5 w-5 fill-primary text-primary" />
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.hero.trustRating}</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">100%</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.hero.trustSatisfaction}</p>
              </div>
            </div>
          </div>

          {/* Hero image — 5 cols */}
          <div className="relative animate-fade-in-up lg:col-span-5 [animation-delay:400ms]">
            <div className="relative mx-auto max-w-md">
              {/* Decorative frame */}
              <div className="absolute -inset-4 rounded-3xl border-2 border-primary/10 rotate-2" />
              <div className="absolute -inset-4 rounded-3xl border-2 border-accent/10 -rotate-1" />
              
              <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-primary/20 ring-1 ring-foreground/5">
                <img
                  src={heroImg}
                  alt="Pixel Portrait Kit on easel"
                  className="w-full aspect-[3/4] object-cover transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 via-transparent to-transparent" />
              </div>

              {/* Floating review card */}
              <div className="absolute -bottom-6 -start-6 animate-float rounded-2xl border border-border bg-card p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                    <Star className="h-5 w-5 fill-primary text-primary" />
                  </div>
                  <div>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">+500 avis vérifiés</p>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-3 -end-3 animate-float-slow rounded-xl border border-border bg-card px-4 py-2.5 shadow-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">100% Made in Tunisia</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
