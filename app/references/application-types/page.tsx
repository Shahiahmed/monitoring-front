"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { useLanguage } from "../../components/LanguageProvider";

interface AppType {
  id: number;
  nameEn: string | null;
  nameKz: string | null;
  nameRu: string | null;
}

function isAdminOrSuperAdmin(roles: string[]): boolean {
  return roles.includes("SUPER_ADMIN") || roles.includes("ADMIN");
}

export default function ApplicationTypesPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<AppType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ id: "", nameRu: "", nameKz: "", nameEn: "" });
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchItems = async () => {
    try {
      const res = await apiFetch("application-types");
      if (!res.ok) throw new Error(t("common.error"));
      setItems(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("authUser") ?? "{}");
      const roles: string[] = (u?.roles ?? []).map((r: { code?: string } | string) =>
        typeof r === "string" ? r : (r.code ?? ""));
      setIsAdmin(isAdminOrSuperAdmin(roles));
    } catch {}
  }, []);

  const resetForm = () => {
    setForm({ id: "", nameRu: "", nameKz: "", nameEn: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item: AppType) => {
    setForm({ id: String(item.id), nameRu: item.nameRu ?? "", nameKz: item.nameKz ?? "", nameEn: item.nameEn ?? "" });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("references.appTypesDeleteConfirm"))) return;
    try {
      const res = await apiFetch(`application-types/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems(prev => prev.filter(i => i.id !== id));
    } catch { alert(t("references.deleteError")); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body = {
      id: editingId ?? Number(form.id),
      nameRu: form.nameRu || null,
      nameKz: form.nameKz || null,
      nameEn: form.nameEn || null,
    };
    try {
      const res = await apiFetch(editingId ? `application-types/${editingId}` : "application-types", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { alert(await res.text() || t("references.saveError")); setSaving(false); return; }
      resetForm();
      setLoading(true);
      await fetchItems();
    } catch { alert(t("references.saveError")); }
    finally { setSaving(false); }
  };

  const inputCls = "block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500";

  return (
    <div className="px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">{t("references.appTypesTitle")}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t("references.appTypesSubtitle")}</p>
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
            {editingId ? t("references.editing") : t("references.appTypesNew")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {!editingId && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">ID</label>
                <input type="number" required value={form.id}
                  onChange={e => setForm({ ...form, id: e.target.value })} className={inputCls} />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t("references.ru")}</label>
              <input type="text" value={form.nameRu}
                onChange={e => setForm({ ...form, nameRu: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t("references.kz")}</label>
              <input type="text" value={form.nameKz}
                onChange={e => setForm({ ...form, nameKz: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t("references.en")}</label>
              <input type="text" value={form.nameEn}
                onChange={e => setForm({ ...form, nameEn: e.target.value })} className={inputCls} />
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

      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</p>}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">№</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("references.ru")}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("references.kz")}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("references.en")}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">{t("references.actions")}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t("references.notFound")}
                  </td>
                </tr>
              ) : items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                  <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">{item.nameRu || "—"}</td>
                  <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">{item.nameKz || "—"}</td>
                  <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">{item.nameEn || "—"}</td>
                  <td className="px-6 py-3 text-right">
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(item)}
                          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" title={t("references.editing")}>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(item.id)}
                          className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" title={t("common.delete")}>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
