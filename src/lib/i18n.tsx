"use client";
/**
 * Inline English / Telugu strings: t("Budget", "బడ్జెట్"). The language
 * switcher isn't built yet, so every page renders English; the Telugu text
 * sits next to it, ready for the toggle.
 */
export type Lang = "en" | "te";

export function useLang(): Lang {
  return "en";
}

export function useT() {
  const lang = useLang();
  return (en: string, te: string) => (lang === "te" ? te : en);
}
