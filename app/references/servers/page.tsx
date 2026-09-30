"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { useLanguage } from "../../components/LanguageProvider";

interface Server {
  id: number;
  active: boolean | null;
  description: string | null;
  ip: string | null;
  envId: number | null;
  envNameRu: string | null;
  warnRam: number | null;
  warnDisk: number | null;
  critRam: number | null;
  critDisk: number | null;
}

interface Env {
  id: number;
  nameRu: string | null;
}

interface AuthUser { roles?: string[]; }

function isAdminOrSuperAdmin(u: AuthUser | null) {
  return (u?.roles ?? []).some(r => ["ADMIN", "SUPER_ADMIN"].includes(r));
}

export default function ServersReferencePage() {
  const { t } = useLanguage();
  const [items,       setItems]       = useState<Server[]>([]);
  const [envs,        setEnvs]        = useState<Env[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [showForm,    setShowForm]    = useState(false);
  const [editingId,   setEditingId]   = useState<number | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [search,      setSearch]      = useState("");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Server | null>(null);
  const [deleting,    setDeleting]    = useState(false);

  const [form, setForm] = useState({
    id: "", description: "", ip: "", envId: "", active: true,
    warnRam: "20", warnDisk: "50",
    critRam: "10", critDisk: "20",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("authUser");
      if (raw) setCurrentUser(JSON.parse(raw) as AuthUser);
    } catch {}
  }, []);

  const fetchItems = async () => {
    try {
      const res = await apiFetch("servers");
      if (!res.ok) throw new Error(t("common.error"));
      setItems(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    apiFetch("environments").then(r => r.ok ? r.json() : []).then(setEnvs).catch(() => {});
  }, []);

  const filtered = items.filter(s => {
    const q = search.toLowerCase();
    return (
      (s.description ?? "").toLowerCase().includes(q) ||
      (s.ip ?? "").toLowerCase().includes(q) ||
      (s.envNameRu ?? "").toLowerCase().includes(q)
    );
  });

  const resetForm = () => {
    setForm({ id: "", description: "", ip: "", envId: "", active: true,
      warnRam: "20", warnDisk: "50", critRam: "10", critDisk: "20" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (s: Server) => {
    setForm({
      id: String(s.id),
      description: s.description ?? "",
      ip: s.ip ?? "",
      envId: s.envId != null ? String(s.envId) : "",
      active: s.active !== false,
      warnRam: String(s.warnRam ?? 20),
      warnDisk: String(s.warnDisk ?? 50),
      critRam: String(s.critRam ?? 10),
      critDisk: String(s.critDisk ?? 20),
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId && !form.id) { alert(t("references.serverIdRequired")); return; }
    setSaving(true);
    const parseGb = (v: string) => { if (v === "") return null; const n = parseInt(v); return Number.isFinite(n) && n >= 0 ? n : null; };
    const body = {
      id: editingId ?? Number(form.id),
      description: form.description || null,
      ip: form.ip || null,
      envId: form.envId ? Number(form.envId) : null,
      active: form.active,
      warnRam:  parseGb(form.warnRam),
      warnDisk: parseGb(form.warnDisk),
      critRam:  parseGb(form.critRam),
      critDisk: parseGb(form.critDisk),
    };
    try {
      const path   = editingId ? `servers/${editingId}` : "servers";
      const method = editingId ? "PUT" : "POST";
      const res = await apiFetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { alert((await res.text()) || t("references.saveError")); setSaving(false); return; }
      resetForm();
      setLoading(true);
      await fetchItems();
    } catch { alert(t("references.saveError")); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`servers/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) { alert((await res.text()) || t("references.deleteError")); return; }
      setItems(prev => prev.filter(s => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { alert(t("references.deleteError")); }
    finally { setDeleting(false); }
  };

  const isAdmin = isAdminOrSuperAdmin(currentUser);

  return (
    <div className="px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">{t("references.serversRefTitle")}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t("references.serversRefSubtitle")}</p>
        </div>
        {isAdmin && !showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
            {t("common.add")}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <form onSubmit={handleSubmit}
          className="mb-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-5">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            {editingId ? t("references.editing") : t("references.serversRefNew")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {!editingId && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">ID <span className="text-red-500">*</span></label>
                <input type="number" required value={form.id}
                  onChange={e => setForm({ ...form, id: e.target.value })}
                  placeholder="Напр. 10"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t("references.serverDescLabel")}</label>
              <input type="text" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Напр. web-server-01"
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t("references.serverIpLabel")}</label>
              <input type="text" value={form.ip}
                onChange={e => setForm({ ...form, ip: e.target.value })}
                placeholder="Напр. 192.168.1.10"
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t("servers.environment")}</label>
              <select value={form.envId} onChange={e => setForm({ ...form, envId: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500">
                <option value="">{t("common.selectPlaceholder")}</option>
                {envs.map(env => (
                  <option key={env.id} value={env.id}>{env.nameRu ?? `${t("servers.environment")} ${env.id}`}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="srv-active" checked={form.active}
                onChange={e => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 accent-blue-600" />
              <label htmlFor="srv-active" className="text-sm text-gray-700 dark:text-gray-300">{t("users.active")}</label>
            </div>
          </div>

          {/* Пороги предупреждений */}
          <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Пороги предупреждений — свободно ГБ
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">Предупреждение / критично когда свободно <b>меньше</b> указанного значения</p>
            <div className="grid grid-cols-3 gap-x-4 gap-y-3">
              <div />
              <div className="text-center text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />Предупреждение
              </div>
              <div className="text-center text-[11px] font-semibold text-red-600 dark:text-red-400 flex items-center justify-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500" />Критический
              </div>
              {[
                { label: "ОЗУ", warn: "warnRam", crit: "critRam" },
                { label: "Диск", warn: "warnDisk", crit: "critDisk" },
              ].map(({ label, warn, crit }) => (
                <>
                  <div key={label} className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">{label}</div>
                  <div key={warn}>
                    <div className="relative">
                      <input type="number" min={0} max={9999} value={form[warn as keyof typeof form] as string}
                        onChange={e => setForm({ ...form, [warn]: e.target.value })}
                        className="block w-full px-3 py-2 pr-10 border border-amber-300 dark:border-amber-700/60 rounded bg-amber-50 dark:bg-amber-900/10 text-gray-900 dark:text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-amber-400" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">ГБ</span>
                    </div>
                  </div>
                  <div key={crit}>
                    <div className="relative">
                      <input type="number" min={0} max={9999} value={form[crit as keyof typeof form] as string}
                        onChange={e => setForm({ ...form, [crit]: e.target.value })}
                        className="block w-full px-3 py-2 pr-10 border border-red-300 dark:border-red-700/60 rounded bg-red-50 dark:bg-red-900/10 text-gray-900 dark:text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-red-400" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">ГБ</span>
                    </div>
                  </div>
                </>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50">
              {saving ? t("references.saving") : editingId ? t("common.save") : t("references.create")}
            </button>
            <button type="button" onClick={resetForm}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              {t("common.cancel")}
            </button>
          </div>
        </form>
      )}

      {!showForm && (
        <div className="mb-4">
          <input type="text" placeholder={t("references.searchPlaceholder")}
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500" />
        </div>
      )}

      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</p>}
      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{error}</div>
      )}

      {!loading && !error && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("common.description")}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("servers.environment")}</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">{t("common.status")}</th>
                {isAdmin && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">{t("references.actions")}</th>}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t("references.notFound")}
                  </td>
                </tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-4 py-3 text-center text-sm font-mono text-gray-500 dark:text-gray-400">{s.id}</td>
                  <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">{s.description || "—"}</td>
                  <td className="px-6 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">{s.ip || "—"}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{s.envNameRu || "—"}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.active !== false
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}>
                      {s.active !== false ? t("users.active") : t("users.inactive")}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(s)} title={t("references.editing")}
                          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => setDeleteTarget(s)} title={t("common.delete")}
                          className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/15">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{t("references.serversRefDeleteConfirm")}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {deleteTarget.description || deleteTarget.ip || `ID ${deleteTarget.id}`}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{t("common.irreversible")}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40">
                {t("common.cancel")}
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50">
                {deleting ? t("common.deleting") : t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
