"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as echarts from "echarts";
import { useTheme } from "../components/ThemeProvider";
import { apiFetch } from "../lib/api";

interface Server {
  id: number;
  active: boolean | null;
  description: string | null;
  ip: string | null;
  envId: number | null;
  envNameRu: string | null;
  warnRam: number | null;
  warnDisk: number | null;
  critRam: number | null;
  critDisk: number | null;
}

interface ServerMetrics {
  serverId: number;
  cpuPercent: number | null;
  memoryPercent: number | null;
  diskPercent: number | null;
  memoryUsedMb: number | null;
  memoryTotalMb: number | null;
  memoryAvailableMb: number | null;
  diskUsedGb: number | null;
  diskTotalGb: number | null;
  error: string | null;
}

const PROD_ENV_ID = 2;

function useChartTheme(theme: string) {
  const isDark = theme === "dark";
  return {
    text: isDark ? "#f9fafb" : "#111827",
    subText: isDark ? "#9ca3af" : "#6b7280",
    line: isDark ? "#374151" : "#e5e7eb",
    splitLine: isDark ? "#374151" : "#f3f4f6",
    tooltipBg: isDark ? "rgba(31, 41, 55, 0.95)" : "rgba(255, 255, 255, 0.95)",
    tooltipBorder: isDark ? "#4b5563" : "#e5e7eb",
  };
}

function BarChartServers({
  title,
  subtitle,
  servers,
  usedData,
  theme,
}: {
  title: string;
  subtitle?: string;
  servers: Server[];
  usedData: number[];
  theme: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const t = useChartTheme(theme);
  useEffect(() => {
    if (!chartRef.current) return;
    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const fullIps = servers.map((s) => s.ip ?? "—");
    const ips = fullIps
      .map((ip) => ip.split(".").slice(-1)[0] || ip)
      .map((lastOctet, idx) => `srv-${lastOctet || idx + 1}`);

    const used = usedData.map((v) =>
      (v ?? 0) < 0 ? 0 : (v ?? 0) > 100 ? 100 : Math.round(v ?? 0),
    );
    const free = used.map((v) => 100 - v);

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 800,
      title: {
        text: title,
        left: "center",
        top: 4,
        textStyle: { color: t.text, fontSize: 16, fontWeight: 600 },
      },
      graphic: subtitle
        ? [
            {
              type: "text",
              left: "center",
              top: 26,
              style: {
                text: subtitle,
                fill: t.subText,
                fontSize: 11,
              },
            },
          ]
        : undefined,
      legend: {
        top: subtitle ? 44 : 30,
        right: 10,
        textStyle: { color: t.subText, fontSize: 11 },
        itemWidth: 16,
        itemHeight: 10,
        icon: "roundRect",
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: t.tooltipBg,
        borderColor: t.tooltipBorder,
        textStyle: { color: t.text },
        axisPointer: { type: "shadow" },
        formatter: (params: any) => {
          const pUsed = params.find((p: any) => p.seriesName === "Занято");
          const pFree = params.find((p: any) => p.seriesName === "Свободно");
          const usedVal = pUsed ? pUsed.value : 0;
          const freeVal = pFree ? pFree.value : 0;
          const idx = params[0].dataIndex;
          const fullIp = fullIps[idx] ?? params[0].axisValueLabel;
          return [
            `<div style="margin-bottom:4px;"><b>${fullIp}</b></div>`,
            `Занято: <b>${usedVal}%</b>`,
            `Свободно: <b>${freeVal}%</b>`,
            `<span style="color:${t.subText}">Всего: 100%</span>`,
          ].join("<br/>");
        },
      },
      grid: {
        left: "6%",
        right: "6%",
        bottom: "8%",
        top: subtitle ? "32%" : "24%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        max: 100,
        axisLabel: {
          color: t.subText,
          formatter: (v: number) => `${v}%`,
        },
        axisLine: { lineStyle: { color: t.line } },
        splitLine: { lineStyle: { color: t.splitLine } },
      },
      yAxis: {
        type: "category",
        data: ips,
        axisLabel: {
          color: t.subText,
          fontSize: 11,
        },
        axisLine: { lineStyle: { color: t.line } },
      },
      series: [
        {
          type: "bar",
          name: "Занято",
          stack: "total",
          barWidth: 16,
          data: used,
          itemStyle: {
            color: "#ef4444",
            borderRadius: [10, 0, 0, 10],
          },
          label: {
            show: true,
            position: "insideRight",
            formatter: "{c}%",
            color: "#f9fafb",
            fontSize: 10,
          },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.2)" },
          },
        },
        {
          type: "bar",
          name: "Свободно",
          stack: "total",
          data: free,
          itemStyle: {
            color: "#10b981",
            borderRadius: [0, 10, 10, 0],
          },
          label: {
            show: true,
            position: "insideLeft",
            formatter: "{c}%",
            color: "#022c22",
            fontSize: 10,
          },
        },
      ],
    };

    instanceRef.current.setOption(option);

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", handleResize);
    const ro = new ResizeObserver(handleResize);
    if (chartRef.current) ro.observe(chartRef.current);
    return () => {
      window.removeEventListener("resize", handleResize);
      ro.disconnect();
    };
  }, [
    title,
    subtitle,
    servers,
    usedData,
    theme,
    t.text,
    t.subText,
    t.line,
    t.splitLine,
    t.tooltipBg,
    t.tooltipBorder,
  ]);

  return <div ref={chartRef} className="w-full h-70" />;
}

