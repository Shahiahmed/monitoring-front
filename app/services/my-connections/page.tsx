'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { apiFetch } from '../../lib/api';

interface MyConnection {
  id: number;
  connectionDate: string | null;
  serviceKey: string;
  serviceOwner: string | null;
  isOwner: string | null;
  isClientMtzn: string | null;
  smartBridgeTicket: string | null;
}

type SortField = 'connectionDate' | 'serviceKey' | 'serviceOwner' | 'isOwner' | 'isClientMtzn' | 'smartBridgeTicket';
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

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export default function MyConnectionsPage() {
  const [rows, setRows] = useState<MyConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [fSearch, setFSearch] = useState('');
  const [fOwner, setFOwner] = useState('');
  const [fIsClient, setFIsClient] = useState('');
  const [owners, setOwners] = useState<string[]>([]);
  const [isClients, setIsClients] = useState<string[]>([]);

  const [sortField, setSortField] = useState<SortField>('connectionDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const load = useCallback(() => {
    apiFetch('my-connections')
      .then(r => r.json())
      .then((data: MyConnection[]) => { setRows(data); setLoading(false); })
      .catch(() => setLoading(false));
    apiFetch('my-connections/owners').then(r => r.json()).then(setOwners).catch(() => {});
    apiFetch('my-connections/is-clients').then(r => r.json()).then(setIsClients).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = fSearch.toLowerCase();
    return rows.filter(r => {
      if (q && !r.serviceKey.toLowerCase().includes(q)) return false;
      if (fOwner && r.serviceOwner !== fOwner) return false;
      if (fIsClient && r.isClientMtzn !== fIsClient) return false;
      return true;
    });
  }, [rows, fSearch, fOwner, fIsClient]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortField] ?? '';
      const bv = b[sortField] ?? '';
      const cmp = String(av).localeCompare(String(bv), 'ru', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  useEffect(() => { setPage(1); }, [fSearch, fOwner, fIsClient, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const thCls = (f: SortField) =>
    `py-2.5 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide text-left align-middle cursor-pointer select-none hover:text-slate-600 dark:hover:text-slate-200 transition-colors ${sortField === f ? 'text-blue-500 dark:text-blue-400' : ''}`;

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="p-6 animate-app-reveal">

      {/* Заголовок */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Мои подключения</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {loading ? 'Загрузка...' : `${rows.length} подключений${filtered.length !== rows.length ? ` · показано ${filtered.length}` : ''}`}
          </p>
        </div>
      </div>

      {/* Фильтры */}
      <div className="glass-card p-4 mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Ключ сервиса</label>
          <input type="text" value={fSearch} onChange={e => setFSearch(e.target.value)}
            placeholder="Введите ключ..."
            className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Владелец сервиса</label>
          <select value={fOwner} onChange={e => setFOwner(e.target.value)} className={inputCls}>
            <option value="">Все</option>
            {owners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">ИС клиента МТСЗН</label>
          <select value={fIsClient} onChange={e => setFIsClient(e.target.value)} className={inputCls}>
            <option value="">Все</option>
            {isClients.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
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
                <col style={{ width: '8rem' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '18%' }} />
                <col />
                <col style={{ width: '8rem' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <th className="py-2.5 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide text-left">#</th>
                  <th className={thCls('connectionDate')} onClick={() => toggleSort('connectionDate')}>
                    Дата<SortIcon field="connectionDate" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th className={thCls('serviceKey')} onClick={() => toggleSort('serviceKey')}>
                    Ключ сервиса<SortIcon field="serviceKey" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th className={thCls('serviceOwner')} onClick={() => toggleSort('serviceOwner')}>
                    Владелец сервиса<SortIcon field="serviceOwner" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th className={thCls('isOwner')} onClick={() => toggleSort('isOwner')}>
                    ИС владельца<SortIcon field="isOwner" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th className={thCls('isClientMtzn')} onClick={() => toggleSort('isClientMtzn')}>
                    ИС клиента МТСЗН<SortIcon field="isClientMtzn" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th className={thCls('smartBridgeTicket')} onClick={() => toggleSort('smartBridgeTicket')}>
                    Номер заявки Smart Bridge<SortIcon field="smartBridgeTicket" sortField={sortField} sortDir={sortDir} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr key={row.id}
                    className="border-b border-slate-50 dark:border-slate-800/60 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors">
                    <td className="px-3 py-3 text-xs text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(row.connectionDate)}</td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-1 py-0.5 rounded break-all leading-relaxed">{row.serviceKey}</span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {row.serviceOwner ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {row.isOwner ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                      {row.isClientMtzn ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500 font-mono">
                      {row.smartBridgeTicket ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">Ничего не найдено</td></tr>
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
