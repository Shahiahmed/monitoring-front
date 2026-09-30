"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";
import { datesFromYearQuarter } from "../../lib/incidentPeriodFilters";
import { useLanguage } from "../../components/LanguageProvider";

interface IsAvailability {
  id: number;
  nameRu: string | null;
  totalDowntimeMinutes: number;
  availabilityPercent: number;
}

interface StatsPayload {
  byIsAvailability?: IsAvailability[];
}

function minutesInYear(year: number): number {
  return (new Date(year, 1, 29).getMonth() === 1 ? 366 : 365) * 1440;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 100 - 1e-9) return "100 %";
  const rounded = value.toFixed(2);
  if (rounded.startsWith("100")) {
    return `${(Math.floor(value * 100) / 100).toFixed(2)} %`;
  }
  return `${rounded} %`;
}

export default function IncidentsAvailabilityPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<IsAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("");
  const [incidentYears, setIncidentYears] = useState<number[]>([]);
  const [tableView, setTableView] = useState<"all" | "withOutage">("all");

  const runLoad = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("dateFrom", new Date(from).toISOString());
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        params.set("dateTo", d.toISOString());
      }
      const q = params.toString();
      const res = await apiFetch(`incidents/stats${q ? "?" + q : ""}`);
      if (!res.ok) throw new Error(t("availability.loadError"));
      const data: StatsPayload = await res.json();
      setRows(data.byIsAvailability ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("availability.loadError"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void runLoad("", ""); }, [runLoad]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("incidents/years");
        if (!res.ok || cancelled) return;
        const data: unknown = await res.json();
        if (cancelled || !Array.isArray(data)) return;
        setIncidentYears(data.map((y) => Number(y)).filter((y) => Number.isFinite(y)));
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const applyYQ = useCallback((year: string, quarter: string) => {
    setSelectedYear(year);
    setSelectedQuarter(quarter);
    const r = datesFromYearQuarter(year, quarter);
    const from = r?.from ?? "";
    const to = r?.to ?? "";
    setDateFrom(from);
    setDateTo(to);
    queueMicrotask(() => void runLoad(from, to));
  }, [runLoad]);

  const reset = () => {
    setSelectedYear(""); setSelectedQuarter("");
    setDateFrom(""); setDateTo("");
    void runLoad("", "");
  };
  const hasFilter = dateFrom || dateTo || selectedYear || selectedQuarter;

  const displayRows = useMemo(() => (
    tableView === "withOutage" ? rows.filter((r) => r.totalDowntimeMinutes > 0) : rows
  ), [rows, tableView]);

  const activeYear = selectedYear ? Number(selectedYear) : new Date().getFullYear();
  const minsPerYear = minutesInYear(activeYear);
  const daysInYear = new Date(activeYear, 1, 29).getMonth() === 1 ? 366 : 365;

  const totalDowntime = rows.reduce((s, r) => s + r.totalDowntimeMinutes, 0);
  const overallPercent = rows.length === 0 ? null
    : 100 * (1 - totalDowntime / (minsPerYear * rows.length));

  const selectCls = "block rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-500";

  return (
    <div className="px-6 py-8 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 bg-green-100 border border-green-300/40 dark:bg-green-900/40 dark:border-green-500/30">
            <svg className="w-4.5 h-4.5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight leading-tight">{t("availability.isMtszn")}</h1>
            <Link href="/incidents/statistics" className="mt-0.5 block w-fit text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
              {t("availability.statisticsLink")}
            </Link>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="jrn-panel rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t("availability.year")}</span>
            {incidentYears.map(y => (
              <button key={y} type="button"
                onClick={() => applyYQ(selectedYear === String(y) ? "" : String(y), selectedQuarter)}
                className={`jrn-chip ${selectedYear === String(y) ? "jrn-chip-on" : ""}`}>
                {y}
              </button>
            ))}
            {selectedYear && (
              <button type="button" onClick={() => applyYQ("", selectedQuarter)} className="jrn-chip jrn-chip-reset">{t("availability.all")}</button>
            )}
          </div>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t("availability.quarter")}</span>
            {[1, 2, 3, 4].map(q => (
              <button key={q} type="button"
                onClick={() => applyYQ(selectedYear || String(new Date().getFullYear()), selectedQuarter === String(q) ? "" : String(q))}
                className={`jrn-chip ${selectedQuarter === String(q) ? "jrn-chip-on" : ""}`}>
                Q{q}
              </button>
            ))}
            {selectedQuarter && (
              <button type="button" onClick={() => applyYQ(selectedYear, "")} className="jrn-chip jrn-chip-reset">{t("availability.all")}</button>
            )}
          </div>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t("availability.view")}</span>
            <button type="button" onClick={() => setTableView("all")}
              className={`jrn-chip ${tableView === "all" ? "jrn-chip-on" : ""}`}>
              {t("availability.allIs")}
            </button>
            <button type="button" onClick={() => setTableView("withOutage")}
              className={`jrn-chip ${tableView === "withOutage" ? "jrn-chip-on" : ""}`}>
              {t("availability.withFailures")}
            </button>
          </div>
        </div>
        <div className="h-px bg-slate-100 dark:bg-white/5" />
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t("availability.dateFrom")}</label>
            <input type="date" value={dateFrom}
              onChange={e => { setSelectedYear(""); setSelectedQuarter(""); setDateFrom(e.target.value); }}
              className={selectCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t("availability.dateTo")}</label>
            <input type="date" value={dateTo}
              onChange={e => { setSelectedYear(""); setSelectedQuarter(""); setDateTo(e.target.value); }}
              className={selectCls} />
          </div>
          <button type="button" onClick={() => void runLoad(dateFrom, dateTo)}
            className="jrn-search-btn inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-semibold text-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {t("availability.apply")}
          </button>
          {hasFilter && (
            <button type="button" onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-white/5 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {t("availability.reset")}
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          {t("availability.loading")}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <>
          <div className="st-panel rounded-2xl overflow-hidden">
            {rows.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t("availability.noIsData")}</p>
            ) : displayRows.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t("availability.noFailures")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-120">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-white/6">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("availability.name")}</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("availability.downtimeMin")}</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("availability.availPercent")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/4">
                    {displayRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.nameRu || `ID ${row.id}`}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-400">
                          {row.totalDowntimeMinutes > 0 ? row.totalDowntimeMinutes : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold">
                          <span className={row.totalDowntimeMinutes === 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-amber-600 dark:text-amber-400"}>
                            {formatPercent(row.availabilityPercent)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                        {t("availability.overallAvail").replace("{n}", String(rows.length))}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {totalDowntime > 0 ? totalDowntime : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 dark:text-white">
                        {overallPercent === null ? "—" : formatPercent(overallPercent)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Formula */}
          <div className="px-1 text-xs text-slate-400 dark:text-slate-500 space-y-1">
            <p className="font-semibold text-slate-500 dark:text-slate-400">{t("availability.formula")}</p>
            <p className="font-mono">{t("availability.formulaText").replaceAll("{mins}", minsPerYear.toLocaleString("ru-RU"))}</p>
            <p>{t("availability.formulaNote").replaceAll("{mins}", minsPerYear.toLocaleString("ru-RU")).replace("{year}", String(activeYear)).replace("{days}", String(daysInYear))}</p>
          </div>
        </>
      )}

      <style jsx global>{`
        .st-panel {
          background: #ffffff;
          border: 1px solid rgba(226,232,240,0.80);
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);
        }
        html.dark .st-panel {
          background: rgba(22,32,50,0.60);
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 1px 3px rgba(0,0,0,0.20);
        }
        .jrn-panel {
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(226,232,240,0.9);
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03);
        }
        html.dark .jrn-panel {
          background: rgba(15,23,42,0.6);
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .jrn-chip {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 4px 11px; border-radius: 9999px; font-size: 11px; font-weight: 600;
          line-height: 1; border: 1.5px solid #e2e8f0;
          background: #fff; color: #64748b;
          cursor: pointer; transition: all 0.14s ease;
        }
        .jrn-chip:hover { border-color: #93c5fd; color: #2563eb; background: #eff6ff; }
        html.dark .jrn-chip { background: rgba(30,41,59,0.5); border-color: rgba(255,255,255,0.09); color: #94a3b8; }
        html.dark .jrn-chip:hover { border-color: rgba(59,130,246,0.4); color: #60a5fa; background: rgba(59,130,246,0.08); }
        .jrn-chip-on {
          background: #2563eb !important; border-color: #2563eb !important;
          color: #fff !important; box-shadow: 0 2px 8px rgba(37,99,235,0.40);
        }
        html.dark .jrn-chip-on {
          background: rgba(59,130,246,0.85) !important;
          border-color: rgba(59,130,246,0.85) !important; color: #fff !important;
        }
        .jrn-chip-reset {
          background: #f8fafc; color: #94a3b8;
          border-style: dashed; border-color: #cbd5e1;
        }
        html.dark .jrn-chip-reset { background: rgba(30,41,59,0.3); border-color: rgba(255,255,255,0.12); }
        .jrn-search-btn {
          background: linear-gradient(135deg,#2563eb 0%,#1e40af 100%);
          box-shadow: 0 2px 8px rgba(37,99,235,0.32);
          transition: box-shadow 0.15s, transform 0.1s;
        }
        .jrn-search-btn:hover { box-shadow: 0 4px 14px rgba(37,99,235,0.48); transform: translateY(-1px); }
      `}</style>
    </div>
  );
}
