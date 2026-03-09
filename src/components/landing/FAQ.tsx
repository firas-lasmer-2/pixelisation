import { useTranslation } from "@/i18n";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Mail, MessageCircle } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export function FAQ() {
  const { t } = useTranslation();
  const sectionRef = useScrollReveal();
  const accordionRef = useScrollReveal({ staggerDelay: 200 });

  return (
    <section id="faq" className="relative py-24 md:py-32">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-16 lg:grid-cols-5">
            {/* Left column — title */}
            <div ref={sectionRef} className="scroll-reveal lg:col-span-2">
              <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-[0.2em] text-primary">FAQ</span>
              <h2 className="mb-6 text-4xl font-bold md:text-5xl">{t.faq.sectionTitle}</h2>
              <p className="mb-8 text-muted-foreground">
                {t.faq.contactCta.replace("Contactez-nous", "").replace("تواصل معنا", "")}
              </p>

              {/* Contact CTA */}
              <div className="flex flex-col gap-3">
                <a
                  href={`mailto:${t.footer.contact.email}`}
                  className="inline-flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm font-medium transition-all hover:border-primary/20 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Email</p>
                    <p className="text-xs text-muted-foreground">{t.footer.contact.email}</p>
                  </div>
                </a>
                <a
                  href="https://wa.me/21600000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm font-medium transition-all hover:border-primary/20 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">WhatsApp</p>
                    <p className="text-xs text-muted-foreground">{t.faq.contactCta}</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Right column — accordion */}
            <div ref={accordionRef} className="scroll-reveal lg:col-span-3">
              <Accordion type="single" collapsible className="w-full space-y-3">
                {t.faq.items.map((item, i) => (
                  <AccordionItem
                    key={i}
                    value={`faq-${i}`}
                    className="rounded-xl border-2 border-border bg-card px-6 transition-all data-[state=open]:border-primary/20 data-[state=open]:shadow-md"
                  >
                    <AccordionTrigger className="text-start text-base font-semibold hover:no-underline py-5">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
