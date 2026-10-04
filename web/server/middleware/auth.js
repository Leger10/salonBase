import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth.js';
import { prisma } from '../prisma.js';

/**
 * Hierarchie de roles (equivalent des fonctions is_admin / is_super_admin de Supabase).
 * super_admin est global (pas de tenant), les autres roles sont scopes a un tenant.
 */
export const ROLES = {
  super_admin: 4,
  admin: 3,
  employee: 2,
  client: 1,
};

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Recupere la session depuis les en-tetes de la requete (cookie de session Better Auth). */
export async function getSession(req) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  return session ?? null;
}

/** 401 si aucune session valide. */
export async function requireSession(req) {
  const session = await getSession(req);
  if (!session?.user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentification requise.');
  }
  if (session.user.isActive === false) {
    throw new HttpError(403, 'ACCOUNT_DISABLED', 'Ce compte est desactive.');
  }
  if (session.user.banned === true) {
    throw new HttpError(403, 'ACCOUNT_BANNED', 'Ce compte est suspendu.');
  }
  return session;
}

/** Ajoute le tenant et les droits a la session, une fois resolus. */
export async function requireAuth(req) {
  const session = await requireSession(req);
  const user = session.user;

  // Le tenant est porte par le profil : source de verite pour l'isolation.
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, tenantId: true, role: true, isActive: true },
  });
  if (!profile) throw new HttpError(401, 'PROFILE_MISSING', 'Profil introuvable.');

  const role = profile.role ?? user.role ?? 'client';
  return {
    user,
    profile,
    role,
    tenantId: profile.tenantId ?? user.tenantId ?? null,
    level: ROLES[role] ?? 0,
  };
}

/** 403 si l'utilisateur n'a pas le role requis. */
export function requireRole(ctx, minimum) {
  const needed = ROLES[minimum];
  if (ctx.role === 'super_admin') return ctx;
  if (ctx.level < needed) {
    throw new HttpError(403, 'FORBIDDEN', `Acces reserve au role "${minimum}" ou superieur.`);
  }
  return ctx;
}

/**
 * Renvoie le tenant cible d'une requete.
 * - super_admin : peut cibler un tenant explicitement (?tenantId=) ou tous (?all=true)
 * - autre role  : impose son propre tenant, toute tentative de changement est refusee
 */
export function resolveTenant(ctx, query) {
  if (ctx.role === 'super_admin') {
    if (query.all === 'true' && !query.tenantId) return { all: true, tenantId: null };
    return { all: false, tenantId: query.tenantId ?? null };
  }
  if (query.tenantId && query.tenantId !== ctx.tenantId) {
    throw new HttpError(403, 'TENANT_FORBIDDEN', "Vous n'accedez qu'a votre propre etablissement.");
  }
  return { all: false, tenantId: ctx.tenantId };
}

/** Filtre Prisma correspondant au tenant resolu. */
export function tenantWhere(scope, field = 'tenantId') {
  if (scope.all) return {};
  if (scope.tenantId === null) {
    // Membre sans etablissement : on ne doit renvoyer AUCUNE ligne.
    // Prisma refuse `{ field: null }` quand la colonne est non nullable dans le
    // schema, d'ou le filtre `in: []` qui ne matche rien.
    return { id: { in: [] } };
  }
  return { [field]: scope.tenantId };
}