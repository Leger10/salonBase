// Demandes de reinitialisation de mot de passe.
//
// Le service d'email de Better Auth n'est pas configure sur l'hebergement : un
// utilisateur qui a oublie son mot de passe depose une demande depuis
// /auth/forgot-password. Le super administrateur voit la file d'attente, remet
// le mot de passe a "00000000" puis communique ce mot de passe temporaire. La
// connexion suivante est forcee vers /auth/change-password
// (profiles.must_change_password = 1).
//
// La table est accedee en SQL parametre : aucun email / identifiant venant du
// client n'est concatene dans une requete.
import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { prisma } from './prisma.js';
import { HttpError } from './middleware/auth.js';

export const DEFAULT_RESET_PASSWORD = process.env.AUTH_DEFAULT_PASSWORD || '00000000';

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS \`password_reset_requests\` (
  \`id\` CHAR(36) NOT NULL,
  \`email\` VARCHAR(255) NOT NULL,
  \`profile_id\` CHAR(36) NULL,
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'pending',
  \`note\` TEXT NULL,
  \`requested_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`processed_at\` DATETIME(3) NULL,
  \`processed_by\` CHAR(36) NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  INDEX \`idx_password_reset_requests_status\`(\`status\`),
  INDEX \`idx_password_reset_requests_email\`(\`email\`),
  INDEX \`idx_password_reset_requests_requested_at\`(\`requested_at\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;

let tableReady = false;

/** Cree la table si la migration n'a pas encore ete rejouee (idempotent). */
export async function ensurePasswordResetTables() {
  if (tableReady) return;
  await prisma.$executeRawUnsafe(CREATE_TABLE);
  tableReady = true;
}

function normalizeEmail(value) {
  const email = String(value ?? '').trim().toLowerCase();
  if (!email) {
    throw new HttpError(400, 'INVALID_EMAIL', 'Adresse email obligatoire.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    throw new HttpError(400, 'INVALID_EMAIL', 'Adresse email invalide.');
  }
  return email;
}

function serializeRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    profile_id: row.profile_id ?? null,
    status: row.status,
    note: row.note ?? null,
    requested_at: row.requested_at ?? row.created_at ?? null,
    processed_at: row.processed_at ?? null,
    processed_by: row.processed_by ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

async function findRequest(id) {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT * FROM password_reset_requests WHERE id = ? LIMIT 1',
    String(id)
  );
  return rows?.[0] ?? null;
}

/**
 * Depose (ou met a jour) une demande en attente pour cet email.
 * Renvoie toujours un objet neutre : le front ne doit pas pouvoir deviner si
 * l'adresse correspond a un compte existant.
 */
export async function createPasswordResetRequest(input = {}) {
  await ensurePasswordResetTables();
  const email = normalizeEmail(input.email);
  const note = String(input.note ?? '').trim().slice(0, 1000) || null;

  const profile = await prisma.profile.findFirst({
    where: { email },
    select: { id: true },
  });

  const existing = await prisma.$queryRawUnsafe(
    `SELECT id FROM password_reset_requests
      WHERE email = ? AND status = 'pending'
      ORDER BY requested_at DESC LIMIT 1`,
    email
  );

  if (existing?.[0]) {
    const id = existing[0].id;
    await prisma.$executeRawUnsafe(
      `UPDATE password_reset_requests
          SET note = ?, profile_id = ?, updated_at = NOW(3)
        WHERE id = ?`,
      note,
      profile?.id ?? null,
      id
    );
    return { id, status: 'pending', created: false };
  }

  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO password_reset_requests (id, email, profile_id, status, note)
     VALUES (?, ?, ?, 'pending', ?)`,
    id,
    email,
    profile?.id ?? null,
    note
  );
  return { id, status: 'pending', created: true };
}

