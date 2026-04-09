"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import * as echarts from "echarts";
import { apiFetch } from "../../lib/api";
import { datesFromYearQuarter } from "../../lib/incidentPeriodFilters";
import { useTheme } from "../../components/ThemeProvider";

interface TypeCount {
  name: string;
  count: number;
  totalMinutes: number;
}

interface MonthCount {
  month: string;
  count: number;
  totalMinutes: number;
}

interface Stats {
  byType: TypeCount[];
  byMonth: MonthCount[];
}

/** Как в старом Angular: 100 → «100 %», иначе ровно 2 знака после запятой. */
function formatLegacyPercent(value: number): string {
  if (Number.isFinite(value) && Math.abs(value - 100) < 1e-6) {
    return "100 %";
  }
  return `${Number(value).toFixed(2)} %`;
}

function useChartTheme(theme: string) {
  const isDark = theme === "dark";
  return {
    text:       isDark ? "#f9fafb" : "#111827",
    subText:    isDark ? "#9ca3af" : "#6b7280",
    splitLine:  isDark ? "#374151" : "#f3f4f6",
    tooltipBg:  isDark ? "rgba(31,41,55,0.95)" : "rgba(255,255,255,0.95)",
    tooltipBorder: isDark ? "#4b5563" : "#e5e7eb",
  };
}

