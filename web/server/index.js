// API Node SalonStore : Better Auth + lecture des donnees MySQL.
// `./env.js` est importe EN PREMIER pour charger le .env avant que ./auth.js ne
// lise process.env (indispensable en dev comme sur Hostinger, ou les variables
// peuvent venir du panneau d'hebergement plutot que d'un fichier).
// Imports statiques uniquement (PAS de top-level await) : le chargeur Node de
// LiteSpeed/Passenger fait un require() du point d'entree, qui refuse l'ESM avec
// top-level await (ERR_REQUIRE_ASYNC_MODULE).
import './env.js';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { hashPassword } from 'better-auth/crypto';
import { auth, authOrigins } from './auth.js';
import { ensureSchemaReady, schemaStatus } from './db-bootstrap.js';
import { prisma } from './prisma.js';
import { HttpError, requireAuth, requireRole, resolveTenant, tenantWhere, ROLES } from './middleware/auth.js';
import { profileDto, tenantDto } from './dto.js';
import { runQuery } from './data.js';
import { assertSubscriptionActive, getSubscriptionEntitlement } from './subscription-entitlement.js';
import { getEmployeeClientStats } from './employee-stats.js';
import { mountStorage, storageRoot } from './storage.js';
import { mountPush } from './push/routes.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + '/..';

const app = express();
// En local : API_PORT (ou 4000). Sur un herbergeur Node (Hostinger/Passenger,
// CloudLinux...) la plateforme injecte `PORT` : il doit primer.
const PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);

app.set('trust proxy', 1);
// JSON : 16 Mo (une image de 10 Mo encodee en base64 pese ~13 Mo). Les videos
// passent par /api/storage/upload en corps brut, jamais ici.
const jsonParser = express.json({ limit: '16mb' });
app.use((req, res, next) => {
  if (req.path === '/api/storage/upload') return next();
  jsonParser(req, res, next);
});

// --- CORS -----------------------------------------------------------------
// En production le front (Netlify) et l'API (Hostinger) sont sur des domaines
// differents : les requetes doivent pouvoir transporter les cookies de session.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && authOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Tenant-Id');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.sendStatus(204);
  }
  next();
});

// --- Better Auth ----------------------------------------------------------
// Le schema (tables account/session/verification, colonnes et comptes
// "credential" manquants, migrations recentes) est mis a niveau
// automatiquement au demarrage. En production la base avait ete importee sans
// ces tables/colonnes : la connexion d'un utilisateur existant et plusieurs
// endpoints (/api/me, /api/public/tenants) echouaient alors en 500.
ensureSchemaReady();

const authNodeHandler = toNodeHandler(auth);
app.all('/api/auth/*splat', (req, res) => {
  ensureSchemaReady()
    .then(() => authNodeHandler(req, res))
    .catch((error) => {
      console.error(`[auth] ${req.method} ${req.originalUrl}`, error);
      if (res.headersSent) {
        res.end();
        return;
      }
      res.status(500).json({
        error: 'AUTH_INTERNAL_ERROR',
        message: "Service d'authentification momentanement indisponible.",
      });
    });
});

// Enveloppe les handlers async pour router leurs exceptions vers next().
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// --- Stockage de fichiers (images / videos) --------------------------------
// `POST /api/storage/upload`, `POST /api/storage/remove`, `GET /api/storage/limits`.
mountStorage(app, wrap);

// --- Notifications push (FCM) ----------------------------------------------
// `GET /api/push/config`, gestion des appareils, et `POST /api/push/cron`.
mountPush(app, wrap);

// --- Sante ----------------------------------------------------------------
app.get(
  '/api/health',
  wrap(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    const [{ n }] = await prisma.$queryRaw`SELECT COUNT(*) n FROM profiles`;
    // Diagnostic public : aucun secret, uniquement la presence des tables
    // d'authentification et le nombre de comptes. Permet de verifier le
    // deploiement sans acces aux logs de l'hebergeur.
    const schema = await schemaStatus();
    res.json({ ok: true, profiles: Number(n), origins: authOrigins, schema });
  })
);

// --- Session courante -----------------------------------------------------
// On renvoie la session ET le profil. Le frontend historique lit
// `currentUser.profile.tenant_id`, d'ou la forme snake_case.
app.get(
  '/api/me',
  wrap(async (req, res) => {
    const ctx = await requireAuth(req);
    const profile = await prisma.profile.findUnique({ where: { id: ctx.user.id } });
    const tenant = ctx.tenantId
      ? await prisma.tenant.findUnique({ where: { id: ctx.tenantId } })
      : null;
    const dto = profileDto(
      profile ? { ...profile, tenantId: ctx.tenantId } : null,
      tenant
    );

    res.json({
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
      image: ctx.user.image ?? null,
      role: ctx.role,
      tenantId: ctx.tenantId,
      tenant_id: ctx.tenantId,
      full_name: dto?.full_name ?? null,
      isActive: ctx.profile.isActive,
      mustChangePassword: ctx.user.mustChangePassword === true,
      emailVerified: ctx.user.emailVerified === true,
      profile: dto,
    });
  })
);

