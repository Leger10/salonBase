// API Node SalonStore : Better Auth + lecture des donnees MySQL.
// Charge le .env avant tout import (Node ne le fait pas tout seul, contrairement
// au CLI Prisma). Indispensable en dev comme sur Hostinger, ou les variables
// peuvent provenir du panneau d'hebergement plutot que d'un fichier.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const ENV_FILE = process.env.ENV_FILE ?? path.join(ROOT, '.env');

if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const { default: express } = await import('express');
const { toNodeHandler } = await import('better-auth/node');
const { auth, authOrigins } = await import('./auth.js');
const { prisma } = await import('./prisma.js');
const { HttpError, requireAuth, requireRole, resolveTenant, tenantWhere } = await import(
  './middleware/auth.js'
);

const app = express();
const PORT = Number(process.env.API_PORT ?? 4000);

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
app.get(
  '/api/me',
  wrap(async (req, res) => {
    const ctx = await requireAuth(req);
    res.json({
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
      role: ctx.role,
      tenantId: ctx.tenantId,
      isActive: ctx.profile.isActive,
      mustChangePassword: ctx.user.mustChangePassword === true,
      emailVerified: ctx.user.emailVerified === true,
    });
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