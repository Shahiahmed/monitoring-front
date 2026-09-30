"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { useLanguage } from "../../components/LanguageProvider";

interface GovBody {
  id: number;
  nameRu: string | null;
}

interface InfoSystem {
  id: number;
  nameEn: string | null;
  nameKz: string | null;
  nameRu: string | null;
  goId: number;
  goNameRu: string | null;
  sortOrder: number | null;
  includeInAvailability: boolean;
}

interface AuthUser {
  roles?: string[];
}

function isAdminOrSuperAdmin(user: AuthUser | null): boolean {
  const roles = user?.roles ?? [];
  return roles.includes("SUPER_ADMIN") || roles.includes("ADMIN");
}

export default function InformationSystemsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<InfoSystem[]>([]);
  const [govBodies, setGovBodies] = useState<GovBody[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ id: "", nameRu: "", nameKz: "", nameEn: "", goId: "", sortOrder: "0", includeInAvailability: true });
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const fetchAll = async () => {
    try {
      const [isRes, goRes] = await Promise.all([
        apiFetch("information-systems"),
        apiFetch("government-bodies"),
      ]);
      if (!isRes.ok || !goRes.ok) throw new Error(t("common.error"));
      const isData = (await isRes.json()) as InfoSystem[];
      const goData = (await goRes.json()) as GovBody[];
      setItems(isData);
      setGovBodies(goData);
    } catch (e: any) {
      setError(e.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("authUser") : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as AuthUser;
      setCurrentUser(parsed);
    } catch {
      // ignore
    }
  }, []);

  const filtered = items.filter((item) => {
    const term = search.toLowerCase();
    return (
      (item.nameRu ?? "").toLowerCase().includes(term) ||
      (item.nameKz ?? "").toLowerCase().includes(term) ||
      (item.nameEn ?? "").toLowerCase().includes(term) ||
      (item.goNameRu ?? "").toLowerCase().includes(term)
    );
  });

  const resetForm = () => {
    setForm({ id: "", nameRu: "", nameKz: "", nameEn: "", goId: "", sortOrder: "0", includeInAvailability: true });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item: InfoSystem) => {
    setForm({
      id: String(item.id),
      nameRu: item.nameRu ?? "",
      nameKz: item.nameKz ?? "",
      nameEn: item.nameEn ?? "",
      goId: String(item.goId),
      sortOrder: String(item.sortOrder ?? 0),
      includeInAvailability: item.includeInAvailability !== false,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("references.infoSystemsDeleteConfirm"))) return;
    try {
      const res = await apiFetch(`information-systems/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const msg = await res.text();
        alert(msg || t("references.deleteError"));
        return;
      }
      setItems((prev) => prev.filter((l) => l.id !== id));
    } catch {
      alert(t("references.deleteError"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.goId) {
      alert(t("references.selectGovBody"));
      return;
    }
    setSaving(true);

    const body = {
      id: editingId ?? Number(form.id),
      nameRu: form.nameRu || null,
      nameKz: form.nameKz || null,
      nameEn: form.nameEn || null,
      goId: Number(form.goId),
      goNameRu: null,
      sortOrder: Number(form.sortOrder) || 0,
      includeInAvailability: form.includeInAvailability,
    };

    try {
      const path = editingId ? `information-systems/${editingId}` : "information-systems";
      const method = editingId ? "PUT" : "POST";

      const res = await apiFetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const msg = await res.text();
        alert(msg || t("references.saveError"));
        setSaving(false);
        return;
      }

      resetForm();
      setLoading(true);
      await fetchAll();
    } catch {
      alert(t("references.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            {t("references.infoSystemsTitle")}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("references.infoSystemsSubtitle")}
          </p>
        </div>
        {isAdminOrSuperAdmin(currentUser) && !showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            {t("common.add")}
          </button>
        )}
      </div>

      {isAdminOrSuperAdmin(currentUser) && showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-5"
        >
          <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            {editingId ? t("references.editing") : t("references.infoSystemsNew")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!editingId && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">ID</label>
                <input
                  type="number"
                  required
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t("references.govBodyCol")}</label>
              <select
                required
                value={form.goId}
                onChange={(e) => setForm({ ...form, goId: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500"
              >
                <option value="">{t("references.selectGovBody")}</option>
                {govBodies.map((go) => (
                  <option key={go.id} value={go.id}>
                    {go.nameRu || `ID: ${go.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t("references.ru")}</label>
              <input
                type="text"
                value={form.nameRu}
                onChange={(e) => setForm({ ...form, nameRu: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t("references.kz")}</label>
              <input
                type="text"
                value={form.nameKz}
                onChange={(e) => setForm({ ...form, nameKz: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t("references.en")}</label>
              <input
                type="text"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t("references.sortOrderLabel")}</label>
              <input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500"
              />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input
                id="includeInAvailability"
                type="checkbox"
                checked={form.includeInAvailability}
                onChange={(e) => setForm({ ...form, includeInAvailability: e.target.checked })}
                className="h-4 w-4 accent-blue-600 cursor-pointer"
              />
              <label htmlFor="includeInAvailability" className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                {t("references.includeAvailabilityLabel")}
              </label>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {saving ? t("references.saving") : editingId ? t("common.save") : t("references.create")}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      )}

      {!showForm && (
        <div className="mb-4">
          <input
            type="text"
            placeholder={t("references.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500"
          />
        </div>
      )}

      {loading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.loading")}</p>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="w-14 px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">№</th>
                <th className="w-16 px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("references.sortOrder")}</th>
                <th className="w-[35%] px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("common.name")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("references.govBodyCol")}</th>
                <th className="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("references.includeAvailability")}</th>
                <th className="w-24 px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("references.actions")}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t("references.notFound")}
                  </td>
                </tr>
              ) : (
                filtered.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">{item.sortOrder ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white break-words">{item.nameRu || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 break-words">{item.goNameRu || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {item.includeInAvailability !== false ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30">
                          <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800">
                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12"/></svg>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isAdminOrSuperAdmin(currentUser) && (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(item)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" title={t("references.editing")}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" title={t("common.delete")}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