app.get(
  '/api/public/tenants',
  wrap(async (_req, res) => {
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true, showOnHome: true },
      orderBy: { name: 'asc' },
      take: 200,
    });
    const eligible = [];
    const entitlements = new Map();
    for (const tenant of tenants) {
      const rootId = tenant.parentTenantId ?? tenant.id;
      let entitlement = entitlements.get(rootId);
      if (!entitlement) {
        entitlement = await getSubscriptionEntitlement(tenant.id);
        entitlements.set(rootId, entitlement);
      }
      if (entitlement.isActive) eligible.push(tenantDto(tenant));
    }
    res.json({ data: eligible });
  })
);

app.get(
  '/api/public/tenants/:slug',
  wrap(async (req, res) => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: req.params.slug, isActive: true },
    });
    if (!tenant) throw new HttpError(404, 'TENANT_NOT_FOUND', 'Salon non trouvé.');

    const entitlement = await getSubscriptionEntitlement(tenant.id);
    if (!entitlement.isActive) {
      throw new HttpError(404, 'TENANT_NOT_FOUND', 'Salon non trouvé.');
    }
    res.json({ tenant: tenantDto(tenant) });
  })
);

app.get(
  '/api/admin/branches',
  wrap(async (req, res) => {
    const ctx = await requireAuth(req);
    requireRole(ctx, 'admin');
    if (!ctx.tenantId) throw new HttpError(403, 'TENANT_REQUIRED', 'Un etablissement est requis.');

    const activeTenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { id: true, parentTenantId: true },
    });
    if (!activeTenant) throw new HttpError(404, 'TENANT_NOT_FOUND', 'Etablissement introuvable.');
    const rootId = activeTenant.parentTenantId ?? activeTenant.id;

    const [tenants, memberships] = await Promise.all([
      prisma.tenant.findMany({
        where: { OR: [{ id: rootId }, { parentTenantId: rootId }] },
        orderBy: [{ parentTenantId: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.userTenant.findMany({
        where: { userId: ctx.user.id, role: 'admin' },
        select: { tenantId: true },
      }),
    ]);
    const accessibleIds = new Set(memberships.map(({ tenantId }) => tenantId));
    accessibleIds.add(ctx.profile.tenantId);

    const entitlement = await getSubscriptionEntitlement(ctx.tenantId);
    res.json({
      data: tenants
        .filter((tenant) => accessibleIds.has(tenant.id))
        .map((tenant) => ({
          ...tenantDto(tenant),
          is_main: tenant.id === rootId,
          is_active: Boolean(tenant.isActive),
        })),
      entitlement,
    });
  })
);

app.get(
  '/api/admin/subscription/status',
  wrap(async (req, res) => {
    const ctx = await requireAuth(req);
    requireRole(ctx, 'admin');
    if (!ctx.tenantId) throw new HttpError(403, 'TENANT_REQUIRED', 'Un etablissement est requis.');
    res.json(await getSubscriptionEntitlement(ctx.tenantId));
  })
);

app.post(
  '/api/admin/branches',
  wrap(async (req, res) => {
    const ctx = await requireAuth(req);
    requireRole(ctx, 'admin');
    if (!ctx.tenantId) throw new HttpError(403, 'TENANT_REQUIRED', 'Un etablissement est requis.');

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const address = typeof req.body?.address === 'string' ? req.body.address.trim() : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const city = typeof req.body?.city === 'string' ? req.body.city.trim() : '';
    if (!name || name.length > 255) {
      throw new HttpError(400, 'INVALID_NAME', 'Le nom du salon est requis (255 caracteres maximum).');
    }
    if (email.length > 255 || phone.length > 50 || city.length > 100) {
      throw new HttpError(400, 'INVALID_CONTACT', 'Les coordonnees saisies sont trop longues.');
    }

    const activeTenant = await prisma.tenant.findUnique({ where: { id: ctx.tenantId } });
    if (!activeTenant) throw new HttpError(404, 'TENANT_NOT_FOUND', 'Etablissement introuvable.');
    const rootId = activeTenant.parentTenantId ?? activeTenant.id;
    const root = await prisma.tenant.findUnique({ where: { id: rootId } });
    if (!root) throw new HttpError(404, 'TENANT_NOT_FOUND', 'Etablissement principal introuvable.');
    const entitlement = await assertSubscriptionActive(ctx);
    if (entitlement.remainingBranches <= 0) {
      throw new HttpError(
        403,
        'BRANCH_LIMIT_REACHED',
        `Votre abonnement autorise ${entitlement.branchLimit} succursale(s). Choisissez un abonnement supérieur pour en ajouter.`
      );
    }

    const groupTenants = await prisma.tenant.findMany({
      where: { OR: [{ id: rootId }, { parentTenantId: rootId }] },
      select: { id: true },
    });
    const groupIds = groupTenants.map(({ id }) => id);
    const groupAdminMemberships = await prisma.userTenant.findMany({
      where: { tenantId: { in: groupIds }, role: 'admin' },
      select: { userId: true },
    });
    const adminIds = [...new Set([ctx.user.id, ...groupAdminMemberships.map(({ userId }) => userId)])]
      .filter(Boolean);

    const baseSlug = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70) || 'salon';
    const slug = `${baseSlug}-${randomUUID().slice(0, 8)}`;
    const created = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${rootId} FOR UPDATE`;
      const currentBranchCount = await tx.tenant.count({ where: { parentTenantId: rootId } });
      if (currentBranchCount >= entitlement.branchLimit) {
        throw new HttpError(
          403,
          'BRANCH_LIMIT_REACHED',
          `Votre abonnement autorise ${entitlement.branchLimit} succursale(s). Choisissez un abonnement supérieur pour en ajouter.`
        );
      }
      const branch = await tx.tenant.create({
        data: {
          id: randomUUID(),
          parentTenantId: rootId,
          name,
          slug,
          address: address || null,
          phone: phone || null,
          email: email || null,
          city: city || null,
          subscriptionPlan: root.subscriptionPlan,
          subscriptionStatus: root.subscriptionStatus,
          subscriptionStart: root.subscriptionStart,
          subscriptionEnd: root.subscriptionEnd,
          subscriptionMode: root.subscriptionMode,
          externalPaymentRef: root.externalPaymentRef,
          externalPaymentDate: root.externalPaymentDate,
          externalPaymentExpiry: root.externalPaymentExpiry,
          isActive: true,
        },
      });

      await tx.userTenant.createMany({
        data: [...new Set([...groupIds, branch.id])].flatMap((tenantId) =>
          adminIds.map((userId) => ({ userId, tenantId, role: 'admin' }))
        ),
        skipDuplicates: true,
      });
      return branch;
    });

    res.status(201).json({
      branch: { ...tenantDto(created), is_main: false, is_active: true },
    });
  })
);

app.patch(
  '/api/admin/branches/:id',
  wrap(async (req, res) => {
    const ctx = await requireAuth(req);
    requireRole(ctx, 'admin');
    if (!ctx.tenantId) throw new HttpError(403, 'TENANT_REQUIRED', 'Un etablissement est requis.');
    await assertSubscriptionActive(ctx);

    const activeTenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { id: true, parentTenantId: true },
    });
    if (!activeTenant) throw new HttpError(404, 'TENANT_NOT_FOUND', 'Etablissement introuvable.');
    const rootId = activeTenant.parentTenantId ?? activeTenant.id;
    const target = await prisma.tenant.findFirst({
      where: { id: req.params.id, parentTenantId: rootId },
      select: { id: true },
    });
    if (!target) throw new HttpError(404, 'BRANCH_NOT_FOUND', 'Succursale introuvable.');

    const membership = await prisma.userTenant.findFirst({
      where: { userId: ctx.user.id, tenantId: target.id, role: 'admin' },
      select: { id: true },
    });
    if (!membership) throw new HttpError(403, 'TENANT_FORBIDDEN', "Vous n'administrez pas cette succursale.");

    const body = req.body ?? {};
    const data = {};
    const maxLengths = { name: 255, phone: 50, email: 255, city: 100 };
    for (const field of ['name', 'address', 'phone', 'email', 'city']) {
      if (!(field in body)) continue;
      if (body[field] !== null && typeof body[field] !== 'string') {
        throw new HttpError(400, 'INVALID_INPUT', `Champ ${field} invalide.`);
      }
      const value = typeof body[field] === 'string' ? body[field].trim() : '';
      if (field === 'name' && !value) {
        throw new HttpError(400, 'INVALID_NAME', 'Le nom du salon est requis.');
      }
      if (value.length > (maxLengths[field] ?? 10000)) {
        throw new HttpError(400, 'INVALID_INPUT', `Le champ ${field} est trop long.`);
      }
      data[field] = value || null;
    }
    if ('isActive' in body) {
      if (typeof body.isActive !== 'boolean') {
        throw new HttpError(400, 'INVALID_INPUT', 'Statut du salon invalide.');
      }
      data.isActive = body.isActive;
    }
    if (Object.keys(data).length === 0) {
      throw new HttpError(400, 'EMPTY_UPDATE', 'Aucune modification fournie.');
    }
    const updated = await prisma.tenant.update({
      where: { id: target.id },
      data,
    });
    res.json({ branch: { ...tenantDto(updated), is_main: false, is_active: Boolean(updated.isActive) } });
  })
);

// --- Promotion / changement de role ---------------------------------------
// Remplace les appels `supabase.from('profiles').update({ role })` de l'ancien
// frontend. Regles : un admin ne touche que son propre tenant et ne peut pas
// nommer super_admin ; seul un super_admin attribue ou retire ce role.
app.patch(
  '/api/profiles/:id',
  wrap(async (req, res) => {
    const ctx = await requireAuth(req);
    requireRole(ctx, 'admin');
    await assertSubscriptionActive(ctx);

    const { role, tenant_id: tenantId = null } = req.body ?? {};
    if (!role || !Object.hasOwn(ROLES, role)) {
      throw new HttpError(400, 'INVALID_ROLE', 'Role invalide.');
    }

    const target = await prisma.profile.findUnique({ where: { id: req.params.id } });
    if (!target) throw new HttpError(404, 'NOT_FOUND', 'Profil introuvable.');

    const isSuperAdmin = ctx.role === 'super_admin';
    if (role === 'super_admin' && !isSuperAdmin) {
      throw new HttpError(403, 'FORBIDDEN', 'Seul un super_admin peut attribuer ce role.');
    }
    if (!isSuperAdmin) {
      if (target.role === 'super_admin' || (ROLES[target.role] ?? 0) > ctx.level) {
        throw new HttpError(403, 'FORBIDDEN', 'Vous ne pouvez pas modifier un compte superieur.');
      }
      if (tenantId !== ctx.tenantId) {
        throw new HttpError(403, 'TENANT_FORBIDDEN', "Vous ne pouvez assigner que votre etablissement.");
      }
    }
    if (role !== 'super_admin' && tenantId === null) {
      throw new HttpError(400, 'TENANT_REQUIRED', 'Un role autre que super_admin exige un etablissement.');
    }

    const updated = await prisma.profile.update({
      where: { id: target.id },
      data: { role, tenantId },
    });
    const tenant = tenantId ? await prisma.tenant.findUnique({ where: { id: tenantId } }) : null;
    res.json({ success: true, profile: profileDto(updated, tenant) });
  })
);

app.patch(
  '/api/admin/employees/:id',
  wrap(async (req, res) => {
    const ctx = await requireAuth(req);
    requireRole(ctx, 'admin');
    await assertSubscriptionActive(ctx);

    if (!ctx.tenantId) {
      throw new HttpError(403, 'TENANT_REQUIRED', 'Un etablissement est requis.');
    }

    const body = req.body ?? {};
    const allowed = new Set([
      'full_name',
      'phone',
      'is_active',
      'position',
      'commission_rate',
      'is_cashier',
    ]);
    const keys = Object.keys(body);
    if (!keys.length || keys.some((key) => !allowed.has(key))) {
      throw new HttpError(400, 'INVALID_INPUT', 'Champs employe invalides.');
    }
    if ('full_name' in body && (typeof body.full_name !== 'string' || !body.full_name.trim())) {
      throw new HttpError(400, 'INVALID_INPUT', 'Le nom est obligatoire.');
    }
    if ('phone' in body && body.phone !== null && typeof body.phone !== 'string') {
      throw new HttpError(400, 'INVALID_INPUT', 'Telephone invalide.');
    }
    if ('is_active' in body && typeof body.is_active !== 'boolean') {
      throw new HttpError(400, 'INVALID_INPUT', 'Statut employe invalide.');
    }
    if ('is_cashier' in body && typeof body.is_cashier !== 'boolean') {
      throw new HttpError(400, 'INVALID_INPUT', 'Statut caissier invalide.');
    }
    if (
      'commission_rate' in body &&
      (typeof body.commission_rate !== 'number' || !Number.isFinite(body.commission_rate))
    ) {
      throw new HttpError(400, 'INVALID_INPUT', 'Taux de commission invalide.');
    }
    if ('position' in body && body.position !== null && typeof body.position !== 'string') {
      throw new HttpError(400, 'INVALID_INPUT', 'Poste invalide.');
    }

    const employee = await prisma.employee.findFirst({
      where: { id: req.params.id, tenantId: ctx.tenantId },
      select: {
        id: true,
        profileId: true,
        archivedAt: true,
        profile: { select: { role: true } },
      },
    });
    if (!employee) throw new HttpError(404, 'NOT_FOUND', 'Employe introuvable.');
    if ((ROLES[employee.profile.role] ?? 0) > ctx.level) {
      throw new HttpError(403, 'FORBIDDEN', 'Vous ne pouvez pas modifier un compte superieur.');
    }
    if (body.is_active === true && employee.archivedAt) {
      throw new HttpError(409, 'EMPLOYEE_ARCHIVED', 'Restaurez cet employe avant de le reactiver.');
    }

    const profileData = {};
    if ('full_name' in body) profileData.name = body.full_name.trim();
    if ('phone' in body) profileData.phone = body.phone;
    if ('is_active' in body) profileData.isActive = body.is_active;

    const employeeData = {};
    if ('position' in body) employeeData.position = body.position;
    if ('commission_rate' in body) employeeData.commissionRate = body.commission_rate;
    if ('is_cashier' in body) employeeData.isCashier = body.is_cashier;
    if ('is_active' in body) {
      employeeData.isActive = body.is_active;
      employeeData.isAvailable = body.is_active;
    }

    await prisma.$transaction([
      ...(Object.keys(profileData).length
        ? [prisma.profile.update({ where: { id: employee.profileId }, data: profileData })]
        : []),
      ...(Object.keys(employeeData).length
        ? [prisma.employee.update({ where: { id: employee.id }, data: employeeData })]
        : []),
    ]);

    res.json({ success: true });
  })
);

app.patch(
  '/api/admin/employees/:id/lifecycle',
  wrap(async (req, res) => {
    const ctx = await requireAuth(req);
    requireRole(ctx, 'admin');
    await assertSubscriptionActive(ctx);

    const { action } = req.body ?? {};
    if (!['activate', 'deactivate', 'archive', 'restore'].includes(action)) {
      throw new HttpError(400, 'INVALID_ACTION', 'Action employé invalide.');
    }

    const employee = await prisma.employee.findFirst({
      where: { id: req.params.id, tenantId: ctx.tenantId },
      select: { id: true, profileId: true, archivedAt: true },
    });
    if (!employee) throw new HttpError(404, 'NOT_FOUND', 'Employé introuvable.');
    if (action === 'activate' && employee.archivedAt) {
      throw new HttpError(409, 'EMPLOYEE_ARCHIVED', 'Restaurez cet employé avant de le réactiver.');
    }
    const isArchived = Boolean(employee.archivedAt);
    if ((action === 'archive' && isArchived) || (action === 'restore' && !isArchived)) {
      throw new HttpError(409, 'INVALID_EMPLOYEE_STATE', 'Le statut historique de cet employé a changé.');
    }

    const active = action === 'activate' || action === 'restore';
    const archivedAt = action === 'archive' ? new Date() : action === 'restore' ? null : undefined;
    await prisma.$transaction([
      prisma.employee.update({
        where: { id: employee.id },
        data: {
          isActive: active,
          isAvailable: active,
          ...(archivedAt === undefined ? {} : { archivedAt }),
        },
      }),
      prisma.profile.update({
        where: { id: employee.profileId },
        data: { isActive: active },
      }),
    ]);

    res.json({
      success: true,
      is_active: active,
      archived_at: archivedAt === undefined ? employee.archivedAt : archivedAt,
    });
  })
);

app.get(
  '/api/admin/cashier/summary',
  wrap(async (req, res) => {
    const ctx = await requireAuth(req);
    requireRole(ctx, 'admin');
    if (!ctx.tenantId) {
      throw new HttpError(403, 'TENANT_REQUIRED', 'Un etablissement est requis.');
    }

    const parseBoundary = (value, name) => {
      if (typeof value !== 'string' || !value) {
        throw new HttpError(400, 'INVALID_DATE', `Date ${name} requise.`);
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new HttpError(400, 'INVALID_DATE', `Date ${name} invalide.`);
      }
      return date;
    };

    const todayStart = parseBoundary(req.query.todayStart, 'todayStart');
    const tomorrowStart = parseBoundary(req.query.tomorrowStart, 'tomorrowStart');
    const monthStart = parseBoundary(req.query.monthStart, 'monthStart');
    if (todayStart >= tomorrowStart || monthStart > todayStart) {
      throw new HttpError(400, 'INVALID_DATE_RANGE', 'Periode de caisse invalide.');
    }

    const [rows] = await prisma.$queryRaw`
      SELECT
        COALESCE(SUM(CASE
          WHEN transaction_date >= ${todayStart} AND transaction_date < ${tomorrowStart}
          THEN CASE WHEN total_after_discount IS NULL OR total_after_discount = 0
            THEN amount ELSE total_after_discount END
          ELSE 0
        END), 0) AS todayRevenue,
        COUNT(CASE WHEN transaction_date >= ${monthStart} THEN 1 END) AS monthlyTransactions,
        COALESCE(SUM(CASE
          WHEN total_after_discount IS NULL OR total_after_discount = 0
            THEN amount ELSE total_after_discount END
        ), 0) AS totalRevenue,
        COUNT(*) AS completedTransactions,
        COALESCE(SUM(CASE WHEN transaction_type = 'product_sale' OR source = 'cashier_sale'
          THEN CASE WHEN total_after_discount IS NULL OR total_after_discount = 0
            THEN amount ELSE total_after_discount END ELSE 0 END), 0) AS productRevenue,
        COALESCE(SUM(CASE WHEN transaction_type = 'appointment' OR source = 'cashier_appointment'
          THEN CASE WHEN total_after_discount IS NULL OR total_after_discount = 0
            THEN amount ELSE total_after_discount END ELSE 0 END), 0) AS appointmentRevenue,
        COALESCE(SUM(CASE WHEN source = 'gallery_order'
          THEN CASE WHEN total_after_discount IS NULL OR total_after_discount = 0
            THEN amount ELSE total_after_discount END ELSE 0 END), 0) AS galleryRevenue,
        COALESCE(SUM(CASE WHEN transaction_type = 'ticket_payment' OR source = 'ticket_completed'
          THEN CASE WHEN total_after_discount IS NULL OR total_after_discount = 0
            THEN amount ELSE total_after_discount END ELSE 0 END), 0) AS ticketRevenue
      FROM transactions
      WHERE tenant_id = ${ctx.tenantId} AND status = 'completed' AND amount > 0
    `;

    const revenue = Number(rows.totalRevenue);
    const count = Number(rows.completedTransactions);
    res.json({
      todayRevenue: Number(rows.todayRevenue),
      monthlyTransactions: Number(rows.monthlyTransactions),
      totalRevenue: revenue,
      averageValue: count ? revenue / count : 0,
      productRevenue: Number(rows.productRevenue),
      appointmentRevenue: Number(rows.appointmentRevenue),
      galleryRevenue: Number(rows.galleryRevenue),
      ticketRevenue: Number(rows.ticketRevenue),
    });
  })
);

app.post(
  '/api/admin/tickets/:id/payment',
  wrap(async (req, res) => {
    const ctx = await requireAuth(req);
    requireRole(ctx, 'admin');
    await assertSubscriptionActive(ctx);
    if (!ctx.tenantId) {
      throw new HttpError(403, 'TENANT_REQUIRED', 'Un etablissement est requis.');
    }

    const { amount, receivedAmount, paymentMethod, receiptNumber } = req.body ?? {};
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 99999999.99) {
      throw new HttpError(400, 'INVALID_AMOUNT', 'Montant a encaisser invalide.');
    }
    if (typeof receivedAmount !== 'number' || !Number.isFinite(receivedAmount) || receivedAmount < amount) {
      throw new HttpError(400, 'INSUFFICIENT_PAYMENT', 'Le montant recu est inferieur au montant a payer.');
    }
    if (!['cash', 'card', 'orange_money', 'moov_money', 'wave'].includes(paymentMethod)) {
      throw new HttpError(400, 'INVALID_PAYMENT_METHOD', 'Methode de paiement invalide.');
    }
    if (typeof receiptNumber !== 'string' || !receiptNumber.trim() || receiptNumber.length > 100) {
      throw new HttpError(400, 'INVALID_RECEIPT', 'Numero de recu invalide.');
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM tickets
        WHERE id = ${req.params.id} AND tenant_id = ${ctx.tenantId}
        FOR UPDATE
      `;
      const ticket = await tx.ticket.findFirst({
        where: { id: req.params.id, tenantId: ctx.tenantId },
      });
      if (!ticket) throw new HttpError(404, 'NOT_FOUND', 'Ticket introuvable.');

      const existing = await tx.transaction.findFirst({
        where: {
          tenantId: ctx.tenantId,
          OR: [{ ticketId: ticket.id }, ...(ticket.transactionId ? [{ id: ticket.transactionId }] : [])],
        },
        orderBy: { createdAt: 'desc' },
      });

      if (ticket.paymentStatus === 'paid' || ticket.transactionId || existing) {
        if (!existing || existing.status !== 'completed') {
          throw new HttpError(409, 'TICKET_PAYMENT_CONFLICT', 'Le paiement de ce ticket necessite une verification.');
        }
        if (ticket.paymentStatus !== 'paid' || ticket.transactionId !== existing.id) {
          await tx.ticket.update({
            where: { id: ticket.id },
            data: {
              paymentStatus: 'paid',
              transactionId: existing.id,
              servicePrice: existing.amount,
            },
          });
        }
        return { transaction: existing, alreadyPaid: true };
      }

      if (!['completed', 'archived'].includes(ticket.status ?? '') || !ticket.completedAt) {
        throw new HttpError(409, 'TICKET_NOT_COMPLETED', 'Le service doit etre termine avant encaissement.');
      }

      let cashierId = null;
      const cashier = await tx.employee.findFirst({
        where: { tenantId: ctx.tenantId, profileId: ctx.user.id },
        select: { id: true },
      });
      if (cashier) cashierId = cashier.id;

      let finalReceiptNumber = receiptNumber.trim();
      if (await tx.transaction.findUnique({ where: { receiptNumber: finalReceiptNumber } })) {
        finalReceiptNumber = `RCP-${Date.now()}-${randomUUID().slice(0, 8)}`;
      }

      const transaction = await tx.transaction.create({
        data: {
          tenantId: ctx.tenantId,
          clientId: ticket.clientId,
          cashierId,
          employeeId: ticket.assignedEmployeeId,
          ticketId: ticket.id,
          amount,
          totalAfterDiscount: amount,
          paymentMethod,
          receiptNumber: finalReceiptNumber,
          status: 'completed',
          transactionType: 'ticket_payment',
          source: 'ticket_completed',
          customerName: ticket.clientName || 'Client',
          customerPhone: ticket.clientPhone || '',
          notes: `Ticket #${ticket.ticketNumber} - ${ticket.serviceType || 'Service'}`,
        },
      });

      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          paymentStatus: 'paid',
          transactionId: transaction.id,
          servicePrice: amount,
        },
      });

      return { transaction, alreadyPaid: false };
    });

    const transaction = result.transaction;
    const amountPaid = Number(transaction.amount);
    res.json({
      already_paid: result.alreadyPaid,
      change: Math.max(0, receivedAmount - amountPaid),
      transaction: {
        id: transaction.id,
        tenant_id: transaction.tenantId,
        client_id: transaction.clientId,
        ticket_id: transaction.ticketId,
        employee_id: transaction.employeeId,
        amount: amountPaid,
        total_after_discount: Number(transaction.totalAfterDiscount ?? transaction.amount),
        payment_method: transaction.paymentMethod,
        receipt_number: transaction.receiptNumber,
        status: transaction.status,
        transaction_date: transaction.transactionDate?.toISOString() ?? null,
        transaction_type: transaction.transactionType,
        source: transaction.source,
        customer_name: transaction.customerName,
        customer_phone: transaction.customerPhone,
        notes: transaction.notes,
      },
    });
  })
);

