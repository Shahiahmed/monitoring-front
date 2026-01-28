'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <div className="flex flex-1 pt-16">
        <Sidebar />
        <main
          className="flex-1 transition-all duration-500 ease-in-out p-6"
          style={{ marginLeft: 'var(--sidebar-width, 16rem)' }}
        >
          {children}
        </main>
      </div>
      <Footer />
    </>
  );
}
