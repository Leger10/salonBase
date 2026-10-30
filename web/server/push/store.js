// Acces base pour le systeme de notifications push.
//
// Toutes les ecritures passent par Prisma (modele relationnel du schema), jamais
// par du SQL brut, afin de rester aligne sur la migration versionnee.
//
// Trois blocs :
//   1. Appareils (push_devices) : enregistrement / suppression / jetons actifs.
//   2. Outbox (push_outbox)     : depot transactionnel d'evenements metier.
//   3. Rappels (push_reminders) : programmation / recalcul / annulation.
// Plus le verrou de worker (push_jobs).

import { prisma } from '../prisma.js';
import { HttpError } from '../middleware/auth.js';

const MAX_ATTEMPTS = 5;

/* ------------------------------------------------------------------ */
/* 1. Appareils                                                        */
/* ------------------------------------------------------------------ */

export function isValidToken(token) {
  return typeof token === 'string' && token.trim().length >= 20 && token.length <= 255;
}

/** Enregistre (ou rafraichit) un appareil pour un utilisateur authentifie. */
export async function registerDevice({ userId, token, platform = 'web', userAgent = null }) {
  if (!isValidToken(token)) {
    throw new HttpError(400, 'INVALID_TOKEN', 'Jeton FCM invalide.');
  }
  if (!userId) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Utilisateur requis.');
  }
  const normalized = token.trim();
  // Le jeton est unique : le meme navigateur peut changer de compte, on le
  // rattache alors au nouveau proprietaire.
  return prisma.pushDevice.upsert({
    where: { token: normalized },
    update: { userId, platform, userAgent, lastSeenAt: new Date() },
    create: { userId, token: normalized, platform, userAgent },
  });
}

/**
 * Supprime un appareil. Si `token` est fourni, seul ce jeton est vise (et
 * uniquement s'il appartient a l'utilisateur : on ne peut pas supprimer le
 * jeton d'autrui). Sinon, tous les appareils de l'utilisateur sont supprimes
 * (desactivation globale depuis les parametres).
 */
export async function removeDevice({ userId, token = null }) {
  if (!userId) throw new HttpError(401, 'UNAUTHORIZED', 'Utilisateur requis.');
  if (token) {
    const result = await prisma.pushDevice.deleteMany({
      where: { userId, token: token.trim() },
    });
    return result.count;
  }
  const result = await prisma.pushDevice.deleteMany({ where: { userId } });
  return result.count;
}

export async function listTokensForUser(userId) {
  const devices = await prisma.pushDevice.findMany({
    where: { userId },
    select: { token: true },
  });
  return devices.map((d) => d.token);
}

export async function listTokensForUsers(userIds) {
  const ids = [...new Set((userIds ?? []).filter(Boolean))];
  if (!ids.length) return [];
  const devices = await prisma.pushDevice.findMany({
    where: { userId: { in: ids } },
    select: { token: true },
  });
  return [...new Set(devices.map((d) => d.token))];
}

export async function deleteTokens(tokens) {
  const list = [...new Set((tokens ?? []).filter(Boolean))];
  if (!list.length) return 0;
  const result = await prisma.pushDevice.deleteMany({ where: { token: { in: list } } });
  return result.count;
}

/** Retire les jetons connus comme invalides (appeles apres un envoi FCM). */
export async function purgeInvalidTokens(invalidTokens) {
  return deleteTokens(invalidTokens);
}

export async function countDevicesForUser(userId) {
  return prisma.pushDevice.count({ where: { userId } });
}

/* ------------------------------------------------------------------ */
/* 2. Outbox                                                           */
/* ------------------------------------------------------------------ */

/**
 * Depose des evenements dans l'outbox. Idempotent : une entree dont `eventKey`
 * existe deja est ignoree (la contrainte unique + createMany skipDuplicates
 * garantit l'anti-doublon meme si l'evenement est traite deux fois).
 *
 * `audienceUserIds` permet d'adresser un meme message a plusieurs profils
 * (ex. tout le personnel du salon) : chaque destinataire obtient sa propre
 * ligne, avec un eventKey suffixe par l'identifiant du profil.
 */
export async function enqueueOutbox(entries) {
  const list = (Array.isArray(entries) ? entries : [entries]).filter(Boolean);
  if (!list.length) return 0;

  const rows = [];
  for (const e of list) {
    const audience = Array.isArray(e.audienceUserIds) ? [...new Set(e.audienceUserIds.filter(Boolean))] : null;
    if (audience && audience.length) {
      for (const userId of audience) {
        rows.push(buildOutboxRow(e, { targetUserId: userId, suffix: userId }));
      }
      continue;
    }
    rows.push(buildOutboxRow(e, { targetUserId: e.targetUserId ?? null }));
  }

  const result = await prisma.pushOutbox.createMany({ data: rows, skipDuplicates: true });
  return result.count;
}

