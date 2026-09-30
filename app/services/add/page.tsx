"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { useLanguage } from "../../components/LanguageProvider";

interface DicItem { id: number; nameRu: string; }
interface DicServer { id: number; name: string; ip: string; }
interface DicEnv { id: number; nameRu: string; }
interface Deployment {
  id: number;
  envId: number; envNameRu: string;
  serverId: number; serverIp: string;
  info: string; innerUrl: string; url: string; precedent: string;
}

const EMPTY_FORM = {
  artifactId: "", name: "", description: "", developer: "",
  isMtszn: "", projectName: "", shepServiceId: "", smartBridgePage: "",
  urlProduction: "", urlTest: "", subsystemInout: "", procedures: "",
  schemaDatabase: "", featured: false,
  appTypeId: "" as string | number, interactionTypeId: "" as string | number,
};

const EMPTY_DEP = { envId: "" as string | number, serverId: "" as string | number, info: "", innerUrl: "", url: "", precedent: "" };

function AddServiceContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [appTypes, setAppTypes] = useState<DicItem[]>([]);
  const [interactionTypes, setInteractionTypes] = useState<DicItem[]>([]);
  const [servers, setServers] = useState<DicServer[]>([]);
  const [envs, setEnvs] = useState<DicEnv[]>([]);

  const [saving, setSaving] = useState(false);
  const [loadingApp, setLoadingApp] = useState(!!editId);
  const [error, setError] = useState<string | null>(null);

  // Deployment modal state
  const [depModal, setDepModal] = useState<{ open: boolean; editDep: Deployment | null }>({ open: false, editDep: null });
  const [depForm, setDepForm] = useState({ ...EMPTY_DEP });
  const [depSaving, setDepSaving] = useState(false);
  const [depError, setDepError] = useState<string | null>(null);

  const loadDicts = useCallback(async () => {
    const [atRes, itRes, srvRes, envRes] = await Promise.all([
      apiFetch("application-types"),
      apiFetch("interaction-types"),
      apiFetch("servers"),
      apiFetch("environments"),
    ]);
    if (atRes.ok) setAppTypes(await atRes.json());
    if (itRes.ok) setInteractionTypes(await itRes.json());
    if (srvRes.ok) {
      const data = await srvRes.json();
      setServers(Array.isArray(data) ? data : data.content ?? []);
    }
    if (envRes.ok) setEnvs(await envRes.json());
  }, []);

  const loadApp = useCallback(async (id: string) => {
    setLoadingApp(true);
    try {
      const res = await apiFetch(`applications/${id}`);
      if (!res.ok) throw new Error(await res.text());
      const app = await res.json();
      setForm({
        artifactId: app.artifactId ?? "",
        name: app.name ?? "",
        description: app.description ?? "",
        developer: app.developer ?? "",
        isMtszn: app.isMtszn ?? "",
        projectName: app.projectName ?? "",
        shepServiceId: app.shepServiceId ?? "",
        smartBridgePage: app.smartBridgePage ?? "",
        urlProduction: app.urlProduction ?? "",
        urlTest: app.urlTest ?? "",
        subsystemInout: app.subsystemInout ?? "",
        procedures: app.procedures ?? "",
        schemaDatabase: app.schemaDatabase ?? "",
        featured: app.featured ?? false,
        appTypeId: app.appTypeId ?? "",
        interactionTypeId: app.interactionTypeId ?? "",
      });
      const dRes = await apiFetch(`applications/${id}/deployments`);
      if (dRes.ok) setDeployments(await dRes.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoadingApp(false); }
  }, []);

  useEffect(() => {
    loadDicts();
    if (editId) loadApp(editId);
  }, [loadDicts, loadApp, editId]);

  const handleChange = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.artifactId.trim()) { setError(t("services.nameRequired")); return; }
    setSaving(true); setError(null);
    try {
      const body = {
        ...form,
        appTypeId: form.appTypeId === "" ? null : Number(form.appTypeId),
        interactionTypeId: form.interactionTypeId === "" ? null : Number(form.interactionTypeId),
        featured: form.featured,
      };
      const res = editId
        ? await apiFetch(`applications/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await apiFetch("applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await res.text());
      router.push("/services/registry");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  // Deployment CRUD
  const openDepAdd = () => { setDepForm({ ...EMPTY_DEP }); setDepError(null); setDepModal({ open: true, editDep: null }); };
  const openDepEdit = (d: Deployment) => {
    setDepForm({ envId: d.envId, serverId: d.serverId, info: d.info ?? "", innerUrl: d.innerUrl ?? "", url: d.url ?? "", precedent: d.precedent ?? "" });
    setDepError(null);
    setDepModal({ open: true, editDep: d });
  };
  const closeDepModal = () => setDepModal({ open: false, editDep: null });

  const handleDepSave = async () => {
    if (!depForm.envId || !depForm.serverId) { setDepError(t("services.selectEnvAndServer")); return; }
    setDepSaving(true); setDepError(null);
    try {
      const appId = editId ? Number(editId) : null;
      if (!appId) { setDepError(t("services.selectFirst")); setDepSaving(false); return; }
      const body = { applicationId: appId, envId: Number(depForm.envId), serverId: Number(depForm.serverId), info: depForm.info, innerUrl: depForm.innerUrl, url: depForm.url, precedent: depForm.precedent };
      const { editDep } = depModal;
      const res = editDep
        ? await apiFetch(`applications/deployments/${editDep.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await apiFetch("applications/deployments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await res.text());
      const dRes = await apiFetch(`applications/${appId}/deployments`);
      if (dRes.ok) setDeployments(await dRes.json());
      closeDepModal();
    } catch (e: any) { setDepError(e.message); }
    finally { setDepSaving(false); }
  };

  const handleDepDelete = async (d: Deployment) => {
    if (!confirm(t("services.deleteDeploymentConfirm") + " " + d.serverIp + "?")) return;
    try {
      const res = await apiFetch(`applications/deployments/${d.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setDeployments(prev => prev.filter(x => x.id !== d.id));
    } catch (e: any) { alert(t("common.error") + ": " + e.message); }
  };

  if (loadingApp) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">{t("common.loading2")}</div>;

  return (
    <div className="px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="add-back-btn">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            {editId ? t("services.editTitle") : t("services.addTitle")}
          </h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {editId ? `${t("services.editTitle")} #${editId}` : t("services.newRecord")}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="add-card mb-5">
          <div className="add-card-title">{t("services.basicInfo")}</div>
          <div className="add-grid">
            <Field label="Artifact ID *">
              <input className="add-input" value={form.artifactId} onChange={e => handleChange("artifactId", e.target.value)} placeholder="ru.enbek.gcvp-backend" />
            </Field>
            <Field label={`${t("common.name")} *`}>
              <input className="add-input" value={form.name} onChange={e => handleChange("name", e.target.value)} placeholder={t("services.serviceNamePlaceholder")} />
            </Field>
            <Field label={t("services.project")}>
              <input className="add-input" value={form.projectName} onChange={e => handleChange("projectName", e.target.value)} placeholder={t("services.projectNamePlaceholder")} />
            </Field>
            <Field label="SHEP Service ID">
              <input className="add-input" value={form.shepServiceId} onChange={e => handleChange("shepServiceId", e.target.value)} placeholder={t("services.shepIdPlaceholder")} />
            </Field>
            <Field label={t("services.appType")}>
              <select className="add-select" value={form.appTypeId} onChange={e => handleChange("appTypeId", e.target.value)}>
                <option value="">{t("services.notSelected")}</option>
                {appTypes.map(tp => <option key={tp.id} value={tp.id}>{tp.nameRu}</option>)}
              </select>
            </Field>
            <Field label={t("services.interactionType")}>
              <select className="add-select" value={form.interactionTypeId} onChange={e => handleChange("interactionTypeId", e.target.value)}>
                <option value="">{t("services.notSelected")}</option>
                {interactionTypes.map(tp => <option key={tp.id} value={tp.id}>{tp.nameRu}</option>)}
              </select>
            </Field>
            <Field label={t("services.consumer")}>
              <input className="add-input" value={form.subsystemInout} onChange={e => handleChange("subsystemInout", e.target.value)} placeholder={t("services.consumerPlaceholder")} />
            </Field>
            <Field label={t("services.smartBridge")}>
              <input className="add-input" value={form.smartBridgePage} onChange={e => handleChange("smartBridgePage", e.target.value)} placeholder="https://…" />
            </Field>
            <Field label={t("services.urlProd")}>
              <input className="add-input" value={form.urlProduction} onChange={e => handleChange("urlProduction", e.target.value)} placeholder="https://…" />
            </Field>
            <Field label={t("services.urlTest")}>
              <input className="add-input" value={form.urlTest} onChange={e => handleChange("urlTest", e.target.value)} placeholder="https://…" />
            </Field>
            <Field label={t("services.schemaDb")}>
              <input className="add-input" value={form.schemaDatabase} onChange={e => handleChange("schemaDatabase", e.target.value)} placeholder="public" />
            </Field>
            <Field label="">
              <label className="flex items-center gap-2 mt-5 cursor-pointer select-none">
                <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={form.featured} onChange={e => handleChange("featured", e.target.checked)} />
                <span className="text-xs text-slate-600 dark:text-slate-300">{t("services.featured")}</span>
              </label>
            </Field>
          </div>

          <div className="add-grid-full mt-4">
            <Field label={t("common.description")}>
              <textarea className="add-input resize-none h-20" value={form.description} onChange={e => handleChange("description", e.target.value)} placeholder={t("services.descriptionPlaceholder")} />
            </Field>
            <Field label={t("services.procedures")}>
              <textarea className="add-input resize-none h-20" value={form.procedures} onChange={e => handleChange("procedures", e.target.value)} placeholder={t("services.proceduresPlaceholder")} />
            </Field>
          </div>
        </div>

        {/* Deployments section — only in edit mode */}
        {editId && (
          <div className="add-card mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="add-card-title mb-0">{t("services.deploymentsSection")}</div>
              <button type="button" onClick={openDepAdd} className="add-dep-add-btn">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                {t("common.add")}
              </button>
            </div>
            {deployments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">{t("services.noDeploymentsList")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="add-dep-thead">
                      <th className="text-left px-3 py-2">{t("services.envCol")}</th>
                      <th className="text-left px-3 py-2">{t("services.serverIp")}</th>
                      <th className="text-left px-3 py-2">Info</th>
                      <th className="text-left px-3 py-2">{t("services.innerUrlCol")}</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {deployments.map(d => (
                      <tr key={d.id} className="add-dep-row">
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${d.envNameRu === "Бой" ? "bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-400" : "bg-sky-50 text-sky-500 dark:bg-sky-500/10 dark:text-sky-400"}`}>
                            {d.envNameRu}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">{d.serverIp}</td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400 max-w-48 truncate">{d.info || "—"}</td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400 max-w-48 truncate">{d.innerUrl || "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <button type="button" onClick={() => openDepEdit(d)} className="add-dep-edit-btn" title={t("common.edit")}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button type="button" onClick={() => handleDepDelete(d)} className="add-dep-del-btn" title={t("common.delete")}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!editId && (
          <div className="mb-5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3 text-amber-700 dark:text-amber-400 text-xs">
            {t("services.deployAfterSave")}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="add-cancel-btn">{t("common.cancel")}</button>
          <button type="submit" disabled={saving} className="add-save-btn">
            {saving ? t("services.saving") : editId ? t("services.saveChanges") : t("services.createService")}
          </button>
        </div>
      </form>

      {/* Deployment modal */}
      {depModal.open && (
        <div className="add-modal-backdrop" onClick={closeDepModal}>
          <div className="add-modal" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {depModal.editDep ? t("services.editDeployment") : t("services.addDeployment")}
              </h3>
              <button onClick={closeDepModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {depError && <div className="mb-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 text-red-600 dark:text-red-400 text-xs">{depError}</div>}

            <div className="space-y-3">
              <Field label={`${t("services.envCol")} *`}>
                <select className="add-select" value={depForm.envId} onChange={e => setDepForm(f => ({ ...f, envId: e.target.value }))}>
                  <option value="">{t("common.selectPlaceholder")}</option>
                  {envs.map(e => <option key={e.id} value={e.id}>{e.nameRu}</option>)}
                </select>
              </Field>
              <Field label={`${t("services.serverCol")} *`}>
                <select className="add-select" value={depForm.serverId} onChange={e => setDepForm(f => ({ ...f, serverId: e.target.value }))}>
                  <option value="">{t("common.selectPlaceholder")}</option>
                  {servers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.ip})</option>)}
                </select>
              </Field>
              <Field label="Info">
                <input className="add-input" value={depForm.info} onChange={e => setDepForm(f => ({ ...f, info: e.target.value }))} placeholder={t("services.infoNote")} />
              </Field>
              <Field label={t("services.innerUrl")}>
                <input className="add-input" value={depForm.innerUrl} onChange={e => setDepForm(f => ({ ...f, innerUrl: e.target.value }))} placeholder="http://192.168.x.x:8080" />
              </Field>
              <Field label={t("services.outerUrl")}>
                <input className="add-input" value={depForm.url} onChange={e => setDepForm(f => ({ ...f, url: e.target.value }))} placeholder="https://…" />
              </Field>
              <Field label={t("services.precedent")}>
                <input className="add-input" value={depForm.precedent} onChange={e => setDepForm(f => ({ ...f, precedent: e.target.value }))} placeholder={t("services.precedentPlaceholder")} />
              </Field>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={closeDepModal} className="add-cancel-btn">{t("common.cancel")}</button>
              <button onClick={handleDepSave} disabled={depSaving} className="add-save-btn">
                {depSaving ? t("services.saving") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .add-card {
          background: rgba(255,255,255,0.9);
          border: 1px solid rgba(226,232,240,0.9);
          border-radius: 16px;
          padding: 20px 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);
        }
        html.dark .add-card {
          background: rgba(15,23,42,0.6);
          border-color: rgba(255,255,255,0.07);
        }
        .add-card-title {
          font-size: 13px; font-weight: 600;
          color: #475569; text-transform: uppercase; letter-spacing: 0.05em;
          margin-bottom: 16px;
        }
        html.dark .add-card-title { color: #94a3b8; }
        .add-grid {
          display: grid; grid-template-columns: repeat(3,1fr); gap: 14px 20px;
        }
        @media (max-width: 900px) { .add-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 560px) { .add-grid { grid-template-columns: 1fr; } }
        .add-grid-full {
          display: grid; grid-template-columns: repeat(2,1fr); gap: 14px 20px;
        }
        @media (max-width: 560px) { .add-grid-full { grid-template-columns: 1fr; } }
        .add-field-label {
          display: block; font-size: 11px; font-weight: 500;
          color: #64748b; margin-bottom: 5px; letter-spacing: 0.02em;
        }
        html.dark .add-field-label { color: #94a3b8; }
        .add-input {
          width: 100%; border-radius: 10px;
          border: 1px solid rgba(226,232,240,0.9);
          background: rgba(255,255,255,0.9); color: #1e293b;
          font-size: 13px; padding: 7px 11px; outline: none;
          transition: box-shadow 0.15s;
        }
        html.dark .add-input { background: rgba(30,41,59,0.7); border-color: rgba(255,255,255,0.1); color: #e2e8f0; }
        .add-input:focus { box-shadow: 0 0 0 3px rgba(37,99,235,0.15); border-color: rgba(37,99,235,0.4); }
        html.dark .add-input::placeholder { color: #475569; }
        .add-select {
          width: 100%; border-radius: 10px;
          border: 1px solid rgba(226,232,240,0.9);
          background: rgba(255,255,255,0.9); color: #1e293b;
          font-size: 13px; padding: 7px 11px; outline: none;
          transition: box-shadow 0.15s;
        }
        html.dark .add-select { background: rgba(30,41,59,0.7); border-color: rgba(255,255,255,0.1); color: #e2e8f0; }
        .add-select:focus { box-shadow: 0 0 0 3px rgba(37,99,235,0.15); border-color: rgba(37,99,235,0.4); }
        .add-save-btn {
          display: inline-flex; align-items: center; gap: 6px;
          border-radius: 12px; padding: 9px 20px; font-weight: 600; font-size: 13px;
          background: linear-gradient(135deg,#2563eb,#1e40af);
          color: white; box-shadow: 0 3px 10px rgba(37,99,235,0.3);
          transition: box-shadow 0.15s, transform 0.1s; border: none; cursor: pointer;
        }
        .add-save-btn:hover:not(:disabled) { box-shadow: 0 5px 18px rgba(37,99,235,0.46); transform: translateY(-1px); }
        .add-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .add-cancel-btn {
          display: inline-flex; align-items: center; border-radius: 12px;
          padding: 9px 18px; font-weight: 500; font-size: 13px;
          border: 1px solid rgba(226,232,240,0.9);
          background: rgba(255,255,255,0.9); color: #475569; cursor: pointer;
          transition: all 0.15s;
        }
        html.dark .add-cancel-btn { background: rgba(15,23,42,0.6); border-color: rgba(255,255,255,0.08); color: #94a3b8; }
        .add-cancel-btn:hover { border-color: rgba(37,99,235,0.3); color: #2563eb; }
        .add-back-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 10px;
          border: 1px solid rgba(226,232,240,0.9);
          background: rgba(255,255,255,0.9); color: #475569; cursor: pointer;
          transition: all 0.15s; flex-shrink: 0;
        }
        html.dark .add-back-btn { background: rgba(15,23,42,0.6); border-color: rgba(255,255,255,0.08); color: #94a3b8; }
        .add-back-btn:hover { border-color: rgba(37,99,235,0.3); color: #2563eb; }
        .add-dep-thead {
          background: rgba(248,250,252,0.95);
          font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
          color: #94a3b8; border-bottom: 1px solid rgba(226,232,240,0.9);
        }
        html.dark .add-dep-thead { background: rgba(15,23,42,0.8); border-color: rgba(255,255,255,0.07); }
        .add-dep-row { border-bottom: 1px solid rgba(226,232,240,0.4); }
        .add-dep-row:last-child { border-bottom: none; }
        html.dark .add-dep-row { border-color: rgba(255,255,255,0.04); }
        .add-dep-add-btn {
          display: inline-flex; align-items: center; gap: 5px;
          border-radius: 10px; padding: 6px 12px; font-weight: 600; font-size: 11px;
          background: linear-gradient(135deg,#2563eb,#1e40af);
          color: white; box-shadow: 0 2px 6px rgba(37,99,235,0.25);
          border: none; cursor: pointer; transition: box-shadow 0.15s;
        }
        .add-dep-add-btn:hover { box-shadow: 0 4px 12px rgba(37,99,235,0.4); }
        .add-dep-edit-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 26px; height: 26px; border-radius: 7px;
          border: 1px solid rgba(37,99,235,0.25); color: #2563eb;
          background: rgba(37,99,235,0.07); cursor: pointer; transition: all 0.12s;
        }
        .add-dep-edit-btn:hover { background: rgba(37,99,235,0.18); }
        .add-dep-del-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 26px; height: 26px; border-radius: 7px; cursor: pointer;
          border: 1px solid rgba(239,68,68,0.25); color: #dc2626;
          background: rgba(239,68,68,0.07); transition: all 0.12s;
        }
        .add-dep-del-btn:hover { background: rgba(239,68,68,0.18); }
        .add-modal-backdrop {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        .add-modal {
          background: #fff; border-radius: 16px; padding: 24px;
          width: 100%; max-width: 440px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }
        html.dark .add-modal { background: #1e293b; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <label className="add-field-label">{label}</label>}
      {children}
    </div>
  );
}

export default function AddServicePage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-400 text-sm">{t("common.loading2")}</div>}>
      <AddServiceContent />
    </Suspense>
  );
}
