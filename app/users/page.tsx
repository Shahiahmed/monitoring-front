"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Pagination from "../components/Pagination";

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  secondName?: string;
  role: string;
  active: boolean;
  registrationDate: string;
  lastLoginDate?: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Моковые данные для примера
  const [users] = useState<User[]>([
    {
      id: 1,
      email: "ivanov@enbek.kz",
      firstName: "Иван",
      lastName: "Иванов",
      secondName: "Иванович",
      role: "SUPER_ADMIN",
      active: true,
      registrationDate: "2024-01-15",
      lastLoginDate: "2025-01-25",
    },
    {
      id: 2,
      email: "petrov@enbek.kz",
      firstName: "Петр",
      lastName: "Петров",
      role: "ADMIN",
      active: true,
      registrationDate: "2024-02-20",
      lastLoginDate: "2025-01-24",
    },
    {
      id: 3,
      email: "sidorov@enbek.kz",
      firstName: "Сидор",
      lastName: "Сидоров",
      secondName: "Сидорович",
      role: "USER",
      active: false,
      registrationDate: "2024-03-10",
    },
    {
      id: 4,
      email: "smirnov@enbek.kz",
      firstName: "Алексей",
      lastName: "Смирнов",
      role: "USER",
      active: true,
      registrationDate: "2024-04-05",
      lastLoginDate: "2025-01-23",
    },
    {
      id: 5,
      email: "kozlov@enbek.kz",
      firstName: "Дмитрий",
      lastName: "Козлов",
      secondName: "Дмитриевич",
      role: "ADMIN",
      active: true,
      registrationDate: "2024-05-12",
      lastLoginDate: "2025-01-22",
    },
    {
      id: 6,
      email: "novikov@enbek.kz",
      firstName: "Сергей",
      lastName: "Новиков",
      role: "USER",
      active: false,
      registrationDate: "2024-06-18",
    },
    {
      id: 7,
      email: "morozov@enbek.kz",
      firstName: "Андрей",
      lastName: "Морозов",
      secondName: "Андреевич",
      role: "USER",
      active: true,
      registrationDate: "2024-07-22",
      lastLoginDate: "2025-01-21",
    },
    {
      id: 8,
      email: "volkov@enbek.kz",
      firstName: "Максим",
      lastName: "Волков",
      role: "USER",
      active: true,
      registrationDate: "2024-08-30",
      lastLoginDate: "2025-01-20",
    },
    {
      id: 9,
      email: "alekseev@enbek.kz",
      firstName: "Владимир",
      lastName: "Алексеев",
      secondName: "Владимирович",
      role: "ADMIN",
      active: true,
      registrationDate: "2024-09-14",
      lastLoginDate: "2025-01-19",
    },
    {
      id: 10,
      email: "lebedev@enbek.kz",
      firstName: "Николай",
      lastName: "Лебедев",
      role: "USER",
      active: false,
      registrationDate: "2024-10-08",
    },
    {
      id: 11,
      email: "semenov@enbek.kz",
      firstName: "Павел",
      lastName: "Семенов",
      secondName: "Павлович",
      role: "USER",
      active: true,
      registrationDate: "2024-11-25",
      lastLoginDate: "2025-01-18",
    },
    {
      id: 12,
      email: "egorov@enbek.kz",
      firstName: "Роман",
      lastName: "Егоров",
      role: "USER",
      active: true,
      registrationDate: "2024-12-03",
      lastLoginDate: "2025-01-17",
    },
  ]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.secondName &&
          user.secondName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesFilter =
        filterActive === null || user.active === filterActive;

      return matchesSearch && matchesFilter;
    });
  }, [users, searchTerm, filterActive]);

  // Пагинация
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Сброс на первую страницу при изменении фильтров
  const handleFilterChange = (filter: boolean | null) => {
    setFilterActive(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="px-6 py-8">
        {/* Заголовок и действия */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Список пользователей
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Управление учетными записями пользователей системы
            </p>
          </div>
          <Link
            href="/users/register"
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            Добавить пользователя
          </Link>
        </div>

        {/* Фильтры и поиск */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Поиск по email, имени, фамилии..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-gray-900 dark:focus:border-gray-500"
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleFilterChange(null)}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                filterActive === null
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Все
            </button>
            <button
              onClick={() => handleFilterChange(true)}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                filterActive === true
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Активные
            </button>
            <button
              onClick={() => handleFilterChange(false)}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                filterActive === false
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Неактивные
            </button>
          </div>
        </div>

        {/* Таблица */}
        <div className="border border-gray-200 dark:border-gray-800 rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ФИО
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Роль
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Дата регистрации
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Последний вход
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-50 dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-800">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      Пользователи не найдены
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-white dark:hover:bg-gray-800 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {user.lastName} {user.firstName}
                        {user.secondName ? ` ${user.secondName}` : ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === "SUPER_ADMIN"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                              : user.role === "ADMIN"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {user.role === "SUPER_ADMIN"
                            ? "Супер админ"
                            : user.role === "ADMIN"
                            ? "Админ"
                            : "Пользователь"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.active
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {user.active ? "Активен" : "Неактивен"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.registrationDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.lastLoginDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            title="Редактировать"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            title="Удалить"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Пагинация */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredUsers.length}
            itemsPerPage={itemsPerPage}
          />
        )}
      </div>
    </div>
  );
}
