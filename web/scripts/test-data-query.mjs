// Test de securite du moteur de requetes generique (POST /api/data/query).
//
// Verifie que le perimetre tenant ne peut pas etre contourne depuis le
// navigateur, y compris sur les tables dont le tenant se deduit d'une relation
// (employee_schedules, transaction_lines...) et non d'une colonne directe.
//
// Lance l'API sur un port libre, exerce les requetes, puis l'arrete.
// Usage : node scripts/test-data-query.mjs
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const PORT = 4127;
const BASE = `http://127.0.0.1:${PORT}`;
const ORIGIN = 'http://localhost:3000';

const PASSWORD = '00000000';
// Deux employes de deux etablissements differents : c'est ce couple qui permet
// de verifier qu'aucune donnee ne fuit d'un tenant vers l'autre.
const EMAIL_A = 'digihouse110@gmail.com';
const EMAIL_B = 'ariane@yopmail.com';

let failures = 0;
const check = (label, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ` :: ${extra}` : ''}`);
  if (!cond) failures++;
};

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
    return { status: res.status, json, text };
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

/** Raccourci : execute une requete de donnees. */
const query = (client, body) => client('/api/data/query', { method: 'POST', body });

/** Toutes les lignes renvoyees portent-elles le tenant attendu ? */
function allInTenant(rows, tenantId) {
  return rows.every((r) => r.tenant_id === undefined || r.tenant_id === tenantId);
}

async function main() {
  const srv = startServer();
  const created = [];
  try {
    if (!(await waitReady())) {
      console.error('API demarre pas. stderr:\n' + srv.getErr());
      process.exit(1);
    }

    // --- sessions ------------------------------------------------------
    console.log('--- sessions ---');
    const a = makeClient();
    const b = makeClient();
    const anon = makeClient();

    const loginA = await a('/api/auth/sign-in/email', {
      method: 'POST', body: { email: EMAIL_A, password: PASSWORD },
    });
    check(`connexion ${EMAIL_A}`, loginA.status === 200, `status=${loginA.status}`);
    const meA = await a('/api/me');
    const tenantA = meA.json?.tenant_id;

    const loginB = await b('/api/auth/sign-in/email', {
      method: 'POST', body: { email: EMAIL_B, password: PASSWORD },
    });
    check(`connexion ${EMAIL_B}`, loginB.status === 200, `status=${loginB.status}`);
    const meB = await b('/api/me');
    const tenantB = meB.json?.tenant_id;

    check('deux tenants distincts pour le test', Boolean(tenantA && tenantB && tenantA !== tenantB),
      `A=${tenantA?.slice(0, 8)} B=${tenantB?.slice(0, 8)}`);

    // --- authentification ----------------------------------------------
    console.log('\n--- authentification ---');
    const noSession = await query(anon, { table: 'clients', op: 'select' });
    check('requete sans session -> 401', noSession.status === 401, `status=${noSession.status}`);

    // --- tables interdites --------------------------------------------
    console.log('\n--- surfaces interdites ---');
    for (const table of ['account', 'session', 'verification']) {
      const r = await query(a, { table, op: 'select' });
      check(`table ${table} refusee`, r.status === 400, `status=${r.status} ${r.json?.error ?? ''}`);
    }
    const unknown = await query(a, { table: 'table_qui_nexiste_pas', op: 'select' });
    check('table inconnue -> 400', unknown.status === 400, unknown.json?.error ?? '');
    const badColumn = await query(a, { table: 'clients', op: 'select', columns: 'nom_inexistant' });
    check('colonne inconnue -> 400', badColumn.status === 400, badColumn.json?.error ?? '');
    const embed = await query(a, { table: 'clients', op: 'select', columns: '*, tenants(*)' });
    check('jointure imbriquee signalee 501', embed.status === 501, embed.json?.error ?? '');

    // --- isolation tenant ----------------------------------------------
    console.log('\n--- isolation tenant (portee directe) ---');
    const clientsA = await query(a, { table: 'clients', op: 'select' });
    check('A lit ses clients', clientsA.status === 200 && Array.isArray(clientsA.json?.data),
      `n=${clientsA.json?.data?.length}`);
    check('tous les clients de A sont a A', allInTenant(clientsA.json?.data ?? [], tenantA),
      `fuite=${(clientsA.json?.data ?? []).filter((r) => r.tenant_id !== tenantA).length}`);

    // La tentative centrale : demander explicitement le tenant de l'autre.
    const cross = await query(a, { table: 'clients', op: 'select', filters: [{ op: 'eq', col: 'tenant_id', value: tenantB }] });
    check('filtre tenant_id vers B neutralise', (cross.json?.data ?? []).length === 0,
      `n=${cross.json?.data?.length} (doit etre 0)`);

    const crossServices = await query(a, { table: 'services', op: 'select', filters: [{ op: 'eq', col: 'tenant_id', value: tenantB }] });
    check('filtre tenant_id vers B neutralise (services)', (crossServices.json?.data ?? []).length === 0,
      `n=${crossServices.json?.data?.length}`);

    // --- isolation via relation -----------------------------------------
    console.log('\n--- isolation tenant (portee heritee) ---');
    for (const table of ['employee_schedules', 'employee_absences', 'transaction_lines', 'service_products', 'home_visits', 'medical_notes']) {
      const r = await query(a, { table, op: 'select' });
      const rows = r.json?.data ?? [];
      const owned = rows.filter((row) => row.tenant_id !== undefined);
      const leaked = owned.filter((row) => row.tenant_id !== tenantA).length;
      check(`${table} : aucune ligne de B`, r.status === 200 && leaked === 0,
        `n=${rows.length} fuite=${leaked}`);
    }

    // La table tenants elle-meme ne doit renvoyer que son etablissement.
    const tenantsA = await query(a, { table: 'tenants', op: 'select' });
    const tenantRows = tenantsA.json?.data ?? [];
    check('tenants : uniquement le sien', tenantRows.length === 1 && tenantRows[0]?.id === tenantA,
      `n=${tenantRows.length}`);

    // --- ecritures ------------------------------------------------------
    console.log('\n--- ecritures ---');
    const label = `test-isolation-${Date.now()}`;

    const insert = await query(a, {
      table: 'clients', op: 'insert',
      payload: { name: label, tenant_id: tenantB },
    });
    check('insert autorise pour un employe', insert.status === 200, `status=${insert.status} ${insert.json?.error ?? ''}`);
    const inserted = insert.json?.data?.[0];
    if (inserted?.id) created.push({ id: inserted.id, tenant: inserted.tenant_id });
    check('tenant force sur A meme si B demande', inserted?.tenant_id === tenantA,
      `obtenu=${inserted?.tenant_id?.slice(0, 8)} attendu=${tenantA?.slice(0, 8)}`);

    const protectedWrite = await query(a, {
      table: 'profiles', op: 'update',
      filters: [{ op: 'eq', col: 'id', value: 'peu-importe' }],
      payload: { role: 'super_admin' },
    });
    check('ecriture de role refusee', protectedWrite.status === 403, `${protectedWrite.status} ${protectedWrite.json?.error ?? ''}`);

    const massUpdate = await query(a, { table: 'clients', op: 'update', payload: { first_name: 'x' } });
    check('update sans filtre refusee', massUpdate.status === 400, `${massUpdate.status} ${massUpdate.json?.error ?? ''}`);

    // Deplacer une fiche vers un autre tenant doit etre sans effet.
    if (inserted?.id) {
      const move = await query(a, {
        table: 'clients', op: 'update',
        filters: [{ op: 'eq', col: 'id', value: inserted.id }],
        payload: { tenant_id: tenantB },
      });
      check('update ne deplace pas vers un autre tenant', move.status === 200,
        `status=${move.status} ${move.json?.error ?? ''}`);
      const after = await query(a, {
        table: 'clients', op: 'select', filters: [{ op: 'eq', col: 'id', value: inserted.id }],
      });
      check('la fiche est toujours dans A', (after.json?.data ?? [])[0]?.tenant_id === tenantA,
        `tenant=${(after.json?.data ?? [])[0]?.tenant_id?.slice(0, 8)}`);
    }

    const massDelete = await query(a, { table: 'clients', op: 'delete' });
    check('delete sans filtre refusee', massDelete.status === 400, `${massDelete.status} ${massDelete.json?.error ?? ''}`);

    const massDeleteScoped = await query(b, { table: 'clients', op: 'delete' });
    check('delete sans filtre refusee (autre tenant)', massDeleteScoped.status === 400, `${massDeleteScoped.status}`);

    // --- lecture / tri / or ---------------------------------------------
    console.log('\n--- select, tri, or() ---');
    const withCount = await query(a, { table: 'clients', op: 'select', count: 'exact', limit: 5 });
    check('count exact disponible', typeof withCount.json?.count === 'number',
      `count=${withCount.json?.count}`);
    check('limit respecte', (withCount.json?.data ?? []).length <= 5, `n=${withCount.json?.data?.length}`);

    const ordered = await query(a, { table: 'clients', op: 'select', order: [{ col: 'created_at', dir: 'desc' }], limit: 3 });
    check('tri applique sans erreur', ordered.status === 200, `status=${ordered.status}`);

    const or = await query(a, {
      table: 'clients', op: 'select', limit: 5,
      or: [{ filters: [{ op: 'eq', col: 'name', value: '__absent__' }] },
           { filters: [{ op: 'eq', col: 'phone', value: '__absent__' }] }],
    });
    check('or() execute', or.status === 200 && (or.json?.data ?? []).length === 0,
      `status=${or.status} n=${or.json?.data?.length} err=${or.json?.error ?? ''}`);

    const orPositive = await query(a, {
      table: 'clients', op: 'select', limit: 5,
      or: [{ filters: [{ op: 'eq', col: 'name', value: label }] },
           { filters: [{ op: 'eq', col: 'name', value: '__absent__' }] }],
    });
    check('or() avec une branche vraie', (orPositive.json?.data ?? []).length >= 1,
      `n=${orPositive.json?.data?.length} status=${orPositive.status} err=${orPositive.json?.error ?? ''}`);
  } finally {
    // --- nettoyage -------------------------------------------------------
    console.log('\n--- nettoyage ---');
    const janitor = makeClient();
    await janitor('/api/auth/sign-in/email', {
      method: 'POST', body: { email: EMAIL_A, password: PASSWORD },
    });
    for (const row of created) {
      const del = await query(janitor, {
        table: 'clients', op: 'delete', filters: [{ op: 'eq', col: 'id', value: row.id }],
      });
      check(`ligne de test supprimee (${row.id.slice(0, 8)})`, del.status === 200, `status=${del.status}`);
    }
    srv.child.kill();
  }

  console.log(failures === 0 ? '\nTOUT EST PASSE' : `\n${failures} ECHEC(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main();