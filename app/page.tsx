"use client";

import { useEffect, useState } from "react";
import { ActivityChart, DowntimeChart, type DashboardData } from "./components/Charts";
import { apiFetch } from "./lib/api";
import Link from "next/link";
import { useLanguage } from "./components/LanguageProvider";

interface MonthPoint { month: string; count: number; totalMinutes: number; }
interface TypeCount  { name: string; count: number; totalMinutes: number; }
interface IsAvailability { id: number; nameRu: string | null; availabilityPercent: number; }
interface StatsPayload {
  byMonth?: MonthPoint[];
  byType?: TypeCount[];
  byIsAvailability?: IsAvailability[];
  totalDowntimeMinutes?: number;
}

interface SummaryStats {
  incidentCount: number;
  worksCount: number;
  prtgCount: number;
  downtimeMins: number;
  avgAvailability: number | null;
}

const EMPTY: DashboardData = { incidents: [], works: [], prtg: [] };
const EMPTY_SUMMARY: SummaryStats = { incidentCount: 0, worksCount: 0, prtgCount: 0, downtimeMins: 0, avgAvailability: null };

export default function Home() {
  const { t } = useLanguage();
  const [data, setData]       = useState<DashboardData>(EMPTY);
  const [summary, setSummary] = useState<SummaryStats>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  function formatHhMm(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} ${t("dashboard.min")}`;
    if (m === 0) return `${h} ${t("dashboard.h")}`;
    return `${h} ${t("dashboard.h")} ${m} ${t("dashboard.min")}`;
  }

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("authUser") ?? "{}");
      setIsAdmin(u?.roles?.some((r: { code?: string } | string) =>
        ["ADMIN", "SUPER_ADMIN"].includes(typeof r === "string" ? r : (r.code ?? ""))));
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const year = new Date().getFullYear();
        const dateFrom = new Date(`${year}-01-01T00:00:00`).toISOString();
        const dateTo   = new Date(`${year}-12-31T23:59:59`).toISOString();
        const q = `?dateFrom=${dateFrom}&dateTo=${dateTo}`;

        const [incRes, wrkRes] = await Promise.all([
          apiFetch(`incidents/stats${q}`),
          apiFetch(`works/stats${q}`),
        ]);
        const incData: StatsPayload = incRes.ok ? await incRes.json() : {};
        const wrkData: StatsPayload = wrkRes.ok ? await wrkRes.json() : {};

        let prtgMonths: MonthPoint[] = [];
        let prtgCount = 0;
        if (isAdmin) {
          const prtgRes = await apiFetch(`prtg-alerts/stats${q}`);
          const prtgData: StatsPayload = prtgRes.ok ? await prtgRes.json() : {};
          prtgMonths = prtgData.byMonth ?? [];
          prtgCount = (prtgData.byType ?? []).reduce((s, t) => s + t.count, 0);
        }

        const incidentCount = (incData.byType ?? []).reduce((s, t) => s + t.count, 0);
        const worksCount    = (wrkData.byType ?? []).reduce((s, t) => s + t.count, 0);
        const downtimeMins  = incData.totalDowntimeMinutes ?? 0;

        const availList = incData.byIsAvailability ?? [];
        const avgAvailability = availList.length > 0
          ? availList.reduce((s, a) => s + a.availabilityPercent, 0) / availList.length
          : null;

        setSummary({ incidentCount, worksCount, prtgCount, downtimeMins, avgAvailability });
        setData({ incidents: incData.byMonth ?? [], works: wrkData.byMonth ?? [], prtg: prtgMonths });
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [isAdmin]);

  const year = new Date().getFullYear();

  const statCards = [
    {
      title: t("dashboard.incidents"),
      value: loading ? "…" : String(summary.incidentCount),
      sub: t("dashboard.incidentsSub").replace("{year}", String(year)),
      color: "bg-blue-500",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    },
    {
      title: t("dashboard.works"),
      value: loading ? "…" : String(summary.worksCount),
      sub: t("dashboard.worksSub").replace("{year}", String(year)),
      color: "bg-green-500",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
    {
      title: t("dashboard.downtime"),
      value: loading ? "…" : formatHhMm(summary.downtimeMins),
      sub: t("dashboard.downtimeSub").replace("{year}", String(year)),
      color: "bg-red-500",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      title: t("dashboard.avgAvailability"),
      value: loading ? "…" : summary.avgAvailability !== null
        ? (() => {
            const v = summary.avgAvailability!;
            if (v >= 100 - 1e-9) return "100 %";
            const r = v.toFixed(2);
            return (r.startsWith("100") ? (Math.floor(v * 100) / 100).toFixed(2) : r) + " %";
          })()
        : "—",
      sub: t("dashboard.avgAvailabilitySub").replace("{year}", String(year)),
      color: "bg-purple-500",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
  ];

  return (
    <div className="px-6 py-8">
      <div className="space-y-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h1 text-gray-900 dark:text-white tracking-tight">
              {t("dashboard.title")}
            </h1>
            <p className="text-muted mt-0.5">
              {t("dashboard.subtitle").replace("{year}", String(new Date().getFullYear()))}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/servers"
              className="group flex min-w-[min(100%,220px)] max-w-sm items-center gap-3 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2.5 shadow-card transition-all hover:border-blue-400/50 hover:shadow-card-hover dark:border-slate-700/90 dark:bg-slate-900/60 dark:hover:border-blue-500/40"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" /></svg>
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{t("dashboard.servers")}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{t("dashboard.serversHint")}</span>
              </span>
              <svg className="w-5 h-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600 dark:text-gray-500 dark:group-hover:text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
        </div>

        {/* Сводка */}
        <div data-tour="dashboard-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <div key={i} className="glass-card rounded-xl p-4 transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div className={`${card.color} p-2 rounded-lg text-white`}>{card.icon}</div>
              </div>
              <p className="text-muted mt-3">{card.title}</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white mt-0.5 tracking-tight tabular-nums">{card.value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Графики */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[0, 1].map(i => (
              <div key={i} className="glass-card rounded-xl p-6 flex items-center justify-center h-85">
                <svg className="animate-spin w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ))}
          </div>
        ) : (
          <div data-tour="dashboard-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-xl p-6">
              <ActivityChart data={data} isAdmin={isAdmin} />
            </div>
            <div className="glass-card rounded-xl p-6">
              <DowntimeChart data={data} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
