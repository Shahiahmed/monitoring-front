"use client";

function formatDate(date: string) {
  try {
    const d = new Date(date);
    return d.toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return date;
  }
}

export default function ChangelogPage() {
  const items: { date: string; title: string; changes: string[] }[] = [];

  const sorted = [...items].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
            Changelog
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            История изменений
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            История изменений системы мониторинга
          </p>
        </header>

        <div className="space-y-4">
          {sorted.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">Записей пока нет.</p>
          )}
          {sorted.map((item) => (
            <section
              key={item.date}
              className="rounded-2xl border border-slate-200/80 bg-white/70 dark:border-slate-800/80 dark:bg-slate-900/40 p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </h2>
                </div>
                <div className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {formatDate(item.date)}
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                {item.changes.map((change, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3 text-sm text-slate-700 dark:text-slate-200"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600/80" />
                    <span className="leading-relaxed">{change}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

