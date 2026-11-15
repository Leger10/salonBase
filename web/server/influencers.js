// Gestion des influenceurs : chaque influenceur inscrit des salons, touche une
// commission sur chaque abonnement valide de ces salons, et peut demander un
// retrait de son solde depuis son espace.
//
// Les tables `influencers` et `influencer_withdrawals` sont creees par la
// migration Prisma (voir prisma/migrations). Les colonnes sont accedees en SQL
// parametre : aucun identifiant ni montant venant du client n'est concatene.
import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { prisma } from './prisma.js';
import { HttpError } from './middleware/auth.js';

export const DEFAULT_COMMISSION_RATE = 20;
export const MIN_WITHDRAWAL = 1000;
// Frais appliques au montant demande lors d'un retrait : l'influenceur recoit
// 95 % du montant, les 5 % couvrent les frais de transaction.
export const WITHDRAWAL_FEE_RATE = 5;

const WITHDRAWAL_METHODS = new Set([
  'mobile_money',
  'orange_money',
  'moov_money',
  'wave',
  'virement',
  'especes',
  'autre',
]);

const WITHDRAWAL_STATUSES = new Set(['pending', 'approved', 'paid', 'rejected']);

const money = (value) => Math.round((Number(value) || 0) * 100) / 100;

const CREATE_INFLUENCERS = `CREATE TABLE IF NOT EXISTS \`influencers\` (
  \`id\` CHAR(36) NOT NULL,
  \`full_name\` VARCHAR(255) NOT NULL,
  \`email\` VARCHAR(255) NULL,
  \`phone\` VARCHAR(50) NULL,
  \`referral_code\` VARCHAR(50) NULL,
  \`commission_rate\` DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'active',
  \`user_id\` CHAR(36) NULL,
  \`notes\` TEXT NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`influencers_email_key\`(\`email\`),
  UNIQUE INDEX \`influencers_referral_code_key\`(\`referral_code\`),
  UNIQUE INDEX \`influencers_user_id_key\`(\`user_id\`),
  INDEX \`idx_influencers_status\`(\`status\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;

const CREATE_WITHDRAWALS = `CREATE TABLE IF NOT EXISTS \`influencer_withdrawals\` (
  \`id\` CHAR(36) NOT NULL,
  \`influencer_id\` CHAR(36) NOT NULL,
  \`amount\` DECIMAL(12, 2) NOT NULL,
  \`fee_rate\` DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
  \`fee_amount\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  \`net_amount\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'pending',
  \`method\` VARCHAR(50) NULL,
  \`account_details\` TEXT NULL,
  \`note\` TEXT NULL,
  \`requested_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`processed_at\` DATETIME(3) NULL,
  \`processed_by\` CHAR(36) NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  INDEX \`idx_influencer_withdrawals_influencer\`(\`influencer_id\`),
  INDEX \`idx_influencer_withdrawals_status\`(\`status\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;

let tablesReady = false;

/** Ajoute les colonnes de frais aux tables deja creees (idempotent). */
async function ensureWithdrawalColumns() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'influencer_withdrawals'`
  );
  const existing = new Set(
    rows.map((row) => String(row.COLUMN_NAME ?? Object.values(row)[0]).toLowerCase())
  );
  const missing = [
    ['fee_rate', 'DECIMAL(5, 2) NOT NULL DEFAULT 5.00'],
    ['fee_amount', 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00'],
    ['net_amount', 'DECIMAL(12, 2) NOT NULL DEFAULT 0.00'],
  ].filter(([name]) => !existing.has(name));
  if (missing.length === 0) return;

  for (const [name, definition] of missing) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE \`influencer_withdrawals\` ADD COLUMN \`${name}\` ${definition}`
    );
  }
  // Les anciennes demandes n'avaient pas de frais : on les calcule pour que le
  // net a payer reste lisible dans l'historique.
  await prisma.$executeRawUnsafe(
    `UPDATE influencer_withdrawals
        SET fee_amount = ROUND(amount * fee_rate / 100, 2),
            net_amount = ROUND(amount - ROUND(amount * fee_rate / 100, 2), 2)
      WHERE net_amount = 0 AND amount > 0`
  );
}

