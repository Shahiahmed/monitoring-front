"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch, apiUrl } from "../../lib/api";

interface FailureType  { id: number; nameRu: string | null; }
interface JobType      { id: number; nameRu: string | null; }
interface Location     { id: number; nameRu: string | null; }
interface InfoSystem   { id: number; nameRu: string | null; }
interface IncidentFile {
  id: number;
  fileName: string;
  contentType: string | null;
  fileSize: number | null;
  uploadedAt: string | null;
}

interface IntervalRow {
  id?: number;
  dateFrom: string;
  dateTo: string;
}

interface IncidentForm {
  dicJobId: string;
  failureTypeId: string;
  locationId: string;
  isIds: number[];
  fixed: boolean;
  emptyTime: boolean;
  includeAvailability: boolean;
  inMessage: string;
  outMessage: string;
  act: string;
  problem: string;
  solution: string;
  intervals: IntervalRow[];
}

const emptyForm = (): IncidentForm => ({
  dicJobId: "",
  failureTypeId: "",
  locationId: "",
  isIds: [],
  fixed: false,
  emptyTime: false,
  includeAvailability: true,
  inMessage: "",
  outMessage: "",
  act: "",
  problem: "",
  solution: "",
  intervals: [{ dateFrom: "", dateTo: "" }],
});

