const fs = require('fs');
const path = require('path');

const TEMP = 'C:\\WINDOWS\\TEMP\\opencode';
const readJson = (f) =>
  JSON.parse(fs.readFileSync(path.join(TEMP, f), 'utf8').replace(/^\uFEFF/, '').trim());

const columns = readJson('cols.json');
const fks = readJson('fks.json');
const uniqueCons = readJson('uniques.json');
const indexMeta = readJson('indexes.json');

const raw = fs.readFileSync(path.resolve(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');

// ---- parse models ----
const models = new Map();
for (const block of raw.split(/\n(?=model )/)) {
  if (!block.startsWith('model ')) continue;
  const name = /^model (\w+) \{/.exec(block)[1];
  const body = block.slice(block.indexOf('{') + 1, block.lastIndexOf('}'));
  const fields = new Map();
  const rels = new Map();
  const blockId = [];
  const blockUnique = [];
  const blockIndex = [];
  const mapTo = /\n\s+@@map\("(.+?)"\)/.exec(block)?.[1];

  for (const line of body.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    let m = /^@@id\(\[([^\]]+)\]\)$/.exec(t);
    if (m) {
      blockId.push(...m[1].split(',').map((s) => s.trim()));
      continue;
    }
    m = /^@@unique\(\[([^\]]+)\]\)/.exec(t);
    if (m) {
      blockUnique.push(
        m[1].split(',').map((s) => s.trim().replace(/\(length: \d+\)/, ''))
      );
      continue;
    }
    m = /^@@index\(\[([^\]]+)\]/.exec(t);
    if (m) {
      blockIndex.push(
        m[1].split(',').map((s) => s.trim().replace(/\(length: \d+\)/, ''))
      );
      continue;
    }
    if (t.startsWith('@@')) continue;

    m = /^(\w+)\s+([\w\[\]]+)(\?)?(?:\s+(.*))?$/.exec(t);
    if (!m) continue;
    const [, fieldName, type, optional, rest] = m;
    const attrs = (rest ?? '').trim();
    if (attrs.startsWith('@relation(')) {
      rels.set(fieldName, attrs);
    } else {
      const colMap = /@map\("(.+?)"\)/.exec(attrs)?.[1] ?? fieldName;
      fields.set(fieldName, { type, optional: !!optional, attrs, column: colMap, line: t });
    }
  }
  models.set(name, { name, mapTo, fields, rels, id: blockId, unique: blockUnique, index: blockIndex });
}

// Modeles Better Auth, absents de la source Supabase public
const AUTH_TABLES = new Set(['session', 'account', 'verification']);
const AUTH_MODELS = new Set(['Session', 'Account', 'Verification']);
// Ecarts assumes sur `profiles` (table "user" de Better Auth)
const PROFILE_RENAMES = new Map([
  ['full_name', 'name'],
  ['avatar', 'image'],
]);
const PROFILE_EXTRA = ['email_verified', 'must_change_password'];

const errors = [];
const warnings = [];
const check = (cond, msg) => { if (!cond) errors.push(msg); };

const expectedTables = new Set(columns.map((c) => c.table_name));
const mappedTables = new Set([...models.values()].map((m) => m.mapTo));

for (const t of expectedTables) check(mappedTables.has(t), `table absente du schema : ${t}`);
for (const t of mappedTables) {
  if (AUTH_TABLES.has(t)) continue;
  check(expectedTables.has(t), `table en trop dans le schema : ${t}`);
}
const expectedModelCount = expectedTables.size + AUTH_MODELS.size;
check(
  models.size === expectedModelCount,
  `nombre de models ${models.size} != ${expectedModelCount} (${expectedTables.size} metier + ${AUTH_MODELS.size} Better Auth)`
);

const byTable = new Map([...models.values()].map((m) => [m.mapTo, m]));

const camel = (s) => {
  const w = s.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return w.map((x, i) => (i === 0 ? x.toLowerCase() : x[0].toUpperCase() + x.slice(1).toLowerCase())).join('');
};
// sur profiles, Better Auth impose des noms de champs Prisma differents
const profileField = (col) => PROFILE_RENAMES.get(col) ?? camel(col);

// ---- 1. colonnes : presence, type, nullabilite, mapping ----
let colCount = 0;
let nullabilityDeviations = 0;
for (const c of columns) {
  const m = byTable.get(c.table_name);
  if (!m) continue;
  const isAuthUser = c.table_name === 'profiles';
  const field = m.fields.get(isAuthUser ? profileField(c.column_name) : camel(c.column_name));
  if (!field) {
    errors.push(`colonne absente : ${c.table_name}.${c.column_name}`);
    continue;
  }
  colCount++;
  check(field.column === c.column_name, `mapping incorrect : ${c.table_name}.${c.column_name} -> ${field.column}`);
  // sur profiles, `name` devient NOT NULL (Better Auth) : ecart assume
  const expectedNullable = isAuthUser && c.column_name === 'full_name' ? false : c.is_nullable === 'YES';
  if (field.optional !== expectedNullable) {
    if (isAuthUser && c.column_name === 'full_name') {
      nullabilityDeviations++;
      warnings.push(`profiles.full_name: PG nullable -> Prisma NOT NULL (Better Auth exige name)`);
    } else {
      errors.push(
        `nullabilite incorrecte : ${c.table_name}.${c.column_name} prisma=${field.optional ? '?' : 'NOT NULL'} pg=${c.is_nullable}`
      );
    }
  }
  // le "?" doit suivre le type, jamais apparaitre dans les annotations
  // (on ignore les "?"(bufferes dans une valeur par defaut)
  const attrsNoStrings = field.attrs.replace(/"(\\.|[^"\\])*"/g, '""');
  check(!attrsNoStrings.includes('?'), `placement de "?" invalide : ${c.table_name}.${c.column_name} => "${field.line}"`);
}

