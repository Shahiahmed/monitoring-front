"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "../components/ThemeToggle";
import LanguageToggle from "../components/LanguageToggle";
import { useLanguage } from "../components/LanguageProvider";
import { apiFetch } from "../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await apiFetch("auth/login", {
        method: "POST",
        skipAuth: true,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const msg = await response.text();
        setError(msg || t("login.errorFillFields"));
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      // Сохраняем "сессию" на клиенте
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("authUser", JSON.stringify(data.user));
      sessionStorage.setItem("justLoggedIn", "1");

      setIsLoading(false);
      router.push("/");
    } catch (err) {
      setError("Ошибка при входе. Попробуйте ещё раз.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 -z-10 login-bg-motion" aria-hidden>
        <div className="absolute inset-0 login-bg-base" />
        <div className="absolute -left-[10%] top-[8%] h-[min(520px,85vw)] w-[min(520px,85vw)] rounded-full bg-blue-500/25 blur-3xl dark:bg-blue-500/20 login-orb login-orb-a" />
        <div className="absolute -right-[8%] bottom-[12%] h-[min(480px,80vw)] w-[min(480px,80vw)] rounded-full bg-cyan-400/22 blur-3xl dark:bg-cyan-400/16 login-orb login-orb-b" />
        <div className="absolute left-1/2 top-1/2 h-[min(400px,70vw)] w-[min(400px,70vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/18 blur-3xl dark:bg-indigo-400/14 login-orb login-orb-c" />
        <div className="absolute left-1/2 top-1/2 h-[min(640px,95vw)] w-[min(640px,95vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-conic-180 from-blue-500/20 via-cyan-400/15 to-indigo-500/20 blur-3xl dark:from-blue-500/14 dark:via-cyan-500/12 dark:to-violet-500/14 animate-[login-conic_22s_linear_infinite]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(100,116,139,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(100,116,139,0.14)_1px,transparent_1px)] bg-size-[48px_48px] animate-[login-grid-drift_48s_linear_infinite] dark:bg-[linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,transparent_0%,rgba(248,250,252,0.85)_100%)] dark:bg-[radial-gradient(ellipse_75%_55%_at_50%_45%,transparent_0%,rgba(15,23,42,0.72)_100%)]" />
        <div className="absolute -inset-y-32 -left-[20%] w-[55%] rotate-15 bg-linear-to-r from-transparent via-white/55 to-transparent opacity-45 dark:via-white/18 dark:opacity-35 animate-[login-shimmer_9s_ease-in-out_infinite]" />
      </div>

      <div className="absolute top-4 right-4 flex items-center space-x-4">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Логотип и заголовок */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <svg
              width={64}
              height={64}
              viewBox="0 0 42.1582 43"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              shapeRendering="geometricPrecision"
              className="text-blue-600 dark:text-blue-400"
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
          </div>
          <h1 className="text-h1 text-2xl font-semibold text-gray-900 dark:text-white mb-2 whitespace-pre-line">
            {t("login.title")}
          </h1>
          {/* <p className="text-gray-600 dark:text-gray-400">
            Войдите в систему мониторинга
          </p> */}
        </div>

        {/* Форма входа */}
        <div className="glass-card rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t("login.email")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                    />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    let value = e.target.value;
                    // Автоматически добавляем @enbek.kz если пользователь ввел только имя
                    if (value && !value.includes("@")) {
                      // Не добавляем автоматически, просто разрешаем ввод
                    } else if (
                      value.includes("@") &&
                      !value.includes("@enbek.kz")
                    ) {
                      // Если пользователь начал вводить другой домен, разрешаем
                      const parts = value.split("@");
                      if (parts.length === 2 && parts[1] === "") {
                        // Пользователь только что ввел @, ничего не делаем
                      }
                    }
                    setEmail(value);
                  }}
                  onBlur={(e) => {
                    let value = e.target.value.trim();
                    // Если пользователь ввел только имя без @, добавляем @enbek.kz
                    if (value && !value.includes("@")) {
                      value = value + "@enbek.kz";
                      setEmail(value);
                    } else if (value && value.endsWith("@")) {
                      // Если пользователь ввел имя@, добавляем enbek.kz
                      value = value + "enbek.kz";
                      setEmail(value);
                    }
                  }}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-slate-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder={t("login.emailPlaceholder")}
                  pattern="[a-zA-Z0-9._%+-]+@enbek\.kz"
                  title={t("login.emailTitle")}
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("login.emailHint")}
              </p>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t("login.password")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
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
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-slate-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder={t("login.passwordPlaceholder")}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m13.42 13.42l-3.29-3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <label
                htmlFor="remember"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                {t("login.rememberMe")}
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {t("login.entering")}
                </>
              ) : (
                t("login.enter")
              )}
            </button>
          </form>
        </div>
      </div>

      <style jsx global>{`
        .login-bg-base {
          background: linear-gradient(
            145deg,
            #f0f7ff 0%,
            #e8f2fc 35%,
            #eef4fb 70%,
            #e2ebf7 100%
          );
          background-size: 200% 200%;
          animation: login-gradient-pan 18s ease-in-out infinite;
        }
        :global(.dark) .login-bg-base {
          background: linear-gradient(
            145deg,
            #020617 0%,
            #0c1525 40%,
            #111d32 70%,
            #0f172a 100%
          );
          background-size: 200% 200%;
        }

        @keyframes login-gradient-pan {
          0%,
          100% {
            background-position: 0% 40%;
          }
          50% {
            background-position: 100% 60%;
          }
        }

        @keyframes login-orb-a {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          33% {
            transform: translate3d(6%, 4%, 0) scale(1.08);
          }
          66% {
            transform: translate3d(3%, -5%, 0) scale(0.96);
          }
        }
        @keyframes login-orb-b {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          40% {
            transform: translate3d(-5%, -6%, 0) scale(1.1);
          }
          80% {
            transform: translate3d(-8%, 4%, 0) scale(0.94);
          }
        }
        @keyframes login-orb-c {
          0%,
          100% {
            transform: translate3d(-50%, -50%, 0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate3d(-50%, -50%, 0) scale(1.12);
            opacity: 0.85;
          }
        }

        .login-orb-a {
          animation: login-orb-a 16s ease-in-out infinite;
        }
        .login-orb-b {
          animation: login-orb-b 19s ease-in-out infinite;
        }
        .login-orb-c {
          animation: login-orb-c 14s ease-in-out infinite;
        }

        @keyframes login-conic {
          from {
            transform: translate3d(-50%, -50%, 0) rotate(0deg);
          }
          to {
            transform: translate3d(-50%, -50%, 0) rotate(360deg);
          }
        }

        @keyframes login-grid-drift {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 48px 48px;
          }
        }

        @keyframes login-shimmer {
          0% {
            transform: translate3d(-30%, 0, 0) rotate(15deg);
            opacity: 0.35;
          }
          50% {
            transform: translate3d(120%, 0, 0) rotate(15deg);
            opacity: 0.65;
          }
          100% {
            transform: translate3d(260%, 0, 0) rotate(15deg);
            opacity: 0.35;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .login-bg-motion *,
          .login-bg-motion {
            animation: none !important;
          }
          .login-bg-base {
            background-size: 100% 100% !important;
          }
          .login-orb-a,
          .login-orb-b,
          .login-orb-c {
            transform: translate3d(0, 0, 0) !important;
          }
          .login-orb-c {
            transform: translate3d(-50%, -50%, 0) scale(1) !important;
          }
        }
      `}</style>
    </div>
  );
}
