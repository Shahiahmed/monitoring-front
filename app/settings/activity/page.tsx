"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { useLanguage } from "../../components/LanguageProvider";

interface ActivityLogEntry {
  id: number;
  userId: number | null;
  userEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: number | null;
  description: string;
  createdAt: string;
}

interface PageResponse {
  content: ActivityLogEntry[];
  totalElements: number;
  totalPages: number;
  number: number;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN:          "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  REGISTER:       "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  DELETE_USER:    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  DELETE:         "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  UPDATE:         "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  UPDATE_PROFILE: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  ACTIVATE:       "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  DEACTIVATE:     "bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300",
};

function getActionLabels(t: (k: string) => string): Record<string, { label: string; color: string }> {
  return {
    LOGIN:          { label: t("activity.login"),         color: ACTION_COLORS.LOGIN },
    REGISTER:       { label: t("activity.register"),      color: ACTION_COLORS.REGISTER },
    DELETE_USER:    { label: t("activity.deleteUser"),    color: ACTION_COLORS.DELETE_USER },
    DELETE:         { label: t("activity.delete"),        color: ACTION_COLORS.DELETE },
    UPDATE:         { label: t("activity.update"),        color: ACTION_COLORS.UPDATE },
    UPDATE_PROFILE: { label: t("activity.updateProfile"), color: ACTION_COLORS.UPDATE_PROFILE },
    ACTIVATE:       { label: t("activity.activate"),      color: ACTION_COLORS.ACTIVATE },
    DEACTIVATE:     { label: t("activity.deactivate"),    color: ACTION_COLORS.DEACTIVATE },
  };
}

function getEntityLabels(t: (k: string) => string): Record<string, string> {
  return {
    USER:       t("activity.entityUser"),
    INCIDENT:   t("activity.entityIncident"),
    WORK:       t("activity.entityWork"),
    PRTG_ALERT: t("activity.entityPrtg"),
  };
}

const PAGE_SIZE = 30;

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return iso; }
}

export default function ActivityPage() {
  const { t } = useLanguage();
  const ACTION_LABELS = getActionLabels(t);
  const ENTITY_LABELS = getEntityLabels(t);
  const [page, setPage]         = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [entries, setEntries]   = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch]     = useState("");
  const [allActions, setAllActions] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    apiFetch(`activity-log?page=${page}&size=${PAGE_SIZE}`)
      .then((r) => { if (!r.ok) throw new Error(t("activity.loadError")); return r.json(); })
      .then((data: PageResponse) => {
        setEntries(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
        setAllActions(prev => {
          const combined = Array.from(new Set([...prev, ...data.content.map(e => e.action)])).sort();
          return combined;
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page]);

  const filtered = entries.filter((e) => {
    if (actionFilter !== "all" && e.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!e.userEmail?.toLowerCase().includes(q) && !e.description?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function goTo(p: number) {
    if (p < 0 || p >= totalPages) return;
    setPage(p);
  }

  return (
    <div className="px-6 py-8">
      <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
        {t("activity.title")}
      </h1>

      <section className="rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
        {/* Шапка */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center gap-3">
          <span className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-2 h-4 rounded-full bg-blue-500" />
            {t("activity.userActions")}
          </span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <input
              type="text"
              placeholder={t("activity.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-1.5 w-60 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="all">{t("activity.allActions")}</option>
              {allActions.map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a]?.label ?? a}</option>
              ))}
            </select>
            <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {totalElements} {t("activity.records")}
            </span>
          </div>
        </div>

        {/* Таблица */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">{t("common.loading")}</div>
          ) : error ? (
            <div className="py-12 text-center text-red-500 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("activity.notFound")}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50">
                  <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">{t("activity.time")}</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">{t("activity.action")}</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">{t("activity.object")}</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">{t("common.description")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const act = ACTION_LABELS[e.action];
                  return (
                    <tr key={e.id} className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 ${i % 2 !== 0 ? "bg-slate-50/40 dark:bg-slate-800/10" : ""}`}>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-xs">
                        {formatDateTime(e.createdAt)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200 max-w-48 truncate">
                        {e.userEmail ?? "—"}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${act?.color ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
                          {act?.label ?? e.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
                        {e.entityType ? (ENTITY_LABELS[e.entityType] ?? e.entityType) : "—"}
                        {e.entityId ? ` #${e.entityId}` : ""}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 max-w-xs">
                        {e.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-4">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t("activity.page")} {page + 1} {t("activity.of")} {totalPages} &nbsp;·&nbsp; {totalElements} {t("activity.records")}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => goTo(0)} disabled={page === 0}
                className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed">
                «
              </button>
              <button onClick={() => goTo(page - 1)} disabled={page === 0}
                className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed">
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, i) => i)
                .filter(i => Math.abs(i - page) <= 2)
                .map(i => (
                  <button key={i} onClick={() => goTo(i)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                      i === page
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}>
                    {i + 1}
                  </button>
                ))}

              <button onClick={() => goTo(page + 1)} disabled={page >= totalPages - 1}
                className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed">
                ›
              </button>
              <button onClick={() => goTo(totalPages - 1)} disabled={page >= totalPages - 1}
                className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed">
                »
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
