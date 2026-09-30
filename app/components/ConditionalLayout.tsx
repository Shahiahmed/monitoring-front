'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import AiChatWidget from './AiChatWidget';
import { TourProvider } from './TourProvider';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/login' || pathname === '/login/'
    || pathname === '/forgot-password' || pathname === '/forgot-password/';
  const isPublicPage = pathname?.startsWith('/wall');
  const [authChecked,  setAuthChecked]  = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  useEffect(() => {
    if (isLoginPage || isPublicPage) {
      setAuthChecked(true);
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      router.replace('/login');
    } else {
      setIsAuthorized(true);
    }
    setAuthChecked(true);

    if (sessionStorage.getItem('justLoggedIn') === '1') {
      setJustLoggedIn(true);
      sessionStorage.removeItem('justLoggedIn');
    }
  }, [isLoginPage, router]);

  if (isLoginPage || isPublicPage) return <>{children}</>;

  if (!authChecked || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm text-gray-500 dark:text-gray-400">Загрузка...</div>
      </div>
    );
  }

  return (
    <TourProvider>
    <div className="flex flex-col flex-1 min-h-screen">
      <Header className={justLoggedIn ? "stagger-header" : ""} />
      <div className="flex flex-1 pt-16">
        <Sidebar className={justLoggedIn ? "stagger-sidebar" : ""} />
        <main
          className={`flex-1 min-w-0 transition-all duration-500 ease-in-out min-h-[calc(100vh-4rem)] ${justLoggedIn ? "stagger-main" : ""}`}
          style={{
            marginLeft: "var(--sidebar-width, 16rem)",
            width: "calc(100% - var(--sidebar-width, 16rem))",
          }}
        >
          {children}
        </main>
      </div>
      <Footer />
      <AiChatWidget />
    </div>
    </TourProvider>
  );
}
