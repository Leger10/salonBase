import fs from 'node:fs';
import path from 'node:path';

const TEMP = 'C:\\WINDOWS\\TEMP\\opencode';
const OUT = path.resolve(process.argv[2] ?? '.');

const readJson = (f) =>
  JSON.parse(fs.readFileSync(path.join(TEMP, f), 'utf8').replace(/^\uFEFF/, '').trim());

const columns = readJson('cols.json');
const fks = readJson('fks.json');
const uniqueCons = readJson('uniques.json');
const indexMeta = readJson('indexes.json');
const checks = readJson('checks.json');
const triggers = readJson('triggers.json');

const notes = {
  omittedForeignKeys: [],
  omittedDefaults: [],
  checkConstraints: checks,
  triggers,
  textColumnsPromotedForUnique: [],
  timeColumnsAsString: [],
  collationNotes: [],
  // Ecarts assumes entre le schema Supabase et le schema MariaDB genere.
  intentionalDeviations: [
    'profiles.full_name : NULLABLE -> NOT NULL (Better Auth exige `name` ; les 16 profils sont renseignes)',
    'profiles.avatar : colonne conservee, champ Prisma renomme `image` (nom impose par Better Auth)',
    'profiles.email : ajout de @@unique([email]) (unicite globale exigee par Better Auth)',
    'profiles : + colonnes email_verified et must_change_password (Better Auth / regle metier)',
    'tables supplementaires : session, account, verification (Better Auth, minuscules car lower_case_table_names=1)',
  ],
  notEnforcedByMysql: {
    checkConstraints: `${checks.length} CHECK PostgreSQL ne sont PAS appliques : MariaDB 10.4 les analyse mais ne les fait pas respecter. A porter dans la logique API.`,
    triggers: `${triggers.length} triggers PostgreSQL a recreer (TRIGGER MariaDB ou code applicatif).`,
    rls: 'Les politiques RLS Supabase ne sont pas transposables : l\'autorisation doit etre appliquee par l\'API Node (role + tenant_id).',
    functions: 'Les fonctions/RPC PostgreSQL doivent etre reimplementees cote API.',
  },
  encoding: {
    extraction: 'PGCLIENTENCODING=UTF8 obligatoire sous Windows (sinon double conversion CP437 -> UTF-8).',
    target: 'MariaDB 10.4.32, utf8mb4 / utf8mb4_unicode_ci, lower_case_table_names=1.',
    verified: 'Accents et emoji verifies en lecture/ecriture (scripts de compatibilite supprimes apres passage).',
  },
};

/* ---------- naming ---------- */

const words = (s) => String(s).split(/[^A-Za-z0-9]+/).filter(Boolean);

const pascal = (s) =>
  words(s)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');

const camel = (s) => {
  const w = words(s);
  return w
    .map((x, i) => (i === 0 ? x.toLowerCase() : x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()))
    .join('');
};

const IRREGULAR = new Map([
  ['news', 'news'],
  ['series', 'series'],
  ['sms', 'sms'],
]);

function singularWord(w) {
  const lower = w.toLowerCase();
  if (IRREGULAR.has(lower)) return IRREGULAR.get(lower);
  if (/ies$/i.test(w)) return w.slice(0, -3) + 'y';
  if (/(ses|xes|zes|ches|shes)$/i.test(w)) return w.slice(0, -2);
  if (/ss$/i.test(w)) return w;
  if (/us$/i.test(w)) return w;
  if (/s$/i.test(w)) return w.slice(0, -1);
  return w;
}

const singularTable = (t) => words(t).map(singularWord).join('_');

/* ---------- type mapping ---------- */

// varchar limit usable inside a utf8mb4 index key (InnoDB 3072 byte limit)
const TEXT_UNIQUE_LEN = 500;
// prefixe max sur un index MySQL : 191 * 4 octets = 764 (compatible 767 et 3072)
const PREFIX_LEN = 191;

function isInUniqueIndex(table, column) {
  return uniqueCons.some((u) => u.table_name === table && u.columns.includes(column));
}

