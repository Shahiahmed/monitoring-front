'use client';

import { useLanguage } from './LanguageProvider';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const handleChange = (value: 'ru' | 'kz') => {
    if (language !== value) {
      setLanguage(value);
    }
  };

  return (
    <div
      className="inline-flex items-center rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-0.5 text-xs font-medium"
      aria-label="Выбор языка"
    >
      <button
        type="button"
        onClick={() => handleChange('ru')}
        className={`px-3 py-1.5 rounded-full transition-colors ${
          language === 'ru'
            ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        RU
      </button>
      <button
        type="button"
        onClick={() => handleChange('kz')}
        className={`px-3 py-1.5 rounded-full transition-colors ${
          language === 'kz'
            ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        KZ
      </button>
    </div>
  );
}
