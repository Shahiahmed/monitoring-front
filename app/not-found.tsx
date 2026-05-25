import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-6">
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">
          Ошибка 404
        </p>

        <h1 className="text-8xl font-bold text-gray-900 dark:text-white mb-4 tabular-nums">
          404
        </h1>

        <div className="w-12 h-px bg-gray-300 dark:bg-gray-700 mx-auto mb-6" />

        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
          Страница не найдена
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto mb-10">
          Запрошенная страница не существует или была удалена. Проверьте адрес и попробуйте снова.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            На главную
          </Link>
          <Link
            href="/incidents/events"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Журнал событий
          </Link>
        </div>
      </div>
    </div>
  );
}
