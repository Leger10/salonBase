// Initialisation Firebase + enregistrement FCM cote client.
//
// Gere l'autorisation, l'obtention du token et son envoi au serveur.
// Fonctionne en mode degrade si Firebase n'est pas configure (placeholders).
// Le jeton n'est JAMAIS envoye avant consentement explicite (toggle).

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function isFirebaseWebConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== 'TA_FIREBASE_API_KEY' &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== 'TON_PROJECT_ID'
  );
}

let appInstance = null;
let messagingInstance = null;

export async function isPushSupported() {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (!('serviceWorker' in navigator)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

export async function initFirebaseMessaging() {
  if (!isFirebaseWebConfigured()) return null;
  const supported = await isPushSupported();
  if (!supported) return null;
  if (!appInstance) appInstance = initializeApp(firebaseConfig);
  if (!messagingInstance) messagingInstance = getMessaging(appInstance);
  return messagingInstance;
}

/**
 * Demande l'autorisation et obtient le token FCM.
 * Enregistre le jeton cote serveur (POST /api/push/devices).
 * `apiFetch` est injecte pour eviter une dependance circulaire.
 */
export async function enablePush({ apiFetch }) {
  const messaging = await initFirebaseMessaging();
  if (!messaging) {
    return { enabled: false, reason: 'UNSUPPORTED' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { enabled: false, reason: permission };
  }

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });

  let token = null;
  try {
    token = await getToken(messaging, {
      vapidKey: vapidKey && vapidKey !== 'TA_CLE_VAPID_PUBLIQUE' ? vapidKey : undefined,
      serviceWorkerRegistration: swReg,
    });
  } catch (error) {
    console.error('[push] obtention du token FCM impossible :', error?.message ?? error);
    return { enabled: false, reason: 'TOKEN_ERROR' };
  }

  if (!token) {
    return { enabled: false, reason: 'NO_TOKEN' };
  }

  try {
    await apiFetch('/api/push/devices', {
      method: 'POST',
      body: JSON.stringify({ token, platform: 'web' }),
    });
  } catch (error) {
    console.error('[push] enregistrement du jeton impossible :', error?.message ?? error);
  }

  return { enabled: true, token };
}

/** Supprime le jeton cote serveur (et laisse le navigateur gerer le reste). */
export async function disablePush({ apiFetch, token = null }) {
  try {
    await apiFetch('/api/push/devices', {
      method: 'DELETE',
      body: JSON.stringify(token ? { token } : {}),
    });
  } catch (error) {
    console.error('[push] suppression du jeton impossible :', error?.message ?? error);
  }
  return { disabled: true };
}
