"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { useLanguage } from "../../components/LanguageProvider";

interface Role {
  id: number;
  code: string;
  nameEn: string | null;
  nameKz: string | null;
  nameRu: string | null;
}

const roleConfig: Record<string, { icon: string; accent: string; bg: string }> =
  {
    SUPER_ADMIN: {
      icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
      accent: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/30",
    },
    ADMIN: {
      icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
      accent: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    USER: {
      icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
      accent: "text-slate-600 dark:text-slate-400",
      bg: "bg-slate-50 dark:bg-slate-800/50",
    },
  };

export default function RolesPage() {
  const { t } = useLanguage();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await apiFetch("roles");
        if (!res.ok) throw new Error(t("roles.loadError"));
        const data = (await res.json()) as Role[];
        setRoles(data);
      } catch (e: any) {
        setError(e.message ?? t("roles.loadError"));
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, []);

  return (
    <div className="px-6 py-8">
      {/* Заголовок */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          {t("roles.title")}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("roles.subtitle")}
        </p>
      </div>

      {/* Состояния */}
      {loading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("roles.loading")}
        </p>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Карточки ролей */}
      {!loading && !error && (
        <div className="grid gap-5 md:grid-cols-3">
          {roles.map((role) => {
            const cfg = roleConfig[role.code] ?? roleConfig.USER;
            const title =
              role.nameRu ?? role.nameKz ?? role.nameEn ?? role.code;

            return (
              <div
                key={role.id}
                className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
              >
                {/* Иконка + код */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${cfg.bg}`}
                  >
                    <svg
                      className={`h-5 w-5 ${cfg.accent}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={cfg.icon}
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {title}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {role.code}
                    </span>
                  </div>
                </div>

                {/* Переводы */}
                <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                  {[
                    { label: t("roles.ru"), value: role.nameRu },
                    { label: t("roles.kz"), value: role.nameKz },
                    { label: t("roles.en"), value: role.nameEn },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-500 dark:text-gray-400">
                        {row.label}
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {row.value || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {roles.length === 0 && (
            <div className="col-span-full rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              {t("roles.notFound")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
