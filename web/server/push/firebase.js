// Firebase Cloud Messaging cote serveur (Admin SDK).
//
// Le compte de service reste STRICTEMENT cote serveur : il provient d'une
// variable d'environnement (FIREBASE_SERVICE_ACCOUNT), jamais du depot ni d'une
// variable VITE_* (qui serait compilee dans le bundle client).
//
// Si la configuration est absente, le module reste inactif : `isConfigured()`
// renvoie false, `sendToTokens()` renvoie un resultat "skipped" sans lever
// d'erreur. Le worker conserve alors les messages en file (aucune notification
// n'est consideree comme envoyee, regle 8).

let appModule = null; // import('firebase-admin/app') memoise
let messagingModule = null; // import('firebase-admin/messaging') memoise
let initialized = false;
let initError = null;

/** Parse FIREBASE_SERVICE_ACCOUNT : soit du JSON brut, soit un base64 de JSON. */
function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw || !raw.trim()) return null;

  const value = raw.trim();
  let json = value;
  if (!value.startsWith('{')) {
    try {
      json = Buffer.from(value, 'base64').toString('utf8');
    } catch {
      return null;
    }
  }
  try {
    const parsed = JSON.parse(json);
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Indique si le push serveur est exploitable. N'initialise PAS Firebase
 * (l'import du SDK est differe au premier envoi reel).
 */
export function isConfigured() {
  if (initError) return false;
  if (initialized) return true;
  return Boolean(parseServiceAccount() || process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

/** Initialise l'Admin SDK une seule fois. Renvoie true si pret. */
async function ensureInitialized() {
  if (initialized) return true;
  if (initError) return false;

  const credential = parseServiceAccount();
  if (!credential && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return false;
  }

  try {
    appModule = await import('firebase-admin/app');
    messagingModule = await import('firebase-admin/messaging');

    const { initializeApp, getApps, cert, applicationDefault } = appModule;
    if (getApps().length === 0) {
      initializeApp({
        credential: credential ? cert(credential) : applicationDefault(),
      });
    }
    initialized = true;
    return true;
  } catch (error) {
    // On memorise l'erreur pour ne pas retenter a chaque message, mais on ne
    // divulgue jamais le secret dans le journal.
    initError = error;
    console.error('[push] initialisation Firebase impossible :', error?.message ?? error);
    return false;
  }
}

/**
 * Envoie un message a une liste de jetons FCM.
 *
 * Reponse : { ok: boolean, skipped?: boolean, sent: number, invalid: string[],
 *             failed: number, error?: string }
 * - `invalid` : jetons a supprimer de la base (registration-token-not-registered,
 *   invalid-argument, invalid-registration-token).
 * - Les autres echecs sont temporaires : le message reste en file (retry).
 */
export async function sendToTokens(tokens, payload) {
  const list = [...new Set((tokens ?? []).filter(Boolean))];
  if (!list.length) return { ok: true, sent: 0, invalid: [], failed: 0 };

  if (!(await ensureInitialized())) {
    return { ok: false, skipped: true, sent: 0, invalid: [], failed: 0, error: 'NOT_CONFIGURED' };
  }

  const message = {
    tokens: list,
    notification: { title: payload.title, body: payload.body },
    data: toDataPayload(payload.data),
    webpush: {
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon ?? '/favicon.ico',
        badge: payload.badge,
        tag: payload.tag,
      },
      fcmOptions: { link: payload.url ?? '/' },
    },
  };

  try {
    const response = await messagingModule.getMessaging().sendEachForMulticast(message);
    const invalid = [];
    response.responses.forEach((result, index) => {
      if (result.success) return;
      const code = result.error?.code ?? '';
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/invalid-argument'
      ) {
        invalid.push(list[index]);
      }
    });
    const failed = response.responses.filter((r) => !r.success).length;
    return { ok: true, sent: response.successCount, invalid, failed };
  } catch (error) {
    return { ok: false, sent: 0, invalid: [], failed: list.length, error: error?.message ?? 'SEND_FAILED' };
  }
}

/** FCM n'accepte que des valeurs string dans `data`. */
function toDataPayload(data) {
  if (!data || typeof data !== 'object') return undefined;
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    out[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return out;
}

/** Remet a zero l'etat memoise (tests uniquement). */
export function __resetForTests() {
  initialized = false;
  initError = null;
  appModule = null;
  messagingModule = null;
}