function mapType(col) {
  const table = col.table_name;
  const colName = col.column_name;
  const len = col.character_maximum_length;

  switch (col.data_type) {
    case 'uuid':
      return { base: 'String', db: '@db.Char(36)' };

    case 'character varying': {
      const effective = len ?? 255;
      if (isInUniqueIndex(table, colName) && effective > TEXT_UNIQUE_LEN) {
        notes.textColumnsPromotedForUnique.push(`${table}.${colName} ${effective} -> ${TEXT_UNIQUE_LEN}`);
      }
      const finalLen = isInUniqueIndex(table, colName) ? Math.min(effective, TEXT_UNIQUE_LEN) : effective;
      return { base: 'String', db: `@db.VarChar(${finalLen})` };
    }

    case 'text': {
      if (isInUniqueIndex(table, colName)) {
        notes.textColumnsPromotedForUnique.push(`${table}.${colName} TEXT -> VarChar(${TEXT_UNIQUE_LEN})`);
        return { base: 'String', db: `@db.VarChar(${TEXT_UNIQUE_LEN})` };
      }
      return { base: 'String', db: '@db.Text' };
    }

    case 'jsonb':
    case 'json':
      return { base: 'Json' };

    case 'boolean':
      return { base: 'Boolean' };

    case 'smallint':
      return { base: 'SmallInt' };

    case 'integer':
      return { base: 'Int' };

    case 'bigint':
      return { base: 'BigInt' };

    case 'numeric':
    case 'decimal': {
      const p = col.numeric_precision ?? 12;
      const s = col.numeric_scale ?? 2;
      return { base: 'Decimal', db: `@db.Decimal(${Math.min(p, 65)},${Math.min(s, 30)})` };
    }

    case 'real':
      return { base: 'Float' };

    case 'double precision':
      return { base: 'Double' };

    case 'date':
      return { base: 'DateTime', db: '@db.Date' };

    case 'timestamp with time zone':
    case 'timestamp without time zone':
      return { base: 'DateTime', db: '@db.DateTime(3)' };

    case 'time with time zone':
    case 'time without time zone':
      // Stocke en VARCHAR(8) : l'existant consomme ces champs comme des chaines
      // ("HH:MM:SS"), comme le faisait PostgREST. Prisma refuserait String sur TIME.
      notes.timeColumnsAsString.push(`${table}.${colName} time -> VarChar(8)`);
      return { base: 'String', db: '@db.VarChar(8)' };

    case 'bytea':
      return { base: 'Bytes' };

    default:
      notes.collationNotes.push(`type non mappé -> String : ${table}.${colName} (${col.data_type})`);
      return { base: 'String', db: '@db.Text' };
  }
}

/* ---------- defaults ---------- */

function mapDefault(col) {
  const d = col.column_default;
  const ref = `${col.table_name}.${col.column_name}`;
  if (d === null || d === undefined) return null;

  if (/^(gen_random_uuid|uuid_generate_v4|uuid_generate_v1)\(\)$/i.test(d)) return '@default(uuid())';
  if (/^now\(\)$/i.test(d) || /^CURRENT_TIMESTAMP/i.test(d)) return '@default(now())';
  if (/^CURRENT_DATE$/i.test(d)) return '@default(now())';
  if (d === 'true') return '@default(true)';
  if (d === 'false') return '@default(false)';

  let m = /^'((?:[^']|'')*)'::(character varying|text|bpchar)$/i.exec(d);
  if (m) {
    const value = m[1].replace(/''/g, "'").replace(/'/g, "\\'");
    return `@default("${value}")`;
  }

  m = /^\(?(-?\d+(?:\.\d+)?)\)?$/.exec(d);
  if (m) return `@default(${m[1]})`;

  // defaut JSON : '...'::jsonb  ->  @default("...")  (Prisma accepte un JSON en String)
  m = /^'((?:[^']|'')*)'::jsonb?$/i.exec(d);
  if (m) {
    const raw = m[1].replace(/''/g, "'");
    try {
      JSON.parse(raw);
    } catch {
      notes.omittedDefaults.push(`${ref} -> JSON invalide, non reporte : ${raw.slice(0, 60)}`);
      return null;
    }
    return `@default(${JSON.stringify(raw)})`;
  }

  notes.omittedDefaults.push(`${ref} -> ${d.slice(0, 80)}`);
  return null;
}

/* ---------- grouping ---------- */

const tables = [...new Set(columns.map((c) => c.table_name))].sort();

