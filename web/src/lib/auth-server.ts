import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    "BETTER_AUTH_SECRET manquant. Definir une valeur >= 32 octets aleatoires dans web/.env"
  );
}

export const auth = betterAuth({
  appName: "SalonStore",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:5173",
  secret: process.env.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),

  // La table "user" de Better Auth est `profiles` : les UUID des 16 comptes
  // existants sont conserves, ainsi que role / tenant_id / is_active.
  user: {
    modelName: "Profile",
    changeEmail: { enabled: false },
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "client",
        input: false,
      },
      tenantId: {
        type: "string",
        required: false,
        input: false,
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
      mustChangePassword: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  advanced: {
    // les id sont des UUID char(36), alignes sur la colonne profiles.id
    database: { generateId: "uuid" },
    cookiePrefix: "salonstore",
  },
});