// --- Creation d'un utilisateur --------------------------------------------
// Remplace `supabaseAdmin.auth.admin.createUser` de l'ancien frontend. La table
// `profiles` EST la table user de Better Auth : on cree le profil ET le compte
// credential (hash Better Auth) dans une transaction, au lieu de passer par
// /sign-up/email (pas de session ni d'email de verification a gerer ici).
app.post(
  '/api/admin/users',
  wrap(async (req, res) => {
    const ctx = await requireAuth(req);
    requireRole(ctx, 'admin');
    await assertSubscriptionActive(ctx);

    const body = req.body ?? {};
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const name = body.full_name ?? body.fullName ?? body.name ?? '';
    const phone = body.phone ?? null;
    const role = body.role ?? 'client';
    const tenantId = body.tenant_id ?? body.tenantId ?? null;
    const position = body.position ?? null;
    const commissionRate = body.commission_rate ?? 0;
    const isCashier = body.is_cashier ?? false;

    if (!email || !password) {
      throw new HttpError(400, 'INVALID_INPUT', 'Email et mot de passe requis.');
    }
    if (password.length < 8) {
      throw new HttpError(400, 'WEAK_PASSWORD', 'Le mot de passe doit contenir au moins 8 caracteres.');
    }
    if (!Object.hasOwn(ROLES, role)) {
      throw new HttpError(400, 'INVALID_ROLE', 'Role invalide.');
    }

    const isSuperAdmin = ctx.role === 'super_admin';
    if (!isSuperAdmin) {
      if (role !== 'client' && role !== 'employee') {
        throw new HttpError(403, 'FORBIDDEN', 'Vous ne pouvez creer que des clients ou des employes.');
      }
      if (tenantId !== ctx.tenantId) {
        throw new HttpError(403, 'TENANT_FORBIDDEN', 'Vous ne pouvez creer que dans votre etablissement.');
      }
    }
    if (role !== 'super_admin' && !tenantId) {
      throw new HttpError(400, 'TENANT_REQUIRED', 'Un role autre que super_admin exige un etablissement.');
    }
    if (role === 'employee') {
      if (position !== null && typeof position !== 'string') {
        throw new HttpError(400, 'INVALID_INPUT', 'Poste invalide.');
      }
      if (typeof commissionRate !== 'number' || !Number.isFinite(commissionRate)) {
        throw new HttpError(400, 'INVALID_INPUT', 'Taux de commission invalide.');
      }
      if (typeof isCashier !== 'boolean') {
        throw new HttpError(400, 'INVALID_INPUT', 'Statut caissier invalide.');
      }
    }

    const existing = await prisma.profile.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, 'EMAIL_TAKEN', 'Cet email est deja utilise.');

    const hashed = await hashPassword(password);
    const created = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.create({
        data: {
          id: randomUUID(),
          email,
          name: name || email,
          phone,
          role,
          tenantId,
          isActive: true,
          emailVerified: true,
          mustChangePassword: false,
        },
      });
      await tx.account.create({
        data: {
          id: randomUUID(),
          accountId: profile.id,
          providerId: 'credential',
          userId: profile.id,
          password: hashed,
        },
      });
      if (role === 'employee') {
        await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`;
        const latest = await tx.employee.aggregate({
          where: { tenantId },
          _max: { employeeNumber: true },
        });
        await tx.employee.create({
          data: {
            id: randomUUID(),
            tenantId,
            profileId: profile.id,
            employeeNumber: (latest._max.employeeNumber ?? 0) + 1,
            position,
            commissionRate,
            isCashier,
            isAvailable: true,
            isActive: true,
          },
        });
      }
      return profile;
    });

    const tenant = tenantId ? await prisma.tenant.findUnique({ where: { id: tenantId } }) : null;
    res.status(201).json({
      user: { id: created.id, email: created.email },
      profile: profileDto(created, tenant),
    });
  })
);

// --- Suppression d'un utilisateur -----------------------------------------
// Remplace `supabaseAdmin.auth.admin.deleteUser`. Les fiches clients/employes
// liees au profil ont des FK ON DELETE CASCADE : supprimer le profil suffit.
// Idempotent, car les pages suppriment d'abord le profil via /api/data/query.
app.delete(
  '/api/admin/users/:id',
  wrap(async (req, res) => {
    const ctx = await requireAuth(req);
    requireRole(ctx, 'admin');
    await assertSubscriptionActive(ctx);

    const target = await prisma.profile.findUnique({ where: { id: req.params.id } });
    if (!target) return res.json({ success: true, deleted: 0 });

    if (target.id === ctx.user.id) {
      throw new HttpError(400, 'SELF_DELETE', 'Impossible de supprimer votre propre compte.');
    }
    const isSuperAdmin = ctx.role === 'super_admin';
    if (!isSuperAdmin) {
      if (target.role === 'super_admin' || (ROLES[target.role] ?? 0) > ctx.level) {
        throw new HttpError(403, 'FORBIDDEN', 'Vous ne pouvez pas supprimer un compte superieur.');
      }
      if (target.tenantId !== ctx.tenantId) {
        throw new HttpError(403, 'TENANT_FORBIDDEN', 'Hors de votre etablissement.');
      }
    }

    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: target.id } }),
      prisma.account.deleteMany({ where: { userId: target.id } }),
      prisma.profile.delete({ where: { id: target.id } }),
    ]);
    res.json({ success: true, deleted: 1 });
  })
);

// --- Services (lecture) ---------------------------------------------------
// Equivalent de : supabase.from('services').select('*').eq('tenant_id', tenantId)
// Remplace le filtre manuel par une resolution de tenant centralisee.
app.get(
  '/api/services',
  wrap(async (req, res) => {
    const ctx = await requireAuth(req);
    const scope = resolveTenant(ctx, req.query);

    const services = await prisma.service.findMany({
      where: tenantWhere(scope),
      orderBy: { name: 'asc' },
    });

    // DTO en snake_case : le frontend consomme historiquement du snake_case
    // (PostgREST), on evite ainsi de reecrire une centaine de composants.
    res.json(
      services.map((s) => ({
        id: s.id,
        tenant_id: s.tenantId,
        name: s.name,
        description: s.description,
        price: s.price === null ? null : Number(s.price),
        duration: s.duration,
        is_active: s.isActive,
        category: s.category,
        created_at: s.createdAt,
      }))
    );
  })
);

// --- Compteur de tickets (equivalent du RPC next_booking_number) ----------
app.get(
  '/api/tickets/next-number',
  wrap(async (req, res) => {
    const ctx = await requireAuth(req);
    requireRole(ctx, 'employee');
    const scope = resolveTenant(ctx, req.query);
    const [{ n }] = await prisma.$queryRaw`
      SELECT COUNT(*) n FROM \`tickets\` WHERE tenant_id = ${scope.tenantId}
    `;
    res.json({ next_number: `T-${String(Number(n) + 1).padStart(4, '0')}` });
  })
);

