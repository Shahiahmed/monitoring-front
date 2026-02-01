"use client";

export default function ChangelogPage() {
  const items = [
    {
      date: "2025-01-26",
      title: "Профиль пользователя и локализация",
      changes: [
        "Добавлена страница профиля с аватаром, личными данными и сменой пароля.",
        "Реализована локализация страницы входа (русский / казахский).",
        "Обновлён переключатель языка в шапке.",
      ],
    },
    {
      date: "2025-01-25",
      title: "Список пользователей и роли",
      changes: [
        "Добавлена страница списка пользователей со статистикой и пагинацией.",
        "Реализована базовая модель ролей: Пользователь, Админ, Супер админ.",
        "Создана страница ролей с описанием прав доступа.",
      ],
    },
    {
      date: "2025-01-24",
      title: "Навигация и сайдбар",
      changes: [
        "Добавлен адаптивный сайдбар с группой «Пользователи».",
        "Реализовано плавное сворачивание/разворачивание сайдбара.",
        "Добавлена кнопка выхода внизу сайдбара.",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="px-6 py-8">
        {/* Заголовок */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Changelog
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            История изменений системы мониторинга
          </p>
        </div>

        {/* Лента изменений */}
        <div className="space-y-6">
          {items.map((item) => (
            <section
              key={item.date}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {item.title}
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {item.date}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {item.changes.map((change, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-gray-700 dark:text-gray-300 flex"
                  >
                    <span className="mt-1 mr-2 h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-500" />
                    <span>{change}</span>
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

