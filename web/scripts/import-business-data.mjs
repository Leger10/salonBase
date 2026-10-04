// Import des donnees metier Supabase -> MariaDB.
//
// Le dump `backup/data_public.sql` est au format COPY de PostgreSQL
// (valeurs tab-separees, \N pour NULL). On le relit en JS, on convertit chaque
// valeur selon le type reel de la colonne MariaDB, puis on insere par lots dans
// un ordre respectant les dependances de cles etrangeres.
//
// Usage :
//   node scripts/import-business-data.mjs --dry-run   (plan, aucune ecriture)
//   node scripts/import-business-data.mjs             (import reel)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DUMP = path.join(ROOT, '..', 'backup', 'data_public.sql');
const DRY_RUN = process.argv.includes('--dry-run');

if (fs.existsSync(path.join(ROOT, '.env'))) process.loadEnvFile(path.join(ROOT, '.env'));

// Tables deja importees via scripts/import-users.mjs : on ne les touche pas.
const SKIP_TABLES = new Set(['profiles', 'tenants']);

const COPY_RE = /^COPY public\.([a-z_][a-z0-9_]*) \(([^)]*)\) FROM stdin;$/;

function parseDump(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let current = null;

  for (const line of lines) {
    if (current === null) {
      const m = COPY_RE.exec(line);
      if (m) {
        current = {
          table: m[1],
          // PostgreSQL cite les mots reserves : employees."position".
          columns: m[2].split(',').map((c) => c.trim().replace(/^"(.*)"$/, '$1')),
          rows: [],
        };
      }
      continue;
    }
    if (line === '\\.') {
      blocks.push(current);
      current = null;
      continue;
    }
    current.rows.push(line);
  }
  if (current) blocks.push(current);
  return blocks;
}

// COPY echappe les caracteres speciaux avec un antislash.
function unescape(value) {
  if (!value.includes('\\')) return value;
  let out = '';
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const next = value[++i];
    switch (next) {
      case 'n': out += '\n'; break;
      case 't': out += '\t'; break;
      case 'r': out += '\r'; break;
      case 'b': out += '\b'; break;
      case 'f': out += '\f'; break;
      case 'v': out += '\v'; break;
      case '\\': out += '\\'; break;
      default: out += next ?? '';
    }
  }
  return out;
}

const stats = { nulls: 0, bools: 0, timestamps: 0, arrays: 0, json: 0, dates: 0 };

