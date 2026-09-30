"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { apiFetch } from "@/app/lib/api";
import { useLanguage } from "@/app/components/LanguageProvider";

const SSL_EXT = [".p12", ".pfx", ".cer", ".crt", ".pem"];
const ECP_EXT = [".p12", ".pfx", ".key", ".cer", ".crt", ".pem"];
const MAX_MB  = 10;
type TabId    = "ssl" | "ecp";

interface Certificate {
  id: number; userId: number; type: string; status: string;
  keyOriginalName: string | null; certOriginalName: string | null;
  certFingerprintSha256: string | null; certSubject: string | null;
  certIssuer: string | null; validFrom: string | null; validTo: string | null;
  createdAt: string;
}

function getExt(name: string) { const i = name.toLowerCase().lastIndexOf("."); return i >= 0 ? name.toLowerCase().slice(i) : ""; }
function formatBytes(b: number) { return b >= 1048576 ? `${(b/1048576).toFixed(1)} МБ` : b >= 1024 ? `${(b/1024).toFixed(0)} КБ` : `${b} Б`; }
function isAllowed(f: File, ext: string[]) { return ext.includes(getExt(f.name)); }
function formatDate(iso: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return iso; }
}
function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return iso; }
}
function daysLeft(validTo: string | null) {
  if (!validTo) return null;
  return Math.ceil((new Date(validTo).getTime() - Date.now()) / 86400000);
}
function issuerCN(s: string | null) {
  if (!s) return "—";
  const m = s.match(/CN=([^,]+)/i);
  return m ? m[1].trim() : s;
}

function DropZone({ accept, file, onFile, onClear, error, inputRef, disabled, t }: {
  accept: string[]; file: File | null; onFile: (f: File) => void; onClear: () => void;
  error: string; inputRef: React.RefObject<HTMLInputElement | null>; disabled?: boolean;
  t: (k: string) => string;
}) {
  const [drag, setDrag] = useState(false);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={`relative rounded-xl border-2 border-dashed transition-all duration-150 ${
        drag ? "border-blue-400 bg-blue-50/60 dark:bg-blue-500/10" :
        file  ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10" :
        error ? "border-red-300 bg-red-50/40 dark:bg-red-500/10" :
        "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-blue-300 dark:hover:border-blue-600"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <input ref={inputRef} type="file" accept={accept.join(",")}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={disabled} />
      <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center pointer-events-none">
        {file ? (
          <>
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{file.name}</p>
            <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("certificates.dropText")} <span className="text-blue-600 dark:text-blue-400 font-medium">{t("certificates.choose")}</span>
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{accept.join(" · ")} · {t("certificates.upTo")} {MAX_MB} МБ</p>
          </>
        )}
      </div>
      {file && (
        <button type="button" onClick={e => { e.stopPropagation(); onClear(); }}
          className="pointer-events-auto absolute top-2 right-2 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      )}
      {error && <p className="pb-3 text-xs text-red-500 dark:text-red-400 text-center pointer-events-none">{error}</p>}
    </div>
  );
}

function CertCard({ cert, onDelete, t }: { cert: Certificate; onDelete: () => void; t: (k: string) => string }) {
  const d = daysLeft(cert.validTo);
  const isSsl   = cert.type === "SSL";
  const expired = d !== null && d < 0;
  const warning = d !== null && d >= 0 && d <= 30;
  return (
    <div className="ssl-cert-card rounded-2xl overflow-hidden">
      <div className={`h-1 w-full ${isSsl ? "bg-emerald-500" : "bg-blue-500"}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
              isSsl ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"}`}>
              {isSsl
                ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>}
              {cert.type}
            </span>
            {d !== null && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                expired ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" :
                warning ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
                          "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
                {expired ? t("certificates.expired") : warning ? `⚠ ${d} ${t("servers.days")}` : `${d} ${t("servers.days")}`}
              </span>
            )}
          </div>
          <button type="button" onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>

        <div className="space-y-2">
          <Row label={t("certificates.owner")} value={issuerCN(cert.certIssuer)} bold />
          {cert.certSubject && <Row label={t("certificates.subject")} value={cert.certSubject} truncate />}
          <div className="grid grid-cols-2 gap-2">
            <Row label={t("certificates.validFrom")} value={formatDate(cert.validFrom)} />
            <Row label={t("certificates.validUntil")} value={formatDate(cert.validTo)} highlight={expired ? "red" : warning ? "amber" : undefined} />
          </div>
          <Row label={t("certificates.uploaded")} value={formatDateTime(cert.createdAt)} muted />
          {cert.certOriginalName && <Row label={t("certificates.fileCol")} value={cert.certOriginalName} muted truncate />}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, muted, truncate, highlight }: {
  label: string; value: string; bold?: boolean; muted?: boolean; truncate?: boolean; highlight?: "red" | "amber";
}) {
  return (
    <div className="ssl-row rounded-lg px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
      <p className={`text-xs leading-snug ${truncate ? "truncate" : "wrap-break-word"} ${
        bold      ? "font-semibold text-slate-800 dark:text-slate-100" :
        muted     ? "text-slate-400 dark:text-slate-500" :
        highlight === "red"   ? "font-semibold text-red-600 dark:text-red-400" :
        highlight === "amber" ? "font-semibold text-amber-600 dark:text-amber-400" :
                    "text-slate-600 dark:text-slate-300"}`}
        title={value}>{value}</p>
    </div>
  );
}

