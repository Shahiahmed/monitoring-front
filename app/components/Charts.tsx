'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useTheme } from './ThemeProvider';

interface MonthPoint { month: string; count: number; totalMinutes: number; }

function useChartColors(theme: string) {
  const isDark = theme === 'dark';
  return {
    text:      isDark ? '#f9fafb' : '#111827',
    subText:   isDark ? '#9ca3af' : '#6b7280',
    splitLine: isDark ? '#374151' : '#f3f4f6',
    tooltipBg: isDark ? 'rgba(31,41,55,0.95)' : 'rgba(255,255,255,0.95)',
    tooltipBd: isDark ? '#4b5563' : '#e5e7eb',
  };
}

const RU_MONTHS = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
function shortMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-');
  return `${RU_MONTHS[parseInt(m, 10) - 1] ?? m} ${y?.slice(2)}`;
}

export interface DashboardData {
  incidents: MonthPoint[];
  works: MonthPoint[];
  prtg: MonthPoint[];
}

export function ActivityChart({ data, isAdmin }: { data: DashboardData; isAdmin?: boolean }) {
  const ref  = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();
  const c = useChartColors(theme);

  useEffect(() => {
    if (!ref.current) return;
    if (!inst.current) inst.current = echarts.init(ref.current);

    const allMonths = Array.from(new Set([
      ...data.incidents.map(d => d.month),
      ...data.works.map(d => d.month),
      ...(isAdmin ? data.prtg.map(d => d.month) : []),
    ])).sort();

    const get = (arr: MonthPoint[], m: string) => arr.find(d => d.month === m)?.count ?? 0;

    const legendData = isAdmin ? ['Инциденты', 'Работы', 'Тревоги PRTG'] : ['Инциденты', 'Работы'];
    const legendSelected: Record<string, boolean> = { 'Инциденты': true, 'Работы': false, 'Тревоги PRTG': false };

    const series = [
      { name: 'Инциденты', type: 'bar',
        data: allMonths.map(m => get(data.incidents, m)),
        itemStyle: { color: '#3b82f6', borderRadius: [3,3,0,0] },
        emphasis: { itemStyle: { opacity: 0.85 } },
        label: { show: true, position: 'top', fontSize: 10, color: c.subText, formatter: (p: {value: number}) => p.value === 0 ? '' : String(p.value) } },
      { name: 'Работы', type: 'bar',
        data: allMonths.map(m => get(data.works, m)),
        itemStyle: { color: '#10b981', borderRadius: [3,3,0,0] },
        emphasis: { itemStyle: { opacity: 0.85 } },
        label: { show: true, position: 'top', fontSize: 10, color: c.subText, formatter: (p: {value: number}) => p.value === 0 ? '' : String(p.value) } },
      ...(isAdmin ? [{ name: 'Тревоги PRTG', type: 'bar',
        data: allMonths.map(m => get(data.prtg, m)),
        itemStyle: { color: '#f59e0b', borderRadius: [3,3,0,0] },
        emphasis: { itemStyle: { opacity: 0.85 } },
        label: { show: true, position: 'top', fontSize: 10, color: c.subText, formatter: (p: {value: number}) => p.value === 0 ? '' : String(p.value) } }] : []),
    ];

    inst.current.setOption({
      backgroundColor: 'transparent',
      title: { text: 'Активность по месяцам', left: 'center', top: 8,
        textStyle: { color: c.text, fontSize: 14, fontWeight: 700 } },
      tooltip: { trigger: 'axis', backgroundColor: c.tooltipBg, borderColor: c.tooltipBd,
        textStyle: { color: c.text } },
      legend: { bottom: 0, textStyle: { color: c.subText, fontSize: 11 },
        data: legendData, selected: legendSelected },
      grid: { left: 40, right: 16, top: 48, bottom: 48, containLabel: false },
      xAxis: { type: 'category', data: allMonths.map(shortMonth),
        axisLabel: { color: c.subText, fontSize: 10, rotate: allMonths.length > 8 ? 30 : 0 },
        axisLine: { lineStyle: { color: c.splitLine } } },
      yAxis: { type: 'value', minInterval: 1,
        splitLine: { lineStyle: { color: c.splitLine } },
        axisLabel: { color: c.subText } },
      series,
    });
  }, [data, theme, c, isAdmin]);

  useEffect(() => {
    const f = () => inst.current?.resize();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);

  return <div ref={ref} className="w-full h-85" />;
}

export function DowntimeChart({ data }: { data: DashboardData }) {
  const ref  = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();
  const c = useChartColors(theme);

  useEffect(() => {
    if (!ref.current) return;
    if (!inst.current) inst.current = echarts.init(ref.current);

    const allMonths = Array.from(new Set([
      ...data.incidents.map(d => d.month),
      ...data.works.map(d => d.month),
    ])).sort();

    const getRawMins = (arr: MonthPoint[], m: string) =>
      Math.round(arr.find(d => d.month === m)?.totalMinutes ?? 0);

    const fmtHhMm = (mins: number) => {
      if (mins === 0) return '';
      const h = Math.floor(mins / 60), m = mins % 60;
      if (h === 0) return `${m} мин`;
      if (m === 0) return `${h} ч`;
      return `${h} ч ${m} мин`;
    };

    inst.current.setOption({
      backgroundColor: 'transparent',
      title: { text: 'Простой по месяцам', left: 'center', top: 8,
        textStyle: { color: c.text, fontSize: 14, fontWeight: 700 } },
      tooltip: { trigger: 'axis', backgroundColor: c.tooltipBg, borderColor: c.tooltipBd,
        textStyle: { color: c.text },
        formatter: (params: echarts.DefaultLabelFormatterCallbackParams[]) =>
          params.filter((p: echarts.DefaultLabelFormatterCallbackParams) => (p.value as number) > 0)
            .map((p: echarts.DefaultLabelFormatterCallbackParams) => `${p.seriesName}: ${fmtHhMm(p.value as number)}`).join('<br/>') },
      legend: { bottom: 0, textStyle: { color: c.subText, fontSize: 11 },
        data: ['Инциденты', 'Работы'],
        selected: { 'Инциденты': true, 'Работы': false } },
      grid: { left: 48, right: 16, top: 48, bottom: 48, containLabel: false },
      xAxis: { type: 'category', data: allMonths.map(shortMonth),
        axisLabel: { color: c.subText, fontSize: 10, rotate: allMonths.length > 8 ? 30 : 0 },
        axisLine: { lineStyle: { color: c.splitLine } } },
      yAxis: { type: 'value', name: 'мин',
        nameTextStyle: { color: c.subText },
        splitLine: { lineStyle: { color: c.splitLine } },
        axisLabel: { color: c.subText, formatter: (v: number) => v >= 60 ? `${Math.floor(v/60)}ч` : `${v}м` } },
      series: [
        { name: 'Инциденты', type: 'bar',
          data: allMonths.map(m => getRawMins(data.incidents, m)),
          itemStyle: { color: '#ef4444', borderRadius: [3,3,0,0] },
          emphasis: { itemStyle: { opacity: 0.85 } },
          label: { show: true, position: 'top', fontSize: 10, color: c.subText, formatter: (p: {value: number}) => fmtHhMm(p.value) } },
        { name: 'Работы', type: 'bar',
          data: allMonths.map(m => getRawMins(data.works, m)),
          itemStyle: { color: '#10b981', borderRadius: [3,3,0,0] },
          emphasis: { itemStyle: { opacity: 0.85 } },
          label: { show: true, position: 'top', fontSize: 10, color: c.subText, formatter: (p: {value: number}) => fmtHhMm(p.value) } },
      ],
    });
  }, [data, theme, c]);

  useEffect(() => {
    const f = () => inst.current?.resize();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);

  return <div ref={ref} className="w-full h-85" />;
}
