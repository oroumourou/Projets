const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

async function request(path, { token, headers = {}, ...options } = {}) {
  const requestHeaders = new Headers(headers);
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers: requestHeaders });
  } catch {
    throw new Error('Impossible de joindre le serveur. Vérifiez que le backend est démarré.');
  }

  if (response.status === 401 && token) {
    window.dispatchEvent(new Event('campus:unauthorized'));
  }
  if (response.status === 204) return null;

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'Une erreur est survenue. Réessayez.');
    error.status = response.status;
    throw error;
  }
  return payload;
}

function buildQuery({ filters = {}, page = 1, limit = 12 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  for (const [field, value] of Object.entries(filters)) {
    if (value?.trim()) params.set(field, value.trim());
  }
  return `?${params}`;
}

export const api = {
  register: (body) => request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  login: (body) => request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body)
  }),
  me: (token) => request('/api/auth/me', { token }),
  exams: ({ filters, page }) => request(`/api/exams${buildQuery({ filters, page })}`),
  myExams: (token, { filters, page }) =>
    request(`/api/exams/mine${buildQuery({ filters, page })}`, { token }),
  exam: (id) => request(`/api/exams/${encodeURIComponent(id)}`),
  upload: (token, formData) =>
    request('/api/exams', { method: 'POST', token, body: formData }),
  deleteExam: (token, id) =>
    request(`/api/exams/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
  downloadUrl: (id) => `${API_URL}/api/exams/${encodeURIComponent(id)}/file`
};
