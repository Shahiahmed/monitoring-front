"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import * as echarts from "echarts";
import { apiFetch } from "../../lib/api";
import { datesFromYearQuarter } from "../../lib/incidentPeriodFilters";
import { useTheme } from "../../components/ThemeProvider";
import { useLanguage } from "../../components/LanguageProvider";

interface TypeCount  { name: string; count: number; totalMinutes: number; }
interface MonthCount { month: string; count: number; totalMinutes: number; }
interface IsAvailability { id: number; nameRu: string; count: number; totalDowntimeMinutes: number; availabilityPercent: number; }
interface Stats { byType: TypeCount[]; byMonth: MonthCount[]; byIsAvailability?: IsAvailability[]; }

function formatHhMm(minutes: number, minLabel = "мин", hLabel = "ч"): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} ${minLabel}`;
  if (m === 0) return `${h} ${hLabel}`;
  return `${h} ${hLabel} ${m} ${minLabel}`;
}

function useChartTheme(theme: string) {
  const isDark = theme === "dark";
  return {
    text:          isDark ? "#f9fafb" : "#111827",
    subText:       isDark ? "#9ca3af" : "#6b7280",
    splitLine:     isDark ? "#374151" : "#f3f4f6",
    tooltipBg:     isDark ? "rgba(31,41,55,0.95)" : "rgba(255,255,255,0.95)",
    tooltipBorder: isDark ? "#4b5563" : "#e5e7eb",
  };
}

function PieChart({ title, data, theme, noDataText = "Нет данных" }: { title: string; data: { name: string; value: number }[]; theme: string; noDataText?: string }) {
  const ref  = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  const t    = useChartTheme(theme);
  useEffect(() => {
    if (!ref.current) return;
    if (!inst.current) inst.current = echarts.init(ref.current);
    const chart = inst.current;
    if (data.length === 0) {
      chart.setOption({ backgroundColor: "transparent",
        title: { text: title, left: "center", top: 4, textStyle: { color: t.text, fontSize: 13, fontWeight: 600 } },
        series: [], graphic: [{ type: "text", left: "center", top: "middle", style: { text: noDataText, fill: t.subText, fontSize: 12 } }],
      }); return;
    }
    chart.setOption({ backgroundColor: "transparent",
      title: { text: title, left: "center", top: 4, textStyle: { color: t.text, fontSize: 13, fontWeight: 600 } },
      tooltip: { trigger: "item", backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, textStyle: { color: t.text }, formatter: "{b}: {c} ({d}%)" },
      legend: { orient: "vertical", left: "left", top: "middle", textStyle: { color: t.subText, fontSize: 11 } },
      series: [{ type: "pie", radius: ["35%", "60%"], center: ["60%", "55%"], avoidLabelOverlap: true,
        label: { show: false }, emphasis: { label: { show: true, fontSize: 12, fontWeight: "bold" } }, data }],
    });
  }, [data, theme, title, noDataText, t]);
  useEffect(() => { const f = () => inst.current?.resize(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return <div ref={ref} style={{ width: "100%", height: 240 }} />;
}

function BarChart({ title, categories, values, color, theme, yLabel, noDataText = "Нет данных" }: {
  title: string; categories: string[]; values: number[]; color: string; theme: string; yLabel?: string; noDataText?: string;
}) {
  const ref  = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  const t    = useChartTheme(theme);
  useEffect(() => {
    if (!ref.current) return;
    if (!inst.current) inst.current = echarts.init(ref.current);
    const chart = inst.current;
    if (categories.length === 0) {
      chart.setOption({ backgroundColor: "transparent",
        title: { text: title, left: "center", top: 4, textStyle: { color: t.text, fontSize: 13, fontWeight: 600 } },
        series: [], graphic: [{ type: "text", left: "center", top: "middle", style: { text: noDataText, fill: t.subText, fontSize: 12 } }],
      }); return;
    }
    chart.setOption({ backgroundColor: "transparent",
      title: { text: title, left: "center", top: 4, textStyle: { color: t.text, fontSize: 13, fontWeight: 600 } },
      tooltip: { trigger: "axis", backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, textStyle: { color: t.text } },
      grid: { left: 50, right: 20, top: 50, bottom: 60 },
      xAxis: { type: "category", data: categories, axisLine: { lineStyle: { color: t.splitLine } },
        axisLabel: { color: t.subText, fontSize: 11, rotate: categories.length > 6 ? 30 : 0 } },
      yAxis: { type: "value", name: yLabel, nameTextStyle: { color: t.subText, fontSize: 11 },
        splitLine: { lineStyle: { color: t.splitLine } }, axisLabel: { color: t.subText } },
      series: [{ type: "bar", data: values, itemStyle: { color, borderRadius: [4, 4, 0, 0] }, emphasis: { itemStyle: { opacity: 0.85 } },
        label: { show: true, position: "top", formatter: (p: { value: number }) => p.value === 0 ? "" : String(p.value), color: t.subText, fontSize: 10 },
      }],
    });
  }, [categories, values, color, theme, title, yLabel, noDataText, t]);
  useEffect(() => { const f = () => inst.current?.resize(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return <div ref={ref} style={{ width: "100%", height: 260 }} />;
}

function IsBarChart({ title, names, values, color, theme, labelFormatter, noDataText = "Нет данных" }: {
  title: string; names: string[]; values: number[]; color: string; theme: string;
  labelFormatter?: (v: number) => string; noDataText?: string;
}) {
  const ref  = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  const t    = useChartTheme(theme);
  useEffect(() => {
    if (!ref.current) return;
    if (!inst.current) inst.current = echarts.init(ref.current);
    const chart = inst.current;
    if (names.length === 0) {
      chart.setOption({ backgroundColor: "transparent",
        title: { text: title, left: "center", top: 4, textStyle: { color: t.text, fontSize: 13, fontWeight: 600 } },
        series: [], graphic: [{ type: "text", left: "center", top: "middle", style: { text: noDataText, fill: t.subText, fontSize: 12 } }],
      }); return;
    }
    const chartHeight = Math.max(200, names.length * 32 + 60);
    if (ref.current) ref.current.style.height = chartHeight + "px";
    chart.resize();
    chart.setOption({ backgroundColor: "transparent",
      title: { text: title, left: "center", top: 4, textStyle: { color: t.text, fontSize: 13, fontWeight: 600 } },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" },
        backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, textStyle: { color: t.text },
        formatter: labelFormatter
          ? (params: echarts.DefaultLabelFormatterCallbackParams[]) => `${params[0]?.name}: ${labelFormatter(params[0]?.value as number)}`
          : undefined },
      grid: { left: 8, right: 60, top: 40, bottom: 8, containLabel: true },
      xAxis: { type: "value", splitLine: { lineStyle: { color: t.splitLine } }, axisLabel: { color: t.subText, fontSize: 10 } },
      yAxis: { type: "category", data: names, inverse: true, axisLabel: { color: t.subText, fontSize: 10, width: 120, overflow: "truncate" },
        axisLine: { lineStyle: { color: t.splitLine } } },
      series: [{
        type: "bar", data: values, itemStyle: { color, borderRadius: [0, 3, 3, 0] },
        emphasis: { itemStyle: { opacity: 0.85 } },
        label: {
          show: true, position: "right",
          formatter: labelFormatter
            ? (p: { value: number }) => labelFormatter(p.value)
            : (p: { value: number }) => String(p.value),
          color: t.subText, fontSize: 10,
        },
      }],
    });
  }, [names, values, color, theme, title, labelFormatter, noDataText, t]);
  useEffect(() => { const f = () => inst.current?.resize(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return <div ref={ref} style={{ width: "100%", height: 200 }} />;
}

interface SectionLabels {
  noDataText: string;
  loadingText: string;
  byTypeCount: string;
  byTypeMinutes: string;
  byMonthCount: string;
  byMonthMinutes: string;
  byIsCount: string;
  byIsDowntime: string;
  recordsAxis: string;
  hoursAxis: string;
  noFailures: string;
  records: string;
  hoursDowntime: string;
  minLabel: string;
  hLabel: string;
  months: string[];
}

function Section({ title, accent, stats, loading, error, theme, labels }: {
  title: string; accent: string; stats: Stats | null; loading: boolean; error: string | null; theme: string; labels: SectionLabels;
}) {
  const totalCount = stats?.byType.reduce((s, d) => s + d.count, 0) ?? 0;
  const totalMins  = stats?.byType.reduce((s, d) => s + d.totalMinutes, 0) ?? 0;
  const byTypeCount   = stats?.byType.map(d => ({ name: d.name, value: d.count })) ?? [];
  const byTypeMinutes = stats?.byType.map(d => ({ name: d.name, value: Math.round(d.totalMinutes / 60 * 10) / 10 })) ?? [];
  const monthLabels   = stats?.byMonth.map(d => formatMonth(d.month, labels.months)) ?? [];
  const monthCounts   = stats?.byMonth.map(d => d.count) ?? [];
  const monthMinutes  = stats?.byMonth.map(d => Math.round(d.totalMinutes / 60 * 10) / 10) ?? [];

  const isData     = stats?.byIsAvailability ?? [];
  const isNames    = isData.map(d => d.nameRu);
  const isCounts   = isData.map(d => d.count);
  const isDowntime = isData.map(d => Math.round(d.totalDowntimeMinutes));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full" style={{ background: accent }} />
        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 tracking-tight">{title}</h2>
        {!loading && stats && (
          <span className="ml-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
            {totalCount} {labels.records} · {Math.round(totalMins / 60)} {labels.hoursDowntime}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          {labels.loadingText}
        </div>
      )}
      {error && !loading && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-400">
          {error}
        </div>
      )}
      {!loading && !error && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="st-panel rounded-2xl p-4">
            <PieChart title={labels.byTypeCount} data={byTypeCount} theme={theme} noDataText={labels.noDataText} />
          </div>
          <div className="st-panel rounded-2xl p-4">
            <PieChart title={labels.byTypeMinutes} data={byTypeMinutes} theme={theme} noDataText={labels.noDataText} />
          </div>
          <div className="st-panel rounded-2xl p-4">
            <BarChart title={labels.byMonthCount} categories={monthLabels} values={monthCounts} color={accent} theme={theme} yLabel={labels.recordsAxis} noDataText={labels.noDataText} />
          </div>
          <div className="st-panel rounded-2xl p-4">
            <BarChart title={labels.byMonthMinutes} categories={monthLabels} values={monthMinutes} color="#f59e0b" theme={theme} yLabel={labels.hoursAxis} noDataText={labels.noDataText} />
          </div>
          {isData.length > 0 && (
            <div className="st-panel rounded-2xl p-4">
              <IsBarChart
                title={labels.byIsCount}
                names={isNames}
                values={isCounts}
                color={accent}
                theme={theme}
                noDataText={labels.noDataText}
                labelFormatter={(v) => v === 0 ? labels.noFailures : String(v)}
              />
            </div>
          )}
          {isData.length > 0 && (
            <div className="st-panel rounded-2xl p-4">
              <IsBarChart
                title={labels.byIsDowntime}
                names={isNames}
                values={isDowntime}
                color="#ef4444"
                theme={theme}
                noDataText={labels.noDataText}
                labelFormatter={(v) => formatHhMm(v, labels.minLabel, labels.hLabel)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatMonth(yyyyMm: string, months?: string[]): string {
  const [y, m] = yyyyMm.split("-");
  const idx = parseInt(m, 10) - 1;
  const name = months ? (months[idx] ?? m) : m;
  return `${name} ${y}`;
}

type SectionId = "incident" | "works" | "prtg";

export default function IncidentsStatisticsPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const MONTHS = Array.from({ length: 12 }, (_, i) => t(`statistics.month_${i + 1}`));

  const SECTIONS = [
    { id: "incident" as SectionId, title: t("statistics.incidents"), endpoint: "incidents/stats",  yearsEndpoint: "incidents/years",   accent: "#3b82f6", adminOnly: false },
    { id: "works"    as SectionId, title: t("statistics.works"),     endpoint: "works/stats",       yearsEndpoint: "works/years",       accent: "#10b981", adminOnly: false },
    { id: "prtg"     as SectionId, title: t("statistics.prtg"),      endpoint: "prtg-alerts/stats", yearsEndpoint: "prtg-alerts/years", accent: "#f59e0b", adminOnly: true  },
  ];

  const sectionLabels: SectionLabels = {
    noDataText:    t("statistics.noData"),
    loadingText:   t("statistics.loading"),
    byTypeCount:   t("statistics.byTypeCount"),
    byTypeMinutes: t("statistics.byTypeMinutes"),
    byMonthCount:  t("statistics.byMonthCount"),
    byMonthMinutes:t("statistics.byMonthMinutes"),
    byIsCount:     t("statistics.byIsCount"),
    byIsDowntime:  t("statistics.byIsDowntime"),
    recordsAxis:   t("statistics.recordsAxis"),
    hoursAxis:     t("statistics.hoursAxis"),
    noFailures:    t("statistics.noFailures"),
    records:       t("statistics.records"),
    hoursDowntime: t("statistics.hoursDowntime"),
    minLabel:      t("statistics.min"),
    hLabel:        t("statistics.h"),
    months:        MONTHS,
  };

  const [statsMap,   setStatsMap]   = useState<Partial<Record<SectionId, Stats>>>({});
  const [loadingMap, setLoadingMap] = useState<Partial<Record<SectionId, boolean>>>({ incident: true, works: true, prtg: true });
  const [errorMap,   setErrorMap]   = useState<Partial<Record<SectionId, string>>>({});
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");
  const [selectedYear,   setSelectedYear]   = useState("");
  const [selectedQuarter,setSelectedQuarter]= useState("");
  const [years,          setYears]          = useState<number[]>([]);
  const [isAdmin,        setIsAdmin]        = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("authUser") ?? "{}");
      setIsAdmin(u?.roles?.some((r: { code?: string } | string) =>
        ["ADMIN", "SUPER_ADMIN"].includes(typeof r === "string" ? r : (r.code ?? ""))));
    } catch {}
  }, []);

  const visibleSections = SECTIONS.filter(s => !s.adminOnly || isAdmin);

  const fetchAll = useCallback(async (from: string, to: string) => {
    const params = new URLSearchParams();
    if (from) params.set("dateFrom", new Date(from).toISOString());
    if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); params.set("dateTo", d.toISOString()); }
    const q = params.toString() ? "?" + params.toString() : "";

    const sections = SECTIONS.filter(s => !s.adminOnly || isAdmin);
    setLoadingMap(Object.fromEntries(sections.map(s => [s.id, true])));
    setErrorMap({});

    await Promise.all(sections.map(async sec => {
      try {
        const res = await apiFetch(`${sec.endpoint}${q}`);
        if (!res.ok) throw new Error();
        const data: Stats = await res.json();
        setStatsMap(prev => ({ ...prev, [sec.id]: data }));
      } catch {
        setErrorMap(prev => ({ ...prev, [sec.id]: t("statistics.loadError") }));
      } finally {
        setLoadingMap(prev => ({ ...prev, [sec.id]: false }));
      }
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => { void fetchAll("", ""); }, [fetchAll]);

  useEffect(() => {
    const sections = SECTIONS.filter(s => !s.adminOnly || isAdmin);
    Promise.all(sections.map(s => apiFetch(s.yearsEndpoint).then(r => r.ok ? r.json() : []).catch(() => [])))
      .then(results => {
        const merged = Array.from(new Set((results.flat() as number[]).map(Number).filter(Number.isFinite))).sort((a, b) => b - a);
        setYears(merged);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const applyYQ = useCallback((year: string, quarter: string) => {
    setSelectedYear(year); setSelectedQuarter(quarter);
    const r = datesFromYearQuarter(year, quarter);
    const from = r?.from ?? ""; const to = r?.to ?? "";
    setDateFrom(from); setDateTo(to);
    queueMicrotask(() => void fetchAll(from, to));
  }, [fetchAll]);

  const reset = () => { setSelectedYear(""); setSelectedQuarter(""); setDateFrom(""); setDateTo(""); void fetchAll("", ""); };
  const hasFilter = dateFrom || dateTo || selectedYear || selectedQuarter;

  const selectCls = "block rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-500";

  return (
    <div className="px-6 py-8 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 bg-blue-100 border border-blue-300/40 dark:bg-blue-900/40 dark:border-blue-500/30">
            <svg className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight leading-tight">{t("statistics.title")}</h1>
            <Link href="/incidents/availability" className="mt-0.5 block w-fit text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
              {t("statistics.linkAvailability")}
            </Link>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="jrn-panel rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t("statistics.year")}</span>
            {years.map(y => (
              <button key={y} type="button"
                onClick={() => applyYQ(selectedYear === String(y) ? "" : String(y), selectedQuarter)}
                className={`jrn-chip ${selectedYear === String(y) ? "jrn-chip-on" : ""}`}>
                {y}
              </button>
            ))}
            {selectedYear && (
              <button type="button" onClick={() => applyYQ("", selectedQuarter)} className="jrn-chip jrn-chip-reset">{t("statistics.all")}</button>
            )}
          </div>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t("statistics.quarter")}</span>
            {[1, 2, 3, 4].map(q => (
              <button key={q} type="button"
                onClick={() => applyYQ(selectedYear || String(new Date().getFullYear()), selectedQuarter === String(q) ? "" : String(q))}
                className={`jrn-chip ${selectedQuarter === String(q) ? "jrn-chip-on" : ""}`}>
                Q{q}
              </button>
            ))}
            {selectedQuarter && (
              <button type="button" onClick={() => applyYQ(selectedYear, "")} className="jrn-chip jrn-chip-reset">{t("statistics.all")}</button>
            )}
          </div>
        </div>
        <div className="h-px bg-slate-100 dark:bg-white/5" />
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t("statistics.dateFrom")}</label>
            <input type="date" value={dateFrom} onChange={e => { setSelectedYear(""); setSelectedQuarter(""); setDateFrom(e.target.value); }} className={selectCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t("statistics.dateTo")}</label>
            <input type="date" value={dateTo} onChange={e => { setSelectedYear(""); setSelectedQuarter(""); setDateTo(e.target.value); }} className={selectCls} />
          </div>
          <button type="button" onClick={() => void fetchAll(dateFrom, dateTo)}
            className="jrn-search-btn inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-semibold text-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            {t("statistics.apply")}
          </button>
          {hasFilter && (
            <button type="button" onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-white/5 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              {t("statistics.reset")}
            </button>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-8">
        {visibleSections.map(sec => (
          <Section key={sec.id}
            title={sec.title}
            accent={sec.accent}
            stats={statsMap[sec.id] ?? null}
            loading={!!loadingMap[sec.id]}
            error={errorMap[sec.id] ?? null}
            theme={theme}
            labels={sectionLabels}
          />
        ))}
      </div>

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
