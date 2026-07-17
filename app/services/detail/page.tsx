"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, apiUrl } from "../../lib/api";

interface Deployment {
  id: number;
  envNameRu: string;
  serverId: number;
  serverIp: string;
  serverDescription: string;
  statusId: number | null;
  statusNameRu: string | null;
  info: string | null;
  innerUrl: string | null;
  url: string | null;
  canSsh: boolean;
}

interface ServiceDetail {
  id: number;
  artifactId: string;
  name: string;
  description: string | null;
  developer: string | null;
  isMtszn: string | null;
  shepServiceId: string | null;
  smartBridgePage: string | null;
  urlProduction: string | null;
  urlTest: string | null;
  subsystemInout: string | null;
  projectName: string | null;
  schemaDatabase: string | null;
  featured: boolean;
  appTypeNameRu: string | null;
  interactionTypeNameRu: string | null;
  deployments: Deployment[];
}

function StatusBadge({ id, name }: { id: number | null; name: string | null }) {
  const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold";
  if (id === 3) return <span className={`${base} bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400`}><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{name}</span>;
  if (id === 2) return <span className={`${base} bg-slate-100 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400`}><span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />{name}</span>;
  if (id === 1) return <span className={`${base} bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400`}><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />{name}</span>;
  return <span className={`${base} bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400`}><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />Неизвестно</span>;
}

function logLineColor(line: string): string {
  const l = line.toLowerCase();
  if (/\b(error|exception|fatal|критическ|ошибк)\b/.test(l)) return "log-error";
  if (/\b(warn|warning|предупреждени)\b/.test(l)) return "log-warn";
  if (/\b(info|информац)\b/.test(l)) return "log-info";
  if (/\b(debug|trace)\b/.test(l)) return "log-debug";
  if (/\b(success|started|running|включ)\b/.test(l)) return "log-success";
  return "log-default";
}

