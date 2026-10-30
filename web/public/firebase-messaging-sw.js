// Service Worker Firebase Cloud Messaging pour les notifications en arriere-plan.
//
// Ce fichier est servi depuis /firebase-messaging-sw.js (portee racine).
// Seul CE service worker est autorise : main.jsx n'intercepte pas son
// enregistrement. Tout autre Service Worker reste bloque comme auparavant.
//
// La configuration Firebase est recuperee depuis les variables d'environnement
// compilees par Vite. Pour les builds, assurer que VITE_FIREBASE_* sont bien
// renseignees dans l'environnement de build (Placeholders actuels = non
// fonctionnels, mais le SW se charge sans erreur).

importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

// Ces valeurs sont injectees au moment du build si disponibles, sinon on
// conserve des placeholders (le messaging ne s'initialisera que si configure).
const firebaseConfig = {
  apiKey: self.FIREBASE_API_KEY || 'TA_FIREBASE_API_KEY',
  authDomain: self.FIREBASE_AUTH_DOMAIN || 'TON_PROJET.firebaseapp.com',
  projectId: self.FIREBASE_PROJECT_ID || 'TON_PROJECT_ID',
  storageBucket: self.FIREBASE_STORAGE_BUCKET || 'TON_STORAGE_BUCKET',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || 'TON_SENDER_ID',
  appId: self.FIREBASE_APP_ID || 'TON_APP_ID',
};

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'TA_FIREBASE_API_KEY') {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const title = payload?.notification?.title || payload?.data?.title || 'SalonAfrique.net';
      const options = {
        body: payload?.notification?.body || payload?.data?.body || '',
        icon: payload?.notification?.icon || '/favicon.ico',
        badge: payload?.notification?.badge,
        tag: payload?.data?.tag || 'salonafrique-push',
        data: payload?.data || {},
      };
      self.registration.showNotification(title, options);
    });
  }
} catch (error) {
  // Echec d'initialisation silencieux : aucun push en arriere-plan, mais
  // l'application frontale reste fonctionnelle.
  console.debug('[firebase-messaging-sw] init skipped:', error?.message);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
        return null;
      })
  );
});