type ChartDataMode = "percent" | "data";

function ResourcesChart({
  title,
  servers,
  cpu,
  mem,
  disk,
  memUsedGb,
  memTotalGb,
  diskUsedGb,
  diskTotalGb,
  dataMode,
  theme,
}: {
  title: string;
  servers: Server[];
  cpu: number[];
  mem: number[];
  disk: number[];
  memUsedGb?: number[];
  memTotalGb?: number[];
  diskUsedGb?: number[];
  diskTotalGb?: number[];
  dataMode: ChartDataMode;
  theme: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const t = useChartTheme(theme);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const fullIps = servers.map((s) => s.ip ?? "—");
    const labels = fullIps.map((ip, idx) => ip || `srv-${idx + 1}`);

    const normalizePct = (arr: number[]) =>
      arr.map((v) => {
        const n = Number.isFinite(v) ? v : 0;
        return n < 0 ? 0 : n > 100 ? 100 : Math.round(n);
      });

    const cpuData = normalizePct(cpu);
    const isDataMode = dataMode === "data";

    const memValues =
      isDataMode && memUsedGb
        ? memUsedGb.map((v) => (Number.isFinite(v) ? v : 0))
        : normalizePct(mem);
    const diskValues =
      isDataMode && diskUsedGb
        ? diskUsedGb.map((v) => (Number.isFinite(v) ? v : 0))
        : normalizePct(disk);

    const maxGb =
      isDataMode && memUsedGb && diskUsedGb
        ? Math.max(
            1,
            ...memUsedGb.filter(Number.isFinite),
            ...diskUsedGb.filter(Number.isFinite),
          )
        : 100;

    const tooltipFormatter = (params: any) => {
      const idx = params[0].dataIndex;
      const name = fullIps[idx] ?? params[0].axisValueLabel;
      const lines = [`<div style="margin-bottom:4px;"><b>${name}</b></div>`];
      params.forEach((p: any) => {
        const metric = p.seriesName;
        const val = p.value ?? 0;
        if (metric === "CPU") {
          lines.push(`CPU: <b>${val}%</b>`);
        } else if (
          isDataMode &&
          metric === "ОЗУ" &&
          memTotalGb?.[idx] != null
        ) {
          const total = memTotalGb[idx] ?? 0;
          lines.push(
            `ОЗУ: <b>${(memUsedGb?.[idx] ?? 0).toFixed(1)} ГБ</b> / ${total.toFixed(1)} ГБ`,
          );
        } else if (
          isDataMode &&
          metric === "Диск" &&
          diskTotalGb?.[idx] != null
        ) {
          const total = diskTotalGb[idx] ?? 0;
          lines.push(`Диск: <b>${diskUsedGb?.[idx] ?? 0} ГБ</b> / ${total} ГБ`);
        } else {
          lines.push(
            `${metric}: <b>${val}%</b> <span style="color:${t.subText}">• свободно ${100 - Number(val)}%</span>`,
          );
        }
      });
      return lines.join("<br/>");
    };

    const axisLabelFormatter = isDataMode
      ? (v: number) => `${v} ГБ`
      : (v: number) => `${v}%`;

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 1000,
      animationEasing: "cubicOut",
      animationDurationUpdate: 700,
      title: {
        text: title + (isDataMode ? " (в ГБ)" : " (%)"),
        left: "center",
        top: 10,
        textStyle: {
          color: theme === "dark" ? "#f9fafb" : "#111827",
          fontSize: 18,
          fontWeight: "bold",
        },
      },
      legend: {
        data: ["CPU", "ОЗУ", "Диск"],
        top: 45,
        textStyle: {
          color: theme === "dark" ? "#d1d5db" : "#6b7280",
          fontSize: 12,
        },
        itemGap: 20,
        icon: "roundRect",
      },
      tooltip: {
        trigger: "axis",
        backgroundColor:
          theme === "dark"
            ? "rgba(31, 41, 55, 0.95)"
            : "rgba(255, 255, 255, 0.95)",
        borderColor: theme === "dark" ? "#4b5563" : "#e5e7eb",
        textStyle: { color: theme === "dark" ? "#f9fafb" : "#111827" },
        axisPointer: {
          type: "shadow",
          shadowStyle: {
            color:
              theme === "dark" ? "rgba(75, 85, 99, 0.3)" : "rgba(0, 0, 0, 0.1)",
          },
        },
        formatter: tooltipFormatter,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "8%",
        top: "24%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: { color: theme === "dark" ? "#9ca3af" : "#6b7280" },
        axisLine: {
          lineStyle: { color: theme === "dark" ? "#374151" : "#e5e7eb" },
        },
      },
      yAxis: isDataMode
        ? [
            {
              type: "value",
              max: Math.ceil(maxGb * 1.1),
              position: "left",
              axisLabel: {
                color: theme === "dark" ? "#9ca3af" : "#6b7280",
                formatter: axisLabelFormatter,
              },
              axisLine: {
                lineStyle: { color: theme === "dark" ? "#374151" : "#e5e7eb" },
              },
              splitLine: {
                lineStyle: { color: theme === "dark" ? "#374151" : "#f3f4f6" },
              },
            },
            {
              type: "value",
              max: 100,
              position: "right",
              axisLabel: { show: false },
              axisTick: { show: false },
              axisLine: { show: false },
              splitLine: { show: false },
            },
          ]
        : {
            type: "value",
            max: 100,
            axisLabel: {
              color: theme === "dark" ? "#9ca3af" : "#6b7280",
              formatter: (v: number) => `${v}%`,
            },
            axisLine: {
              lineStyle: { color: theme === "dark" ? "#374151" : "#e5e7eb" },
            },
            splitLine: {
              lineStyle: { color: theme === "dark" ? "#374151" : "#f3f4f6" },
            },
          },
      series: [
        {
          name: "CPU",
          type: "bar",
          data: cpuData,
          yAxisIndex: isDataMode ? 1 : undefined,
          itemStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "#3b82f6" },
                { offset: 1, color: "#2563eb" },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
        },
        {
          name: "ОЗУ",
          type: "bar",
          data: memValues,
          yAxisIndex: isDataMode ? 0 : undefined,
          itemStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "#22c55e" },
                { offset: 1, color: "#16a34a" },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
        },
        {
          name: "Диск",
          type: "bar",
          data: diskValues,
          yAxisIndex: isDataMode ? 0 : undefined,
          itemStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "#f97316" },
                { offset: 1, color: "#ea580c" },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };

    instanceRef.current.setOption(option);

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", handleResize);
    const ro = new ResizeObserver(handleResize);
    if (chartRef.current) ro.observe(chartRef.current);
    return () => {
      window.removeEventListener("resize", handleResize);
      ro.disconnect();
    };
  }, [
    title,
    servers,
    cpu,
    mem,
    disk,
    memUsedGb,
    memTotalGb,
    diskUsedGb,
    diskTotalGb,
    dataMode,
    theme,
    t.subText,
  ]);

  return <div ref={chartRef} className="w-full h-80" />;
}

