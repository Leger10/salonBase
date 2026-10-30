// Worker du systeme de notifications push.
//
// Execute par le cron (route securisee) ou par un process permanent
// (server/push/run-worker.js). Il fait trois choses, dans l'ordre :
//   1. recuperer les rappels bloques en "processing" (worker interrompu) ;
//   2. envoyer les rappels echus (24 h / 1 h) ;
//   3. vider l'outbox (confirmation, modification, annulation, tour d'attente).
//
// Un verrou en base (push_jobs) empeche deux executions concurrentes. Un echec
// d'envoi NE marque JAMAIS le message comme envoye : il reste en file pour une
// nouvelle tentative (jusqu'a MAX_ATTEMPTS).

import { randomUUID } from 'node:crypto';
import { prisma } from '../prisma.js';
import { isConfigured, sendToTokens } from './firebase.js';
import {
  MAX_ATTEMPTS,
  acquireWorkerLock,
  claimDueReminders,
  claimOutboxBatch,
  deferOutbox,
  deferReminder,
  markOutboxFailed,
  markOutboxSent,
  markReminderFailed,
  markReminderSent,
  purgeInvalidTokens,
  recoverStuckOutbox,
  recoverStuckReminders,
  releaseWorkerLock,
} from './store.js';
import { evaluateTicketQueue } from './events.js';

const WORKER_NAME = 'push_worker';
const STUCK_AFTER_MS = 10 * 60 * 1000; // un rappel "processing" plus vieux que ca a echoue

/** Destinataires d'une ligne d'outbox (targetUserId, sinon tout le personnel). */
async function resolveAudience(row) {
  if (row.targetUserId) return [row.targetUserId];
  if (row.tenantId) {
    const staff = await prisma.profile.findMany({
      where: { tenantId: row.tenantId, role: { in: ['admin', 'employee'] }, isActive: true },
      select: { id: true },
    });
    return staff.map((p) => p.id);
  }
  return [];
}

/**
 * Traite un lot de messages (rappels + outbox). Renvoie un compte-rendu.
 * `options.send` est injectable pour les tests (mock Firebase).
 */
export async function processBatch(options = {}) {
  const send = options.send ?? sendToTokens;
  const now = options.now ?? new Date();
  const limit = options.limit ?? 50;

  const summary = {
    recovered: 0,
    reminders: { processed: 0, sent: 0, failed: 0, skipped: 0 },
    outbox: { processed: 0, sent: 0, failed: 0, skipped: 0 },
    invalidTokensRemoved: 0,
  };

  if (!(options.force ?? false) && !isConfigured() && !options.send) {
    // Sans configuration Firebase, inutile d'aspirer les files : elles doivent
    // rester intactes pour un envoi ulterieur. On remonte l'info a l'appelant.
    return { ...summary, configured: false };
  }

  // 1. Recuperation des rappels et messages bloques.
  const staleBefore = new Date(now.getTime() - STUCK_AFTER_MS);
  summary.recovered = await recoverStuckReminders(staleBefore);
  summary.recovered += await recoverStuckOutbox(staleBefore);

  const invalid = [];

  // 2. Rappels echus.
  const reminders = await claimDueReminders(now, limit);
  for (const reminder of reminders) {
    summary.reminders.processed += 1;
    const tokens = await tokensForUsers([reminder.userId]);
    if (!tokens.length) {
      // Aucun appareil : on ne considere pas le rappel comme envoye, mais on
      // l'arrete (sinon il boucle). Statut "sent" avec sent_at pour tracage.
      await markReminderSent(reminder.id);
      summary.reminders.skipped += 1;
      continue;
    }
    const result = await send(tokens, {
      title: reminder.title,
      body: reminder.body,
      url: reminder.url,
      data: { type: reminder.kind, appointmentId: reminder.appointmentId },
      tag: `reminder-${reminder.appointmentId}-${reminder.kind}`,
    });
    if (result.invalid?.length) invalid.push(...result.invalid);
    if (result.skipped) {
      // Envoi impossible pour l'instant (ex. Firebase non configure) : on remet
      // en file sans consommer de tentative, le message n'est pas perdu.
      await deferReminder(reminder.id, result.skipped);
      summary.reminders.skipped += 1;
    } else if (result.ok && result.sent > 0) {
      await markReminderSent(reminder.id);
      summary.reminders.sent += 1;
    } else if (result.ok) {
      await markReminderSent(reminder.id);
      summary.reminders.skipped += 1;
    } else {
      await markReminderFailed(reminder.id, result.error ?? 'SEND_FAILED', { retry: true });
      summary.reminders.failed += 1;
    }
  }

  // 3. Outbox.
  const outbox = await claimOutboxBatch(limit);
  for (const row of outbox) {
    summary.outbox.processed += 1;
    const audience = await resolveAudience(row);
    const tokens = await tokensForUsers(audience);
    if (!tokens.length) {
      await markOutboxSent(row.id);
      summary.outbox.skipped += 1;
      continue;
    }
    const result = await send(tokens, {
      title: row.title,
      body: row.body,
      url: row.url,
      data: { ...(row.data ?? {}), type: row.type },
      tag: row.eventKey ?? undefined,
    });
    if (result.invalid?.length) invalid.push(...result.invalid);
    if (result.skipped) {
      await deferOutbox(row.id, result.skipped);
      summary.outbox.skipped += 1;
    } else if (result.ok && result.sent > 0) {
      await markOutboxSent(row.id);
      summary.outbox.sent += 1;
    } else if (result.ok) {
      await markOutboxSent(row.id);
      summary.outbox.skipped += 1;
    } else {
      await markOutboxFailed(row.id, result.error ?? 'SEND_FAILED', { retry: true });
      summary.outbox.failed += 1;
    }
  }

  if (invalid.length) {
    summary.invalidTokensRemoved = await purgeInvalidTokens(invalid);
  }

  summary.configured = true;
  return summary;
}

async function tokensForUsers(userIds) {
  const ids = [...new Set((userIds ?? []).filter(Boolean))];
  if (!ids.length) return [];
  const devices = await prisma.pushDevice.findMany({
    where: { userId: { in: ids } },
    select: { token: true },
  });
  return [...new Set(devices.map((d) => d.token))];
}

/**
 * Point d'entree : prend le verrou, traite un lot, libere le verrou.
 * Sans verrou disponible, renvoie { skipped: 'LOCKED' } (un autre worker
 * traite deja la file).
 */
export async function runWorker(options = {}) {
  const runnerId = options.runnerId ?? `${WORKER_NAME}:${process.pid}:${randomUUID()}`;
  const lock = await acquireWorkerLock({ runnerId, lockMs: (options.lockMs ?? 5 * 60 * 1000) });
  if (!lock) return { skipped: 'LOCKED' };

  try {
    const summary = await processBatch(options);
    // Une file d'attente peut avoir un nouveau "prochain" apres traitement.
    if (options.evaluateQueues) {
      for (const tenantId of options.evaluateQueues) {
        try {
          await evaluateTicketQueue(tenantId);
        } catch (error) {
          console.error('[push] reevaluation file echouee :', error?.message ?? error);
        }
      }
    }
    await releaseWorkerLock({ runnerId, result: JSON.stringify(summary) });
    return summary;
  } catch (error) {
    await releaseWorkerLock({ runnerId, result: `ERREUR:${error?.message ?? error}` });
    throw error;
  } finally {
    // Le worker autonome ferme sa connexion ; la route cron, non (process partage).
    if (options.disconnect) await prisma.$disconnect();
  }
}

export { MAX_ATTEMPTS, WORKER_NAME };
