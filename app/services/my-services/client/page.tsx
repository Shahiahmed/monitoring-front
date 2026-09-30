'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiFetch, apiUrl } from '../../../lib/api';

interface ServiceClient {
  id: number;
  serviceId: number;
  organizationName: string;
  informationSystem: string | null;
  isPaid: boolean;
  notes: string | null;
  smartBridgeTicket: string | null;
  connectionBasis: string | null;
  connectionDate: string | null;
  contractFileName: string | null;
}

interface MyService {
  id: number;
  serviceName: string;
  serviceKey: string;
}

type ClientForm = Omit<ServiceClient, 'id' | 'contractFileName'>;

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 ' +
  'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500';

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <span className={`text-sm text-slate-800 dark:text-slate-100 leading-relaxed ${mono ? 'font-mono' : ''}`}>
        {value ?? <span className="text-slate-300 dark:text-slate-600 font-normal">—</span>}
      </span>
    </div>
  );
}

function ClientDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  const [client, setClient] = useState<ServiceClient | null>(null);
  const [service, setService] = useState<MyService | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ClientForm | null>(null);
  const [saving, setSaving] = useState(false);

  const [uploadingContract, setUploadingContract] = useState(false);
  const contractInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('authUser') ?? '{}');
      const r: Array<string | { code?: string }> = u?.roles ?? [];
      setIsAdmin(r.some(x => ['ADMIN', 'SUPER_ADMIN'].includes(typeof x === 'string' ? x : (x?.code ?? ''))));
    } catch { /* ignore */ }
  }, []);

  const loadClient = () => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    apiFetch(`my-service-clients/${id}`)
      .then(r => { if (r.status === 404) { setNotFound(true); setLoading(false); return null; } return r.json(); })
      .then((data: ServiceClient | null) => {
        if (!data) return;
        setClient(data);
        return apiFetch(`my-services/${data.serviceId}`).then(r => r.json());
      })
      .then((svcData: MyService | null | undefined) => {
        if (svcData) setService(svcData);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  };

  useEffect(() => { loadClient(); }, [id]);

  const startEdit = () => {
    if (!client) return;
    setForm({
      serviceId: client.serviceId,
      organizationName: client.organizationName,
      informationSystem: client.informationSystem,
      isPaid: client.isPaid,
      notes: client.notes,
      smartBridgeTicket: client.smartBridgeTicket,
      connectionBasis: client.connectionBasis,
      connectionDate: client.connectionDate,
    });
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setForm(null); };

  const save = async () => {
    if (!form || !client || !form.organizationName.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch(`my-service-clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      cancelEdit();
      loadClient();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const deleteClient = async () => {
    if (!client || !confirm('Удалить клиента? Это действие нельзя отменить.')) return;
    await apiFetch(`my-service-clients/${client.id}`, { method: 'DELETE' });
    router.push(`/services/my-services/detail?id=${client.serviceId}`);
  };

  const uploadContract = async (file: File) => {
    if (!client) return;
    setUploadingContract(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiFetch(`my-service-clients/${client.id}/contract`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      loadClient();
    } catch { /* ignore */ }
    finally { setUploadingContract(false); }
  };

  const deleteContract = async () => {
    if (!client || !confirm('Удалить файл договора?')) return;
    await apiFetch(`my-service-clients/${client.id}/contract`, { method: 'DELETE' });
    loadClient();
  };

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound || !client) return (
    <div className="p-6">
      <div className="glass-card p-10 text-center">
        <p className="text-slate-400 font-medium">Клиент не найден</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline">Назад</button>
      </div>
    </div>
  );

  return (
    <div className="p-6 animate-app-reveal">

      {/* Навигация */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <button onClick={() => router.push('/services/my-services')}
            className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            Мои сервисы
          </button>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {service && (
            <>
              <button onClick={() => router.push(`/services/my-services/detail?id=${client.serviceId}`)}
                className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                {service.serviceName}
              </button>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
          <span className="text-slate-700 dark:text-slate-200 font-medium">{client.organizationName}</span>
        </div>
        {isAdmin && !editing && (
          <div className="flex items-center gap-2">
            <button onClick={startEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Редактировать
            </button>
            <button onClick={deleteClient}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Удалить
            </button>
          </div>
        )}
      </div>

      {/* Карточка */}
      <div className="max-w-xl">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Сведения о клиенте</p>
        <div className="glass-card overflow-hidden">

          {/* Шапка */}
          <div className={`px-5 py-4 border-b border-slate-100 dark:border-slate-800 ${
            client.isPaid
              ? 'bg-linear-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10'
              : 'bg-linear-to-r from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/30'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-blue-100 dark:bg-blue-900/40">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              {client.isPaid
                ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/></svg>
                    Платный
                  </span>
                : <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">Бесплатный</span>
              }
            </div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-snug mt-3">{client.organizationName}</h1>
          </div>

          {/* Поля — просмотр */}
          {!editing ? (
            <div className="px-5">
              <InfoRow label="Информационная система" value={client.informationSystem} />
              <InfoRow label="Заявка Smart Bridge" value={client.smartBridgeTicket} mono />
              <InfoRow label="Дата подключения" value={client.connectionDate} />
              <InfoRow label="Основание для подключения" value={client.connectionBasis} />
              {service && (
                <InfoRow label="Сервис" value={
                  <button onClick={() => router.push(`/services/my-services/detail?id=${client.serviceId}`)}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                    {service.serviceName}
                  </button>
                } />
              )}
              <InfoRow label="Примечание" value={client.notes} />

              {/* Договор */}
              <div className="flex flex-col gap-1 py-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Договор</span>
                {client.contractFileName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <a href={apiUrl(`my-service-clients/${client.id}/contract`)}
                      className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {client.contractFileName}
                    </a>
                    {isAdmin && (
                      <button onClick={deleteContract}
                        className="text-red-400 hover:text-red-600 transition-colors p-0.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ) : (
                  isAdmin ? (
                    <>
                      <input ref={contractInputRef} type="file" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadContract(f); e.target.value = ''; }} />
                      <button onClick={() => contractInputRef.current?.click()} disabled={uploadingContract}
                        className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {uploadingContract ? 'Загрузка...' : 'Загрузить файл'}
                      </button>
                    </>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600 text-sm font-normal">—</span>
                  )
                )}
              </div>
            </div>
          ) : form && (
            <div className="px-5 py-4">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Наименование организации *</label>
                  <input value={form.organizationName}
                    onChange={e => setForm(p => p ? { ...p, organizationName: e.target.value } : p)}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Информационная система</label>
                  <input value={form.informationSystem ?? ''}
                    onChange={e => setForm(p => p ? { ...p, informationSystem: e.target.value || null } : p)}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Заявка Smart Bridge</label>
                  <input value={form.smartBridgeTicket ?? ''}
                    onChange={e => setForm(p => p ? { ...p, smartBridgeTicket: e.target.value || null } : p)}
                    placeholder="SB-12345..."
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Дата подключения</label>
                  <input type="date" value={form.connectionDate ?? ''}
                    onChange={e => setForm(p => p ? { ...p, connectionDate: e.target.value || null } : p)}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Основание для подключения</label>
                  <input value={form.connectionBasis ?? ''}
                    onChange={e => setForm(p => p ? { ...p, connectionBasis: e.target.value || null } : p)}
                    placeholder="Договор №... / письмо..."
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Примечание</label>
                  <input value={form.notes ?? ''}
                    onChange={e => setForm(p => p ? { ...p, notes: e.target.value || null } : p)}
                    className={inputCls} />
                </div>
                <div className="flex items-center gap-2">
                  <input id="edit-paid" type="checkbox" checked={form.isPaid}
                    onChange={e => setForm(p => p ? { ...p, isPaid: e.target.checked } : p)}
                    className="h-4 w-4 accent-amber-500" />
                  <label htmlFor="edit-paid" className="text-sm text-slate-700 dark:text-slate-200 cursor-pointer">Платный</label>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={save} disabled={saving || !form.organizationName.trim()}
                    className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button onClick={cancelEdit}
                    className="px-4 py-2 text-sm rounded-lg text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  return <Suspense><ClientDetailContent /></Suspense>;
}
