// Test de la couche de compatibilite PostgREST (src/lib/supabase-shim.js).
//
// Les 110 fichiers du frontend utilisent la syntaxe supabase-js. Ce test la
// pilote contre la vraie API pour verifier que le shim reproduit fidelement le
// contrat attendu par ces fichiers : { data, error }, single/maybeSingle,
// or(), count, et surtout qu'une erreur ne leve jamais une exception.
//
// Node n'ayant pas de bocal a cookies pour fetch, on l'enveloppe le temps du
// test ; c'est aussi ce que fait le navigateur pour le cookie de session.
// Usage : node scripts/test-shim.mjs
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const PORT = 4129;
const BASE = `http://127.0.0.1:${PORT}`;

const EMAIL = 'digihouse110@gmail.com';
const PASSWORD = '00000000';

let failures = 0;
const check = (label, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ` :: ${extra}` : ''}`);
  if (!cond) failures++;
};

// --- bocal a cookies autour de fetch --------------------------------------
// Le shim appelle `fetch('/api/...')` en relatif, comme le ferait le navigateur.
// On resout donc l'URL contre l'origine de l'API et on gere les cookies, que
// Node ne fait pas tout seul.
const jar = new Map();
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  const target = typeof url === 'string' && url.startsWith('/') ? `${BASE}${url}` : url;
  const headers = new Headers(options.headers ?? {});
  headers.set('Origin', 'http://localhost:3000');
  if (jar.size) headers.set('Cookie', [...jar].map(([k, v]) => `${k}=${v}`).join('; '));
  const res = await realFetch(target, { ...options, headers, redirect: 'manual' });
  for (const cookie of res.headers.getSetCookie?.() ?? []) {
    const [pair] = cookie.split(';');
    const idx = pair.indexOf('=');
    jar.set(pair.slice(0, idx), pair.slice(idx + 1));
  }
  return res;
};

// --- demarrage de l'API ---------------------------------------------------
const child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
  cwd: ROOT,
  env: { ...process.env, API_PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stderr = '';
child.stderr.on('data', (d) => { stderr += d; });
child.stdout.resume();

async function waitReady(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { if ((await realFetch(`${BASE}/api/health`)).ok) return true; } catch { /* pas pret */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

const { createDataClient } = await import('../src/lib/supabase-shim.js');
const supabase = createDataClient();

const created = [];

try {
  if (!(await waitReady())) {
    console.error('API demarre pas. stderr:\n' + stderr);
    process.exit(1);
  }

  // --- connexion --------------------------------------------------------
  console.log('--- session ---');
  const login = await supabase.auth.getUser();
  check('pas de session au depart', login.data?.user === null);

  const res = await realFetch(`${BASE}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookies) {
    const [pair] = cookie.split(';');
    const idx = pair.indexOf('=');
    jar.set(pair.slice(0, idx), pair.slice(idx + 1));
  }
  check('connexion par Better Auth', res.status === 200, `status=${res.status}`);

  const me = await supabase.auth.getUser();
  check('getUser() renvoie un utilisateur', Boolean(me.data?.user?.id),
    me.data?.user?.email ?? '');
  const meResp = await realFetch(`${BASE}/api/me`).then((r) => r.json());
  const tenantA = meResp.tenant_id;

  // --- lecture ----------------------------------------------------------
  console.log('\n--- lecture ---');
  const all = await supabase.from('clients').select('*');
  check('select("*") renvoie un tableau', Array.isArray(all.data), `n=${all.data?.length}`);
  check('aucune erreur', all.error === null, JSON.stringify(all.error));

  const eq = await supabase.from('clients').select('id,name').eq('tenant_id', tenantA);
  check('eq() filtre', eq.error === null && Array.isArray(eq.data) && eq.data.length === all.data.length,
    `n=${eq.data?.length} err=${eq.error?.message ?? ''}`);
  check('colonnes respectees',
    Array.isArray(eq.data) && eq.data.every((r) => Object.keys(r).every((k) => k === 'id' || k === 'name')),
    JSON.stringify(Object.keys(eq.data?.[0] ?? {})));

  const limited = await supabase.from('clients').select('*').limit(1);
  check('limit() respecte', limited.data.length <= 1, `n=${limited.data.length}`);

  const ranged = await supabase.from('clients').select('*').range(0, 0);
  check('range(0,0) = 1 element', ranged.data.length === 1, `n=${ranged.data.length}`);

  const ordered = await supabase.from('clients').select('*').order('name', { ascending: true });
  const names = ordered.data.map((r) => r.name ?? '');
  check('order() trie', JSON.stringify(names) === JSON.stringify([...names].sort()),
    JSON.stringify(names.slice(0, 3)));

  const desc = await supabase.from('clients').select('*').order('name', { ascending: false });
  const descNames = desc.data.map((r) => r.name ?? '');
  check('order() decroissant', JSON.stringify(descNames) === JSON.stringify([...descNames].sort().reverse()),
    JSON.stringify(descNames.slice(0, 3)));

  const withCount = await supabase.from('clients').select('*', { count: 'exact' }).limit(2);
  check('count exact', typeof withCount.count === 'number', `count=${withCount.count}`);

  const inFilter = await supabase.from('clients').select('id').in('tenant_id', [tenantA]);
  check('in() fonctionne', inFilter.error === null, `n=${inFilter.data?.length}`);

  const ilike = await supabase.from('clients').select('*').ilike('name', 'a');
  check('ilike() fonctionne', ilike.error === null, `n=${ilike.data?.length}`);

  // --- or() -------------------------------------------------------------
  console.log('\n--- or() ---');
  const orFalse = await supabase.from('clients').select('*').or('name.eq.__absent__,phone.eq.__absent__');
  check('or() sans correspondance', orFalse.error === null && orFalse.data.length === 0,
    `n=${orFalse.data?.length} err=${orFalse.error?.message ?? ''}`);

  const realClient = all.data[0];
  if (realClient) {
    const orTrue = await supabase
      .from('clients').select('*')
      .or(`id.eq.${realClient.id},name.eq.__absent__`);
    check('or() avec branche vraie', orTrue.data.length >= 1, `n=${orTrue.data?.length}`);
    check('or() reste dans le tenant', orTrue.data.every((r) => r.tenant_id === tenantA),
      JSON.stringify(orTrue.data.map((r) => r.tenant_id?.slice(0, 8))));
  }

  // --- single / maybeSingle ---------------------------------------------
  console.log('\n--- single / maybeSingle ---');
  if (realClient) {
    const single = await supabase.from('clients').select('*').eq('id', realClient.id).single();
    check('single() renvoie un objet', single.data?.id === realClient.id,
      `error=${single.error?.message ?? 'aucun'}`);
  }

  const none = await supabase.from('clients').select('*').eq('id', 'inexistant').single();
  check('single() sans resultat signale une erreur', Boolean(none.error), none.error?.message ?? '');
  check('single() sans resultat : data null', none.data === null);

  const maybeNone = await supabase.from('clients').select('*').eq('id', 'inexistant').maybeSingle();
  check('maybeSingle() sans resultat : pas d erreur', maybeNone.error === null,
    maybeNone.error?.message ?? '');
  check('maybeSingle() sans resultat : data null', maybeNone.data === null);

  const several = await supabase.from('clients').select('*').eq('tenant_id', tenantA).single();
  check('single() sur plusieurs lignes signale une erreur', Boolean(several.error),
    several.error?.message ?? '');

  // --- isolation --------------------------------------------------------
  console.log('\n--- isolation via le shim ---');
  const cross = await supabase.from('clients').select('*').eq('tenant_id', 'autre-tenant');
  check('filtre cross-tenant neutralise', cross.data.length === 0, `n=${cross.data.length}`);

  const forbidden = await supabase.from('account').select('*');
  check('table interdite : erreur explicite', Boolean(forbidden.error),
    forbidden.error?.message ?? '');

  const embed = await supabase.from('clients').select('*, tenants(*)');
  check('jointure imbriquee signalee', Boolean(embed.error), embed.error?.message ?? '');

  // --- ecriture ---------------------------------------------------------
  console.log('\n--- ecriture ---');
  const label = `shim-${Date.now()}`;
  const inserted = await supabase.from('clients').insert({ name: label, tenant_id: 'autre-tenant' }).select();
  check('insert() renvoie la ligne creee', inserted.data?.[0]?.name === label,
    `error=${inserted.error?.message ?? 'aucun'}`);
  const newId = inserted.data?.[0]?.id;
  if (newId) created.push(newId);
  check('tenant impose par le serveur', inserted.data?.[0]?.tenant_id === tenantA,
    `obtenu=${inserted.data?.[0]?.tenant_id?.slice(0, 8)}`);

  if (newId) {
    const updated = await supabase.from('clients').update({ name: `${label}-mod` }).eq('id', newId).select();
    check('update() + eq() + select()', updated.data?.[0]?.name === `${label}-mod`,
      `error=${updated.error?.message ?? 'aucun'}`);

    const deleted = await supabase.from('clients').delete().eq('id', newId).select();
    check('delete() + eq() + select()', deleted.error === null && (deleted.data?.length ?? 1) >= 0,
      `error=${deleted.error?.message ?? 'aucun'}`);
  }

  // --- PostgREST ne leve jamais -----------------------------------------
  console.log('\n--- contrat d\'erreur ---');
  let threw = false;
  try { await supabase.from('table_inexistante').select('*'); } catch { threw = true; }
  check('une requete invalide ne leve pas', !threw);

  let threwOnError = false;
  try { await supabase.from('table_inexistante').select('*').throwOnError(); } catch { threwOnError = true; }
  check('throwOnError() leve bien', threwOnError);
} finally {
  console.log('\n--- nettoyage ---');
  if (created.length) {
    await realFetch(`${BASE}/api/data/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000',
        Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') },
      body: JSON.stringify({
        table: 'clients', op: 'delete',
        filters: [{ op: 'in', col: 'id', value: created }],
      }),
    }).catch(() => {});
    console.log(`  ${created.length} ligne(s) de test supprimee(s)`);
  }
  child.kill();
}

console.log(failures === 0 ? '\nTOUT EST PASSE' : `\n${failures} ECHEC(S)`);
process.exit(failures === 0 ? 0 : 1);
