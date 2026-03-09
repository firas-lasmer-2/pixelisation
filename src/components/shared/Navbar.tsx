import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Menu, X, Stamp, Sparkles, Sun, Moon, ImageIcon } from "lucide-react";

export function Navbar() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("flink-theme") === "dark" || document.documentElement.classList.contains("dark");
  });
  const location = useLocation();
  const isStudio = location.pathname.startsWith("/studio");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("flink-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("flink-theme", "light");
    }
  }, [dark]);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    if (location.pathname !== "/") {
      window.location.href = `/#${id}`;
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'border-b bg-background/95 backdrop-blur-xl shadow-sm' : 'bg-transparent'}`}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20">
            <Stamp className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Flink Atelier
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {!isStudio && (
            <>
              <NavButton onClick={() => scrollTo("how-it-works")}>{t.nav.howItWorks}</NavButton>
              <NavButton onClick={() => scrollTo("styles")}>{t.nav.styles}</NavButton>
              <NavButton onClick={() => scrollTo("faq")}>{t.nav.faq}</NavButton>
              <Link to="/gallery" className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                {t.nav.gallery}
              </Link>
            </>
          )}
          <div className="mx-3 h-5 w-px bg-border" />
          {/* Dark mode toggle */}
          <button
            onClick={() => setDark(!dark)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={dark ? t.darkMode.light : t.darkMode.dark}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <LanguageSwitcher />
          <Button asChild size="sm" className="ms-2 rounded-full px-6 shadow-md shadow-primary/20">
            <Link to="/studio">
              <Sparkles className="me-1.5 h-3.5 w-3.5" />
              {t.nav.cta}
            </Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setDark(!dark)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <LanguageSwitcher />
          <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg p-2 transition-colors hover:bg-muted">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t bg-background px-4 pb-6 md:hidden animate-fade-in">
          <div className="flex flex-col gap-1 pt-4">
            {!isStudio && (
              <>
                <MobileNavButton onClick={() => scrollTo("how-it-works")}>{t.nav.howItWorks}</MobileNavButton>
                <MobileNavButton onClick={() => scrollTo("styles")}>{t.nav.styles}</MobileNavButton>
                <MobileNavButton onClick={() => scrollTo("faq")}>{t.nav.faq}</MobileNavButton>
                <Link
                  to="/gallery"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-3 text-start text-sm font-medium transition-colors hover:bg-muted flex items-center gap-2"
                >
                  <ImageIcon className="h-4 w-4" />
                  {t.nav.gallery}
                </Link>
              </>
            )}
            <Button asChild size="sm" className="mt-3 rounded-full">
              <Link to="/studio" onClick={() => setMobileOpen(false)}>
                <Sparkles className="me-1.5 h-3.5 w-3.5" />
                {t.nav.cta}
              </Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}

function NavButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function MobileNavButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg px-3 py-3 text-start text-sm font-medium transition-colors hover:bg-muted"
    >
      {children}
    </button>
  );
}
