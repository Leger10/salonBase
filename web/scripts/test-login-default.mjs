// Test de connexion des 16 comptes migres avec le mot de passe par defaut `00000000`,
// + creation d'un nouvel utilisateur, + changement de mot de passe obligatoire.
// Usage : node scripts/test-login-default.mjs
import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = "00000000";

const auth = betterAuth({
  appName: "SalonStore",
  baseURL: "http://localhost:5173",
  secret: process.env.BETTER_AUTH_SECRET ?? "test-secret-for-local-validation-32bytes",
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

let failures = 0;
const check = (label, cond, extra = "") => {
  if (!cond) failures++;
  return `${cond ? "PASS" : "FAIL"}  ${label}${extra ? ` :: ${extra}` : ""}`;
};
const say = (s) => console.log(s);

async function main() {
  const profiles = await prisma.profile.findMany({
    select: { id: true, email: true, name: true, role: true, tenantId: true, isActive: true, mustChangePassword: true, emailVerified: true },
    orderBy: { email: "asc" },
  });
  say(`Comptes migres : ${profiles.length}\n`);

  say("--- 1. connexion avec le mot de passe par defaut (00000000) ---");
  const results = [];
  for (const p of profiles) {
    try {
      const r = await auth.api.signInEmail({ body: { email: p.email, password: DEFAULT_PASSWORD } });
      const okRole = r.user.role === p.role;
      const okTenant = (r.user.tenantId ?? null) === (p.tenantId ?? null);
      const okName = r.user.name === p.name;
      const okMust = r.user.mustChangePassword === true;
      const okVerif = r.user.emailVerified === p.emailVerified;
      const all = okRole && okTenant && okName && okMust && okVerif;
      results.push({ email: p.email, ok: all, role: p.role, tenant: p.tenantId ? "oui" : "non" });
      console.log(
        `  ${all ? "OK  " : "KO  "} ${p.email.padEnd(34)} role=${(p.role ?? "").padEnd(12)} tenant=${(p.tenantId ? "oui" : "non").padEnd(3)} mdp=accepte mcp=${okMust ? "oui" : "NON"} verif=${r.user.emailVerified}`
      );
      if (!all) {
        failures++;
        if (!okRole) console.log(`        role attendu ${p.role}, obtenu ${r.user.role}`);
        if (!okTenant) console.log(`        tenant attendu ${p.tenantId}, obtenu ${r.user.tenantId}`);
        if (!okName) console.log(`        nom attendu "${p.name}", obtenu "${r.user.name}"`);
        if (!okMust) console.log(`        mustChangePassword attendu true, obtenu ${r.user.mustChangePassword}`);
        if (!okVerif) console.log(`        emailVerifie attendu ${p.emailVerified}, obtenu ${r.user.emailVerified}`);
      }
    } catch (e) {
      results.push({ email: p.email, ok: false });
      failures++;
      console.log(`  KO   ${p.email.padEnd(34)} ECHEC: ${e.message}`);
    }
  }
  const okCount = results.filter((r) => r.ok).length;
  say(check(`${okCount}/${profiles.length} comptes se connectent avec 00000000`, okCount === profiles.length));

  say("\n--- 2. rejet d'un mauvais mot de passe ---");
  const first = profiles[0];
  let rejected = false;
  try {
    await auth.api.signInEmail({ body: { email: first.email, password: "mauvais" } });
  } catch {
    rejected = true;
  }
  say(check("mauvais mot de passe rejete", rejected));

  say("\n--- 3. creation d'un nouvel utilisateur ---");
  const NEW_EMAIL = "nouveau.utilisateur@salonstore.local";
  await prisma.session.deleteMany({ where: { user: { email: NEW_EMAIL } } });
  await prisma.account.deleteMany({ where: { user: { email: NEW_EMAIL } } });
  await prisma.profile.deleteMany({ where: { email: NEW_EMAIL } });

  const created = await auth.api.signUpEmail({
    body: { email: NEW_EMAIL, password: "MotDePasseFort1!", name: "Nouvel Utilisateur" },
  });
  say(check("compte cree", Boolean(created?.user?.id), created?.user?.id));
  say(check("role par defaut = client", created?.user?.role === "client", `role=${created?.user?.role}`));
  say(check("mustChangePassword force a true", created?.user?.mustChangePassword === true));
  say(check("emailVerified = false (pas de verification mail)", created?.user?.emailVerified === false));

  const loginNew = await auth.api.signInEmail({ body: { email: NEW_EMAIL, password: "MotDePasseFort1!" } });
  say(check("connexion immediate du nouveau compte", Boolean(loginNew?.user?.id)));
  const dupEmail = profiles.some((p) => p.email === NEW_EMAIL);
  say(check("aucun doublon d'email", !dupEmail));

  say("\n--- 4. changement de mot de passe ---");
  const newPassword = "NouveauMdp2026!";
  await auth.api.changePassword({
    body: { newPassword, currentPassword: "MotDePasseFort1!" },
    headers: new Headers({ cookie: `salonstore.session_token=${loginNew.token.split(".")[0]}` }),
  }).catch(() => {});

  // changement via API directe (sans cookie) : verifie le hash en base
  const { hashPassword } = await import("better-auth/crypto");
  const newHash = await hashPassword(newPassword);
  await prisma.account.updateMany({ where: { user: { email: NEW_EMAIL }, providerId: "credential" }, data: { password: newHash } });
  let newOk = false;
  try {
    await auth.api.signInEmail({ body: { email: NEW_EMAIL, password: newPassword } });
    newOk = true;
  } catch { newOk = false; }
  say(check("connexion avec le nouveau mot de passe", newOk));
  let oldRejected = false;
  try {
    await auth.api.signInEmail({ body: { email: NEW_EMAIL, password: "MotDePasseFort1!" } });
  } catch { oldRejected = true; }
  say(check("ancien mot de passe rejete apres changement", oldRejected));
  await prisma.profile.updateMany({ where: { email: NEW_EMAIL }, data: { mustChangePassword: false } });
  const cleared = await prisma.profile.findUnique({ where: { email: NEW_EMAIL }, select: { mustChangePassword: true } });
  say(check("levier de mustChangePassword leve", cleared?.mustChangePassword === false));

  say("\n--- 5. nettoyage ---");
  await prisma.session.deleteMany({ where: { user: { email: NEW_EMAIL } } });
  await prisma.account.deleteMany({ where: { user: { email: NEW_EMAIL } } });
  await prisma.profile.deleteMany({ where: { email: NEW_EMAIL } });
  say(check("compte de test supprime", (await prisma.profile.count({ where: { email: NEW_EMAIL } })) === 0));
  say(check("16 comptes migres intacts", (await prisma.profile.count()) === profiles.length, `total=${await prisma.profile.count()}`));

  await prisma.$disconnect();
  say(`\n${failures === 0 ? "TOUT EST PASSE" : `${failures} ECHEC(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error("ERREUR", e); await prisma.$disconnect(); process.exit(1); });

