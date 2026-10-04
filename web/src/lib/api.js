// Client HTTP de l'API Node (MariaDB + Better Auth).
//
// En developpement Vite proxifie `/api` vers le port 4000, donc BASE est vide.
// En production (front Netlify + API Hostinger), renseigner VITE_API_URL avec
// l'URL publique de l'API.

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

/** Appel JSON vers l'API, avec transmission du cookie de session. */
export async function apiFetch(path, { method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    // Indispensable : la session Better Auth vit dans un cookie HttpOnly.
    credentials: 'include',
    headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return null;

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.message ?? data?.error ?? `Erreur ${response.status}`);
    error.status = response.status;
    error.code = data?.error ?? null;
    throw error;
  }
  return data;
}

// --- Better Auth ----------------------------------------------------------
// Les routes sont celles exposees par server/index.js sur /api/auth/*.

export const authApi = {
  /** Session courante, ou null si non connecte. */
  getSession: () => apiFetch('/api/auth/get-session'),

  signIn: (email, password) =>
    apiFetch('/api/auth/sign-in/email', { method: 'POST', body: { email, password } }),

  signUp: ({ email, password, name, phone }) =>
    apiFetch('/api/auth/sign-up/email', { method: 'POST', body: { email, password, name, phone } }),

  signOut: () => apiFetch('/api/auth/sign-out', { method: 'POST' }),

  changePassword: (currentPassword, newPassword) =>
    apiFetch('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword, revokeOtherSessions: true },
    }),

  requestPasswordReset: (email, redirectTo) =>
    apiFetch('/api/auth/request-password-reset', { method: 'POST', body: { email, redirectTo } }),

  resetPassword: (token, newPassword) =>
    apiFetch(`/api/auth/reset-password/${encodeURIComponent(token)}`, {
      method: 'POST',
      body: { newPassword },
    }),
};

/** Profil + etablissement de l'utilisateur connecte. */
export const fetchMe = () => apiFetch('/api/me');

/**
 * Convertit la reponse de /api/me en objet compatible avec l'ancien
 * `currentUser` Supabase : { id, email, profile: { ...snake_case } }.
 */
export function toCurrentUser(me) {
  if (!me) return null;
  return {
    id: me.id,
    email: me.email,
    profile: me.profile ?? null,
  };
}