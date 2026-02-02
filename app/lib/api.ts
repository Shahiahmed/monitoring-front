/**
 * Базовый URL для запросов к backend.
 * В production задаётся через NEXT_PUBLIC_API_BASE_URL (например /api при прокси через nginx).
 * Локально можно задать http://localhost:8081 в .env.local.
 */
export const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api")
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081");

/** path — путь после /api, например "settings/certificates". */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path.slice(1) : path;
  const base = API_BASE.replace(/\/$/, "");
  if (base.startsWith("http")) {
    return `${base}/api/${p}`;
  }
  return `${base}/${p}`;
}
