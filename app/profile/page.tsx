"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import PasswordFieldWithToggle from "../components/PasswordFieldWithToggle";

interface AuthUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  secondName: string | null;
  roles: string[];
  hasAvatar?: boolean;
}

export default function ProfilePage() {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    secondName: "",
    email: "",
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("authUser") : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as AuthUser;
      setUser(parsed);
      setForm({
        firstName: parsed.firstName ?? "",
        lastName: parsed.lastName ?? "",
        secondName: parsed.secondName ?? "",
        email: parsed.email,
      });

      if (parsed.hasAvatar !== false) {
        apiFetch(`users/${parsed.id}/avatar`)
          .then((res) => {
            if (res.ok) return res.blob();
            return null;
          })
          .then((blob) => {
            if (blob && blob.size > 0) {
              setAvatarPreview(URL.createObjectURL(blob));
            }
          })
          .catch(() => {});
      }
    } catch {
      // ignore
    }
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Размер файла не должен превышать 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("Файл должен быть изображением");
      return;
    }

    setAvatarUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch(`users/${user.id}/avatar`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const msg = await res.text();
        alert(msg || "Не удалось загрузить аватар");
        setAvatarUploading(false);
        return;
      }

      const data = await res.json();
      setAvatarPreview(data.avatarUrl);
      setUser((prev) => (prev ? { ...prev, hasAvatar: true } : null));
      try {
        const raw = localStorage.getItem("authUser");
        if (raw) {
          const u = JSON.parse(raw) as AuthUser;
          u.hasAvatar = true;
          localStorage.setItem("authUser", JSON.stringify(u));
        }
      } catch {
        // ignore
      }
    } catch {
      alert("Ошибка при загрузке аватара");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setError(null);

    const wantsPasswordChange =
      currentPassword.trim() !== "" ||
      newPassword.trim() !== "" ||
      confirmNewPassword.trim() !== "";

    try {
      if (wantsPasswordChange) {
        if (!currentPassword || !newPassword || !confirmNewPassword) {
          setError("Для смены пароля заполните все три поля");
          setIsSaving(false);
          return;
        }
        if (newPassword !== confirmNewPassword) {
          setError("Новый пароль и подтверждение не совпадают");
          setIsSaving(false);
          return;
        }
        if (newPassword.length < 6) {
          setError("Новый пароль должен содержать минимум 6 символов");
          setIsSaving(false);
          return;
        }

        const passRes = await apiFetch("users/me/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        });

        if (!passRes.ok) {
          const msg = await passRes.text();
          setError(msg || "Не удалось сменить пароль");
          setIsSaving(false);
          return;
        }

        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }

      const res = await apiFetch(`users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: user.id,
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          secondName: form.secondName,
          isActive: true,
          registrationDate: null,
          lastLoginDate: null,
          roles: user.roles,
          hasAvatar: Boolean(user.hasAvatar),
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        setError(msg || "Не удалось сохранить профиль");
        setIsSaving(false);
        return;
      }

      const updated = (await res.json()) as AuthUser;
      setUser(updated);
      localStorage.setItem("authUser", JSON.stringify(updated));
      setSuccess(
        wantsPasswordChange
          ? "Пароль и данные профиля сохранены"
          : "Данные сохранены",
      );
      setTimeout(() => setSuccess(null), 3000);
      setIsSaving(false);
    } catch {
      setError("Ошибка при сохранении профиля");
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="px-6 py-8">
        {/* Заголовок */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Профиль
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Личные данные, аватар и настройки безопасности
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Левая колонка: аватар */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                Аватар
              </h2>

              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                <img
                    src={avatarPreview ?? "/no-avatar.svg"}
                    alt="Avatar"
                    className="h-20 w-20 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="avatar"
                    className={`inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer ${avatarUploading ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <span>{avatarUploading ? "Загрузка..." : "Изменить"}</span>
                    <input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      disabled={avatarUploading}
                    />
                  </label>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    JPG, PNG, до 5MB
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Правая колонка: личные данные и пароль */}
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-8"
            >
              {/* Личные данные */}
              <section>
                <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  Личные данные
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Фамилия
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={form.lastName}
                      onChange={handleChange}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500"
                      placeholder="Введите фамилию"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Имя
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={form.firstName}
                      onChange={handleChange}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500"
                      placeholder="Введите имя"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="secondName"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Отчество
                    </label>
                    <input
                      id="secondName"
                      name="secondName"
                      type="text"
                      value={form.secondName}
                      onChange={handleChange}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500"
                      placeholder="Отчество"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed"
                      readOnly
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Email изменяется только администратором системы
                    </p>
                  </div>
                </div>
              </section>

              {/* Безопасность */}
              <section>
                <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  Безопасность
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <PasswordFieldWithToggle
                      id="currentPassword"
                      name="currentPassword"
                      label="Текущий пароль"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      disabled={isSaving}
                    />
                  </div>
                  <div>
                    <PasswordFieldWithToggle
                      id="newPassword"
                      name="newPassword"
                      label="Новый пароль"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={isSaving}
                    />
                  </div>
                  <div>
                    <PasswordFieldWithToggle
                      id="confirmNewPassword"
                      name="confirmNewPassword"
                      label="Подтверждение пароля"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={isSaving}
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Оставьте поля пустыми, если не хотите изменять пароль
                </p>
              </section>

              {/* Кнопка сохранения */}
              {error && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-sm text-green-600 dark:text-green-400">
                  {success}
                </div>
              )}

              <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSaving ? "Сохранение..." : "Сохранить изменения"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

