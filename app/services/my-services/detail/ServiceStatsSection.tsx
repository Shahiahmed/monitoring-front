'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import * as echarts from 'echarts';
import { apiFetch } from '../../../lib/api';

interface StatRow {
  yearMonth: string;
  sender: string | null;
  monthlyCount: number;
  clientName: string | null;
}

interface MongoRow {
  yearMonth: string;
  monthlyCount: number;
  sender: string | null;
  clientName: string | null;
}

const fmt = (n: number) => n.toLocaleString('ru-RU');

const MONTH_NAMES: Record<string, string> = {
  '01':'Янв','02':'Фев','03':'Мар','04':'Апр','05':'Май','06':'Июн',
  '07':'Июл','08':'Авг','09':'Сен','10':'Окт','11':'Ноя','12':'Дек',
};

function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  return `${MONTH_NAMES[m] ?? m} ${y}`;
}

const CURRENT_YEAR = String(new Date().getFullYear());

export function ServiceStatsSection({ serviceKey }: { serviceKey: string }) {
  const [shepRows, setShepRows] = useState<StatRow[]>([]);
  const [mongoRows, setMongoRows] = useState<MongoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(CURRENT_YEAR);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInst = useRef<echarts.ECharts | null>(null);
  const clientChartRef = useRef<HTMLDivElement>(null);
  const clientChartInst = useRef<echarts.ECharts | null>(null);

  // refs для tooltip closure
  const shepRowsRef = useRef<StatRow[]>([]);
  const mongoRowsRef = useRef<MongoRow[]>([]);
  shepRowsRef.current = shepRows;
  mongoRowsRef.current = mongoRows;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`equery-stat/service/${encodeURIComponent(serviceKey)}`).then(r => r.ok ? r.json() : []),
      apiFetch(`mongo-stat/service/${encodeURIComponent(serviceKey)}`).then(r => r.ok ? r.json() : []),
    ]).then(([shep, mongo]: [StatRow[], MongoRow[]]) => {
      setShepRows(shep);
      setMongoRows(mongo);
      setLoading(false);
      const years = [...new Set([
        ...shep.map((r: StatRow) => r.yearMonth.slice(0, 4)),
        ...mongo.map((r: MongoRow) => r.yearMonth.slice(0, 4)),
      ])].sort();
      if (years.length > 0 && !years.includes(CURRENT_YEAR)) {
        setSelectedYear(years[years.length - 1]);
      }
    }).catch(() => setLoading(false));
  }, [serviceKey]);

  const allYears = useMemo(() => {
    const yms = [
      ...shepRows.map(r => r.yearMonth.slice(0, 4)),
      ...mongoRows.map(r => r.yearMonth.slice(0, 4)),
    ];
    return [...new Set(yms)].sort();
  }, [shepRows, mongoRows]);

  // max(shep, mongo) по месяцам — показываем только больший источник
  const totalByMonth = useMemo(() => {
    const shep: Record<string, number> = {};
    const mongo: Record<string, number> = {};
    shepRows.filter(r => r.yearMonth.startsWith(selectedYear))
      .forEach(r => { shep[r.yearMonth] = (shep[r.yearMonth] ?? 0) + Number(r.monthlyCount); });
    mongoRows.filter(r => r.yearMonth.startsWith(selectedYear))
      .forEach(r => { mongo[r.yearMonth] = (mongo[r.yearMonth] ?? 0) + Number(r.monthlyCount); });
    const all = new Set([...Object.keys(shep), ...Object.keys(mongo)]);
    const acc: Record<string, number> = {};
    all.forEach(m => { acc[m] = Math.max(shep[m] ?? 0, mongo[m] ?? 0); });
    return acc;
  }, [shepRows, mongoRows, selectedYear]);

  const shepByMonth = useMemo(() => {
    const acc: Record<string, number> = {};
    shepRows.filter(r => r.yearMonth.startsWith(selectedYear))
      .forEach(r => { acc[r.yearMonth] = (acc[r.yearMonth] ?? 0) + Number(r.monthlyCount); });
    return acc;
  }, [shepRows, selectedYear]);

  const mongoByMonth = useMemo(() => {
    const acc: Record<string, number> = {};
    mongoRows.filter(r => r.yearMonth.startsWith(selectedYear))
      .forEach(r => { acc[r.yearMonth] = (acc[r.yearMonth] ?? 0) + Number(r.monthlyCount); });
    return acc;
  }, [mongoRows, selectedYear]);

  const allMonths = useMemo(() =>
    [...new Set(Object.keys(totalByMonth))].sort(),
  [totalByMonth]);

  const hasAny = allMonths.length > 0;

  // Топ-клиенты: max(shep, mongo) за выбранный год
  const clientData = useMemo(() => {
    const shepC: Record<string, { cnt: number; name: string | null }> = {};
    const mongoC: Record<string, { cnt: number; name: string | null }> = {};
    const add = (acc: typeof shepC, sender: string | null, name: string | null, cnt: number) => {
      if (!sender) return;
      if (!acc[sender]) acc[sender] = { cnt: 0, name: name ?? null };
      acc[sender].cnt += cnt;
      if (!acc[sender].name && name) acc[sender].name = name;
    };
    shepRows.filter(r => r.yearMonth.startsWith(selectedYear) && r.sender)
      .forEach(r => add(shepC, r.sender, r.clientName, Number(r.monthlyCount)));
    mongoRows.filter(r => r.yearMonth.startsWith(selectedYear) && r.sender)
      .forEach(r => add(mongoC, r.sender, r.clientName, Number(r.monthlyCount)));
    const senders = new Set([...Object.keys(shepC), ...Object.keys(mongoC)]);
    return [...senders].map(s => ({
      sender: s,
      label: shepC[s]?.name ?? mongoC[s]?.name ?? s,
      cnt: Math.max(shepC[s]?.cnt ?? 0, mongoC[s]?.cnt ?? 0),
      shepCnt: shepC[s]?.cnt ?? 0,
      mongoCnt: mongoC[s]?.cnt ?? 0,
    })).sort((a, b) => b.cnt - a.cnt).slice(0, 15);
  }, [shepRows, mongoRows, selectedYear]);

  useEffect(() => {
    if (!chartRef.current || allMonths.length === 0) return;
    if (!chartInst.current) chartInst.current = echarts.init(chartRef.current);
    const isDark = document.documentElement.classList.contains('dark');

    chartInst.current.setOption({
      backgroundColor: 'transparent',
      grid: { left: 12, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#1e293b' : '#fff',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        textStyle: { color: isDark ? '#cbd5e1' : '#334155', fontSize: 12 },
        formatter: (params: any) => {
          const idx = params[0]?.dataIndex ?? 0;
          const ym = allMonths[idx];
          const label = params[0]?.axisValueLabel ?? '';
          const total = params[0]?.value ?? 0;

          let html = `<b>${label}</b> — <b>${fmt(total)}</b><br>`;

          // Источники
          const shep = shepByMonth[ym] ?? 0;
          const mongo = mongoByMonth[ym] ?? 0;
          if (shep > 0 || mongo > 0) {
            html += `<div style="margin:5px 0 3px;font-size:11px;opacity:.7;font-weight:600">Источники:</div>`;
            if (shep > 0)  html += `<div><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#2563eb;margin-right:5px"></span>E_QUERY_COUNTS: <b>${fmt(shep)}</b></div>`;
            if (mongo > 0) html += `<div><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#059669;margin-right:5px"></span>MONGO_INOUT_STAT: <b>${fmt(mongo)}</b></div>`;
            if (shep > 0 && mongo > 0) html += `<div style="opacity:.6;font-size:11px">Сумма: <b>${fmt(shep + mongo)}</b></div>`;
          }

          // Клиенты — max(shep, mongo) по каждому сендеру
          const shepClient: Record<string, { cnt: number; name: string | null }> = {};
          const mongoClient: Record<string, { cnt: number; name: string | null }> = {};
          const setRow = (acc: typeof shepClient, sender: string | null, clientName: string | null, count: number) => {
            if (!sender) return;
            if (!acc[sender]) acc[sender] = { cnt: 0, name: clientName ?? null };
            acc[sender].cnt += count;
            if (!acc[sender].name && clientName) acc[sender].name = clientName;
          };
          shepRowsRef.current.filter(r => r.yearMonth === ym && r.sender)
            .forEach(r => setRow(shepClient, r.sender, r.clientName, Number(r.monthlyCount)));
          mongoRowsRef.current.filter(r => r.yearMonth === ym && r.sender)
            .forEach(r => setRow(mongoClient, r.sender, r.clientName, Number(r.monthlyCount)));

          const allSenders = new Set([...Object.keys(shepClient), ...Object.keys(mongoClient)]);
          const clients = [...allSenders].map(s => {
            const sc = shepClient[s];
            const mc = mongoClient[s];
            const name = sc?.name ?? mc?.name ?? s;
            const cnt = Math.max(sc?.cnt ?? 0, mc?.cnt ?? 0);
            return { label: name, cnt };
          }).sort((a, b) => b.cnt - a.cnt).slice(0, 5);

          if (clients.length > 0) {
            html += `<div style="margin-top:6px;border-top:1px solid ${isDark ? '#334155' : '#e2e8f0'};padding-top:5px;font-size:11px;opacity:.85">`;
            html += `<div style="margin-bottom:3px;font-weight:600;opacity:.7">По клиентам:</div>`;
            clients.forEach(c => {
              html += `<div style="display:flex;justify-content:space-between;gap:12px"><span style="max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.label}</span><b>${fmt(c.cnt)}</b></div>`;
            });
            html += `</div>`;
          }
          return html;
        },
      },
      xAxis: {
        type: 'category',
        data: allMonths.map(monthLabel),
        axisLabel: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 11 },
        axisLine: { lineStyle: { color: isDark ? '#334155' : '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: isDark ? '#64748b' : '#94a3b8', fontSize: 11,
          formatter: (v: number) => v >= 1e6 ? (v/1e6).toFixed(1)+'М' : v >= 1e3 ? (v/1e3).toFixed(0)+'К' : String(v),
        },
        splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#f1f5f9' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: allMonths.map(m => totalByMonth[m] ?? 0),
        barMaxWidth: 40,
        itemStyle: { color: isDark ? '#60a5fa' : '#2563eb', borderRadius: [4,4,0,0] },
        label: {
          show: allMonths.length <= 6,
          position: 'top',
          formatter: (p: any) => fmt(p.value),
          color: isDark ? '#64748b' : '#94a3b8',
          fontSize: 10,
        },
      }],
    });
    chartInst.current.resize();
    const onResize = () => chartInst.current?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [allMonths, totalByMonth, shepByMonth, mongoByMonth]);

  // График по клиентам (по месяцам, grouped bars — цвет по clientName)
  useEffect(() => {
    if (!clientChartRef.current || clientData.length === 0) return;
    if (!clientChartInst.current) clientChartInst.current = echarts.init(clientChartRef.current);
    const isDark = document.documentElement.classList.contains('dark');
    const months = allMonths;
    const top15 = clientData.slice(0, 15);
    const COLORS = ['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#be185d','#0e7490','#b45309','#4f46e5'];

    // Уникальные client names → цвет
    const uniqueLabels = [...new Set(top15.map(c => c.label))];
    const colorByLabel: Record<string, string> = {};
    uniqueLabels.forEach((lbl, i) => { colorByLabel[lbl] = COLORS[i % COLORS.length]; });

    const series = top15.map((client) => ({
      name: client.sender, // уникальный ключ серии
      type: 'bar' as const,
      data: months.map(m => {
        const shep = shepRowsRef.current.filter(r => r.yearMonth === m && r.sender === client.sender)
          .reduce((s, r) => s + Number(r.monthlyCount), 0);
        const mongo = mongoRowsRef.current.filter(r => r.yearMonth === m && r.sender === client.sender)
          .reduce((s, r) => s + Number(r.monthlyCount), 0);
        return Math.max(shep, mongo);
      }),
      barMaxWidth: 16,
      itemStyle: { color: colorByLabel[client.label], borderRadius: [3,3,0,0] },
      emphasis: { focus: 'series' as const },
      // Храним label для tooltip
      _clientLabel: client.label,
    }));

    clientChartInst.current.setOption({
      backgroundColor: 'transparent',
      // Легенда по уникальным клиентам
      legend: {
        data: uniqueLabels.map(lbl => ({ name: lbl, itemStyle: { color: colorByLabel[lbl] } })),
        type: 'scroll',
        bottom: 0,
        textStyle: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 10 },
        pageTextStyle: { color: isDark ? '#94a3b8' : '#64748b' },
        // Легенда кликает по label, но серии по sender — связываем через selectedMode
        selectedMode: false,
      },
      grid: { left: 8, right: 16, top: 8, bottom: uniqueLabels.length > 3 ? 60 : 40, containLabel: true },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: isDark ? '#1e293b' : '#fff',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        textStyle: { color: isDark ? '#cbd5e1' : '#334155', fontSize: 12 },
        formatter: (params: any) => {
          const label = params[0]?.axisValueLabel ?? '';
          // Группируем по clientName
          const grouped: Record<string, { color: string; senders: {sender: string; val: number}[] }> = {};
          params.forEach((p: any) => {
            if (p.value <= 0) return;
            const sender = p.seriesName;
            const clientEntry = top15.find(c => c.sender === sender);
            const clientLabel = clientEntry?.label ?? sender;
            if (!grouped[clientLabel]) grouped[clientLabel] = { color: colorByLabel[clientLabel] ?? p.color, senders: [] };
            grouped[clientLabel].senders.push({ sender, val: p.value });
          });
          if (Object.keys(grouped).length === 0) return label;
          let html = `<b>${label}</b><br>`;
          Object.entries(grouped).forEach(([clientName, g]) => {
            const clientTotal = g.senders.reduce((s, x) => s + x.val, 0);
            html += `<div style="margin-top:4px"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${g.color};margin-right:5px"></span><b>${clientName}</b>: <b>${fmt(clientTotal)}</b></div>`;
            if (g.senders.length > 1) {
              g.senders.forEach(({ sender, val }) => {
                html += `<div style="padding-left:16px;font-size:11px;opacity:.8">${sender}: ${fmt(val)}</div>`;
              });
            }
          });
          return html;
        },
      },
      xAxis: {
        type: 'category',
        data: months.map(monthLabel),
        axisLabel: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 11 },
        axisLine: { lineStyle: { color: isDark ? '#334155' : '#e2e8f0' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: isDark ? '#64748b' : '#94a3b8', fontSize: 11,
          formatter: (v: number) => v >= 1e6 ? (v/1e6).toFixed(1)+'М' : v >= 1e3 ? (v/1e3).toFixed(0)+'К' : String(v),
        },
        splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#f1f5f9' } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series,
    });
    clientChartInst.current.resize();
    const onResize = () => clientChartInst.current?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clientData, allMonths]);

  if (!loading && !hasAny) return null;

  return (
    <div>
      {loading ? (
        <div className="glass-card p-6 text-center text-slate-400 text-sm">Загрузка...</div>
      ) : (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">По месяцам</span>
            {allYears.length > 1 && (
              <div className="flex gap-1">
                {allYears.map(y => (
                  <button key={y} onClick={() => setSelectedYear(y)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      y === selectedYear
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}>
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div ref={chartRef} style={{ height: 300, width: '100%' }} />
        </div>
      )}

      {/* График по клиентам */}
      {!loading && clientData.length > 0 && (
        <div className="glass-card p-5 mt-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">По клиентам — {selectedYear}</span>
          <div ref={clientChartRef} style={{ height: 260, width: '100%', marginTop: 12 }} />
        </div>
      )}
    </div>
  );
}
