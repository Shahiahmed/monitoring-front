'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import * as echarts from 'echarts';
import { apiFetch } from '../../lib/api';

interface MongoRow {
  id: number; SUBSYSTEM: string; SENDER_ID: string | null;
  STAT_YEAR: number; STAT_MONTH: number; CNT: number;
}
interface EQueryRow {
  id: number; YEAR_MONTH: string; CODE: string;
  SHEP_SERVICE_ID: string | null; MONTHLY_COUNT: number;
}
interface ApiResponse<T> { rows: T[]; lastSync: string | null; }

// Унифицированная строка
interface UnifiedRow {
  key: string;
  service: string;
  detail: string | null;
  cnt: number;
  source: 'MONGO' | 'EQUERY';
}

const MONTH_NAMES: Record<number, string> = {
  1:'Январь',2:'Февраль',3:'Март',4:'Апрель',5:'Май',6:'Июнь',
  7:'Июль',8:'Август',9:'Сентябрь',10:'Октябрь',11:'Ноябрь',12:'Декабрь',
};
const fmt = (n: number) => n.toLocaleString('ru-RU');
const PAGE_SIZE = 25;
function fmtSync(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function parseYM(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return { year: y, month: m };
}

export default function IntegrationsPage() {
  const [mongoRows, setMongoRows] = useState<MongoRow[]>([]);
  const [mongoSync, setMongoSync] = useState<string | null>(null);
  const [mongoSyncing, setMongoSyncing] = useState(false);

  const [eRows, setERows]   = useState<EQueryRow[]>([]);
  const [eSync, setESync]   = useState<string | null>(null);
  const [eSyncing, setESyncing] = useState(false);

  const [period,  setPeriod]  = useState('');
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const chartRef  = useRef<HTMLDivElement>(null);
  const chartInst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('authUser') ?? '{}');
      const r: Array<string | { code?: string }> = u?.roles ?? [];
      setIsAdmin(r.some(x => ['ADMIN','SUPER_ADMIN'].includes(typeof x === 'string' ? x : (x?.code ?? ''))));
    } catch { /* ignore */ }
  }, []);

  const loadAll = useCallback(() => {
    setLoading(true); setError(null);
    Promise.all([
      apiFetch('mongo-stat').then(r => r.ok ? r.json() : Promise.reject('mongo')),
      apiFetch('equery-stat').then(r => r.ok ? r.json() : Promise.reject('equery')),
    ]).then(([mongo, eq]: [ApiResponse<MongoRow>, ApiResponse<EQueryRow>]) => {
      setMongoRows(mongo.rows ?? []);
      setMongoSync(mongo.lastSync ?? null);
      setERows(eq.rows ?? []);
      setESync(eq.lastSync ?? null);
      setLoading(false);
    }).catch(() => { setError('Не удалось загрузить данные'); setLoading(false); });
  }, []);

  useEffect(() => { loadAll(); }, []);

  // Все периоды из обоих источников
  const allPeriods = Array.from(new Set([
    ...mongoRows.map(r => `${r.STAT_YEAR}-${String(r.STAT_MONTH).padStart(2,'0')}`),
    ...eRows.map(r => r.YEAR_MONTH),
  ])).sort((a, b) => b.localeCompare(a));

  useEffect(() => {
    if (!period && allPeriods.length > 0) setPeriod(allPeriods[0]);
  }, [allPeriods.length]);

  useEffect(() => { setPage(1); }, [period]);

  // Объединяем данные за выбранный период
  const { year: selYear, month: selMonth } = period ? parseYM(period) : { year: 0, month: 0 };

  const unified: UnifiedRow[] = [
    ...mongoRows
      .filter(r => r.STAT_YEAR === selYear && r.STAT_MONTH === selMonth)
      .map(r => ({
        key: `mongo-${r.id}`,
        service: r.SUBSYSTEM,
        detail: r.SENDER_ID,
        cnt: Number(r.CNT),
        source: 'MONGO' as const,
      })),
    ...eRows
      .filter(r => r.YEAR_MONTH === period)
      .map(r => ({
        key: `eq-${r.id}`,
        service: r.CODE,
        detail: null,
        cnt: Number(r.MONTHLY_COUNT),
        source: 'EQUERY' as const,
      })),
  ].sort((a, b) => b.cnt - a.cnt);

  const total     = unified.reduce((s, r) => s + r.cnt, 0);
  const totalPages = Math.max(1, Math.ceil(unified.length / PAGE_SIZE));
  const pageRows  = unified.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  // Синхронизации
  const lastSync = mongoSync || eSync
    ? [mongoSync, eSync].filter(Boolean).sort().pop() ?? null
    : null;

  const syncMongo = async () => {
    setMongoSyncing(true);
    try { const r = await apiFetch('mongo-stat/sync', { method: 'POST' }); if (!r.ok) throw new Error(); await loadAll(); }
    catch { setError('Ошибка синхронизации MONGO_INOUT_STAT'); } finally { setMongoSyncing(false); }
  };
  const syncEQuery = async () => {
    setESyncing(true);
    try { const r = await apiFetch('equery-stat/sync', { method: 'POST' }); if (!r.ok) throw new Error(); await loadAll(); }
    catch { setError('Ошибка синхронизации E_QUERY_COUNTS'); } finally { setESyncing(false); }
  };

  // График
  useEffect(() => {
    if (!chartRef.current || unified.length === 0) return;
    if (!chartInst.current) chartInst.current = echarts.init(chartRef.current);
    const isDark = document.documentElement.classList.contains('dark');
    const top = [...unified].slice(0, 15).reverse();
    chartInst.current.setOption({
      backgroundColor: 'transparent',
      animation: true, animationDuration: 500,
      grid: { left: 8, right: 110, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: isDark ? '#1e293b' : '#fff',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        textStyle: { color: isDark ? '#cbd5e1' : '#334155', fontSize: 12 },
        formatter: (p: any) => {
          const v = p[0];
          const pct = total > 0 ? (v.value/total*100).toFixed(2) : '0';
          return `<b style="font-family:monospace">${v.axisValueLabel}</b><br>Запросов: <b>${fmt(v.value)}</b> (${pct}%)`;
        }
      },
      xAxis: {
        type: 'value',
        axisLabel: { color: isDark?'#64748b':'#94a3b8', fontSize:11, formatter:(v:number)=>v>=1e6?(v/1e6).toFixed(0)+'М':v>=1e3?(v/1e3).toFixed(0)+'К':String(v) },
        splitLine: { lineStyle: { color: isDark?'#1e293b':'#f1f5f9' } },
        axisLine: { show:false }, axisTick: { show:false },
      },
      yAxis: {
        type: 'category',
        data: top.map(r => r.service),
        axisLabel: { color: isDark?'#cbd5e1':'#334155', fontSize:11, fontFamily:'monospace', width:200, overflow:'truncate' },
        axisLine: { show:false }, axisTick: { show:false },
      },
      series: [{
        type: 'bar',
        data: top.map(r => ({
          value: r.cnt,
          itemStyle: { color: r.source === 'MONGO' ? (isDark?'#60a5fa':'#2563eb') : (isDark?'#34d399':'#059669') },
        })),
        barMaxWidth: 18,
        itemStyle: { borderRadius: [0,4,4,0] },
        label: { show:true, position:'right', formatter:(p:any)=>fmt(p.value), color:isDark?'#64748b':'#94a3b8', fontSize:11, fontWeight:500 },
      }],
    }, true);
    const onResize = () => chartInst.current?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [unified, total]);

  return (
    <div className="p-6 animate-app-reveal">

      {/* Заголовок */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Запросы сервисов</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Oracle GCVP · ESERV
            {lastSync && <span className="ml-2 opacity-60">· синхр. {fmtSync(lastSync)}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/wall/integrations" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            На стенде
          </a>
          {isAdmin && <>
            <button onClick={syncMongo} disabled={mongoSyncing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all">
              <svg className={`w-3.5 h-3.5 ${mongoSyncing?'animate-spin':''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {mongoSyncing ? 'Синхр...' : 'Синхр. MONGO'}
            </button>
            <button onClick={syncEQuery} disabled={eSyncing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-all">
              <svg className={`w-3.5 h-3.5 ${eSyncing?'animate-spin':''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {eSyncing ? 'Синхр...' : 'Синхр. EQUERY'}
            </button>
          </>}
        </div>
      </div>

      {error && <div className="glass-card p-4 text-red-600 dark:text-red-400 text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="glass-card p-10 text-center">
          <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-slate-400 text-sm">Загрузка...</p>
        </div>
      ) : (
        <>
          {/* Фильтр периода */}
          <div className="flex flex-wrap gap-2 mb-5">
            {allPeriods.map(p => {
              const { year, month } = parseYM(p);
              return (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    period === p ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}>
                  {MONTH_NAMES[month]} {year}
                </button>
              );
            })}
          </div>

          {unified.length === 0 ? (
            <div className="glass-card p-10 text-center text-slate-400 text-sm">
              Нет данных за этот период. Нажмите «Синхронизировать» для загрузки из Oracle.
            </div>
          ) : (
            <>
              {/* Легенда источников */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-block w-3 h-3 rounded-sm bg-blue-600 dark:bg-blue-400" />
                  MONGO_INOUT_STAT
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-block w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-400" />
                  E_QUERY_COUNTS
                </div>
              </div>

              {/* Тайлы */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="glass-card p-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Всего запросов</div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{fmt(total)}</div>
                </div>
                <div className="glass-card p-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Записей в периоде</div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{unified.length}</div>
                </div>
                <div className="glass-card p-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Лидер</div>
                  <div className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">{unified[0]?.service ?? '—'}</div>
                  {unified[0] && <div className="text-xs text-slate-400 mt-0.5">{(unified[0].cnt/total*100).toFixed(1)}% от общего</div>}
                </div>
              </div>

              {/* График */}
              <div className="glass-card p-5 mb-5">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Топ 15 — {MONTH_NAMES[selMonth]} {selYear}
                </div>
                <div ref={chartRef} style={{ height: Math.max(280, Math.min(unified.length, 15) * 30), width: '100%' }} />
              </div>

              {/* Таблица */}
              <div className="glass-card overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Все записи</span>
                  <span className="text-xs text-slate-400">{unified.length} записей</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                        {['#','Источник','Сервис','Sender','Запросов','Доля'].map(h => (
                          <th key={h} className={`py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide ${
                            h==='#'?'px-5 text-left w-10':h==='Запросов'||h==='Доля'?'px-4 text-right':'px-4 text-left'
                          }`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((row, i) => {
                        const pct = total > 0 ? row.cnt/total*100 : 0;
                        const barW = unified[0] ? row.cnt/unified[0].cnt*100 : 0;
                        const isMongo = row.source === 'MONGO';
                        return (
                          <tr key={row.key} className="border-b border-slate-50 dark:border-slate-800/60 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                            <td className="px-5 py-2.5 text-xs text-slate-400">{(page-1)*PAGE_SIZE+i+1}</td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${
                                isMongo ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                              }`}>
                                {isMongo ? 'MONGO' : 'EQUERY'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5"><span className="font-mono font-semibold text-xs text-slate-800 dark:text-slate-200">{row.service}</span></td>
                            <td className="px-4 py-2.5 text-xs text-slate-500">{row.detail ?? <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                            <td className="px-4 py-2.5 text-right">
                              <span className="font-bold text-slate-800 dark:text-slate-100">{fmt(row.cnt)}</span>
                              <div className="mt-1 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div className={`h-full rounded-full opacity-70 ${isMongo?'bg-blue-500':'bg-emerald-500'}`} style={{ width:`${barW}%` }} />
                              </div>
                            </td>
                            <td className="px-5 py-2.5 text-right text-xs text-slate-500 tabular-nums">{pct.toFixed(2)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-400">{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, unified.length)} из {unified.length}</span>
                    <div className="flex gap-1 items-center">
                      {[{l:'«',a:()=>setPage(1)},{l:'‹',a:()=>setPage(p=>p-1)}].map(b=>(
                        <button key={b.l} onClick={b.a} disabled={page===1} className="px-2.5 py-1 text-xs rounded-md text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700">{b.l}</button>
                      ))}
                      {Array.from({length:Math.min(5,totalPages)},(_,i)=>Math.max(1,Math.min(page-2,totalPages-4))+i).map(p=>(
                        <button key={p} onClick={()=>setPage(p)} className={`px-2.5 py-1 text-xs rounded-md transition-colors ${p===page?'bg-blue-600 text-white':'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{p}</button>
                      ))}
                      {[{l:'›',a:()=>setPage(p=>p+1)},{l:'»',a:()=>setPage(totalPages)}].map(b=>(
                        <button key={b.l} onClick={b.a} disabled={page===totalPages} className="px-2.5 py-1 text-xs rounded-md text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700">{b.l}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
