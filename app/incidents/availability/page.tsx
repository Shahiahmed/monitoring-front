"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";
import { datesFromYearQuarter } from "../../lib/incidentPeriodFilters";

interface IsAvailability {
  id: number;
  nameRu: string | null;
  totalDowntimeMinutes: number;
  availabilityPercent: number;
}

interface StatsPayload {
  byIsAvailability?: IsAvailability[];
}

/** Как в старом Angular: 100 → «100 %», иначе два знака после запятой. */
function formatLegacyPercent(value: number): string {
  if (Number.isFinite(value) && Math.abs(value - 100) < 1e-6) {
    return "100 %";
  }
  return `${Number(value).toFixed(2)} %`;
}

export default function IncidentsAvailabilityPage() {
  const [rows, setRows] = useState<IsAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("");
  const [incidentYears, setIncidentYears] = useState<number[]>([]);

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
      if (!res.ok) throw new Error("Не удалось загрузить данные");
      const data: StatsPayload = await res.json();
      setRows(data.byIsAvailability ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runLoad("", "");
  }, [runLoad]);

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
      queueMicrotask(() => void runLoad(from, to));
    },
    [runLoad]
  );

  const load = useCallback(() => {
    void runLoad(dateFrom, dateTo);
  }, [dateFrom, dateTo, runLoad]);

  const inputCls =
    "px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500";
  const radioCls =
    "h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-gray-500";

  return (
    <div className="px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Доступность ИС МТЗСН</h1>
        <Link
          href="/incidents/statistics"
          className="shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white underline-offset-2 hover:underline"
        >
          Статистика
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="mb-6 space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
      >
        <div className="space-y-3 border-b border-gray-200 dark:border-gray-700 pb-4">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Год</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2" role="radiogroup" aria-label="Год">
            {incidentYears.map((y) => (
              <label key={y} className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="av-year"
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
                name="av-year"
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
                  name="av-quarter"
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
                name="av-quarter"
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
                void runLoad("", "");
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

      {!loading && !error && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white">ИС МТЗСН</h2>
          </div>
          {rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Нет записей в справочнике ИС</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      ИС МТЗСН
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Общее время сбоя (мин)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Процент (%)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.nameRu || `ID ${row.id}`}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                        {row.totalDowntimeMinutes}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white font-medium">
                        {formatLegacyPercent(row.availabilityPercent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