function PieChart({
  title,
  data,
  theme,
}: {
  title: string;
  data: { name: string; value: number }[];
  theme: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  const t = useChartTheme(theme);

  useEffect(() => {
    if (!ref.current) return;
    if (!inst.current) inst.current = echarts.init(ref.current);
    const chart = inst.current;

    if (data.length === 0) {
      chart.setOption({
        backgroundColor: "transparent",
        title: { text: title, left: "center", top: 4, textStyle: { color: t.text, fontSize: 14, fontWeight: 600 } },
        series: [],
        graphic: [{
          type: "text",
          left: "center",
          top: "middle",
          style: { text: "Нет данных", fill: t.subText, fontSize: 13 },
        }],
      });
      return;
    }

    chart.setOption({
      backgroundColor: "transparent",
      title: { text: title, left: "center", top: 4, textStyle: { color: t.text, fontSize: 14, fontWeight: 600 } },
      tooltip: {
        trigger: "item",
        backgroundColor: t.tooltipBg,
        borderColor: t.tooltipBorder,
        textStyle: { color: t.text },
        formatter: "{b}: {c} ({d}%)",
      },
      legend: {
        orient: "vertical",
        left: "left",
        top: "middle",
        textStyle: { color: t.subText, fontSize: 11 },
      },
      series: [{
        type: "pie",
        radius: ["35%", "60%"],
        center: ["60%", "55%"],
        avoidLabelOverlap: true,
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 12, fontWeight: "bold" } },
        data,
      }],
    });
  }, [data, theme, title, t]);

  useEffect(() => {
    const onResize = () => inst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return <div ref={ref} style={{ width: "100%", height: 300 }} />;
}

function BarChart({
  title,
  categories,
  values,
  color,
  theme,
  yLabel,
}: {
  title: string;
  categories: string[];
  values: number[];
  color: string;
  theme: string;
  yLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  const t = useChartTheme(theme);

  useEffect(() => {
    if (!ref.current) return;
    if (!inst.current) inst.current = echarts.init(ref.current);
    const chart = inst.current;

    if (categories.length === 0) {
      chart.setOption({
        backgroundColor: "transparent",
        title: { text: title, left: "center", top: 4, textStyle: { color: t.text, fontSize: 14, fontWeight: 600 } },
        series: [],
        graphic: [{
          type: "text",
          left: "center",
          top: "middle",
          style: { text: "Нет данных", fill: t.subText, fontSize: 13 },
        }],
      });
      return;
    }

    chart.setOption({
      backgroundColor: "transparent",
      title: { text: title, left: "center", top: 4, textStyle: { color: t.text, fontSize: 14, fontWeight: 600 } },
      tooltip: {
        trigger: "axis",
        backgroundColor: t.tooltipBg,
        borderColor: t.tooltipBorder,
        textStyle: { color: t.text },
      },
      grid: { left: 50, right: 20, top: 50, bottom: 60 },
      xAxis: {
        type: "category",
        data: categories,
        axisLine: { lineStyle: { color: t.splitLine } },
        axisLabel: { color: t.subText, fontSize: 11, rotate: categories.length > 6 ? 30 : 0 },
      },
      yAxis: {
        type: "value",
        name: yLabel,
        nameTextStyle: { color: t.subText, fontSize: 11 },
        splitLine: { lineStyle: { color: t.splitLine } },
        axisLabel: { color: t.subText },
      },
      series: [{
        type: "bar",
        data: values,
        itemStyle: { color, borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { opacity: 0.85 } },
      }],
    });
  }, [categories, values, color, theme, title, yLabel, t]);

  useEffect(() => {
    const onResize = () => inst.current?.resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return <div ref={ref} style={{ width: "100%", height: 320 }} />;
}

export default function IncidentsStatisticsPage() {
  const { theme } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("");
  const [incidentYears, setIncidentYears] = useState<number[]>([]);

  const runFetchStats = useCallback(async (from: string, to: string) => {
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
      if (!res.ok) throw new Error("Не удалось загрузить статистику");
      setStats(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(() => {
    void runFetchStats(dateFrom, dateTo);
  }, [dateFrom, dateTo, runFetchStats]);

  useEffect(() => {
    void runFetchStats("", "");
  }, [runFetchStats]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("incidents/years");
        if (!res.ok || cancelled) return;
        const data: unknown = await res.json();
        if (cancelled || !Array.isArray(data)) return;
        setIncidentYears(data.map((y) => Number(y)).filter((y) => Number.isFinite(y)));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyYearQuarter = useCallback(
    (year: string, quarter: string) => {
      setSelectedYear(year);
      setSelectedQuarter(quarter);
      const r = datesFromYearQuarter(year, quarter);
      const from = r?.from ?? "";
      const to = r?.to ?? "";
      setDateFrom(from);
      setDateTo(to);
      queueMicrotask(() => void runFetchStats(from, to));
    },
    [runFetchStats]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadStats();
  };

  const inputCls = "px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500";
  const radioCls =
    "h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-gray-500";

  const byTypeCount      = stats?.byType.map((d) => ({ name: d.name, value: d.count })) ?? [];
  const byTypeMinutes    = stats?.byType.map((d) => ({ name: d.name, value: Math.round(d.totalMinutes / 60 * 10) / 10 })) ?? [];
  const monthLabels      = stats?.byMonth.map((d) => d.month) ?? [];
  const monthCounts      = stats?.byMonth.map((d) => d.count) ?? [];
  const monthMinutes     = stats?.byMonth.map((d) => Math.round(d.totalMinutes / 60 * 10) / 10) ?? [];

  const totalIncidents   = stats?.byType.reduce((s, d) => s + d.count, 0) ?? 0;
  const totalHours       = stats?.byType.reduce((s, d) => s + d.totalMinutes, 0) ?? 0;

  return (
    <div className="px-6 py-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Статистика по инцидентам</h1>
        <Link
          href="/incidents/availability"
          className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white underline-offset-2 hover:underline shrink-0"
        >
          Доступность ИС
        </Link>
      </div>

      {/* Фильтр периода */}
      <form onSubmit={handleSearch} className="mb-6 space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="space-y-3 border-b border-gray-200 dark:border-gray-700 pb-4">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Год</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2" role="radiogroup" aria-label="Год">
            {incidentYears.map((y) => (
              <label key={y} className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="st-year"
                  className={radioCls}
                  checked={selectedYear === String(y)}
                  onChange={() => applyYearQuarter(String(y), selectedQuarter)}
                />
                {y}
              </label>
            ))}
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="st-year"
                className={radioCls}
                checked={selectedYear === ""}
                onChange={() => applyYearQuarter("", selectedQuarter)}
              />
              Не выбрано
            </label>
          </div>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Квартал</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {[1, 2, 3, 4].map((q) => (
              <label key={q} className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="st-quarter"
                  className={radioCls}
                  checked={selectedQuarter === String(q)}
                  onChange={() => applyYearQuarter(selectedYear || String(new Date().getFullYear()), String(q))}
                />
                {q}
              </label>
            ))}
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="st-quarter"
                className={radioCls}
                checked={selectedQuarter === ""}
                onChange={() => applyYearQuarter(selectedYear, "")}
              />
              Не выбрано
            </label>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Дата с</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setSelectedYear("");
                setSelectedQuarter("");
                setDateFrom(e.target.value);
              }}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Дата по</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setSelectedYear("");
                setSelectedQuarter("");
                setDateTo(e.target.value);
              }}
              className={inputCls}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            Применить
          </button>
          {(dateFrom || dateTo || selectedYear || selectedQuarter) && (
            <button
              type="button"
              onClick={() => {
                setSelectedYear("");
                setSelectedQuarter("");
                setDateFrom("");
                setDateTo("");
                void runFetchStats("", "");
              }}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Сбросить
            </button>
          )}
        </div>
      </form>

      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Загрузка...</p>}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && stats && (
        <>
          {/* Суммарные карточки */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard label="Инцидентов" value={String(totalIncidents)} />
            <StatCard label="Типов" value={String(stats.byType.length)} />
            <StatCard label="Общий простой" value={`${Math.round(totalHours / 60)} ч`} />
            <StatCard label="Месяцев с данными" value={String(stats.byMonth.length)} />
          </div>

          {/* Графики: по типам */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 p-4">
              <PieChart title="Количество инцидентов по типам" data={byTypeCount} theme={theme} />
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 p-4">
              <PieChart title="Время простоя по типам (ч)" data={byTypeMinutes} theme={theme} />
            </div>
          </div>

          {/* Графики: по месяцам */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 p-4">
              <BarChart
                title="Количество инцидентов по месяцам"
                categories={monthLabels}
                values={monthCounts}
                color="#3b82f6"
                theme={theme}
                yLabel="инцидентов"
              />
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 p-4">
              <BarChart
                title="Время простоя по месяцам (ч)"
                categories={monthLabels}
                values={monthMinutes}
                color="#f59e0b"
                theme={theme}
                yLabel="часов"
              />
            </div>
          </div>

          {/* Таблица по типам */}
          {stats.byType.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Детализация по типам</h3>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">№</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Тип инцидента</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Кол-во</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Простой (мин)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Простой (ч)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Доля</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {stats.byType.map((row, idx) => (
                    <tr key={row.name} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.name}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">{row.count}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">{row.totalMinutes}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                        {Math.round(row.totalMinutes / 60 * 10) / 10}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                        {totalIncidents > 0
                          ? formatLegacyPercent((row.count / totalIncidents) * 100)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 px-4 py-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
