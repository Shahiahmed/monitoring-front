"use client";

import { useState, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import Link from "next/link";
import { apiFetch } from "@/app/lib/api";

interface CertSummary {
  type: string;
  validTo: string | null;
  daysLeft: number | null;
}

function daysLeft(validTo: string | null): number | null {
  if (!validTo) return null;
  const to = new Date(validTo).getTime();
  const now = Date.now();
  return Math.ceil((to - now) / (24 * 60 * 60 * 1000));
}

export default function Header({ className = "" }: { className?: string }) {
  const [sslSummary, setSslSummary] = useState<CertSummary | null>(null);
  const [ecpSummary, setEcpSummary] = useState<CertSummary | null>(null);

  function loadCertificates() {
    apiFetch("settings/certificates")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: { type: string; validTo: string | null }[]) => {
        if (!Array.isArray(list)) return;
        const ssl = list.filter((c) => c.type === "SSL").sort((a, b) => (b.validTo || "").localeCompare(a.validTo || ""))[0];
        const ecp = list.filter((c) => c.type === "ECP").sort((a, b) => (b.validTo || "").localeCompare(a.validTo || ""))[0];
        if (ssl) setSslSummary({ type: "SSL", validTo: ssl.validTo, daysLeft: daysLeft(ssl.validTo) });
        else setSslSummary(null);
        if (ecp) setEcpSummary({ type: "ECP", validTo: ecp.validTo, daysLeft: daysLeft(ecp.validTo) });
        else setEcpSummary(null);
      })
      .catch(() => {});
  }

  useEffect(() => {
    loadCertificates();
    const onUpdate = () => loadCertificates();
    window.addEventListener("certificates-updated", onUpdate);
    return () => window.removeEventListener("certificates-updated", onUpdate);
  }, []);

  return (
    <header className={`glass fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/40 dark:border-white/10 ${className}`}>
      <div className="w-full px-4 h-full flex items-center">
        <div className="flex items-center justify-between w-full">
          <Link href="/" data-tour="header-brand" className="flex items-center space-x-2 hover:opacity-90 transition-opacity">
            <svg
              width={43}
              height={43}
              viewBox="0 0 42.1582 43"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              shapeRendering="geometricPrecision"
              className="text-white"
              style={
                {
                  "--accent": "#2563EB",
                  "--ink": "#0F172A",
                  "--paper": "#FFFFFF",
                  "--outline": "#0F172A",
                } as React.CSSProperties
              }
            >
              <path
                d="M42.1572 0.499832H11.6345C5.21926 0.499832 0 5.69961 0 12.0914V36.2158L8.92022 27.3289V12.0914C8.92022 10.6002 10.1379 9.38677 11.6345 9.38677H33.237L42.1572 0.499832Z"
                fill="var(--accent)"
                stroke="var(--outline)"
                strokeWidth={0.9}
                strokeLinejoin="round"
              />
              <path
                d="M33.238 9.387V30.9087C33.238 32.3997 32.0201 33.6131 30.5232 33.6131H15.2285L6.30859 42.5H30.5232C36.939 42.5 42.1582 37.3002 42.1582 30.9087V0.500061L33.238 9.387Z"
                fill="var(--accent)"
                stroke="var(--outline)"
                strokeWidth={0.9}
                strokeLinejoin="round"
              />
              <path
                d="M12 25 H16 L18 21 L21 29 L24 18 L26 25 H30"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx={31}
                cy={12}
                r={6}
                fill="var(--paper)"
                stroke="var(--ink)"
                strokeWidth={2}
              />
              <path
                d="M28.5 12.0 L30.4 14.0 L34.0 10.2"
                stroke="var(--ink)"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="leading-tight">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white font-[family-name:var(--font-geist-sans)]">
                SARAP
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                система мониторинга и аналитики
              </p>
            </div>
          </Link>

          <div className="flex items-center space-x-6">
            {(sslSummary !== null || ecpSummary !== null) && (
              <div data-tour="cert-badges" className="flex items-center space-x-4">
                {ecpSummary !== null && (
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <svg
                      className="w-4 h-4 text-blue-600 dark:text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      ЭЦП: {ecpSummary.daysLeft == null ? "—" : ecpSummary.daysLeft < 0 ? "истёк" : `осталось ${ecpSummary.daysLeft} дн`}
                    </span>
                  </div>
                )}
                {sslSummary !== null && (
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <svg
                      className="w-4 h-4 text-green-600 dark:text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      SSL: {sslSummary.daysLeft == null ? "—" : sslSummary.daysLeft < 0 ? "истёк" : `осталось ${sslSummary.daysLeft} дн`}
                    </span>
                  </div>
                )}
              </div>
            )}

            <nav data-tour="header-tools" className="flex items-center space-x-4">
              <LanguageToggle />
              <ThemeToggle />
              <Link
                href="/profile"
                className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-slate-300 dark:border-gray-600 bg-slate-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Профиль"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
