"use client";

import { useState } from "react";

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function ActivityPage() {
  const [filter, setFilter] = useState("all"); // all | login | settings | ...

  // Заглушка: когда будет API — подставлять реальные данные
  const entries: { id: number; time: string; user: string; action: string; details?: string }[] = [];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <div className="max-w-5xl px-6 py-10">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
          Журнал действий
        </h1>

        <section className="rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
          <div className="px-6 sm:px-8 py-4 border-b border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2 h-4 rounded-full bg-slate-500" />
              Действия на сайте
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 dark:text-slate-400">Тип:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
              >
                <option value="all">Все</option>
                <option value="login">Вход</option>
                <option value="settings">Настройки</option>
                <option value="cert">Сертификаты</option>
                <option value="other">Прочее</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            {entries.length === 0 ? (
              <div className="px-6 sm:px-8 py-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Записей пока нет. Здесь будут отображаться действия пользователей на сайте.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50">
                    <th className="text-left py-3 px-6 font-medium text-slate-600 dark:text-slate-400">Время</th>
                    <th className="text-left py-3 px-6 font-medium text-slate-600 dark:text-slate-400">Пользователь</th>
                    <th className="text-left py-3 px-6 font-medium text-slate-600 dark:text-slate-400">Действие</th>
                    <th className="text-left py-3 px-6 font-medium text-slate-600 dark:text-slate-400">Детали</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-6 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDateTime(e.time)}</td>
                      <td className="py-3 px-6 text-slate-900 dark:text-white">{e.user}</td>
                      <td className="py-3 px-6 text-slate-700 dark:text-slate-300">{e.action}</td>
                      <td className="py-3 px-6 text-slate-500 dark:text-slate-400">{e.details ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
