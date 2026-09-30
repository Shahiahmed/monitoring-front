'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useLanguage } from './LanguageProvider';
import { EXPAND_SIDEBAR_EVENT } from './tour/tourSteps';

interface NavSubItem {
  name: string;
  href: string;
  /** Только ADMIN / SUPER_ADMIN (например регистрация пользователей) */
  adminOnly?: boolean;
}

interface NavItem {
  name: string;
  href?: string;
  icon: React.ReactNode;
  children?: NavSubItem[];
  adminOnly?: boolean;
}

function buildNavigation(t: (key: string) => string): NavItem[] {
  return [
    {
      name: t('nav.dashboard'),
      href: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: t('nav.servers'),
      href: '/servers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
      ),
    },
    {
      name: t('nav.incidents'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      children: [
        { name: t('nav.events'),      href: '/incidents/events' },
        { name: t('nav.statistics'),  href: '/incidents/statistics' },
        { name: t('nav.availability'),href: '/incidents/availability' },
      ],
    },
    {
      name: t('nav.services'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      children: [
        { name: t('nav.servicesList'),    href: '/services',          adminOnly: true },
        { name: t('nav.servicesRegistry'),href: '/services/registry', adminOnly: true },
        { name: t('nav.servicesAdd'),     href: '/services/add',      adminOnly: true },
        { name: 'Запросы сервисов',       href: '/statistics/integrations' },
        { name: 'Мои сервисы',            href: '/services/my-services' },
        { name: 'Мои подключения',        href: '/services/my-connections' },
      ],
    },
    {
      name: t('nav.references'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      children: [
        { name: t('nav.locations'),        href: '/references/locations' },
        { name: t('nav.environments'),     href: '/references/environments' },
        { name: t('nav.govBodies'),        href: '/references/government-bodies' },
        { name: t('nav.infoSystems'),      href: '/references/information-systems' },
        { name: t('nav.interactionTypes'), href: '/references/interaction-types' },
        { name: t('nav.appTypes'),         href: '/references/application-types' },
        { name: t('nav.failureTypes'),     href: '/references/failure-types' },
        { name: t('nav.serversRef'),       href: '/references/servers' },
      ],
    },
    {
      name: t('nav.users'),
      adminOnly: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      children: [
        { name: t('nav.usersList'), href: '/users' },
        { name: t('nav.register'),  href: '/users/register', adminOnly: true },
        { name: t('nav.roles'),     href: '/users/roles' },
      ],
    },
    {
      name: t('nav.settings'),
      adminOnly: true,
      href: '/settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      children: [
        { name: t('nav.ssl'),      href: '/settings/ssl' },
        { name: t('nav.activity'), href: '/settings/activity' },
      ],
    },
  ];
}

export default function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const navigation = buildNavigation(t);
  // Всегда начинаем с false для совместимости SSR
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [userIsAdminOrSuper, setUserIsAdminOrSuper] = useState(false);


  useEffect(() => {
    try {
      const raw = localStorage.getItem("authUser");
      if (!raw) {
        setUserIsAdminOrSuper(false);
        return;
      }
      const u = JSON.parse(raw) as { roles?: string[] };
      const r = u.roles ?? [];
      setUserIsAdminOrSuper(
        r.includes("ADMIN") || r.includes("SUPER_ADMIN"),
      );
    } catch {
      setUserIsAdminOrSuper(false);
    }
  }, [pathname]);

  useEffect(() => {
  }, [pathname, collapsed, mounted]);

  useEffect(() => {
    // Тур просит развернуть меню, чтобы подписи пунктов были видны
    const onTourExpand = () => {
      setCollapsed(false);
      localStorage.setItem('sidebarCollapsed', 'false');
      document.documentElement.style.setProperty('--sidebar-width', '16rem');
    };
    window.addEventListener(EXPAND_SIDEBAR_EVENT, onTourExpand);
    return () => window.removeEventListener(EXPAND_SIDEBAR_EVENT, onTourExpand);
  }, []);

  useEffect(() => {
    // Фиксируем высоту сайдбара по viewport (решает баг при первом входе после логина)
    const setHeight = () => {
      const h = Math.max(0, (typeof window !== 'undefined' ? window.innerHeight : 0) - 64);
      document.documentElement.style.setProperty('--sidebar-height', h + 'px');
    };
    setHeight();
    // Повторно после первого кадра — viewport может быть не готов при редиректе
    const raf = requestAnimationFrame(() => {
      setHeight();
    });
    window.addEventListener('resize', setHeight);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', setHeight);
    };
  }, []);

  useEffect(() => {
    // Загружаем состояние из localStorage после монтирования
    const savedState = localStorage.getItem('sidebarCollapsed');
    const isCollapsed = savedState === 'true';
    setCollapsed(isCollapsed);
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '4rem' : '16rem');

    // При свёрнутом меню — все вкладки скрыты; при развёрнутом — раскрываем только родителя текущей страницы
    if (isCollapsed) {
      setExpandedItems(new Set());
    } else {
      const path = (pathname || '').replace(/\/+$/, '') || '/';
      let expandedParent: string | null = null;
      for (const item of navigation) {
        if (item.children?.some((child) => path === ((child.href || '').replace(/\/+$/, '') || '/'))) {
          expandedParent = item.name;
          break;
        }
      }
      setExpandedItems(expandedParent ? new Set([expandedParent]) : new Set());
    }

    setMounted(true);
  }, [pathname]);

  // Возвращает только один раскрытый пункт — родитель текущей страницы
  const getExpandedItemsForPath = (): Set<string> => {
    const path = (pathname || '').replace(/\/+$/, '') || '/';
    for (const item of navigation) {
      if (item.children?.some((child) => path === ((child.href || '').replace(/\/+$/, '') || '/'))) {
        return new Set([item.name]);
      }
    }
    return new Set();
  };

  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
    document.documentElement.style.setProperty('--sidebar-width', newState ? '4rem' : '16rem');
    if (newState) {
      setExpandedItems(new Set());
    } else {
      setExpandedItems(getExpandedItemsForPath());
    }
  };

  /** Аккордеон: открыта не больше одной группы; повторный клик по открытой — закрывает. */
  const toggleExpanded = (itemName: string) => {
    setExpandedItems((prev) => {
      if (prev.has(itemName)) {
        return new Set();
      }
      return new Set([itemName]);
    });
  };

  // Используем CSS переменную для размера, чтобы избежать мигания
  // Размер устанавливается скриптом в head до первого рендера
  const displayCollapsed = mounted ? collapsed : false;
  
  // Нормализуем путь для сравнения (trailingSlash: true даёт /users/, href — /users)
  const normalizePath = (p: string) => (p || '').replace(/\/+$/, '') || '/';

  // Проверяем, активен ли пункт меню или его подпункты
  const isItemActive = (item: NavItem) => {
    const path = normalizePath(pathname);
    if (item.href && path === normalizePath(item.href)) return true;
    if (item.children) {
      return item.children.some((child) => path === normalizePath(child.href));
    }
    return false;
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
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
    <>
      <aside
        data-tour="sidebar"
        suppressHydrationWarning
        style={{
          width: 'var(--sidebar-width, 16rem)',
          height: 'var(--sidebar-height, calc(100vh - 4rem))',
          top: '4rem',
        }}
        className={`glass fixed left-0 overflow-hidden z-40 transition-[width] duration-300 ease-in-out flex flex-col group/sidebar border-r border-white/40 dark:border-white/10 ${className}`}
      >
        {/* Прокручиваемая область меню */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-4 sidebar-scroll">
        <nav className="space-y-1">
          {navigation.filter(item => !item.adminOnly || userIsAdminOrSuper).map((item) => {
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
                            setExpandedItems(new Set([item.name]));
                          } else {
                            toggleExpanded(item.name);
                          }
                        }}
                        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                          isActive ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-800'
                        }`}
                      >
                        {item.icon}
                      </button>
                    ) : (
                      <Link
                        href={item.href!}
                        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                          isActive ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-800'
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
                          isActive ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' : 'text-slate-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-800'
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
                          isActive ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' : 'text-slate-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-800'
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
                          {item.children!.filter(
                            (child) =>
                              !child.adminOnly || userIsAdminOrSuper,
                          ).map((child) => {
                            const isChildActive = normalizePath(pathname) === normalizePath(child.href);

                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                                  isChildActive ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-gray-400 hover:bg-slate-300 dark:hover:bg-gray-800'
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
        </div>

        {/* Выйти — всегда внизу сайдбара (не прокручивается) */}
        <div data-tour="sidebar-logout" className="flex-shrink-0 py-4 border-t border-slate-300 dark:border-gray-800">
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

      {/* Плавающая таблетка на границе сайдбар / контент */}
      <button
        onClick={toggleSidebar}
        data-tour="sidebar-toggle"
        style={{ left: 'calc(var(--sidebar-width) - 14px)', top: 'calc(2rem + 50vh)' }}
        className="fixed -translate-y-1/2 w-7 h-14 rounded-full flex items-center justify-center glass border border-white/50 dark:border-white/20 hover:scale-105 z-[60] transition-all duration-300"
        aria-label={displayCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
        title={displayCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
      >
        <svg
          className={`w-4 h-4 text-gray-600 dark:text-gray-300 transition-transform duration-200 ${displayCollapsed ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </>
  );
}
