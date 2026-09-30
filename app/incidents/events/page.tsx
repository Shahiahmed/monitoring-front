"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, apiUrl } from "../../lib/api";
import { datesFromYearQuarter } from "../../lib/incidentPeriodFilters";
import * as XLSX from "xlsx";
import { useLanguage } from "../../components/LanguageProvider";

/* ─── Types ─── */
type ViewMode = "works" | "incident" | "prtg";

interface FailureType  { id: number; nameRu: string | null; }
interface JobType      { id: number; nameRu: string | null; }
interface InfoSystem   { id: number; nameRu: string | null; }
interface EvInterval { id: number; dateFrom: string | null; dateTo: string | null; diffMinutes: number | null; }
interface EvFile     { id: number; fileName: string; contentType: string | null; fileSize: number | null; }

interface WorkRow {
  id: number; dicJobId: number | null; dicJobNameRu: string | null;
  isIds: number[]; isNamesRu: string[];
  emptyTime: boolean | null; includeAvailability: boolean | null;
  inMessage: string | null; outMessage: string | null; solution: string | null;
  sourcePrtgId: number | null; createdAt: string | null;
  intervals: EvInterval[]; totalDiffMinutes: number; fileCount: number;
}
interface IncidentRow {
  id: number;
  failureTypeId: number | null; failureTypeNameRu: string | null;
  isIds: number[]; isNamesRu: string[];
  fixed: boolean | null; emptyTime: boolean | null; includeAvailability: boolean | null;
  inMessage: string | null; outMessage: string | null;
  act: string | null; problem: string | null; solution: string | null;
  sourcePrtgId: number | null; createdAt: string | null;
  intervals: EvInterval[]; totalDiffMinutes: number; fileCount: number;
}
interface PrtgRow {
  id: number; prtgStatus: string | null;
  inMessage: string | null; solution: string | null; createdAt: string | null;
  intervals: EvInterval[]; totalDiffMinutes: number; fileCount: number;
}

type AnyRow = WorkRow | IncidentRow | PrtgRow;

interface AuthUser { roles?: string[]; }

interface Filters {
  dicJobId: string; failureTypeId: string;
  isId: string; fixed: string; dateFrom: string; dateTo: string;
  prtgStatus: string;
}

const MODE_ADD_HREF: Record<ViewMode, string> = {
  works:    "/incidents/add/works",
  incident: "/incidents/add/incident",
  prtg:     "/incidents/add/prtg",
};

function apiEndpoint(mode: ViewMode) {
  if (mode === "prtg") return "prtg-alerts";
  if (mode === "incident") return "incidents";
  return "works";
}
function fileEndpoint(mode: ViewMode) {
  if (mode === "prtg") return "prtg-alert-files";
  if (mode === "incident") return "incident-files";
  return "work-files";
}