function ServerGauge({
  value,
  label,
  theme,
  serverIp,
  serverId,
  memUsedMb,
  memTotalMb,
  memAvailableMb,
  diskUsedGb,
  diskTotalGb,
  height = 190,
}: {
  value: number;
  label: string;
  theme: string;
  serverIp: string;
  serverId: number;
  memUsedMb?: number | null;
  memTotalMb?: number | null;
  memAvailableMb?: number | null;
  diskUsedGb?: number | null;
  diskTotalGb?: number | null;
  height?: number;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const isDark = theme === "dark";

  useEffect(() => {
    if (!chartRef.current) return;
    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const pct = Math.max(0, Math.min(100, Math.round(value ?? 0)));
    const usedPct =
      label === "ОЗУ" &&
      memUsedMb != null &&
      memAvailableMb != null &&
      memUsedMb + memAvailableMb > 0
        ? (memUsedMb / (memUsedMb + memAvailableMb)) * 100
        : pct;
    const freePct = 100 - usedPct;
    const usedColor = "#ef4444";
    const freeColor = "#10b981";
    const textColor = isDark ? "#f9fafb" : "#111827";
    const subColor = isDark ? "#9ca3af" : "#6b7280";
    const formatMb = (n: number) =>
      new Intl.NumberFormat("ru-RU").format(Math.round(n));

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      graphic: [
        {
          type: "text",
          left: "center",
          top: "44%",
          style: {
            text: `${pct}%`,
            fontSize: 22,
            fontWeight: 800,
            fill: textColor,
          },
        },
        {
          type: "text",
          left: "center",
          top: "62%",
          style: {
            text: label,
            fontSize: 11,
            fill: subColor,
          },
        },
      ],
      series: [
        {
          type: "pie",
          radius: ["64%", "92%"],
          center: ["50%", "50%"],
          startAngle: 90,
          clockwise: true,
          avoidLabelOverlap: false,
          silent: false,
          label: { show: false },
          labelLine: { show: false },
          data: [
            {
              value: Math.max(0.01, usedPct),
              name: "Занято",
              itemStyle: {
                color: usedColor,
                borderColor: "transparent",
                borderWidth: 0,
              },
            },
            {
              value: Math.max(0.01, freePct),
              name: "Свободно",
              itemStyle: {
                color: freeColor,
                borderColor: "transparent",
                borderWidth: 0,
              },
            },
          ],
          animationDuration: 500,
          animationEasing: "cubicOut",
          emphasis: {
            scale: true,
            scaleSize: 4,
          },
        },
      ],
      tooltip: {
        show: true,
        trigger: "item",
        formatter: (p: any) => {
          const isUsed = p?.name === "Занято";
          const pctVal = Math.max(
            0,
            Math.min(100, Math.round(Number(p?.value ?? 0))),
          );

          const mainLine = isUsed
            ? `Занято: <b style="color:${usedColor}">${pctVal}%</b>`
            : `Свободно: <b style="color:${freeColor}">${pctVal}%</b>`;

          const details: string[] = [];
          if (label === "ОЗУ" && memUsedMb != null && memTotalMb != null) {
            const used = Math.round(memUsedMb);
            const free = Math.round(
              memAvailableMb ?? Math.max(0, memTotalMb - memUsedMb),
            );
            details.push(
              isUsed
                ? `МБ: <b style="color:${usedColor}">${formatMb(used)} МБ</b>`
                : `МБ: <b style="color:${freeColor}">${formatMb(free)} МБ</b>`,
            );
          }
          if (label === "Диск" && diskUsedGb != null && diskTotalGb != null) {
            const usedMb = Math.round(Number(diskUsedGb) * 1024);
            const totalMb = Math.round(Number(diskTotalGb) * 1024);
            const freeMb = Math.max(0, totalMb - usedMb);
            details.push(
              isUsed
                ? `МБ: <b style="color:${usedColor}">${formatMb(usedMb)} МБ</b>`
                : `МБ: <b style="color:${freeColor}">${formatMb(freeMb)} МБ</b>`,
            );
          }

          const detailBlock =
            details.length > 0
              ? `<div style="margin-top:4px;color:${subColor};font-size:12px">${details.join("<br/>")}</div>`
              : "";

          return [mainLine, detailBlock].filter(Boolean).join("<br/>");
        },
        backgroundColor: isDark
          ? "rgba(31, 41, 55, 0.95)"
          : "rgba(255, 255, 255, 0.95)",
        borderColor: isDark ? "#4b5563" : "#e5e7eb",
        textStyle: { color: textColor, fontSize: 12 },
      },
    };

    instanceRef.current.setOption(option);

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", handleResize);
    const ro = new ResizeObserver(handleResize);
    if (chartRef.current) ro.observe(chartRef.current);
    return () => {
      window.removeEventListener("resize", handleResize);
      ro.disconnect();
    };
  }, [
    value,
    label,
    theme,
    isDark,
    serverIp,
    serverId,
    memUsedMb,
    memTotalMb,
    memAvailableMb,
    diskUsedGb,
    diskTotalGb,
  ]);

  return <div ref={chartRef} style={{ width: "100%", height: `${height}px` }} />;
}