function buildOutboxRow(e, { targetUserId, suffix = null }) {
  return {
    type: e.type,
    eventKey: e.eventKey ? (suffix ? `${e.eventKey}:${suffix}` : e.eventKey) : null,
    tenantId: e.tenantId ?? null,
    targetUserId: targetUserId ?? null,
    entityType: e.entityType ?? null,
    entityId: e.entityId ?? null,
    title: e.title,
    body: e.body,
    url: e.url ?? '/',
    data: e.data ?? undefined,
    scheduledAt: e.scheduledAt ?? null,
    status: 'pending',
  };
}

/**
 * Reserve un lot de messages d'outbox prets a envoyer (status pending, echeance
 * atteinte) en les passant a "processing". Comme pour les rappels, on marque
 * d'abord puis on ne relit que ce qui a bien bascule (protection multi-worker).
 * `recoverStuckOutbox` remet en file les lignes bloquees par un worker tue.
 */
export async function claimOutboxBatch(limit = 50) {
  const now = new Date();
  const candidates = await prisma.pushOutbox.findMany({
    where: {
      status: 'pending',
      attempts: { lt: MAX_ATTEMPTS },
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true },
  });
  if (!candidates.length) return [];

  const ids = candidates.map((c) => c.id);
  await prisma.pushOutbox.updateMany({
    where: { id: { in: ids }, status: 'pending' },
    data: { status: 'processing', lockedAt: now },
  });

  return prisma.pushOutbox.findMany({
    where: { id: { in: ids }, status: 'processing', lockedAt: now },
    orderBy: { createdAt: 'asc' },
  });
}

/** Messages d'outbox restes en "processing" (worker interrompu) -> pending. */
export async function recoverStuckOutbox(staleBefore) {
  const result = await prisma.pushOutbox.updateMany({
    where: { status: 'processing', lockedAt: { lt: staleBefore } },
    data: { status: 'pending', lockedAt: null },
  });
  return result.count;
}

/** Remet un message d'outbox en attente sans consommer de tentative. */
export async function deferOutbox(id, reason = null) {
  return prisma.pushOutbox.update({
    where: { id },
    data: { status: 'pending', lockedAt: null, lastError: reason ? String(reason).slice(0, 500) : null },
  });
}

export async function markOutboxSent(id) {
  return prisma.pushOutbox.update({
    where: { id },
    data: { status: 'sent', sentAt: new Date(), processedAt: new Date(), lockedAt: null, lastError: null },
  });
}

export async function markOutboxFailed(id, error, { retry = true } = {}) {
  const current = await prisma.pushOutbox.findUnique({ where: { id }, select: { attempts: true } });
  const attempts = (current?.attempts ?? 0) + 1;
  const giveUp = !retry || attempts >= MAX_ATTEMPTS;
  return prisma.pushOutbox.update({
    where: { id },
    data: {
      status: giveUp ? 'failed' : 'pending',
      attempts,
      lastError: String(error ?? 'ERREUR').slice(0, 500),
      processedAt: new Date(),
      lockedAt: null,
    },
  });
}

/* ------------------------------------------------------------------ */
/* 3. Rappels                                                          */
/* ------------------------------------------------------------------ */

/**
 * (Re)programme les rappels d'un rendez-vous. Annule d'abord les rappels encore
 * en attente pour ce rendez-vous (date/heure changees => anciens slots obsoletes),
 * puis insere les nouveaux. La contrainte unique (appointment_id, user_id,
 * scheduled_at) empeche tout doublon.
 *
 * `slots` : [{ kind, scheduledAt, title, body, url? }] (titre/corps propres a
 * chaque echeance : le libelle 24 h differe du libelle 1 h). Un tableau vide
 * annule simplement les rappels en attente sans en recreer.
 */
export async function replaceReminders({ appointmentId, userId, tenantId, slots }) {
  await prisma.$transaction(async (tx) => {
    await tx.pushReminder.updateMany({
      where: { appointmentId, status: { in: ['pending', 'processing'] } },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });

    for (const slot of slots ?? []) {
      await tx.pushReminder.upsert({
        where: {
          uniq_reminder_slot: {
            appointmentId,
            userId,
            scheduledAt: slot.scheduledAt,
          },
        },
        update: {
          status: 'pending',
          title: slot.title,
          body: slot.body,
          url: slot.url ?? '/mes-reservations',
          tenantId: tenantId ?? null,
          cancelledAt: null,
          lastError: null,
        },
        create: {
          appointmentId,
          userId,
          tenantId: tenantId ?? null,
          kind: slot.kind,
          scheduledAt: slot.scheduledAt,
          title: slot.title,
          body: slot.body,
          url: slot.url ?? '/mes-reservations',
        },
      });
    }
  });
}

