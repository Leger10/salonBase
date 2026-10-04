// Smoke test Better Auth <-> MariaDB (la table `profiles` sert de table "user").
// Verifie : signup, signin, defauts de colonnes, hash de mot de passe,
// unicite d'email, et contrainte NOT NULL sur full_name.
// Usage : npm run test:auth   (DATABASE_URL doit viser la base de test/CI)
import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

const prisma = new PrismaClient();
const SECRET = "test-secret-for-local-schema-validation-only-32b";

const auth = betterAuth({
  appName: "SalonStore",
  baseURL: "http://localhost:5173",
  secret: SECRET,
  database: prismaAdapter(prisma, { provider: "mysql" }),
  emailAndPassword: { enabled: true },
  user: {
    modelName: "Profile",
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "client", input: false },
      tenantId: { type: "string", required: false, input: false },
      isActive: { type: "boolean", required: false, defaultValue: true, input: false },
      mustChangePassword: { type: "boolean", required: false, defaultValue: true, input: false },
    },
  },
  advanced: { database: { generateId: "uuid" }, cookiePrefix: "salonstore" },
});

const EMAIL = "schema.test@salonstore.local";
const PASSWORD = "00000000";

let failures = 0;
const check = (label, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? ` :: ${extra}` : ""}`);
  if (!cond) failures++;
};

// Nettoyage STRICT du seul compte de test. Ne jamais faire
// `account.deleteMany({})` ici : cela supprimerait les comptes credential
// migres depuis Supabase (les 16 utilisateurs reels).
const cleanup = async () => {
  const existing = await prisma.profile.findUnique({ where: { email: EMAIL } });
  if (!existing) return;
  await prisma.session.deleteMany({ where: { userId: existing.id } });
  await prisma.account.deleteMany({ where: { userId: existing.id } });
  await prisma.profile.delete({ where: { id: existing.id } });
};

async function main() {
  await cleanup();

  console.log("--- signup ---");
  const res = await auth.api.signUpEmail({
    body: { email: EMAIL, password: PASSWORD, name: "Test Schema" },
  });
  check("signup retourne un user", Boolean(res?.user?.id), res?.user?.id);
  check("role par defaut = client", res?.user?.role === "client", `role=${res?.user?.role}`);
  check("mustChangePassword = true", res?.user?.mustChangePassword === true, `v=${res?.user?.mustChangePassword}`);
  check("isActive = true", res?.user?.isActive === true, `v=${res?.user?.isActive}`);
  check("emailVerified = false", res?.user?.emailVerified === false, `v=${res?.user?.emailVerified}`);
  check("token present", Boolean(res?.token));

  const profile = await prisma.profile.findUnique({ where: { email: EMAIL } });
  check("ligne profiles presente", Boolean(profile));
  check("colonne full_name renseignee", profile?.name === "Test Schema", `name=${profile?.name}`);
  check("colonne avatar (nullable) toleree", profile?.image === null || profile?.image === undefined, `image=${profile?.image}`);
  check(
    "id UUID char(36)",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(profile?.id ?? ""),
    profile?.id
  );

  const account = await prisma.account.findFirst({ where: { userId: profile.id } });
  check("compte credential cree", account?.providerId === "credential", `provider=${account?.providerId}`);
  check(
    "password hache (non vide, non en clair)",
    Boolean(account?.password) && account.password !== PASSWORD && account.password.length > 20,
    `prefix=${String(account?.password).slice(0, 12)}...`
  );

  console.log("\n--- signin ---");
  const si = await auth.api.signInEmail({ body: { email: EMAIL, password: PASSWORD } });
  check("signin reussi", Boolean(si?.user?.id), si?.user?.email);
  check("session creee", Boolean(si?.token));

  const sess = await prisma.session.findFirst({ where: { userId: profile.id } });
  check("session en table `session`", Boolean(sess), sess?.id);
  check("session.token renseigne", Boolean(sess?.token));
  check("expiresAt renseigne", sess?.expiresAt instanceof Date);

  console.log("\n--- cas d'erreur ---");
  let rejected = false;
  try {
    await auth.api.signInEmail({ body: { email: EMAIL, password: "mauvais" } });
  } catch {
    rejected = true;
  }
  check("mauvais mot de passe rejete", rejected);

  let dup = false;
  try {
    await auth.api.signUpEmail({
      body: { email: EMAIL.toUpperCase(), password: PASSWORD, name: "Doublon" },
    });
  } catch {
    dup = true;
  }
  check("email en majuscules refuse (unique)", dup);

  let nn = false;
  try {
    await prisma.$executeRaw`INSERT INTO profiles (id, email, full_name, role, email_verified, must_change_password) VALUES (${crypto.randomUUID()}, ${"nn.test@x.local"}, ${null}, ${"client"}, ${false}, ${true})`;
  } catch {
    nn = true;
  }
  check("full_name NULL refuse par MySQL", nn);

  await cleanup();

  console.log(`\n${failures === 0 ? "TOUT EST PASSE" : `${failures} ECHEC(S)`}`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("ERREUR", e);
  await prisma.$disconnect();
  process.exit(1);
});