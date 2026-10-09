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
import { prisma } from './prisma.js';
import { HttpError, requireAuth, requireRole, resolveTenant, tenantWhere, ROLES } from './middleware/auth.js';
import { profileDto, tenantDto } from './dto.js';
import { runQuery } from './data.js';
import { getEmployeeClientStats } from './employee-stats.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + '/..';

const app = express();
// En local : API_PORT (ou 4000). Sur un herbergeur Node (Hostinger/Passenger,
// CloudLinux...) la plateforme injecte `PORT` : il doit primer.
const PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);

app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.sendStatus(204);
  }
  next();
});

// --- Better Auth ----------------------------------------------------------
app.all('/api/auth/*splat', toNodeHandler(auth));

// Enveloppe les handlers async pour router leurs exceptions vers next().
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// --- Sante ----------------------------------------------------------------
app.get(
  '/api/health',
  wrap(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    const [{ n }] = await prisma.$queryRaw`SELECT COUNT(*) n FROM profiles`;
    res.json({ ok: true, profiles: Number(n), origins: authOrigins });
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
    const dto = profileDto(profile, tenant);

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

// --- Promotion / changement de role ---------------------------------------
// Remplace les appels `supabase.from('profiles').update({ role })` de l'ancien
// frontend. Regles : un admin ne touche que son propre tenant et ne peut pas
// nommer super_admin ; seul un super_admin attribue ou retire ce role.
app.patch(
  '/api/profiles/:id',
  wrap(async (req, res) => {
    const ctx = await requireAuth(req);
    requireRole(ctx, 'admin');

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

    const body = req.body ?? {};
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const name = body.full_name ?? body.fullName ?? body.name ?? '';
    const phone = body.phone ?? null;
    const role = body.role ?? 'client';
    const tenantId = body.tenant_id ?? body.tenantId ?? null;

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
app.post(
  '/api/data/query',
  wrap(async (req, res) => {
    const ctx = await requireAuth(req);
    // Seul un super_admin peut restreindre la requete a un tenant donne ; pour
    // tout autre role le tenant vient de la session et rien d'autre.
    ctx.queryTenantId = req.body?.scopeTenantId ?? null;
    if (ctx.queryTenantId && ctx.role !== 'super_admin') {
      throw new HttpError(403, 'TENANT_FORBIDDEN', "Vous n'accedez qu'a votre etablissement.");
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

if (hasDist) {
  // Fichiers haches : Vite genere des noms avec hash, on peut tout mettre en cache.
  app.use(
    '/assets',
    express.static(path.join(DIST, 'assets'), { immutable: true, maxAge: '365d' })
  );
  app.use(express.static(DIST, { index: false, maxAge: '1h' }));
}

// Repli SPA : toute requete GET hors /api renvoie index.html (routage React).
// Sans cela, un rafraichissement sur /admin/... renverrait 404.
app.get('{*splat}', (req, res, next) => {
  if (!hasDist || req.path.startsWith('/api/')) return next();
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
  console.error('[api]', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erreur interne.' });
});

app.listen(PORT, () => {
  console.log(`[api] http://localhost:${PORT}  (auth: /api/auth/*)`);
  console.log(`[api] origines autorisees: ${authOrigins.join(', ')}`);
});