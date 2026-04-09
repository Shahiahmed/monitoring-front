/**
 * Базовый URL для запросов к backend.
 *
 * - Прод (один JAR, без nginx): переменная не задаётся → используется "/api" (относительный путь).
 *   Сайт и API на одном хосте/порту, запросы уходят на тот же origin.
 * - Прод с nginx: по умолчанию "/api", nginx проксирует /api/... на backend.
 * - Локально: в .env.local задайте NEXT_PUBLIC_API_BASE_URL=http://localhost:8081
 *   (или http://localhost:8081/api).
 */
const rawBase =
  typeof process.env.NEXT_PUBLIC_API_BASE_URL === "string" &&
  process.env.NEXT_PUBLIC_API_BASE_URL.length > 0
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : "/api";

// Если указан только origin (http://localhost:8081 без пути), добавляем /api
export const API_BASE =
  rawBase.startsWith("http") && !rawBase.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "")
    ? rawBase.replace(/\/$/, "") + "/api"
    : rawBase.replace(/\/$/, "");

/**
 * path — путь после /api, например "settings/certificates"
 * или "servers/metrics?refresh=true".
 */
export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  const q = normalized.indexOf("?");
  const pathname = q >= 0 ? normalized.slice(0, q) : normalized;
  const search = q >= 0 ? normalized.slice(q) : "";
  const base = `${API_BASE}/${pathname}`;
  return search ? `${base}${search}` : base;
}

export type ApiFetchInit = RequestInit & { skipAuth?: boolean };

/**
 * Запрос к API с заголовком Authorization: Bearer и JWT из localStorage.
 * Для входа используйте skipAuth: true (эндпоинт /auth/login).
 * При 401, если токен был отправлен, очищает localStorage и перенаправляет на /login.
 */
export function apiFetch(path: string, init: ApiFetchInit = {}): Promise<Response> {
  const { skipAuth, ...rest } = init;
  const url = apiUrl(path);
  const headers = new Headers(rest.headers ?? undefined);

  let hadToken = false;
  if (typeof window !== "undefined" && !skipAuth) {
    const token = localStorage.getItem("authToken");
    if (token) {
      hadToken = true;
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (rest.body instanceof FormData) {
    headers.delete("Content-Type");
  }

  return fetch(url, { ...rest, headers }).then((res) => {
    if (
      res.status === 401 &&
      hadToken &&
      typeof window !== "undefined" &&
      !skipAuth
    ) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      window.location.href = "/login";
    }
    return res;
  });
}
