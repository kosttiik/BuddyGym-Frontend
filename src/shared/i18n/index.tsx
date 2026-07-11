import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { getTelegramLanguage } from "@/shared/lib/telegram";
import { en } from "./en";
import { ru } from "./ru";

export type Locale = "ru" | "en";
export type Dictionary = typeof ru;

const LOCALE_KEY = "bg.locale";
const dictionaries: Record<Locale, Dictionary> = { ru, en };

export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved === "ru" || saved === "en") {
      return saved;
    }
  } catch {
    /* fall through to Telegram language */
  }
  return getTelegramLanguage()?.startsWith("ru") ? "ru" : "en";
}

type I18nContextValue = {
  locale: Locale;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_KEY, next);
    } catch {
      /* preference just won't persist */
    }
    document.documentElement.lang = next;
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, t: dictionaries[locale], setLocale }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

export function formatDay(date: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(new Date(date));
}

export function formatTime(date: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(
    new Date(date),
  );
}
