"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";

interface Application {
  id: number;
  artifactId: string;
  name: string;
  description: string | null;
  developer: string | null;
  featured: boolean;
  isMtszn: string | null;
  shepServiceId: string | null;
  smartBridgePage: string | null;
  urlProduction: string | null;
  urlTest: string | null;
  appTypeNameRu: string | null;
  appTypeId: number | null;
  interactionTypeNameRu: string | null;
  deployments: { id: number; envNameRu: string; serverIp: string; statusNameRu: string | null }[];
}

const PAGE_SIZE = 20;

function DeleteConfirmModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="reg-modal-backdrop" onClick={onCancel}>
      <div className="reg-confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="reg-confirm-icon">
          <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mt-3 mb-1">Удалить сервис?</h3>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 text-center mb-1">Запись будет удалена из базы данных.</p>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-5">«{name}»</p>
        <div className="flex gap-3 w-full">
          <button onClick={onCancel} className="reg-confirm-cancel flex-1">Отмена</button>
          <button onClick={onConfirm} className="reg-confirm-ok flex-1">Удалить</button>
        </div>
      </div>
    </div>
  );
}

export default function ServicesRegistryPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterEnv, setFilterEnv] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

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
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // reset page on filter change
  useEffect(() => { setPage(1); }, [search, filterType, filterEnv]);

  const handleDelete = async (id: number) => {
    setConfirmDelete(null);
    setDeleting(id);
    try {
      const res = await apiFetch(`applications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setApps(prev => prev.filter(a => a.id !== id));
    } catch (e: any) { alert("Ошибка: " + e.message); }
    finally { setDeleting(null); }
  };

  // unique app types and envs for filter dropdowns
  const allTypes = Array.from(new Set(apps.map(a => a.appTypeNameRu).filter(Boolean))) as string[];
  const allEnvs = Array.from(new Set(apps.flatMap(a => a.deployments.map(d => d.envNameRu)).filter(Boolean))) as string[];

  const filtered = apps.filter(a => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !a.name?.toLowerCase().includes(q) &&
        !a.artifactId?.toLowerCase().includes(q) &&
        !a.shepServiceId?.toLowerCase().includes(q) &&
        !a.isMtszn?.toLowerCase().includes(q)
      ) return false;
    }
    if (filterType && a.appTypeNameRu !== filterType) return false;
    if (filterEnv && !a.deployments.some(d => d.envNameRu === filterEnv)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Реестр сервисов</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {filtered.length} из {apps.length} сервисов
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="reg-btn-icon" title="Обновить">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {isAdmin && (
            <Link href="/services/add" className="reg-btn-primary">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Добавить
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="reg-filters mb-4">
        <div className="reg-search-wrap">
          <svg className="reg-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию, Artifact ID, SHEP ID…"
            className="reg-search"
          />
          {search && (
            <button onClick={() => setSearch("")} className="reg-search-clear">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="reg-filter-select">
          <option value="">Все типы</option>
          {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterEnv} onChange={e => setFilterEnv(e.target.value)} className="reg-filter-select">
          <option value="">Все окружения</option>
          {allEnvs.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        {(search || filterType || filterEnv) && (
          <button onClick={() => { setSearch(""); setFilterType(""); setFilterEnv(""); }} className="reg-clear-btn">
            Сбросить
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400 text-sm">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Загрузка…
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      {!loading && !error && (
        <>
          {/* Table */}
          <div className="reg-table-wrap">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="reg-thead-row">
                    <th className="text-left px-4 py-3 font-semibold w-10">#</th>
                    <th className="text-left px-4 py-3 font-semibold">Название / Artifact ID</th>
                    <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">ИС МТЗСН</th>
                    <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">SHEP ID</th>
                    <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Тип</th>
                    <th className="text-left px-4 py-3 font-semibold hidden xl:table-cell">Взаимодействие</th>
                    <th className="text-left px-4 py-3 font-semibold">Окружения</th>
                    <th className="px-4 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-slate-400">
                        <svg className="w-8 h-8 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Сервисы не найдены
                      </td>
                    </tr>
                  ) : paginated.map((app, idx) => (
                    <tr key={app.id} className={`reg-row ${idx % 2 === 0 ? "reg-row-a" : "reg-row-b"}`}>
                      <td className="px-4 py-3 text-slate-400 tabular-nums">{app.id}</td>
                      <td className="px-4 py-3 min-w-48">
                        <div className="font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                          {app.featured && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 mb-0.5" title="Featured" />}
                          {app.name || "—"}
                        </div>
                        {app.artifactId && (
                          <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-56">{app.artifactId}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-slate-500 dark:text-slate-400 line-clamp-2 max-w-40">{app.isMtszn || "—"}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-slate-400 dark:text-slate-500 text-[11px] font-mono">{app.shepServiceId || "—"}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {app.appTypeNameRu
                          ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 whitespace-nowrap">{app.appTypeNameRu}</span>
                          : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        {app.interactionTypeNameRu
                          ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400 whitespace-nowrap">{app.interactionTypeNameRu}</span>
                          : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {app.deployments?.length > 0 ? app.deployments.map(d => (
                            <span key={d.id} className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold whitespace-nowrap ${d.envNameRu === "Бой" ? "bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-400" : "bg-sky-50 text-sky-500 dark:bg-sky-500/10 dark:text-sky-400"}`}>
                              {d.envNameRu} · {d.serverIp}
                            </span>
                          )) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link href={`/services/detail?id=${app.id}`} className="reg-action-detail" title="Подробнее">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </Link>
                          {isAdmin && (
                            <>
                              <Link href={`/services/add?id=${app.id}`} className="reg-action-edit" title="Редактировать">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Link>
                              <button
                                onClick={() => setConfirmDelete({ id: app.id, name: app.name })}
                                disabled={deleting === app.id}
                                className="reg-action-delete"
                                title="Удалить"
                              >
                                {deleting === app.id
                                  ? <span className="text-[10px]">…</span>
                                  : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                }
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <span className="text-xs text-slate-400">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} из {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="reg-page-btn"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce<(number | "...")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`e${i}`} className="reg-page-ellipsis">…</span>
                    ) : (
                      <button key={p} onClick={() => setPage(p as number)} className={`reg-page-btn ${page === p ? "reg-page-active" : ""}`}>
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="reg-page-btn"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {confirmDelete && (
        <DeleteConfirmModal
          name={confirmDelete.name}
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <style jsx global>{`
        .reg-table-wrap {
          background: rgba(255,255,255,0.95);
          border: 1px solid rgba(226,232,240,0.8);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04);
        }
        html.dark .reg-table-wrap {
          background: rgba(15,23,42,0.7);
          border-color: rgba(255,255,255,0.07);
        }
        .reg-thead-row {
          background: rgba(248,250,252,1);
          font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em;
          color: #94a3b8; border-bottom: 1px solid rgba(226,232,240,0.9);
        }
        html.dark .reg-thead-row { background: rgba(15,23,42,0.9); border-color: rgba(255,255,255,0.07); }
        .reg-row { border-bottom: 1px solid rgba(226,232,240,0.45); transition: background 0.1s; }
        .reg-row:last-child { border-bottom: none; }
        .reg-row-a { background: transparent; }
        .reg-row-b { background: rgba(248,250,252,0.6); }
        html.dark .reg-row-b { background: rgba(255,255,255,0.018); }
        html.dark .reg-row { border-color: rgba(255,255,255,0.04); }
        .reg-row:hover { background: rgba(37,99,235,0.04) !important; }

        .reg-filters {
          display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
        }
        .reg-search-wrap {
          position: relative; flex: 1; min-width: 200px;
        }
        .reg-search-icon {
          position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
          width: 15px; height: 15px; color: #94a3b8; pointer-events: none;
        }
        .reg-search {
          width: 100%; border-radius: 12px;
          border: 1px solid rgba(226,232,240,0.9);
          background: rgba(255,255,255,0.95); color: #1e293b;
          font-size: 13px; padding: 8px 32px 8px 34px; outline: none;
          transition: box-shadow 0.15s, border-color 0.15s;
        }
        html.dark .reg-search { background: rgba(15,23,42,0.7); border-color: rgba(255,255,255,0.09); color: #e2e8f0; }
        .reg-search:focus { box-shadow: 0 0 0 3px rgba(37,99,235,0.12); border-color: rgba(37,99,235,0.35); }
        .reg-search-clear {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          color: #94a3b8; background: none; border: none; cursor: pointer; padding: 2px;
          display: flex; align-items: center;
        }
        .reg-search-clear:hover { color: #475569; }
        .reg-filter-select {
          border-radius: 12px; border: 1px solid rgba(226,232,240,0.9);
          background: rgba(255,255,255,0.95); color: #475569;
          font-size: 12px; padding: 8px 12px; outline: none; cursor: pointer;
          transition: box-shadow 0.15s;
        }
        html.dark .reg-filter-select { background: rgba(15,23,42,0.7); border-color: rgba(255,255,255,0.09); color: #94a3b8; }
        .reg-filter-select:focus { box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
        .reg-clear-btn {
          font-size: 12px; color: #64748b; background: none; border: none;
          cursor: pointer; padding: 4px 8px; border-radius: 8px; transition: color 0.15s;
        }
        html.dark .reg-clear-btn { color: #94a3b8; }
        .reg-clear-btn:hover { color: #2563eb; }

        .reg-btn-primary {
          display: inline-flex; align-items: center; gap: 5px;
          border-radius: 12px; padding: 8px 14px; font-weight: 600; font-size: 12px;
          background: linear-gradient(135deg,#2563eb,#1e40af);
          color: white; box-shadow: 0 3px 10px rgba(37,99,235,0.3);
          transition: box-shadow 0.15s, transform 0.1s; text-decoration: none;
        }
        .reg-btn-primary:hover { box-shadow: 0 5px 18px rgba(37,99,235,0.46); transform: translateY(-1px); }
        .reg-btn-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 10px;
          border: 1px solid rgba(226,232,240,0.9);
          background: rgba(255,255,255,0.9); color: #64748b; cursor: pointer;
          transition: all 0.15s;
        }
        html.dark .reg-btn-icon { background: rgba(15,23,42,0.6); border-color: rgba(255,255,255,0.08); color: #94a3b8; }
        .reg-btn-icon:hover { border-color: rgba(37,99,235,0.3); color: #2563eb; }

        .reg-action-detail {
          display: inline-flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 8px;
          border: 1px solid rgba(99,102,241,0.2); color: #6366f1;
          background: rgba(99,102,241,0.06); transition: all 0.12s; text-decoration: none;
        }
        .reg-action-detail:hover { background: rgba(99,102,241,0.15); }
        .reg-action-edit {
          display: inline-flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 8px;
          border: 1px solid rgba(37,99,235,0.2); color: #2563eb;
          background: rgba(37,99,235,0.06); transition: all 0.12s; text-decoration: none;
        }
        .reg-action-edit:hover { background: rgba(37,99,235,0.15); }
        .reg-action-delete {
          display: inline-flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 8px; cursor: pointer;
          border: 1px solid rgba(239,68,68,0.2); color: #dc2626;
          background: rgba(239,68,68,0.06); transition: all 0.12s;
        }
        .reg-action-delete:hover:not(:disabled) { background: rgba(239,68,68,0.15); }
        .reg-action-delete:disabled { opacity: 0.4; cursor: not-allowed; }

        .reg-page-btn {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 30px; height: 30px; border-radius: 8px; font-size: 12px;
          border: 1px solid rgba(226,232,240,0.9); background: rgba(255,255,255,0.9);
          color: #475569; cursor: pointer; transition: all 0.12s; padding: 0 6px;
        }
        html.dark .reg-page-btn { background: rgba(15,23,42,0.6); border-color: rgba(255,255,255,0.08); color: #94a3b8; }
        .reg-page-btn:hover:not(:disabled) { border-color: rgba(37,99,235,0.35); color: #2563eb; }
        .reg-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .reg-page-active {
          background: linear-gradient(135deg,#2563eb,#1e40af) !important;
          color: white !important; border-color: transparent !important;
          box-shadow: 0 2px 8px rgba(37,99,235,0.35);
        }
        .reg-page-ellipsis {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 30px; height: 30px; color: #94a3b8; font-size: 12px;
        }
        .reg-modal-backdrop {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        .reg-confirm-modal {
          background: #fff; border-radius: 20px; padding: 28px 24px 24px;
          width: 100%; max-width: 340px; display: flex; flex-direction: column;
          align-items: center; box-shadow: 0 24px 80px rgba(0,0,0,0.25);
        }
        html.dark .reg-confirm-modal { background: #1e293b; }
        .reg-confirm-icon {
          width: 56px; height: 56px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(239,68,68,0.1);
        }
        html.dark .reg-confirm-icon { background: rgba(239,68,68,0.15); }
        .reg-confirm-cancel {
          padding: 10px 0; border-radius: 12px; font-size: 13px; font-weight: 500;
          border: 1px solid rgba(226,232,240,0.9);
          background: rgba(255,255,255,0.9); color: #475569; cursor: pointer; transition: all 0.15s;
        }
        html.dark .reg-confirm-cancel { background: rgba(30,41,59,0.7); border-color: rgba(255,255,255,0.1); color: #94a3b8; }
        .reg-confirm-cancel:hover { border-color: rgba(100,116,139,0.5); }
        .reg-confirm-ok {
          padding: 10px 0; border-radius: 12px; font-size: 13px; font-weight: 600;
          border: none; color: white; cursor: pointer; transition: all 0.15s;
          background: #dc2626; box-shadow: 0 3px 10px rgba(220,38,38,0.3);
        }
        .reg-confirm-ok:hover { background: #b91c1c; transform: translateY(-1px); }
      `}</style>
    </div>
  );
}