/* ─── Helpers ─── */
function isAdminOrSuperAdmin(u: AuthUser | null) {
  const r = u?.roles ?? [];
  return r.includes("SUPER_ADMIN") || r.includes("ADMIN");
}
function formatDuration(minutes: number, min = "мин", h = "ч"): string {
  if (minutes <= 0) return "—";
  const hh = Math.floor(minutes / 60), mm = minutes % 60;
  if (hh === 0) return `${mm} ${min}`;
  if (mm === 0) return `${hh} ${h}`;
  return `${hh} ${h} ${mm} ${min}`;
}
function formatDurationLegacy(minutes: number, d = "дн", h = "ч", min = "мин"): string {
  if (minutes <= 0) return "—";
  const dd = Math.floor(minutes / 1440), rem = minutes % 1440;
  return `${dd} ${d}, ${Math.floor(rem / 60)} ${h}, ${rem % 60} ${min}`;
}
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}
function downtimeBounds(intervals: EvInterval[], emptyTime: boolean | null) {
  if (emptyTime || !intervals?.length) return { start: null, end: null };
  let minStart: number | null = null, maxEnd: number | null = null;
  for (const iv of intervals) {
    if (iv.dateFrom) { const t = new Date(iv.dateFrom).getTime(); if (Number.isFinite(t) && (minStart === null || t < minStart)) minStart = t; }
    if (iv.dateTo)   { const t = new Date(iv.dateTo).getTime();   if (Number.isFinite(t) && (maxEnd   === null || t > maxEnd))   maxEnd   = t; }
  }
  return { start: minStart !== null ? new Date(minStart).toISOString() : null, end: maxEnd !== null ? new Date(maxEnd).toISOString() : null };
}
function buildQuery(mode: ViewMode, filters: Filters): string {
  const p = new URLSearchParams();
  if (mode === "works") {
    if (filters.dicJobId) p.set("dicJobId", filters.dicJobId);
    if (filters.isId)     p.set("isIds", filters.isId);
  } else if (mode === "incident") {
    if (filters.failureTypeId) p.set("failureTypeId", filters.failureTypeId);
    if (filters.isId)          p.set("isIds", filters.isId);
    if (filters.fixed !== "")  p.set("fixed", filters.fixed);
  } else if (mode === "prtg") {
    if (filters.prtgStatus) p.set("prtgStatus", filters.prtgStatus);
  }
  if (filters.dateFrom) p.set("dateFrom", new Date(filters.dateFrom).toISOString());
  if (filters.dateTo)   { const d = new Date(filters.dateTo); d.setHours(23, 59, 59, 999); p.set("dateTo", d.toISOString()); }
  return p.toString();
}
const emptyFilters = (): Filters => ({ dicJobId: "", failureTypeId: "", isId: "", fixed: "", dateFrom: "", dateTo: "", prtgStatus: "" });
function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} КБ`;
  return `${Math.round(bytes / 1048576 * 10) / 10} МБ`;
}
function pluralRu(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
}
function getEditHref(mode: ViewMode, id: number): string {
  return `/incidents/add/${mode}?id=${id}`;
}
function getSortValue(row: AnyRow, key: string): string | number {
  switch (key) {
    case "jobType":     return (row as WorkRow).dicJobNameRu ?? "";
    case "failureType": return (row as IncidentRow).failureTypeNameRu ?? "";
    case "prtgStatus":  return (row as PrtgRow).prtgStatus ?? "";
    case "fixed":       return (row as IncidentRow).fixed ? 1 : 0;
    case "downtime":    return (row as WorkRow | IncidentRow | PrtgRow).totalDiffMinutes;
    case "start": {
      const et = (row as WorkRow).emptyTime ?? (row as IncidentRow).emptyTime ?? null;
      const { start } = downtimeBounds(row.intervals, et);
      return start ? new Date(start).getTime() : 0;
    }
    case "end": {
      const et = (row as WorkRow).emptyTime ?? (row as IncidentRow).emptyTime ?? null;
      const { end } = downtimeBounds(row.intervals, et);
      return end ? new Date(end).getTime() : 0;
    }
    default: return 0;
  }
}

/* ─── Excel Export ─── */
function exportToExcel(mode: ViewMode, rows: AnyRow[], modeLabel: string, t: (k: string) => string) {
  const tE = (k: string) => t(`events.${k}`);
  const f = (k: string) => t(`form.${k}`);
  let headers: string[];
  let dataRows: (string | number)[][];
  const yes = t("common.yes"), no = t("common.no");

  if (mode === "works") {
    headers = ["№", tE("workType"), tE("isSystem"), tE("start"), tE("end"), tE("downtime"), tE("letterNo"), tE("note")];
    dataRows = rows.map((row, i) => {
      const w = row as WorkRow;
      const b = downtimeBounds(w.intervals, w.emptyTime);
      return [
        i + 1,
        w.dicJobNameRu ?? "—",
        w.isNamesRu?.join(", ") || "—",
        w.emptyTime ? "—" : (b.start ? formatDate(b.start) : "—"),
        w.emptyTime ? "—" : (b.end   ? formatDate(b.end)   : "—"),
        w.emptyTime ? "—" : formatDuration(w.totalDiffMinutes, tE("minutes"), tE("hours")),
        w.inMessage ?? "—",
        w.solution  ?? "—",
      ];
    });
  } else if (mode === "incident") {
    headers = ["№", tE("incidentType"), tE("isSystem"), tE("start"), tE("end"), tE("downtime"), tE("sitCenter"), tE("act"), f("letterIn"), f("letterOut"), tE("note")];
    dataRows = rows.map((row, i) => {
      const inc = row as IncidentRow;
      const b = downtimeBounds(inc.intervals, inc.emptyTime);
      return [
        i + 1,
        inc.failureTypeNameRu ?? "—",
        inc.isNamesRu?.join(", ") || "—",
        inc.emptyTime ? "—" : (b.start ? formatDate(b.start) : "—"),
        inc.emptyTime ? "—" : (b.end   ? formatDate(b.end)   : "—"),
        inc.emptyTime ? "—" : formatDuration(inc.totalDiffMinutes, tE("minutes"), tE("hours")),
        inc.fixed === true ? yes : inc.fixed === false ? no : "—",
        inc.act      ?? "—",
        inc.inMessage  ?? "—",
        inc.outMessage ?? "—",
        inc.solution ?? "—",
      ];
    });
  } else {
    headers = ["№", tE("start"), tE("end"), tE("downtime"), tE("prtgStatus"), tE("letterNo"), tE("note")];
    dataRows = rows.map((row, i) => {
      const p = row as PrtgRow;
      const b = downtimeBounds(p.intervals, null);
      return [
        i + 1,
        b.start ? formatDate(b.start) : "—",
        b.end   ? formatDate(b.end)   : "—",
        formatDuration(p.totalDiffMinutes, tE("minutes"), tE("hours")),
        p.prtgStatus ?? "—",
        p.inMessage  ?? "—",
        p.solution   ?? "—",
      ];
    });
  }

  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  ws["!cols"] = headers.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, modeLabel);
  XLSX.writeFile(wb, `Журнал_${modeLabel.replace(/\s/g, "_")}_${new Date().toLocaleDateString("ru-RU").replace(/\./g, "-")}.xlsx`);
}

/* ─── Sub-components ─── */
function DateCell({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-gray-300 dark:text-gray-600">—</span>;
  try {
    const d = new Date(iso);
    return (
      <span className="inline-flex flex-col tabular-nums leading-none gap-0.5">
        <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">
          {d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })}
        </span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          {d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </span>
    );
  } catch { return <span>—</span>; }
}

function BoolBadge({ value, yesLabel = "Да", noLabel = "Нет" }: { value: boolean | null; yesLabel?: string; noLabel?: string }) {
  if (value === null) return <span className="text-gray-300 dark:text-gray-600 text-[11px]">—</span>;
  return value
    ? <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">{yesLabel}</span>
    : <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-400 dark:bg-slate-800 dark:text-slate-500">{noLabel}</span>;
}

function WorksTypeBadge({ name, notSpecified, planned, unplanned }: { name: string | null; notSpecified: string; planned: string; unplanned: string }) {
  if (!name) return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 bg-gray-50 text-gray-500 ring-gray-200/80 dark:bg-gray-500/10 dark:text-gray-400 dark:ring-gray-500/20">
      {notSpecified}
    </span>
  );
  const isPlan = name.includes("Плановые");
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
      isPlan
        ? "bg-blue-50 text-blue-700 ring-blue-200/80 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20"
        : "bg-violet-50 text-violet-700 ring-violet-200/80 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20"
    }`}>
      {isPlan ? planned : unplanned}
    </span>
  );
}

