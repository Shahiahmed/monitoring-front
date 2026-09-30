'use client';

import { useEffect, useState, useRef } from 'react';
import * as echarts from 'echarts';
import { apiUrl } from '../../lib/api';

interface MongoStatRow {
  id: number;
  SUBSYSTEM: string;
  SENDER_ID: string | null;
  STAT_YEAR: number;
  STAT_MONTH: number;
  CNT: number;
}

interface ApiResponse {
  rows: MongoStatRow[];
  lastSync: string | null;
}

const MONTH_NAMES: Record<number, string> = {
  1:'Январь',2:'Февраль',3:'Март',4:'Апрель',5:'Май',6:'Июнь',
  7:'Июль',8:'Август',9:'Сентябрь',10:'Октябрь',11:'Ноябрь',12:'Декабрь',
};

const fmt = (n: number) => n.toLocaleString('ru-RU');

const REFRESH_MS = 5 * 60 * 1000; // 5 минут

function formatSync(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

export default function PublicIntegrationsPage() {
  const [rows,        setRows]       = useState<MongoStatRow[]>([]);
  const [lastSync,    setLastSync]   = useState<string | null>(null);
  const [period,      setPeriod]     = useState('');
  const [countdown,   setCountdown]  = useState(REFRESH_MS / 1000);
  const [loading,     setLoading]    = useState(true);
  const chartRef   = useRef<HTMLDivElement>(null);
  const chartInst  = useRef<echarts.ECharts | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = () => {
    fetch(apiUrl('mongo-stat'))
      .then(r => r.json())
      .then((data: ApiResponse) => {
        setRows(data.rows ?? []);
        setLastSync(data.lastSync ?? null);
        if (data.rows?.length) {
          const first = data.rows[0];
          setPeriod(`${first.STAT_YEAR}-${first.STAT_MONTH}`);
        }
        setLoading(false);
        setCountdown(REFRESH_MS / 1000);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  // Обратный отсчёт
  useEffect(() => {
    const tick = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 0), 1000);
    return () => clearInterval(tick);
  }, []);

  // Периоды
  const periods = Array.from(
    new Map(rows.map(r => [`${r.STAT_YEAR}-${r.STAT_MONTH}`, r])).entries()
  ).map(([key, r]) => ({ key, year: r.STAT_YEAR, month: r.STAT_MONTH }))
   .sort((a, b) => b.year - a.year || b.month - a.month);

  const [selYear, selMonth] = period.split('-').map(Number);
  const filtered = rows.filter(r => r.STAT_YEAR === selYear && r.STAT_MONTH === selMonth);
  const total    = filtered.reduce((s, r) => s + Number(r.CNT), 0);
  const top15    = [...filtered].slice(0, 15);

  // График
  useEffect(() => {
    if (!chartRef.current || filtered.length === 0) return;
    if (!chartInst.current) chartInst.current = echarts.init(chartRef.current);

    const top = [...filtered].slice(0, 20).reverse();
    chartInst.current.setOption({
      backgroundColor: 'transparent',
      animation: true, animationDuration: 800,
      grid: { left: 8, right: 140, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: '#1e293b', borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 14 },
        formatter: (p: any) => {
          const v = p[0];
          const pct = total > 0 ? (v.value / total * 100).toFixed(2) : '0';
          return `<b>${v.axisValueLabel}</b><br>Запросов: <b>${fmt(v.value)}</b> (${pct}%)`;
        }
      },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 13, formatter: (v: number) => v >= 1e6 ? (v/1e6).toFixed(0)+'М' : v >= 1e3 ? (v/1e3).toFixed(0)+'К' : String(v) },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      yAxis: {
        type: 'category', data: top.map(r => r.SENDER_ID ? `${r.SUBSYSTEM} · ${r.SENDER_ID}` : r.SUBSYSTEM),
        axisLabel: { color: '#cbd5e1', fontSize: 13, fontFamily: 'monospace', width: 260, overflow: 'truncate' },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series: [{
        type: 'bar', data: top.map(r => Number(r.CNT)), barMaxWidth: 24,
        itemStyle: { color: '#3b82f6', borderRadius: [0, 6, 6, 0] },
        emphasis: { itemStyle: { color: '#60a5fa' } },
        label: { show: true, position: 'right', formatter: (p: any) => fmt(p.value), color: '#94a3b8', fontSize: 13, fontWeight: 600 },
      }],
    }, true);

    const onResize = () => chartInst.current?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [filtered, total]);

  const mins = Math.floor(countdown / 60);
  const secs = String(countdown % 60).padStart(2, '0');

  return (
    <>
      <style>{`
        html, body { background: #0f172a !important; color: #e2e8f0; }
        .wall-card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; }
        .wall-chip { padding: 6px 18px; border-radius: 999px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all .2s; border: none; }
        .wall-chip-active { background: #2563eb; color: #fff; }
        .wall-chip-idle   { background: #1e293b; color: #94a3b8; }
        .wall-chip-idle:hover { background: #334155; color: #cbd5e1; }
        .stat-val { font-size: 2.6rem; font-weight: 800; line-height: 1; letter-spacing: -1px; color: #f1f5f9; }
        .stat-lbl { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px; }
        .mini-bar { height: 4px; border-radius: 2px; background: #334155; overflow: hidden; margin-top: 4px; }
        .mini-bar-fill { height: 100%; border-radius: 2px; background: #3b82f6; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0f172a', padding: '28px 32px', fontFamily: 'system-ui, sans-serif' }}>

        {/* Шапка */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px' }}>
              Статистика интеграций — ESERV
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              Oracle GCVP · ESERV.MONGO_INOUT_STAT
              {lastSync && <span style={{ marginLeft: 12 }}>· синхр. {formatSync(lastSync)}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: '#475569' }}>Обновление через</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: countdown < 30 ? '#f59e0b' : '#3b82f6', fontVariantNumeric: 'tabular-nums' }}>
              {mins}:{secs}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div style={{ color: '#475569', fontSize: 16 }}>Загрузка данных...</div>
          </div>
        ) : (
          <>
            {/* Фильтр периодов */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {periods.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)}
                  className={`wall-chip ${period === p.key ? 'wall-chip-active' : 'wall-chip-idle'}`}>
                  {MONTH_NAMES[p.month]} {p.year}
                </button>
              ))}
            </div>

            {/* Тайлы */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
              <div className="wall-card" style={{ padding: '20px 24px' }}>
                <div className="stat-lbl">Всего запросов</div>
                <div className="stat-val">{fmt(total)}</div>
              </div>
              <div className="wall-card" style={{ padding: '20px 24px' }}>
                <div className="stat-lbl">Подсистем в периоде</div>
                <div className="stat-val">{filtered.length}</div>
              </div>
              <div className="wall-card" style={{ padding: '20px 24px' }}>
                <div className="stat-lbl">Лидер</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.2 }}>{filtered[0]?.SUBSYSTEM ?? '—'}</div>
                {filtered[0] && total > 0 && (
                  <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
                    {(Number(filtered[0].CNT) / total * 100).toFixed(1)}% от общего
                  </div>
                )}
              </div>
            </div>

            {/* График + Таблица */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16 }}>

              {/* График */}
              <div className="wall-card" style={{ padding: '20px 24px' }}>
                <div className="stat-lbl" style={{ marginBottom: 16 }}>Топ 20 — {MONTH_NAMES[selMonth]} {selYear}</div>
                <div ref={chartRef} style={{ height: Math.max(360, Math.min(filtered.length, 20) * 36), width: '100%' }} />
              </div>

              {/* Таблица топ-15 */}
              <div className="wall-card" style={{ padding: '20px 0', display: 'flex', flexDirection: 'column' }}>
                <div className="stat-lbl" style={{ padding: '0 20px', marginBottom: 12 }}>Топ 15</div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {top15.map((row, i) => {
                    const cnt = Number(row.CNT);
                    const barW = filtered.length > 0 && Number(filtered[0].CNT) > 0
                      ? (cnt / Number(filtered[0].CNT) * 100) : 0;
                    const pct = total > 0 ? (cnt / total * 100).toFixed(1) : '0';
                    return (
                      <div key={row.id ?? i} style={{
                        display: 'grid', gridTemplateColumns: '22px 1fr auto',
                        gap: 8, alignItems: 'center',
                        padding: '8px 20px',
                        borderBottom: '1px solid #1e293b',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(30,41,59,.4)',
                      }}>
                        <div style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>{i+1}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
                            {row.SENDER_ID ? `${row.SUBSYSTEM} · ${row.SENDER_ID}` : row.SUBSYSTEM}
                          </div>
                          <div className="mini-bar"><div className="mini-bar-fill" style={{ width: `${barW}%` }} /></div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{fmt(cnt)}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{pct}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
