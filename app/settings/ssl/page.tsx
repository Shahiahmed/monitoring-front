"use client";

import { useState, useRef, useEffect } from "react";
import { apiUrl } from "@/app/lib/api";

const SSL_EXT = [".p12", ".pfx", ".cer", ".crt", ".pem"];
const ECP_EXT = [".p12", ".pfx", ".key", ".cer", ".crt", ".pem"];
const MAX_MB = 10;

type TabId = "ssl" | "ecp";

interface Certificate {
  id: number;
  userId: number;
  type: string;
  status: string;
  keyOriginalName: string | null;
  certOriginalName: string | null;
  certFingerprintSha256: string | null;
  certSubject: string | null;
  certIssuer: string | null;
  validFrom: string | null;
  validTo: string | null;
  createdAt: string;
}

function getExt(name: string) {
  const lower = name.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? lower.slice(dot) : "";
}

function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} МБ`;
  const kb = bytes / 1024;
  if (kb >= 1) return `${kb.toFixed(2)} КБ`;
  return `${bytes} Б`;
}

function isAllowed(file: File, allowedExt: string[]) {
  return allowedExt.includes(getExt(file.name));
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function daysLeft(validTo: string | null): number | null {
  if (!validTo) return null;
  const to = new Date(validTo).getTime();
  const now = Date.now();
  return Math.ceil((to - now) / (24 * 60 * 60 * 1000));
}

/** Извлечь CN (Common Name) из строки издателя, например "CN=НУЦ РК, O=..." */
function issuerCN(issuer: string | null): string {
  if (!issuer) return "—";
  const match = issuer.match(/CN=([^,]+)/i);
  return match ? match[1].trim() : issuer;
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function SslPage() {
  const [activeTab, setActiveTab] = useState<TabId>("ssl");
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [sslFile, setSslFile] = useState<File | null>(null);
  const [sslPassword, setSslPassword] = useState("");
  const [ecpFile, setEcpFile] = useState<File | null>(null);
  const [showSslPassword, setShowSslPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const sslInputRef = useRef<HTMLInputElement>(null);
  const ecpInputRef = useRef<HTMLInputElement>(null);

  const sslError =
    sslFile && !isAllowed(sslFile, SSL_EXT)
      ? `Допустимые форматы: ${SSL_EXT.join(", ")}`
      : sslFile && sslFile.size > MAX_MB * 1024 * 1024
        ? `Файл не должен превышать ${MAX_MB} МБ`
        : "";
  const ecpError =
    ecpFile && !isAllowed(ecpFile, ECP_EXT)
      ? `Допустимые форматы: ${ECP_EXT.join(", ")}`
      : ecpFile && ecpFile.size > MAX_MB * 1024 * 1024
        ? `Файл не должен превышать ${MAX_MB} МБ`
        : "";

  const canSubmitSsl =
    sslFile && !sslError && sslPassword.trim() !== "" && !isLoading;
  const canSubmitEcp = ecpFile && !ecpError && !isLoading;

  const sslList = certificates.filter((c) => c.type === "SSL");
  const ecpList = certificates.filter((c) => c.type === "ECP");

  async function handleDelete(id: number) {
    try {
      const res = await fetch(apiUrl(`settings/certificates/${id}`), { method: "DELETE" });
      if (res.ok) {
        setCertificates((prev) => prev.filter((c) => c.id !== id));
        setSuccess("Сертификат удалён.");
        setTimeout(() => setSuccess(""), 2000);
        window.dispatchEvent(new Event("certificates-updated"));
      } else {
        setError("Не удалось удалить сертификат");
      }
    } catch {
      setError("Не удалось удалить сертификат");
    }
  }

  async function loadCertificates() {
    setLoadingList(true);
    try {
      const res = await fetch(apiUrl("settings/certificates"));
      if (res.ok) {
        const data = await res.json();
        setCertificates(Array.isArray(data) ? data : []);
      }
    } catch {
      setCertificates([]);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadCertificates();
  }, []);

  function handleSslChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSslFile(e.target.files?.[0] ?? null);
    setError("");
    setSuccess("");
  }

  function handleEcpChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEcpFile(e.target.files?.[0] ?? null);
    setError("");
    setSuccess("");
  }

  function clearSsl() {
    setSslFile(null);
    setSslPassword("");
    if (sslInputRef.current) sslInputRef.current.value = "";
    setError("");
    setSuccess("");
  }

  function clearEcp() {
    setEcpFile(null);
    if (ecpInputRef.current) ecpInputRef.current.value = "";
    setError("");
    setSuccess("");
  }

  async function handleSubmitSsl(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!canSubmitSsl) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", sslFile!);
      formData.append("password", sslPassword);
      const res = await fetch(apiUrl("settings/certificates/ssl"), {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ошибка при сохранении SSL");
      }
      const saved: Certificate = await res.json();
      setCertificates((prev) => [saved, ...prev]);
      setSuccess("SSL-сертификат сохранён.");
      clearSsl();
      window.dispatchEvent(new Event("certificates-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при сохранении");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmitEcp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!canSubmitEcp) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", ecpFile!);
      const res = await fetch(apiUrl("settings/certificates/ecp"), {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ошибка при сохранении ЭЦП");
      }
      const saved: Certificate = await res.json();
      setCertificates((prev) => [saved, ...prev]);
      setSuccess("Файл ЭЦП сохранён.");
      clearEcp();
      window.dispatchEvent(new Event("certificates-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при сохранении");
    } finally {
      setIsLoading(false);
    }
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: "ssl",
      label: "SSL",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      id: "ecp",
      label: "ЭЦП",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
    },
  ];

  function CertCardInner({ cert, onDelete }: { cert: Certificate; onDelete: () => void }) {
    const d = daysLeft(cert.validTo);
    const isSsl = cert.type === "SSL";
    return (
      <li className={`relative rounded-2xl overflow-hidden shadow-lg transition-all hover:shadow-xl dark:shadow-none ${isSsl ? "bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-gray-800 border border-emerald-200/60 dark:border-emerald-800/50" : "bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-gray-800 border border-blue-200/60 dark:border-blue-800/50"}`}>
        <div className={`absolute top-0 left-0 w-1 h-full ${isSsl ? "bg-emerald-500" : "bg-blue-500"}`} />
        <div className="p-5 pl-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${isSsl ? "bg-emerald-500 text-white dark:bg-emerald-600" : "bg-blue-500 text-white dark:bg-blue-600"}`}>
                {isSsl ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                )}
                {cert.type}
              </span>
              {d !== null && (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${d < 0 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"}`}>
                  {d < 0 ? "Истёк" : `${d} дн.`}
                </span>
              )}
            </div>
            <button type="button" onClick={onDelete} className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-all" title="Удалить">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <div className="rounded-xl bg-white/60 dark:bg-black/20 p-3">
              <dt className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Владелец (CN)</dt>
              <dd className="text-gray-900 dark:text-white font-semibold truncate" title={cert.certIssuer || undefined}>{issuerCN(cert.certIssuer)}</dd>
            </div>
            {cert.certSubject && (
              <div className="rounded-xl bg-white/60 dark:bg-black/20 p-3">
                <dt className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Субъект</dt>
                <dd className="text-gray-700 dark:text-gray-300 truncate" title={cert.certSubject}>{cert.certSubject}</dd>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/60 dark:bg-black/20 p-3">
                <dt className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">С</dt>
                <dd className="text-gray-700 dark:text-gray-300 text-xs">{formatDate(cert.validFrom)}</dd>
              </div>
              <div className="rounded-xl bg-white/60 dark:bg-black/20 p-3">
                <dt className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">По</dt>
                <dd className="text-gray-700 dark:text-gray-300 text-xs">{formatDate(cert.validTo)}</dd>
              </div>
            </div>
            <div className="rounded-xl bg-white/60 dark:bg-black/20 p-3">
              <dt className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Загружен</dt>
              <dd className="text-gray-600 dark:text-gray-400 text-xs">{formatDateTime(cert.createdAt)}</dd>
            </div>
            {cert.certOriginalName && (
              <div className="rounded-xl bg-white/60 dark:bg-black/20 p-3">
                <dt className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Файл</dt>
                <dd className="text-gray-500 dark:text-gray-400 truncate text-xs">{cert.certOriginalName}</dd>
              </div>
            )}
          </dl>
        </div>
      </li>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <div className="max-w-4xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            ЭЦП и SSL
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Загрузите сертификат — сохраняется только информация из него, файл не хранится.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Форма */}
          <div>
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav className="flex gap-1" aria-label="Вкладки">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setError("");
                      setSuccess("");
                    }}
                    className={`
                      flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors
                      ${
                        activeTab === tab.id
                          ? "border-gray-900 dark:border-white text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50"
                          : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                      }
                    `}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {activeTab === "ssl" && (
              <form onSubmit={handleSubmitSsl} className="space-y-4">
                {sslList.length > 0 ? (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/20 p-6">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      SSL-сертификат уже загружен. Чтобы загрузить другой, удалите текущий в списке справа.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Файл сертификата</label>
                          <div className="flex items-center gap-3">
                            <input
                              ref={sslInputRef}
                              type="file"
                              accept={SSL_EXT.join(",")}
                              onChange={handleSslChange}
                              className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-200 file:text-gray-700 dark:file:bg-gray-700 dark:file:text-gray-200 hover:file:bg-gray-300 dark:hover:file:bg-gray-600 file:cursor-pointer"
                            />
                            {sslFile && (
                              <button type="button" onClick={clearSsl} className="flex-shrink-0 p-2 rounded-lg text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" title="Удалить файл">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                          {sslFile && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{sslFile.name} · {formatBytes(sslFile.size)}</p>}
                          {sslError && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{sslError}</p>}
                        </div>
                        <div>
                          <label htmlFor="sslPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Пароль к сертификату</label>
                          <div className="relative">
                            <input
                              id="sslPassword"
                              type={showSslPassword ? "text" : "password"}
                              value={sslPassword}
                              onChange={(e) => setSslPassword(e.target.value)}
                              placeholder="Введите пароль"
                              autoComplete="off"
                              className="block w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent"
                            />
                            <button type="button" onClick={() => setShowSslPassword((v) => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                              {showSslPassword ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      <button type="button" onClick={clearSsl} className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Сбросить</button>
                      <button type="submit" disabled={!canSubmitSsl} className="px-6 py-2.5 text-sm font-medium text-white bg-gray-900 dark:bg-white text-gray-100 dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                        {isLoading ? <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> Сохранение...</> : "Сохранить SSL"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}

            {activeTab === "ecp" && (
              <form onSubmit={handleSubmitEcp} className="space-y-4">
                {ecpList.length > 0 ? (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/20 p-6">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      ЭЦП-сертификат уже загружен. Чтобы загрузить другой, удалите текущий в списке справа.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-6">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Контейнер ЭЦП: .p12, .pfx или .key, .cer, .crt, .pem</p>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Файл ЭЦП</label>
                        <div className="flex items-center gap-3">
                          <input ref={ecpInputRef} type="file" accept={ECP_EXT.join(",")} onChange={handleEcpChange} className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-200 file:text-gray-700 dark:file:bg-gray-700 dark:file:text-gray-200 hover:file:bg-gray-300 dark:hover:file:bg-gray-600 file:cursor-pointer" />
                          {ecpFile && <button type="button" onClick={clearEcp} className="flex-shrink-0 p-2 rounded-lg text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" title="Удалить файл"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}
                        </div>
                        {ecpFile && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{ecpFile.name} · {formatBytes(ecpFile.size)}</p>}
                        {ecpError && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{ecpError}</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      <button type="button" onClick={clearEcp} className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Сбросить</button>
                      <button type="submit" disabled={!canSubmitEcp} className="px-6 py-2.5 text-sm font-medium text-white bg-gray-900 dark:bg-white text-gray-100 dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                        {isLoading ? <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> Сохранение...</> : "Сохранить ЭЦП"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}

            {(error || success) && (
              <div className="mt-4 space-y-3">
                {error && <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4"><p className="text-sm text-red-800 dark:text-red-300">{error}</p></div>}
                {success && <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4"><p className="text-sm text-emerald-800 dark:text-emerald-300">{success}</p></div>}
              </div>
            )}
          </div>

          {/* Список только для активной вкладки: SSL — только SSL, ЭЦП — только ЭЦП */}
          <div>
            {activeTab === "ssl" && (
              <>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-5 rounded bg-emerald-500" />
                  SSL сертификаты
                </h2>
                {loadingList ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Загрузка...</p>
                ) : sslList.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Нет SSL. Загрузите сертификат выше.</p>
                ) : (
                  <ul className="space-y-4">
                    {sslList.map((c) => (
                      <CertCardInner key={c.id} cert={c} onDelete={() => handleDelete(c.id)} />
                    ))}
                  </ul>
                )}
              </>
            )}
            {activeTab === "ecp" && (
              <>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-5 rounded bg-blue-500" />
                  ЭЦП сертификаты
                </h2>
                {loadingList ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Загрузка...</p>
                ) : ecpList.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Нет ЭЦП. Загрузите сертификат выше.</p>
                ) : (
                  <ul className="space-y-4">
                    {ecpList.map((c) => (
                      <CertCardInner key={c.id} cert={c} onDelete={() => handleDelete(c.id)} />
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
