'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';

function JustLoggedInCleanup() {
  useEffect(() => {
    const t = setTimeout(() => {
      sessionStorage.removeItem("justLoggedIn");
    }, 600);
    return () => clearTimeout(t);
  }, []);
  return null;
}

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/login' || pathname === '/login/';
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isLoginPage) {
      setAuthChecked(true);
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) {
      router.replace('/login');
    } else {
      setIsAuthorized(true);
    }
    setAuthChecked(true);
  }, [isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!authChecked || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm text-gray-500 dark:text-gray-400">Загрузка...</div>
      </div>
    );
  }

  const justLoggedIn = typeof window !== "undefined" && sessionStorage.getItem("justLoggedIn") === "1";

  return (
    <div className={`flex flex-col flex-1 min-h-screen ${justLoggedIn ? "animate-app-reveal" : ""}`}>
      <Header />
      <div className="flex flex-1 pt-16">
        <Sidebar />
        <main
          className="flex-1 min-w-0 transition-all duration-500 ease-in-out p-6 min-h-[calc(100vh-4rem)]"
          style={{
            marginLeft: "var(--sidebar-width, 16rem)",
            width: "calc(100% - var(--sidebar-width, 16rem))",
          }}
        >
          {children}
        </main>
      </div>
      <Footer />
      {justLoggedIn && (
        <JustLoggedInCleanup />
      )}
    </div>
  );
}