const modelNames = new Map();
const usedModelNames = new Set();
for (const t of tables) {
  let name = pascal(singularTable(t));
  while (usedModelNames.has(name)) name += 'Base';
  usedModelNames.add(name);
  modelNames.set(t, name);
}

const columnsByTable = new Map();
for (const t of tables) columnsByTable.set(t, columns.filter((c) => c.table_name === t));

const uniquesByTable = new Map();
const pksByTable = new Map();
for (const u of uniqueCons) {
  const list = uniquesByTable.get(u.table_name) ?? [];
  list.push(u);
  uniquesByTable.set(u.table_name, list);
  if (u.contype === 'p') pksByTable.set(u.table_name, u);
}

// FK non representables dans le schema Prisma : cibles hors schema public
// (relations vers auth.users, remplacees par Better Auth) et auto-reference sur la PK.
const skippedFkKeys = new Set();
const usableFks = [];
for (const f of fks) {
  if (f.foreign_schema !== 'public') {
    skippedFkKeys.add(f.constraint_name);
    notes.omittedForeignKeys.push(
      `${f.constraint_name}: ${f.table_name}.${f.columns.join('+')} -> ${f.foreign_schema}.${f.foreign_table_name}.${f.foreign_columns.join('+')} (relation Auth, à porter par Better Auth)`
    );
    continue;
  }
  const isSelfOnPk =
    f.table_name === f.foreign_table_name &&
    f.columns.length === 1 &&
    pksByTable.get(f.table_name)?.columns.includes(f.columns[0]);
  if (isSelfOnPk) {
    skippedFkKeys.add(f.constraint_name);
    notes.omittedForeignKeys.push(
      `${f.constraint_name}: ${f.table_name}.${f.columns[0]} -> ${f.foreign_table_name}.${f.foreign_columns[0]} (auto-référence sur la PK, conservée en DDL brut)`
    );
    continue;
  }
  usableFks.push(f);
}

const fksByChild = new Map();
for (const f of usableFks) {
  const list = fksByChild.get(f.table_name) ?? [];
  list.push(f);
  fksByChild.set(f.table_name, list);
}

const fksByParent = new Map();
for (const f of usableFks) {
  const list = fksByParent.get(f.foreign_table_name) ?? [];
  list.push(f);
  fksByParent.set(f.foreign_table_name, list);
}

/* ---------- relation field naming ---------- */

const scalarFieldByTableCol = new Map();
const usedFieldNames = new Map();

for (const t of tables) {
  const used = new Set();
  for (const c of columnsByTable.get(t)) {
    let name = camel(c.column_name);
    let i = 2;
    while (used.has(name)) name = `${camel(c.column_name)}${i++}`;
    used.add(name);
    scalarFieldByTableCol.set(`${t}.${c.column_name}`, name);
  }
  usedFieldNames.set(t, used);
}

const relationFieldOnChild = new Map();
for (const f of usableFks) {
  const base = singularTable(f.foreign_table_name);
  let name = camel(base);
  if (f.columns.length === 1) {
    const col = f.columns[0];
    const derived = /_id$/.test(col) ? col.replace(/_id$/, '') : col;
    if (derived && derived !== 'id') name = camel(derived);
  }
  const used = usedFieldNames.get(f.table_name);
  let candidate = name;
  let i = 2;
  while (used.has(candidate)) candidate = `${name}${i++}`;
  used.add(candidate);
  relationFieldOnChild.set(f.constraint_name, candidate);
}

const backFieldOnParent = new Map();
for (const t of tables) {
  const list = fksByParent.get(t) ?? [];
  const perChildCount = new Map();
  for (const f of list) perChildCount.set(f.table_name, (perChildCount.get(f.table_name) ?? 0) + 1);
  for (const f of list) {
    let name = camel(f.table_name);
    if ((perChildCount.get(f.table_name) ?? 0) > 1) {
      const suffix = f.columns.map((c) => pascal(c.replace(/_id$/, ''))).join('');
      name = `${name}${suffix}`;
    }
    const used = usedFieldNames.get(t);
    let candidate = name;
    let i = 2;
    while (used.has(candidate)) candidate = `${name}${i++}`;
    used.add(candidate);
    backFieldOnParent.set(f.constraint_name, candidate);
  }
}

const onDeleteAction = (code) =>
  ({ a: null, r: 'Restrict', c: 'Cascade', n: 'SetNull', d: 'SetDefault' })[code] ?? null;

