"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, apiUrl } from "../../lib/api";
import { useLanguage } from "../../components/LanguageProvider";

export type AddIncidentMode = "works" | "incident" | "prtg";

/* ─── API types ─── */
interface FailureType { id: number; nameRu: string | null; }
interface JobType     { id: number; nameRu: string | null; }
interface InfoSystem  { id: number; nameRu: string | null; }
interface PrtgAlertSummary {
  id: number; prtgStatus: string | null; inMessage: string | null;
  solution: string | null;
  createdAt: string | null; intervals: { dateFrom: string | null }[];
}
interface FileRow {
  id: number; fileName: string; contentType: string | null;
  fileSize: number | null; uploadedAt: string | null;
}
interface IntervalRow { id?: number; dateFrom: string; dateTo: string; }

/* ─── Form state ─── */
interface WorkForm {
  dicJobId: string; isIds: number[];
  emptyTime: boolean; includeAvailability: boolean;
  inMessage: string; outMessage: string; solution: string;
  sourcePrtgId: number | null; intervals: IntervalRow[];
}
interface IncidentForm {
  failureTypeId: string; isIds: number[];
  fixed: boolean; emptyTime: boolean; includeAvailability: boolean;
  inMessage: string; outMessage: string; act: string; problem: string; solution: string;
  sourcePrtgId: number | null; intervals: IntervalRow[];
}
interface PrtgForm {
  prtgStatus: string; inMessage: string; solution: string; intervals: IntervalRow[];
}

const emptyWork = (): WorkForm => ({
  dicJobId: "", isIds: [], emptyTime: false, includeAvailability: true,
  inMessage: "", outMessage: "", solution: "", sourcePrtgId: null,
  intervals: [{ dateFrom: "", dateTo: "" }],
});
const emptyIncident = (): IncidentForm => ({
  failureTypeId: "", isIds: [], fixed: false, emptyTime: false, includeAvailability: true,
  inMessage: "", outMessage: "", act: "", problem: "", solution: "", sourcePrtgId: null,
  intervals: [{ dateFrom: "", dateTo: "" }],
});
const emptyPrtg = (): PrtgForm => ({
  prtgStatus: "", inMessage: "", solution: "", intervals: [{ dateFrom: "", dateTo: "" }],
});

/* ─── Helpers ─── */
function toLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch { return ""; }
}

