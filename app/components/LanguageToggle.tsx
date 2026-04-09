'use client';

import { useLanguage } from './LanguageProvider';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const handleChange = (value: 'ru' | 'kz') => {
    if (language !== value) setLanguage(value);
  };

  return (
    <div
      className="relative inline-flex items-center rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/80 p-0.5"
      aria-label="Выбор языка"
    >
      {/* Подложка, которая плавно едет к активной кнопке */}
      <div
        className="absolute top-0.5 bottom-0.5 rounded-full bg-gray-900 dark:bg-white shadow-md transition-all duration-300 ease-out"
        style={{
          left: language === 'ru' ? '2px' : '50%',
          width: 'calc(50% - 2px)',
        }}
      />
      <button
        type="button"
        onClick={() => handleChange('ru')}
        className={`relative z-10 w-[2.75rem] py-1.5 text-xs font-semibold rounded-full transition-colors duration-200 ${
          language === 'ru' ? 'text-white dark:text-gray-900' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
        }`}
      >
        RU
      </button>
      <button
        type="button"
        onClick={() => handleChange('kz')}
        className={`relative z-10 w-[2.75rem] py-1.5 text-xs font-semibold rounded-full transition-colors duration-200 ${
          language === 'kz' ? 'text-white dark:text-gray-900' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
        }`}
      >
        KZ
      </button>
    </div>
  );
}
