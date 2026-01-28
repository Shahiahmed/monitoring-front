'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

  return (
    <aside
      suppressHydrationWarning
      style={{ width: 'var(--sidebar-width, 16rem)' }}
      className="bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-[calc(100vh-4rem)] fixed left-0 top-16 overflow-y-auto overflow-x-hidden z-40 transition-all duration-500 ease-in-out"
    >
      <div className="p-4">
        {/* Кнопка сворачивания - Вариант 1: Кнопка "Меню" с разделителем (текущий) */}
        {!displayCollapsed && (
          <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={toggleSidebar}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 group"
              aria-label="Свернуть sidebar"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Меню
              </span>
              <svg
                className="w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-300 group-hover:scale-110"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>
          </div>
        )}
        
        {/* Кнопка для разворачивания когда свернуто */}
        {displayCollapsed && (
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 mb-4"
            aria-label="Развернуть sidebar"
            title="Развернуть меню"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}

        {/* 
          АЛЬТЕРНАТИВНЫЕ ВАРИАНТЫ КНОПКИ (закомментированы):
          
          ВАРИАНТ 2: Простая стрелка в правом верхнем углу
          {!displayCollapsed && (
            <button
              onClick={toggleSidebar}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 z-10"
              aria-label="Свернуть sidebar"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          ВАРИАНТ 3: Иконка гамбургер-меню
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 mb-4"
            aria-label={displayCollapsed ? 'Развернуть sidebar' : 'Свернуть sidebar'}
          >
            {displayCollapsed ? (
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
          
          ВАРИАНТ 4: Кнопка с текстом "Свернуть"/"Развернуть"
          <button
            onClick={toggleSidebar}
            className={`w-full flex items-center ${displayCollapsed ? 'justify-center' : 'justify-between'} p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 mb-4`}
            aria-label={displayCollapsed ? 'Развернуть sidebar' : 'Свернуть sidebar'}
          >
            {!displayCollapsed && <span className="text-sm text-gray-700 dark:text-gray-300">Свернуть</span>}
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={displayCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
            </svg>
          </button>
        */}

        {/* Навигация */}
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = isItemActive(item);
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedItems.has(item.name);
            const itemKey = item.href || item.name;

            return (
              <div key={itemKey} className="relative group">
                {hasChildren ? (
                  <>
                    <button
                      onClick={() => !displayCollapsed && toggleExpanded(item.name)}
                      className={`w-full flex items-center ${
                        displayCollapsed ? 'justify-center px-2' : 'space-x-3 px-4'
                      } py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className={isActive ? 'text-blue-600 dark:text-blue-400' : ''}>
                        {item.icon}
                      </span>
                      {!displayCollapsed && (
                        <>
                          <span className="flex-1 text-left whitespace-nowrap">{item.name}</span>
                          <svg
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </>
                      )}
                    </button>
                    {/* Tooltip при свернутом состоянии */}
                    {displayCollapsed && (
                      <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                        {item.name}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
                      </div>
                    )}
                    {/* Подменю */}
                    {!displayCollapsed && hasChildren && (
                      <div
                        className={`overflow-hidden transition-all duration-200 ${
                          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="pl-4 pt-1 space-y-1">
                          {item.children!.map((child) => {
                            const isChildActive = pathname === child.href;
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                                  isChildActive
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                              >
                                <span className="text-sm whitespace-nowrap">{child.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      href={item.href!}
                      className={`flex items-center ${
                        displayCollapsed ? 'justify-center px-2' : 'space-x-3 px-4'
                      } py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className={isActive ? 'text-blue-600 dark:text-blue-400' : ''}>
                        {item.icon}
                      </span>
                      {!displayCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                    </Link>
                    {/* Tooltip при свернутом состоянии */}
                    {displayCollapsed && (
                      <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                        {item.name}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
