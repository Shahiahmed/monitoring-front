"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch, apiUrl } from "../lib/api";
import { useLanguage } from "../components/LanguageProvider";

// ── Types ──────────────────────────────────────────────────────────────────

interface DicStatus { id: number; nameRu: string; }

interface Deployment {
  id: number;
  applicationId: number;
  applicationName: string;
  artifactId: string;
  envId: number;
  envNameRu: string;
  serverId: number;
  serverIp: string;
  serverDescription: string;
  statusId: number | null;
  statusNameRu: string | null;
  info: string | null;
  url: string | null;
  canSsh: boolean;
}

interface Application {
  id: number;
  artifactId: string;
  name: string;
  description: string | null;
  developer: string | null;
  appTypeNameRu: string | null;
  interactionTypeNameRu: string | null;
  urlProduction: string | null;
  deployments: Deployment[];
}

// ── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ statusId, statusNameRu }: { statusId: number | null; statusNameRu: string | null }) {
  if (!statusId) return <span className="svc-badge svc-badge-unknown">—</span>;
  if (statusId === 3) return <span className="svc-badge svc-badge-active">{statusNameRu}</span>;
  if (statusId === 2) return <span className="svc-badge svc-badge-inactive">{statusNameRu}</span>;
  if (statusId === 1) return <span className="svc-badge svc-badge-failed">{statusNameRu}</span>;
  return <span className="svc-badge svc-badge-unknown">{statusNameRu ?? "—"}</span>;
}

