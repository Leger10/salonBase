import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma.js';

// --- Garde-fous de configuration ------------------------------------------
const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    'BETTER_AUTH_SECRET absent ou trop court (32 caracteres minimum). ' +
      'Generer avec : node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL absent (MySQL/MariaDB).');
}

// --- Origines autorisees --------------------------------------------------
// En dev : le serveur Vite. En prod : le domaine Netlify + le domaine API.
// Une origine non listee est refusee par Better Auth (protection CSRF).
const ORIGINS = (process.env.CORS_ORIGINS ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const auth = betterAuth({
  appName: 'SalonStore',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
  secret,
  basePath: '/api/auth',

  trustedOrigins: ORIGINS,

  database: prismaAdapter(prisma, { provider: 'mysql' }),

  // La table "user" de Better Auth est `profiles` : les UUID des comptes
  // existants sont conserves, ainsi que role / tenant_id / is_active.
  user: {
    modelName: 'Profile',
    changeEmail: { enabled: false },
    additionalFields: {
      // role / tenantId / isActive / mustChangePassword restent `input: false` :
      // un client ne doit pas pouvoir s'attribuer un role nichoisir son salon.
      role: { type: 'string', required: true, defaultValue: 'client', input: false },
      tenantId: { type: 'string', required: false, input: false },
      isActive: { type: 'boolean', required: false, defaultValue: true, input: false },
      mustChangePassword: { type: 'boolean', required: false, defaultValue: true, input: false },
      phone: { type: 'string', required: false, input: true },
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    // Longueur minimale du mot de passe (le mdp par defaut "00000000" n'est
    // accepte qu'a la creation forcee des comptes migres, pas en inscription).
    minPasswordLength: 8,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24, // rafraichi au plus tard toutes les 24 h
  },

  advanced: {
    // UUID char(36), aligne sur la colonne profiles.id
    database: { generateId: 'uuid' },
    cookiePrefix: 'salonstore',
    // Netlify (front) et Hostinger (API) sont sur des domaines differents :
    // le cookie doit donc etre SameSite=None; Secure pour voyager en XHR.
    // A ne activer QUE si les deux sites sont en HTTPS.
    useSecureCookies: process.env.SECURE_COOKIES === 'true',
  },
});

export const authOrigins = ORIGINS;