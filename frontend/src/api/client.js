const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

export const API_ORIGIN = new URL(API_BASE).origin;

export function assetUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value.startsWith("/") ? value : `/${value}`, API_ORIGIN).toString();
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function messageFrom(data, fallback) {
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string" && data) return data;
  const first = data && typeof data === "object"
    ? Object.values(data).flat(Infinity).find((value) => typeof value === "string")
    : null;
  return first || fallback;
}

async function refreshToken() {
  const refresh = localStorage.getItem("automoto.refresh");
  if (!refresh) return false;
  const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!response.ok) return false;
  const tokens = await response.json();
  localStorage.setItem("automoto.access", tokens.access);
  if (tokens.refresh) localStorage.setItem("automoto.refresh", tokens.refresh);
  return true;
}

export async function apiRequest(path, options = {}, retry = true) {
  const headers = new Headers(options.headers || {});
  const access = localStorage.getItem("automoto.access");
  if (access) headers.set("Authorization", `Bearer ${access}`);
  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(path.startsWith("http") ? path : `${API_BASE}${path}`, {
      ...options, headers, body,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError(`API inaccessible à ${API_BASE}. Vérifiez que Django est démarré.`, 0);
    }
    throw error;
  }

  if (response.status === 401 && retry && access && !path.includes("/auth/token/")) {
    const refreshed = await refreshToken().catch(() => false);
    if (refreshed) return apiRequest(path, options, false);
    localStorage.removeItem("automoto.access");
    localStorage.removeItem("automoto.refresh");
    window.dispatchEvent(new Event("automoto:logout"));
  }
  const type = response.headers.get("content-type") || "";
  const data = response.status === 204 ? null : type.includes("application/json")
    ? await response.json() : await response.text();
  if (!response.ok) throw new ApiError(messageFrom(data, `Erreur API (${response.status}).`), response.status, data);
  return data;
}

export function unwrapPage(data) {
  return Array.isArray(data) ? data : data?.results || [];
}