/** Cree les tables si la migration n'a pas encore ete rejouee (idempotent). */
export async function ensureInfluencerTables() {
  if (tablesReady) return;
  await prisma.$executeRawUnsafe(CREATE_INFLUENCERS);
  await prisma.$executeRawUnsafe(CREATE_WITHDRAWALS);
  await ensureWithdrawalColumns();
  tablesReady = true;
}

function normalizeEmail(value) {
  const email = String(value ?? '').trim().toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'INVALID_EMAIL', 'Adresse email invalide.');
  }
  return email;
}

function normalizeRate(value) {
  if (value === undefined || value === null || value === '') return DEFAULT_COMMISSION_RATE;
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new HttpError(400, 'INVALID_RATE', 'Le taux de commission doit etre compris entre 0 et 100.');
  }
  return Math.round(rate * 100) / 100;
}

function serializeInfluencer(row) {
  if (!row) return null;
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    referral_code: row.referral_code,
    commission_rate: Number(row.commission_rate ?? DEFAULT_COMMISSION_RATE),
    status: row.status ?? 'active',
    user_id: row.user_id,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    has_account: Boolean(row.user_id),
  };
}

async function uniqueReferralCode(fullName) {
  const base = String(fullName ?? 'influenceur')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 16) || 'influenceur';
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = randomUUID().replace(/-/g, '').slice(0, 4);
    const code = `${base}-${suffix}`;
    const rows = await prisma.$queryRawUnsafe(
      'SELECT id FROM influencers WHERE referral_code = ? LIMIT 1',
      code
    );
    if (rows.length === 0) return code;
  }
  throw new HttpError(500, 'CODE_GENERATION_FAILED', 'Impossible de generer un code de parrainage.');
}

function serializeWithdrawal(row) {
  if (!row) return null;
  const amount = money(row.amount);
  const feeRate = row.fee_rate === null || row.fee_rate === undefined
    ? WITHDRAWAL_FEE_RATE
    : Number(row.fee_rate);
  const feeAmount = row.fee_amount === null || row.fee_amount === undefined
    ? money(amount * feeRate / 100)
    : money(row.fee_amount);
  const netAmount = row.net_amount === null || row.net_amount === undefined
    ? money(amount - feeAmount)
    : money(row.net_amount);
  return {
    id: row.id,
    influencer_id: row.influencer_id,
    amount,
    fee_rate: feeRate,
    fee_amount: feeAmount,
    net_amount: netAmount,
    status: row.status,
    method: row.method,
    account_details: row.account_details,
    note: row.note,
    requested_at: row.requested_at,
    processed_at: row.processed_at,
    processed_by: row.processed_by,
  };
}

function recognizedDate(row) {
  return row.validated_at ?? row.created_at ?? row.start_date ?? null;
}

