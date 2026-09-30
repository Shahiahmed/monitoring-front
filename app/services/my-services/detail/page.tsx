'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';
import { FieldsSection } from './FieldsSection';
import { ClientsSection } from './ClientsSection';
import { SbFilesSection } from './SbFilesSection';
import { ServiceStatsSection } from './ServiceStatsSection';

interface MyService {
  id: number;
  publishedAt: string | null;
  serviceKey: string;
  informationSystem: string | null;
  serviceName: string;
  isPaid: boolean;
  smartBridgeTicket: string | null;
}


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

function DetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  const [svc, setSvc] = useState<MyService | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);


  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('authUser') ?? '{}');
      const r: Array<string | { code?: string }> = u?.roles ?? [];
      setIsAdmin(r.some(x => ['ADMIN', 'SUPER_ADMIN'].includes(typeof x === 'string' ? x : (x?.code ?? ''))));
    } catch { /* ignore */ }
  }, []);

  const loadSvc = () => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    apiFetch(`my-services/${id}`)
      .then(r => { if (r.status === 404) { setNotFound(true); setLoading(false); return null; } return r.json(); })
      .then((data: MyService | null) => { if (data) setSvc(data); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  };

  useEffect(() => { loadSvc(); }, [id]);

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound || !svc) return (
    <div className="p-6">
      <div className="glass-card p-10 text-center">
        <p className="text-slate-400 font-medium">Сервис не найден</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline">Назад</button>
      </div>
    </div>
  );

  return (
    <div className="p-6 animate-app-reveal">

      {/* Навигация */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Мои сервисы
        </button>
        {isAdmin && (
          <button onClick={() => router.push(`/services/my-services/add?id=${svc.id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Редактировать
          </button>
        )}
      </div>

      {/* Основной grid: сведения слева, форматы справа */}
      <div className="grid grid-cols-5 gap-5 items-start mb-5">

        {/* ── ЛЕВАЯ КОЛОНКА: Сведения + Договор ── */}
        <div className="col-span-2 flex flex-col gap-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Сведения о сервисе</p>
        <div className="glass-card overflow-hidden">

          {/* Шапка карточки */}
          <div className={`px-5 py-4 border-b border-slate-100 dark:border-slate-800 ${
            svc.isPaid
              ? 'bg-linear-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10'
              : 'bg-linear-to-r from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/30'
          }`}>
            <div className="flex justify-end mb-3">
              {svc.isPaid
                ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/></svg>
                    Платный
                  </span>
                : <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">Бесплатный</span>
              }
            </div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-snug">{svc.serviceName}</h1>
          </div>

          {/* Поля сведений */}
          <div className="px-5">
            <InfoRow label="Ключ сервиса" value={svc.serviceKey} mono />
            <InfoRow label="Информационная система" value={svc.informationSystem} />
            <InfoRow label="Дата публикации" value={svc.publishedAt} mono />
            <InfoRow label="Заявка Smart Bridge" value={svc.smartBridgeTicket} mono />
          </div>
        </div>

        <SbFilesSection serviceKey={svc.serviceKey} />
        <ClientsSection serviceId={svc.id} isAdmin={isAdmin} />
        </div>{/* end left col */}

        {/* ── ПРАВАЯ КОЛОНКА: Статистика + Форматы данных ── */}
        <div className="col-span-3 flex flex-col gap-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Статистика запросов</p>
          <ServiceStatsSection serviceKey={svc.serviceKey} />
          <FieldsSection serviceId={svc.id} isAdmin={isAdmin} />
        </div>

      </div>
    </div>
  );
}

export default function MyServiceDetailPage() {
  return <Suspense><DetailContent /></Suspense>;
}
