'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'ru' | 'kz';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Переводы
const translations: Record<Language, any> = {
  ru: {
    login: {
      title: "Войдите в систему мониторинга",
      email: "Email",
      password: "Пароль",
      rememberMe: "Запомнить меня",
      enter: "Войти",
      entering: "Вход...",
      emailPlaceholder: "example@enbek.kz",
      passwordPlaceholder: "Введите пароль",
      emailHint: "Используйте корпоративный email: example@enbek.kz",
      emailTitle: "Введите email в формате example@enbek.kz",
      errorFillFields: "Пожалуйста, заполните все поля"
    }
  },
  kz: {
    login: {
      title: "Мониторинг жүйесіне кіріңіз",
      email: "Email",
      password: "Құпия сөз",
      rememberMe: "Мені есте сақтау",
      enter: "Кіру",
      entering: "Кіру...",
      emailPlaceholder: "example@enbek.kz",
      passwordPlaceholder: "Құпия сөзді енгізіңіз",
      emailHint: "Корпоративті email пайдаланыңыз: example@enbek.kz",
      emailTitle: "Email-ді example@enbek.kz форматында енгізіңіз",
      errorFillFields: "Барлық өрістерді толтырыңыз"
    }
  }
};

// Функция для получения перевода по ключу (например, "login.title")
const getTranslation = (lang: Language, key: string): string => {
  const keys = key.split('.');
  let value: any = translations[lang];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Если перевод не найден, возвращаем русский вариант или сам ключ
      value = translations.ru;
      for (const k2 of keys) {
        if (value && typeof value === 'object' && k2 in value) {
          value = value[k2];
        } else {
          return key;
        }
      }
      break;
    }
  }
  
  return typeof value === 'string' ? value : key;
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ru');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Загружаем сохраненный язык из localStorage
    const savedLanguage = localStorage.getItem('language') as Language | null;
    if (savedLanguage && (savedLanguage === 'ru' || savedLanguage === 'kz')) {
      setLanguageState(savedLanguage);
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
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
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