function formatDuration(from: string, to: string, min = "мин", h = "ч"): string {
  if (!from || !to) return "";
  const mins = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000);
  if (mins <= 0) return "";
  const hh = Math.floor(mins / 60), mm = mins % 60;
  if (hh === 0) return `${mm} ${min}`;
  if (mm === 0) return `${hh} ${h}`;
  return `${hh} ${h} ${mm} ${min}`;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / 1048576).toFixed(1)} МБ`;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sundayOfWeekFrom(date: Date): string {
  const target = new Date(date);
  const dow = target.getDay(); // 0 = Sunday
  const daysUntilSunday = dow === 0 ? 0 : 7 - dow;
  target.setDate(target.getDate() + daysUntilSunday);
  return toYmd(target);
}

function sundayFromLatestPrtg(prtgAlerts: PrtgAlertSummary[]): string {
  // prtgAlerts is sorted by createdAt desc from the backend — take the first valid interval
  for (const alert of prtgAlerts) {
    const dateFrom = alert.intervals?.[0]?.dateFrom;
    if (dateFrom) {
      const d = new Date(dateFrom);
      if (Number.isFinite(d.getTime())) {
        return sundayOfWeekFrom(d);
      }
    }
  }
  return sundayOfWeekFrom(new Date());
}

function nextSundayDate(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const target = new Date(now);
  target.setDate(now.getDate() + daysUntilSunday);
  return toYmd(target);
}

/* ─── Shared UI ─── */
function IconSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className ?? ""}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function Label({ htmlFor, children, required }: { htmlFor?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
      {children}{required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

const inp =
  "block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none " +
  "transition-all placeholder:text-gray-300 focus:border-blue-400 focus:ring-3 focus:ring-blue-500/10 " +
  "dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-600 " +
  "dark:focus:border-blue-500 dark:focus:ring-blue-500/15";

const cbx = "h-3.5 w-3.5 shrink-0 rounded border-gray-300 accent-blue-600 cursor-pointer dark:border-gray-600 dark:accent-blue-500";

/* ─── API helpers per mode ─── */
function apiBase(mode: AddIncidentMode) {
  if (mode === "prtg") return "prtg-alerts";
  if (mode === "incident") return "incidents";
  return "works";
}
function fileBase(mode: AddIncidentMode) {
  if (mode === "prtg") return "prtg-alert-files";
  if (mode === "incident") return "incident-files";
  return "work-files";
}

/* ─── Interval editor ─── */
function IntervalEditor({ intervals, onAdd, onRemove, onUpdate, required }: {
  intervals: IntervalRow[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, f: "dateFrom" | "dateTo", v: string) => void;
  required?: boolean;
}) {
  const { t } = useLanguage();
  const hasValid = intervals.some((iv) => iv.dateFrom && iv.dateTo);
  return (
    <div className="space-y-2">
      <div className="add-card-header">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {t("form.dateTime")}{required && <span className="ml-0.5 text-red-500">*</span>}
        {intervals.length > 1 && (
          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
            {intervals.length}
          </span>
        )}
        <button type="button" onClick={onAdd}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-blue-500/50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          {t("form.add")}
        </button>
      </div>
      {intervals.map((iv, idx) => {
        const dur = formatDuration(iv.dateFrom, iv.dateTo, t("events.minutes"), t("events.hours"));
        const isInverted = iv.dateFrom && iv.dateTo && new Date(iv.dateTo) < new Date(iv.dateFrom);

        const applyDuration = (minutes: number) => {
          if (!iv.dateFrom) return;
          const end = new Date(new Date(iv.dateFrom).getTime() + minutes * 60000);
          const p = (n: number) => String(n).padStart(2, "0");
          const val = `${end.getFullYear()}-${p(end.getMonth() + 1)}-${p(end.getDate())}T${p(end.getHours())}:${p(end.getMinutes())}`;
          onUpdate(idx, "dateTo", val);
        };

        return (
          <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-700/40 dark:bg-gray-900/30">
            <div className="flex items-center justify-end mb-2 gap-1.5">
              {dur && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {dur}
                </span>
              )}
              {intervals.length > 1 && (
                <button type="button" onClick={() => onRemove(idx)}
                  className="rounded-lg p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>{t("form.intervalStart")}</Label>
                <input type="datetime-local" value={iv.dateFrom} onChange={(e) => onUpdate(idx, "dateFrom", e.target.value)}
                  className={`${inp} ${isInverted ? "border-red-400 dark:border-red-500" : ""}`} />
              </div>
              <div>
                <Label>{t("form.intervalEnd")}</Label>
                <input type="datetime-local" value={iv.dateTo} onChange={(e) => onUpdate(idx, "dateTo", e.target.value)}
                  className={`${inp} ${isInverted ? "border-red-400 dark:border-red-500" : ""}`} />
              </div>
            </div>
            {isInverted && (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 dark:bg-red-950/30 dark:border-red-800/50">
                <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-[11px] font-medium text-red-600 dark:text-red-400">
                  {t("form.endBeforeStart")}
                </span>
              </div>
            )}
            {iv.dateFrom && (
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-[11px] text-gray-400 dark:text-gray-500 select-none shrink-0">{t("events.downtimeLabel")}</span>
                <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white overflow-hidden dark:border-gray-600 dark:bg-gray-800">
                  <input
                    type="number" min={1} placeholder="0"
                    className="w-14 px-2 py-0.5 text-[11px] text-gray-700 bg-transparent outline-none dark:text-gray-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const v = parseInt((e.target as HTMLInputElement).value);
                        if (v > 0) { applyDuration(v); (e.target as HTMLInputElement).value = ""; }
                      }
                    }}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value);
                      if (v > 0) { applyDuration(v); e.target.value = ""; }
                    }}
                  />
                  <span className="pr-2 text-[11px] text-gray-400 dark:text-gray-500 select-none">{t("events.minutes")}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main component ─── */
export default function AddIncidentForm({ mode, pathPrefix }: { mode: AddIncidentMode; pathPrefix: string }) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("id");
  const isEdit = Boolean(editId);

  /* state */
  const [workForm, setWorkForm] = useState<WorkForm>(emptyWork());
  const [incidentForm, setIncidentForm] = useState<IncidentForm>(emptyIncident());
  const [prtgForm, setPrtgForm] = useState<PrtgForm>(emptyPrtg());
  const [prtgPlannedTemplate, setPrtgPlannedTemplate] = useState(false);

  const [failureTypes, setFailureTypes] = useState<FailureType[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [infoSystems, setInfoSystems] = useState<InfoSystem[]>([]);
  const [prtgAlerts, setPrtgAlerts] = useState<PrtgAlertSummary[]>([]);

  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(editId ? Number(editId) : null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* load dicts */
  const loadDicts = useCallback(async () => {
    try {
      const [ftRes, jRes, isRes] = await Promise.all([
        apiFetch("dic-failure-types"),
        apiFetch("job-types"),
        apiFetch("information-systems"),
      ]);
      if (ftRes.ok) setFailureTypes(await ftRes.json());
      if (jRes.ok) setJobTypes(await jRes.json());
      if (isRes.ok) setInfoSystems(await isRes.json());
      const paRes = await apiFetch("prtg-alerts");
      if (paRes.ok) setPrtgAlerts(await paRes.json());
    } catch {}
  }, [mode]);

  /* load existing record */
  const loadRecord = useCallback(async (id: string) => {
    try {
      const res = await apiFetch(`${apiBase(mode)}/${id}`);
      if (!res.ok) throw new Error(t("form.loadError"));
      const d = await res.json();
      const ivs: IntervalRow[] = d.intervals?.length
        ? d.intervals.map((i: { id: number; dateFrom: string; dateTo: string }) => ({
            id: i.id, dateFrom: toLocal(i.dateFrom), dateTo: toLocal(i.dateTo),
          }))
        : [{ dateFrom: "", dateTo: "" }];
      if (mode === "works") {
        setWorkForm({
          dicJobId: d.dicJobId ? String(d.dicJobId) : "",
          isIds: d.isIds ?? [], emptyTime: d.emptyTime ?? false,
          includeAvailability: d.includeAvailability ?? true,
          inMessage: d.inMessage ?? "", outMessage: d.outMessage ?? "",
          solution: d.solution ?? "", sourcePrtgId: d.sourcePrtgId ?? null,
          intervals: ivs,
        });
      } else if (mode === "incident") {
        setIncidentForm({
          failureTypeId: d.failureTypeId ? String(d.failureTypeId) : "",
          isIds: d.isIds ?? [], fixed: d.fixed ?? false, emptyTime: false,
          includeAvailability: d.includeAvailability ?? true,
          inMessage: d.inMessage ?? "", outMessage: d.outMessage ?? "",
          act: d.act ?? "", problem: d.problem ?? "", solution: d.solution ?? "",
          sourcePrtgId: d.sourcePrtgId ?? null, intervals: ivs,
        });
      } else {
        setPrtgForm({
          prtgStatus: d.prtgStatus ?? "", inMessage: d.inMessage ?? "",
          solution: d.solution ?? "", intervals: ivs,
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("form.loadError"));
    } finally { setLoading(false); }
  }, [mode]);

  const loadFiles = useCallback(async (id: number) => {
    try {
      const res = await apiFetch(`${fileBase(mode)}/${id}`);
      if (res.ok) setFiles(await res.json());
    } catch {}
  }, [mode]);

  useEffect(() => {
    loadDicts();
    if (editId) { loadRecord(editId); loadFiles(Number(editId)); }
  }, [editId, loadDicts, loadRecord, loadFiles]);

  /* load from PRTG */
  const handleLoadFromPrtg = async (prtgId: number, targetMode: "works" | "incident") => {
    try {
      const res = await apiFetch(`${targetMode === "works" ? "works" : "incidents"}/load-from-prtg/${prtgId}`);
      if (!res.ok) return;
      const d = await res.json();
      const ivs: IntervalRow[] = d.intervals?.length
        ? d.intervals.map((i: { dateFrom: string; dateTo: string }) => ({
            dateFrom: toLocal(i.dateFrom), dateTo: toLocal(i.dateTo),
          }))
        : [{ dateFrom: "", dateTo: "" }];
      if (targetMode === "works") {
        setWorkForm((prev) => ({ ...prev, inMessage: d.inMessage ?? prev.inMessage, solution: d.solution ?? prev.solution, sourcePrtgId: prtgId, intervals: ivs }));
      } else {
        setIncidentForm((prev) => ({
          ...prev,
          act: d.inMessage ?? prev.act,
          solution: d.solution ?? prev.solution,
          sourcePrtgId: prtgId,
          intervals: ivs,
        }));
      }
    } catch {}
  };

  /* file helpers */
  const uploadFilesToRecord = async (id: number, list: File[]) => {
    for (const file of list) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch(`${fileBase(mode)}/${id}`, { method: "POST", body: fd });
      if (!res.ok) { const m = await res.text().catch(() => ""); throw new Error(m || `${t("form.fileUploadError")} «${file.name}»`); }
    }
    await loadFiles(id);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files;
    if (!picked?.length) return;
    const arr = Array.from(picked);
    if (savedId) {
      setUploading(true);
      try { await uploadFilesToRecord(savedId, arr); }
      catch (err) { alert(err instanceof Error ? err.message : t("form.loadError")); }
      finally { setUploading(false); }
    } else { setPendingFiles((prev) => [...prev, ...arr]); }
    e.target.value = "";
  };

  const removePending = (i: number) => setPendingFiles((p) => p.filter((_, j) => j !== i));

  const handleFileDelete = async (fileId: number) => {
    if (!confirm(t("form.deleteFileConfirm"))) return;
    const res = await apiFetch(`${fileBase(mode)}/${fileId}`, { method: "DELETE" });
    if (res.ok) setFiles((p) => p.filter((f) => f.id !== fileId));
    else alert(t("form.deleteError"));
  };

  /* interval helpers */
  const addInterval = (setter: React.Dispatch<React.SetStateAction<any>>) =>
    setter((prev: any) => ({ ...prev, intervals: [...prev.intervals, { dateFrom: "", dateTo: "" }] }));

  const removeInterval = (setter: React.Dispatch<React.SetStateAction<any>>, idx: number) =>
    setter((prev: any) => ({ ...prev, intervals: prev.intervals.filter((_: unknown, i: number) => i !== idx) }));

  const updateInterval = (setter: React.Dispatch<React.SetStateAction<any>>, idx: number, field: "dateFrom" | "dateTo", value: string) =>
    setter((prev: any) => {
      const ivs = [...prev.intervals];
      ivs[idx] = { ...ivs[idx], [field]: value };
      return { ...prev, intervals: ivs };
    });

  const buildIntervals = (ivs: IntervalRow[]) =>
    ivs.filter((iv) => iv.dateFrom && iv.dateTo)
      .map((iv) => ({ id: iv.id ?? undefined, dateFrom: new Date(iv.dateFrom).toISOString(), dateTo: new Date(iv.dateTo).toISOString() }));

  const hasInvertedIntervals = (ivs: IntervalRow[]) =>
    ivs.some((iv) => iv.dateFrom && iv.dateTo && new Date(iv.dateTo) < new Date(iv.dateFrom));

  const hasValidInterval = (ivs: IntervalRow[]) =>
    ivs.some((iv) => iv.dateFrom && iv.dateTo);

  /* submit */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeIvs = mode === "works" ? workForm.intervals : mode === "incident" ? incidentForm.intervals : prtgForm.intervals;

    setSubmitted(true);
    if (hasInvertedIntervals(activeIvs)) {
      setError(t("form.validationIntervals"));
      return;
    }

    if (mode === "works") {
      if (!workForm.dicJobId) { setError(t("form.validationWorkType")); return; }
      if (workForm.isIds.length === 0) { setError(t("form.validationIS")); return; }
      if (!workForm.emptyTime && !hasValidInterval(workForm.intervals)) { setError(t("form.validationDateTime")); return; }
    }
    if (mode === "incident") {
      if (!incidentForm.failureTypeId) { setError(t("form.validationIncidentType")); return; }
      if (incidentForm.isIds.length === 0) { setError(t("form.validationIS")); return; }
      if (!hasValidInterval(incidentForm.intervals)) { setError(t("form.validationDateTime")); return; }
    }
    if (mode === "prtg") {
      if (!prtgForm.prtgStatus) { setError(t("form.validationPrtgStatus")); return; }
      if (!hasValidInterval(prtgForm.intervals)) { setError(t("form.validationDateTime")); return; }
    }

    setSaving(true); setError(null);
    try {
      let body: object;
      if (mode === "works") {
        body = {
          dicJobId: workForm.dicJobId ? Number(workForm.dicJobId) : null,
          isIds: workForm.isIds, emptyTime: workForm.emptyTime,
          includeAvailability: workForm.includeAvailability,
          inMessage: workForm.inMessage || null, outMessage: workForm.outMessage || null,
          solution: workForm.solution || null, sourcePrtgId: workForm.sourcePrtgId,
          intervals: workForm.emptyTime ? [] : buildIntervals(workForm.intervals),
        };
      } else if (mode === "incident") {
        body = {
          failureTypeId: incidentForm.failureTypeId ? Number(incidentForm.failureTypeId) : null,
          isIds: incidentForm.isIds, fixed: incidentForm.fixed,
          emptyTime: false, includeAvailability: incidentForm.includeAvailability,
          inMessage: null, outMessage: null,
          act: incidentForm.act || null, problem: incidentForm.problem || null,
          solution: incidentForm.solution || null, sourcePrtgId: incidentForm.sourcePrtgId,
          intervals: buildIntervals(incidentForm.intervals),
        };
      } else {
        body = {
          prtgStatus: prtgForm.prtgStatus || null,
          inMessage: prtgForm.inMessage || null, solution: prtgForm.solution || null,
          intervals: buildIntervals(prtgForm.intervals),
        };
      }

      const path = editId ? `${apiBase(mode)}/${editId}` : apiBase(mode);
      const res = await apiFetch(path, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setError((await res.text()) || t("form.saveError")); return; }
      const saved = await res.json();
      const id = saved.id as number;
      setSavedId(id);

      if (pendingFiles.length > 0) {
        try { await uploadFilesToRecord(id, pendingFiles); setPendingFiles([]); }
        catch (err) { setError(err instanceof Error ? err.message : t("form.saveOkFilesError")); await loadFiles(id); }
      } else { await loadFiles(id); }

      router.push(`/incidents/events?mode=${mode}`);
    } catch { setError(t("form.saveError")); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 px-6 py-10">
        <IconSpinner className="h-4 w-4 text-blue-500" />
        <span className="text-sm text-gray-400">{t("common.loading")}</span>
      </div>
    );
  }

  const title = editId ? t("form.editTitle")
    : mode === "works" ? t("form.worksTitle")
    : mode === "incident" ? t("form.incidentTitle")
    : t("form.prtgTitle");

  const totalFiles = pendingFiles.length + files.length;

  /* interval state shortcuts */
  const ivWork = workForm.intervals;
  const ivInc = incidentForm.intervals;
  const ivPrtg = prtgForm.intervals;

  return (
    <div className="h-full flex flex-col px-6 py-5 gap-4 add-page">

      {/* HEADER */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl add-icon-box shrink-0">
            <svg className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight leading-tight">{title}</h1>
              {savedId && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                  № {savedId}
                </span>
              )}
            </div>
            <Link href={`/incidents/events?mode=${mode}`}
              className="mt-0.5 block w-fit text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300">
              ← {t("form.backToEvents")}
            </Link>
          </div>
        </div>
        <button type="submit" form="ev-form" disabled={saving}
          className="add-save-btn shrink-0 inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? (
            <><IconSpinner className="h-4 w-4 shrink-0" />{t("common.saving")}</>
          ) : (
            <>
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-8H7v8M7 3v5h8" />
              </svg>
              {t("common.save")}
            </>
          )}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div role="alert" className="shrink-0 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-400">
          <svg className="shrink-0 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {/* FORM */}
      <form id="ev-form" onSubmit={handleSubmit} className="flex-1 grid grid-cols-5 gap-4 min-h-0">

        {/* LEFT 3/5 */}
        <div className="col-span-3 flex flex-col gap-4 min-h-0">

          {/* ── WORKS ── */}
          {mode === "works" && (
            <div className="add-card rounded-2xl p-5 flex flex-col gap-4">
              <div className="add-card-header">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                {t("form.mainData")}
              </div>

              {/* Загрузить из тревоги PRTG — ВВЕРХУ */}
              {prtgAlerts.length > 0 && (
                <div>
                  <Label htmlFor="load-prtg">{t("events.loadFromPrtg")}</Label>
                  <select id="load-prtg" value={workForm.sourcePrtgId ?? ""}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      if (val) handleLoadFromPrtg(val, "works");
                      else setWorkForm((p) => ({ ...p, sourcePrtgId: null }));
                    }} className={inp}>
                    <option value="">— {t("form.notUse")} —</option>
                    {prtgAlerts.map((a) => {
                      const dt = a.intervals?.[0]?.dateFrom
                        ? new Date(a.intervals[0].dateFrom).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                        : a.createdAt ? new Date(a.createdAt).toLocaleDateString("ru-RU") : "";
                      return <option key={a.id} value={a.id}>№{a.id}{dt ? ` — ${dt}` : ""}{a.solution ? ` · ${a.solution}` : ""}</option>;
                    })}
                  </select>
                  {workForm.sourcePrtgId && (
                    <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                      {t("form.prtgLoadedNote")}{workForm.sourcePrtgId}. {t("form.newRecordNote")}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="dic-job" required>{t("form.workType")}</Label>
                  <select id="dic-job" value={workForm.dicJobId}
                    onChange={(e) => setWorkForm((p) => ({ ...p, dicJobId: e.target.value }))}
                    className={inp} style={submitted && !workForm.dicJobId ? { borderColor: "#f87171" } : {}}>
                    <option value="">{t("common.selectPlaceholder")}</option>
                    {jobTypes.map((j) => <option key={j.id} value={j.id}>{j.nameRu ?? `ID ${j.id}`}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="letter-no">{t("form.letterIn")}</Label>
                  <input id="letter-no" type="text" value={workForm.inMessage}
                    onChange={(e) => setWorkForm((p) => ({ ...p, inMessage: e.target.value }))}
                    className={inp} placeholder={t("form.letterInPlaceholder")} />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="solution-work">{t("form.note")}</Label>
                  <input id="solution-work" type="text" value={workForm.solution}
                    onChange={(e) => setWorkForm((p) => ({ ...p, solution: e.target.value }))}
                    className={inp} placeholder={t("form.notePlaceholder")} />
                </div>
              </div>
            </div>
          )}

          {/* ── INCIDENT ── */}
          {mode === "incident" && (
            <div className="add-card rounded-2xl p-5 flex flex-col gap-4">
              <div className="add-card-header">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                {t("form.mainData")}
              </div>

              {/* Загрузить из тревоги PRTG — ВВЕРХУ */}
              {prtgAlerts.length > 0 && (
                <div>
                  <Label htmlFor="load-prtg-inc">{t("events.loadFromPrtg")}</Label>
                  <select id="load-prtg-inc" value={incidentForm.sourcePrtgId ?? ""}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      if (val) handleLoadFromPrtg(val, "incident");
                      else setIncidentForm((p) => ({ ...p, sourcePrtgId: null }));
                    }} className={inp}>
                    <option value="">— {t("form.notUse")} —</option>
                    {prtgAlerts.map((a) => {
                      const dt = a.intervals?.[0]?.dateFrom
                        ? new Date(a.intervals[0].dateFrom).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                        : a.createdAt ? new Date(a.createdAt).toLocaleDateString("ru-RU") : "";
                      return <option key={a.id} value={a.id}>№{a.id}{dt ? ` — ${dt}` : ""}{a.solution ? ` · ${a.solution}` : ""}</option>;
                    })}
                  </select>
                  {incidentForm.sourcePrtgId && (
                    <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                      {t("form.prtgLoadedNote")}{incidentForm.sourcePrtgId}. {t("form.newRecordNote")}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="failure-type" required>{t("form.incidentType")}</Label>
                  <select id="failure-type" value={incidentForm.failureTypeId}
                    onChange={(e) => setIncidentForm((p) => ({ ...p, failureTypeId: e.target.value }))}
                    className={inp} style={submitted && !incidentForm.failureTypeId ? { borderColor: "#f87171" } : {}}>
                    <option value="">{t("common.selectPlaceholder")}</option>
                    {failureTypes.map((t) => <option key={t.id} value={t.id}>{t.nameRu ?? `ID ${t.id}`}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="act-no">{t("form.failureAct")}</Label>
                  <input id="act-no" type="text" value={incidentForm.act}
                    onChange={(e) => setIncidentForm((p) => ({ ...p, act: e.target.value }))}
                    className={inp} placeholder={t("form.actPlaceholder")} />
                </div>
                <div>
                  <Label htmlFor="solution-inc">{t("form.note")}</Label>
                  <textarea id="solution-inc" value={incidentForm.solution}
                    onChange={(e) => setIncidentForm((p) => ({ ...p, solution: e.target.value }))}
                    className={inp + " min-h-20 resize-y"} placeholder={t("form.notePlaceholder")} />
                </div>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2 pt-0.5 border-t border-gray-100 dark:border-gray-700/50">
                {[
                  { label: t("form.fixedNit"),           field: "fixed" as const },
                  { label: t("form.includeAvailability"), field: "includeAvailability" as const },
                ].map(({ label, field }) => (
                  <label key={field} className="flex cursor-pointer items-center gap-2 group select-none">
                    <input type="checkbox" checked={incidentForm[field]} onChange={(e) => setIncidentForm((p) => ({ ...p, [field]: e.target.checked }))} className={cbx} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── PRTG ── */}
          {mode === "prtg" && (
            <div className="add-card rounded-2xl p-5 flex flex-col gap-4">
              <div className="add-card-header">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                {t("form.prtgData")}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="flex cursor-pointer items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      checked={prtgPlannedTemplate}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPrtgPlannedTemplate(checked);
                        if (checked) {
                          const sunday = prtgAlerts.length > 0 ? sundayFromLatestPrtg(prtgAlerts) : nextSundayDate();
                          setPrtgForm((p) => ({
                            ...p,
                            prtgStatus: "Неизвестно",
                            solution: "каждое воскресенье плановые работы PRTG",
                            inMessage: "№17 от 06.01.2025",
                            intervals: [{ dateFrom: `${sunday}T22:50`, dateTo: `${sunday}T23:30` }],
                          }));
                        }
                      }}
                      className={cbx}
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {t("form.prtgPlannedTemplate")}
                    </span>
                  </label>
                </div>
                <div>
                  <Label htmlFor="prtg-status" required>{t("events.prtgStatus")}</Label>
                  <select id="prtg-status" value={prtgForm.prtgStatus}
                    style={submitted && !prtgForm.prtgStatus ? { borderColor: "#f87171" } : {}}
                    onChange={(e) => setPrtgForm((p) => ({ ...p, prtgStatus: e.target.value }))} className={inp}>
                    <option value="">{t("common.selectPlaceholder")}</option>
                    <option value="Ошибка">Ошибка</option>
                    <option value="Неизвестно">Неизвестно</option>
                    <option value="Ошибка/Неизвестно">Ошибка / Неизвестно</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="prtg-in">{t("events.letterNo")}</Label>
                  <input id="prtg-in" type="text" value={prtgForm.inMessage}
                    onChange={(e) => setPrtgForm((p) => ({ ...p, inMessage: e.target.value }))}
                    className={inp} placeholder={t("form.letterInPlaceholder")} />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="prtg-note">{t("form.note")}</Label>
                  <textarea id="prtg-note" value={prtgForm.solution}
                    onChange={(e) => setPrtgForm((p) => ({ ...p, solution: e.target.value }))}
                    className={inp + " min-h-20 resize-y"} placeholder={t("form.notePlaceholder")} />
                </div>
              </div>
            </div>
          )}

          {/* ── IS МТЗСН (works + incident) ── */}
          {mode !== "prtg" && infoSystems.length > 0 && (
            <div className={`add-card rounded-2xl p-5 flex flex-col gap-3 ${submitted && (mode === "works" ? workForm.isIds : incidentForm.isIds).length === 0 ? "ring-1 ring-red-300 dark:ring-red-700/50" : ""}`}>
              <div className="add-card-header">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
                {t("form.isSystem")}<span className="ml-0.5 text-red-500">*</span>
                {(mode === "works" ? workForm.isIds : incidentForm.isIds).length > 0 && (
                  <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
                    {(mode === "works" ? workForm.isIds : incidentForm.isIds).length}
                  </span>
                )}
              </div>
              <div className="grid max-h-36 grid-cols-2 gap-x-3 gap-y-1.5 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-700/40 dark:bg-gray-900/30">
                {infoSystems.map((s) => {
                  const checked = mode === "works" ? workForm.isIds.includes(s.id) : incidentForm.isIds.includes(s.id);
                  const toggle = () => {
                    if (mode === "works") setWorkForm((p) => ({ ...p, isIds: checked ? p.isIds.filter((x) => x !== s.id) : [...p.isIds, s.id] }));
                    else setIncidentForm((p) => ({ ...p, isIds: checked ? p.isIds.filter((x) => x !== s.id) : [...p.isIds, s.id] }));
                  };
                  return (
                    <label key={s.id} className="flex cursor-pointer items-center gap-2 truncate select-none group">
                      <input type="checkbox" checked={checked} onChange={toggle} className={cbx} />
                      <span className="truncate text-xs text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{s.nameRu ?? s.id}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT 2/5 */}
        <div className="col-span-2 flex flex-col gap-4 min-h-0">

          {/* Intervals */}
          <div className="add-card rounded-2xl p-5 flex flex-col gap-3">
            {mode === "works" && !workForm.emptyTime && (
              <IntervalEditor intervals={ivWork} required
                onAdd={() => addInterval(setWorkForm)}
                onRemove={(i) => removeInterval(setWorkForm, i)}
                onUpdate={(i, f, v) => updateInterval(setWorkForm, i, f, v)} />
            )}
            {mode === "works" && workForm.emptyTime && (
              <>
                <div className="add-card-header">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t("form.dateTime")}
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 dark:border-amber-800/30 dark:bg-amber-900/10">
                  <svg className="shrink-0 w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs text-amber-700 dark:text-amber-400">{t("form.emptyTimeNote")}</span>
                </div>
              </>
            )}
            {mode === "incident" && (
              <IntervalEditor intervals={ivInc} required
                onAdd={() => addInterval(setIncidentForm)}
                onRemove={(i) => removeInterval(setIncidentForm, i)}
                onUpdate={(i, f, v) => updateInterval(setIncidentForm, i, f, v)} />
            )}
            {mode === "prtg" && (
              <IntervalEditor intervals={ivPrtg} required
                onAdd={() => addInterval(setPrtgForm)}
                onRemove={(i) => removeInterval(setPrtgForm, i)}
                onUpdate={(i, f, v) => updateInterval(setPrtgForm, i, f, v)} />
            )}
          </div>

          {/* Files */}
          <div className="add-card rounded-2xl p-5 flex flex-col gap-3">
            <div className="add-card-header">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {t("events.attachments")}
              {totalFiles > 0 && (
                <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
                  {totalFiles}
                </span>
              )}
              <label className={`ml-auto inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                uploading || saving
                  ? "pointer-events-none border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
                  : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-blue-500/50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
              }`}>
                {uploading ? <><IconSpinner className="h-3 w-3 shrink-0" />{t("form.uploading")}</> : (
                  <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>{t("form.attach")}</>
                )}
                <input ref={fileInputRef} type="file" multiple className="hidden" disabled={uploading || saving} onChange={handleFileInputChange} />
              </label>
            </div>

            {totalFiles === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-150 dark:border-gray-700/50 py-5 gap-2">
                <svg className="w-7 h-7 text-gray-200 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-gray-300 dark:text-gray-600">{t("form.noAttachments")}</p>
              </div>
            ) : (
              <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                {pendingFiles.map((f, idx) => (
                  <li key={`p-${idx}`} className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 dark:border-blue-500/15 dark:bg-blue-500/5">
                    <svg className="shrink-0 w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="flex-1 truncate text-xs text-gray-700 dark:text-gray-300">{f.name}</span>
                    <span className="shrink-0 text-[10px] text-gray-400">{formatFileSize(f.size)}</span>
                    <button type="button" onClick={() => removePending(idx)} className="shrink-0 rounded p-0.5 text-gray-300 hover:text-red-500 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </li>
                ))}
                {savedId && files.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 dark:border-gray-700/50 dark:bg-gray-800/40">
                    <svg className="shrink-0 w-3.5 h-3.5 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="flex-1 truncate text-xs text-gray-700 dark:text-gray-300">{f.fileName}</span>
                    {f.fileSize != null && f.fileSize > 0 && (
                      <span className="shrink-0 text-[10px] text-gray-400">{formatFileSize(f.fileSize)}</span>
                    )}
                    <a href={apiUrl(`${fileBase(mode)}/download/${f.id}`)} download={f.fileName}
                      className="shrink-0 rounded p-0.5 text-gray-300 hover:text-blue-500 transition-colors" title={t("common.download")}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </a>
                    <button type="button" onClick={() => handleFileDelete(f.id)} className="shrink-0 rounded p-0.5 text-gray-300 hover:text-red-500 transition-colors" title={t("common.delete")}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </form>

      <style jsx global>{`
        .add-page { min-height: calc(100vh - 4rem); }
        .add-icon-box {
          background: linear-gradient(135deg, rgba(219,234,254,0.8) 0%, rgba(224,242,254,0.6) 100%);
          border: 1px solid rgba(147,197,253,0.35);
        }
        html.dark .add-icon-box {
          background: linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(29,78,216,0.10) 100%);
          border: 1px solid rgba(59,130,246,0.20);
        }
        .add-card {
          background: #ffffff;
          border: 1px solid rgba(99,140,210,0.25);
          box-shadow: 0 2px 8px rgba(30,64,175,0.07), 0 6px 20px rgba(30,64,175,0.09);
          transition: box-shadow 0.2s;
        }
        .add-card:hover { box-shadow: 0 4px 14px rgba(30,64,175,0.10), 0 10px 28px rgba(30,64,175,0.12); }
        html.dark .add-card {
          background: rgba(22,32,50,0.60);
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 1px 3px rgba(0,0,0,0.20);
        }
        .add-card-header {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
          color: #4a6fa5; padding-bottom: 12px;
          border-bottom: 1px solid rgba(99,140,210,0.20); margin-bottom: 2px;
        }
        html.dark .add-card-header { color: #94a3b8; border-bottom-color: rgba(255,255,255,0.06); }
        .add-card-header svg { color: #3b82f6; flex-shrink: 0; }
        .add-save-btn {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 60%, #1e40af 100%);
          box-shadow: 0 3px 10px rgba(37,99,235,0.35), 0 1px 3px rgba(37,99,235,0.2);
          position: relative; overflow: hidden;
          transition: box-shadow 0.2s, transform 0.15s;
        }
        .add-save-btn::before {
          content: ''; position: absolute;
          top: 0; left: -100%; bottom: 0; width: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transition: left 0.45s ease;
        }
        .add-save-btn:hover:not(:disabled)::before { left: 100%; }
        .add-save-btn:hover:not(:disabled) {
          box-shadow: 0 5px 16px rgba(37,99,235,0.45), 0 2px 5px rgba(37,99,235,0.25);
          transform: translateY(-1px);
        }
        .add-save-btn:active:not(:disabled) { transform: translateY(0); }
      `}</style>
    </div>
  );
}
