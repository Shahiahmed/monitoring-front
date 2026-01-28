'use client';

import { useLanguage } from './LanguageProvider';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    const newLanguage = language === 'ru' ? 'kz' : 'ru';
    setLanguage(newLanguage);
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
