import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import ConditionalLayout from "./components/ConditionalLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monitoring",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
                const sidebarCollapsed = localStorage.getItem('sidebarCollapsed');
                const sidebarWidth = sidebarCollapsed === 'true' ? '4rem' : '16rem';
                document.documentElement.style.setProperty('--sidebar-width', sidebarWidth);
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen overflow-x-hidden`}
      >
        <ThemeProvider>
          <div className="flex flex-col min-h-screen">
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
