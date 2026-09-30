"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import * as echarts from "echarts";
import { useTheme } from "../../components/ThemeProvider";
import { apiFetch } from "../../lib/api";

// ── Interfaces ─────────────────────────────────────────────────────────────────

interface Server {
  id: number;
  active: boolean | null;
  description: string | null;
  ip: string | null;
  envId: number | null;
  envNameRu: string | null;
}

interface MetricsHistoryPoint {
  collectedAt: string;
  cpuPercent: number | null;
  memoryPercent: number | null;
  diskPercent: number | null;
  memoryUsedMb: number | null;
  memoryTotalMb: number | null;
  diskUsedGb: number | null;
  diskTotalGb: number | null;
}

interface ProcessInfo {
  pid: string;
  name: string;
  cpuPercent: number;
  memPercent: number;
  rssKb: number;
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
  topProcesses: ProcessInfo[] | null;
}

// ── Disk forecast ───────────────────────────────────────────────────────────────

interface DiskForecast {
  slope: number;
  gbPerDay: number;
  currentFreeGb: number;
  totalGb: number;
  daysUntilFull: number | null;
  daysUntil80: number | null;
}

function linReg(xs: number[], ys: number[]) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b) / n;
  const my = ys.reduce((a, b) => a + b) / n;
  const num = xs.reduce((acc, x, i) => acc + (x - mx) * (ys[i] - my), 0);
  const den = xs.reduce((acc, x) => acc + (x - mx) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: my - slope * mx };
}

function computeDiskForecast(history: MetricsHistoryPoint[]): DiskForecast | null {
  const pts = history
    .filter((d) => d.diskTotalGb != null && d.diskUsedGb != null)
    .map((d) => ({
      t: new Date(d.collectedAt).getTime(),
      freeGb: d.diskTotalGb! - d.diskUsedGb!,
      totalGb: d.diskTotalGb!,
    }))
    .sort((a, b) => a.t - b.t);

  if (pts.length < 3) return null;

  const MS_PER_DAY = 86400000;
  const t0 = pts[0].t;
  const xs = pts.map((p) => (p.t - t0) / MS_PER_DAY);
  const ys = pts.map((p) => p.freeGb);
  const { slope, intercept } = linReg(xs, ys);

  const lastX = xs[xs.length - 1];
  const currentFreeGb = Math.max(0, slope * lastX + intercept);
  const totalGb = pts[pts.length - 1].totalGb;
  const criticalFreeGb = totalGb * 0.2;

  const daysUntilFull =
    slope < -0.01 && currentFreeGb > 0
      ? Math.round(currentFreeGb / Math.abs(slope))
      : null;

  const daysUntil80 =
    slope < -0.01
      ? currentFreeGb <= criticalFreeGb
        ? 0
        : Math.round((currentFreeGb - criticalFreeGb) / Math.abs(slope))
      : null;

  return { slope, gbPerDay: Math.abs(slope), currentFreeGb, totalGb, daysUntilFull, daysUntil80 };
}

// ── Utilities ───────────────────────────────────────────────────────────────────

const RANGES = [
  { label: "День",   hours: 24  },
  { label: "3 дня",  hours: 72  },
  { label: "Неделя", hours: 168 },
  { label: "Месяц",  hours: 720 },
] as const;

const AREA_COLORS: Record<string, string> = {
  "#3b82f6": "rgba(59,130,246,0.18)",
  "#22c55e": "rgba(34,197,94,0.18)",
  "#f97316": "rgba(249,115,22,0.18)",
};

function sliceByHours(data: MetricsHistoryPoint[], hours: number): MetricsHistoryPoint[] {
  const cutoff = Date.now() - hours * 3600 * 1000;
  return data.filter((d) => new Date(d.collectedAt).getTime() >= cutoff);
}