/* ---------- model emission ---------- */

function emitField(col) {
  const { base, db } = mapType(col);
  const nullable = col.is_nullable === 'YES';
  const parts = [nullable ? `${base}?` : base];
  if (db) parts.push(db);
  const def = mapDefault(col);
  if (def) parts.push(def);
  const fieldName = scalarFieldByTableCol.get(`${col.table_name}.${col.column_name}`);
  if (fieldName !== col.column_name) parts.push(`@map("${col.column_name}")`);
  return `  ${fieldName} ${parts.join(' ')}`;
}

function emitModel(table) {
  const model = modelNames.get(table);
  const lines = [`model ${model} {`];

  const pk = pksByTable.get(table);
  if (pk) {
    if (pk.columns.length === 1) {
      const col = columnsByTable.get(table).find((x) => x.column_name === pk.columns[0]);
      const { base, db } = mapType(col);
      const parts = [base];
      if (db) parts.push(db);
      const def = mapDefault(col);
      if (def) parts.push(def);
      const fieldName = scalarFieldByTableCol.get(`${table}.${pk.columns[0]}`);
      if (fieldName !== pk.columns[0]) parts.push(`@map("${pk.columns[0]}")`);
      lines.push(`  ${fieldName} ${parts.join(' ')} @id`);
    } else {
      const fields = pk.columns.map((c) => scalarFieldByTableCol.get(`${table}.${c}`));
      lines.push(`  @@id([${fields.join(', ')}])`);
    }
  }

  const pkSingle = pk && pk.columns.length === 1;
  for (const col of columnsByTable.get(table)) {
    if (pkSingle && pk.columns.includes(col.column_name)) continue;
    lines.push(emitField(col));
  }

  for (const f of fksByChild.get(table) ?? []) {
    const childField = relationFieldOnChild.get(f.constraint_name);
    const targetModel = modelNames.get(f.foreign_table_name);
    const scalarFields = f.columns.map((c) => scalarFieldByTableCol.get(`${table}.${c}`));
    const targetFields = f.foreign_columns.map((c) => scalarFieldByTableCol.get(`${f.foreign_table_name}.${c}`) ?? camel(c));
    const args = [
      `"${f.constraint_name}"`,
      `fields: [${scalarFields.join(', ')}]`,
      `references: [${targetFields.join(', ')}]`,
    ];
    const onDel = onDeleteAction(f.on_delete);
    if (onDel) args.push(`onDelete: ${onDel}`);
    const fkCol = columnsByTable.get(table).find((c) => c.column_name === f.columns[0]);
    if (fkCol && fkCol.is_nullable === 'YES') {
      lines.push(`  ${childField} ${targetModel}? @relation(${args.join(', ')})`);
    } else {
      lines.push(`  ${childField} ${targetModel} @relation(${args.join(', ')})`);
    }
  }

  const backList = fksByParent.get(table) ?? [];
  if (backList.length > 0) {
    lines.push('');
    for (const f of backList) {
      const backField = backFieldOnParent.get(f.constraint_name);
      const childModel = modelNames.get(f.table_name);
      lines.push(`  ${backField} ${childModel}[] @relation("${f.constraint_name}")`);
    }
  }

  const pkFieldSet = new Set((pk?.columns ?? []).map((c) => scalarFieldByTableCol.get(`${table}.${c}`)));
  for (const u of uniquesByTable.get(table) ?? []) {
    if (u.contype === 'p') continue;
    const fields = u.columns.map((c) => scalarFieldByTableCol.get(`${table}.${c}`));
    if (fields.some((f) => pkFieldSet.has(f))) continue;
    lines.push(`  @@unique([${fields.join(', ')}])`);
  }

  for (const idx of indexMeta.filter((i) => i.table_name === table && !i.is_primary && !i.is_unique)) {
    if (idx.predicate) continue;
    const fields = idx.columns.map((c) => {
      const col = columnsByTable.get(table).find((x) => x.column_name === c);
      const fieldName = scalarFieldByTableCol.get(`${table}.${c}`);
      // MySQL: un index sur TEXT exige une longueur de préfixe
      return col?.data_type === 'text' ? `${fieldName}(length: ${PREFIX_LEN})` : fieldName;
    });
    if (fields.length === 0) continue;
    lines.push(`  @@index([${fields.join(', ')}], map: "${idx.index_name}")`);
  }

  lines.push(`  @@map("${table}")`);
  lines.push('}');
  return lines.join('\n');
}

