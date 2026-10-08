// Analyse l'usage reel du client Supabase dans le frontend pour choisir
// entre reecriture fichier par fichier et couche de compatibilite.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) files.push(full);
  }
})(ROOT);

const methods = new Map();
const tables = new Map();
const patterns = { embeds: 0, rpc: 0, storage: 0, functions: 0, realtime: 0, admin: 0, files: 0 };
const imports = [];

const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);

  if (!/from\s+['"]@\/lib\/supabase['"]|from\s+['"].*lib\/supabase/.test(text)) continue;
  patterns.files++;
  if (/supabaseAdmin/.test(text)) patterns.admin++;
  imports.push(rel);

  for (const m of text.matchAll(/\.from\(\s*['"]([a-z_]+)['"]/g)) bump(tables, m[1]);
  for (const m of text.matchAll(/\.select\(\s*(['"`])([^'"`]*)\1/g)) {
    bump(methods, 'select');
    if (/\(/.test(m[2])) patterns.embeds++;
  }
  for (const m of text.matchAll(/\.(\w+)\(/g)) bump(methods, m[1]);
  if (/\.rpc\(/.test(text)) patterns.rpc++;
  if (/\.storage\s*\./.test(text)) patterns.storage++;
  if (/\.functions\s*\./.test(text)) patterns.functions++;
  if (/\.channel\(|postgres_changes/.test(text)) patterns.realtime++;
}

console.log(`Fichiers qui importent le client Supabase : ${patterns.files}\n`);

const ignored = new Set(['log', 'error', 'warn', 'then', 'catch', 'map', 'filter', 'forEach', 'if', 'length', 'name']);
const relevant = [...methods.entries()]
  .filter(([k]) => !ignored.has(k))
  .sort((a, b) => b[1] - a[1]);

console.log('Methodes de query-builder utilisees :');
for (const [name, count] of relevant) {
  if (count >= 1) console.log(`  ${String(count).padStart(5)}  .${name}`);
}

console.log(`\nTables touchees (${tables.size}) :`);
console.log('  ' + [...tables.entries()].sort((a, b) => b[1] - a[1]).map(([t, c]) => `${t}(${c})`).join('  '));

console.log('\nFonctionnalites hors query-builder :');
console.log(`  select avec imbrication  : ${patterns.embeds}`);
console.log(`  rpc()                   : ${patterns.rpc}`);
console.log(`  storage                 : ${patterns.storage}`);
console.log(`  functions.invoke        : ${patterns.functions}`);
console.log(`  realtime (channel)      : ${patterns.realtime}`);
console.log(`  supabaseAdmin           : ${patterns.admin}`);

console.log('\nFichiers (30 premiers) :');
for (const f of imports.slice(0, 30)) console.log('  ' + f);
console.log(`  ... et ${Math.max(0, imports.length - 30)} autres`);