function buildReport(influencer, subscriptionRows, withdrawalRows, year) {
  const rate = Number(influencer.commission_rate ?? DEFAULT_COMMISSION_RATE);
  const now = new Date();
  const requestedYear = Number.isInteger(Number(year)) && Number(year) > 2000
    ? Number(year)
    : now.getUTCFullYear();

  const commissions = subscriptionRows.map((row) => {
    const amount = money(row.amount);
    const recognized = recognizedDate(row);
    return {
      subscription_id: row.subscription_id,
      tenant_id: row.tenant_id,
      tenant_name: row.tenant_name,
      tenant_slug: row.tenant_slug,
      plan: row.plan,
      amount,
      status: row.status,
      start_date: row.start_date,
      end_date: row.end_date,
      recognized_at: recognized,
      commission_rate: rate,
      commission: money(amount * rate / 100),
    };
  });

  const earnedTotal = money(commissions.reduce((sum, row) => sum + row.commission, 0));

  const withdrawals = withdrawalRows.map((row) => serializeWithdrawal(row));

  const sumByStatus = (status) => money(
    withdrawals.filter((row) => row.status === status).reduce((sum, row) => sum + row.amount, 0)
  );
  const pending = sumByStatus('pending');
  const approved = sumByStatus('approved');
  const paid = sumByStatus('paid');
  const reserved = money(pending + approved);
  const available = money(Math.max(0, earnedTotal - reserved - paid));

  const years = new Set([now.getUTCFullYear(), requestedYear]);
  for (const commission of commissions) {
    const date = new Date(commission.recognized_at);
    if (!Number.isNaN(date.getTime())) years.add(date.getUTCFullYear());
  }

  const monthly = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    revenue: 0,
    commission: 0,
    salons: 0,
  }));
  const salonsByMonth = Array.from({ length: 12 }, () => new Set());
  let yearRevenue = 0;
  let yearCommission = 0;

  for (const commission of commissions) {
    const date = new Date(commission.recognized_at);
    if (Number.isNaN(date.getTime())) continue;
    if (date.getUTCFullYear() !== requestedYear) continue;
    const month = monthly[date.getUTCMonth()];
    month.revenue = money(month.revenue + commission.amount);
    month.commission = money(month.commission + commission.commission);
    yearRevenue = money(yearRevenue + commission.amount);
    yearCommission = money(yearCommission + commission.commission);
    salonsByMonth[date.getUTCMonth()].add(commission.tenant_id);
  }
  for (const month of monthly) {
    month.salons = salonsByMonth[month.month - 1].size;
  }

  const salons = [...new Map(
    commissions.map((commission) => [commission.tenant_id, {
      tenant_id: commission.tenant_id,
      tenant_name: commission.tenant_name,
      tenant_slug: commission.tenant_slug,
      plan: commission.plan,
      subscription_count: 0,
      total_amount: 0,
      total_commission: 0,
      last_subscription_at: null,
    }])
  ).values()];

  for (const salon of salons) {
    const rows = commissions.filter((commission) => commission.tenant_id === salon.tenant_id);
    salon.subscription_count = rows.length;
    salon.total_amount = money(rows.reduce((sum, row) => sum + row.amount, 0));
    salon.total_commission = money(rows.reduce((sum, row) => sum + row.commission, 0));
    salon.last_subscription_at = rows
      .map((row) => row.recognized_at)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0] ?? null;
  }
  salons.sort((a, b) => b.total_commission - a.total_commission);

  return {
    year: requestedYear,
    years: [...years].sort((a, b) => b - a),
    influencer: serializeInfluencer(influencer),
    rate,
    minWithdrawal: MIN_WITHDRAWAL,
    withdrawalFeeRate: WITHDRAWAL_FEE_RATE,
    salons,
    commissions,
    withdrawals,
    monthly,
    totals: {
      salons: salons.length,
      subscriptions: commissions.length,
      revenue: money(commissions.reduce((sum, row) => sum + row.amount, 0)),
      earned: earnedTotal,
      pending,
      approved,
      paid,
      reserved,
      available,
      fees: money(
        withdrawals
          .filter((row) => row.status === 'paid')
          .reduce((sum, row) => sum + row.fee_amount, 0)
      ),
      yearRevenue,
      yearCommission,
    },
  };
}

async function fetchInfluencerRows() {
  return prisma.$queryRawUnsafe('SELECT * FROM influencers ORDER BY created_at DESC');
}

async function fetchCommissionsForInfluencer(influencerId) {
  return prisma.$queryRawUnsafe(
    `SELECT s.id AS subscription_id, s.tenant_id, s.plan, s.amount, s.status,
            s.start_date, s.end_date, s.created_at, s.validated_at,
            t.name AS tenant_name, t.slug AS tenant_slug
       FROM subscriptions s
       JOIN tenants t ON t.id = s.tenant_id
      WHERE t.referred_by_influencer_id = ?
        AND s.status = 'active'
      ORDER BY COALESCE(s.validated_at, s.created_at, s.start_date) DESC`,
    influencerId
  );
}

async function fetchWithdrawals(influencerId) {
  return prisma.$queryRawUnsafe(
    `SELECT * FROM influencer_withdrawals
      WHERE influencer_id = ?
      ORDER BY requested_at DESC`,
    influencerId
  );
}