/* ---------- adaptation de `profiles` pour Better Auth ---------- */
// Better Auth exige sur la table "user" : name (requis), email (requis + unique),
// emailVerified, image, createdAt, updatedAt. profiles fournit deja l'essentiel,
// mais full_name doit s'appeler `name` (nom de champ Prisma attendu par l'adaptateur).
const AUTH_USER_TABLE = 'profiles';
const authUserAdjusted = [];

function adjustAuthUserModel(block) {
  if (!block.includes(`model ${modelNames.get(AUTH_USER_TABLE)} {`)) return block;

  // 1. full_name -> name, NOT NULL (@map conserve la colonne).
  //    Better Auth exige `name` ; les 16 profils existants ont tous full_name renseigne.
  block = block.replace(
    /^(\s+)fullName\s+String\?\s+@db\.VarChar\(255\)\s+@map\("full_name"\)$/m,
    '$1name  String   @db.VarChar(255) @map("full_name")'
  );
  authUserAdjusted.push('profiles.full_name: NULLABLE -> NOT NULL (Better Auth exige name)');
  // 2. avatar -> image : Better Auth lit le nom de champ `image`,
  //    mais on conserve la colonne source `avatar` via @map (import direct).
  block = block.replace(/^(\s+)avatar\s+String\?\s+@db\.Text$/m, '$1image String?   @db.Text @map("avatar")');
  // 3. champs Better Auth manquants + regles metier
  const extra = [
    '',
    '  emailVerified      Boolean  @default(false) @map("email_verified")',
    '  mustChangePassword Boolean  @default(true) @map("must_change_password")',
    '  sessions           Session[]',
    '  accounts           Account[]',
  ].join('\n');
  block = block.replace(/^(\s+@@index\(|^\s+@@unique\(|^\s+@@map\()/m, extra + '\n\n$&');

  // 4. Better Auth exige un email unique globalement (pas seulement par tenant)
  if (!/@@unique\(\[[^\]]*\bemail\b/.test(block)) {
    block = block.replace(/^(\s+@@index\()/m, '  @@unique([email])\n\n$1');
    authUserAdjusted.push('email: @@unique([email]) ajoute (requis par Better Auth)');
  }

  authUserAdjusted.push(
    `${AUTH_USER_TABLE}: full_name -> name, avatar -> image, +email_verified, +must_change_password, +sessions, +accounts`
  );
  return block;
}

/* ---------- output ---------- */

const header = `// GENERE AUTOMATIQUEMENT - ne pas editer a la main.
// Source : base Supabase (schema public) via information_schema / pg_catalog.
// Regenerer : node gen-schema.mjs

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}`;

const body = tables.map((t) => adjustAuthUserModel(emitModel(t))).join('\n\n');

const authFragmentPath = path.join(OUT, 'auth.prisma');
const authFragment = fs.existsSync(authFragmentPath)
  ? `\n${fs.readFileSync(authFragmentPath, 'utf8').trim()}\n`
  : '';

fs.writeFileSync(path.join(OUT, 'schema.prisma'), `${header}\n\n${body}${authFragment}`, 'utf8');
fs.writeFileSync(
  path.join(OUT, 'migration-notes.json'),
  JSON.stringify(
    {
      generatedFrom: 'supabase/public',
      tableCount: tables.length,
      modelNames: Object.fromEntries(modelNames),
      betterAuth: {
        userModel: 'Profile',
        userTable: AUTH_USER_TABLE,
        adjustments: authUserAdjusted,
        authModels: ['Session', 'Account', 'Verification'],
        idGeneration: 'advanced.database.generateId = "uuid" (colonne char(36)alignee sur profiles.id)',
      },
      ...notes,
    },
    null,
    2
  ),
  'utf8'
);

console.log(`models: ${tables.length}`);
console.log(`columns: ${columns.length}`);
console.log(`relations: ${usableFks.length} (${skippedFkKeys.size} FK non representable(s) -> migration-notes.json)`);
console.log(`omitted defaults: ${notes.omittedDefaults.length}`);
console.log(`text -> varchar promotions: ${notes.textColumnsPromotedForUnique.length}`);