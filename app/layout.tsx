import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { LanguageProvider } from "./components/LanguageProvider";
import ConditionalLayout from "./components/ConditionalLayout";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "SARAP — система мониторинга и аналитики",
  description: "",
  icons: {
    icon: "/favicon.ico",
    // если добавишь png/Apple icon:
    // shortcut: "/favicon.ico",
    // apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 'light';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
                const sidebarCollapsed = localStorage.getItem('sidebarCollapsed');
                const sidebarWidth = sidebarCollapsed === 'true' ? '4rem' : '16rem';
                document.documentElement.style.setProperty('--sidebar-width', sidebarWidth);
                function setSidebarHeight() {
                  var h = Math.max(0, (window.innerHeight || document.documentElement.clientHeight) - 64);
                  document.documentElement.style.setProperty('--sidebar-height', h + 'px');
                }
                setSidebarHeight();
                window.addEventListener('resize', setSidebarHeight);
                window.addEventListener('load', setSidebarHeight);
              })();
            `,
          }}
        />
      </head>
      <body
        className="antialiased flex flex-col min-h-screen overflow-x-hidden"
      >
        <ThemeProvider>
          <LanguageProvider>
            <div className="flex flex-col min-h-screen">
              <ConditionalLayout>
                {children}
              </ConditionalLayout>
            </div>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