// ---- 1b. colonnes ajoutees pour Better Auth ----
const profileModel = byTable.get('profiles');
for (const col of PROFILE_EXTRA) {
  check(profileModel.fields.has(camel(col)), `colonne Better Auth absente sur profiles : ${col}`);
}

// ---- 1c. les modeles Better Auth ne doivent contenir QUE les champs attendus ----
// (garde-fou : le generateur a deja produit une fois `account.profileId` parasite)
const AUTH_EXPECTED_FIELDS = {
  session: ['id', 'expiresAt', 'token', 'createdAt', 'updatedAt', 'ipAddress', 'userAgent', 'userId'],
  account: [
    'id', 'accountId', 'providerId', 'userId', 'accessToken', 'refreshToken', 'idToken',
    'accessTokenExpiresAt', 'refreshTokenExpiresAt', 'scope', 'password', 'createdAt', 'updatedAt',
  ],
  verification: ['id', 'identifier', 'value', 'expiresAt', 'createdAt', 'updatedAt'],
};
for (const [table, expected] of Object.entries(AUTH_EXPECTED_FIELDS)) {
  const m = byTable.get(table);
  if (!m) { errors.push(`table Better Auth absente : ${table}`); continue; }
  const actual = [...m.fields.keys()];
  for (const f of expected) check(actual.includes(f), `${table}.${f} manquant`);
  const extraFields = actual.filter((f) => !expected.includes(f));
  check(
    extraFields.length === 0,
    `${table} : champ(s) parasites ${extraFields.join(', ')} (Better Auth n'expose que ${expected.length} champs)`
  );
  // les colonnes Better Auth doivent etre exactement les colonnes attendues
  const mappedCols = [...m.fields.values()].map((f) => f.column);
  const dup = mappedCols.filter((c, i) => mappedCols.indexOf(c) !== i);
  check(dup.length === 0, `${table} : colonne(s) dupliquee(s) ${[...new Set(dup)].join(', ')}`);
  // la relation vers le user doit etre declaree explicitement (sinon Prisma en invente une)
  // Verification n'a pas de lien vers un utilisateur : on ne l'exige que pour session/account
  if (table !== 'verification') {
    check(m.rels.has('user'), `${table} : relation \`user\` vers Profile manquante`);
    const extraRels = [...m.rels.keys()].filter((r) => r !== 'user');
    check(extraRels.length === 0, `${table} : relation(s) parasite(s) ${extraRels.join(', ')}`);
  }
}
// Profile doit porter les deux relations inverses (listes : parsées comme des champs)
for (const [r, type] of [['sessions', 'Session[]'], ['accounts', 'Account[]']]) {
  check(profileModel.fields.get(r)?.type === type, `Profile.${r}: ${type} manquant`);
}

// ---- 2. cles primaires ----
for (const u of uniqueCons.filter((u) => u.contype === 'p')) {
  const m = byTable.get(u.table_name);
  if (!m) continue;
  if (u.columns.length === 1) {
    check(
      [...m.fields.values()].some((f) => /@id\b/.test(f.attrs)),
      `PK simple absente : ${u.table_name}`
    );
  } else {
    const got = m.id.map((x) => m.fields.get(x)?.column);
    check(
      JSON.stringify(got) === JSON.stringify(u.columns),
      `PK composite incorrecte : ${u.table_name} attendu ${u.columns.join(',')} obtenu ${got.join(',')}`
    );
  }
}

// ---- 3. contraintes UNIQUE ----
const expectedUnique = uniqueCons.filter((u) => u.contype === 'u');
let uniqueOk = 0;
for (const u of expectedUnique) {
  const m = byTable.get(u.table_name);
  if (!m) continue;
  const want = u.columns.map(camel);
  const pkCols = new Set((uniqueCons.find((x) => x.table_name === u.table_name && x.contype === 'p')?.columns ?? []).map(camel));
  const hit = m.unique.find((uu) => JSON.stringify(uu) === JSON.stringify(want));
  if (hit) uniqueOk++;
  else if (want.some((w) => pkCols.has(w)))
    warnings.push(`@@unique ignoree (colonne PK) : ${u.table_name}(${u.columns.join(',')})`);
  else errors.push(`@@unique absente : ${u.table_name}(${u.columns.join(',')})`);
}

