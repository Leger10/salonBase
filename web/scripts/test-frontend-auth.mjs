// Verifie le parcours d'authentification tel que le frontend l consomme :
// src/lib/api.js appelle ces routes avec credentials: 'include'.
//
// Cible l'API deja demarree (npm run dev:all). Les comptes de test sont
// supprimes a la fin ; aucun compte reel n'est modifie.
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
if (fs.existsSync(path.join(ROOT, '.env'))) process.loadEnvFile(path.join(ROOT, '.env'));

const API = process.env.TEST_API_URL ?? 'http://localhost:4000';
const ORIGIN = 'http://localhost:3000';
const PASSWORD = '00000000';
const prisma = new PrismaClient();

const TEST_EMAIL = `front.auth.${Date.now()}@salonstore.local`;
const SUPER_ADMIN = 'digihouse10@gmail.com';
const EMPLOYEE = 'digihouse110@gmail.com';

let failures = 0;
const check = (label, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ` :: ${extra}` : ''}`);
  if (!cond) failures++;
};

function client() {
  let cookie = '';
  return async function call(pathname, { method = 'GET', body } = {}) {
    const headers = { Origin: ORIGIN };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (cookie) headers.Cookie = cookie;
    const res = await fetch(`${API}${pathname}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.getSetCookie?.() ?? [];
    for (const raw of setCookie) {
      const pair = raw.split(';')[0];
      if (pair.startsWith('salonstore.session_token=')) cookie = pair;
    }
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: res.status, data, text };
  };
}

async function cleanup(email) {
  const profile = await prisma.profile.findUnique({ where: { email } });
  if (!profile) return;
  await prisma.session.deleteMany({ where: { userId: profile.id } });
  await prisma.account.deleteMany({ where: { userId: profile.id } });
  await prisma.profile.delete({ where: { id: profile.id } });
}