function formatTime(iso: string, hours: number): string {
  const dt = new Date(iso);
  if (hours <= 24)
    return dt.toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (hours <= 72)
    return dt.toLocaleString("ru-RU", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  return dt.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit" });
}

// ── MetricChart ─────────────────────────────────────────────────────────────────

type MetricType = "cpu" | "ram" | "disk";

const METRIC_CONFIG = {
  cpu:  { title: "CPU",            color: "#3b82f6" },
  ram:  { title: "ОЗУ свободно",  color: "#22c55e" },
  disk: { title: "Диск свободно", color: "#f97316" },
} as const;

function MetricChart({
  metric,
  allData,
  theme,
  diskForecast,
}: {
  metric: MetricType;
  allData: MetricsHistoryPoint[];
  theme: string;
  diskForecast?: DiskForecast | null;
}) {
  const [hours, setHours] = useState(24);
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const isDark = theme === "dark";

  const { title, color } = METRIC_CONFIG[metric];
  const sliced = useMemo(() => sliceByHours(allData, hours), [allData, hours]);

  const isFilling = diskForecast != null && diskForecast.slope < -0.05;

  useEffect(() => {
    if (!chartRef.current || sliced.length < 2) return;
    if (!instanceRef.current) instanceRef.current = echarts.init(chartRef.current);

    const subColor    = isDark ? "#9ca3af" : "#6b7280";
    const gridColor   = isDark ? "#374151" : "#e5e7eb";
    const tooltipBg   = isDark ? "rgba(15,23,42,0.97)" : "rgba(255,255,255,0.97)";
    const tooltipBd   = isDark ? "#334155" : "#e2e8f0";
    const textColor   = isDark ? "#f9fafb" : "#111827";

    const times = sliced.map((d) => formatTime(d.collectedAt, hours));

    let vals: (number | null)[];
    if (metric === "cpu") {
      vals = sliced.map((d) => (d.cpuPercent != null ? +d.cpuPercent.toFixed(1) : null));
    } else if (metric === "ram") {
      vals = sliced.map((d) =>
        d.memoryTotalMb != null && d.memoryUsedMb != null
          ? +Math.max(0, (d.memoryTotalMb - d.memoryUsedMb) / 1024).toFixed(2)
          : null
      );
    } else {
      vals = sliced.map((d) =>
        d.diskTotalGb != null && d.diskUsedGb != null
          ? +Math.max(0, d.diskTotalGb - d.diskUsedGb).toFixed(2)
          : null
      );
    }

    // Forecast series (disk + GB mode + 7d+)
    let allTimes = times;
    let allVals: (number | null)[] = vals;
    let forecastSeries: echarts.SeriesOption | null = null;

    if (
      metric === "disk" &&
      diskForecast &&
      diskForecast.slope < -0.05 &&
      hours >= 168 &&
      sliced.length > 0
    ) {
      const MS_PER_DAY = 86400000;
      const intervalDays = hours >= 720 ? 3 : 1;
      const futureN      = hours >= 720 ? 10 : 7;
      const lastMs  = new Date(sliced[sliced.length - 1].collectedAt).getTime();
      const lastFree = vals[vals.length - 1] ?? diskForecast.currentFreeGb;

      const futureTimes: string[] = [];
      const futureVals:  number[] = [];
      for (let i = 1; i <= futureN; i++) {
        const proj = Math.max(0, lastFree + diskForecast.slope * i * intervalDays);
        futureTimes.push(
          formatTime(new Date(lastMs + i * intervalDays * MS_PER_DAY).toISOString(), hours)
        );
        futureVals.push(+proj.toFixed(2));
        if (proj <= 0) break;
      }

      allTimes = [...times, ...futureTimes];
      allVals  = [...vals,  ...futureTimes.map(() => null)];

      const fcastData: (number | null)[] = [
        ...vals.slice(0, -1).map(() => null),
        lastFree,
        ...futureVals,
      ];

      forecastSeries = {
        name: "Прогноз",
        type: "line",
        data: fcastData,
        smooth: true,
        symbol: "none",
        lineStyle: { color: "#ef4444", width: 1.5, type: "dashed" },
        itemStyle: { color: "#ef4444" },
        areaStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(239,68,68,0.08)" },
              { offset: 1, color: "rgba(0,0,0,0)" },
            ],
          },
        },
        connectNulls: false,
      };
    }

    // Y-axis dynamic bounds
    const nums   = allVals.filter((v): v is number => v != null);
    const rawMin = nums.length ? Math.min(...nums) : 0;
    const isPercentMetric = metric === "cpu";
    const rawMax = nums.length ? Math.max(...nums) : (isPercentMetric ? 100 : 1);
    const pad    = isPercentMetric
      ? Math.max((rawMax - rawMin) * 0.2, 3)
      : Math.max((rawMax - rawMin) * 0.15, 0.5);
    const yMin   = isPercentMetric
      ? Math.max(0, Math.floor(rawMin - pad))
      : Math.max(0, +(rawMin - pad).toFixed(1));
    const yMax   = isPercentMetric
      ? Math.min(100, Math.ceil(rawMax + pad))
      : +(rawMax + pad).toFixed(1);

    const areaColor = AREA_COLORS[color] ?? "rgba(100,100,100,0.15)";

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 300,
      tooltip: {
        trigger: "axis",
        backgroundColor: tooltipBg,
        borderColor: tooltipBd,
        textStyle: { color: textColor, fontSize: 12 },
        axisPointer: { type: "cross", label: { backgroundColor: color } },
        formatter: (params: any) => {
          const time  = params[0]?.axisValue ?? "";
          const lines = [
            `<div style="font-weight:600;margin-bottom:4px;color:${textColor}">${time}</div>`,
          ];
          for (const p of params) {
            if (p.value == null) continue;
            const dot    = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${p.color};margin-right:5px"></span>`;
            const suffix =
              p.seriesName === "Прогноз"
                ? " ГБ (прогноз)"
                : metric === "cpu"
                ? "%"
                : " ГБ своб.";
            lines.push(`${dot}${p.seriesName}: <b>${p.value}${suffix}</b>`);
          }
          return `<div style="line-height:1.8">${lines.join("<br/>")}</div>`;
        },
      },
      legend: forecastSeries
        ? {
            data: [title, "Прогноз"],
            top: 2, right: 8,
            textStyle: { color: subColor, fontSize: 10 },
            itemWidth: 14, itemHeight: 6,
            icon: "roundRect",
          }
        : { show: false },
      grid: {
        left: "1%", right: "1%", bottom: "14%",
        top: forecastSeries ? "16%" : "6%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: allTimes,
        axisLabel: {
          color: subColor, fontSize: 10,
          rotate: hours > 72 ? 0 : 30,
          interval: "auto",
        },
        axisLine: { lineStyle: { color: gridColor } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        min: yMin,
        max: yMax,
        axisLabel: {
          color: subColor,
          fontSize: 10,
          formatter: (v: number) =>
            metric === "cpu" ? `${v}%` : `${v}`,
        },
        axisLine: { lineStyle: { color: gridColor } },
        splitLine: { lineStyle: { color: gridColor, type: "dashed" } },
      },
      series: [
        {
          name: title,
          type: "line",
          data: allVals,
          smooth: true,
          symbol: sliced.length > 60 ? "none" : "circle",
          symbolSize: 3,
          lineStyle: { color, width: 2 },
          itemStyle: { color },
          areaStyle: {
            color: {
              type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: areaColor },
                { offset: 1, color: "rgba(0,0,0,0)" },
              ],
            },
          },
          connectNulls: false,
        },
        ...(forecastSeries ? [forecastSeries] : []),
      ],
    };

    instanceRef.current.clear();
    instanceRef.current.setOption(option, { notMerge: true });

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", handleResize);
    const ro = new ResizeObserver(handleResize);
    if (chartRef.current) ro.observe(chartRef.current);
    return () => {
      window.removeEventListener("resize", handleResize);
      ro.disconnect();
    };
  }, [sliced, hours, isDark, diskForecast, metric, color, title]);

  useEffect(() => {
    return () => { instanceRef.current?.dispose(); };
  }, []);

  const subColor   = isDark ? "#9ca3af" : "#6b7280";
  const borderClr  = isDark ? "rgba(71,85,105,0.5)" : "#e2e8f0";
  const tabBg      = isDark ? "rgba(15,23,42,0.4)" : "#f8fafc";
  const tabActive  = isDark ? "rgba(59,130,246,0.2)" : "#dbeafe";
  const tabActiveClr = isDark ? "#93c5fd" : "#1d4ed8";

  const tabStyle = (active: boolean) => ({
    padding: "0.2rem 0.55rem",
    borderRadius: "0.3rem",
    fontSize: "0.72rem",
    fontWeight: active ? 600 : 400,
    color: active ? tabActiveClr : subColor,
    background: active ? tabActive : "transparent",
    border: "none",
    cursor: "pointer",
    transition: "all 0.12s",
    lineHeight: 1.4,
    whiteSpace: "nowrap" as const,
  });

  const tabGroupStyle = {
    display: "inline-flex",
    borderRadius: "0.4rem",
    border: `1px solid ${borderClr}`,
    background: tabBg,
    padding: "0.15rem",
    gap: "0.1rem",
  };

  // Forecast badge styles
  const getBadgeStyle = () => {
    if (!diskForecast) return {};
    if (!isFilling) {
      return {
        background: isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4",
        color: isDark ? "#4ade80" : "#16a34a",
        borderColor: isDark ? "rgba(34,197,94,0.25)" : "#bbf7d0",
      };
    }
    const critical = diskForecast.daysUntilFull != null && diskForecast.daysUntilFull < 30;
    return critical
      ? {
          background: isDark ? "rgba(239,68,68,0.15)" : "#fef2f2",
          color: isDark ? "#f87171" : "#dc2626",
          borderColor: isDark ? "rgba(239,68,68,0.35)" : "#fecaca",
        }
      : {
          background: isDark ? "rgba(245,158,11,0.12)" : "#fffbeb",
          color: isDark ? "#fbbf24" : "#b45309",
          borderColor: isDark ? "rgba(245,158,11,0.3)" : "#fde68a",
        };
  };

  const forecastText = () => {
    if (!diskForecast) return null;
    if (!isFilling) return "диск стабилен";
    const days = diskForecast.daysUntilFull;
    return `−${diskForecast.gbPerDay.toFixed(1)} ГБ/д${days != null ? ` · ~${days} дн.` : ""}`;
  };

  return (
    <div className="glass-card rounded-xl p-5">
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        {/* Title + forecast badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: isDark ? "#64748b" : "#94a3b8",
            }}
          >
            {title}
          </span>
          {metric === "disk" && diskForecast != null && (
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 600,
                padding: "0.1rem 0.5rem",
                borderRadius: "9999px",
                border: "1px solid",
                lineHeight: 1.5,
                ...getBadgeStyle(),
              }}
            >
              {forecastText()}
            </span>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <div style={tabGroupStyle}>
            {RANGES.map((r) => (
              <button
                key={r.hours}
                style={tabStyle(hours === r.hours)}
                onClick={() => setHours(r.hours)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chart / empty state ── */}
      {sliced.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "13rem",
            gap: "0.5rem",
            fontSize: "0.82rem",
            color: isDark ? "#4b5563" : "#9ca3af",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Нет данных за этот период
        </div>
      ) : sliced.length < 2 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "13rem",
            gap: "0.5rem",
            fontSize: "0.82rem",
            color: isDark ? "#4b5563" : "#9ca3af",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Накапливаются данные — сбор каждые 5 мин
        </div>
      ) : (
        <div ref={chartRef} style={{ width: "100%", height: "13rem" }} />
      )}
    </div>
  );
}

