import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Фоновый декор */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-slate-200/40 dark:bg-slate-800/30 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-slate-300/30 dark:bg-slate-700/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-slate-200/50 dark:border-slate-700/30" />
      </div>

      <div className="relative max-w-lg w-full">
        <div className="rounded-3xl bg-slate-50/90 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-700/60 shadow-xl shadow-slate-200/50 dark:shadow-black/20 backdrop-blur-sm overflow-hidden">
          {/* Верхняя полоска-акцент */}
          <div className="h-1.5 bg-gradient-to-r from-slate-400 via-slate-500 to-slate-400 dark:from-slate-600 dark:via-slate-500 dark:to-slate-600" />

          <div className="p-10 sm:p-14 text-center">
            {/* Иконка */}
            <div className="mx-auto w-20 h-20 rounded-2xl bg-slate-200/80 dark:bg-slate-700/50 flex items-center justify-center mb-8">
              <svg
                className="w-10 h-10 text-slate-500 dark:text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            {/* 404 — крупно и выразительно */}
            <p className="text-8xl sm:text-9xl font-bold tracking-tighter text-slate-200 dark:text-slate-700 select-none leading-none">
              404
            </p>

            <h1 className="mt-6 text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Страница не найдена
            </h1>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-medium text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-lg shadow-slate-900/20 dark:shadow-slate-400/20"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                На главную
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
