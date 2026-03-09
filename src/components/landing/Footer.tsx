import { Link } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { Stamp, Truck, Banknote, ShieldCheck, Heart } from "lucide-react";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="relative border-t bg-card">
      {/* Decorative gradient line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="mb-6 inline-flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20">
                <Stamp className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                Flink Atelier
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">{t.footer.tagline}</p>
            
            {/* Social icons */}
            <div className="mt-6 flex gap-3">
              <SocialLink href="#" label="Instagram">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </SocialLink>
              <SocialLink href="#" label="Facebook">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </SocialLink>
              <SocialLink href="#" label="TikTok">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
              </SocialLink>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-5 text-sm font-bold uppercase tracking-wider">{t.footer.links.title}</h4>
            <div className="flex flex-col gap-3">
              <Link to="/" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                {t.nav.home}
              </Link>
              <a href="#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                {t.nav.howItWorks}
              </a>
              <a href="#styles" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                {t.nav.styles}
              </a>
              <a href="#faq" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                {t.nav.faq}
              </a>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-5 text-sm font-bold uppercase tracking-wider">{t.footer.contact.title}</h4>
            <a href={`mailto:${t.footer.contact.email}`} className="text-sm text-muted-foreground transition-colors hover:text-primary">
              {t.footer.contact.email}
            </a>
          </div>

          {/* Trust badges */}
          <div>
            <h4 className="mb-5 text-sm font-bold uppercase tracking-wider">Garanties</h4>
            <div className="flex flex-col gap-4">
              {[
                { icon: Truck, label: t.footer.trustBadges.freeShipping },
                { icon: Banknote, label: t.footer.trustBadges.cod },
                { icon: ShieldCheck, label: "100% satisfaction" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {t.footer.copyright}
            <Heart className="h-3 w-3 fill-accent text-accent" />
          </p>
          <div className="flex gap-6">
            <button className="text-xs text-muted-foreground transition-colors hover:text-primary">
              {t.footer.legal.privacy}
            </button>
            <button className="text-xs text-muted-foreground transition-colors hover:text-primary">
              {t.footer.legal.terms}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary hover:scale-110"
      aria-label={label}
    >
      {children}
    </a>
  );
}