function LogDialog({ dep, onClose }: { dep: Deployment; onClose: () => void }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [grep, setGrep] = useState("");
  const [running, setRunning] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [lineNumbers, setLineNumbers] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  const startStream = useCallback(() => {
    esRef.current?.close();
    setLogs([]); setRunning(true);
    const token = localStorage.getItem("authToken") ?? "";
    const base = apiUrl(`applications/deployments/${dep.id}/logs`);
    const grepParam = grep ? `grep=${encodeURIComponent(grep)}&` : "";
    const es = new EventSource(`${base}?${grepParam}token=${encodeURIComponent(token)}`);
    esRef.current = es;
    es.onmessage = e => { setLogs(p => [...p.slice(-999), e.data]); };
    es.onerror = () => { setRunning(false); es.close(); };
  }, [dep.id, grep]);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, autoScroll]);

  const stop = () => { esRef.current?.close(); setRunning(false); };
  useEffect(() => () => { esRef.current?.close(); }, []);

  const copyLogs = () => {
    navigator.clipboard.writeText(logs.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="det-modal-backdrop" onClick={onClose}>
      <div className="det-log-modal" onClick={e => e.stopPropagation()}>
        <div className="det-log-header">
          <div className="flex items-center gap-3">
            <div className="det-log-traffic">
              <span className="det-traffic-dot bg-red-500" onClick={onClose} title="Закрыть" />
              <span className="det-traffic-dot bg-amber-400" />
              <span className="det-traffic-dot bg-emerald-500" />
            </div>
            <div>
              <span className="text-[13px] font-semibold text-slate-200">Логи сервиса</span>
              <span className="text-[11px] text-slate-500 ml-2">{dep.serverIp}</span>
              <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${dep.envNameRu === "Бой" ? "bg-orange-500/20 text-orange-400" : "bg-sky-500/20 text-sky-400"}`}>{dep.envNameRu}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {logs.length > 0 && <span className="text-[11px] text-slate-500">{logs.length} строк</span>}
            <button onClick={onClose} className="det-log-close-btn">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="det-log-toolbar">
          <div className="det-log-grep-wrap flex-1">
            <svg className="det-log-grep-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={grep} onChange={e => setGrep(e.target.value)} placeholder="grep фильтр… (Enter для запуска)" className="det-log-grep" onKeyDown={e => e.key === "Enter" && startStream()} />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={startStream} disabled={running} className="det-log-run-btn">
              {running ? <><span className="det-log-pulse" />Стриминг…</> : <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>Запустить</>}
            </button>
            {running && <button onClick={stop} className="det-log-stop-btn"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>Стоп</button>}
          </div>
        </div>

        <div className="det-log-actions">
          <label className="det-log-toggle">
            <input type="checkbox" checked={lineNumbers} onChange={e => setLineNumbers(e.target.checked)} className="sr-only" />
            <span className={`det-log-toggle-track ${lineNumbers ? "det-log-toggle-on" : ""}`} />
            <span className="text-[11px] text-slate-500">№ строк</span>
          </label>
          <label className="det-log-toggle">
            <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="sr-only" />
            <span className={`det-log-toggle-track ${autoScroll ? "det-log-toggle-on" : ""}`} />
            <span className="text-[11px] text-slate-500">Автоскролл</span>
          </label>
          <div className="flex-1" />
          <button onClick={() => setLogs([])} disabled={logs.length === 0} className="det-log-action-btn">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Очистить
          </button>
          <button onClick={copyLogs} disabled={logs.length === 0} className="det-log-action-btn">
            {copied
              ? <><svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Скопировано</>
              : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Копировать</>}
          </button>
        </div>

        <div className="det-log-output" ref={boxRef}>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
              <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="text-[13px]">Нажмите «Запустить» для стриминга логов</span>
              {grep && <span className="text-[11px]">Фильтр: <span className="text-amber-400 font-mono">{grep}</span></span>}
            </div>
          ) : (
            <table className="det-log-table">
              <tbody>
                {logs.map((line, i) => (
                  <tr key={i} className={`det-log-row ${logLineColor(line)}`}>
                    {lineNumbers && <td className="det-log-num">{i + 1}</td>}
                    <td className="det-log-text">{line}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

function DeploymentCard({ dep, isAdmin, onStatusUpdate }: { dep: Deployment; isAdmin: boolean; onStatusUpdate: (d: Deployment) => void }) {
  const [busy, setBusy] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const refreshStatus = async () => {
    setBusy(true);
    try {
      const res = await apiFetch(`applications/deployments/${dep.id}/status`, { method: "POST" });
      if (res.ok) onStatusUpdate(await res.json());
    } catch { }
    finally { setBusy(false); }
  };

  const envColor = dep.envNameRu === "Бой" ? "border-orange-200 dark:border-orange-500/20" : "border-sky-200 dark:border-sky-500/20";

  return (
    <>
      <div className={`det-dep-card ${envColor}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`det-env-badge ${dep.envNameRu === "Бой" ? "det-env-prod" : "det-env-test"}`}>{dep.envNameRu}</span>
            <div className="min-w-0">
              <div className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">{dep.serverIp}</div>
              {dep.serverDescription && <div className="text-[11px] text-slate-400 truncate">{dep.serverDescription}</div>}
            </div>
          </div>
          <StatusBadge id={dep.statusId} name={dep.statusNameRu} />
        </div>

        {(dep.innerUrl || dep.url || dep.info) && (
          <div className="mt-3 space-y-1">
            {dep.innerUrl && <div className="text-[11px] text-slate-500 dark:text-slate-400"><span className="text-slate-400">Внутр.:</span> <a href={dep.innerUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{dep.innerUrl}</a></div>}
            {dep.url && <div className="text-[11px] text-slate-500 dark:text-slate-400"><span className="text-slate-400">URL:</span> <a href={dep.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{dep.url}</a></div>}
            {dep.info && <div className="text-[11px] text-slate-500 dark:text-slate-400"><span className="text-slate-400">Info:</span> {dep.info}</div>}
          </div>
        )}

        {dep.canSsh && isAdmin && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <button onClick={refreshStatus} disabled={busy} className="det-ssh-btn det-ssh-status" title="Обновить статус">
              {busy ? <span className="text-[10px]">…</span> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            </button>
            <button onClick={() => setLogOpen(true)} className="det-ssh-btn det-ssh-logs" title="Логи">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" /></svg>
            </button>
          </div>
        )}
      </div>
      {logOpen && <LogDialog dep={dep} onClose={() => setLogOpen(false)} />}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="det-info-row">
      <span className="det-info-label">{label}</span>
      <span className="det-info-value">{value}</span>
    </div>
  );
}

function ServiceDetailContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const router = useRouter();
  const [svc, setSvc] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("authUser") ?? "{}");
    setIsAdmin(u?.roles?.some((r: any) => ["ADMIN", "SUPER_ADMIN"].includes(r.code ?? r)));
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const res = await apiFetch(`applications/${id}`);
      if (!res.ok) throw new Error(await res.text());
      setSvc(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleStatusUpdate = (updated: Deployment) => {
    setSvc(s => s ? { ...s, deployments: s.deployments.map(d => d.id === updated.id ? { ...d, ...updated } : d) } : s);
  };

  if (!id) return <div className="px-6 py-8 text-slate-400 text-sm">ID не указан</div>;

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-slate-400 text-sm">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
      Загрузка…
    </div>
  );

  if (error) return (
    <div className="px-6 py-8">
      <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 text-red-600 dark:text-red-400 text-sm">{error}</div>
    </div>
  );

  if (!svc) return null;

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.back()} className="det-back-btn shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight">{svc.name || "—"}</h1>
              {svc.featured && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">Featured</span>}
              {svc.appTypeNameRu && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">{svc.appTypeNameRu}</span>}
              {svc.interactionTypeNameRu && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">{svc.interactionTypeNameRu}</span>}
            </div>
            <div className="font-mono text-[12px] text-slate-400 mt-0.5">{svc.artifactId}</div>
          </div>
        </div>
        {isAdmin && (
          <Link href={`/services/add?id=${svc.id}`} className="det-edit-btn shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Редактировать
          </Link>
        )}
      </div>

      <div className="det-layout">
        <div className="space-y-4">
          <div className="det-card">
            <div className="det-card-title">Сведения о сервисе</div>
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              <InfoRow label="ИС МТЗСН" value={svc.isMtszn} />
              <InfoRow label="Потребитель" value={svc.subsystemInout} />
              <InfoRow label="SHEP Service ID" value={svc.shepServiceId} />
              <InfoRow label="Проект" value={svc.projectName} />
              <InfoRow label="Разработчик" value={svc.developer} />
              <InfoRow label="Схема БД" value={svc.schemaDatabase} />
              {svc.urlProduction && (
                <div className="det-info-row">
                  <span className="det-info-label">URL (продакшн)</span>
                  <a href={svc.urlProduction} target="_blank" rel="noreferrer" className="det-info-value text-blue-500 hover:underline truncate">{svc.urlProduction}</a>
                </div>
              )}
              {svc.urlTest && (
                <div className="det-info-row">
                  <span className="det-info-label">URL (тест)</span>
                  <a href={svc.urlTest} target="_blank" rel="noreferrer" className="det-info-value text-blue-500 hover:underline truncate">{svc.urlTest}</a>
                </div>
              )}
              {svc.smartBridgePage && (
                <div className="det-info-row">
                  <span className="det-info-label">SmartBridge</span>
                  <a href={svc.smartBridgePage} target="_blank" rel="noreferrer" className="det-info-value text-blue-500 hover:underline truncate">{svc.smartBridgePage}</a>
                </div>
              )}
            </div>
          </div>
          {svc.description && (
            <div className="det-card">
              <div className="det-card-title">Описание</div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{svc.description}</p>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Развёртывания <span className="ml-1 text-[11px] font-normal text-slate-400">({svc.deployments.length})</span>
            </h2>
            <button onClick={load} className="det-icon-btn" title="Обновить">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
          {svc.deployments.length === 0
            ? <div className="det-card text-center py-8 text-slate-400 text-sm">Нет развёртываний</div>
            : <div className="space-y-3">{svc.deployments.map(d => <DeploymentCard key={d.id} dep={d} isAdmin={isAdmin} onStatusUpdate={handleStatusUpdate} />)}</div>}
        </div>
      </div>

      <style jsx global>{`
        .det-layout { display: grid; grid-template-columns: 360px 1fr; gap: 20px; align-items: start; }
        @media (max-width: 900px) { .det-layout { grid-template-columns: 1fr; } }
        .det-card { background: rgba(255,255,255,0.95); border: 1px solid rgba(226,232,240,0.8); border-radius: 16px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03); }
        html.dark .det-card { background: rgba(15,23,42,0.7); border-color: rgba(255,255,255,0.07); }
        .det-card-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; margin-bottom: 12px; }
        .det-info-row { display: flex; align-items: baseline; gap: 12px; padding: 8px 0; min-height: 34px; }
        .det-info-label { font-size: 11px; color: #94a3b8; min-width: 110px; flex-shrink: 0; }
        .det-info-value { font-size: 13px; color: #334155; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
        html.dark .det-info-value { color: #cbd5e1; }
        .det-dep-card { background: rgba(255,255,255,0.95); border: 1px solid; border-radius: 14px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: box-shadow 0.15s; }
        .det-dep-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        html.dark .det-dep-card { background: rgba(15,23,42,0.7); }
        .det-env-badge { display: inline-flex; align-items: center; border-radius: 8px; padding: 4px 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; flex-shrink: 0; }
        .det-env-prod { background: rgba(251,146,60,0.12); color: #ea580c; }
        html.dark .det-env-prod { background: rgba(251,146,60,0.15); color: #fb923c; }
        .det-env-test { background: rgba(14,165,233,0.1); color: #0284c7; }
        html.dark .det-env-test { background: rgba(14,165,233,0.12); color: #38bdf8; }
        .det-ssh-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 9px; border: 1px solid; cursor: pointer; transition: all 0.12s; background: transparent; }
        .det-ssh-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .det-ssh-status { border-color: rgba(99,102,241,0.3); color: #6366f1; background: rgba(99,102,241,0.08); }
        .det-ssh-status:hover:not(:disabled) { background: rgba(99,102,241,0.18); }
        .det-ssh-logs { border-color: rgba(14,165,233,0.3); color: #0284c7; background: rgba(14,165,233,0.08); }
        .det-ssh-logs:hover:not(:disabled) { background: rgba(14,165,233,0.18); }
        .det-back-btn { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; border: 1px solid rgba(226,232,240,0.9); background: rgba(255,255,255,0.9); color: #475569; cursor: pointer; transition: all 0.15s; }
        html.dark .det-back-btn { background: rgba(15,23,42,0.6); border-color: rgba(255,255,255,0.08); color: #94a3b8; }
        .det-back-btn:hover { border-color: rgba(37,99,235,0.3); color: #2563eb; }
        .det-edit-btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 12px; padding: 8px 16px; font-weight: 600; font-size: 12px; background: linear-gradient(135deg,#2563eb,#1e40af); color: white; box-shadow: 0 3px 10px rgba(37,99,235,0.3); transition: box-shadow 0.15s, transform 0.1s; text-decoration: none; }
        .det-edit-btn:hover { box-shadow: 0 5px 18px rgba(37,99,235,0.46); transform: translateY(-1px); }
        .det-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 8px; border: 1px solid rgba(226,232,240,0.9); background: rgba(255,255,255,0.9); color: #64748b; cursor: pointer; transition: all 0.15s; }
        html.dark .det-icon-btn { background: rgba(15,23,42,0.6); border-color: rgba(255,255,255,0.08); color: #94a3b8; }
        .det-icon-btn:hover { border-color: rgba(37,99,235,0.3); color: #2563eb; }
        .det-modal-backdrop { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 16px; }
        .det-log-modal { width: 100%; max-width: 920px; max-height: 90vh; display: flex; flex-direction: column; background: #0d1117; border-radius: 14px; overflow: hidden; box-shadow: 0 32px 100px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.08); }
        .det-log-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #161b22; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .det-log-traffic { display: flex; align-items: center; gap: 6px; margin-right: 4px; }
        .det-traffic-dot { width: 12px; height: 12px; border-radius: 50%; cursor: pointer; opacity: 0.85; transition: opacity 0.15s; }
        .det-traffic-dot:hover { opacity: 1; }
        .det-log-close-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 7px; border: none; background: rgba(255,255,255,0.07); color: #64748b; cursor: pointer; transition: all 0.15s; }
        .det-log-close-btn:hover { background: rgba(255,255,255,0.12); color: #e2e8f0; }
        .det-log-toolbar { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #161b22; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .det-log-grep-wrap { position: relative; }
        .det-log-grep-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; color: #475569; pointer-events: none; }
        .det-log-grep { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #e2e8f0; font-size: 12px; font-family: 'Courier New', monospace; padding: 7px 12px 7px 32px; outline: none; transition: border-color 0.15s; }
        .det-log-grep::placeholder { color: #475569; }
        .det-log-grep:focus { border-color: rgba(37,99,235,0.5); }
        .det-log-run-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; background: linear-gradient(135deg,#2563eb,#1e40af); color: white; border: none; cursor: pointer; white-space: nowrap; }
        .det-log-run-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .det-log-stop-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); cursor: pointer; white-space: nowrap; }
        .det-log-pulse { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; display: inline-block; animation: logPulse 1s infinite; }
        @keyframes logPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .det-log-actions { display: flex; align-items: center; gap: 10px; padding: 7px 14px; background: #0d1117; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .det-log-toggle { display: flex; align-items: center; gap: 6px; cursor: pointer; }
        .det-log-toggle-track { width: 28px; height: 16px; border-radius: 8px; background: rgba(255,255,255,0.1); position: relative; transition: background 0.2s; flex-shrink: 0; }
        .det-log-toggle-track::after { content: ''; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%; background: #64748b; transition: transform 0.2s, background 0.2s; }
        .det-log-toggle-on { background: rgba(37,99,235,0.4); }
        .det-log-toggle-on::after { transform: translateX(12px); background: #60a5fa; }
        .det-log-action-btn { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 7px; font-size: 11px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: #64748b; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .det-log-action-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: #94a3b8; }
        .det-log-action-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .det-log-output { flex: 1; overflow-y: auto; min-height: 380px; scrollbar-width: thin; scrollbar-color: #1e293b #0d1117; }
        .det-log-output::-webkit-scrollbar { width: 6px; }
        .det-log-output::-webkit-scrollbar-track { background: #0d1117; }
        .det-log-output::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        .det-log-table { width: 100%; border-collapse: collapse; }
        .det-log-row { transition: background 0.08s; }
        .det-log-row:hover { background: rgba(255,255,255,0.03); }
        .det-log-num { width: 48px; min-width: 48px; text-align: right; padding: 1px 10px 1px 8px; font-family: 'Courier New', monospace; font-size: 10px; color: #334155; user-select: none; border-right: 1px solid rgba(255,255,255,0.04); vertical-align: top; }
        .det-log-text { padding: 1px 14px; font-family: 'Courier New', monospace; font-size: 11.5px; line-height: 1.7; white-space: pre-wrap; word-break: break-all; vertical-align: top; }
        .log-error .det-log-text { color: #f87171; } .log-error .det-log-num { color: #7f1d1d; }
        .log-warn  .det-log-text { color: #fbbf24; } .log-warn  .det-log-num { color: #78350f; }
        .log-info  .det-log-text { color: #60a5fa; } .log-info  .det-log-num { color: #1e3a5f; }
        .log-debug .det-log-text { color: #6b7280; }
        .log-success .det-log-text { color: #4ade80; }
        .log-default .det-log-text { color: #94a3b8; }
      `}</style>
    </div>
  );
}

export default function ServiceDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-400 text-sm">Загрузка…</div>}>
      <ServiceDetailContent />
    </Suspense>
  );
}