// ---- 4. index ----
const coveredIndexNames = new Set();
for (const i of indexMeta.filter((i) => i.table_name && !i.is_primary && !i.is_unique)) {
  const m = byTable.get(i.table_name);
  if (!m) continue;
  const want = i.columns.map(camel);
  const pkCols = new Set((uniqueCons.find((x) => x.table_name === i.table_name && x.contype === 'p')?.columns ?? []).map(camel));
  if (want.some((w) => pkCols.has(w))) {
    warnings.push(`index ignore (PK) : ${i.index_name}`);
    continue;
  }
  const hit = m.index.find((ii) => JSON.stringify(ii) === JSON.stringify(want));
  if (hit) coveredIndexNames.add(i.index_name);
  else errors.push(`@@index absent : ${i.index_name} sur ${i.table_name}(${i.columns.join(',')})`);
}
const uniqueIndexNames = new Set(indexMeta.filter((i) => i.is_unique && !i.is_primary).map((i) => i.index_name));
for (const n of uniqueIndexNames) coveredIndexNames.add(n);

// ---- 5. relations ----
const relationNames = new Set();
for (const [, m] of models) for (const [, attrs] of m.rels) {
  const rn = /@relation\("(.+?)"/.exec(attrs)?.[1];
  if (rn) relationNames.add(rn);
}
let sideCount = new Map();
for (const [, m] of models) {
  for (const [, attrs] of m.rels) {
    const rn = /@relation\("(.+?)"/.exec(attrs)?.[1];
    if (rn) sideCount.set(rn, (sideCount.get(rn) ?? 0) + 1);
  }
}
for (const [rn, n] of sideCount) {
  check(n === 2, `relation ${rn} : ${n} cote(s) declare(s) au lieu de 2`);
}
let fkOk = 0;
for (const f of fks) {
  if (f.foreign_schema !== 'public') {
    check(!relationNames.has(f.constraint_name), `FK auth conservee a tort dans le schema : ${f.constraint_name}`);
    continue;
  }
  check(relationNames.has(f.constraint_name), `relation absente : ${f.constraint_name}`);
  if (relationNames.has(f.constraint_name)) fkOk++;
  const child = byTable.get(f.table_name);
  const parent = byTable.get(f.foreign_table_name);
  const childRel = [...child.rels].find(([, a]) => a.includes(`"${f.constraint_name}"`));
  if (childRel && parent) {
    const fieldsArg = /fields: \[([^\]]+)\]/.exec(childRel[1])?.[1].split(',').map((s) => s.trim());
    const refsArg = /references: \[([^\]]+)\]/.exec(childRel[1])?.[1].split(',').map((s) => s.trim());
    check(
      JSON.stringify(fieldsArg) === JSON.stringify(f.columns.map(camel)),
      `${f.constraint_name}: fields ${fieldsArg} != ${f.columns.map(camel)}`
    );
    check(
      JSON.stringify(refsArg) === JSON.stringify(f.foreign_columns.map(camel)),
      `${f.constraint_name}: references ${refsArg} != ${f.foreign_columns.map(camel)}`
    );
  }
}

// ---- rapport ----
const pkIndexes = indexMeta.filter((i) => i.is_primary).length;
const uniqIndexes = indexMeta.filter((i) => i.is_unique && !i.is_primary).length;
const plainIndexes = indexMeta.filter((i) => !i.is_primary && !i.is_unique).length;
const emittedPlain = [...models.values()].reduce((a, m) => a + m.index.length, 0);
console.log(`models           : ${models.size}/${expectedModelCount} (${expectedTables.size} metier + ${AUTH_MODELS.size} Better Auth)`);
console.log(`colonnes         : ${colCount}/${columns.length}`);
console.log(`@@id (PK)        : ${uniqueCons.filter((u) => u.contype === 'p').length}`);
console.log(`@@unique         : ${uniqueOk}/${expectedUnique.length}  (index uniques PG: ${uniqIndexes})`);
console.log(`@@index          : ${emittedPlain}/${plainIndexes}  (index simples PG: ${plainIndexes})`);
console.log(`@@relation       : ${fkOk}/${fks.filter((f) => f.foreign_schema === 'public').length} (+ ${fks.length - fkOk} FK auth reportees)`);
console.log(`total index PG   : ${indexMeta.length} = ${pkIndexes} PK + ${uniqIndexes} unique + ${plainIndexes} simples`);
console.log(`\nAVERTISSEMENTS (${warnings.length})`);
for (const w of warnings.slice(0, 20)) console.log('  ~ ' + w);
if (warnings.length > 20) console.log(`  ~ ... +${warnings.length - 20} autres`);
console.log(`\nERREURS (${errors.length})`);
for (const e of errors.slice(0, 40)) console.log('  ! ' + e);
if (errors.length > 40) console.log(`  ! ... +${errors.length - 40} autres`);

process.exit(errors.length === 0 ? 0 : 1);