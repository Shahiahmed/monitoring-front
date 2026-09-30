'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';

interface MyService {
  id: number;
  publishedAt: string | null;
  serviceKey: string;
  informationSystem: string | null;
  serviceName: string;
  sortOrder: number;
  isPaid: boolean;
  smartBridgeTicket: string | null;
  contractFilename: string | null;
  hasContract: boolean;
}

type SortField = 'publishedAt' | 'serviceKey' | 'informationSystem' | 'serviceName' | 'sortOrder' | 'isPaid' | 'smartBridgeTicket';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 25;

function SortIcon({ field, sortField, sortDir }: { field: string; sortField: string; sortDir: SortDir }) {
  if (field !== sortField) return (
    <svg className="w-3 h-3 opacity-30 ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
  return sortDir === 'asc' ? (
    <svg className="w-3 h-3 ml-1 inline-block text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="w-3 h-3 ml-1 inline-block text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default function MyServicesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<MyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(1);

  // Фильтры
  const [fSearch, setFSearch] = useState('');
  const [fIS, setFIS] = useState('');
  const [fPaid, setFPaid] = useState<'all' | 'yes' | 'no'>(() => {
    try { const v = localStorage.getItem('msvc_fPaid'); return (v === 'yes' || v === 'no') ? v : 'all'; } catch { return 'all'; }
  });
  const [fTicket, setFTicket] = useState('');

  useEffect(() => { try { localStorage.setItem('msvc_fPaid', fPaid); } catch {} }, [fPaid]);

  // Сортировка
  const [sortField, setSortField] = useState<SortField>('sortOrder');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const loadRows = useCallback(() => {
    apiFetch('my-services')
      .then(r => r.json())
      .then((data: MyService[]) => { setRows(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRows();
    try {
      const u = JSON.parse(localStorage.getItem('authUser') ?? '{}');
      const r: Array<string | { code?: string }> = u?.roles ?? [];
      setIsAdmin(r.some(x => ['ADMIN', 'SUPER_ADMIN'].includes(typeof x === 'string' ? x : (x?.code ?? ''))));
    } catch { /* ignore */ }
  }, []);

  const isSystems = useMemo(() =>
    Array.from(new Set(rows.map(r => r.informationSystem).filter(Boolean))).sort() as string[],
    [rows]
  );

  const filtered = useMemo(() => {
    const q = fSearch.toLowerCase();
    return rows.filter(r => {
      if (q && !r.serviceName.toLowerCase().includes(q) && !r.serviceKey.toLowerCase().includes(q)) return false;
      if (fIS && r.informationSystem !== fIS) return false;
      if (fPaid === 'yes' && !r.isPaid) return false;
      if (fPaid === 'no' && r.isPaid) return false;
      if (fTicket && !(r.smartBridgeTicket ?? '').toLowerCase().includes(fTicket.toLowerCase())) return false;
      return true;
    });
  }, [rows, fSearch, fIS, fPaid, fTicket]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortField] ?? '';
      const bv = b[sortField] ?? '';
      const cmp = String(av).localeCompare(String(bv), 'ru', { numeric: true });
      if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
      // вторичная сортировка по имени при одинаковом значении
      return a.serviceName.localeCompare(b.serviceName, 'ru');
    });
  }, [filtered, sortField, sortDir]);

  useEffect(() => { setPage(1); }, [fSearch, fIS, fPaid, fTicket, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const clearFilters = () => { setFSearch(''); setFIS(''); setFPaid('all'); setFTicket(''); };
  const hasFilters = fSearch || fIS || fPaid !== 'all' || fTicket;

  const deleteService = async (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation();
    if (!confirm(`Удалить сервис «${name}»?\n\nБудут удалены все клиенты, форматы и поля сервиса.`)) return;
    const res = await apiFetch(`my-services/${id}`, { method: 'DELETE' });
    if (res.ok) loadRows();
    else alert('Ошибка удаления');
  };

  const thCls = (f: SortField) =>
    `py-2.5 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide text-left align-middle cursor-pointer select-none hover:text-slate-600 dark:hover:text-slate-200 transition-colors ${sortField === f ? 'text-blue-500 dark:text-blue-400' : ''}`;

  return (
    <div className="p-6 animate-app-reveal">

      {/* Заголовок */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Мои сервисы</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {loading ? 'Загрузка...' : `${rows.length} сервисов${hasFilters ? ` · показано ${sorted.length}` : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Слайдер: Платные */}
          <button onClick={() => setFPaid(v => v === 'yes' ? 'all' : 'yes')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              fPaid === 'yes' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}>
            <div className={`relative w-8 h-4 rounded-full transition-colors ${fPaid === 'yes' ? 'bg-white/30' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${fPaid === 'yes' ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            Платные
          </button>
          {isAdmin && (
            <button onClick={() => router.push('/services/my-services/add')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Добавить
            </button>
          )}
        </div>
      </div>

      {/* Фильтры */}
      <div className="glass-card p-4 mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Ключ сервиса</label>
            <input type="text" value={fSearch} onChange={e => setFSearch(e.target.value)}
              placeholder="Название или ключ..."
              className="w-full px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Информационная система</label>
            <select value={fIS} onChange={e => setFIS(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Все</option>
              {isSystems.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Smart Bridge</label>
            <input type="text" value={fTicket} onChange={e => setFTicket(e.target.value)}
              placeholder="Номер заявки..."
              className="w-full px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

      {/* Таблица */}
      {loading ? (
        <div className="glass-card p-10 text-center">
          <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-slate-400 text-sm">Загрузка...</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col style={{ width: '2.5rem' }} />
                <col style={{ width: '9rem' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '24%' }} />
                <col />
                <col style={{ width: '5.5rem' }} />
                <col style={{ width: '8rem' }} />
                {isAdmin && <col style={{ width: '5.5rem' }} />}
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <th className="py-2.5 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide text-left">#</th>
                  <th className={thCls('publishedAt')} onClick={() => toggleSort('publishedAt')}>
                    Дата публикации<SortIcon field="publishedAt" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th className={thCls('serviceKey')} onClick={() => toggleSort('serviceKey')}>
                    Ключ сервиса<SortIcon field="serviceKey" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th className={thCls('informationSystem')} onClick={() => toggleSort('informationSystem')}>
                    Информационная система<SortIcon field="informationSystem" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th className={thCls('serviceName')} onClick={() => toggleSort('serviceName')}>
                    Наименование сервиса<SortIcon field="serviceName" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th className={`${thCls('isPaid')} text-center`} onClick={() => toggleSort('isPaid')}>
                    Платный<SortIcon field="isPaid" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th className={thCls('smartBridgeTicket')} onClick={() => toggleSort('smartBridgeTicket')}>
                    Номер заявки Smart Bridge<SortIcon field="smartBridgeTicket" sortField={sortField} sortDir={sortDir} />
                  </th>
                  {isAdmin && <th className="py-2.5 px-3" />}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr key={row.id}
                    onClick={() => router.push(`/services/my-services/detail?id=${row.id}`)}
                    className="border-b border-slate-50 dark:border-slate-800/60 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors cursor-pointer">
                    <td className="px-3 py-3 text-xs text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-3 py-3 text-xs text-slate-500 leading-relaxed">{row.publishedAt ?? '—'}</td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-1 py-0.5 rounded break-all leading-relaxed">{row.serviceKey}</span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed wrap-break-word">
                      {row.informationSystem ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{row.serviceName}</td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {row.isPaid
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">Да</span>
                          : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">Нет</span>
                        }
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500 font-mono break-all">
                      {row.smartBridgeTicket ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    {isAdmin && (
                      <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-0.5">
                          <button onClick={e => { e.stopPropagation(); router.push(`/services/my-services/add?id=${row.id}`); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Редактировать">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={e => deleteService(e, row.id, row.serviceName)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Удалить">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr><td colSpan={isAdmin ? 8 : 7} className="px-4 py-10 text-center text-slate-400 text-sm">Ничего не найдено</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} из {sorted.length}
              </span>
              <div className="flex gap-1 items-center">
                {[{ l: '«', a: () => setPage(1) }, { l: '‹', a: () => setPage(p => Math.max(1, p - 1)) }].map(b => (
                  <button key={b.l} onClick={b.a} disabled={page === 1}
                    className="px-2.5 py-1 text-xs rounded-md text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700">{b.l}</button>
                ))}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => Math.max(1, Math.min(page - 2, totalPages - 4)) + i).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${p === page ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{p}</button>
                ))}
                {[{ l: '›', a: () => setPage(p => Math.min(totalPages, p + 1)) }, { l: '»', a: () => setPage(totalPages) }].map(b => (
                  <button key={b.l} onClick={b.a} disabled={page === totalPages}
                    className="px-2.5 py-1 text-xs rounded-md text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700">{b.l}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
