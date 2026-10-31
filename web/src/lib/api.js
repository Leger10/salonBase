// Client HTTP de l'API Node (MariaDB + Better Auth).
//
// En developpement Vite proxifie `/api` vers le port 4000, donc BASE est vide.
// En production, laisser VITE_API_URL vide quand le front et l'API partagent le
// meme domaine (cas de salonafrique.net) : les appels restent relatifs.

// `?.` car ce module est aussi importe par les scripts de test Node, ou
// `import.meta.env` n'existe pas.
const env = import.meta.env;
const hostname = typeof window === 'undefined' ? '' : window.location.hostname;
const isPrivateIpv4 = (() => {
  const octets = hostname.split('.').map(Number);
  if (
    octets.length !== 4
    || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return false;
  }
  return octets[0] === 10
    || (octets[0] === 192 && octets[1] === 168)
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 169 && octets[1] === 254);
})();
const isLocalHost = hostname === 'localhost'
  || hostname === '127.0.0.1'
  || hostname === '::1'
  || hostname === '[::1]'
  || hostname.endsWith('.localhost')
  || isPrivateIpv4;

// Une ancienne configuration peut pointer vers `api.<domaine>` alors que le
// domaine principal sert deja l'API (Hostinger) : ce sous-domaine n'existe pas
// forcement et le navigateur echoue en ERR_NAME_NOT_RESOLVED. Dans ce cas on
// reste sur l'origine courante.
function pointsToSameDomainApi(configuredUrl) {
  if (!configuredUrl || !hostname) return false;
  try {
    const apiHost = new URL(configuredUrl).hostname.replace(/^www\./, '').toLowerCase();
    const pageHost = hostname.replace(/^www\./, '').toLowerCase();
    return apiHost === `api.${pageHost}`;
  } catch {
    return false;
  }
}

const configuredApiUrl = String(env?.VITE_API_URL ?? '').trim();
const BASE = (env?.DEV || isLocalHost || pointsToSameDomainApi(configuredApiUrl)
  ? ''
  : configuredApiUrl).replace(/\/$/, '');
const ACTIVE_TENANT_STORAGE_KEY = 'salonstore.activeTenantId';

export function getActiveTenantId() {
  try {
    return window.localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setActiveTenantId(tenantId) {
  try {
    if (tenantId) window.localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, tenantId);
    else window.localStorage.removeItem(ACTIVE_TENANT_STORAGE_KEY);
  } catch (error) {
    console.error('Impossible de mémoriser le salon actif:', error);
    throw error;
  }
}

function apiHeaders(headers = {}) {
  const result = { ...headers };
  const tenantId = getActiveTenantId();
  if (tenantId) result['X-Tenant-Id'] = tenantId;
  return result;
}

/** Appel JSON vers l'API, avec transmission du cookie de session. */
export async function apiFetch(path, { method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    // Indispensable : la session Better Auth vit dans un cookie HttpOnly.
    credentials: 'include',
    headers: apiHeaders(
      body === undefined ? headers : { 'Content-Type': 'application/json', ...headers }
    ),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return null;

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const error = new Error(
        `L'API a renvoyé une réponse non JSON pour ${path} (HTTP ${response.status}).`
      );
      error.status = response.status;
      error.code = 'INVALID_API_RESPONSE';
      throw error;
    }
  }

  if (!response.ok) {
    const error = new Error(data?.message ?? data?.error ?? `Erreur ${response.status}`);
    error.status = response.status;
    error.code = data?.error ?? null;
    throw error;
  }
  return data;
}

/**
 * Corps brut (fichier binaire) vers l'API : `/api/storage/upload` attend
 * l'octet-meme du fichier (pas de JSON, pas de multipart).
 */
export async function apiUpload(path, body, { method = 'POST', contentType } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: apiHeaders({ 'Content-Type': contentType || 'application/octet-stream' }),
    body,
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Reponse non-JSON (page d'erreur du proxy d'hebergement, 413 HTML...)
    data = null;
  }

  if (!response.ok) {
    const error = new Error(
      data?.message ?? data?.error ?? `Echec de l'envoi du fichier (${response.status})`
    );
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