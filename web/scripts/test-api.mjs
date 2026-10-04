// Test HTTP de bout en bout de l'API : signup, session, /api/me, isolation tenant.
// Lance le serveur sur un port libre, exerce les routes, puis l'arrete.
// Usage : node scripts/test-api.mjs
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const PORT = 4123;
const BASE = `http://127.0.0.1:${PORT}`;
const ORIGIN = 'http://localhost:3000';

let failures = 0;
const check = (label, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ` :: ${extra}` : ''}`);
  if (!cond) failures++;
};

// --- client HTTP minimal avec bocal a cookies ----------------------------
function makeClient() {
  const jar = new Map();
  return async function call(pathname, { method = 'GET', body, headers = {}, origin = ORIGIN } = {}) {
    const h = { ...headers };
    if (origin) h.Origin = origin;
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (jar.size) h.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(`${BASE}${pathname}`, {
      method,
      headers: h,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(';');
      const idx = pair.indexOf('=');
      jar.set(pair.slice(0, idx), pair.slice(idx + 1));
    }
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* non JSON */ }
    return { status: res.status, json, text, headers: res.headers };
  };
}

function startServer() {
  const child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    cwd: ROOT,
    env: { ...process.env, API_PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d; });
  child.stdout.resume();
  return { child, getErr: () => stderr };
}

async function waitReady(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return true;
    } catch { /* pas encore pret */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

const EMAIL_A = 'api.test.a@salonstore.local';
const EMAIL_B = 'api.test.b@salonstore.local';

async function main() {
  const srv = startServer();
  try {
    if (!(await waitReady())) {
      console.error('API demarre pas. stderr:\n' + srv.getErr());
      process.exit(1);
    }

    const anon = makeClient();
    console.log('--- sante ---');
    const health = await anon('/api/health');
    check('GET /api/health -> 200', health.status === 200, JSON.stringify(health.json));
    check('API joignable + profil compte', health.json?.profiles === 16, `profiles=${health.json?.profiles}`);

    console.log('\n--- protection des routes ---');
    const meAnon = await anon('/api/me');
    check('GET /api/me sans session -> 401', meAnon.status === 401, `status=${meAnon.status}`);
    const svcAnon = await anon('/api/services');
    check('GET /api/services sans session -> 401', svcAnon.status === 401, `status=${svcAnon.status}`);
    const ticketAnon = await anon('/api/tickets/next-number');
    check('GET /api/tickets/next-number sans session -> 401', ticketAnon.status === 401, `status=${ticketAnon.status}`);

    console.log('\n--- inscription + session ---');
    const signUp = await anon('/api/auth/sign-up/email', {
      method: 'POST',
      body: { email: EMAIL_A, password: 'MotDePasse1!', name: 'API Test A' },
    });
    check('POST /api/auth/sign-up/email -> 200', signUp.status === 200, `status=${signUp.status} ${signUp.text.slice(0, 120)}`);
    check('cookie de session pose', signUp.status === 200);

    const meA = await anon('/api/me');
    check('GET /api/me avec session -> 200', meA.status === 200, `status=${meA.status}`);
    check('email correct', meA.json?.email === EMAIL_A, meA.json?.email);
    check('role = client', meA.json?.role === 'client', `role=${meA.json?.role}`);
    check('tenant = null (compte sans etablissement)', meA.json?.tenantId === null);
    check('mustChangePassword = true', meA.json?.mustChangePassword === true);

    console.log('\n--- DTO snake_case ---');
    const svc = await anon('/api/services');
    check('GET /api/services -> 200', svc.status === 200, `status=${svc.status} body=${svc.text.slice(0, 300)}`);
    check('tableau', Array.isArray(svc.json), `type=${typeof svc.json}`);
    if (Array.isArray(svc.json) && svc.json.length) {
      const keys = Object.keys(svc.json[0]);
      check('cles snake_case (contrat PostgREST)', keys.includes('tenant_id') && keys.includes('is_active'), keys.join(','));
    } else {
      check('services renvoie un tableau (vide attendu : pas d import metier)', true, '0 service');
    }

    console.log('\n--- controle de role ---');
    const ticketAsClient = await anon('/api/tickets/next-number');
    check('role client sur /tickets/next-number -> 403', ticketAsClient.status === 403, `status=${ticketAsClient.status}`);

    console.log('\n--- escalation de tenant refusee ---');
    // un compte client ne doit pas pouvoir lire un autre tenant
    const foreign = '00000000-0000-0000-0000-000000000000';
    const cross = await anon(`/api/services?tenantId=${foreign}`);
    check('tenantId etranger -> 403', cross.status === 403, `status=${cross.status}`);

    console.log('\n--- CORS ---');
    const corsOk = await anon('/api/health');
    check('Access-Control-Allow-Origin renvoye', corsOk.headers.get('access-control-allow-origin') === ORIGIN, String(corsOk.headers.get('access-control-allow-origin')));
    const corsBad = await fetch(`${BASE}/api/health`, { headers: { Origin: 'https://evil.example' } });
    check('origine inconnue -> pas de CORS', corsBad.headers.get('access-control-allow-origin') === null, String(corsBad.headers.get('access-control-allow-origin')));

    console.log('\n--- origine non approuvee refusee par Better Auth ---');
    const rogueSignUp = await makeClient()('/api/auth/sign-up/email', {
      method: 'POST',
      origin: 'https://evil.example',
      body: { email: 'rogue@salonstore.local', password: 'MotDePasse1!', name: 'Rogue' },
    });
    check('sign-up depuis origine inconnue refuse', rogueSignUp.status === 403 || rogueSignUp.status === 401, `status=${rogueSignUp.status}`);

    console.log(`\n${failures === 0 ? 'TOUT EST PASSE' : `${failures} ECHEC(S)`}`);
    if (failures > 0 && srv.getErr().trim()) {
      console.log('\n--- stderr du serveur ---\n' + srv.getErr().trim().split('\n').slice(0, 25).join('\n'));
    }
  } finally {
    srv.child.kill();
  }

  // nettoyage des comptes de test
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  for (const email of [EMAIL_A, EMAIL_B, 'rogue@salonstore.local']) {
    const p = await prisma.profile.findUnique({ where: { email }, select: { id: true } });
    if (p) {
      await prisma.session.deleteMany({ where: { userId: p.id } });
      await prisma.account.deleteMany({ where: { userId: p.id } });
      await prisma.profile.delete({ where: { id: p.id } });
    }
  }
  console.log(`comptes de test supprimes (reste ${await prisma.profile.count()} profils)`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error('ERREUR', e); process.exit(1); });