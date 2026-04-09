"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { apiFetch, apiUrl } from "../../lib/api";
import { datesFromYearQuarter } from "../../lib/incidentPeriodFilters";

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function IconResetFilters({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

interface FailureType {
  id: number;
  nameRu: string | null;
}

interface JobType {
  id: number;
  nameRu: string | null;
}

interface Location {
  id: number;
  nameRu: string | null;
}

interface InfoSystem {
  id: number;
  nameRu: string | null;
}

interface IncidentInterval {
  id: number;
  dateFrom: string | null;
  dateTo: string | null;
  diffMinutes: number | null;
}

interface IncidentFileItem {
  id: number;
  fileName: string;
  contentType: string | null;
  fileSize: number | null;
}

interface Incident {
  id: number;
  dicJobId: number | null;
  dicJobNameRu: string | null;
  failureTypeId: number | null;
  failureTypeNameRu: string | null;
  locationId: number | null;
  locationNameRu: string | null;
  isIds: number[];
  isNamesRu: string[];
  fixed: boolean | null;
  emptyTime: boolean | null;
  includeAvailability: boolean | null;
  inMessage: string | null;
  outMessage: string | null;
  act: string | null;
  problem: string | null;
  solution: string | null;
  createdAt: string | null;
  intervals: IncidentInterval[];
  totalDiffMinutes: number;
  fileCount: number;
}

interface AuthUser {
  roles?: string[];
}

function isAdminOrSuperAdmin(user: AuthUser | null): boolean {
  const roles = user?.roles ?? [];
  return roles.includes("SUPER_ADMIN") || roles.includes("ADMIN");
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

/** Как в старом журнале: «0 дн, 0 ч, 44 мин». */
function formatDurationLegacy(minutes: number): string {
  if (minutes <= 0) return "—";
  const d = Math.floor(minutes / (60 * 24));
  const rem = minutes % (60 * 24);
  const h = Math.floor(rem / 60);
  const m = rem % 60;
  return `${d} дн, ${h} ч, ${m} мин`;
}

/** Компактная длительность для узкой колонки. */
function formatDurationCompact(minutes: number): string {
  if (minutes <= 0) return "—";
  const d = Math.floor(minutes / (60 * 24));
  const rem = minutes % (60 * 24);
  const h = Math.floor(rem / 60);
  const m = rem % 60;
  if (d === 0 && h === 0) return `${m} мин`;
  if (d === 0) return `${h} ч ${m} мин`;
  return `${d}д ${h}ч ${m}м`;
}

function JournalDateCell({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-gray-400 dark:text-gray-500">—</span>;
  try {
    const d = new Date(iso);
    const dateStr = d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
    const timeStr = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    return (
      <span className="inline-flex flex-col items-start leading-tight tabular-nums">
        <span className="text-xs text-gray-900 dark:text-gray-100">{dateStr}</span>
        <span className="text-[10px] text-gray-500 dark:text-gray-400">{timeStr}</span>
      </span>
    );
  } catch {
    return <span>—</span>;
  }
}

function CellClamp({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span className="line-clamp-2 min-w-0 break-words text-xs leading-snug text-gray-800 dark:text-gray-200" title={title}>
      {children}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Крайние границы простоя по всем интервалам (для таблицы журнала). */
function incidentDowntimeBounds(inc: Incident): { start: string | null; end: string | null } {
  if (inc.emptyTime || !inc.intervals?.length) {
    return { start: null, end: null };
  }
  let minStart: number | null = null;
  let maxEnd: number | null = null;
  for (const iv of inc.intervals) {
    if (iv.dateFrom) {
      const t = new Date(iv.dateFrom).getTime();
      if (Number.isFinite(t) && (minStart === null || t < minStart)) minStart = t;
    }
    if (iv.dateTo) {
      const t = new Date(iv.dateTo).getTime();
      if (Number.isFinite(t) && (maxEnd === null || t > maxEnd)) maxEnd = t;
    }
  }
  return {
    start: minStart !== null ? new Date(minStart).toISOString() : null,
    end: maxEnd !== null ? new Date(maxEnd).toISOString() : null,
  };
}

type IncidentFilters = {
  dicJobId: string;
  failureTypeId: string;
  locationId: string;
  isId: string;
  fixed: string;
  emptyTime: string;
  dateFrom: string;
  dateTo: string;
};

function buildIncidentListQuery(f: IncidentFilters): string {
  const params = new URLSearchParams();
  if (f.dicJobId) params.set("dicJobId", f.dicJobId);
  if (f.failureTypeId) params.set("failureTypeId", f.failureTypeId);
  if (f.locationId) params.set("locationId", f.locationId);
  if (f.isId) params.set("isIds", f.isId);
  if (f.fixed !== "") params.set("fixed", f.fixed);
  if (f.emptyTime !== "") params.set("emptyTime", f.emptyTime);
  if (f.dateFrom) params.set("dateFrom", new Date(f.dateFrom).toISOString());
  if (f.dateTo) {
    const d = new Date(f.dateTo);
    d.setHours(23, 59, 59, 999);
    params.set("dateTo", d.toISOString());
  }
  return params.toString();
}

const emptyIncidentFilters = (): IncidentFilters => ({
  dicJobId: "",
  failureTypeId: "",
  locationId: "",
  isId: "",
  fixed: "",
  emptyTime: "",
  dateFrom: "",
  dateTo: "",
});

export default function IncidentsEventsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [types, setTypes] = useState<FailureType[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [infoSystems, setInfoSystems] = useState<InfoSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const [filters, setFilters] = useState<IncidentFilters>(emptyIncidentFilters);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("");
  const [incidentYears, setIncidentYears] = useState<number[]>([]);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [modalFiles, setModalFiles] = useState<IncidentFileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("authUser") : null;
      if (!raw) return;
      setCurrentUser(JSON.parse(raw) as AuthUser);
    } catch {}
  }, []);

  const loadDicts = async () => {
    try {
      const [tRes, jRes, lRes, isRes] = await Promise.all([
        apiFetch("dic-failure-types"),
        apiFetch("job-types"),
        apiFetch("locations"),
        apiFetch("information-systems"),
      ]);
      if (tRes.ok) setTypes(await tRes.json());
      if (jRes.ok) setJobTypes(await jRes.json());
      if (lRes.ok) setLocations(await lRes.json());
      if (isRes.ok) setInfoSystems(await isRes.json());
    } catch {}
  };

  const runFetch = useCallback(async (f: IncidentFilters) => {
    setLoading(true);
    setError(null);
    try {
      const q = buildIncidentListQuery(f);
      const res = await apiFetch(`incidents${q ? "?" + q : ""}`);
      if (!res.ok) throw new Error("Не удалось загрузить инциденты");
      setIncidents(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadIncidents = useCallback(() => {
    void runFetch(filters);
  }, [filters, runFetch]);

  useEffect(() => {
    loadDicts();
    void runFetch(emptyIncidentFilters());
  }, [runFetch]);

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
      setFilters((prev) => {
        const next: IncidentFilters = {
          ...prev,
          dateFrom: r?.from ?? "",
          dateTo: r?.to ?? "",
        };
        queueMicrotask(() => void runFetch(next));
        return next;
      });
    },
    [runFetch]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadIncidents();
  };

  const handleResetFilters = () => {
    setSelectedYear("");
    setSelectedQuarter("");
    const cleared = emptyIncidentFilters();
    setFilters(cleared);
    void runFetch(cleared);
  };

  const openModal = async (inc: Incident) => {
    setSelectedIncident(inc);
    setModalFiles([]);
    if (inc.fileCount > 0) {
      setLoadingFiles(true);
      try {
        const res = await apiFetch(`incident-files/${inc.id}`);
        if (res.ok) setModalFiles(await res.json());
      } catch {}
      finally { setLoadingFiles(false); }
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
    return `${Math.round(bytes / 1024 / 1024 * 10) / 10} МБ`;
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить инцидент?")) return;
    setDeleting(id);
    try {
      const res = await apiFetch(`incidents/${id}`, { method: "DELETE" });
      if (!res.ok) { alert("Ошибка при удалении"); return; }
      setIncidents((prev) => prev.filter((i) => i.id !== id));
      if (selectedIncident?.id === id) setSelectedIncident(null);
    } catch {
      alert("Ошибка при удалении");
    } finally {
      setDeleting(null);
    }
  };

  const inputCls = "block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500";
  const labelCls = "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1";
  const radioCls =
    "h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-gray-500";
  return (
    <div className="px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Журнал событий</h1>
        </div>
        {isAdminOrSuperAdmin(currentUser) && (
          <Link
            href="/incidents/add"
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            + Добавить событие
          </Link>
        )}
      </div>

      {/* Фильтры */}
      <form
        onSubmit={handleSearch}
        className="mb-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-4"
      >
        <div className="mb-4 space-y-3 border-b border-gray-200 dark:border-gray-700 pb-4">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Год</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2" role="radiogroup" aria-label="Год">
            {incidentYears.map((y) => (
              <label key={y} className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="ev-year"
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
                name="ev-year"
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
                  name="ev-quarter"
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
                name="ev-quarter"
                className={radioCls}
                checked={selectedQuarter === ""}
                onChange={() => applyYearQuarter(selectedYear, "")}
              />
              Не выбрано
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className={labelCls}>Тип работы</label>
            <select
              value={filters.dicJobId}
              onChange={(e) => setFilters({ ...filters, dicJobId: e.target.value })}
              className={inputCls}
            >
              <option value="">Все</option>
              {jobTypes.map((j) => (
                <option key={j.id} value={j.id}>{j.nameRu || `ID ${j.id}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Тип инцидента</label>
            <select
              value={filters.failureTypeId}
              onChange={(e) => setFilters({ ...filters, failureTypeId: e.target.value })}
              className={inputCls}
            >
              <option value="">Все типы</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.nameRu || `ID ${t.id}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Местоположение</label>
            <select
              value={filters.locationId}
              onChange={(e) => setFilters({ ...filters, locationId: e.target.value })}
              className={inputCls}
            >
              <option value="">Все</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.nameRu || `ID ${l.id}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Информационная система</label>
            <select
              value={filters.isId}
              onChange={(e) => setFilters({ ...filters, isId: e.target.value })}
              className={inputCls}
            >
              <option value="">Все</option>
              {infoSystems.map((s) => (
                <option key={s.id} value={s.id}>{s.nameRu || `ID ${s.id}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Зафиксирован</label>
            <select
              value={filters.fixed}
              onChange={(e) => setFilters({ ...filters, fixed: e.target.value })}
              className={inputCls}
            >
              <option value="">Все</option>
              <option value="true">Да</option>
              <option value="false">Нет</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Без времени</label>
            <select
              value={filters.emptyTime}
              onChange={(e) => setFilters({ ...filters, emptyTime: e.target.value })}
              className={inputCls}
            >
              <option value="">Все</option>
              <option value="true">Да</option>
              <option value="false">Нет</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Дата с</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => {
                setSelectedYear("");
                setSelectedQuarter("");
                setFilters({ ...filters, dateFrom: e.target.value });
              }}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Дата по</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => {
                setSelectedYear("");
                setSelectedQuarter("");
                setFilters({ ...filters, dateTo: e.target.value });
              }}
              className={inputCls}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <IconSearch className="h-4 w-4 shrink-0" />
            Поиск
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <IconResetFilters className="h-4 w-4 shrink-0" />
            Сбросить
          </button>
          {!loading && (
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
              Найдено: {incidents.length}
            </span>
          )}
        </div>
      </form>

      {/* Таблица */}
      {loading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Загрузка...</p>
      )}
      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="max-w-full rounded-xl border border-gray-200/90 bg-white shadow-sm ring-1 ring-black/5 dark:border-gray-700/80 dark:bg-gray-900/40 dark:ring-white/5">
          <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-0 table-fixed border-collapse text-left">
            <colgroup>
              <col style={{ width: "8.5%" }} />
              <col style={{ width: "8.5%" }} />
              <col style={{ width: "7.5%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "4.5%" }} />
              <col style={{ width: "7%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100/90 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900/90">
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  Дата начала
                </th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  Дата окончания
                </th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  Простой
                </th>
                <th
                  className="px-1 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300"
                  title="Зафиксирован"
                >
                  Зафикс.
                </th>
                <th
                  className="px-1 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300"
                  title="Без времени простоя"
                >
                  Без вр.
                </th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  Тип инцидента
                </th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  ИС МТЗСН
                </th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  Тип работы
                </th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  Исх. письмо
                </th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  Вх. письмо
                </th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  Акт
                </th>
                <th className="px-1 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  Файл
                </th>
                <th
                  className="px-1 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300"
                  title="Действия"
                >
                  Дейст.
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800/80 dark:bg-gray-950/20">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    Инциденты не найдены
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => {
                  const bounds = incidentDowntimeBounds(inc);
                  return (
                  <tr
                    key={inc.id}
                    className="cursor-pointer transition-colors odd:bg-gray-50/40 hover:bg-sky-50/60 dark:odd:bg-gray-900/30 dark:hover:bg-sky-950/25"
                    onClick={() => openModal(inc)}
                  >
                    <td className="min-w-0 px-2 py-2 align-top">
                      {inc.emptyTime ? (
                        <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                      ) : (
                        <JournalDateCell iso={bounds.start} />
                      )}
                    </td>
                    <td className="min-w-0 px-2 py-2 align-top">
                      {inc.emptyTime ? (
                        <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                      ) : (
                        <JournalDateCell iso={bounds.end} />
                      )}
                    </td>
                    <td className="min-w-0 px-2 py-2 align-top">
                      {inc.emptyTime ? (
                        <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                      ) : (
                        <span
                          className="text-xs tabular-nums text-gray-700 dark:text-gray-300"
                          title={formatDurationLegacy(inc.totalDiffMinutes)}
                        >
                          {formatDurationCompact(inc.totalDiffMinutes)}
                        </span>
                      )}
                    </td>
                    <td className="min-w-0 px-1 py-2 text-center align-middle text-xs text-gray-800 dark:text-gray-200">
                      {inc.fixed ? "Да" : "Нет"}
                    </td>
                    <td className="min-w-0 px-1 py-2 text-center align-middle text-xs text-gray-800 dark:text-gray-200">
                      {inc.emptyTime ? "Да" : "Нет"}
                    </td>
                    <td className="min-w-0 px-2 py-2 align-top">
                      <CellClamp title={inc.failureTypeNameRu ?? undefined}>
                        {inc.failureTypeNameRu || "—"}
                      </CellClamp>
                    </td>
                    <td className="min-w-0 px-2 py-2 align-top">
                      <CellClamp title={inc.isNamesRu.length ? inc.isNamesRu.join(", ") : undefined}>
                        {inc.isNamesRu.length > 0 ? inc.isNamesRu.join(", ") : "—"}
                      </CellClamp>
                    </td>
                    <td className="min-w-0 px-2 py-2 align-top">
                      <CellClamp title={inc.dicJobNameRu ?? undefined}>{inc.dicJobNameRu || "—"}</CellClamp>
                    </td>
                    <td className="min-w-0 px-2 py-2 align-top">
                      <CellClamp title={inc.outMessage ?? undefined}>{inc.outMessage || "—"}</CellClamp>
                    </td>
                    <td className="min-w-0 px-2 py-2 align-top">
                      <CellClamp title={inc.inMessage ?? undefined}>{inc.inMessage || "—"}</CellClamp>
                    </td>
                    <td className="min-w-0 px-2 py-2 align-top">
                      <CellClamp title={inc.act ?? undefined}>{inc.act || "—"}</CellClamp>
                    </td>
                    <td
                      className="min-w-0 px-1 py-2 text-center align-middle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {inc.fileCount > 0 ? (
                        <span
                          className="inline-flex rounded-md bg-sky-100 p-1 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                          title={`Вложений: ${inc.fileCount}`}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td
                      className="min-w-0 px-1 py-1.5 align-middle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-wrap items-center justify-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => openModal(inc)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-800 text-white shadow-sm hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500"
                          title="Просмотр"
                          aria-label="Просмотр"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </button>
                        {isAdminOrSuperAdmin(currentUser) && (
                          <>
                            <Link
                              href={`/incidents/add?id=${inc.id}`}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                              title="Редактировать"
                              aria-label="Редактировать"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(inc.id)}
                              disabled={deleting === inc.id}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-40 dark:border-red-900/50 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-950/40"
                              title="Удалить"
                              aria-label="Удалить"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Модальное окно деталей */}
      {selectedIncident && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedIncident(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Инцидент #{selectedIncident.id}
              </h2>
              <div className="flex items-center gap-3">
                {isAdminOrSuperAdmin(currentUser) && (
                  <Link
                    href={`/incidents/add?id=${selectedIncident.id}`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Редактировать
                  </Link>
                )}
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <DetailRow label="Тип работы" value={selectedIncident.dicJobNameRu} />
                <DetailRow label="Тип инцидента" value={selectedIncident.failureTypeNameRu} />
                <DetailRow label="Местоположение" value={selectedIncident.locationNameRu} />
                <DetailRow label="Дата создания" value={formatDate(selectedIncident.createdAt)} />
                <DetailRow label="Акт" value={selectedIncident.act} />
                <DetailRow
                  label="Зафиксирован"
                  value={selectedIncident.fixed === true ? "Да" : selectedIncident.fixed === false ? "Нет" : "—"}
                />
                <DetailRow
                  label="Без времени"
                  value={selectedIncident.emptyTime === true ? "Да" : selectedIncident.emptyTime === false ? "Нет" : "—"}
                />
                <DetailRow
                  label="Учит. доступность"
                  value={selectedIncident.includeAvailability === true ? "Да" : "Нет"}
                />
                <DetailRow
                  label="Общий простой"
                  value={selectedIncident.emptyTime ? "без времени" : formatDuration(selectedIncident.totalDiffMinutes)}
                />
              </div>

              {selectedIncident.isNamesRu.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">ИС</p>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedIncident.isNamesRu.join(", ")}</p>
                </div>
              )}

              {selectedIncident.problem && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Описание проблемы</p>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{selectedIncident.problem}</p>
                </div>
              )}
              {selectedIncident.solution && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Меры по устранению</p>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{selectedIncident.solution}</p>
                </div>
              )}
              {selectedIncident.inMessage && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Входящее письмо</p>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedIncident.inMessage}</p>
                </div>
              )}
              {selectedIncident.outMessage && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Исходящее письмо</p>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedIncident.outMessage}</p>
                </div>
              )}

              {selectedIncident.intervals.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Интервалы простоя</p>
                  <div className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-400">Начало</th>
                          <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-400">Конец</th>
                          <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-400">Длительность</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {selectedIncident.intervals.map((iv) => (
                          <tr key={iv.id}>
                            <td className="px-3 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                              {formatDate(iv.dateFrom)}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                              {formatDate(iv.dateTo)}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                              {formatDuration(iv.diffMinutes ?? 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {/* Файлы */}
              {(loadingFiles || modalFiles.length > 0 || (selectedIncident.fileCount ?? 0) > 0) && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Прикреплённые файлы
                  </p>
                  {loadingFiles ? (
                    <p className="text-sm text-gray-400">Загрузка файлов...</p>
                  ) : (
                    <ul className="space-y-1">
                      {modalFiles.map((f) => (
                        <li key={f.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                          <div className="flex items-center gap-2 min-w-0">
                            <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span className="text-sm text-gray-900 dark:text-white truncate">{f.fileName}</span>
                            {f.fileSize && (
                              <span className="text-xs text-gray-400 shrink-0">{formatFileSize(f.fileSize)}</span>
                            )}
                          </div>
                          <a
                            href={apiUrl(`incident-files/download/${f.id}`)}
                            download={f.fileName}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                            title="Скачать"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-900 dark:text-white">{value || "—"}</p>
    </div>
  );
}