/** Tous les influenceurs avec leurs chiffres (salons, commissions, solde). */
export async function listInfluencersWithStats() {
  await ensureInfluencerTables();

  const [influencers, commissions, withdrawals] = await Promise.all([
    fetchInfluencerRows(),
    prisma.$queryRawUnsafe(
      `SELECT s.id AS subscription_id, s.tenant_id, s.amount, s.status,
              s.start_date, s.created_at, s.validated_at,
              t.name AS tenant_name, t.slug AS tenant_slug,
              t.referred_by_influencer_id, s.plan
         FROM subscriptions s
         JOIN tenants t ON t.id = s.tenant_id
        WHERE t.referred_by_influencer_id IS NOT NULL
          AND s.status = 'active'
        ORDER BY COALESCE(s.validated_at, s.created_at, s.start_date) DESC`
    ),
    prisma.$queryRawUnsafe('SELECT * FROM influencer_withdrawals ORDER BY requested_at DESC'),
  ]);

  return influencers.map((row) => {
    const ownCommissions = commissions
      .filter((commission) => commission.referred_by_influencer_id === row.id)
      .map((commission) => ({
        ...commission,
        recognized_at: recognizedDate(commission),
        commission: money(Number(commission.amount) * Number(row.commission_rate) / 100),
      }));
    const ownWithdrawals = withdrawals.filter((withdrawal) => withdrawal.influencer_id === row.id);
    const earned = money(ownCommissions.reduce((sum, commission) => sum + commission.commission, 0));
    const sumByStatus = (status) => money(
      ownWithdrawals
        .filter((withdrawal) => withdrawal.status === status)
        .reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0)
    );
    const pending = sumByStatus('pending');
    const approved = sumByStatus('approved');
    const paid = sumByStatus('paid');

    return {
      ...serializeInfluencer(row),
      stats: {
        salons: new Set(ownCommissions.map((commission) => commission.tenant_id)).size,
        subscriptions: ownCommissions.length,
        revenue: money(ownCommissions.reduce((sum, commission) => sum + Number(commission.amount), 0)),
        earned,
        pending,
        approved,
        paid,
        available: money(Math.max(0, earned - pending - approved - paid)),
      },
    };
  });
}

export async function getInfluencerById(influencerId) {
  await ensureInfluencerTables();
  const rows = await prisma.$queryRawUnsafe(
    'SELECT * FROM influencers WHERE id = ? LIMIT 1',
    influencerId
  );
  return rows[0] ?? null;
}

export async function getInfluencerByUserId(userId) {
  await ensureInfluencerTables();
  const rows = await prisma.$queryRawUnsafe(
    'SELECT * FROM influencers WHERE user_id = ? LIMIT 1',
    userId
  );
  return rows[0] ?? null;
}

export async function getInfluencerReport(influencerId, { year } = {}) {
  const influencer = await getInfluencerById(influencerId);
  if (!influencer) {
    throw new HttpError(404, 'INFLUENCER_NOT_FOUND', 'Influenceur introuvable.');
  }
  const [commissions, withdrawals] = await Promise.all([
    fetchCommissionsForInfluencer(influencerId),
    fetchWithdrawals(influencerId),
  ]);
  return buildReport(influencer, commissions, withdrawals, year);
}

