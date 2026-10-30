// Routes HTTP du systeme de notifications push.
//
//   GET    /api/push/config   : etat public (module configure ou non).
//   GET    /api/push/devices  : appareils du compte authentifie.
//   POST   /api/push/devices  : enregistre un jeton FCM (apres consentement).
//   DELETE /api/push/devices  : supprime un jeton (ou tous) du compte.
//   POST   /api/push/cron     : declenche le worker (cron Hostinger, secret).
//
// Securite : les routes de gestion d'appareil exigent une session valide et
// rattachent toujours l'appareil a l'utilisateur AUTHENTIFIE (jamais a un
// user_id fourni par le client). La route cron exige un secret dedie.

import { HttpError, requireAuth } from '../middleware/auth.js';
import {
  countDevicesForUser,
  listTokensForUser,
  registerDevice,
  removeDevice,
} from './store.js';
import { isConfigured } from './firebase.js';
import { runWorker } from './worker.js';

/** Comparaison a temps constant d'un secret (evite les fuites par timing). */
function safeEqual(a, b) {
  const sa = String(a ?? '');
  const sb = String(b ?? '');
  if (sa.length !== sb.length) return false;
  let diff = 0;
  for (let i = 0; i < sa.length; i += 1) diff |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  return diff === 0;
}

/** Etat public : le front s'en sert pour activer/desactiver le bouton. */
function handleConfig(_req, res) {
  res.json({
    enabled: isConfigured(),
    provider: 'fcm',
    platform: 'web',
    timezone: process.env.PUSH_TIMEZONE || 'Africa/Porto-Novo',
    reminders: { h24: true, h1: true },
  });
}

async function handleListDevices(req, res) {
  const ctx = await requireAuth(req);
  const [tokens, count] = await Promise.all([
    listTokensForUser(ctx.user.id),
    countDevicesForUser(ctx.user.id),
  ]);
  // On ne renvoie jamais le jeton complet (donnee sensible) : seulement un
  // apercu, suffisant pour l'affichage dans les parametres.
  res.json({
    count,
    devices: tokens.map((token) => ({
      preview: `${token.slice(0, 8)}…${token.slice(-6)}`,
      platform: 'web',
    })),
  });
}

async function handleRegisterDevice(req, res) {
  const ctx = await requireAuth(req);
  const token = req.body?.token;
  const platform = typeof req.body?.platform === 'string' ? req.body.platform : 'web';
  if (!token) throw new HttpError(400, 'INVALID_INPUT', 'Jeton FCM requis.');

  const device = await registerDevice({
    userId: ctx.user.id,
    token,
    platform,
    userAgent: req.headers['user-agent'] ?? null,
  });
  res.status(201).json({ success: true, id: device.id, preview: `${device.token.slice(0, 8)}…` });
}

async function handleDeleteDevice(req, res) {
  const ctx = await requireAuth(req);
  const token = req.body?.token ?? req.query?.token ?? null;
  const removed = await removeDevice({ userId: ctx.user.id, token });
  res.json({ success: true, removed });
}

/**
 * Route cron : traite les rappels et l'outbox. Protegee par un secret dedie
 * (PUSH_CRON_SECRET), jamais publique. Accepte le secret en en-tete
 * `x-cron-secret` ou en query `?secret=` (les deux sont journalises par
 * l'hebergeur, mais l'en-tete est privilegie).
 */
async function handleCron(req, res) {
  const expected = process.env.PUSH_CRON_SECRET;
  if (!expected) {
    throw new HttpError(503, 'CRON_DISABLED', 'PUSH_CRON_SECRET non configure.');
  }
  const provided = req.headers['x-cron-secret'] ?? req.query?.secret ?? null;
  if (!safeEqual(provided, expected)) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Secret cron invalide.');
  }

  const summary = await runWorker({ force: true });
  res.json({ ok: true, ...summary });
}

export function mountPush(app, wrap) {
  app.get('/api/push/config', handleConfig);
  app.get('/api/push/devices', wrap(handleListDevices));
  app.post('/api/push/devices', wrap(handleRegisterDevice));
  app.delete('/api/push/devices', wrap(handleDeleteDevice));
  app.post('/api/push/cron', wrap(handleCron));
}
