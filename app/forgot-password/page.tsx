"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";
import { apiFetch } from "../lib/api";
import { useLanguage } from "../components/LanguageProvider";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail]   = useState("");
  const [hint, setHint]     = useState<string | null>(null);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setHint(null);
    setLoading(true);
    try {
      const res = await apiFetch("auth/hint", {
        method: "POST",
        skipAuth: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const msg = await res.text();
        setError(msg || t("forgotPassword.notFound"));
      } else {
        const data: { hint: string } = await res.json();
        setHint(data.hint);
      }
    } catch {
      setError(t("forgotPassword.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4 login-page-bg">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-[15%] top-[5%] h-[min(600px,90vw)] w-[min(600px,90vw)] rounded-full bg-blue-500/20 blur-3xl dark:bg-blue-600/15" />
        <div className="absolute -right-[10%] bottom-[8%] h-[min(560px,85vw)] w-[min(560px,85vw)] rounded-full bg-cyan-400/18 blur-3xl dark:bg-cyan-500/12" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_50%,transparent_0%,rgba(248,250,252,0.9)_100%)] dark:bg-[radial-gradient(ellipse_70%_55%_at_50%_50%,transparent_0%,rgba(10,15,30,0.80)_100%)]" />
      </div>

      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md login-enter">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 mb-5">
            <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t("forgotPassword.title")}</h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {t("forgotPassword.subtitle")}
          </p>
        </div>

        <div className="login-form-card rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                <svg className="shrink-0 mt-0.5 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Hint result */}
            {hint !== null && (
              <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-1.5">{t("forgotPassword.hintLabel")}</p>
                {hint ? (
                  <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{hint}</p>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t("forgotPassword.hintEmpty")}</p>
                )}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="h-4.5 w-4.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && !v.includes("@")) setEmail(v + "@enbek.kz");
                    else if (v && v.endsWith("@")) setEmail(v + "enbek.kz");
                  }}
                  className="login-input block w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="login@enbek.kz"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="login-btn w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white/80" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t("forgotPassword.searching")}
                  </>
                ) : (
                  <>
                    {t("forgotPassword.showHint")}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-5 text-center">
            <Link href="/login" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              {t("forgotPassword.backToLogin")}
            </Link>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .login-page-bg {
          background: linear-gradient(145deg, #f0f7ff 0%, #e8f2fc 40%, #eef4fb 70%, #e2ebf7 100%);
        }
        html.dark .login-page-bg {
          background: linear-gradient(145deg, #020617 0%, #0c1525 40%, #111d32 70%, #0f172a 100%);
        }
        .login-enter { animation: login-enter 0.55s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes login-enter {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .login-form-card {
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(148,163,184,0.28);
          box-shadow: 0 4px 6px -1px rgba(37,99,235,0.05), 0 20px 50px -10px rgba(37,99,235,0.12), inset 0 0 0 1px rgba(255,255,255,0.6);
        }
        html.dark .login-form-card {
          background: rgba(22,32,50,0.75);
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 20px 60px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.03);
        }
        .login-input {
          background: rgba(248,250,252,0.80);
          border: 1.5px solid rgba(203,213,225,0.70);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .login-input:focus {
          background: rgba(255,255,255,0.95);
          border-color: rgba(59,130,246,0.65);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
        }
        html.dark .login-input { background: rgba(15,23,42,0.50); border-color: rgba(255,255,255,0.09); color: #f1f5f9; }
        html.dark .login-input:focus { background: rgba(15,23,42,0.70); border-color: rgba(59,130,246,0.55); box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
        .login-btn {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%);
          box-shadow: 0 4px 14px rgba(37,99,235,0.40);
          transition: box-shadow 0.2s, transform 0.15s;
        }
        .login-btn:hover:not(:disabled) { box-shadow: 0 6px 20px rgba(37,99,235,0.50); transform: translateY(-1px); }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
      `}</style>
    </div>
  );
}
