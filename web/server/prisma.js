import { PrismaClient } from '@prisma/client';

// Un seul client Prisma par process : en dev le rechargement a chaud doit
// reutiliser le meme pool de connexions.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;