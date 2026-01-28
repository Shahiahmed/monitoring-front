'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  useEffect(() => {
    // Проверяем, что уже установлено скриптом в head
    const root = document.documentElement;
    const hasDarkClass = root.classList.contains('dark');
    
    // Проверяем сохраненную тему или системные настройки
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Определяем начальную тему: сначала проверяем сохраненную, потом класс в DOM, потом системные настройки
    let initialTheme: Theme;
    if (savedTheme) {
      initialTheme = savedTheme;
    } else if (hasDarkClass) {
      initialTheme = 'dark';
    } else {
      initialTheme = prefersDark ? 'dark' : 'light';
    }
    
    setTheme(initialTheme);
    // Применяем тему, чтобы убедиться, что она синхронизирована
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  // Всегда предоставляем контекст, даже до монтирования
  // Это предотвращает ошибку "useTheme must be used within a ThemeProvider"
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
