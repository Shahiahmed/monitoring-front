"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import ruTranslations from "../locales/ru.json";
import kzTranslations from "../locales/kz.json";

type Language = "ru" | "kz";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

interface TranslationTree {
  [key: string]: string | TranslationTree;
}

type TranslationNode = string | TranslationTree;

const translations: Record<Language, TranslationNode> = {
  ru: ruTranslations as TranslationNode,
  kz: kzTranslations as TranslationNode,
};

// Функция для получения перевода по ключу (например, "login.title")
const getTranslation = (lang: Language, key: string): string => {
  const keys = key.split(".");
  let value: TranslationNode = translations[lang];

  for (const k of keys) {
    if (typeof value === "object" && value !== null && k in value) {
      value = (value as TranslationTree)[k];
    } else {
      // Если перевод не найден, возвращаем русский вариант или сам ключ
      value = translations.ru;
      for (const k2 of keys) {
        if (typeof value === "object" && value !== null && k2 in value) {
          value = (value as TranslationTree)[k2];
        } else {
          return key;
        }
      }
      break;
    }
  }

  return typeof value === "string" ? value : key;
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ru");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language | null;
    if (savedLanguage === "ru" || savedLanguage === "kz") {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    return getTranslation(language, key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