function EmptyState({ type, t }: { type: string; t: (k: string) => string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("certificates.noCerts")} {type}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t("certificates.uploadViaForm")}</p>
    </div>
  );
}

export default function SslPage() {
  const { t } = useLanguage();
  const [activeTab,    setActiveTab]    = useState<TabId>("ssl");
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loadingList,  setLoadingList]  = useState(true);
  const [sslFile,      setSslFile]      = useState<File | null>(null);
  const [sslPassword,  setSslPassword]  = useState("");
  const [ecpFile,      setEcpFile]      = useState<File | null>(null);
  const [showPwd,      setShowPwd]      = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Certificate | null>(null);
  const [isDeleting,   setIsDeleting]   = useState(false);
  const sslInputRef = useRef<HTMLInputElement>(null);
  const ecpInputRef = useRef<HTMLInputElement>(null);

  const sslError = sslFile && !isAllowed(sslFile, SSL_EXT) ? `${t("certificates.allowedFormats")} ${SSL_EXT.join(", ")}`
    : sslFile && sslFile.size > MAX_MB * 1048576 ? `${t("certificates.upTo")} ${MAX_MB} МБ` : "";
  const ecpError = ecpFile && !isAllowed(ecpFile, ECP_EXT) ? `${t("certificates.allowedFormats")} ${ECP_EXT.join(", ")}`
    : ecpFile && ecpFile.size > MAX_MB * 1048576 ? `${t("certificates.upTo")} ${MAX_MB} МБ` : "";

  const canSubmitSsl = sslFile && !sslError && !isLoading;
  const canSubmitEcp = ecpFile && !ecpError && !isLoading;

  const sslList = certificates.filter(c => c.type === "SSL");
  const ecpList = certificates.filter(c => c.type === "ECP");

  async function loadCerts() {
    setLoadingList(true);
    try { const r = await apiFetch("settings/certificates"); if (r.ok) setCertificates(await r.json()); }
    catch { setCertificates([]); } finally { setLoadingList(false); }
  }
  useEffect(() => { loadCerts(); }, []);

  function clearSsl() { setSslFile(null); setSslPassword(""); if (sslInputRef.current) sslInputRef.current.value = ""; setError(""); setSuccess(""); }
  function clearEcp() { setEcpFile(null); if (ecpInputRef.current) ecpInputRef.current.value = ""; setError(""); setSuccess(""); }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const r = await apiFetch(`settings/certificates/${deleteTarget.id}`, { method: "DELETE" });
      if (r.ok) {
        setCertificates(p => p.filter(c => c.id !== deleteTarget.id));
        setSuccess(t("certificates.certDeleted")); setTimeout(() => setSuccess(""), 3000);
        window.dispatchEvent(new Event("certificates-updated"));
        setDeleteTarget(null);
      } else setError(t("certificates.errorDelete"));
    } catch { setError(t("certificates.errorDelete")); }
    finally { setIsDeleting(false); }
  }

  async function handleSubmitSsl(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess("");
    if (!canSubmitSsl) return;
    setIsLoading(true);
    try {
      const fd = new FormData(); fd.append("file", sslFile!); fd.append("password", sslPassword);
      const r = await apiFetch("settings/certificates/ssl", { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.text()) || t("certificates.errorSaveSsl"));
      const newCert = await r.json();
      setCertificates(p => [newCert, ...p]);
      setSuccess(t("certificates.sslSaved")); clearSsl();
      window.dispatchEvent(new Event("certificates-updated"));
    } catch (err) { setError(err instanceof Error ? err.message : t("certificates.errorSaveSsl")); }
    finally { setIsLoading(false); }
  }

  async function handleSubmitEcp(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess("");
    if (!canSubmitEcp) return;
    setIsLoading(true);
    try {
      const fd = new FormData(); fd.append("file", ecpFile!);
      const r = await apiFetch("settings/certificates/ecp", { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.text()) || t("certificates.errorSaveEcp"));
      const newCert = await r.json();
      setCertificates(p => [newCert, ...p]);
      setSuccess(t("certificates.ecpSaved")); clearEcp();
      window.dispatchEvent(new Event("certificates-updated"));
    } catch (err) { setError(err instanceof Error ? err.message : t("certificates.errorSaveEcp")); }
    finally { setIsLoading(false); }
  }

  const activeList = activeTab === "ssl" ? sslList : ecpList;
  const isSSL = activeTab === "ssl";

  return (
    <div className="px-6 py-8 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 bg-emerald-100 border border-emerald-300/40 dark:bg-emerald-900/40 dark:border-emerald-500/30">
          <svg className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight leading-tight">{t("nav.ssl")}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("certificates.subtitle")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 w-fit">
        {(["ssl", "ecp"] as TabId[]).map(tab => (
          <button key={tab} type="button"
            onClick={() => { setActiveTab(tab); setError(""); setSuccess(""); }}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
              activeTab === tab
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
            {tab === "ssl"
              ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>}
            {tab === "ssl" ? "SSL" : "ЭЦП"}
            {(tab === "ssl" ? sslList : ecpList).length > 0 && (
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                activeTab === tab ? (tab === "ssl" ? "bg-emerald-500 text-white" : "bg-blue-500 text-white") : "bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300"}`}>
                {(tab === "ssl" ? sslList : ecpList).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Left: Upload form */}
        <div className="ssl-panel rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-5 rounded-full ${isSSL ? "bg-emerald-500" : "bg-blue-500"}`} />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {isSSL ? t("certificates.uploadSsl") : t("certificates.uploadEcp")}
            </h2>
          </div>

          {(isSSL ? sslList.length > 0 : ecpList.length > 0) ? (
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 px-4 py-3">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                {t("certificates.alreadyLoaded")}
              </p>
            </div>
          ) : (
            <form onSubmit={isSSL ? handleSubmitSsl : handleSubmitEcp} className="flex flex-col gap-4">
              <DropZone
                accept={isSSL ? SSL_EXT : ECP_EXT}
                file={isSSL ? sslFile : ecpFile}
                onFile={f => { if (isSSL) { setSslFile(f); } else { setEcpFile(f); } setError(""); setSuccess(""); }}
                onClear={isSSL ? clearSsl : clearEcp}
                error={isSSL ? sslError : ecpError}
                inputRef={isSSL ? sslInputRef : ecpInputRef}
                disabled={isLoading}
                t={t}
              />

              {isSSL && (
                <div>
                  <label htmlFor="pwd" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t("certificates.passwordLabel")} <span className="normal-case font-normal text-slate-400">({t("certificates.passwordOptional")})</span>
                  </label>
                  <div className="relative">
                    <input id="pwd" type={showPwd ? "text" : "password"} value={sslPassword}
                      onChange={e => setSslPassword(e.target.value)} placeholder={t("certificates.passwordPlaceholder")}
                      autoComplete="off"
                      className="block w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition" />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      {showPwd
                        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button type="submit" disabled={!(isSSL ? canSubmitSsl : canSubmitEcp)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 ${
                    isSSL ? "bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-200 dark:shadow-emerald-900/40"
                          : "bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-200 dark:shadow-blue-900/40"
                  } shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none`}>
                  {isLoading
                    ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{t("certificates.saving")}</>
                    : <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                        {isSSL ? t("certificates.saveSsl") : t("certificates.saveEcp")}
                      </>}
                </button>
                <button type="button" onClick={isSSL ? clearSsl : clearEcp}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  {t("certificates.reset")}
                </button>
              </div>
            </form>
          )}

          {/* Alerts */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 px-4 py-3">
              <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40 px-4 py-3">
              <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">{success}</p>
            </div>
          )}
        </div>

        {/* Right: Certificate list */}
        <div className="ssl-panel rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-5 rounded-full ${isSSL ? "bg-emerald-500" : "bg-blue-500"}`} />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {isSSL ? t("certificates.sslCerts") : t("certificates.ecpCerts")}
              </h2>
            </div>
            {activeList.length > 0 && (
              <span className="text-xs text-slate-400">{activeList.length} {t("certificates.pieces")}</span>
            )}
          </div>

          {loadingList ? (
            <div className="flex items-center gap-2 py-6 justify-center text-slate-400 text-sm">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              {t("certificates.loading")}
            </div>
          ) : activeList.length === 0 ? (
            <EmptyState type={isSSL ? "SSL" : "ЭЦП"} t={t} />
          ) : (
            <div className="flex flex-col gap-3">
              {activeList.map(c => <CertCard key={c.id} cert={c} onDelete={() => setDeleteTarget(c)} t={t} />)}
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/15">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{t("certificates.deleteCert")}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {deleteTarget.keyOriginalName ?? deleteTarget.certOriginalName ?? `${t("nav.ssl")} #${deleteTarget.id}`}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{t("common.irreversible")}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
              >
                {isDeleting
                  ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{t("certificates.deleting")}</>
                  : t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .ssl-panel {
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(226,232,240,0.9);
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03);
        }
        html.dark .ssl-panel {
          background: rgba(15,23,42,0.6);
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .ssl-cert-card {
          background: rgba(248,250,252,0.8);
          border: 1px solid rgba(226,232,240,0.8);
        }
        html.dark .ssl-cert-card {
          background: rgba(30,41,59,0.5);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .ssl-row {
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(226,232,240,0.6);
        }
        html.dark .ssl-row {
          background: rgba(15,23,42,0.4);
          border: 1px solid rgba(255,255,255,0.05);
        }
      `}</style>
    </div>
  );
}