export async function createInfluencer(input = {}) {
  await ensureInfluencerTables();

  const fullName = String(input.full_name ?? input.fullName ?? '').trim();
  if (!fullName) {
    throw new HttpError(400, 'INVALID_INPUT', 'Le nom complet est obligatoire.');
  }
  const email = normalizeEmail(input.email);
  const phone = String(input.phone ?? '').trim() || null;
  const rate = normalizeRate(input.commission_rate ?? input.commissionRate);
  const status = String(input.status ?? 'active') === 'inactive' ? 'inactive' : 'active';
  const notes = String(input.notes ?? '').trim() || null;
  const password = String(input.password ?? '');
  const shouldCreateAccount = Boolean(input.create_account ?? input.createAccount) || password.length > 0;

  if (shouldCreateAccount && (!email || !password)) {
    throw new HttpError(
      400,
      'INVALID_INPUT',
      "Un email et un mot de passe sont requis pour ouvrir l'acces a l'espace influenceur."
    );
  }
  if (shouldCreateAccount && password.length < 8) {
    throw new HttpError(400, 'WEAK_PASSWORD', 'Le mot de passe doit contenir au moins 8 caracteres.');
  }

  if (email) {
    const duplicate = await prisma.$queryRawUnsafe(
      'SELECT id FROM influencers WHERE email = ? LIMIT 1',
      email
    );
    if (duplicate.length > 0) {
      throw new HttpError(409, 'EMAIL_TAKEN', 'Cet email est deja utilise par un influenceur.');
    }
  }

  let userId = null;
  if (shouldCreateAccount) {
    const existingProfile = await prisma.profile.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingProfile) {
      throw new HttpError(409, 'EMAIL_TAKEN', 'Cet email est deja utilise par un compte.');
    }
    const hashed = await hashPassword(password);
    const profile = await prisma.$transaction(async (tx) => {
      const created = await tx.profile.create({
        data: {
          id: randomUUID(),
          email,
          name: fullName,
          phone,
          role: 'influencer',
          tenantId: null,
          isActive: true,
          emailVerified: true,
          mustChangePassword: false,
        },
      });
      await tx.account.create({
        data: {
          id: randomUUID(),
          accountId: created.id,
          providerId: 'credential',
          userId: created.id,
          password: hashed,
        },
      });
      return created;
    });
    userId = profile.id;
  }

  const id = randomUUID();
  const referralCode = await uniqueReferralCode(fullName);
  await prisma.$executeRawUnsafe(
    `INSERT INTO influencers
      (id, full_name, email, phone, referral_code, commission_rate, status, user_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, fullName, email, phone, referralCode, rate, status, userId, notes
  );

  const rows = await prisma.$queryRawUnsafe('SELECT * FROM influencers WHERE id = ? LIMIT 1', id);
  return serializeInfluencer(rows[0]);
}

async function setPasswordForUser(userId, password) {
  if (!userId) return false;
  const hashed = await hashPassword(password);
  const account = await prisma.account.findFirst({
    where: { userId, providerId: 'credential' },
    select: { id: true },
  });
  if (!account) return false;
  await prisma.account.update({
    where: { id: account.id },
    data: { password: hashed, updatedAt: new Date() },
  });
  return true;
}

export async function updateInfluencer(influencerId, input = {}) {
  const influencer = await getInfluencerById(influencerId);
  if (!influencer) {
    throw new HttpError(404, 'INFLUENCER_NOT_FOUND', 'Influenceur introuvable.');
  }

  const fields = [];
  const values = [];
  const push = (column, value) => {
    fields.push(`\`${column}\` = ?`);
    values.push(value);
  };

  if (input.full_name !== undefined || input.fullName !== undefined) {
    const fullName = String(input.full_name ?? input.fullName).trim();
    if (!fullName) throw new HttpError(400, 'INVALID_INPUT', 'Le nom complet est obligatoire.');
    push('full_name', fullName);
  }
  if (input.email !== undefined) {
    const email = normalizeEmail(input.email);
    if (email) {
      const duplicate = await prisma.$queryRawUnsafe(
        'SELECT id FROM influencers WHERE email = ? AND id <> ? LIMIT 1',
        email,
        influencerId
      );
      if (duplicate.length > 0) {
        throw new HttpError(409, 'EMAIL_TAKEN', 'Cet email est deja utilise par un influenceur.');
      }
    }
    push('email', email);
  }
  if (input.phone !== undefined) {
    push('phone', String(input.phone ?? '').trim() || null);
  }
  if (input.commission_rate !== undefined || input.commissionRate !== undefined) {
    push('commission_rate', normalizeRate(input.commission_rate ?? input.commissionRate));
  }
  if (input.status !== undefined) {
    push('status', String(input.status) === 'inactive' ? 'inactive' : 'active');
  }
  if (input.notes !== undefined) {
    push('notes', String(input.notes ?? '').trim() || null);
  }

  const password = String(input.password ?? '');
  if (password) {
    if (password.length < 8) {
      throw new HttpError(400, 'WEAK_PASSWORD', 'Le mot de passe doit contenir au moins 8 caracteres.');
    }
    await setPasswordForUser(influencer.user_id, password);
  }

  if (fields.length === 0) return serializeInfluencer(influencer);

  fields.push('`updated_at` = CURRENT_TIMESTAMP(3)');
  values.push(influencerId);
  await prisma.$executeRawUnsafe(
    `UPDATE influencers SET ${fields.join(', ')} WHERE id = ?`,
    ...values
  );

  const rows = await prisma.$queryRawUnsafe(
    'SELECT * FROM influencers WHERE id = ? LIMIT 1',
    influencerId
  );
  return serializeInfluencer(rows[0]);
}

