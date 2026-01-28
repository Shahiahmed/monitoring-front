'use client';

import { useState, useEffect } from 'react';

type Language = 'ru' | 'kz';

export default function LanguageToggle() {
  const [language, setLanguage] = useState<Language>('ru');

  useEffect(() => {
    // Загружаем сохраненный язык из localStorage
    const savedLanguage = localStorage.getItem('language') as Language | null;
    if (savedLanguage && (savedLanguage === 'ru' || savedLanguage === 'kz')) {
      setLanguage(savedLanguage);
    }
  }, []);

  const toggleLanguage = () => {
    const newLanguage = language === 'ru' ? 'kz' : 'ru';
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
    // Здесь можно добавить логику для изменения языка в приложении
  };

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
      aria-label="Переключить язык"
      title={language === 'ru' ? 'Переключить на казахский' : 'Қазақ тіліне ауысу'}
    >
      {language === 'ru' ? 'RU' : 'KZ'}
    </button>
  );
}
