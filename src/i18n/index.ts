import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { fr, type Translations } from "./fr";
import { ar } from "./ar";
import React from "react";

type Locale = "fr" | "ar";

interface I18nContextType {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
  dir: "ltr" | "rtl";
}

const translations: Record<Locale, Translations> = { fr, ar };

const I18nContext = createContext<I18nContextType>({
  locale: "fr",
  t: fr,
  setLocale: () => {},
  dir: "ltr",
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem("flink-locale") as Locale;
    return saved === "ar" ? "ar" : "fr";
  });

  const t = translations[locale];
  const dir = t.dir;

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("flink-locale", newLocale);
  }, []);

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = t.lang;
  }, [dir, t.lang]);

  return React.createElement(
    I18nContext.Provider,
    { value: { locale, t, setLocale, dir } },
    children
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}

export type { Locale, Translations };