export async function deleteInfluencer(influencerId) {
  const influencer = await getInfluencerById(influencerId);
  if (!influencer) {
    throw new HttpError(404, 'INFLUENCER_NOT_FOUND', 'Influenceur introuvable.');
  }
  const rows = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*) AS n FROM tenants WHERE referred_by_influencer_id = ?',
    influencerId
  );
  if (Number(rows[0]?.n ?? 0) > 0) {
    throw new HttpError(
      409,
      'INFLUENCER_HAS_SALONS',
      'Cet influenceur a encore des salons rattaches. Reattribuez-les avant de le supprimer.'
    );
  }
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      'DELETE FROM influencer_withdrawals WHERE influencer_id = ?',
      influencerId
    );
    await tx.$executeRawUnsafe('DELETE FROM influencers WHERE id = ?', influencerId);
    if (influencer.user_id) {
      await tx.profile.update({
        where: { id: influencer.user_id },
        data: { isActive: false },
      }).catch(() => {});
    }
  });
  return { deleted: true };
}

export async function createWithdrawal(influencerId, input = {}) {
  const report = await getInfluencerReport(influencerId);
  const amount = money(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpError(400, 'INVALID_AMOUNT', 'Montant de retrait invalide.');
  }
  if (amount < MIN_WITHDRAWAL) {
    throw new HttpError(
      400,
      'AMOUNT_TOO_LOW',
      `Le retrait minimum est de ${MIN_WITHDRAWAL.toLocaleString('fr-FR')} FCFA.`
    );
  }
  if (amount > report.totals.available) {
    throw new HttpError(
      400,
      'INSUFFICIENT_BALANCE',
      `Solde disponible insuffisant (${report.totals.available.toLocaleString('fr-FR')} FCFA).`
    );
  }

  const method = String(input.method ?? '').trim();
  if (!WITHDRAWAL_METHODS.has(method)) {
    throw new HttpError(400, 'INVALID_METHOD', 'Moyen de retrait invalide.');
  }
  const accountDetails = String(input.account_details ?? input.accountDetails ?? '').trim();
  if (!accountDetails) {
    throw new HttpError(
      400,
      'INVALID_INPUT',
      'Precisez le numero ou le compte qui doit recevoir le retrait.'
    );
  }

  const id = randomUUID();
  const feeRate = WITHDRAWAL_FEE_RATE;
  const feeAmount = money(amount * feeRate / 100);
  const netAmount = money(amount - feeAmount);
  await prisma.$executeRawUnsafe(
    `INSERT INTO influencer_withdrawals
      (id, influencer_id, amount, fee_rate, fee_amount, net_amount, status, method, account_details)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    id, influencerId, amount, feeRate, feeAmount, netAmount, method, accountDetails
  );
  const rows = await prisma.$queryRawUnsafe(
    'SELECT * FROM influencer_withdrawals WHERE id = ? LIMIT 1',
    id
  );
  return serializeWithdrawal(rows[0]);
}

export async function listWithdrawals({ status } = {}) {
  await ensureInfluencerTables();
  const clauses = [];
  const values = [];
  if (status) {
    if (!WITHDRAWAL_STATUSES.has(status)) {
      throw new HttpError(400, 'INVALID_STATUS', 'Statut de retrait invalide.');
    }
    clauses.push('w.status = ?');
    values.push(status);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await prisma.$queryRawUnsafe(
    `SELECT w.*, i.full_name AS influencer_name, i.email AS influencer_email,
            i.phone AS influencer_phone, i.commission_rate
       FROM influencer_withdrawals w
       JOIN influencers i ON i.id = w.influencer_id
       ${where}
      ORDER BY w.requested_at DESC`,
    ...values
  );
  return rows.map((row) => ({
    ...serializeWithdrawal(row),
    influencer_name: row.influencer_name,
    influencer_email: row.influencer_email,
    influencer_phone: row.influencer_phone,
    commission_rate: Number(row.commission_rate),
  }));
}

export async function processWithdrawal(withdrawalId, input = {}, processedBy = null) {
  await ensureInfluencerTables();
  const status = String(input.status ?? '').trim();
  if (!WITHDRAWAL_STATUSES.has(status) || status === 'pending') {
    throw new HttpError(400, 'INVALID_STATUS', 'Statut de traitement invalide.');
  }
  const rows = await prisma.$queryRawUnsafe(
    'SELECT * FROM influencer_withdrawals WHERE id = ? LIMIT 1',
    withdrawalId
  );
  const withdrawal = rows[0];
  if (!withdrawal) {
    throw new HttpError(404, 'WITHDRAWAL_NOT_FOUND', 'Demande de retrait introuvable.');
  }
  if (withdrawal.status === 'paid' || withdrawal.status === 'rejected') {
    throw new HttpError(409, 'ALREADY_PROCESSED', 'Cette demande a deja ete traitee.');
  }
  if (status === 'approved' && withdrawal.status !== 'pending') {
    throw new HttpError(409, 'INVALID_TRANSITION', 'Seule une demande en attente peut etre approuvee.');
  }
  if (status === 'paid' && withdrawal.status !== 'approved') {
    throw new HttpError(409, 'INVALID_TRANSITION', 'La demande doit etre approuvee avant le paiement.');
  }

  const note = String(input.note ?? '').trim() || null;
  await prisma.$executeRawUnsafe(
    `UPDATE influencer_withdrawals
        SET status = ?, note = COALESCE(?, note), processed_at = CURRENT_TIMESTAMP(3),
            processed_by = ?, updated_at = CURRENT_TIMESTAMP(3)
      WHERE id = ?`,
    status, note, processedBy, withdrawalId
  );
  const updated = await prisma.$queryRawUnsafe(
    'SELECT * FROM influencer_withdrawals WHERE id = ? LIMIT 1',
    withdrawalId
  );
  return serializeWithdrawal(updated[0]);
}

/** Rattache (ou detache) un salon a un influenceur. */
export async function assignTenantReferral(tenantId, influencerId) {
  const tenants = await prisma.$queryRawUnsafe(
    'SELECT id, name FROM tenants WHERE id = ? LIMIT 1',
    tenantId
  );
  const tenant = tenants[0];
  if (!tenant) {
    throw new HttpError(404, 'TENANT_NOT_FOUND', 'Salon introuvable.');
  }

  if (influencerId) {
    const influencer = await getInfluencerById(influencerId);
    if (!influencer) {
      throw new HttpError(404, 'INFLUENCER_NOT_FOUND', 'Influenceur introuvable.');
    }
  }

  await prisma.$executeRawUnsafe(
    'UPDATE tenants SET referred_by_influencer_id = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
    influencerId || null,
    tenantId
  );

  const rows = await prisma.$queryRawUnsafe(
    `SELECT t.id, t.name, t.slug, t.subscription_status, t.subscription_plan,
            t.referred_by_influencer_id
       FROM tenants t WHERE t.id = ? LIMIT 1`,
    tenantId
  );
  return rows[0];
}

/** Liste des salons et de leur influenceur (pour l'ecran d'attribution). */
export async function listTenantReferrals() {
  await ensureInfluencerTables();
  const rows = await prisma.$queryRawUnsafe(
    `SELECT t.id, t.name, t.slug, t.subscription_status, t.subscription_plan,
            t.parent_tenant_id, t.referred_by_influencer_id,
            i.full_name AS influencer_name
       FROM tenants t
       LEFT JOIN influencers i ON i.id = t.referred_by_influencer_id
      ORDER BY t.name ASC`
  );
  return rows;
}