// ── TopProcessesTable ───────────────────────────────────────────────────────────

function TopProcessesTable({ processes, memTotalMb, isDark }: {
  processes: ProcessInfo[];
  memTotalMb: number | null;
  isDark: boolean;
}) {
  if (!processes || processes.length === 0) return null;

  const fmtMb = (kb: number) => {
    const mb = kb / 1024;
    return mb >= 1024 ? `${(mb / 1024).toFixed(1)} ГБ` : `${Math.round(mb)} МБ`;
  };

  const maxRss = Math.max(...processes.map(p => p.rssKb), 1);

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div
        style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.75rem 1.25rem",
          borderBottom: `1px solid ${isDark ? "rgba(71,85,105,0.4)" : "#e2e8f0"}`,
        }}
      >
        <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: isDark ? "#64748b" : "#94a3b8" }}>
          Топ процессов по ОЗУ
        </span>
        <span style={{
          fontSize: "0.65rem", fontWeight: 600, padding: "0.1rem 0.45rem",
          borderRadius: "9999px", background: isDark ? "rgba(34,197,94,0.12)" : "#f0fdf4",
          color: isDark ? "#4ade80" : "#16a34a",
          border: `1px solid ${isDark ? "rgba(34,197,94,0.25)" : "#bbf7d0"}`,
        }}>
          {processes.length}
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
          <thead>
            <tr style={{ background: isDark ? "rgba(15,23,42,0.4)" : "#f8fafc" }}>
              {["#", "Процесс", "PID", "ОЗУ", "%CPU", "%MEM"].map((h, i) => (
                <th key={h} style={{
                  padding: "0.45rem 0.85rem",
                  textAlign: i === 0 ? "center" : i >= 3 ? "right" : "left",
                  fontWeight: 600, fontSize: "0.68rem", letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: isDark ? "#64748b" : "#94a3b8",
                  borderBottom: `1px solid ${isDark ? "rgba(71,85,105,0.3)" : "#e2e8f0"}`,
                  whiteSpace: "nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processes.map((p, i) => {
              const barWidth = Math.round((p.rssKb / maxRss) * 100);
              const isHigh = p.memPercent >= 20;
              const isMed  = p.memPercent >= 10;
              const barColor = isHigh ? "#ef4444" : isMed ? "#f97316" : "#22c55e";
              return (
                <tr key={p.pid} style={{
                  background: i % 2 === 0
                    ? (isDark ? "rgba(15,23,42,0.2)" : "transparent")
                    : (isDark ? "rgba(30,41,59,0.3)" : "rgba(248,250,252,0.6)"),
                }}>
                  <td style={{ padding: "0.4rem 0.85rem", textAlign: "center", color: isDark ? "#475569" : "#94a3b8", fontWeight: 600 }}>{i + 1}</td>
                  <td style={{ padding: "0.4rem 0.85rem", maxWidth: "200px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <span style={{
                        fontFamily: "ui-monospace,monospace", fontSize: "0.75rem",
                        fontWeight: 600, color: isDark ? "#e2e8f0" : "#0f172a",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }} title={p.name}>{p.name}</span>
                      <div style={{
                        height: "3px", borderRadius: "9999px",
                        background: isDark ? "rgba(71,85,105,0.3)" : "#e2e8f0",
                        overflow: "hidden",
                      }}>
                        <div style={{ width: `${barWidth}%`, height: "100%", background: barColor, borderRadius: "9999px", transition: "width 0.3s" }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "0.4rem 0.85rem", fontFamily: "ui-monospace,monospace", color: isDark ? "#64748b" : "#94a3b8", fontSize: "0.72rem" }}>{p.pid}</td>
                  <td style={{ padding: "0.4rem 0.85rem", textAlign: "right", fontWeight: 600, color: isHigh ? "#ef4444" : isMed ? "#f97316" : (isDark ? "#e2e8f0" : "#0f172a") }}>
                    {fmtMb(p.rssKb)}
                  </td>
                  <td style={{ padding: "0.4rem 0.85rem", textAlign: "right", color: p.cpuPercent >= 50 ? "#ef4444" : p.cpuPercent >= 20 ? "#f97316" : (isDark ? "#94a3b8" : "#64748b") }}>
                    {p.cpuPercent.toFixed(1)}%
                  </td>
                  <td style={{ padding: "0.4rem 0.85rem", textAlign: "right", color: isHigh ? "#ef4444" : isMed ? "#f97316" : (isDark ? "#94a3b8" : "#64748b") }}>
                    {p.memPercent.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page content ───────────────────────────────────────────────────────────

function ServerDetailContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const { theme }    = useTheme();
  const isDark       = theme === "dark";

  const serverId = Number(searchParams.get("id"));

  const [server,        setServer]        = useState<Server | null>(null);
  const [serverError,   setServerError]   = useState(false);
  const [metrics,       setMetrics]       = useState<ServerMetrics | null>(null);
  const [loadingServer, setLoadingServer] = useState(true);
  const [loadingMetrics,setLoadingMetrics]= useState(true);
  const [history,       setHistory]       = useState<MetricsHistoryPoint[]>([]);
  const [loadingHistory,setLoadingHistory]= useState(false);
  const [cooldown,      setCooldown]      = useState(0);

  useEffect(() => {
    if (!serverId) { setServerError(true); setLoadingServer(false); return; }
    (async () => {
      try {
        const res = await apiFetch(`servers/${serverId}`);
        if (!res.ok) throw new Error();
        setServer(await res.json());
      } catch { setServerError(true); }
      finally { setLoadingServer(false); }
    })();
  }, [serverId]);

  const fetchMetrics = async (refresh?: boolean) => {
    setLoadingMetrics(true);
    if (refresh) setCooldown(30);
    try {
      const res  = await apiFetch(refresh ? "servers/metrics?refresh=true" : "servers/metrics");
      if (!res.ok) throw new Error();
      const data = (await res.json()) as ServerMetrics[];
      setMetrics(data.find((m) => m.serverId === serverId) ?? null);
    } catch { setMetrics(null); }
    finally { setLoadingMetrics(false); }
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  useEffect(() => {
    if (!serverId) return;
    setLoadingHistory(true);
    apiFetch(`servers/${serverId}/history?hours=720`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [serverId]);

  const forecast = useMemo(() => computeDiskForecast(history), [history]);

  // Current metrics display
  const cpu  = metrics && !metrics.error ? Math.round(metrics.cpuPercent  ?? 0) : 0;
  const disk = metrics && !metrics.error ? Math.round(metrics.diskPercent ?? 0) : 0;

  const memUsedGb      = metrics?.memoryUsedMb  != null ? metrics.memoryUsedMb  / 1024 : null;
  const memTotalGb     = metrics?.memoryTotalMb != null ? metrics.memoryTotalMb / 1024 : null;
  const memAvailableGb =
    metrics?.memoryAvailableMb != null
      ? metrics.memoryAvailableMb / 1024
      : memUsedGb != null && memTotalGb != null
      ? Math.max(0, memTotalGb - memUsedGb)
      : null;

  const dskUsed  = metrics?.diskUsedGb  ?? null;
  const dskTotal = metrics?.diskTotalGb ?? null;

  const isHighCpu  = cpu  >= 80;
  const isLowRam   = memAvailableGb != null && memAvailableGb > 0 && memAvailableGb < 20;
  const isHighDisk = disk >= 85;

  const fmtGb = (n: number | null) =>
    n == null ? "—" : n < 1 ? `${Math.round(n * 1024)} МБ` : `${n.toFixed(1)} ГБ`;

  if (loadingServer) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500 dark:text-gray-400">
        Загрузка...
      </div>
    );
  }

  if (serverError || !server) {
    return (
      <div className="px-6 py-8">
        <button onClick={() => router.push("/servers")} className="srvd-back-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Назад к серверам
        </button>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          Сервер не найден
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      {/* Back */}
      <button onClick={() => router.push("/servers")} className="srvd-back-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Все серверы
      </button>

      {/* Page header */}
      <div className="srvd-header">
        <div className="srvd-header-left">
          <div className="srvd-server-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6"  x2="6.01" y2="6"  />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
          </div>
          <div>
            <h1 className="srvd-ip">{server.ip ?? "—"}</h1>
            <p className="srvd-desc">{server.description ?? "Боевой сервер"}</p>
          </div>
        </div>
        <div className="srvd-header-right">
          <button
            onClick={() => fetchMetrics(true)}
            disabled={loadingMetrics || cooldown > 0}
            className="srvd-refresh-btn"
          >
            <svg
              width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              className={loadingMetrics ? "srvd-spin" : ""}
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {loadingMetrics
              ? "Обновление..."
              : cooldown > 0
              ? `Подождите ${cooldown} сек`
              : "Обновить метрики"}
          </button>
        </div>
      </div>

      {/* SSH error */}
      {metrics?.error && (
        <div className="srvd-ssh-err">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8"  x2="12"    y2="12"   />
            <line x1="12" y1="16" x2="12.01" y2="16"   />
          </svg>
          SSH недоступен: {metrics.error}
        </div>
      )}

      {/* Info cards */}
      <div className="srvd-info-row2 mb-6">
        <div className="glass-card rounded-xl px-4 py-3">
          <div className="srvd-info2-label">Сервер</div>
          <div className="srvd-info2-grid">
            <span className="srvd-info2-key">IP</span>
            <span className="srvd-info2-val font-mono">{server.ip ?? "—"}</span>
            <span className="srvd-info2-key">Окружение</span>
            <span className="srvd-info2-val">{server.envNameRu ?? "—"}</span>
            <span className="srvd-info2-key">Статус</span>
            <span className={`srvd-info2-val ${server.active ? "text-green-500" : "text-gray-400"}`}>
              {server.active ? "Активен" : "Неактивен"}
            </span>
            {server.description && (
              <>
                <span className="srvd-info2-key">Описание</span>
                <span className="srvd-info2-val">{server.description}</span>
              </>
            )}
          </div>
        </div>
        <div className="glass-card rounded-xl px-4 py-3">
          <div className="srvd-info2-label">Ресурсы сейчас</div>
          <div className="srvd-info2-grid">
            <span className="srvd-info2-key">CPU</span>
            <span className={`srvd-info2-val ${isHighCpu ? "text-red-500" : ""}`}>{cpu}%</span>
            <span className="srvd-info2-key">ОЗУ</span>
            <span className={`srvd-info2-val ${isLowRam ? "text-red-500" : ""}`}>
              {fmtGb(memUsedGb)}{memTotalGb != null ? ` / ${fmtGb(memTotalGb)}` : ""}
            </span>
            <span className="srvd-info2-key">Диск</span>
            <span className={`srvd-info2-val ${isHighDisk ? "text-red-500" : ""}`}>
              {fmtGb(dskUsed)}{dskTotal != null ? ` / ${fmtGb(dskTotal)}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* 3 metric charts */}
      {loadingHistory ? (
        <div className="flex items-center justify-center h-48 gap-2 text-sm text-gray-500 dark:text-gray-400">
          <svg className="srvd-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" />
          </svg>
          Загрузка истории...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <MetricChart metric="cpu"  allData={history} theme={theme} />
          <MetricChart metric="ram"  allData={history} theme={theme} />
          <MetricChart metric="disk" allData={history} theme={theme} diskForecast={forecast} />
          {metrics && !metrics.error && metrics.topProcesses && metrics.topProcesses.length > 0 && (
            <TopProcessesTable
              processes={metrics.topProcesses}
              memTotalMb={metrics.memoryTotalMb}
              isDark={isDark}
            />
          )}
        </div>
      )}

      {/* ── CSS ── */}
      <style jsx global>{`
        .srvd-back-btn {
          display: inline-flex; align-items: center; gap: 0.4rem;
          margin-bottom: 1.5rem; padding: 0.4rem 0.9rem;
          border-radius: 0.5rem; font-size: 0.82rem; font-weight: 500;
          color: ${isDark ? "#94a3b8" : "#64748b"};
          border: 1px solid ${isDark ? "rgba(71,85,105,0.4)" : "#e2e8f0"};
          background: ${isDark ? "rgba(30,41,59,0.4)" : "#f8fafc"};
          cursor: pointer; transition: all 0.15s;
        }
        .srvd-back-btn:hover {
          color: ${isDark ? "#e2e8f0" : "#1e293b"};
          background: ${isDark ? "rgba(51,65,85,0.6)" : "#f1f5f9"};
          border-color: ${isDark ? "rgba(100,116,139,0.5)" : "#cbd5e1"};
        }
        .srvd-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;
        }
        .srvd-header-left  { display: flex; align-items: center; gap: 1rem; }
        .srvd-header-right { display: flex; align-items: center; gap: 0.5rem; }
        .srvd-server-icon  {
          display: flex; align-items: center; justify-content: center;
          width: 3.5rem; height: 3.5rem; border-radius: 1rem; flex-shrink: 0;
          background: ${isDark ? "rgba(59,130,246,0.15)" : "#dbeafe"}; color: #3b82f6;
        }
        .srvd-ip   { font-family: ui-monospace,monospace; font-size: 1.75rem; font-weight: 800; color: ${isDark ? "#f1f5f9" : "#0f172a"}; letter-spacing: -0.02em; line-height: 1.2; }
        .srvd-desc { font-size: 0.85rem; color: ${isDark ? "#94a3b8" : "#64748b"}; margin-top: 0.2rem; }
        .srvd-info-row2 {
          display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
        }
        @media (max-width: 640px) { .srvd-info-row2 { grid-template-columns: 1fr; } }
        .srvd-info2-label {
          font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase; color: ${isDark ? "#475569" : "#94a3b8"}; margin-bottom: 0.5rem;
        }
        .srvd-info2-grid { display: grid; grid-template-columns: auto 1fr; gap: 0.25rem 1rem; align-items: center; }
        .srvd-info2-key  { font-size: 0.78rem; color: ${isDark ? "#64748b" : "#94a3b8"}; white-space: nowrap; }
        .srvd-info2-val  { font-size: 0.82rem; font-weight: 600; color: ${isDark ? "#e2e8f0" : "#0f172a"}; }
        .srvd-refresh-btn {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.45rem 0.9rem; border-radius: 0.5rem; font-size: 0.82rem; font-weight: 500;
          border: 1px solid ${isDark ? "rgba(71,85,105,0.5)" : "#e2e8f0"};
          background: ${isDark ? "rgba(30,41,59,0.5)" : "#f8fafc"};
          color: ${isDark ? "#94a3b8" : "#64748b"}; cursor: pointer; transition: all 0.15s;
        }
        .srvd-refresh-btn:hover:not(:disabled) {
          background: ${isDark ? "rgba(59,130,246,0.15)" : "#dbeafe"};
          color: ${isDark ? "#93c5fd" : "#1d4ed8"};
          border-color: ${isDark ? "rgba(147,197,253,0.3)" : "#bfdbfe"};
        }
        .srvd-refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .srvd-ssh-err {
          display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.25rem;
          padding: 0.6rem 0.85rem; border-radius: 0.6rem; font-size: 0.82rem;
          background: ${isDark ? "rgba(245,158,11,0.1)" : "#fffbeb"};
          color: ${isDark ? "#fbbf24" : "#92400e"};
          border: 1px solid ${isDark ? "rgba(245,158,11,0.2)" : "#fde68a"};
        }
        .srvd-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Export ──────────────────────────────────────────────────────────────────────

export default function ServerDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-sm text-gray-500 dark:text-gray-400">
          Загрузка...
        </div>
      }
    >
      <ServerDetailContent />
    </Suspense>
  );
}
