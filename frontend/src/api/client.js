const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1").replace(/\/+$/, "");
const ACCESS_KEY = "mobila.access";
const REFRESH_KEY = "mobila.refresh";
let refreshRequest = null;

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getTokens() {
  return {
    access: sessionStorage.getItem(ACCESS_KEY),
    refresh: sessionStorage.getItem(REFRESH_KEY),
  };
}

export function saveTokens(tokens) {
  if (tokens.access) sessionStorage.setItem(ACCESS_KEY, tokens.access);
  if (tokens.refresh) sessionStorage.setItem(REFRESH_KEY, tokens.refresh);
}

export function clearTokens() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
}

function messageFromData(data) {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    if (typeof data.detail === "string") return data.detail;
    const first = Object.values(data).flat(Infinity).find((value) => typeof value === "string");
    if (first) return first;
  }
  return "Une erreur est survenue. Réessayez.";
}

async function renewAccessToken() {
  if (!refreshRequest) {
    const { refresh } = getTokens();
    if (!refresh) {
      clearTokens();
      return null;
    }
    refreshRequest = fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.access) throw new ApiError(messageFromData(data), response.status, data);
      saveTokens(data);
      return data.access;
    }).catch(() => {
      clearTokens();
      return null;
    }).finally(() => {
      refreshRequest = null;
    });
  }
  return refreshRequest;
}

async function request(path, options = {}, canRenew = true) {
  const headers = new Headers(options.headers || {});
  const { access } = getTokens();
  if (access) headers.set("Authorization", `Bearer ${access}`);
  if (!(options.body instanceof FormData) && options.body !== undefined) headers.set("Content-Type", "application/json");
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (error) {
    throw new ApiError("Le serveur est injoignable. Vérifiez que le backend Django fonctionne.", 0, error);
  }
  if (response.status === 401 && canRenew && getTokens().refresh && !path.includes("/auth/token/")) {
    const renewed = await renewAccessToken();
    if (renewed) return request(path, options, false);
    clearTokens();
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(messageFromData(data), response.status, data);
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: "DELETE" }),
};

export function apiErrorMessage(error) {
  return error?.message || "Une erreur inattendue est survenue.";
}

export function formatPrice(price) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(price));
}

export function formatDate(date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}