// MySQL n'accepte pas le suffixe de fuseau de PostgreSQL (2026-07-03 15:47:59+00).
// Le motif doit exiger une partie horaire : sinon le `-25` d'une date simple
// (2026-06-25) serait pris pour un decalage.
function stripTimezone(value) {
  return value.replace(/([ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?)(?:Z|[+-]\d{2}:?\d{2})$/, '$1');
}

function convert(raw, column) {
  if (raw === '\\N') {
    stats.nulls++;
    return null;
  }
  const value = unescape(raw);

  switch (column.dataType) {
    case 'tinyint':
    case 'smallint':
    case 'mediumint':
    case 'int':
    case 'bigint':
    case 'bit':
      if (column.dataType === 'tinyint' && (value === 't' || value === 'f')) {
        stats.bools++;
        return value === 't' ? 1 : 0;
      }
      return /^-?\d+$/.test(value) ? Number(value) : value;

    case 'decimal':
    case 'numeric':
    case 'float':
    case 'double':
      // On laisse la chaine : MySQL convertit en decimal sans perte sur les montants.
      return value;

    case 'date':
      stats.dates++;
      return stripTimezone(value).slice(0, 10);

    case 'datetime':
    case 'timestamp':
      stats.timestamps++;
      return stripTimezone(value);

    case 'json': {
      stats.json++;
      const text = value.trim();
      if (text.startsWith('{') || text.startsWith('[')) {
        try {
          return JSON.stringify(JSON.parse(text));
        } catch {
          // Ce n'est pas du JSON valide :.array PostgreSQL ou texte brut.
          if (text.startsWith('{')) {
            stats.arrays++;
            return JSON.stringify(
              text
                .slice(1, -1)
                .split(',')
                .map((s) => s.replace(/^"|"$/g, ''))
                .filter((s) => s !== '')
            );
          }
          return text;
        }
      }
      return text;
    }

    default:
      return value;
  }
}

async function main() {
  if (!fs.existsSync(DUMP)) {
    console.error(`Dump introuvable : ${DUMP}`);
    process.exit(1);
  }

  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const blocks = parseDump(DUMP);
  console.log(`Dump : ${blocks.length} blocs COPY, ${blocks.reduce((n, b) => n + b.rows.length, 0)} lignes\n`);

  const dbTables = new Set(
    (
      await conn.query(
        `SELECT table_name t FROM information_schema.tables
          WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`
      )
    )[0].map((r) => r.t.toLowerCase())
  );

  const toImport = [];
  const skipped = [];
  const missing = [];

  for (const block of blocks) {
    const table = block.table.toLowerCase();
    if (SKIP_TABLES.has(table)) {
      skipped.push({ table, rows: block.rows.length, reason: 'deja importe' });
      continue;
    }
    if (!dbTables.has(table)) {
      missing.push(table);
      continue;
    }
    toImport.push({ ...block, table });
  }

  for (const s of skipped) console.log(`  ignore  ${s.table.padEnd(28)} ${String(s.rows).padStart(6)} lignes  (${s.reason})`);
  if (missing.length) console.log(`\n  ABSENTES de MariaDB : ${missing.join(', ')}`);

  const names = toImport.map((b) => b.table);

  // Colonnes reelles, pour convertir chaque valeur selon son type.
  const columnsByTable = new Map();
  const [colRows] = await conn.query(
    `SELECT table_name, column_name, data_type, is_nullable, column_type
       FROM information_schema.columns
      WHERE table_schema = DATABASE()`
  );
  for (const r of colRows) {
    const t = r.table_name.toLowerCase();
    if (!columnsByTable.has(t)) columnsByTable.set(t, new Map());
    columnsByTable.get(t).set(r.column_name.toLowerCase(), {
      dataType: String(r.data_type).toLowerCase(),
      isNullable: r.is_nullable === 'YES',
      columnType: String(r.column_type).toLowerCase(),
    });
  }

  // Colonnes presentes dans le dump mais absentes de MariaDB (et inversement).
  const unknownColumns = [];
  const missingColumns = [];
  for (const block of toImport) {
    const cols = columnsByTable.get(block.table);
    for (const c of block.columns) {
      if (!cols.has(c.toLowerCase())) unknownColumns.push(`${block.table}.${c}`);
    }
    for (const c of cols.keys()) {
      if (!block.columns.includes(c)) missingColumns.push(`${block.table}.${c}`);
    }
  }
  if (unknownColumns.length) console.log(`\n  Colonnes du dump absentes de MariaDB : ${unknownColumns.join(', ')}`);
  if (missingColumns.length) console.log(`\n  Colonnes MariaDB non remplies : ${missingColumns.slice(0, 40).join(', ')}`);

  // Ordre topologique : une table est inseree apres toutes celles qu'elle reference.
  const [fkRows] = await conn.query(
    `SELECT table_name, referenced_table_name
       FROM information_schema.key_column_usage
      WHERE table_schema = DATABASE() AND referenced_table_name IS NOT NULL`
  );
  const deps = new Map(names.map((n) => [n, []]));
  for (const r of fkRows) {
    const t = String(r.table_name).toLowerCase();
    const ref = String(r.referenced_table_name).toLowerCase();
    if (deps.has(t) && deps.has(ref) && t !== ref) deps.get(t).push(ref);
  }

  const ordered = [];
  const state = new Map();
  const visit = (table, stack = []) => {
    if (state.get(table) === 'done' || state.get(table) === 'doing') return;
    state.set(table, 'doing');
    for (const dep of deps.get(table) ?? []) {
      if (stack.includes(dep)) continue;
      visit(dep, [...stack, table]);
    }
    state.set(table, 'done');
    ordered.push(table);
  };
  for (const name of names) visit(name);

  const byTable = new Map(toImport.map((b) => [b.table, b]));
  console.log(`\n  Ordre d'import (${ordered.length} tables) :`);
  console.log(`  ${ordered.join(' -> ')}\n`);

  let totalInserted = 0;
  const CHUNK = 200;

  for (const table of ordered) {
    const block = byTable.get(table);
    const cols = columnsByTable.get(table);
    // On conserve l'index de la colonne dans le dump : si une colonne est
    // absente de MariaDB, les suivantes ne doivent pas decaler.
    const usable = block.columns
      .map((name, index) => ({ name, index, meta: cols.get(name.toLowerCase()) }))
      .filter((c) => c.meta);
    const placeholders = usable.map(() => '?').join(', ');

    if (DRY_RUN) {
      console.log(`  ${table.padEnd(28)} ${String(block.rows.length).padStart(6)} lignes  (${usable.length} colonnes utilisees)`);
      totalInserted += block.rows.length;
      continue;
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query(`DELETE FROM \`${table}\``);

    let misaligned = 0;
    let inserted = 0;
    for (let i = 0; i < block.rows.length; i += CHUNK) {
      const slice = block.rows.slice(i, i + CHUNK);
      const values = slice.map((row) => {
        const parts = row.split('\t');
        if (parts.length !== block.columns.length) misaligned++;
        return usable.map((c) => convert(parts[c.index] ?? '\\N', c.meta));
      });
      const sql =
        `INSERT INTO \`${table}\` (${usable.map((c) => `\`${c.name}\``).join(', ')}) VALUES ` +
        values.map((v) => `(${v.map(() => '?').join(', ')})`).join(', ');
      await conn.query(sql, values.flat());
      inserted += slice.length;
    }

    const [[{ n }]] = await conn.query(`SELECT COUNT(*) n FROM \`${table}\``);
    const ok = Number(n) === block.rows.length && misaligned === 0;
    console.log(`  ${ok ? 'OK  ' : 'DIFF'} ${table.padEnd(28)} dump=${String(block.rows.length).padStart(6)} base=${String(n).padStart(6)}${misaligned ? `  ${misaligned} lignes dealignees` : ''}`);
    if (!ok) process.exitCode = 1;
    totalInserted += inserted;
  }

  if (DRY_RUN) {
    console.log(`\nDRY RUN : ${totalInserted} lignes seraient inserees.`);
  } else {
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    const [[{ n }]] = await conn.query(
      `SELECT COUNT(*) n FROM information_schema.referential_constraints
        WHERE constraint_schema = DATABASE()`
    );
    console.log(`\n${totalInserted} lignes inserees, ${n} contraintes FK actives.`);

    const orphelins = await conn.query(
      `SELECT 'clients.tenant_id' ref, COUNT(*) n FROM clients c
         LEFT JOIN tenants t ON t.id = c.tenant_id WHERE c.tenant_id IS NOT NULL AND t.id IS NULL`
    );
    for (const o of orphelins[0]) {
      console.log(`  orphelins ${o.ref} : ${o.n}${Number(o.n) ? '  <-- A CORRIGER' : ''}`);
      if (Number(o.n)) process.exitCode = 1;
    }
  }

  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});