"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Pagination from "../components/Pagination";
import PasswordFieldWithToggle from "../components/PasswordFieldWithToggle";
import { apiFetch } from "../lib/api";
import { useLanguage } from "../components/LanguageProvider";

interface User {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  secondName?: string | null;
  roles: string[];
  isActive: boolean;
  registrationDate: string | null;
  lastLoginDate?: string | null;
  hasAvatar?: boolean;
}

function AvatarCell({
  userId,
  initials,
  hasAvatar,
}: {
  userId: number;
  initials: string;
  hasAvatar: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAvatar) { setSrc(null); return; }
    let revoked = false;
    apiFetch(`users/${userId}/avatar`)
      .then((res) => { if (!res.ok) throw new Error(); return res.blob(); })
      .then((blob) => { if (blob.size > 0 && !revoked) setSrc(URL.createObjectURL(blob)); })
      .catch(() => {});
    return () => { revoked = true; };
  }, [userId, hasAvatar]);

  return (
    <img src={src ?? "/no-avatar.svg"} alt="avatar"
      className="h-9 w-9 rounded-full object-cover shrink-0" />
  );
}

type SortKey = "name" | "email" | "role" | "status" | "registrationDate" | "lastLoginDate";
type SortDir = "asc" | "desc";

interface AuthUser { id?: number; roles?: string[]; }

function isAdminOrSuperAdmin(user: AuthUser | null): boolean {
  const roles = user?.roles ?? [];
  return roles.includes("SUPER_ADMIN") || roles.includes("ADMIN");
}

function isSuperAdmin(user: AuthUser | null): boolean {
  return (user?.roles ?? []).includes("SUPER_ADMIN");
}

function userHasSuperAdminRole(user: User): boolean {
  return (user.roles ?? []).includes("SUPER_ADMIN");
}

const ROLE_PRIORITY: Record<string, number> = { SUPER_ADMIN: 0, ADMIN: 1, USER: 2 };

function getRolePriority(roles: string[]): number {
  let min = 99;
  for (const r of roles) { const p = ROLE_PRIORITY[r]; if (p !== undefined && p < min) min = p; }
  return min;
}