// --- Requetes de donnees generiques ---------------------------------------
// Remplace PostgREST (`supabase.from(...).select(...)`) pour les ~110 fichiers
// du frontend qui utilisent encore le client Supabase. Le contrat de reponse
// reste `{ data, error }`, donc la couche de compatibilite peut transparente.
//
// Securite : la table et les colonnes sont validees contre le schema, et le
// perimetre tenant est impose par la session (voir server/data.js).
//
// Un visiteur SANS session accede malgre tout a un perimetre public restreint
// (vitrine du salon, file d'attente, reservation). data.js n'autorise alors
// qu'une liste blanche de lectures et la creation de tickets / rendez-vous /
// clients / avis, toujours limites a un etablissement actif. Les autres 401
// (compte desactive, banni, profil manquant) ne sont pas convertis en acces
// public.
app.post(
  '/api/data/query',
  wrap(async (req, res) => {
    let ctx;
    try {
      ctx = await requireAuth(req);
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 401) throw error;
      ctx = { role: 'public', tenantId: null, level: 0, user: null, profile: null };
    }
    // Seul un super_admin peut restreindre la requete a un tenant donne ; pour
    // tout autre role le tenant vient de la session et rien d'autre. Le
    // visiteur public, lui, n'a pas de tenant : le perimetre est construit
    // dans runQuery (etablissements actifs uniquement).
    if (ctx.role === 'public') {
      ctx.queryTenantId = null;
    } else {
      ctx.queryTenantId = req.body?.scopeTenantId ?? null;
      if (ctx.queryTenantId && ctx.role !== 'super_admin') {
        throw new HttpError(403, 'TENANT_FORBIDDEN', "Vous n'accedez qu'a votre etablissement.");
      }
    }
    res.json(await runQuery(ctx, req.body ?? {}));
  })
);