function toLocalDatetimeValue(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function computeMinutes(from: string, to: string): number | null {
  if (!from || !to) return null;
  const diff = new Date(to).getTime() - new Date(from).getTime();
  if (diff <= 0) return null;
  return Math.round(diff / 60000);
}

function formatDuration(from: string, to: string): string {
  const mins = computeMinutes(from, to);
  if (mins === null) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

/**
 * Блок ИС МТЗСН при типе «ППО» (как в старом UI). Запасной вариант: id=1 в сиде V10/V14.
 */
const FAILURE_TYPE_ID_PPO_FALLBACK = 1;

function IconSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className ?? ""}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/** Иконка «Сохранить» — Lucide `save` (MIT), не путать с «скачать». */
function IconSave({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-8H7v8" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3v5h8" />
    </svg>
  );
}

function IconPaperclip({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
      />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function shouldShowIsMtsnBlock(failureTypeId: string, types: FailureType[]): boolean {
  if (!failureTypeId) return false;
  const t = types.find((x) => String(x.id) === failureTypeId);
  const name = t?.nameRu != null ? String(t.nameRu).trim() : "";
  if (name !== "") return name === "ППО";
  return failureTypeId === String(FAILURE_TYPE_ID_PPO_FALLBACK);
}

export default function AddIncidentPage() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [form, setForm] = useState<IncidentForm>(emptyForm());
  const [types, setTypes] = useState<FailureType[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [infoSystems, setInfoSystems] = useState<InfoSystem[]>([]);
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(editId ? Number(editId) : null);
  const [files, setFiles] = useState<IncidentFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDicts = useCallback(async () => {
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
  }, []);

  const loadIncident = useCallback(async (id: string) => {
    try {
      const res = await apiFetch(`incidents/${id}`);
      if (!res.ok) throw new Error("Не удалось загрузить инцидент");
      const data = await res.json();
      setForm({
        dicJobId: data.dicJobId ? String(data.dicJobId) : "",
        failureTypeId: data.failureTypeId ? String(data.failureTypeId) : "",
        locationId: data.locationId ? String(data.locationId) : "",
        isIds: data.isIds ?? [],
        fixed: data.fixed ?? false,
        emptyTime: data.emptyTime ?? false,
        includeAvailability: data.includeAvailability ?? true,
        inMessage: data.inMessage ?? "",
        outMessage: data.outMessage ?? "",
        act: data.act ?? "",
        problem: data.problem ?? "",
        solution: data.solution ?? "",
        intervals: data.intervals && data.intervals.length > 0
          ? data.intervals.map((iv: { id: number; dateFrom: string; dateTo: string }) => ({
              id: iv.id,
              dateFrom: toLocalDatetimeValue(iv.dateFrom),
              dateTo: toLocalDatetimeValue(iv.dateTo),
            }))
          : [{ dateFrom: "", dateTo: "" }],
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFiles = useCallback(async (id: number) => {
    try {
      const res = await apiFetch(`incident-files/${id}`);
      if (res.ok) setFiles(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    loadDicts();
    if (editId) {
      loadIncident(editId);
      loadFiles(Number(editId));
    }
  }, [editId, loadDicts, loadIncident, loadFiles]);

  const uploadFilesToIncident = async (incidentId: number, list: File[]) => {
    for (const file of list) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch(`incident-files/${incidentId}`, { method: "POST", body: fd });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Не удалось загрузить «${file.name}»`);
      }
    }
    await loadFiles(incidentId);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files;
    if (!picked?.length) return;
    const arr = Array.from(picked);
    if (savedId) {
      setUploading(true);
      try {
        await uploadFilesToIncident(savedId, arr);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Ошибка загрузки");
      } finally {
        setUploading(false);
      }
    } else {
      setPendingFiles((prev) => [...prev, ...arr]);
    }
    e.target.value = "";
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileDelete = async (fileId: number) => {
    if (!confirm("Удалить файл?")) return;
    try {
      const res = await apiFetch(`incident-files/${fileId}`, { method: "DELETE" });
      if (res.ok) setFiles((prev) => prev.filter((f) => f.id !== fileId));
      else alert("Ошибка при удалении");
    } catch {
      alert("Ошибка при удалении");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
    return `${Math.round(bytes / 1024 / 1024 * 10) / 10} МБ`;
  };

  const setField = <K extends keyof IncidentForm>(key: K, value: IncidentForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleIs = (id: number) => {
    setForm((prev) => ({
      ...prev,
      isIds: prev.isIds.includes(id)
        ? prev.isIds.filter((x) => x !== id)
        : [...prev.isIds, id],
    }));
  };

  const addInterval = () => {
    setForm((prev) => ({
      ...prev,
      intervals: [...prev.intervals, { dateFrom: "", dateTo: "" }],
    }));
  };

  const removeInterval = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      intervals: prev.intervals.filter((_, i) => i !== idx),
    }));
  };

  const updateInterval = (idx: number, field: "dateFrom" | "dateTo", value: string) => {
    setForm((prev) => {
      const intervals = [...prev.intervals];
      intervals[idx] = { ...intervals[idx], [field]: value };
      return { ...prev, intervals };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body = {
      dicJobId: form.dicJobId ? Number(form.dicJobId) : null,
      failureTypeId: form.failureTypeId ? Number(form.failureTypeId) : null,
      locationId: form.locationId ? Number(form.locationId) : null,
      isIds: shouldShowIsMtsnBlock(form.failureTypeId, types) ? form.isIds : [],
      fixed: form.fixed,
      emptyTime: form.emptyTime,
      includeAvailability: form.includeAvailability,
      inMessage: form.inMessage || null,
      outMessage: form.outMessage || null,
      act: form.act || null,
      problem: form.problem || null,
      solution: form.solution || null,
      intervals: form.emptyTime
        ? []
        : form.intervals
            .filter((iv) => iv.dateFrom && iv.dateTo)
            .map((iv) => ({
              id: iv.id ?? undefined,
              dateFrom: new Date(iv.dateFrom).toISOString(),
              dateTo: new Date(iv.dateTo).toISOString(),
            })),
    };

    try {
      const path = editId ? `incidents/${editId}` : "incidents";
      const method = editId ? "PUT" : "POST";
      const res = await apiFetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await res.text();
        setError(msg || "Ошибка при сохранении");
        return;
      }
      const saved = await res.json();
      const incidentId = saved.id as number;
      setSavedId(incidentId);
      if (pendingFiles.length > 0) {
        try {
          await uploadFilesToIncident(incidentId, pendingFiles);
          setPendingFiles([]);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Запись сохранена, ошибка загрузки файлов");
          await loadFiles(incidentId);
        }
      } else {
        await loadFiles(incidentId);
      }
      if (!editId) {
        window.history.replaceState(null, "", `/incidents/add?id=${incidentId}`);
      }
    } catch {
      setError("Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-gray-500";
  const labelCls = "mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300";
  const checkboxInput =
    "h-4 w-4 shrink-0 rounded border-gray-300 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-gray-500 accent-gray-900 dark:accent-white";
  const divider = "border-t border-gray-200 dark:border-gray-700";
  const sec = "text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400";

  if (loading) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">Загрузка...</p>
      </div>
    );
  }

  const showIsBlock = infoSystems.length > 0 && shouldShowIsMtsnBlock(form.failureTypeId, types);

  return (
    <div className="px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-white">
            {editId ? "Редактирование события" : "Новое событие"}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Данные сохраняются в журнал инцидентов</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {savedId ? (
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">№ {savedId}</span>
          ) : null}
          <button
            type="submit"
            form="incident-form"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            {saving ? (
              <>
                <IconSpinner className="h-4 w-4 shrink-0" />
                Сохранение…
              </>
            ) : (
              <>
                <IconSave className="h-4 w-4 shrink-0" />
                Сохранить
              </>
            )}
          </button>
        </div>
      </div>

      <form
        id="incident-form"
        onSubmit={handleSubmit}
        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6"
      >
        {error ? (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
          >
            {error}
          </div>
        ) : null}

        <div className="space-y-6">
            <div>
            <p className={`${sec} mb-3`}>Данные</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={labelCls} htmlFor="dic-job">
                  Тип работы
                </label>
                <select
                  id="dic-job"
                  value={form.dicJobId}
                  onChange={(e) => setField("dicJobId", e.target.value)}
                  className={inputCls}
                >
                  <option value="">—</option>
                  {jobTypes.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nameRu || `ID ${j.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="failure-type">
                  Тип инцидента
                </label>
                <select
                  id="failure-type"
                  value={form.failureTypeId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      failureTypeId: v,
                      isIds: shouldShowIsMtsnBlock(v, types) ? prev.isIds : [],
                    }));
                  }}
                  className={inputCls}
                >
                  <option value="">—</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nameRu || `ID ${t.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="location">
                  Местоположение
                </label>
                <select
                  id="location"
                  value={form.locationId}
                  onChange={(e) => setField("locationId", e.target.value)}
                  className={inputCls}
                >
                  <option value="">—</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nameRu || `ID ${l.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="act-no">
                  Номер акта
                </label>
                <input
                  id="act-no"
                  type="text"
                  value={form.act}
                  onChange={(e) => setField("act", e.target.value)}
                  className={inputCls}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.fixed}
                  onChange={(e) => setField("fixed", e.target.checked)}
                  className={checkboxInput}
                />
                Сит-центр
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.emptyTime}
                  onChange={(e) => setField("emptyTime", e.target.checked)}
                  className={checkboxInput}
                />
                Без времени простоя
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.includeAvailability}
                  onChange={(e) => setField("includeAvailability", e.target.checked)}
                  className={checkboxInput}
                />
                В % доступности
              </label>
            </div>
            </div>

            {showIsBlock ? (
              <div className={`${divider} pt-6`}>
                <p className={`${sec} mb-3`}>ИС МТЗСН {form.isIds.length > 0 ? `· ${form.isIds.length}` : ""}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-3 lg:grid-cols-4 dark:border-gray-700 dark:bg-gray-900/50">
                  {infoSystems.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2 truncate text-sm text-gray-700 dark:text-gray-300"
                    >
                      <input
                        type="checkbox"
                        checked={form.isIds.includes(s.id)}
                        onChange={() => toggleIs(s.id)}
                        className={checkboxInput}
                      />
                      <span className="truncate">{s.nameRu || s.id}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {!form.emptyTime ? (
              <div className={`${divider} pt-6`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className={sec}>Интервалы</p>
                  <button
                    type="button"
                    onClick={addInterval}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-gray-700/80"
                  >
                    <IconPlus className="h-4 w-4 shrink-0 text-gray-600 dark:text-gray-300" />
                    Добавить период
                  </button>
                </div>
                <div className="space-y-2">
                  {form.intervals.map((iv, idx) => {
                    const dur = iv.dateFrom && iv.dateTo ? formatDuration(iv.dateFrom, iv.dateTo) : "";
                    return (
                      <div
                        key={idx}
                        className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/50"
                      >
                        <div className="min-w-40 flex-1">
                          <label className={labelCls}>Начало</label>
                          <input
                            type="datetime-local"
                            value={iv.dateFrom}
                            onChange={(e) => updateInterval(idx, "dateFrom", e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div className="min-w-40 flex-1">
                          <label className={labelCls}>Окончание</label>
                          <input
                            type="datetime-local"
                            value={iv.dateTo}
                            onChange={(e) => updateInterval(idx, "dateTo", e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div className="flex items-center gap-2 pb-0.5">
                          {dur ? (
                            <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                              {dur}
                            </span>
                          ) : null}
                          {form.intervals.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removeInterval(idx)}
                              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
                              aria-label="Удалить интервал"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className={`${divider} pt-6`}>
            <p className={`${sec} mb-3`}>Описание</p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="problem-text">
                  Проблема
                </label>
                <textarea
                  id="problem-text"
                  rows={3}
                  value={form.problem}
                  onChange={(e) => setField("problem", e.target.value)}
                  className={inputCls + " resize-y"}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="solution-text">
                  Меры / результат
                </label>
                <textarea
                  id="solution-text"
                  rows={3}
                  value={form.solution}
                  onChange={(e) => setField("solution", e.target.value)}
                  className={inputCls + " resize-y"}
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="in-msg">
                  Вх. письмо
                </label>
                <input
                  id="in-msg"
                  type="text"
                  value={form.inMessage}
                  onChange={(e) => setField("inMessage", e.target.value)}
                  className={inputCls}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="out-msg">
                  Исх. письмо
                </label>
                <input
                  id="out-msg"
                  type="text"
                  value={form.outMessage}
                  onChange={(e) => setField("outMessage", e.target.value)}
                  className={inputCls}
                  autoComplete="off"
                />
              </div>
            </div>
            </div>

            <div className={`${divider} pt-6`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className={sec}>Файлы</p>
              <label
                className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors ${
                  uploading || saving
                    ? "pointer-events-none bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                    : "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                }`}
              >
                {uploading ? (
                  <>
                    <IconSpinner className="h-4 w-4 shrink-0" />
                    Загрузка…
                  </>
                ) : (
                  <>
                    <IconPaperclip className="h-4 w-4 shrink-0" />
                    Прикрепить файл
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  disabled={uploading || saving}
                  onChange={handleFileInputChange}
                />
              </label>
            </div>
            {pendingFiles.length === 0 && files.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Нет вложений</p>
            ) : (
              <ul className="space-y-1">
                {pendingFiles.map((f, idx) => (
                  <li
                    key={`pending-${idx}-${f.name}-${f.size}`}
                    className="flex items-center justify-between gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900/50"
                  >
                    <span className="min-w-0 truncate text-gray-800 dark:text-gray-200">
                      {f.name}
                      <span className="text-gray-500 dark:text-gray-400"> · {formatFileSize(f.size)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removePendingFile(idx)}
                      className="shrink-0 text-gray-400 hover:text-red-600"
                      aria-label="Убрать"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
                {savedId
                  ? files.map((f) => (
                      <li
                        key={f.id}
                        className="flex items-center justify-between gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                      >
                        <span className="min-w-0 truncate text-gray-800 dark:text-gray-200">{f.fileName}</span>
                        <div className="flex shrink-0 gap-1">
                          {f.fileSize != null && f.fileSize > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(f.fileSize)}</span>
                          )}
                          <a
                            href={apiUrl(`incident-files/download/${f.id}`)}
                            download={f.fileName}
                            className="rounded p-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                            title="Скачать"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleFileDelete(f.id)}
                            className="rounded p-1 text-gray-400 hover:text-red-600"
                            title="Удалить"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))
                  : null}
              </ul>
            )}
            </div>
        </div>
      </form>
    </div>
  );
}
