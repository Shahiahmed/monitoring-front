"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";

interface AuthUser {
  roles?: string[];
}

function isAdminOrSuperAdmin(user: AuthUser | null): boolean {
  const roles = user?.roles ?? [];
  return roles.includes("SUPER_ADMIN") || roles.includes("ADMIN");
}

function isSuperAdmin(user: AuthUser | null): boolean {
  return (user?.roles ?? []).includes("SUPER_ADMIN");
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    secondName: "",
    password: "",
    confirmPassword: "",
    passwordHint: "",
    role: "USER",
    active: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordHint, setShowPasswordHint] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  /** null — проверка прав; true — можно показать форму */
  const [accessAllowed, setAccessAllowed] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("authUser");
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("authUser") : null;
      if (!raw) {
        router.replace("/login");
        return;
      }
      const parsed = JSON.parse(raw) as AuthUser;
      setCurrentUser(parsed);
      if (!isAdminOrSuperAdmin(parsed)) {
        router.replace("/users");
        return;
      }
      setAccessAllowed(true);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (
      currentUser &&
      !isSuperAdmin(currentUser) &&
      formData.role === "SUPER_ADMIN"
    ) {
      setFormData((prev) => ({ ...prev, role: "USER" }));
    }
  }, [currentUser, formData.role]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let value = e.target.value.trim();
    if (value && !value.includes("@")) {
      value = value + "@enbek.kz";
      setFormData((prev) => ({ ...prev, email: value }));
    } else if (value && value.endsWith("@")) {
      value = value + "enbek.kz";
      setFormData((prev) => ({ ...prev, email: value }));
    }
  };

  const generatePassword = () => {
    const length = 12;
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*";
    const allChars = uppercase + lowercase + numbers + symbols;

    let password = "";
    // Гарантируем наличие хотя бы одного символа каждого типа
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Заполняем остаток случайными символами
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Перемешиваем символы
    password = password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");

    setFormData((prev) => ({
      ...prev,
      password: password,
      confirmPassword: password,
    }));
    setShowPassword(true);
    setShowConfirmPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Валидация
    if (
      !formData.email ||
      !formData.firstName ||
      !formData.lastName ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Пожалуйста, заполните все обязательные поля");
      return;
    }

    if (!formData.email.includes("@enbek.kz")) {
      setError("Используйте корпоративный email: example@enbek.kz");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    if (formData.password.length < 6) {
      setError("Пароль должен содержать минимум 6 символов");
      return;
    }

    setIsLoading(true);

    try {
      const payload: Record<string, unknown> = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        secondName: formData.secondName || null,
        password: formData.password,
        passwordHint: formData.passwordHint || null,
        active: formData.active,
        roleCode: formData.role,
      };

      const response = await apiFetch("users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message =
          (await response.text()) || "Ошибка при регистрации пользователя";
        setError(message);
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      router.push("/users");
    } catch (err) {
      setError("Ошибка при регистрации пользователя");
      setIsLoading(false);
    }
  };

  if (accessAllowed !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Проверка доступа…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="w-full px-4 py-8 sm:px-6 sm:py-10">
        {/* Заголовок */}
        <div className="mb-10">
          <h1 className="text-h1 text-gray-900 dark:text-white mb-2 tracking-tight">
            Регистрация пользователя
          </h1>
          {/* <p className="text-sm text-gray-600 dark:text-gray-400">
            Создание новой учетной записи в системе мониторинга
          </p> */}
        </div>

        {/* Форма */}
        <div className="rounded-xl border border-slate-200/80 bg-white/75 p-5 shadow-card backdrop-blur sm:p-6 dark:border-slate-700 dark:bg-slate-900/40">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={handleEmailBlur}
                className="block w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded bg-slate-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-gray-900 dark:focus:border-gray-500"
                placeholder="example@enbek.kz"
                pattern="[a-zA-Z0-9._%+-]+@enbek\.kz"
                title="Введите email в формате example@enbek.kz"
                required
              />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Используйте корпоративный email: example@enbek.kz
              </p>
            </div>

            {/* Имя, Фамилия, Отчество */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Имя <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded bg-slate-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-gray-900 dark:focus:border-gray-500"
                  placeholder="Имя"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Фамилия <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded bg-slate-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-gray-900 dark:focus:border-gray-500"
                  placeholder="Фамилия"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="secondName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Отчество
                </label>
                <input
                  id="secondName"
                  name="secondName"
                  type="text"
                  value={formData.secondName}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded bg-slate-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-gray-900 dark:focus:border-gray-500"
                  placeholder="Отчество"
                />
              </div>
            </div>

            {/* Пароль и Подтверждение пароля */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Пароль <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center space-x-1"
                    title="Сгенерировать пароль"
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
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                    <span>Сгенерировать</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-700 rounded bg-slate-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-gray-900 dark:focus:border-gray-500"
                    placeholder="Введите пароль (минимум 6 символов)"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {formData.password && formData.password.length < 6 && (
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Пароль должен содержать минимум 6 символов
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Подтверждение пароля <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-700 rounded bg-slate-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-gray-900 dark:focus:border-gray-500"
                    placeholder="Повторите пароль"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {formData.confirmPassword &&
                  formData.password !== formData.confirmPassword && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                      Пароли не совпадают
                    </p>
                  )}
                {formData.confirmPassword &&
                  formData.password === formData.confirmPassword &&
                  formData.password.length >= 6 && (
                    <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-400">
                      Пароли совпадают
                    </p>
                  )}
              </div>
            </div>

            {/* Роль: супер-админ — все роли; обычный админ — только пользователь или админ */}
            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Роль <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="block w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded bg-slate-100 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-gray-900 dark:focus:border-gray-500"
                required
              >
                <option value="USER">Пользователь</option>
                <option value="ADMIN">Админ</option>
                {isSuperAdmin(currentUser) && (
                  <option value="SUPER_ADMIN">Супер админ</option>
                )}
              </select>
              {!isSuperAdmin(currentUser) && (
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Роль «Супер админ» может назначить только супер-администратор.
                </p>
              )}
            </div>

            {/* Подсказка пароля и Активен */}
            <div>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center">
                  <input
                    id="showPasswordHint"
                    type="checkbox"
                    checked={showPasswordHint}
                    onChange={(e) => setShowPasswordHint(e.target.checked)}
                    className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded dark:bg-gray-800 dark:border-gray-600 dark:focus:ring-gray-500"
                  />
                  <label
                    htmlFor="showPasswordHint"
                    className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Добавить подсказку для пароля{" "}
                    <span className="text-gray-500 font-normal">
                      (необязательно)
                    </span>
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="active"
                    name="active"
                    type="checkbox"
                    checked={formData.active}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded dark:bg-gray-800 dark:border-gray-600 dark:focus:ring-gray-500"
                  />
                  <label
                    htmlFor="active"
                    className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Пользователь активен
                  </label>
                </div>
              </div>
              {showPasswordHint && (
                <div className="mt-4">
                  <textarea
                    id="passwordHint"
                    name="passwordHint"
                    value={formData.passwordHint}
                    onChange={handleInputChange}
                    rows={2}
                    className="block w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-slate-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-gray-900 dark:focus:border-gray-500 resize-none"
                    placeholder="Введите подсказку для восстановления пароля"
                  />
                </div>
              )}
            </div>

            {/* Ошибка */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded p-4">
                <p className="text-sm text-red-800 dark:text-red-300">
                  {error}
                </p>
              </div>
            )}

            {/* Кнопки */}
            <div className="flex items-center justify-end space-x-4 pt-8 border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Регистрация...
                  </span>
                ) : (
                  "Зарегистрировать"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
