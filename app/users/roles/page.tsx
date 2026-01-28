"use client";

import { useState } from "react";

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export default function RolesPage() {
  const [roles] = useState<Role[]>([
    {
      id: "USER",
      name: "Пользователь",
      description: "Базовые права доступа к системе",
      permissions: [
        "Просмотр данных",
        "Создание инцидентов",
        "Просмотр собственных данных",
      ],
    },
    {
      id: "ADMIN",
      name: "Админ",
      description: "Расширенные права управления системой",
      permissions: [
        "Все права пользователя",
        "Управление пользователями",
        "Управление инцидентами",
        "Просмотр статистики",
        "Настройка системы",
      ],
    },
    {
      id: "SUPER_ADMIN",
      name: "Супер админ",
      description: "Полный доступ ко всем функциям системы",
      permissions: [
        "Все права админа",
        "Управление ролями",
        "Управление всеми пользователями",
        "Системные настройки",
        "Доступ к логам",
        "Резервное копирование",
      ],
    },
  ]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="px-6 py-8">
        {/* Заголовок */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Управление ролями
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Просмотр и управление ролями пользователей системы
          </p>
        </div>

        {/* Список ролей */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div
              key={role.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {role.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {role.description}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    role.id === "SUPER_ADMIN"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                      : role.id === "ADMIN"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400"
                  }`}
                >
                  {role.id}
                </span>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Права доступа:
                </h4>
                <ul className="space-y-2">
                  {role.permissions.map((permission, index) => (
                    <li
                      key={index}
                      className="flex items-start text-sm text-gray-600 dark:text-gray-400"
                    >
                      <svg
                        className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>{permission}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
