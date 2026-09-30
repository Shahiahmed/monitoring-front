"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "../components/ThemeToggle";
import LanguageToggle from "../components/LanguageToggle";
import { useLanguage } from "../components/LanguageProvider";
import { apiFetch } from "../lib/api";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mouse = { x: -9999, y: -9999 };
    const LINK_DIST = 150;
    const MOUSE_DIST = 180;
    const MOUSE_FORCE = 0.018;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    const particles = Array.from({ length: 160 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.6 + 0.8,
    }));

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const dark = document.documentElement.classList.contains("dark");
      const dotColor  = dark ? "rgba(99,140,210," : "rgba(37,99,235,";
      const lineColor = dark ? "rgba(99,140,210," : "rgba(37,99,235,";

      // Update positions + mouse attraction
      for (const p of particles) {
        const mdx = mouse.x - p.x;
        const mdy = mouse.y - p.y;
        const md  = Math.sqrt(mdx * mdx + mdy * mdy);
        if (md < MOUSE_DIST && md > 0) {
          const force = (1 - md / MOUSE_DIST) * MOUSE_FORCE;
          p.vx += (mdx / md) * force;
          p.vy += (mdy / md) * force;
        }
        // Friction
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      }

      // Particle–particle lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * (dark ? 0.30 : 0.38);
            ctx.strokeStyle = lineColor + alpha + ")";
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Mouse–particle lines (bright)
      for (const p of particles) {
        const mdx = mouse.x - p.x;
        const mdy = mouse.y - p.y;
        const md  = Math.sqrt(mdx * mdx + mdy * mdy);
        if (md < MOUSE_DIST) {
          const alpha = (1 - md / MOUSE_DIST) * (dark ? 0.65 : 0.70);
          ctx.strokeStyle = lineColor + alpha + ")";
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }

      // Dots
      for (const p of particles) {
        const mdx = mouse.x - p.x;
        const mdy = mouse.y - p.y;
        const md  = Math.sqrt(mdx * mdx + mdy * mdy);
        const nearMouse = md < MOUSE_DIST;
        const alpha = nearMouse ? (dark ? 0.85 : 0.90) : (dark ? 0.55 : 0.60);
        const radius = nearMouse ? p.r * 1.6 : p.r;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = dotColor + alpha + ")";
        ctx.fill();
      }

      // Cursor dot
      if (mouse.x > 0) {
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = dark ? "rgba(99,140,210,0.80)" : "rgba(37,99,235,0.75)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 8, 0, Math.PI * 2);
        ctx.strokeStyle = dark ? "rgba(99,140,210,0.25)" : "rgba(37,99,235,0.22)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await apiFetch("auth/login", {
        method: "POST",
        skipAuth: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const msg = await response.text();
        setError(msg || t("login.errorFillFields"));
        setIsLoading(false);
        setShake(true);
        setTimeout(() => setShake(false), 600);
        return;
      }

      const data = await response.json();
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("authUser", JSON.stringify(data.user));
      sessionStorage.setItem("justLoggedIn", "1");
      setIsLoading(false);
      router.push("/");
    } catch {
      setError("Ошибка при входе. Попробуйте ещё раз.");
      setIsLoading(false);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4 login-page-bg">
      {/* ── Particle canvas ── */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-0" aria-hidden />

      {/* ── Animated background ── */}
      <div className="pointer-events-none absolute inset-0 login-bg-motion z-0" aria-hidden>
        <div className="absolute -left-[15%] top-[5%] h-[min(650px,90vw)] w-[min(650px,90vw)] rounded-full bg-blue-500/30 blur-3xl dark:bg-blue-600/18 login-orb login-orb-a" />
        <div className="absolute -right-[10%] bottom-[8%] h-[min(580px,85vw)] w-[min(580px,85vw)] rounded-full bg-cyan-400/25 blur-3xl dark:bg-cyan-500/15 login-orb login-orb-b" />
        <div className="absolute left-1/2 top-1/3 h-[min(460px,70vw)] w-[min(460px,70vw)] -translate-x-1/2 rounded-full bg-indigo-400/22 blur-3xl dark:bg-violet-500/12 login-orb login-orb-c" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(100,116,139,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(100,116,139,0.10)_1px,transparent_1px)] bg-size-[56px_56px] animate-[login-grid-drift_60s_linear_infinite] dark:bg-[linear-gradient(to_right,rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.07)_1px,transparent_1px)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_50%,transparent_0%,rgba(248,250,252,0.9)_100%)] dark:bg-[radial-gradient(ellipse_70%_55%_at_50%_50%,transparent_0%,rgba(10,15,30,0.80)_100%)]" />
        <div className="absolute -inset-y-32 -left-[25%] w-[55%] bg-linear-to-r from-transparent via-white/40 to-transparent opacity-50 dark:via-white/10 dark:opacity-30 animate-[login-shimmer_11s_ease-in-out_infinite]" style={{ transform: "rotate(15deg)" }} />
      </div>

      {/* ── Controls top-right ── */}
      <div className="absolute top-5 right-5 z-20 flex items-center gap-3">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      {/* ── Center content ── */}
      <div className="relative z-10 w-full max-w-105 login-enter">
        {/* Logo + title */}
        <div className="text-center mb-7">
          <div className="relative inline-flex items-center justify-center mb-5">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-2xl scale-[2] animate-[logo-pulse_4s_ease-in-out_infinite]" />
            <div className="relative flex items-center justify-center w-18 h-18 rounded-2xl brand-logo-card">
              <svg
                width={42}
                height={43}
                viewBox="0 0 42.1582 43"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                shapeRendering="geometricPrecision"
                style={
                  {
                    "--accent": "#2563EB",
                    "--ink": "#0F172A",
                    "--outline": "#0F172A",
                  } as React.CSSProperties
                }
              >
                <path d="M42.1572 0.499832H11.6345C5.21926 0.499832 0 5.69961 0 12.0914V36.2158L8.92022 27.3289V12.0914C8.92022 10.6002 10.1379 9.38677 11.6345 9.38677H33.237L42.1572 0.499832Z" fill="var(--accent)" stroke="var(--outline)" strokeWidth={0.9} strokeLinejoin="round" />
                <path d="M33.238 9.387V30.9087C33.238 32.3997 32.0201 33.6131 30.5232 33.6131H15.2285L6.30859 42.5H30.5232C36.939 42.5 42.1582 37.3002 42.1582 30.9087V0.500061L33.238 9.387Z" fill="var(--accent)" stroke="var(--outline)" strokeWidth={0.9} strokeLinejoin="round" />
                <path d="M12 25 H16 L18 21 L21 29 L24 18 L26 25 H30" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={31} cy={12} r={6} fill="white" stroke="#0F172A" strokeWidth={2} />
                <path d="M28.5 12.0 L30.4 14.0 L34.0 10.2" stroke="#0F172A" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {t("login.title")}
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Введите данные корпоративной учётной записи
          </p>
        </div>

        {/* Form card */}
        <div className={`login-form-card rounded-2xl p-8 ${shake ? "login-shake" : ""}`}>
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

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("login.email")}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="h-4.5 w-4.5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={(e) => {
                    let value = e.target.value.trim();
                    if (value && !value.includes("@")) {
                      setEmail(value + "@enbek.kz");
                    } else if (value && value.endsWith("@")) {
                      setEmail(value + "enbek.kz");
                    }
                  }}
                  className="login-input block w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder={t("login.emailPlaceholder")}
                  pattern="[^\s@]+@enbek\.kz"
                  title={t("login.emailTitle")}
                  required
                />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 pl-1">
                {t("login.emailHint")}
              </p>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("login.password")}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="h-4.5 w-4.5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input block w-full pl-10 pr-11 py-2.5 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder={t("login.passwordPlaceholder")}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-150"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m13.42 13.42l-3.29-3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end pt-0.5">
              <Link href="/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:underline underline-offset-2">
                Забыли пароль?
              </Link>
            </div>

            {/* Submit */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className="login-btn w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white/80" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t("login.entering")}
                  </>
                ) : (
                  <>
                    {t("login.enter")}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>

      <style jsx global>{`
        .login-page-bg {
          background: linear-gradient(145deg, #cddff5 0%, #d4e6f8 35%, #c8daf2 65%, #bfd2ed 100%);
        }
        html.dark .login-page-bg {
          background: linear-gradient(145deg, #020617 0%, #0c1525 40%, #111d32 70%, #0f172a 100%);
        }

        /* ─── Logo card ─── */
        .brand-logo-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(239,246,255,0.90) 100%);
          box-shadow: 0 8px 32px rgba(37,99,235,0.18), 0 2px 8px rgba(37,99,235,0.10), inset 0 1px 0 rgba(255,255,255,0.8);
          border: 1px solid rgba(147,197,253,0.40);
        }
        html.dark .brand-logo-card {
          background: linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.90) 100%);
          box-shadow: 0 8px 32px rgba(0,0,0,0.40), 0 2px 8px rgba(37,99,235,0.15);
          border: 1px solid rgba(255,255,255,0.08);
        }

        /* ─── Entrance animation ─── */
        .login-enter {
          animation: login-enter 0.55s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes login-enter {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ─── Form card ─── */
        .login-form-card {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(99,140,210,0.30);
          box-shadow:
            0 2px 8px rgba(30,64,175,0.08),
            0 16px 48px rgba(30,64,175,0.16),
            inset 0 0 0 1px rgba(255,255,255,0.75);
        }
        html.dark .login-form-card {
          background: rgba(22,32,50,0.80);
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 20px 60px rgba(0,0,0,0.50), inset 0 0 0 1px rgba(255,255,255,0.04);
        }

        /* ─── Input fields ─── */
        .login-input {
          background: rgba(248,250,252,0.80);
          border: 1.5px solid rgba(203,213,225,0.70);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .login-input:focus {
          background: rgba(255,255,255,0.95);
          border-color: rgba(59,130,246,0.65);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12), 0 1px 3px rgba(0,0,0,0.06);
        }
        html.dark .login-input {
          background: rgba(15,23,42,0.50);
          border-color: rgba(255,255,255,0.09);
          color: #f1f5f9;
        }
        html.dark .login-input:focus {
          background: rgba(15,23,42,0.70);
          border-color: rgba(59,130,246,0.55);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
        }

        /* ─── Submit button ─── */
        .login-btn {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%);
          box-shadow: 0 4px 14px rgba(37,99,235,0.40), 0 1px 3px rgba(37,99,235,0.30);
          position: relative;
          overflow: hidden;
          transition: box-shadow 0.2s, transform 0.15s;
        }
        .login-btn::before {
          content: '';
          position: absolute;
          top: 0; left: -100%; bottom: 0; width: 100%;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%);
          transition: left 0.5s ease;
        }
        .login-btn:hover:not(:disabled)::before { left: 100%; }
        .login-btn:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(37,99,235,0.50), 0 2px 6px rgba(37,99,235,0.35);
          transform: translateY(-1px);
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(37,99,235,0.35);
        }

        /* ─── Shake on error ─── */
        @keyframes login-shake {
          0%, 100% { transform: translateX(0); }
          15%  { transform: translateX(-6px); }
          30%  { transform: translateX(6px); }
          45%  { transform: translateX(-5px); }
          60%  { transform: translateX(5px); }
          75%  { transform: translateX(-3px); }
          90%  { transform: translateX(3px); }
        }
        .login-shake { animation: login-shake 0.55s cubic-bezier(0.36,0.07,0.19,0.97) both; }

        /* ─── Orbs ─── */
        @keyframes login-orb-a {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          33%  { transform: translate3d(5%,4%,0) scale(1.07); }
          66%  { transform: translate3d(3%,-5%,0) scale(0.96); }
        }
        @keyframes login-orb-b {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          40%  { transform: translate3d(-5%,-6%,0) scale(1.09); }
          80%  { transform: translate3d(-7%,4%,0) scale(0.95); }
        }
        @keyframes login-orb-c {
          0%, 100% { transform: translate3d(-50%,-50%,0) scale(1); opacity: 1; }
          50%  { transform: translate3d(-50%,-50%,0) scale(1.14); opacity: 0.82; }
        }
        .login-orb-a { animation: login-orb-a 18s ease-in-out infinite; }
        .login-orb-b { animation: login-orb-b 22s ease-in-out infinite; }
        .login-orb-c { animation: login-orb-c 15s ease-in-out infinite; }

        @keyframes login-grid-drift {
          0%   { background-position: 0 0; }
          100% { background-position: 56px 56px; }
        }
        @keyframes login-shimmer {
          0%   { transform: translate3d(-35%,0,0) rotate(15deg); opacity: 0.3; }
          50%  { transform: translate3d(130%,0,0) rotate(15deg); opacity: 0.55; }
          100% { transform: translate3d(280%,0,0) rotate(15deg); opacity: 0.3; }
        }
        @keyframes logo-pulse {
          0%, 100% { opacity: 0.5; transform: scale(2); }
          50%  { opacity: 0.8; transform: scale(2.2); }
        }

        /* prefers-reduced-motion intentionally not applied — decorative background */
      `}</style>
    </div>
  );
}
