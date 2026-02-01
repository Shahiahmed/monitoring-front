'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface NavSubItem {
  name: string;
  href: string;
}

interface NavItem {
  name: string;
  href?: string;
  icon: React.ReactNode;
  children?: NavSubItem[];
}

const navigation: NavItem[] = [
  {
    name: 'Главная',
    href: '/',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: 'Инциденты',
    href: '/incidents',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    name: 'Пользователи',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    children: [
      {
        name: 'Список пользователей',
        href: '/users',
      },
      {
        name: 'Регистрация',
        href: '/users/register',
      },
      {
        name: 'Роли',
        href: '/users/roles',
      },
    ],
  },
  {
    name: 'Справочники',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    children: [
      { name: 'Местоположения', href: '/references/locations' },
      { name: 'Гос органы', href: '/references/government-bodies' },
      { name: 'ИС', href: '/references/information-systems' },
      { name: 'Типы взаимодействия', href: '/references/interaction-types' },
      { name: 'Типы приложения', href: '/references/application-types' },
    ],
  },
  {
    name: 'Настройки',
    href: '/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  // Всегда начинаем с false для совместимости SSR
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Загружаем состояние из localStorage после монтирования
    const savedState = localStorage.getItem('sidebarCollapsed');
    const isCollapsed = savedState === 'true';
    setCollapsed(isCollapsed);
    // Убеждаемся, что CSS переменная установлена правильно
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '4rem' : '16rem');
    
    // Автоматически раскрываем пункты меню, если текущий путь находится в их подменю
    const expanded = new Set<string>();
    navigation.forEach((item) => {
      if (item.children) {
        const isActive = item.children.some((child) => pathname === child.href);
        if (isActive) {
          expanded.add(item.name);
        }
      }
    });
    setExpandedItems(expanded);
    
    setMounted(true);
  }, [pathname]);

  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
    // Плавное изменение ширины через CSS переменную
    document.documentElement.style.setProperty('--sidebar-width', newState ? '4rem' : '16rem');
  };

  const toggleExpanded = (itemName: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  // Используем CSS переменную для размера, чтобы избежать мигания
  // Размер устанавливается скриптом в head до первого рендера
  const displayCollapsed = mounted ? collapsed : false;
  
  // Проверяем, активен ли пункт меню или его подпункты
  const isItemActive = (item: NavItem) => {
    if (item.href && pathname === item.href) return true;
    if (item.children) {
      return item.children.some((child) => pathname === child.href);
    }
    return false;
  };

  const handleLogout = () => {
    try {
      // Здесь можно очистить токены/сессию, если они будут добавлены
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    } catch (e) {
      // игнорируем ошибки localStorage
    }
    router.push('/login');
  };

  const textColumnStyle = {
    width: displayCollapsed ? 0 : '12rem',
    minWidth: displayCollapsed ? 0 : '12rem',
  };

  return (
    <aside
      suppressHydrationWarning
      style={{ width: 'var(--sidebar-width, 16rem)' }}
      className="sidebar-scroll bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-[calc(100vh-4rem)] fixed left-0 top-16 overflow-y-auto overflow-x-hidden z-40 transition-[width] duration-300 ease-in-out flex flex-col"
    >
      <div className="flex flex-col flex-1 min-w-0 py-4">
        {/* Строка: кнопка сворачивания — иконка и текст в одном ряду */}
        <div className="flex items-center min-h-12 px-1">
          <div className="w-16 flex-shrink-0 flex justify-center">
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={displayCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
              title={displayCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
            >
              <svg
                className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${displayCollapsed ? '' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
          <div className="overflow-hidden transition-[width] duration-300 ease-in-out flex items-center" style={textColumnStyle}>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap py-2">
              Меню
            </span>
          </div>
        </div>

        <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-800" />

        {/* Пункты меню — каждая строка: иконка и текст в одном ряду */}
        <nav className="flex-1 space-y-1">
          {navigation.map((item) => {
            const isActive = isItemActive(item);
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedItems.has(item.name);
            const itemKey = item.href || item.name;

            return (
              <div key={itemKey} className="relative group">
                <div className="flex items-center min-h-12 px-1">
                  {/* Ячейка иконки — фиксированная ширина, всегда на месте */}
                  <div className="w-16 flex-shrink-0 flex justify-center">
                    {hasChildren ? (
                      <button
                        onClick={() => {
                          if (displayCollapsed) {
                            setCollapsed(false);
                            document.documentElement.style.setProperty('--sidebar-width', '16rem');
                            localStorage.setItem('sidebarCollapsed', 'false');
                            setExpandedItems((prev) => new Set(prev).add(item.name));
                          } else {
                            toggleExpanded(item.name);
                          }
                        }}
                        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                          isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        {item.icon}
                      </button>
                    ) : (
                      <Link
                        href={item.href!}
                        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                          isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        {item.icon}
                      </Link>
                    )}
                  </div>
                  {/* Ячейка текста — скрывается при сворачивании */}
                  <div className="overflow-hidden transition-[width] duration-300 ease-in-out flex items-center min-w-0" style={textColumnStyle}>
                    {hasChildren ? (
                      <button
                        onClick={() => toggleExpanded(item.name)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span className="text-sm whitespace-nowrap truncate">{item.name}</span>
                        <svg className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ) : (
                      <Link
                        href={item.href!}
                        className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                          isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span className="text-sm whitespace-nowrap truncate">{item.name}</span>
                      </Link>
                    )}
                  </div>
                </div>
                {/* Подменю — отступ только в колонке текста */}
                {hasChildren && (
                  <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="flex">
                      <div className="w-16 flex-shrink-0" />
                      <div className="overflow-hidden flex-1 min-w-0 pl-0" style={textColumnStyle}>
                        <div className="pt-1 space-y-1">
                          {item.children!.map((child) => {
                            const isChildActive = pathname === child.href;
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                                  isChildActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                              >
                                <span className="whitespace-nowrap truncate block">{child.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {displayCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none top-1/2 -translate-y-1/2">
                    {item.name}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800" />

        {/* Строка Выйти — иконка и текст в одном ряду */}
        <div className="flex items-center min-h-12 px-1">
          <div className="w-16 flex-shrink-0 flex justify-center">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              aria-label="Выйти"
              title="Выйти"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H9m4 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
              </svg>
            </button>
          </div>
          <div className="overflow-hidden transition-[width] duration-300 ease-in-out flex items-center" style={textColumnStyle}>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg px-3 py-2 text-left w-full whitespace-nowrap"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
