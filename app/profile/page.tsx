"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import PasswordFieldWithToggle from "../components/PasswordFieldWithToggle";
import { useLanguage } from "../components/LanguageProvider";
import { useTour } from "../components/TourProvider";

function validatePassword(password: string, t: (k: string) => string): string | null {
  if (password.length < 8) return t("profile.minChars");
  if (!/[A-Z]/.test(password)) return t("profile.upperCase");
  if (!/[a-z]/.test(password)) return t("profile.lowerCase");
  if (!/[0-9]/.test(password)) return t("profile.digit");
  return null;
}

function PasswordStrength({ password }: { password: string }) {
  const { t } = useLanguage();
  if (!password) return null;
  const checks = [
    { label: t("profile.minChars"), ok: password.length >= 8 },
    { label: t("profile.upperCase"), ok: /[A-Z]/.test(password) },
    { label: t("profile.lowerCase"), ok: /[a-z]/.test(password) },
    { label: t("profile.digit"), ok: /[0-9]/.test(password) },
  ];
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
      {checks.map(c => (
        <span key={c.label} className={`text-xs flex items-center gap-1 ${c.ok ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}>
          {c.ok ? "✓" : "○"} {c.label}
        </span>
      ))}
    </div>
  );
}

interface AuthUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  secondName: string | null;
  roles: string[];
  hasAvatar?: boolean;
  passwordHint?: string | null;
}

export default function ProfilePage() {
  const { t } = useLanguage();
  const { startTour } = useTour();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDeleting, setAvatarDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    secondName: "",
    email: "",
    passwordHint: "",
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    apiFetch("users/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((parsed: AuthUser | null) => {
        if (!parsed) return;
        setUser(parsed);
        setForm({
          firstName: parsed.firstName ?? "",
          lastName: parsed.lastName ?? "",
          secondName: parsed.secondName ?? "",
          email: parsed.email,
          passwordHint: parsed.passwordHint ?? "",
        });
        localStorage.setItem("authUser", JSON.stringify(parsed));

        if (parsed.hasAvatar) {
          apiFetch(`users/${parsed.id}/avatar`)
            .then((res) => (res.ok ? res.blob() : null))
            .then((blob) => { if (blob && blob.size > 0) setAvatarPreview(URL.createObjectURL(blob)); })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      alert(t("profile.maxFileSize"));
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert(t("profile.notAnImage"));
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
        alert(msg || t("profile.uploading"));
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
      alert(t("common.saveError"));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!user) return;
    setAvatarDeleting(true);
    try {
      const res = await apiFetch(`users/${user.id}/avatar`, { method: "DELETE" });
      if (!res.ok) { alert(t("common.deleteError")); return; }
      setAvatarPreview(null);
      setUser(prev => prev ? { ...prev, hasAvatar: false } : null);
      try {
        const raw = localStorage.getItem("authUser");
        if (raw) { const u = JSON.parse(raw) as AuthUser; u.hasAvatar = false; localStorage.setItem("authUser", JSON.stringify(u)); }
      } catch {}
    } catch { alert(t("common.deleteError")); }
    finally { setAvatarDeleting(false); }
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
          setError(t("profile.pwdFillAll"));
          setIsSaving(false);
          return;
        }
        if (newPassword !== confirmNewPassword) {
          setError(t("profile.pwdMismatch"));
          setIsSaving(false);
          return;
        }
        const pwdError = validatePassword(newPassword, t);
        if (pwdError) {
          setError(pwdError);
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
          setError(msg || t("common.saveError"));
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
          passwordHint: form.passwordHint || null,
          isActive: true,
          registrationDate: null,
          lastLoginDate: null,
          roles: Array.isArray(user.roles)
            ? user.roles.map((r) => (typeof r === "string" ? r : (r as { code?: string }).code ?? r))
            : [],
          hasAvatar: Boolean(user.hasAvatar),
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        setError(msg || t("common.saveError"));
        setIsSaving(false);
        return;
      }

      const updated = (await res.json()) as AuthUser;
      setUser(updated);
      localStorage.setItem("authUser", JSON.stringify(updated));
      setSuccess(
        wantsPasswordChange
          ? t("profile.savedBoth")
          : t("profile.savedData"),
      );
      setTimeout(() => setSuccess(null), 3000);
      setIsSaving(false);
    } catch {
      setError(t("common.saveError"));
      setIsSaving(false);
    }
  };

  return (
    <div className="px-6 py-8">
      <div>
        {/* Заголовок */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            {t("profile.title")}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("profile.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Левая колонка: аватар */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                {t("profile.avatar")}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor="avatar"
                      className={`inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer ${avatarUploading || avatarDeleting ? "opacity-50 pointer-events-none" : ""}`}
                    >
                      <span>{avatarUploading ? t("profile.uploading") : t("profile.changePhoto")}</span>
                      <input
                        id="avatar"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                        disabled={avatarUploading || avatarDeleting}
                      />
                    </label>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={handleAvatarDelete}
                        disabled={avatarDeleting || avatarUploading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 dark:border-red-800 rounded-md text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {avatarDeleting ? (
                          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        )}
                        {avatarDeleting ? t("profile.deleting") : t("profile.deletePhoto")}
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    JPG, PNG, до 5MB
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Обучение
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Короткий тур по интерфейсу: шапка, меню, сводка и ИИ-ассистент.
              </p>
              <button
                type="button"
                onClick={startTour}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Пройти обучение заново
              </button>
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
                  {t("profile.personalInfo")}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      {t("profile.lastName")}
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={form.lastName}
                      onChange={handleChange}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500"
                      placeholder={t("profile.lastName")}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      {t("profile.firstName")}
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={form.firstName}
                      onChange={handleChange}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500"
                      placeholder={t("profile.firstName")}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="secondName"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      {t("profile.secondName")}
                    </label>
                    <input
                      id="secondName"
                      name="secondName"
                      type="text"
                      value={form.secondName}
                      onChange={handleChange}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500"
                      placeholder={t("profile.secondName")}
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
                      {t("profile.emailReadOnly")}
                    </p>
                  </div>
                </div>
              </section>

              {/* Безопасность */}
              <section>
                <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  {t("profile.security")}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <PasswordFieldWithToggle
                      id="currentPassword"
                      name="currentPassword"
                      label={t("profile.currentPassword")}
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
                      label={t("profile.newPassword")}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={isSaving}
                    />
                    <PasswordStrength password={newPassword} />
                  </div>
                  <div>
                    <PasswordFieldWithToggle
                      id="confirmNewPassword"
                      name="confirmNewPassword"
                      label={t("profile.confirmPasswordLabel")}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={isSaving}
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t("profile.leaveEmpty")}
                </p>
                <div className="mt-4">
                  <label htmlFor="passwordHint" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("profile.passwordHint")}
                  </label>
                  <textarea
                    id="passwordHint"
                    name="passwordHint"
                    value={form.passwordHint}
                    onChange={(e) => setForm((prev) => ({ ...prev, passwordHint: e.target.value }))}
                    rows={2}
                    disabled={isSaving}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500 resize-none disabled:opacity-50"
                    placeholder={t("profile.passwordHint")}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t("profile.passwordHintInfo")}
                  </p>
                </div>
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
                  {isSaving ? t("profile.saving") : t("profile.saveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