async function main() {
  const anon = client();

  console.log('--- session anonyme ---');
  const anonSession = await anon('/api/auth/get-session');
  check('get-session sans cookie = null', anonSession.status === 200 && !anonSession.data?.user, `status=${anonSession.status}`);
  const anonMe = await anon('/api/me');
  check('/api/me sans session = 401', anonMe.status === 401, `status=${anonMe.status}`);

  console.log('\n--- inscription ---');
  const signup = await anon('/api/auth/sign-up/email', {
    method: 'POST',
    body: { email: TEST_EMAIL, password: PASSWORD, name: 'Test Front Auth', phone: '+22670000000' },
  });
  check('sign-up accepte', signup.status === 200 && signup.data?.user?.id, `status=${signup.status}`);
  const userId = signup.data?.user?.id;

  const session = await anon('/api/auth/get-session');
  check('cookie de session pose', Boolean(session.data?.user?.id));
  check('role par defaut = client', session.data?.user?.role === 'client', `role=${session.data?.user?.role}`);
  check('phone enregistre', session.data?.user?.phone === '+22670000000', `phone=${session.data?.user?.phone}`);

  console.log('\n--- forme attendue par AuthContext ---');
  const me = await anon('/api/me');
  const p = me.data?.profile;
  check('/api/me -> 200', me.status === 200, `status=${me.status}`);
  check('profile.full_name present', p?.full_name === 'Test Front Auth', `full_name=${p?.full_name}`);
  check('profile.role = client', p?.role === 'client');
  check('profile.tenant_id = null', p?.tenant_id === null, `tenant_id=${p?.tenant_id}`);
  check('profile.tenants = null', p?.tenants === null);
  check('currentUser derivable', Boolean(me.data?.id && me.data?.email && me.data?.profile));

  console.log('\n--- controle d\'acces ---');
  const selfPromote = await anon(`/api/profiles/${userId}`, {
    method: 'PATCH',
    body: { role: 'admin', tenant_id: '4485ea07-a4f6-4db3-8434-c1bff07d9843' },
  });
  check('un client ne peut pas s auto-promouvoir', selfPromote.status === 403, `status=${selfPromote.status}`);

  console.log('\n--- employe ---');
  const emp = client();
  const empLogin = await emp('/api/auth/sign-in/email', {
    method: 'POST',
    body: { email: EMPLOYEE, password: PASSWORD },
  });
  check('employe migre se connecte', empLogin.status === 200, `status=${empLogin.status}`);
  const empMe = await emp('/api/me');
  check('tenant de l employe resolu', Boolean(empMe.data?.tenant_id), `tenant_id=${empMe.data?.tenant_id}`);
  check('etablissement imbrique', Boolean(empMe.data?.profile?.tenants?.name), `nom=${empMe.data?.profile?.tenants?.name}`);
  const empPromote = await emp(`/api/profiles/${userId}`, {
    method: 'PATCH',
    body: { role: 'admin', tenant_id: empMe.data?.tenant_id },
  });
  check('employe ne peut pas promouvoir', empPromote.status === 403, `status=${empPromote.status}`);

  console.log('\n--- super_admin ---');
  const root = client();
  await root('/api/auth/sign-in/email', { method: 'POST', body: { email: SUPER_ADMIN, password: PASSWORD } });
  const badRole = await root(`/api/profiles/${userId}`, { method: 'PATCH', body: { role: 'hack', tenant_id: null } });
  check('role inconnu refuse', badRole.status === 400, `status=${badRole.status}`);
  const noTenant = await root(`/api/profiles/${userId}`, { method: 'PATCH', body: { role: 'admin', tenant_id: null } });
  check('admin sans etablissement refuse', noTenant.status === 400, `status=${noTenant.status}`);
  const promoted = await root(`/api/profiles/${userId}`, {
    method: 'PATCH',
    body: { role: 'admin', tenant_id: empMe.data?.tenant_id },
  });
  check('super_admin peut promouvoir', promoted.status === 200 && promoted.data?.profile?.role === 'admin', `status=${promoted.status}`);
  check('etablissement affecte', promoted.data?.profile?.tenant_id === empMe.data?.tenant_id);
  const toSuper = await root(`/api/profiles/${userId}`, { method: 'PATCH', body: { role: 'super_admin', tenant_id: null } });
  check('super_admin peut attribuer super_admin', toSuper.status === 200, `status=${toSuper.status}`);

  console.log('\n--- deconnexion ---');
  const out = await anon('/api/auth/sign-out', { method: 'POST' });
  check('sign-out = 200', out.status === 200, `status=${out.status}`);
  const afterOut = await client()('/api/me');
  check('/api/me refuse apres deconnexion', afterOut.status === 401, `status=${afterOut.status}`);

  console.log('\n--- changement de mot de passe ---');
  const cp = client();
  await cp('/api/auth/sign-in/email', { method: 'POST', body: { email: TEST_EMAIL, password: PASSWORD } });
  const changed = await cp('/api/auth/change-password', {
    method: 'POST',
    body: { currentPassword: PASSWORD, newPassword: 'NouveauMotDePasse1!', revokeOtherSessions: true },
  });
  check('changement de mot de passe accepte', changed.status === 200, `status=${changed.status} ${changed.text.slice(0, 120)}`);
  const relogin = await client()('/api/auth/sign-in/email', {
    method: 'POST',
    body: { email: TEST_EMAIL, password: 'NouveauMotDePasse1!' },
  });
  check('connexion avec le nouveau mot de passe', relogin.status === 200, `status=${relogin.status}`);
  const oldPw = await client()('/api/auth/sign-in/email', {
    method: 'POST',
    body: { email: TEST_EMAIL, password: PASSWORD },
  });
  check('ancien mot de passe rejete', oldPw.status === 401, `status=${oldPw.status}`);

  await cleanup(TEST_EMAIL);
  console.log(`\n  (compte de test ${TEST_EMAIL} supprime)`);

  const [{ n }] = await prisma.$queryRaw`SELECT COUNT(*) n FROM profiles`;
  console.log(`  profils restants : ${n}`);
  if (Number(n) !== 16) {
    check('16 profils preserves', false, `n=${n}`);
  } else {
    check('16 profils preserves', true);
  }

  console.log(`\n${failures === 0 ? 'TOUT EST PASSE' : `${failures} ECHEC(S)`}`);
  await prisma.$disconnect();
  if (failures) process.exitCode = 1;
}

main().catch(async (e) => {
  console.error(e);
  await cleanup(TEST_EMAIL);
  await prisma.$disconnect();
  process.exit(1);
});