export default function UsersPage() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [sortKey, setSortKey] = useState<SortKey | null>("role");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", secondName: "", newPassword: "", confirmPassword: "" });
  const [editModalSaving, setEditModalSaving] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");
  const [deleteModalSaving, setDeleteModalSaving] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);
  const [togglingActiveId, setTogglingActiveId] = useState<number | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("authUser") : null;
      if (!raw) return;
      setCurrentUser(JSON.parse(raw) as AuthUser);
    } catch {}
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch("users");
        if (!res.ok) {
          const msg = await res.text();
          setError(msg || t("users.loadFailed"));
          setLoading(false);
          return;
        }
        const data = (await res.json()) as any[];
        const mapped: User[] = data.map((u) => ({
          id: u.id, email: u.email,
          firstName: u.firstName ?? null, lastName: u.lastName ?? null, secondName: u.secondName ?? null,
          roles: Array.from(u.roles ?? []),
          isActive: u.isActive ?? true,
          registrationDate: u.registrationDate ?? null, lastLoginDate: u.lastLoginDate ?? null,
          hasAvatar: Boolean(u.hasAvatar),
        }));
        setUsers(mapped);
      } catch {
        setError(t("users.loadFailed"));
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredAndSortedUsers = useMemo(() => {
    const filtered = users.filter((user) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = user.email.toLowerCase().includes(term)
        || (user.firstName ?? "").toLowerCase().includes(term)
        || (user.lastName ?? "").toLowerCase().includes(term)
        || (user.secondName ?? "").toLowerCase().includes(term);
      const matchesFilter = filterActive === null || user.isActive === filterActive;
      return matchesSearch && matchesFilter;
    });

    if (!sortKey) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name": {
          const nameA = [a.lastName, a.firstName, a.secondName].filter(Boolean).join(" ").toLowerCase();
          const nameB = [b.lastName, b.firstName, b.secondName].filter(Boolean).join(" ").toLowerCase();
          return nameA.localeCompare(nameB, "ru") * dir;
        }
        case "email": return a.email.localeCompare(b.email) * dir;
        case "role": return (getRolePriority(a.roles) - getRolePriority(b.roles)) * dir;
        case "status": return (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1) * dir;
        case "registrationDate": {
          const da = a.registrationDate ? new Date(a.registrationDate).getTime() : 0;
          const db = b.registrationDate ? new Date(b.registrationDate).getTime() : 0;
          return (da - db) * dir;
        }
        case "lastLoginDate": {
          const da = a.lastLoginDate ? new Date(a.lastLoginDate).getTime() : 0;
          const db = b.lastLoginDate ? new Date(b.lastLoginDate).getTime() : 0;
          return (da - db) * dir;
        }
        default: return 0;
      }
    });
  }, [users, searchTerm, filterActive, sortKey, sortDir]);

  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedUsers, currentPage, itemsPerPage]);

  const handleFilterChange = (filter: boolean | null) => { setFilterActive(filter); setCurrentPage(1); };
  const handleSearchChange = (value: string) => { setSearchTerm(value); setCurrentPage(1); };
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setCurrentPage(1);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const openEditModal = (u: User) => {
    setEditUser(u);
    setEditForm({ firstName: u.firstName ?? "", lastName: u.lastName ?? "", secondName: u.secondName ?? "", newPassword: "", confirmPassword: "" });
    setEditModalError(null);
  };

  const closeEditModal = () => {
    setEditUser(null);
    setEditForm({ firstName: "", lastName: "", secondName: "", newPassword: "", confirmPassword: "" });
    setEditModalError(null);
    setEditModalSaving(false);
  };

  const openDeleteModal = (u: User) => { setDeleteTarget(u); setDeleteConfirmPassword(""); setDeleteModalError(null); };
  const closeDeleteModal = () => { setDeleteTarget(null); setDeleteConfirmPassword(""); setDeleteModalError(null); setDeleteModalSaving(false); };

  const canSuperAdminDeleteUser = (user: User): boolean => {
    if (!isSuperAdmin(currentUser)) return false;
    if (currentUser?.id === undefined) return false;
    if (user.id === currentUser.id) return false;
    if (userHasSuperAdminRole(user)) return false;
    return true;
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTarget) return;
    if (!deleteConfirmPassword.trim()) { setDeleteModalError(t("users.enterSuperAdminPwd")); return; }
    setDeleteModalSaving(true); setDeleteModalError(null);
    try {
      const res = await apiFetch(`users/${deleteTarget.id}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: deleteConfirmPassword }),
      });
      if (!res.ok) { const msg = await res.text(); setDeleteModalError(msg || t("users.deleteFailed")); return; }
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      closeDeleteModal();
    } catch {
      setDeleteModalError(t("users.networkError"));
    } finally {
      setDeleteModalSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditModalError(null);
    const wantsPassword = editForm.newPassword.trim() !== "" || editForm.confirmPassword.trim() !== "";
    if (wantsPassword) {
      if (!isSuperAdmin(currentUser)) { setEditModalError(t("users.pwdOnlySuperAdmin")); return; }
      if (!editForm.newPassword || editForm.newPassword.length < 6) { setEditModalError(t("users.pwdMinLength")); return; }
      if (editForm.newPassword !== editForm.confirmPassword) { setEditModalError(t("users.pwdMismatch")); return; }
    }
    setEditModalSaving(true);
    try {
      const profileRes = await apiFetch(`users/${editUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editUser.id, email: editUser.email,
          firstName: editForm.firstName || null, lastName: editForm.lastName || null,
          secondName: editForm.secondName || null, isActive: editUser.isActive,
          registrationDate: editUser.registrationDate, lastLoginDate: editUser.lastLoginDate ?? null,
          roles: editUser.roles, hasAvatar: Boolean(editUser.hasAvatar),
        }),
      });
      if (!profileRes.ok) { const msg = await profileRes.text(); setEditModalError(msg || t("users.saveFailed")); return; }
      const data = (await profileRes.json()) as { firstName?: string | null; lastName?: string | null; secondName?: string | null; hasAvatar?: boolean; isActive?: boolean; };

      if (wantsPassword && isSuperAdmin(currentUser)) {
        const pwRes = await apiFetch(`users/${editUser.id}/password`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword: editForm.newPassword }),
        });
        if (!pwRes.ok) {
          const msg = await pwRes.text();
          setEditModalError(msg || t("users.profileSavedPwdFailed"));
          setUsers((prev) => prev.map((u) => u.id === editUser.id ? {
            ...u,
            firstName: data.firstName ?? u.firstName, lastName: data.lastName ?? u.lastName,
            secondName: data.secondName ?? u.secondName,
            hasAvatar: data.hasAvatar !== undefined ? Boolean(data.hasAvatar) : u.hasAvatar,
            isActive: data.isActive !== undefined ? data.isActive : u.isActive,
          } : u));
          return;
        }
      }

      setUsers((prev) => prev.map((u) => u.id === editUser.id ? {
        ...u,
        firstName: data.firstName ?? u.firstName, lastName: data.lastName ?? u.lastName,
        secondName: data.secondName ?? u.secondName,
        hasAvatar: data.hasAvatar !== undefined ? Boolean(data.hasAvatar) : u.hasAvatar,
        isActive: data.isActive !== undefined ? data.isActive : u.isActive,
      } : u));
      closeEditModal();
    } catch {
      setEditModalError(t("users.networkError"));
    } finally {
      setEditModalSaving(false);
    }
  };

  const handleChangeRole = async (user: User, newRole: string) => {
    if (!isSuperAdmin(currentUser)) return;
    if (user.id === currentUser?.id) return;
    setChangingRoleId(user.id);
    try {
      const res = await apiFetch(`users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleCode: newRole }),
      });
      if (!res.ok) { alert((await res.text()) || t("users.roleChangeFailed")); return; }
      const data = await res.json() as { roles?: string[] };
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, roles: data.roles ?? [newRole] } : u));
    } catch { alert(t("users.networkError")); }
    finally { setChangingRoleId(null); }
  };

  const handleToggleUserActive = async (user: User, nextActive: boolean) => {
    if (!isSuperAdmin(currentUser)) return;
    if (!nextActive && currentUser?.id !== undefined && user.id === currentUser.id) {
      alert(t("users.cantDeactivateSelfAlert")); return;
    }
    if (!nextActive && (user.roles ?? []).includes("SUPER_ADMIN")) {
      alert(t("users.cantDeactivateSuperAdminAlert")); return;
    }
    setTogglingActiveId(user.id);
    try {
      const res = await apiFetch(`users/${user.id}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      });
      if (!res.ok) { const msg = await res.text(); alert(msg || t("users.statusChangeFailed")); return; }
      const data = (await res.json()) as { isActive?: boolean; hasAvatar?: boolean; };
      setUsers((prev) => prev.map((u) => u.id === user.id ? {
        ...u, isActive: Boolean(data.isActive),
        hasAvatar: data.hasAvatar !== undefined ? data.hasAvatar : u.hasAvatar,
      } : u));
    } catch {
      alert(t("users.networkError"));
    } finally {
      setTogglingActiveId(null);
    }
  };

  const COLUMNS: { key: SortKey; label: string }[] = [
    { key: "name", label: t("users.userCol") },
    { key: "role", label: t("users.roleCol") },
    { key: "status", label: t("users.statusCol") },
    { key: "registrationDate", label: t("users.regDateCol") },
    { key: "lastLoginDate", label: t("users.lastLoginCol") },
  ];

  return (
    <div className="px-6 py-8">
      <div>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-h1 text-gray-900 dark:text-white mb-2 tracking-tight">
              {t("users.listTitle")}
            </h1>
            <p className="text-muted">{t("users.subtitle")}</p>
          </div>
          {isAdminOrSuperAdmin(currentUser) && (
            <Link href="/users/register"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors">
              {t("users.addUser")}
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-xl border border-slate-200/80 bg-white/75 p-4 shadow-soft backdrop-blur dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <input type="text" placeholder={t("users.searchPlaceholder")} value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-gray-700 rounded bg-slate-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {([null, true, false] as const).map((val) => (
                <button key={String(val)} onClick={() => handleFilterChange(val)}
                  className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                    filterActive === val
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-700"
                  }`}>
                  {val === null ? t("users.allStatus") : val ? t("users.activeStatus") : t("users.inactiveStatus")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">{t("users.loading")}</div>}
        {error && !loading && <div className="mt-6 text-sm text-red-600 dark:text-red-400">{error}</div>}

        {!loading && !error && (
          <div className="glass-card overflow-hidden rounded-xl border border-slate-200/70 dark:border-slate-700/70">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 dark:bg-gray-800 border-b border-slate-300 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">№</th>
                    {COLUMNS.map((col) => (
                      <th key={col.key} onClick={() => handleSort(col.key)}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900 dark:hover:text-white transition-colors">
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key ? (
                            <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                d={sortDir === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                            </svg>
                          ) : (
                            <svg className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                          )}
                        </span>
                      </th>
                    ))}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-slate-100 dark:bg-slate-900 divide-y divide-slate-300 dark:divide-gray-800">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                        {t("users.notFound")}
                      </td>
                    </tr>
                  ) : paginatedUsers.map((user, index) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    const fullName = [user.lastName, user.firstName, user.secondName].filter(Boolean).join(" ");
                    const initials = ((user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")).toUpperCase() || user.email[0].toUpperCase();

                    return (
                      <tr key={user.id} className="hover:bg-slate-200 dark:hover:bg-gray-800 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">{rowNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <AvatarCell userId={user.id} initials={initials} hasAvatar={user.hasAvatar ?? false} />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{fullName || "—"}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isSuperAdmin(currentUser) && user.id !== currentUser?.id ? (
                            <select
                              value={(user.roles ?? []).includes("SUPER_ADMIN") ? "SUPER_ADMIN" : (user.roles ?? []).includes("ADMIN") ? "ADMIN" : "USER"}
                              onChange={(e) => void handleChangeRole(user, e.target.value)}
                              disabled={changingRoleId === user.id}
                              className={`text-xs font-medium rounded-full px-2.5 py-0.5 border focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-wait cursor-pointer ${
                                (user.roles ?? []).includes("SUPER_ADMIN")
                                  ? "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800"
                                  : (user.roles ?? []).includes("ADMIN")
                                    ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                                    : "bg-slate-200 text-gray-800 border-slate-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600"}`}>
                              <option value="USER">{t("users.userRole")}</option>
                              <option value="ADMIN">{t("users.adminRole")}</option>
                              <option value="SUPER_ADMIN">{t("users.superAdminRole")}</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              (user.roles ?? []).includes("SUPER_ADMIN")
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                                : (user.roles ?? []).includes("ADMIN")
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-slate-200 text-gray-800 dark:bg-gray-700 dark:text-gray-400"}`}>
                              {(user.roles ?? []).includes("SUPER_ADMIN") ? t("users.superAdminRole")
                                : (user.roles ?? []).includes("ADMIN") ? t("users.adminRole")
                                : t("users.userRole")}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                            <span className={`inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.isActive
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-slate-200 text-gray-800 dark:bg-gray-700 dark:text-gray-400"}`}>
                              {user.isActive ? t("users.active") : t("users.inactive")}
                            </span>
                            {isSuperAdmin(currentUser) && (
                              <button type="button" role="switch" aria-checked={user.isActive}
                                aria-label={user.isActive ? t("users.deactivateTooltip") : t("users.activateTooltip")}
                                title={
                                  user.isActive && ((user.roles ?? []).includes("SUPER_ADMIN") || (currentUser?.id !== undefined && user.id === currentUser.id))
                                    ? (user.roles ?? []).includes("SUPER_ADMIN")
                                      ? t("users.cantDeactivateSuperAdmin")
                                      : t("users.cantDeactivateSelf")
                                    : undefined}
                                disabled={togglingActiveId === user.id || (user.isActive && ((user.roles ?? []).includes("SUPER_ADMIN") || (currentUser?.id !== undefined && user.id === currentUser.id)))}
                                onClick={() => void handleToggleUserActive(user, !user.isActive)}
                                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 disabled:opacity-50 ${
                                  user.isActive ? "bg-green-600" : "bg-gray-300 dark:bg-gray-600"}`}>
                                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${user.isActive ? "translate-x-6" : "translate-x-1"}`} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(user.registrationDate)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(user.lastLoginDate)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {isAdminOrSuperAdmin(currentUser) && (
                            <div className="flex items-center justify-end gap-2">
                              <button type="button" onClick={() => openEditModal(user)}
                                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                title={t("common.edit")}>
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {isSuperAdmin(currentUser) && (
                                <button type="button" disabled={!canSuperAdminDeleteUser(user)}
                                  onClick={() => canSuperAdminDeleteUser(user) && openDeleteModal(user)}
                                  className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                                  title={!canSuperAdminDeleteUser(user)
                                    ? user.id === currentUser?.id ? t("users.cantDeleteSelf")
                                      : userHasSuperAdminRole(user) ? t("users.cantDeleteSuperAdmin")
                                      : t("users.deleteUnavailable")
                                    : t("users.deleteUserAction")}>
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage}
            totalItems={filteredAndSortedUsers.length} itemsPerPage={itemsPerPage} />
        )}

        {/* Edit modal */}
        {editUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !editModalSaving && closeEditModal()}
            role="dialog" aria-modal="true" aria-labelledby="edit-user-modal-title">
            <form onSubmit={handleSaveEdit} onClick={(e) => e.stopPropagation()}
              className="relative max-h-90vh w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl">
              <h2 id="edit-user-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {t("users.editUser")}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 break-all">{editUser.email}</p>
              {editModalError && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{editModalError}</p>}
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("users.lastName")}</label>
                  <input id="edit-lastName" type="text" value={editForm.lastName}
                    onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                    disabled={editModalSaving}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500 disabled:opacity-50" />
                </div>
                <div>
                  <label htmlFor="edit-firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("users.firstName")}</label>
                  <input id="edit-firstName" type="text" value={editForm.firstName}
                    onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                    disabled={editModalSaving}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500 disabled:opacity-50" />
                </div>
                <div>
                  <label htmlFor="edit-secondName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("users.secondName")}</label>
                  <input id="edit-secondName" type="text" value={editForm.secondName}
                    onChange={(e) => setEditForm((f) => ({ ...f, secondName: e.target.value }))}
                    disabled={editModalSaving}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500 disabled:opacity-50" />
                </div>
                {isSuperAdmin(currentUser) && (
                  <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{t("users.changePwd")}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t("profile.leaveEmpty")}</p>
                    <PasswordFieldWithToggle id="editNewPassword" name="editNewPassword"
                      label={t("users.newPassword")} value={editForm.newPassword}
                      onChange={(e) => setEditForm((f) => ({ ...f, newPassword: e.target.value }))}
                      autoComplete="new-password" disabled={editModalSaving} />
                    <PasswordFieldWithToggle id="editConfirmPassword" name="editConfirmPassword"
                      label={t("users.confirmationLabel")} value={editForm.confirmPassword}
                      onChange={(e) => setEditForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                      autoComplete="new-password" disabled={editModalSaving} />
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" disabled={editModalSaving} onClick={closeEditModal}
                  className="px-4 py-2 text-sm font-medium rounded border border-slate-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
                  {t("common.cancel")}
                </button>
                <button type="submit" disabled={editModalSaving}
                  className="px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                  {editModalSaving ? t("common.saving") : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delete modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !deleteModalSaving && closeDeleteModal()}
            role="dialog" aria-modal="true" aria-labelledby="delete-user-modal-title">
            <form onSubmit={handleConfirmDelete} onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl">
              <h2 id="delete-user-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {t("users.deleteUser")}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 break-all">{deleteTarget.email}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{t("users.deleteConfirmText")}</p>
              {deleteModalError && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{deleteModalError}</p>}
              <PasswordFieldWithToggle id="deleteSuperAdminPassword" name="deleteSuperAdminPassword"
                label={t("users.yourPassword")} value={deleteConfirmPassword}
                onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                autoComplete="current-password" disabled={deleteModalSaving} />
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" disabled={deleteModalSaving} onClick={closeDeleteModal}
                  className="px-4 py-2 text-sm font-medium rounded border border-slate-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
                  {t("common.cancel")}
                </button>
                <button type="submit" disabled={deleteModalSaving}
                  className="px-4 py-2 text-sm font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                  {deleteModalSaving ? t("common.deleting") : t("common.delete")}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
