'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useTheme } from './ThemeProvider';

export function LineChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!chartRef.current) return;

    // Инициализируем график
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      title: {
        text: 'Мониторинг производительности',
        left: 'center',
        top: 10,
        textStyle: {
          color: theme === 'dark' ? '#f9fafb' : '#111827',
          fontSize: 18,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: theme === 'dark' ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: theme === 'dark' ? '#4b5563' : '#e5e7eb',
        textStyle: {
          color: theme === 'dark' ? '#f9fafb' : '#111827',
        },
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: theme === 'dark' ? '#6b7280' : '#9ca3af',
          },
        },
      },
      legend: {
        data: ['CPU', 'Память', 'Сеть'],
        top: 45,
        textStyle: {
          color: theme === 'dark' ? '#d1d5db' : '#6b7280',
          fontSize: 12,
        },
        itemGap: 20,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '8%',
        top: '25%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
        axisLabel: {
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
        },
        axisLine: {
          lineStyle: {
            color: theme === 'dark' ? '#374151' : '#e5e7eb',
          },
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
        },
        axisLine: {
          lineStyle: {
            color: theme === 'dark' ? '#374151' : '#e5e7eb',
          },
        },
        splitLine: {
          lineStyle: {
            color: theme === 'dark' ? '#374151' : '#f3f4f6',
          },
        },
      },
      series: [
        {
          name: 'CPU',
          type: 'line',
          data: [20, 35, 45, 30, 55, 40, 35],
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 3,
            color: '#3b82f6',
          },
          itemStyle: {
            color: '#3b82f6',
            borderWidth: 2,
            borderColor: '#fff',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.4)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
              ],
            },
          },
          emphasis: {
            focus: 'series',
            itemStyle: {
              borderWidth: 3,
            },
          },
        },
        {
          name: 'Память',
          type: 'line',
          data: [30, 40, 50, 45, 60, 50, 45],
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 3,
            color: '#10b981',
          },
          itemStyle: {
            color: '#10b981',
            borderWidth: 2,
            borderColor: '#fff',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.4)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.05)' },
              ],
            },
          },
          emphasis: {
            focus: 'series',
            itemStyle: {
              borderWidth: 3,
            },
          },
        },
        {
          name: 'Сеть',
          type: 'line',
          data: [15, 25, 35, 30, 40, 35, 30],
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 3,
            color: '#f59e0b',
          },
          itemStyle: {
            color: '#f59e0b',
            borderWidth: 2,
            borderColor: '#fff',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(245, 158, 11, 0.4)' },
                { offset: 1, color: 'rgba(245, 158, 11, 0.05)' },
              ],
            },
          },
          emphasis: {
            focus: 'series',
            itemStyle: {
              borderWidth: 3,
            },
          },
        },
      ],
    };

    chartInstance.current.setOption(option);

    // Обработка изменения размера окна
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  return <div ref={chartRef} className="w-full h-[400px]" />;
}

export function BarChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      title: {
        text: 'Статистика инцидентов',
        left: 'center',
        top: 10,
        textStyle: {
          color: theme === 'dark' ? '#f9fafb' : '#111827',
          fontSize: 18,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: theme === 'dark' ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: theme === 'dark' ? '#4b5563' : '#e5e7eb',
        textStyle: {
          color: theme === 'dark' ? '#f9fafb' : '#111827',
        },
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: theme === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(0, 0, 0, 0.1)',
          },
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '8%',
        top: '20%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        axisLabel: {
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
        },
        axisLine: {
          lineStyle: {
            color: theme === 'dark' ? '#374151' : '#e5e7eb',
          },
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
        },
        axisLine: {
          lineStyle: {
            color: theme === 'dark' ? '#374151' : '#e5e7eb',
          },
        },
        splitLine: {
          lineStyle: {
            color: theme === 'dark' ? '#374151' : '#f3f4f6',
          },
        },
      },
      series: [
        {
          name: 'Критические',
          type: 'bar',
          data: [5, 8, 3, 6, 4, 2, 1],
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#ef4444' },
                { offset: 1, color: '#dc2626' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(239, 68, 68, 0.5)',
            },
          },
        },
        {
          name: 'Предупреждения',
          type: 'bar',
          data: [12, 15, 10, 18, 14, 8, 6],
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#f59e0b' },
                { offset: 1, color: '#d97706' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(245, 158, 11, 0.5)',
            },
          },
        },
        {
          name: 'Информационные',
          type: 'bar',
          data: [25, 30, 28, 35, 32, 20, 15],
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#3b82f6' },
                { offset: 1, color: '#2563eb' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(59, 130, 246, 0.5)',
            },
          },
        },
      ],
      legend: {
        data: ['Критические', 'Предупреждения', 'Информационные'],
        top: 45,
        textStyle: {
          color: theme === 'dark' ? '#d1d5db' : '#6b7280',
          fontSize: 12,
        },
        itemGap: 20,
      },
    };

    chartInstance.current.setOption(option);

    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  return <div ref={chartRef} className="w-full h-[400px]" />;
}