/** Annule tous les rappels d'un rendez-vous (annulation / suppression). */
export async function cancelRemindersForAppointment(appointmentId) {
  const result = await prisma.pushReminder.updateMany({
    where: { appointmentId, status: { in: ['pending', 'processing'] } },
    data: { status: 'cancelled', cancelledAt: new Date() },
  });
  return result.count;
}

/**
 * Reserve un lot de rappels echus en les passant a "processing" (verrou logique).
 * On selectionne d'abord les identifiants candidats, puis on les marque via un
 * updateMany conditionne sur status = 'pending' : seuls les rappels reellement
 * reserves par CE worker sont renvoyes (protection contre deux workers
 * concurrents). Un worker tue en pleine execution les libere via
 * recoverStuckReminders.
 */
export async function claimDueReminders(now, limit = 50) {
  const candidates = await prisma.pushReminder.findMany({
    where: {
      status: 'pending',
      attempts: { lt: MAX_ATTEMPTS },
      scheduledAt: { lte: now },
    },
    orderBy: { scheduledAt: 'asc' },
    take: limit,
    select: { id: true },
  });
  if (!candidates.length) return [];

  const ids = candidates.map((c) => c.id);
  await prisma.pushReminder.updateMany({
    where: { id: { in: ids }, status: 'pending' },
    data: { status: 'processing', lockedAt: now },
  });

  return prisma.pushReminder.findMany({
    where: { id: { in: ids }, status: 'processing', lockedAt: now },
    orderBy: { scheduledAt: 'asc' },
  });
}

/** Marque un rappel comme envoye. */
export async function markReminderSent(id) {
  return prisma.pushReminder.update({
    where: { id },
    data: { status: 'sent', sentAt: new Date(), lockedAt: null, lastError: null },
  });
}

export async function markReminderFailed(id, error, { retry = true } = {}) {
  const current = await prisma.pushReminder.findUnique({ where: { id }, select: { attempts: true } });
  const attempts = (current?.attempts ?? 0) + 1;
  const giveUp = !retry || attempts >= MAX_ATTEMPTS;
  return prisma.pushReminder.update({
    where: { id },
    data: {
      status: giveUp ? 'failed' : 'pending',
      attempts,
      lastError: String(error ?? 'ERREUR').slice(0, 500),
      lockedAt: null,
    },
  });
}

/** Rappels restes en "processing" (worker interrompu) -> remis en attente. */
export async function recoverStuckReminders(staleBefore) {
  const result = await prisma.pushReminder.updateMany({
    where: { status: 'processing', lockedAt: { lt: staleBefore } },
    data: { status: 'pending', lockedAt: null },
  });
  return result.count;
}

/**
 * Remet un rappel en attente SANS consommer de tentative (cas "envoi
 * impossible pour l'instant" : Firebase non configure). Le message reste donc
 * en file tel quel pour un envoi ulterieur.
 */
export async function deferReminder(id, reason = null) {
  return prisma.pushReminder.update({
    where: { id },
    data: { status: 'pending', lockedAt: null, lastError: reason ? String(reason).slice(0, 500) : null },
  });
}

/** Rappels en attente (pour les tests et le diagnostic). */
export async function listPendingReminders(appointmentId) {
  return prisma.pushReminder.findMany({
    where: { appointmentId, status: 'pending' },
    orderBy: { scheduledAt: 'asc' },
  });
}

/* ------------------------------------------------------------------ */
/* Verrou de worker (push_jobs)                                        */
/* ------------------------------------------------------------------ */

const WORKER_JOB = 'push_worker';

/**
 * Tente d'acquierir le verrou du worker. Renvoie le runnerId si acquis, sinon
 * null (un autre process traite deja). Le verrou expire (lockedUntil) pour
 * qu'un worker tue en pleine execution ne bloque pas indefiniment.
 */
export async function acquireWorkerLock({ runnerId, lockMs = 5 * 60 * 1000 }) {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + lockMs);

  await prisma.pushJob.upsert({
    where: { name: WORKER_JOB },
    update: {},
    create: { name: WORKER_JOB },
  });

  const result = await prisma.pushJob.updateMany({
    where: {
      name: WORKER_JOB,
      OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
    },
    data: { lockedUntil, lockedBy: runnerId, lastRunAt: now },
  });

  return result.count === 1 ? runnerId : null;
}

export async function releaseWorkerLock({ runnerId, result = null }) {
  const current = await prisma.pushJob.findUnique({ where: { name: WORKER_JOB } });
  return prisma.pushJob.updateMany({
    where: { name: WORKER_JOB, lockedBy: runnerId },
    data: {
      lockedUntil: null,
      lockedBy: null,
      lastResult: result === null ? current?.lastResult ?? null : String(result).slice(0, 500),
      runCount: { increment: 1 },
    },
  });
}

export { MAX_ATTEMPTS };
