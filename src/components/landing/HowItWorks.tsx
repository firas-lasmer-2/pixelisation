import { useTranslation } from "@/i18n";
import { Upload, Palette, ShoppingBag, Package, ArrowRight, Paintbrush, Sparkles } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const icons = [Upload, Palette, ShoppingBag, Package];
const stepImages = [
  "/images/step-upload.jpg",
  "/images/step-styles.jpg",
  "/images/step-kit.jpg",
  "/images/step-result.jpg",
];

export function HowItWorks() {
  const { t } = useTranslation();
  const sectionRef = useScrollReveal();
  return (
    <section id="how-it-works" className="relative py-24 md:py-32">
      {/* Subtle background texture */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }} />

      <div className="container relative mx-auto px-4">
        <div ref={sectionRef} className="scroll-reveal mx-auto mb-20 max-w-3xl text-center">
          <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            {t.howItWorks.sectionTitle}
          </span>
          <h2 className="mb-6 text-4xl font-bold md:text-5xl">{t.howItWorks.sectionTitle}</h2>
          <p className="text-lg text-muted-foreground">{t.howItWorks.sectionSubtitle}</p>
        </div>

        <div className="mx-auto max-w-6xl">
          {t.howItWorks.steps.map((step, i) => {
            const Icon = icons[i];
            const isEven = i % 2 === 0;
            return (
              <StepRow key={i} step={step} index={i} Icon={Icon} image={stepImages[i]} isEven={isEven} isLast={i === t.howItWorks.steps.length - 1} />
            );
          })}

          {/* Other product types */}
          <div className="mt-16 mx-auto max-w-2xl">
            <Accordion type="single" collapsible className="space-y-3">
              <AccordionItem value="stencil" className="rounded-xl border-2 border-border bg-card px-6 transition-all data-[state=open]:border-blue-200 data-[state=open]:shadow-md">
                <AccordionTrigger className="text-start text-base font-semibold hover:no-underline py-5">
                  <span className="flex items-center gap-2">
                    <Paintbrush className="h-4 w-4 text-blue-600" />
                    {t.howItWorks.stencilTitle}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  <div className="space-y-3">
                    {t.howItWorks.stencilSteps.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {i + 1}
                        </span>
                        {s}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="glitter" className="rounded-xl border-2 border-border bg-card px-6 transition-all data-[state=open]:border-purple-200 data-[state=open]:shadow-md">
                <AccordionTrigger className="text-start text-base font-semibold hover:no-underline py-5">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    {t.howItWorks.glitterTitle}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  <div className="space-y-3">
                    {t.howItWorks.glitterSteps.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {i + 1}
                        </span>
                        {s}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepRow({
  step,
  index,
  Icon,
  image,
  isEven,
  isLast,
}: {
  step: { title: string; description: string };
  index: number;
  Icon: typeof Upload;
  image: string;
  isEven: boolean;
  isLast: boolean;
}) {
  const ref = useScrollReveal({ staggerDelay: index * 100 });

  return (
    <div ref={ref} className="scroll-reveal">
      <div className={`grid items-center gap-8 md:grid-cols-2 md:gap-16 ${!isLast ? 'mb-16 md:mb-24' : ''}`}>
        {/* Image */}
        <div className={`relative ${!isEven ? 'md:order-2' : ''}`}>
          <div className="group relative overflow-hidden rounded-2xl">
            <img
              src={image}
              alt={step.title}
              className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent" />
            
            {/* Step number overlay */}
            <div className="absolute bottom-4 start-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-lg">
              {index + 1}
            </div>
          </div>
        </div>

        {/* Text */}
        <div className={`${!isEven ? 'md:order-1' : ''}`}>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-6">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <h3 className="mb-4 text-2xl font-bold md:text-3xl">{step.title}</h3>
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg">{step.description}</p>
          
          {!isLast && (
            <div className="mt-6 hidden md:block">
              <ArrowRight className="h-5 w-5 text-primary/40 rotate-90" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