export async function listPasswordResetRequests({ status } = {}) {
  await ensurePasswordResetTables();
  const normalized = String(status ?? '').trim().toLowerCase();
  const allowed = new Set(['pending', 'approved', 'rejected']);
  if (normalized && allowed.has(normalized)) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM password_reset_requests
        WHERE status = ?
        ORDER BY requested_at DESC
        LIMIT 500`,
      normalized
    );
    return { requests: (rows ?? []).map(serializeRequest) };
  }

  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM password_reset_requests
      ORDER BY FIELD(status, 'pending', 'approved', 'rejected'), requested_at DESC
      LIMIT 500`
  );
  return { requests: (rows ?? []).map(serializeRequest) };
}

/**
 * Traite une demande.
 * - action "reset"  : mot de passe remis a DEFAULT_RESET_PASSWORD, changement
 *                     obligatoire a la prochaine connexion, sessions revoquees.
 * - action "reject" : demande refusee, le compte n'est pas modifie.
 */
export async function processPasswordResetRequest(id, input = {}, processedBy = null) {
  await ensurePasswordResetTables();
  const action = String(input.action ?? '').trim().toLowerCase();
  if (!['reset', 'approve', 'reject'].includes(action)) {
    throw new HttpError(400, 'INVALID_ACTION', 'Action invalide (reset ou reject).');
  }

  const request = await findRequest(id);
  if (!request) {
    throw new HttpError(404, 'REQUEST_NOT_FOUND', 'Demande introuvable.');
  }
  if (request.status !== 'pending') {
    throw new HttpError(409, 'REQUEST_ALREADY_PROCESSED', 'Cette demande a deja ete traitee.');
  }

  const note = String(input.note ?? '').trim().slice(0, 1000) || request.note || null;

  if (action === 'reject') {
    await prisma.$executeRawUnsafe(
      `UPDATE password_reset_requests
          SET status = 'rejected', note = ?, processed_at = NOW(3),
              processed_by = ?, updated_at = NOW(3)
        WHERE id = ?`,
      note,
      processedBy,
      request.id
    );
    return {
      request: serializeRequest(await findRequest(request.id)),
      temporary_password: null,
    };
  }

  const profile = request.profile_id
    ? await prisma.profile.findUnique({
        where: { id: request.profile_id },
        select: { id: true, email: true },
      })
    : await prisma.profile.findFirst({
        where: { email: request.email },
        select: { id: true, email: true },
      });

  if (!profile) {
    throw new HttpError(
      404,
      'ACCOUNT_NOT_FOUND',
      `Aucun compte n'est rattache a ${request.email}. Refusez la demande ou contactez le client.`
    );
  }

  // Reinitialisation du mot de passe : on cree le compte de connexion s'il
  // manque (comptes migres avant Better Auth) pour que la connexion marche.
  const hashed = await hashPassword(DEFAULT_RESET_PASSWORD);
  const account = await prisma.account.findFirst({
    where: { userId: profile.id, providerId: 'credential' },
    select: { id: true },
  });

  await prisma.$transaction([
    account
      ? prisma.account.update({
          where: { id: account.id },
          data: { password: hashed, updatedAt: new Date() },
        })
      : prisma.account.create({
          data: {
            id: randomUUID(),
            accountId: profile.id,
            providerId: 'credential',
            userId: profile.id,
            password: hashed,
          },
        }),
    prisma.profile.update({
      where: { id: profile.id },
      data: { mustChangePassword: true },
    }),
    prisma.session.deleteMany({ where: { userId: profile.id } }),
  ]);

  await prisma.$executeRawUnsafe(
    `UPDATE password_reset_requests
        SET status = 'approved', profile_id = ?, note = ?, processed_at = NOW(3),
            processed_by = ?, updated_at = NOW(3)
      WHERE id = ?`,
    profile.id,
    note,
    processedBy,
    request.id
  );

  return {
    request: serializeRequest(await findRequest(request.id)),
    temporary_password: DEFAULT_RESET_PASSWORD,
  };
}

export async function countPendingPasswordResets() {
  await ensurePasswordResetTables();
  const rows = await prisma.$queryRawUnsafe(
    "SELECT COUNT(*) AS n FROM password_reset_requests WHERE status = 'pending'"
  );
  return Number(rows?.[0]?.n ?? 0);
}