function SortTh({ label, sortKey: key, currentKey, dir, onSort }: {
  label: string; sortKey: string;
  currentKey: string; dir: "asc" | "desc";
  onSort: (key: string) => void;
}) {
  const active = currentKey === key;
  return (
    <th className="text-left cursor-pointer select-none group/th" onClick={() => onSort(key)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-[10px] transition-opacity ${active ? "opacity-80 text-blue-500" : "opacity-0 group-hover/th:opacity-30"}`}>
          {active && dir === "desc" ? "▼" : "▲"}
        </span>
      </span>
    </th>
  );
}

const selectCls = "block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-500";

/* ─── Main Page ─── */
function IncidentsEventsPageContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const initialMode = (searchParams.get("mode") as ViewMode | null);
  const validModes: ViewMode[] = ["works", "incident", "prtg"];

  const modeConfig = useMemo((): Record<ViewMode, { label: string; addHref: string }> => ({
    works:    { label: t("events.works"),    addHref: MODE_ADD_HREF.works    },
    incident: { label: t("events.incidents"), addHref: MODE_ADD_HREF.incident },
    prtg:     { label: t("events.prtg"),     addHref: MODE_ADD_HREF.prtg     },
  }), [t]);

  const min = t("events.minutes"), h = t("events.hours"), d = t("events.days");
  const fmtDur = (mins: number) => formatDuration(mins, min, h);
  const fmtDurLegacy = (mins: number) => formatDurationLegacy(mins, d, h, min);

  const [rows,            setRows]            = useState<AnyRow[]>([]);
  const [types,           setTypes]           = useState<FailureType[]>([]);
  const [jobTypes,        setJobTypes]        = useState<JobType[]>([]);
  const [infoSystems,     setInfoSystems]     = useState<InfoSystem[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [currentUser,     setCurrentUser]     = useState<AuthUser | null>(null);
  const [activeMode,      setActiveMode]      = useState<ViewMode>(initialMode && validModes.includes(initialMode) ? initialMode : "works");
  const currentYear = String(new Date().getFullYear());
  const defaultYearFilters = (): Filters => {
    const r = datesFromYearQuarter(currentYear, "");
    return { ...emptyFilters(), dateFrom: r?.from ?? "", dateTo: r?.to ?? "" };
  };
  const [filters,         setFilters]         = useState<Filters>(defaultYearFilters());
  const [selectedYear,    setSelectedYear]    = useState(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState("");
  const [eventYears,      setEventYears]      = useState<number[]>([]);
  const [selectedRow,     setSelectedRow]     = useState<AnyRow | null>(null);
  const [modalFiles,      setModalFiles]      = useState<EvFile[]>([]);
  const [loadingFiles,    setLoadingFiles]    = useState(false);
  const [deleting,        setDeleting]        = useState<number | null>(null);
  const [sortKey,         setSortKey]         = useState<string>("");
  const [sortDir,         setSortDir]         = useState<"asc" | "desc">("asc");

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("authUser") : null;
      if (raw) setCurrentUser(JSON.parse(raw) as AuthUser);
    } catch {}
  }, []);

  const runFetch = useCallback(async (mode: ViewMode, f: Filters) => {
    setLoading(true); setError(null);
    try {
      const q = buildQuery(mode, f);
      const res = await apiFetch(`${apiEndpoint(mode)}${q ? "?" + q : ""}`);
      if (!res.ok) throw new Error(t("events.noData"));
      setRows(await res.json());
    } catch (e: unknown) { setError(e instanceof Error ? e.message : t("common.error")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [tR, jR, iR] = await Promise.all([
          apiFetch("dic-failure-types"), apiFetch("job-types"), apiFetch("information-systems"),
        ]);
        if (tR.ok) setTypes(await tR.json());
        if (iR.ok) setInfoSystems(await iR.json());
        if (jR.ok) setJobTypes(await jR.json());
      } catch {}
      void runFetch(activeMode, defaultYearFilters());
    })();
  }, [runFetch]);

  /* load years for active mode */
  useEffect(() => {
    const endpoint = activeMode === "incident" ? "incidents/years"
                   : activeMode === "works"    ? "works/years"
                   : "prtg-alerts/years";
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(endpoint);
        if (!res.ok || cancelled) return;
        const data: unknown = await res.json();
        if (cancelled || !Array.isArray(data)) return;
        setEventYears(data.map((y) => Number(y)).filter((y) => Number.isFinite(y)));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [activeMode]);

  const applyYearQuarter = useCallback((year: string, quarter: string) => {
    setSelectedYear(year); setSelectedQuarter(quarter);
    const r = datesFromYearQuarter(year, quarter);
    setFilters((prev) => {
      const next: Filters = { ...prev, dateFrom: r?.from ?? "", dateTo: r?.to ?? "" };
      queueMicrotask(() => void runFetch(activeMode, next));
      return next;
    });
  }, [runFetch, activeMode]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); void runFetch(activeMode, filters); };
  const handleReset = () => {
    setSelectedQuarter("");
    setSelectedYear(currentYear);
    const c = defaultYearFilters(); setFilters(c); void runFetch(activeMode, c);
  };

  const switchMode = (mode: ViewMode) => {
    setActiveMode(mode);
    setSelectedQuarter(""); setEventYears([]);
    setSelectedYear(currentYear);
    setSortKey(""); setSortDir("asc");
    const c = defaultYearFilters(); setFilters(c);
    void runFetch(mode, c);
  };

  const openModal = async (row: AnyRow) => {
    setSelectedRow(row); setModalFiles([]);
    if (row.fileCount > 0) {
      setLoadingFiles(true);
      try { const r = await apiFetch(`${fileEndpoint(activeMode)}/${row.id}`); if (r.ok) setModalFiles(await r.json()); }
      catch {} finally { setLoadingFiles(false); }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("events.deleteConfirm"))) return;
    setDeleting(id);
    try {
      const r = await apiFetch(`${apiEndpoint(activeMode)}/${id}`, { method: "DELETE" });
      if (!r.ok) { alert(t("events.errorDeletion")); return; }
      setRows((p) => p.filter((i) => i.id !== id));
      if (selectedRow?.id === id) setSelectedRow(null);
    } catch { alert(t("events.errorDeletion")); }
    finally { setDeleting(null); }
  };

  const downloadFile = async (fileId: number, fileName: string) => {
    try {
      const res = await apiFetch(`${fileEndpoint(activeMode)}/download/${fileId}`);
      if (!res.ok) { alert(t("common.error")); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { alert(t("common.error")); }
  };

  const previewFile = async (fileId: number, contentType: string | null) => {
    try {
      const res = await apiFetch(`${fileEndpoint(activeMode)}/download/${fileId}`);
      if (!res.ok) { alert(t("common.error")); return; }
      const blob = await res.blob();
      const mime = contentType || blob.type || "application/octet-stream";
      const url = URL.createObjectURL(new Blob([blob], { type: mime }));
      const win = window.open(url, "_blank");
      if (win) setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch { alert(t("common.error")); }
  };

  const isAdmin = isAdminOrSuperAdmin(currentUser);
  const hasActiveFilters = Boolean(Object.values(filters).some(Boolean) || selectedYear || selectedQuarter);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortKey(""); setSortDir("asc"); }
    } else {
      setSortKey(key); setSortDir("asc");
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      if (typeof va === "string" && typeof vb === "string")
        return sortDir === "asc" ? va.localeCompare(vb, "ru") : vb.localeCompare(va, "ru");
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  }, [rows, sortKey, sortDir]);
  const cfg = modeConfig[activeMode];
  const worksJobTypes = useMemo(() => jobTypes.filter(j => j.nameRu && ["Плановые работы","Внеплановые работы"].includes(j.nameRu.trim())), [jobTypes]);

  return (
    <div className="px-6 py-8 flex flex-col gap-5 min-h-0">

      {/* ══ MODE TABS ══ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{t("events.title")}</h1>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            {loading ? t("common.loading2") : rows.length === 0 ? t("events.noData") : pluralRu(rows.length, t("events.recordSingular"), t("events.recordFew"), t("events.recordMany"))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="jrn-mode-tabs flex rounded-xl overflow-hidden p-1 gap-0.5">
            {(["works", "incident", ...(isAdmin ? ["prtg"] : [])] as ViewMode[]).map((m) => (
              <button key={m} type="button" onClick={() => switchMode(m)}
                className={`jrn-mode-tab px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${activeMode === m ? "jrn-mode-tab-on" : ""}`}>
                {modeConfig[m].label}
              </button>
            ))}
          </div>
          {isAdmin && (
            <Link href={cfg.addHref} className="jrn-add-btn inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              {t("events.addBtn")}
            </Link>
          )}
        </div>
      </div>

      {/* ══ FILTER PANEL ══ */}
      <form onSubmit={handleSearch} className="jrn-panel rounded-2xl p-5 flex flex-col gap-4">

        {/* Period chips */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t("common.year")}</span>
            {eventYears.map((y) => (
              <button key={y} type="button" onClick={() => applyYearQuarter(String(y), selectedQuarter)}
                className={`jrn-chip ${selectedYear === String(y) ? "jrn-chip-on" : ""}`}>
                {y}
              </button>
            ))}
            {selectedYear && (
              <button type="button" onClick={() => applyYearQuarter("", selectedQuarter)} className="jrn-chip jrn-chip-reset">{t("common.all")}</button>
            )}
          </div>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t("common.quarter")}</span>
            {[1,2,3,4].map((q) => (
              <button key={q} type="button"
                onClick={() => applyYearQuarter(selectedYear || String(new Date().getFullYear()), String(q))}
                className={`jrn-chip ${selectedQuarter === String(q) ? "jrn-chip-on" : ""}`}>
                Q{q}
              </button>
            ))}
            {selectedQuarter && (
              <button type="button" onClick={() => applyYearQuarter(selectedYear, "")} className="jrn-chip jrn-chip-reset">{t("common.all")}</button>
            )}
          </div>
        </div>

        <div className="h-px bg-slate-100 dark:bg-white/5" />

        {/* Mode-specific filters */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">

          {/* Works filters */}
          {activeMode === "works" && (<>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t("events.filterByType")}</label>
              <select value={filters.dicJobId} onChange={(e) => setFilters({ ...filters, dicJobId: e.target.value })} className={selectCls}>
                <option value="">{t("common.all")}</option>
                {worksJobTypes.map((o) => <option key={o.id} value={o.id}>{o.nameRu}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t("events.filterByIS")}</label>
              <select value={filters.isId} onChange={(e) => setFilters({ ...filters, isId: e.target.value })} className={selectCls}>
                <option value="">{t("common.all")}</option>
                {infoSystems.map((o) => <option key={o.id} value={o.id}>{o.nameRu || `ID ${o.id}`}</option>)}
              </select>
            </div>
          </>)}

          {/* Incident filters */}
          {activeMode === "incident" && (<>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t("events.filterByIncidentType")}</label>
              <select value={filters.failureTypeId} onChange={(e) => setFilters({ ...filters, failureTypeId: e.target.value })} className={selectCls}>
                <option value="">{t("common.all")}</option>
                {types.map((o) => <option key={o.id} value={o.id}>{o.nameRu || `ID ${o.id}`}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t("events.filterByIS")}</label>
              <select value={filters.isId} onChange={(e) => setFilters({ ...filters, isId: e.target.value })} className={selectCls}>
                <option value="">{t("common.all")}</option>
                {infoSystems.map((o) => <option key={o.id} value={o.id}>{o.nameRu || `ID ${o.id}`}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t("events.filterBySitCenter")}</label>
              <select value={filters.fixed} onChange={(e) => setFilters({ ...filters, fixed: e.target.value })} className={selectCls}>
                <option value="">{t("common.all")}</option><option value="true">{t("common.yes")}</option><option value="false">{t("common.no")}</option>
              </select>
            </div>
          </>)}

          {/* PRTG status filter */}
          {activeMode === "prtg" && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t("events.filterByStatus")}</label>
              <select value={filters.prtgStatus} onChange={(e) => setFilters({ ...filters, prtgStatus: e.target.value })} className={selectCls}>
                <option value="">{t("common.all")}</option>
                <option value="Ошибка">{t("events.prtgError")}</option>
                <option value="Неизвестно">{t("events.prtgUnknown")}</option>
                <option value="Ошибка/Неизвестно">{t("events.prtgErrorUnknown")}</option>
              </select>
            </div>
          )}

          {/* Date range — shared */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t("events.filterDateFrom")}</label>
            <input type="date" value={filters.dateFrom}
              onChange={(e) => { setSelectedYear(""); setSelectedQuarter(""); setFilters({ ...filters, dateFrom: e.target.value }); }}
              className={selectCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t("events.filterDateTo")}</label>
            <input type="date" value={filters.dateTo}
              onChange={(e) => { setSelectedYear(""); setSelectedQuarter(""); setFilters({ ...filters, dateTo: e.target.value }); }}
              className={selectCls} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button type="submit" className="jrn-search-btn inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-semibold text-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {t("events.applyBtn")}
          </button>
          {hasActiveFilters && (
            <button type="button" onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-white/5 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {t("events.resetBtn")}
            </button>
          )}
          {rows.length > 0 && !loading && (
            <button type="button" onClick={() => exportToExcel(activeMode, rows, cfg.label, t)}
              className="jrn-export-btn ml-auto inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              {t("events.exportExcel")}
            </button>
          )}
        </div>
      </form>

      {/* ══ ERROR ══ */}
      {error && !loading && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-400">
          <svg className="shrink-0 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* ══ TABLE ══ */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-sm text-slate-400">
          <svg className="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {t("common.loading2")}
        </div>
      ) : !error && (
        <div className="jrn-table-wrap rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse">

              {/* ── WORKS columns ── */}
              {activeMode === "works" && (<>
                <colgroup>
                  <col style={{ width: "10%" }} /><col style={{ width: "22%" }} />
                  <col style={{ width: "10%" }} /><col style={{ width: "10%" }} />
                  <col style={{ width: "9%" }} /><col style={{ width: "20%" }} />
                  <col style={{ width: "4%" }} />
                  {isAdmin && <col style={{ width: "6%" }} />}
                </colgroup>
                <thead>
                  <tr className="jrn-thead-row">
                    <SortTh label={t("events.workType")} sortKey="jobType" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <th className="text-left">{t("events.isSystem")}</th>
                    <SortTh label={t("events.start")} sortKey="start" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label={t("events.end")} sortKey="end" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label={t("events.downtime")} sortKey="downtime" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <th className="text-left">{t("events.letterNo")}</th>
                    <th></th>
                    {isAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? <EmptyRow colSpan={isAdmin ? 8 : 7} hasFilters={hasActiveFilters} noDataLabel={t("events.noData")} filterHintLabel={t("events.filterHint")} /> : sortedRows.map((row, idx) => {
                    const w = row as WorkRow;
                    const b = downtimeBounds(w.intervals, w.emptyTime);
                    return (
                      <tr key={w.id} className={`jrn-row group cursor-pointer ${idx % 2 === 0 ? "jrn-row-a" : "jrn-row-b"}`} onClick={() => openModal(w)}>
                        <td><WorksTypeBadge name={w.dicJobNameRu} notSpecified={t("events.notSpecified")} planned={t("events.planned")} unplanned={t("events.unplanned")} /></td>
                        <td><span className="line-clamp-2 text-[13px] leading-snug text-slate-600 dark:text-slate-300">{w.isNamesRu?.length ? w.isNamesRu.join(", ") : "—"}</span></td>
                        <td>{w.emptyTime ? <span className="text-slate-300 dark:text-slate-600 text-xs">—</span> : <DateCell iso={b.start} />}</td>
                        <td>{w.emptyTime ? <span className="text-slate-300 dark:text-slate-600 text-xs">—</span> : <DateCell iso={b.end} />}</td>
                        <td>{w.emptyTime ? <span className="text-slate-300 dark:text-slate-600 text-[12px]">—</span> : <DurationPill minutes={w.totalDiffMinutes} legacy={fmtDurLegacy(w.totalDiffMinutes)} cMin={t("events.compactMin")} cH={t("events.compactH")} cD={t("events.compactD")} cM={t("events.compactM")} />}</td>
                        <td><span className="line-clamp-2 text-[13px] leading-snug text-slate-600 dark:text-slate-300">{w.inMessage || "—"}</span></td>
                        <td className="text-center" onClick={(e) => e.stopPropagation()}><FilesBadge count={w.fileCount} /></td>
                        {isAdmin && <ActionCell id={w.id} mode={activeMode} deleting={deleting} onDelete={handleDelete} />}
                      </tr>
                    );
                  })}
                </tbody>
              </>)}

              {/* ── INCIDENT columns ── */}
              {activeMode === "incident" && (<>
                <colgroup>
                  <col style={{ width: "11%" }} /><col style={{ width: "14%" }} />
                  <col style={{ width: "10%" }} /><col style={{ width: "10%" }} />
                  <col style={{ width: "9%" }} /><col style={{ width: "9%" }} />
                  <col style={{ width: "7%" }} /><col style={{ width: "17%" }} />
                  <col style={{ width: "4%" }} />
                  {isAdmin && <col style={{ width: "6%" }} />}
                </colgroup>
                <thead>
                  <tr className="jrn-thead-row">
                    <SortTh label={t("events.incidentType")} sortKey="failureType" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <th className="text-left">{t("events.isSystem")}</th>
                    <SortTh label={t("events.start")} sortKey="start" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label={t("events.end")} sortKey="end" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label={t("events.downtime")} sortKey="downtime" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label={t("events.fixedNit")} sortKey="fixed" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <th className="text-left">{t("events.act")}</th>
                    <th className="text-left">{t("events.note")}</th>
                    <th></th>
                    {isAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? <EmptyRow colSpan={isAdmin ? 10 : 9} hasFilters={hasActiveFilters} noDataLabel={t("events.noData")} filterHintLabel={t("events.filterHint")} /> : sortedRows.map((row, idx) => {
                    const inc = row as IncidentRow;
                    const b = downtimeBounds(inc.intervals, inc.emptyTime);
                    return (
                      <tr key={inc.id} className={`jrn-row group cursor-pointer ${idx % 2 === 0 ? "jrn-row-a" : "jrn-row-b"}`} onClick={() => openModal(inc)}>
                        <td><span className="line-clamp-2 text-[13px] leading-snug text-slate-600 dark:text-slate-300">{inc.failureTypeNameRu || "—"}</span></td>
                        <td><span className="line-clamp-2 text-[13px] leading-snug text-slate-600 dark:text-slate-300">{inc.isNamesRu?.length ? inc.isNamesRu.join(", ") : "—"}</span></td>
                        <td>{inc.emptyTime ? <span className="text-slate-300 dark:text-slate-600 text-xs">—</span> : <DateCell iso={b.start} />}</td>
                        <td>{inc.emptyTime ? <span className="text-slate-300 dark:text-slate-600 text-xs">—</span> : <DateCell iso={b.end} />}</td>
                        <td>{inc.emptyTime ? <span className="text-slate-300 dark:text-slate-600 text-[12px]">—</span> : <DurationPill minutes={inc.totalDiffMinutes} legacy={fmtDurLegacy(inc.totalDiffMinutes)} cMin={t("events.compactMin")} cH={t("events.compactH")} cD={t("events.compactD")} cM={t("events.compactM")} />}</td>
                        <td className="px-2.5 py-2.5 align-middle text-center"><BoolBadge value={inc.fixed} /></td>
                        <td><span className="line-clamp-1 text-[13px] leading-snug text-slate-600 dark:text-slate-300">{inc.act || "—"}</span></td>
                        <td><span className="line-clamp-2 text-[13px] leading-snug text-slate-600 dark:text-slate-300">{inc.solution || "—"}</span></td>
                        <td className="text-center" onClick={(e) => e.stopPropagation()}><FilesBadge count={inc.fileCount} /></td>
                        {isAdmin && <ActionCell id={inc.id} mode={activeMode} deleting={deleting} onDelete={handleDelete} />}
                      </tr>
                    );
                  })}
                </tbody>
              </>)}

              {/* ── PRTG columns ── */}
              {activeMode === "prtg" && (<>
                <colgroup>
                  <col style={{ width: "9%" }} /><col style={{ width: "9%" }} />
                  <col style={{ width: "8%" }} /><col style={{ width: "9%" }} />
                  <col style={{ width: "14%" }} /><col style={{ width: "20%" }} />
                  <col style={{ width: "4%" }} />
                  {isAdmin && <col style={{ width: "6%" }} />}
                </colgroup>
                <thead>
                  <tr className="jrn-thead-row">
                    <SortTh label={t("events.start")} sortKey="start" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label={t("events.end")} sortKey="end" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label={t("events.downtime")} sortKey="downtime" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortTh label={t("events.prtgStatus")} sortKey="prtgStatus" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <th className="text-left">{t("events.letterNo")}</th>
                    <th className="text-left">{t("events.note")}</th>
                    <th></th>
                    {isAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? <EmptyRow colSpan={isAdmin ? 8 : 7} hasFilters={hasActiveFilters} noDataLabel={t("events.noData")} filterHintLabel={t("events.filterHint")} /> : sortedRows.map((row, idx) => {
                    const p = row as PrtgRow;
                    const b = downtimeBounds(p.intervals, null);
                    return (
                      <tr key={p.id} className={`jrn-row group cursor-pointer ${idx % 2 === 0 ? "jrn-row-a" : "jrn-row-b"}`} onClick={() => openModal(p)}>
                        <td><DateCell iso={b.start} /></td>
                        <td><DateCell iso={b.end} /></td>
                        <td><DurationPill minutes={p.totalDiffMinutes} legacy={fmtDurLegacy(p.totalDiffMinutes)} cMin={t("events.compactMin")} cH={t("events.compactH")} cD={t("events.compactD")} cM={t("events.compactM")} /></td>
                        <td>
                          {p.prtgStatus
                            ? <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${p.prtgStatus === "Ошибка" ? "bg-red-50 text-red-700 ring-red-200/80 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20" : "bg-slate-100 text-slate-600 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"}`}>{p.prtgStatus}</span>
                            : <span className="text-slate-300 dark:text-slate-600 text-[11px]">—</span>}
                        </td>
                        <td><span className="line-clamp-2 text-[13px] leading-snug text-slate-600 dark:text-slate-300">{p.inMessage || "—"}</span></td>
                        <td><span className="line-clamp-2 text-[13px] leading-snug text-slate-600 dark:text-slate-300">{p.solution || "—"}</span></td>
                        <td className="text-center" onClick={(e) => e.stopPropagation()}><FilesBadge count={p.fileCount} /></td>
                        {isAdmin && <ActionCell id={p.id} mode={activeMode} deleting={deleting} onDelete={handleDelete} />}
                      </tr>
                    );
                  })}
                </tbody>
              </>)}

            </table>
          </div>
        </div>
      )}

      {/* ══ MODAL ══ */}
      {selectedRow && (() => {
        const w = activeMode === "works"    ? selectedRow as WorkRow    : null;
        const inc = activeMode === "incident" ? selectedRow as IncidentRow : null;
        const prtg = activeMode === "prtg"   ? selectedRow as PrtgRow    : null;
        const intervals = selectedRow.intervals ?? [];
        const emptyTime = (w?.emptyTime || inc?.emptyTime) ?? false;
        const isNamesRu: string[] = (w?.isNamesRu || inc?.isNamesRu) ?? [];
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 jrn-modal-bg" onClick={() => setSelectedRow(null)}>
          <div className="jrn-modal w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="jrn-modal-hd flex items-center justify-between px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("events.eventNo")}{selectedRow.id}</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">{modeConfig[activeMode].label} · {formatDate(selectedRow.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link href={getEditHref(activeMode, selectedRow.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors shadow-sm">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    {t("common.edit")}
                  </Link>
                )}
                <button onClick={() => setSelectedRow(null)}
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/8 dark:hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

              {/* Works modal */}
              {w && (<>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: t("events.workType"),  value: w.dicJobNameRu },
                    { label: t("events.letterNo"),  value: w.inMessage },
                    { label: t("events.createdAt"), value: formatDate(w.createdAt) },
                  ].map(({ label, value }) => (
                    <div key={label} className="jrn-info-cell rounded-xl px-3.5 py-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">{label}</p>
                      <p className="text-xs font-medium text-slate-900 dark:text-white wrap-break-word leading-relaxed">{value || "—"}</p>
                    </div>
                  ))}
                </div>
                {w.solution && (
                  <div className="jrn-info-cell rounded-xl px-3.5 py-3">
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t("events.note")}</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{w.solution}</p>
                  </div>
                )}
                {w.sourcePrtgId && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 dark:border-amber-800/30 dark:bg-amber-900/10">
                    <svg className="shrink-0 w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                    <span className="text-xs text-amber-700 dark:text-amber-400">{t("events.sourcePrtg")}{w.sourcePrtgId}</span>
                  </div>
                )}
              </>)}

              {/* Incident modal */}
              {inc && (<>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: t("events.incidentType"), value: inc.failureTypeNameRu },
                    { label: t("events.inLetter"),     value: inc.inMessage },
                    { label: t("events.outLetter"),    value: inc.outMessage },
                    { label: t("events.act"),          value: inc.act },
                    { label: t("events.createdAt"),    value: formatDate(inc.createdAt) },
                  ].map(({ label, value }) => (
                    <div key={label} className="jrn-info-cell rounded-xl px-3.5 py-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">{label}</p>
                      <p className="text-xs font-medium text-slate-900 dark:text-white wrap-break-word leading-relaxed">{value || "—"}</p>
                    </div>
                  ))}
                </div>
                {inc.sourcePrtgId && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 dark:border-amber-800/30 dark:bg-amber-900/10">
                    <svg className="shrink-0 w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                    <span className="text-xs text-amber-700 dark:text-amber-400">{t("events.sourcePrtg")}{inc.sourcePrtgId}</span>
                  </div>
                )}
              </>)}

              {/* PRTG modal */}
              {prtg && (<>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: t("events.prtgStatus"), value: prtg.prtgStatus },
                    { label: t("events.letterNo"),   value: prtg.inMessage },
                    { label: t("events.createdAt"),  value: formatDate(prtg.createdAt) },
                  ].map(({ label, value }) => (
                    <div key={label} className="jrn-info-cell rounded-xl px-3.5 py-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">{label}</p>
                      <p className="text-xs font-medium text-slate-900 dark:text-white wrap-break-word leading-relaxed">{value || "—"}</p>
                    </div>
                  ))}
                </div>
                {prtg.solution && (
                  <div className="jrn-info-cell rounded-xl px-3.5 py-3">
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t("events.note")}</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{prtg.solution}</p>
                  </div>
                )}
              </>)}

              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                {!prtg && (
                  <div className="jrn-status-pill flex items-center gap-2 rounded-full px-3 py-1.5">
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{t("events.noDowntime")}</span>
                    <BoolBadge value={emptyTime} yesLabel={t("common.yes")} noLabel={t("common.no")} />
                  </div>
                )}
                {inc && (
                  <div className="jrn-status-pill flex items-center gap-2 rounded-full px-3 py-1.5">
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{t("events.sitCenter")}</span>
                    <BoolBadge value={inc.fixed} yesLabel={t("common.yes")} noLabel={t("common.no")} />
                  </div>
                )}
                {inc && (
                  <div className="jrn-status-pill flex items-center gap-2 rounded-full px-3 py-1.5">
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{t("events.includeAvail")}</span>
                    <BoolBadge value={inc.includeAvailability} yesLabel={t("common.yes")} noLabel={t("common.no")} />
                  </div>
                )}
                {selectedRow.totalDiffMinutes > 0 && (
                  <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1.5 dark:bg-amber-900/15 dark:border-amber-800/30">
                    <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">{t("events.downtimeLabel")}</span>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 tabular-nums">{fmtDur(selectedRow.totalDiffMinutes)}</span>
                  </div>
                )}
              </div>

              {/* IS list */}
              {isNamesRu.length > 0 && (
                <div>
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t("events.isSystem")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {isNamesRu.map((n) => (
                      <span key={n} className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20">{n}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Problem / Solution (incident mode only) */}
              {inc && (inc.problem || inc.solution) && (
                <div className="grid grid-cols-2 gap-2.5">
                  {inc.problem && (
                    <div className="jrn-info-cell rounded-xl px-3.5 py-3">
                      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t("events.problem")}</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{inc.problem}</p>
                    </div>
                  )}
                  {inc.solution && (
                    <div className="jrn-info-cell rounded-xl px-3.5 py-3">
                      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t("events.solution")}</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{inc.solution}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Intervals */}
              {!emptyTime && intervals.length > 0 && (
                <div>
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t("events.downtimeIntervals")}</p>
                  <div className="jrn-subtable rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="jrn-subtable-head">
                          {[t("events.start"), t("events.end"), t("events.duration")].map((h) => (
                            <th key={h} className="px-3.5 py-2 text-left text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {intervals.map((iv) => (
                          <tr key={iv.id} className="hover:bg-slate-50/80 dark:hover:bg-white/3 transition-colors">
                            <td className="px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">{formatDate(iv.dateFrom)}</td>
                            <td className="px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">{formatDate(iv.dateTo)}</td>
                            <td className="px-3.5 py-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20">
                                {formatDuration(iv.diffMinutes ?? 0)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Files */}
              {(loadingFiles || modalFiles.length > 0 || (selectedRow.fileCount ?? 0) > 0) && (
                <div>
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t("events.attachments")}</p>
                  {loadingFiles
                    ? <p className="text-xs text-slate-400 flex items-center gap-2">
                        <svg className="animate-spin w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        {t("common.loading")}
                      </p>
                    : <ul className="space-y-1.5">
                        {modalFiles.map((f) => (
                          <li key={f.id} className="jrn-info-cell flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <svg className="shrink-0 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                              <span className="text-xs text-slate-700 dark:text-slate-200 truncate">{f.fileName}</span>
                              {f.fileSize && <span className="shrink-0 text-[10px] text-slate-400">{formatFileSize(f.fileSize)}</span>}
                            </div>
                            <div className="shrink-0 flex items-center gap-0.5">
                              <button type="button" onClick={(e) => { e.stopPropagation(); previewFile(f.id, f.contentType); }}
                                className="flex items-center justify-center w-6 h-6 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 transition-colors" title={t("common.preview")}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                              </button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); downloadFile(f.id, f.fileName); }}
                                className="flex items-center justify-center w-6 h-6 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors" title={t("common.download")}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                  }
                </div>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      <style jsx global>{`
        /* ── Mode tabs ── */
        .jrn-mode-tabs {
          background: rgba(241,245,249,0.85);
          border: 1px solid rgba(226,232,240,0.8);
        }
        html.dark .jrn-mode-tabs {
          background: rgba(15,23,42,0.6);
          border: 1px solid rgba(255,255,255,0.07);
        }
        .jrn-mode-tab {
          color: #64748b; background: transparent;
        }
        html.dark .jrn-mode-tab { color: #94a3b8; }
        .jrn-mode-tab:hover { color: #1e40af; background: rgba(219,234,254,0.6); }
        html.dark .jrn-mode-tab:hover { color: #60a5fa; background: rgba(59,130,246,0.08); }
        .jrn-mode-tab-on {
          background: #fff !important;
          color: #1e40af !important;
          font-weight: 700 !important;
          box-shadow: 0 1px 4px rgba(0,0,0,0.10), 0 0 0 1px rgba(226,232,240,0.6);
        }
        html.dark .jrn-mode-tab-on {
          background: rgba(30,41,59,0.85) !important;
          color: #93c5fd !important;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.08);
        }

        /* ── Filter panel ── */
        .jrn-panel {
          background: rgba(255,255,255,0.95);
          border: 1px solid rgba(99,140,210,0.25);
          box-shadow: 0 2px 8px rgba(30,64,175,0.07), 0 4px 16px rgba(30,64,175,0.06);
        }
        html.dark .jrn-panel {
          background: rgba(15,23,42,0.6);
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        /* ── Period chips ── */
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

        /* ── Buttons ── */
        .jrn-search-btn {
          background: linear-gradient(135deg,#2563eb 0%,#1e40af 100%);
          box-shadow: 0 2px 8px rgba(37,99,235,0.32);
          transition: box-shadow 0.15s, transform 0.1s;
        }
        .jrn-search-btn:hover { box-shadow: 0 4px 14px rgba(37,99,235,0.48); transform: translateY(-1px); }
        .jrn-add-btn {
          background: linear-gradient(135deg,#2563eb 0%,#1e40af 100%);
          box-shadow: 0 3px 10px rgba(37,99,235,0.30);
          transition: box-shadow 0.15s, transform 0.1s;
        }
        .jrn-add-btn:hover { box-shadow: 0 5px 18px rgba(37,99,235,0.46); transform: translateY(-1px); }
        .jrn-export-btn {
          background: rgba(16,185,129,0.08);
          border: 1.5px solid rgba(16,185,129,0.3);
          color: #059669;
          transition: all 0.15s;
        }
        html.dark .jrn-export-btn {
          background: rgba(16,185,129,0.08);
          border-color: rgba(16,185,129,0.25);
          color: #34d399;
        }
        .jrn-export-btn:hover {
          background: rgba(16,185,129,0.15);
          border-color: rgba(16,185,129,0.5);
          transform: translateY(-1px);
        }

        /* ── Table wrapper ── */
        .jrn-table-wrap {
          background: #fff;
          border: 1px solid #c8d9f0;
          box-shadow: 0 2px 8px rgba(30,64,175,0.07), 0 8px 24px rgba(30,64,175,0.09);
        }
        html.dark .jrn-table-wrap {
          background: rgba(13,21,38,0.95);
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 4px 24px rgba(0,0,0,0.3);
        }
        .jrn-scroll { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
        .jrn-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .jrn-scroll::-webkit-scrollbar-track { background: transparent; }
        .jrn-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
        html.dark .jrn-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); }

        /* ── Table ── */
        .jrn-table { border-collapse: separate; border-spacing: 0; }

        /* ── Sticky header ── */
        .jrn-thead-row th {
          position: sticky; top: 0; z-index: 2;
          background: #e8f0fb;
          border-bottom: 2px solid #c8d9f0;
          padding: 10px 10px;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.07em; text-transform: uppercase;
          color: #4a6fa5; white-space: nowrap;
        }
        html.dark .jrn-thead-row th {
          background: #0d1526;
          border-bottom: 2px solid rgba(255,255,255,0.08);
          color: #64748b;
        }
        .jrn-thead-row th:first-child { padding-left: 16px; }
        .jrn-thead-row th:last-child  { padding-right: 12px; }

        /* ── Rows ── */
        .jrn-row { transition: background 0.08s; cursor: pointer; }
        .jrn-row td { padding: 11px 10px; vertical-align: middle; border-bottom: 1px solid rgba(226,232,240,0.6); }
        .jrn-row td:first-child { padding-left: 16px; }
        .jrn-row td:last-child  { padding-right: 12px; }
        .jrn-row-a td { background: #ffffff; }
        .jrn-row-b td { background: #f4f8fd; }
        .jrn-row:hover td { background: #e8f1fc !important; }
        .jrn-row:last-child td { border-bottom: none; }

        html.dark .jrn-row-a td { background: #0d1526; border-bottom-color: rgba(255,255,255,0.05); }
        html.dark .jrn-row-b td { background: #0f1e35; border-bottom-color: rgba(255,255,255,0.05); }
        html.dark .jrn-row:hover td { background: rgba(59,130,246,0.10) !important; }
        html.dark .jrn-row:last-child td { border-bottom: none; }

        /* ── Modal ── */
        .jrn-modal-bg {
          background: rgba(2,6,23,0.55);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: jrn-bg-in 0.18s ease;
        }
        @keyframes jrn-bg-in { from { opacity: 0; } to { opacity: 1; } }
        .jrn-modal {
          background: #fff;
          box-shadow: 0 32px 80px rgba(0,0,0,0.20), 0 8px 24px rgba(0,0,0,0.10);
          animation: jrn-modal-in 0.28s cubic-bezier(0.16,1,0.3,1);
        }
        html.dark .jrn-modal { background: #0d1526; box-shadow: 0 32px 80px rgba(0,0,0,0.65); }
        @keyframes jrn-modal-in { from { opacity:0; transform:translateY(18px) scale(0.96); } to { opacity:1; transform:none; } }
        .jrn-modal-hd {
          background: rgba(248,250,252,0.7);
          border-bottom: 1px solid rgba(226,232,240,0.85);
        }
        html.dark .jrn-modal-hd {
          background: rgba(8,15,30,0.5);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .jrn-info-cell {
          background: rgba(248,250,252,0.85);
          border: 1px solid rgba(226,232,240,0.75);
        }
        html.dark .jrn-info-cell {
          background: rgba(30,41,59,0.45);
          border: 1px solid rgba(255,255,255,0.07);
        }
        .jrn-status-pill {
          background: #fff;
          border: 1px solid rgba(226,232,240,0.85);
        }
        html.dark .jrn-status-pill {
          background: rgba(30,41,59,0.4);
          border: 1px solid rgba(255,255,255,0.07);
        }
        .jrn-subtable { border: 1px solid rgba(226,232,240,0.75); }
        html.dark .jrn-subtable { border: 1px solid rgba(255,255,255,0.07); }
        .jrn-subtable-head {
          background: rgba(248,250,252,0.9);
          border-bottom: 1px solid rgba(226,232,240,0.75);
        }
        html.dark .jrn-subtable-head {
          background: rgba(8,15,30,0.5);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
      `}</style>
    </div>
  );
}

/* ─── Shared table sub-components ─── */
function DurationPill({ minutes, legacy, cMin = "мин", cH = "ч", cD = "д", cM = "м" }: { minutes: number; legacy: string; cMin?: string; cH?: string; cD?: string; cM?: string }) {
  if (minutes <= 0) return <span className="text-slate-300 dark:text-slate-600 text-[12px]">—</span>;
  const d = Math.floor(minutes / 1440), rem = minutes % 1440;
  const h = Math.floor(rem / 60), m = rem % 60;
  const compact = d === 0 && h === 0 ? `${m} ${cMin}` : d === 0 ? `${h} ${cH} ${m} ${cMin}` : `${d}${cD} ${h}${cH} ${m}${cM}`;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[12px] font-semibold text-amber-700 ring-1 ring-amber-200/80 tabular-nums dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20" title={legacy}>
      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      {compact}
    </span>
  );
}

function FilesBadge({ count }: { count: number }) {
  const { t } = useLanguage();
  if (count === 0) return <span className="text-slate-200 dark:text-slate-700 text-xs">—</span>;
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-blue-50 text-blue-500 ring-1 ring-blue-200/80 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20" title={`${count} ${t("common.fileCount")}`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
    </span>
  );
}

function ActionCell({ id, mode, deleting, onDelete }: { id: number; mode: ViewMode; deleting: number | null; onDelete: (id: number) => void }) {
  const { t } = useLanguage();
  return (
    <td onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <Link href={getEditHref(mode, id)} onClick={(e) => e.stopPropagation()}
          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors" title={t("common.edit")}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        </Link>
        <button type="button" onClick={() => onDelete(id)} disabled={deleting === id}
          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 disabled:opacity-40 transition-colors" title={t("common.delete")}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
    </td>
  );
}

export default function IncidentsEventsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-sm text-slate-400">…</div>}>
      <IncidentsEventsPageContent />
    </Suspense>
  );
}

function EmptyRow({ colSpan, hasFilters, noDataLabel, filterHintLabel }: { colSpan: number; hasFilters: boolean; noDataLabel: string; filterHintLabel: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-20 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
            <svg className="w-7 h-7 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-400 dark:text-slate-500">{noDataLabel}</p>
          {hasFilters && <p className="text-xs text-slate-300 dark:text-slate-600">{filterHintLabel}</p>}
        </div>
      </td>
    </tr>
  );
}
