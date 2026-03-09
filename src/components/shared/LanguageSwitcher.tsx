import { useTranslation } from "@/i18n";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <button
      onClick={() => setLocale(locale === "fr" ? "ar" : "fr")}
      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
      aria-label="Switch language"
    >
      <Globe className="h-3.5 w-3.5" />
      {locale === "fr" ? "عربي" : "FR"}
    </button>
  );
}