// ─── Главная страница ────────────────────────────────────────────────────────

export default function ServersPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [servers, setServers] = useState<Server[]>([]);
  const [metricsMap, setMetricsMap] = useState<Record<number, ServerMetrics>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartDataMode, setChartDataMode] = useState<ChartDataMode>("percent");
  const [cooldown, setCooldown] = useState(0);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const isDark = theme === "dark";

  const isSuperAdmin = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("authUser") ?? "{}");
      return u?.roles?.some((r: any) => (r.code ?? r) === "SUPER_ADMIN") ?? false;
    } catch { return false; }
  })();

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const res = await apiFetch("servers");
        if (!res.ok) throw new Error("Не удалось загрузить список серверов");
        const data = (await res.json()) as Server[];
        setServers(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    };
    fetchServers();
  }, []);

  const fetchMetrics = async (refresh?: boolean) => {
    setMetricsLoading(true);
    if (refresh) setCooldown(30);
    try {
      const path = refresh ? "servers/metrics?refresh=true" : "servers/metrics";
      const res = await apiFetch(path);
      if (!res.ok) return;
      const data = (await res.json()) as Array<ServerMetrics>;
      const map: Record<number, ServerMetrics> = {};
      for (const m of data) {
        map[m.serverId] = m;
      }
      setMetricsMap(map);
    } catch {
      // ignore
    } finally {
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleClearHistory = async () => {
    setClearing(true);
    try {
      await apiFetch("servers/history/all", { method: "DELETE" });
    } catch {
      // ignore
    } finally {
      setClearing(false);
      setShowClearModal(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const realProdServers = servers
    .filter((s) => s.active && s.envId === PROD_ENV_ID)
    .slice()
    .sort((a, b) => {
      const ipA = a.ip ?? "";
      const ipB = b.ip ?? "";
      const partsA = ipA.split(".").map(Number);
      const partsB = ipB.split(".").map(Number);
      for (let i = 0; i < 4; i++) {
        const diff = (partsA[i] || 0) - (partsB[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });
  const prodServers = realProdServers;

  const getMetric = (
    serverId: number,
    key: "cpuPercent" | "memoryPercent" | "diskPercent",
  ): number => {
    const m = metricsMap[serverId];
    if (!m || m.error) return 0;
    const v = m[key];
    return v != null ? Math.round(v) : 0;
  };

  const cpuData = prodServers.map((s) => getMetric(s.id, "cpuPercent"));
  const memData = prodServers.map((s) => getMetric(s.id, "memoryPercent"));
  const diskData = prodServers.map((s) => getMetric(s.id, "diskPercent"));
  const memUsedGb = prodServers.map(
    (s) => (metricsMap[s.id]?.memoryUsedMb ?? 0) / 1024,
  );
  const memTotalGb = prodServers.map(
    (s) => (metricsMap[s.id]?.memoryTotalMb ?? 0) / 1024,
  );
  const diskUsedGb = prodServers.map((s) => metricsMap[s.id]?.diskUsedGb ?? 0);
  const diskTotalGb = prodServers.map(
    (s) => metricsMap[s.id]?.diskTotalGb ?? 0,
  );

  const hasRealData = !loading && !error && prodServers.length > 0;

  return (
    <div className="px-6 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 text-gray-900 dark:text-white mb-1 tracking-tight">
            Серверы
          </h1>
          <p className="text-muted">
            Боевые серверы из реестра (метрики по SSH)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <button
              onClick={() => setShowClearModal(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded border transition-colors border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
              Очистить историю
            </button>
          )}
          <button
            onClick={() => fetchMetrics(true)}
            disabled={metricsLoading || cooldown > 0 || prodServers.length === 0}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded border transition-colors disabled:opacity-50 ${
              metricsLoading
                ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 animate-pulse"
                : "border-slate-300 dark:border-gray-700 bg-slate-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-slate-300 dark:hover:bg-gray-600"
            }`}
          >
            {metricsLoading && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
              </svg>
            )}
            <span>
              {metricsLoading ? "Обновление..." : cooldown > 0 ? `Подождите ${cooldown} сек` : "Обновить метрики"}
            </span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="srv-skeleton-wrap">
          {/* Скелетон графика */}
          <div className="glass-card rounded-xl p-4 mb-8">
            <div className="flex justify-end mb-3">
              <div className="srv-sk h-8 w-48 rounded-lg" />
            </div>
            <div className="srv-sk rounded-lg w-full h-80" />
          </div>
          {/* Скелетон карточек */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-4">
                {/* Заголовок карточки */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="srv-sk h-5 w-32 rounded" />
                    <div className="srv-sk h-5 w-14 rounded-full" />
                  </div>
                  <div className="srv-sk h-4 w-16 rounded-full" />
                </div>
                {/* Описание */}
                <div className="srv-sk h-3.5 w-40 rounded mb-4" />
                {/* Два круговых графика */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col items-center gap-2">
                    <div className="srv-sk rounded-full w-24 h-24" />
                    <div className="srv-sk h-3 w-10 rounded" />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="srv-sk rounded-full w-24 h-24" />
                    <div className="srv-sk h-3 w-10 rounded" />
                  </div>
                </div>
                {/* Строки данных */}
                <div className="mt-3 space-y-1.5">
                  <div className="srv-sk h-3 w-full rounded" />
                  <div className="srv-sk h-3 w-5/6 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {hasRealData && (
        <>
          {/* Сводный график ресурсов */}
          <div className="mb-8 glass-card rounded-xl p-4">
            <div className="flex justify-end mb-2">
              <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5 text-xs dark:border-gray-700 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setChartDataMode("percent")}
                  className={`px-3 py-1.5 rounded-md ${chartDataMode === "percent" ? "bg-slate-100 dark:bg-gray-700 shadow text-gray-900 dark:text-white font-medium" : "text-gray-600 dark:text-gray-400"}`}
                >
                  Проценты
                </button>
                <button
                  type="button"
                  onClick={() => setChartDataMode("data")}
                  className={`px-3 py-1.5 rounded-md ${chartDataMode === "data" ? "bg-slate-100 dark:bg-gray-700 shadow text-gray-900 dark:text-white font-medium" : "text-gray-600 dark:text-gray-400"}`}
                >
                  Данные (ГБ)
                </button>
              </div>
            </div>
            <ResourcesChart
              title="Ресурсы по серверам (CPU / ОЗУ / диск)"
              servers={prodServers}
              cpu={cpuData}
              mem={memData}
              disk={diskData}
              memUsedGb={memUsedGb}
              memTotalGb={memTotalGb}
              diskUsedGb={diskUsedGb}
              diskTotalGb={diskTotalGb}
              dataMode={chartDataMode}
              theme={theme}
            />
          </div>

          {/* Карточки серверов */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prodServers.map((s, index) => {
              const freeRamGb = (metricsMap[s.id]?.memoryAvailableMb ??
                Math.max(0, (metricsMap[s.id]?.memoryTotalMb ?? 0) - (metricsMap[s.id]?.memoryUsedMb ?? 0))) / 1024;
              const freeDiskGb = Math.max(0,
                (metricsMap[s.id]?.diskTotalGb ?? 0) - (metricsMap[s.id]?.diskUsedGb ?? 0));
              const hasMetrics = !metricsMap[s.id]?.error && (freeRamGb > 0 || freeDiskGb > 0);
              const ramCrit  = hasMetrics && s.critRam  != null && freeRamGb  < s.critRam;
              const diskCrit = hasMetrics && s.critDisk != null && freeDiskGb < s.critDisk;
              const ramWarn  = hasMetrics && s.warnRam  != null && freeRamGb  < s.warnRam;
              const diskWarn = hasMetrics && s.warnDisk != null && freeDiskGb < s.warnDisk;
              const isCrit = ramCrit || diskCrit;
              const isWarn = !isCrit && (ramWarn || diskWarn);
              return (
                <div
                  key={s.id}
                  onClick={() => router.push(`/servers/detail?id=${s.id}`)}
                  className={`glass-card rounded-xl p-4 transition-all duration-200 hover:shadow-card-hover cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                    isCrit ? "border-2! border-red-500! dark:border-red-500! animate-warning-card"
                    : isWarn ? "border-2! border-amber-400! dark:border-amber-400!"
                    : ""
                  }`}
                  title="Нажмите для подробной информации"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-sm font-medium text-gray-900 dark:text-white truncate">
                        {s.ip ?? "—"}
                      </span>
                      <span
                        className="shrink-0 inline-flex items-center rounded-full border border-slate-300 dark:border-gray-700 bg-slate-100 dark:bg-gray-900/30 px-2 py-0.5 text-[11px] text-gray-700 dark:text-gray-200 tabular-nums"
                        title={`${s.ip ?? "—"} (ID ${s.id}) • CPU: ${cpuData[index]}%`}
                      >
                        CPU {cpuData[index]}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCrit && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />Критично
                        </span>
                      )}
                      {isWarn && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Внимание
                        </span>
                      )}
                      {!isCrit && !isWarn && (
                        <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          Активен
                        </span>
                      )}
                      <svg
                        className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {s.description ?? "Боевой сервер"}
                    {s.envNameRu ? ` • ${s.envNameRu}` : ""}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="flex flex-col items-center">
                      <ServerGauge
                        value={memData[index]}
                        label="ОЗУ"
                        theme={theme}
                        serverIp={s.ip ?? "—"}
                        serverId={s.id}
                        memUsedMb={metricsMap[s.id]?.memoryUsedMb}
                        memTotalMb={metricsMap[s.id]?.memoryTotalMb}
                        memAvailableMb={metricsMap[s.id]?.memoryAvailableMb}
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <ServerGauge
                        value={diskData[index]}
                        label="Диск"
                        theme={theme}
                        serverIp={s.ip ?? "—"}
                        serverId={s.id}
                        diskUsedGb={metricsMap[s.id]?.diskUsedGb}
                        diskTotalGb={metricsMap[s.id]?.diskTotalGb}
                      />
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5">
                    {metricsMap[s.id]?.memoryUsedMb != null &&
                      metricsMap[s.id]?.memoryTotalMb != null && (
                        <div>
                          ОЗУ (ГБ):&nbsp;
                          <span className="font-medium text-gray-700 dark:text-gray-200">
                            {(
                              (metricsMap[s.id].memoryUsedMb! ?? 0) / 1024
                            ).toFixed(1)}{" "}
                            ГБ /{" "}
                            {(
                              (metricsMap[s.id].memoryTotalMb! ?? 0) / 1024
                            ).toFixed(1)}{" "}
                            ГБ занято
                          </span>
                          {" • "}
                          <span className="font-medium text-gray-700 dark:text-gray-200">
                            {(
                              (metricsMap[s.id].memoryAvailableMb ??
                                metricsMap[s.id].memoryTotalMb! -
                                  metricsMap[s.id].memoryUsedMb!) / 1024
                            ).toFixed(1)}{" "}
                            ГБ свободно
                          </span>
                        </div>
                      )}
                    {metricsMap[s.id]?.diskUsedGb != null &&
                      metricsMap[s.id]?.diskTotalGb != null && (
                        <div>
                          Диск (ГБ):&nbsp;
                          <span className="font-medium text-gray-700 dark:text-gray-200">
                            {Math.round(metricsMap[s.id].diskUsedGb ?? 0)} ГБ /{" "}
                            {Math.round(metricsMap[s.id].diskTotalGb ?? 0)} ГБ
                            занято
                          </span>
                          {" • "}
                          <span className="font-medium text-gray-700 dark:text-gray-200">
                            {Math.max(
                              0,
                              Math.round(
                                (metricsMap[s.id].diskTotalGb ?? 0) -
                                  (metricsMap[s.id].diskUsedGb ?? 0),
                              ),
                            )}{" "}
                            ГБ свободно
                          </span>
                        </div>
                      )}
                  </div>
                  {(metricsLoading || metricsMap[s.id]?.error) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      {metricsLoading ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Загрузка метрик по SSH...
                        </p>
                      ) : (
                        <p
                          className="text-xs text-amber-600 dark:text-amber-400"
                          title={metricsMap[s.id]?.error ?? undefined}
                        >
                          SSH: {metricsMap[s.id]?.error}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && !error && prodServers.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Боевые серверы не найдены.
        </p>
      )}

      {/* Модальное подтверждение очистки истории */}
      {showClearModal && (
        <div className="srv-modal-overlay" onClick={() => setShowClearModal(false)}>
          <div className="srv-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="srv-modal-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
            </div>
            <h3 className="srv-modal-title">Очистить всю историю?</h3>
            <p className="srv-modal-text">
              Будут удалены все записи метрик по всем серверам.<br />
              Данные за следующие 30 дней будут накапливаться заново автоматически.
            </p>
            <div className="srv-modal-actions">
              <button
                className="srv-modal-cancel"
                onClick={() => setShowClearModal(false)}
                disabled={clearing}
              >
                Отмена
              </button>
              <button
                className="srv-modal-confirm"
                onClick={handleClearHistory}
                disabled={clearing}
              >
                {clearing ? "Очистка..." : "Да, очистить"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        /* Skeleton */
        .srv-sk {
          background: ${isDark
            ? "linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)"
            : "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)"};
          background-size: 200% 100%;
          animation: srv-shimmer 1.4s ease-in-out infinite;
        }
        @keyframes srv-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .srv-skeleton-wrap { animation: srv-fade-in 0.2s ease; }
        @keyframes srv-fade-in { from { opacity: 0 } to { opacity: 1 } }

        /* Modal */
        .srv-modal-overlay {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(2px);
        }
        .srv-modal-card {
          background: ${isDark ? "#1e293b" : "#ffffff"};
          border: 1px solid ${isDark ? "#334155" : "#e2e8f0"};
          border-radius: 1rem; padding: 2rem;
          width: 100%; max-width: 400px; margin: 1rem;
          display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        }
        .srv-modal-icon {
          width: 3.5rem; height: 3.5rem; border-radius: 9999px;
          background: ${isDark ? "rgba(239,68,68,0.12)" : "#fef2f2"};
          display: flex; align-items: center; justify-content: center;
        }
        .srv-modal-title {
          font-size: 1.1rem; font-weight: 700;
          color: ${isDark ? "#f1f5f9" : "#0f172a"};
          margin: 0;
        }
        .srv-modal-text {
          font-size: 0.85rem; line-height: 1.6; text-align: center;
          color: ${isDark ? "#94a3b8" : "#64748b"};
          margin: 0;
        }
        .srv-modal-actions {
          display: flex; gap: 0.75rem; margin-top: 0.5rem; width: 100%;
        }
        .srv-modal-cancel {
          flex: 1; padding: 0.6rem 1rem; border-radius: 0.5rem;
          font-size: 0.875rem; font-weight: 500; cursor: pointer;
          border: 1px solid ${isDark ? "#334155" : "#e2e8f0"};
          background: ${isDark ? "#0f172a" : "#f8fafc"};
          color: ${isDark ? "#94a3b8" : "#64748b"};
          transition: all 0.15s;
        }
        .srv-modal-cancel:hover:not(:disabled) {
          background: ${isDark ? "#1e293b" : "#f1f5f9"};
        }
        .srv-modal-confirm {
          flex: 1; padding: 0.6rem 1rem; border-radius: 0.5rem;
          font-size: 0.875rem; font-weight: 600; cursor: pointer;
          border: none;
          background: #ef4444; color: #fff;
          transition: all 0.15s;
        }
        .srv-modal-confirm:hover:not(:disabled) { background: #dc2626; }
        .srv-modal-confirm:disabled, .srv-modal-cancel:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

    </div>
  );
}