// --- Front statique (production : meme domaine que l'API) ------------------
// En dev, Vite sert le front sur :3000 et proxifie /api vers :4000. En prod sur
// Hostinger, salonafrique.net pointe sur ce serveur : il doit donc exposer le
// build Vite (dist/) sous le meme origine que l'API, cookies de session compris.
const DIST = path.join(ROOT, 'dist');
const hasDist = existsSync(path.join(DIST, 'index.html'));

// --- Fichiers uploades (images / videos) -----------------------------------
// Monte avant le repli SPA : /storage/... doit renvoyer le fichier lui-meme.
// Le dossier peut ne pas encore exister au demarrage : express.static passe
// alors la main (fallthrough) et creer le fichier au premier upload suffit.
app.use(
  '/storage',
  express.static(storageRoot(), { index: false, fallthrough: true, maxAge: '7d' })
);

if (hasDist) {
  // Fichiers haches : Vite genere des noms avec hash, on peut tout mettre en cache.
  app.use(
    '/assets',
    express.static(path.join(DIST, 'assets'), { immutable: true, maxAge: '365d' })
  );
  app.use(express.static(DIST, { index: false, maxAge: '1h' }));
}

// Repli SPA : toute requete GET hors /api et /storage renvoie index.html (routage
// React). Sans cela, un rafraichissement sur /admin/... renverrait 404.
app.get('{*splat}', (req, res, next) => {
  if (!hasDist || req.path.startsWith('/api/') || req.path.startsWith('/storage/')) {
    return next();
  }
  res.sendFile(path.join(DIST, 'index.html'));
});

// --- Middleware d'erreur --------------------------------------------------
// Doit imperativement etre enregistre APRES toutes les routes : Express ne
// remonte vers les handlers d'erreur que dans l'ordre, donc un handler place
// plus haut ne voit jamais les erreurs des routes declarees apres lui.
app.use((err, req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.code, message: err.message });
  }
  // Corps trop volumineux (body-parser / express.json) : on repond 413 et pas
  // 500, le front affiche alors la limite concernee.
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({
      error: 'FILE_TOO_LARGE',
      message: 'Requete trop volumineuse : fichier ou envoi trop important.',
    });
  }
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({ error: 'INVALID_JSON', message: 'Corps JSON invalide.' });
  }
  console.error('[api]', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erreur interne.' });
});

app.listen(PORT, () => {
  console.log(`[api] http://localhost:${PORT}  (auth: /api/auth/*)`);
  console.log(`[api] origines autorisees: ${authOrigins.join(', ')}`);
});