// ── Log Dialog ─────────────────────────────────────────────────────────────

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
  const { t } = useLanguage();
  const [logs, setLogs] = useState<string[]>([]);
  const [grep, setGrep] = useState("");
  const [running, setRunning] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  const startStream = useCallback(() => {
    esRef.current?.close();
    setLogs([]); setRunning(true);
    const token = localStorage.getItem("authToken") ?? "";
    const base = apiUrl(`applications/deployments/${dep.id}/logs`);
    const grepParam = grep ? `grep=${encodeURIComponent(grep)}&` : "";
    const es = new EventSource(`${base}?${grepParam}token=${encodeURIComponent(token)}`);
    esRef.current = es;
    es.onmessage = e => setLogs(p => [...p.slice(-999), e.data]);
    es.onerror = () => { setRunning(false); es.close(); };
  }, [dep.id, grep]);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, autoScroll]);

  useEffect(() => () => { esRef.current?.close(); }, []);

  const stop = () => { esRef.current?.close(); setRunning(false); };
  const copyLogs = () => { navigator.clipboard.writeText(logs.join("\n")); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="det-modal-backdrop" onClick={onClose}>
      <div className="det-log-modal" onClick={e => e.stopPropagation()}>
        <div className="det-log-header">
          <div className="flex items-center gap-3">
            <div className="det-log-traffic">
              <span className="det-traffic-dot bg-red-500" onClick={onClose} title={t("common.close")} />
              <span className="det-traffic-dot bg-amber-400" />
              <span className="det-traffic-dot bg-emerald-500" />
            </div>
            <div>
              <span className="text-[13px] font-semibold text-slate-200">{dep.applicationName}</span>
              <span className="text-[11px] text-slate-500 ml-2">{dep.serverIp}</span>
              <span className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${dep.envNameRu === "Бой" ? "bg-orange-500/20 text-orange-400" : "bg-sky-500/20 text-sky-400"}`}>{dep.envNameRu}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {logs.length > 0 && <span className="text-[11px] text-slate-500">{logs.length} {t("services.rowCount")}</span>}
            <button onClick={onClose} className="det-log-close-btn">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="det-log-toolbar">
          <div className="det-log-grep-wrap" style={{flex:1}}>
            <svg className="det-log-grep-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={grep} onChange={e => setGrep(e.target.value)} placeholder={t("services.grepPlaceholder")} className="det-log-grep" onKeyDown={e => e.key === "Enter" && startStream()} />
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={startStream} disabled={running} className="det-log-run-btn">
              {running ? <><span className="det-log-pulse" />{t("services.streaming")}</> : <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>{t("services.run")}</>}
            </button>
            {running && <button onClick={stop} className="det-log-stop-btn"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>{t("services.stop")}</button>}
          </div>
        </div>

        <div className="det-log-actions">
          <label className="det-log-toggle">
            <input type="checkbox" checked={lineNumbers} onChange={e => setLineNumbers(e.target.checked)} className="sr-only" />
            <span className={`det-log-toggle-track ${lineNumbers ? "det-log-toggle-on" : ""}`} />
            <span className="text-[11px] text-slate-500">{t("services.lineNumbers")}</span>
          </label>
          <label className="det-log-toggle">
            <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="sr-only" />
            <span className={`det-log-toggle-track ${autoScroll ? "det-log-toggle-on" : ""}`} />
            <span className="text-[11px] text-slate-500">{t("services.autoScroll")}</span>
          </label>
          <div className="flex-1" />
          <button onClick={() => setLogs([])} disabled={logs.length === 0} className="det-log-action-btn">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            {t("services.clear")}
          </button>
          <button onClick={copyLogs} disabled={logs.length === 0} className="det-log-action-btn">
            {copied
              ? <><svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{t("services.copied")}</>
              : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>{t("services.copy")}</>}
          </button>
        </div>

        <div className="det-log-output">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
              <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="text-[13px]">{t("services.startStreaming")}</span>
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

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const { t } = useLanguage();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [envFilter, setEnvFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const [logDep, setLogDep] = useState<Deployment | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("authUser") ?? "{}");
    setIsAdmin(u?.roles?.some((r: any) => ["ADMIN", "SUPER_ADMIN"].includes(r.code ?? r)));
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await apiFetch("applications");
      if (!res.ok) throw new Error(await res.text());
      setApps(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = (id: number) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const refreshStatus = async (dep: Deployment) => {
    setBusy(prev => new Set(prev).add(dep.id));
    try {
      const res = await apiFetch(`applications/deployments/${dep.id}/status`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const updated: Deployment = await res.json();
      setApps(prev => prev.map(app => ({
        ...app,
        deployments: app.deployments.map(d => d.id === dep.id ? { ...d, ...updated } : d)
      })));
    } catch (e: any) {
      alert(t("common.error") + ": " + e.message);
    } finally {
      setBusy(prev => { const s = new Set(prev); s.delete(dep.id); return s; });
    }
  };

  const filtered = apps.filter(app => {
    const matchSearch = !search || app.name?.toLowerCase().includes(search.toLowerCase())
      || app.artifactId?.toLowerCase().includes(search.toLowerCase());
    const matchEnv = envFilter === "all" || app.deployments.some(d => String(d.envId) === envFilter);
    return matchSearch && matchEnv;
  });

  return (
    <div className="px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{t("services.title")}</h1>
          <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">
            {t("services.subtitle")}
          </p>
        </div>
        <button onClick={load} className="svc-refresh-btn text-xs flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t("services.refresh")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("services.searchPlaceholder")}
          className="svc-search flex-1 min-w-48"
        />
        <select value={envFilter} onChange={e => setEnvFilter(e.target.value)} className="svc-select">
          <option value="all">{t("services.allEnvs")}</option>
          <option value="1">{t("services.test")}</option>
          <option value="2">{t("services.prod")}</option>
        </select>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex justify-center py-16 text-slate-400 text-sm">{t("services.loading")}</div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm">{t("services.noServices")}</div>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-3">
          {filtered.map(app => {
            const visibleDeps = envFilter === "all"
              ? app.deployments
              : app.deployments.filter(d => String(d.envId) === envFilter);
            const isOpen = expanded.has(app.id);
            return (
              <div key={app.id} className="svc-card rounded-2xl overflow-hidden">
                {/* App header row */}
                <button
                  onClick={() => toggleExpand(app.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/60 dark:hover:bg-white/3 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{app.name || "—"}</span>
                      {app.artifactId && (
                        <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">{app.artifactId}</span>
                      )}
                      {app.appTypeNameRu && (
                        <span className="text-[10px] bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">{app.appTypeNameRu}</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                      {app.description || t("services.noDescription")}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-slate-400">{visibleDeps.length} {t("services.deploymentsShort")}</span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Deployments table */}
                {isOpen && visibleDeps.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-700/50 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-800/40 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          <th className="px-4 py-2.5 text-left font-semibold">{t("services.envCol")}</th>
                          <th className="px-4 py-2.5 text-left font-semibold">{t("services.serverCol")}</th>
                          <th className="px-4 py-2.5 text-left font-semibold">{t("services.statusCol")}</th>
                          <th className="px-4 py-2.5 text-left font-semibold">{t("services.urlCol")}</th>
                          {isAdmin && <th className="px-4 py-2.5 text-left font-semibold">{t("services.actionsCol")}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleDeps.map((dep, idx) => {
                          const isBusy = busy.has(dep.id);
                          return (
                            <tr key={dep.id} className={`border-t border-slate-100 dark:border-slate-700/30 ${idx % 2 === 0 ? "" : "bg-slate-50/30 dark:bg-white/1.5"}`}>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${dep.envId === 2 ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400" : "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"}`}>
                                  {dep.envNameRu}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-mono text-slate-600 dark:text-slate-300">{dep.serverIp}</span>
                                {dep.serverDescription && <span className="text-slate-400 dark:text-slate-500 ml-1">({dep.serverDescription})</span>}
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge statusId={dep.statusId} statusNameRu={dep.statusNameRu} />
                              </td>
                              <td className="px-4 py-3">
                                {dep.url
                                  ? <span className="text-slate-500 dark:text-slate-400 truncate max-w-48 block">{dep.url}</span>
                                  : <span className="text-slate-300 dark:text-slate-600">—</span>}
                              </td>
                              {isAdmin && (
                                <td className="px-4 py-3">
                                  {dep.canSsh ? (
                                    <div className="flex items-center gap-1.5">
                                      <button disabled={isBusy} onClick={() => refreshStatus(dep)}
                                              title={t("services.refreshStatus")} className="svc-action-btn svc-action-status">
                                        {isBusy ? "…" : "⟳"}
                                      </button>
                                      <button onClick={() => setLogDep(dep)}
                                              title={t("services.logs")} className="svc-action-btn svc-action-logs">
                                        ≡
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600 text-[10px]">{t("services.noSsh")}</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {isOpen && visibleDeps.length === 0 && (
                  <div className="px-5 py-4 text-[12px] text-slate-400 border-t border-slate-100 dark:border-slate-700/50">
                    {t("services.noDeployments")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {logDep && <LogDialog dep={logDep} onClose={() => setLogDep(null)} />}

      <style jsx global>{`
        .svc-card {
          background: rgba(255,255,255,0.9);
          border: 1px solid rgba(226,232,240,0.9);
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);
        }
        html.dark .svc-card {
          background: rgba(15,23,42,0.6);
          border: 1px solid rgba(255,255,255,0.07);
        }
        .svc-search {
          border-radius: 12px; border: 1px solid rgba(226,232,240,0.9);
          background: rgba(255,255,255,0.9); color: #1e293b;
          font-size: 13px; padding: 8px 14px; outline: none;
          transition: box-shadow 0.15s;
        }
        html.dark .svc-search { background: rgba(15,23,42,0.6); border-color: rgba(255,255,255,0.08); color: #e2e8f0; }
        .svc-search:focus { box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
        .svc-select {
          border-radius: 12px; border: 1px solid rgba(226,232,240,0.9);
          background: rgba(255,255,255,0.9); color: #1e293b;
          font-size: 13px; padding: 8px 14px; outline: none; cursor: pointer;
        }
        html.dark .svc-select { background: rgba(15,23,42,0.6); border-color: rgba(255,255,255,0.08); color: #e2e8f0; }
        .svc-refresh-btn {
          border-radius: 12px; border: 1px solid rgba(226,232,240,0.9);
          background: rgba(255,255,255,0.9); color: #475569;
          padding: 8px 14px; cursor: pointer; transition: all 0.15s;
        }
        html.dark .svc-refresh-btn { background: rgba(15,23,42,0.6); border-color: rgba(255,255,255,0.08); color: #94a3b8; }
        .svc-refresh-btn:hover { background: rgba(37,99,235,0.06); border-color: rgba(37,99,235,0.2); color: #2563eb; }
        /* Status badges */
        .svc-badge { display: inline-flex; align-items: center; border-radius: 9999px; padding: 2px 8px; font-size: 10px; font-weight: 600; }
        .svc-badge-active   { background: rgba(16,185,129,0.1); color: #059669; }
        .svc-badge-inactive { background: rgba(100,116,139,0.1); color: #64748b; }
        .svc-badge-failed   { background: rgba(239,68,68,0.1); color: #dc2626; }
        .svc-badge-unknown  { background: rgba(245,158,11,0.1); color: #d97706; }
        html.dark .svc-badge-active   { background: rgba(16,185,129,0.15); color: #34d399; }
        html.dark .svc-badge-inactive { background: rgba(100,116,139,0.15); color: #94a3b8; }
        html.dark .svc-badge-failed   { background: rgba(239,68,68,0.15); color: #f87171; }
        html.dark .svc-badge-unknown  { background: rgba(245,158,11,0.15); color: #fbbf24; }
        /* Action buttons */
        .svc-action-btn {
          width: 28px; height: 28px; border-radius: 8px; border: 1px solid;
          font-size: 13px; cursor: pointer; display: inline-flex; align-items: center;
          justify-content: center; transition: all 0.12s; font-weight: bold;
        }
        .svc-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .svc-action-status { border-color: rgba(99,102,241,0.35); color: #6366f1; background: rgba(99,102,241,0.07); }
        .svc-action-status:hover:not(:disabled) { background: rgba(99,102,241,0.18); }
        .svc-action-logs { border-color: rgba(14,165,233,0.35); color: #0284c7; background: rgba(14,165,233,0.07); }
        .svc-action-logs:hover { background: rgba(14,165,233,0.18); }
        /* Log terminal */
        .det-modal-backdrop { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 16px; }
        .det-log-modal { width: 100%; max-width: 920px; max-height: 90vh; display: flex; flex-direction: column; background: #0d1117; border-radius: 14px; overflow: hidden; box-shadow: 0 32px 100px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.08); }
        .det-log-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #161b22; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .det-log-traffic { display: flex; align-items: center; gap: 6px; margin-right: 4px; }
        .det-traffic-dot { width: 12px; height: 12px; border-radius: 50%; cursor: pointer; opacity: 0.85; transition: opacity 0.15s; }
        .det-traffic-dot:hover { opacity: 1; }
        .det-log-close-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 7px; border: none; background: rgba(255,255,255,0.07); color: #64748b; cursor: pointer; }
        .det-log-close-btn:hover { background: rgba(255,255,255,0.12); color: #e2e8f0; }
        .det-log-toolbar { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #161b22; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .det-log-grep-wrap { position: relative; }
        .det-log-grep-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; color: #475569; pointer-events: none; }
        .det-log-grep { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #e2e8f0; font-size: 12px; font-family: 'Courier New', monospace; padding: 7px 12px 7px 32px; outline: none; }
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
