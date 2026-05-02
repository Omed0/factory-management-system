import LanguageDetector from "i18next-browser-languagedetector";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { initReactI18next } from "react-i18next";
import Translations from "./locales/index";
import i18n from "i18next";

export const resources = Translations;
export const defaultNS = "translation";
const i18nCookieName = "i18nextLng";
export const LANG_META = Object.keys(Translations).map(
  (key) => Translations[key as keyof typeof Translations].translation.setting,
);
const defaultLng = LANG_META[0].code;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: defaultLng,
    supportedLngs: Object.keys(Translations),
    detection: {
      order: ["cookie"],
      lookupCookie: i18nCookieName,
      caches: ["cookie"],
      cookieMinutes: 60 * 24 * 365,
    },
    interpolation: { escapeValue: false },
  });

export const setSSRLanguage = createIsomorphicFn().server(async () => {
  const language = getCookie(i18nCookieName);
  await i18n.changeLanguage(language || defaultLng);
});

export default i18n;
