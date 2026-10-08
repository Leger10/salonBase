// Moteur de requetes generique, expose sur POST /api/data/query.
//
// Objectif : remplacer les appels PostgREST (`supabase.from(...).select(...)`)
// sans avoir a reecrire les 110 fichiers du frontend. Tout ce qui arrive du
// client est donc non fiable : la table, les colonnes et les filtres sont
// valides ici, et surtout le perimetre tenant est impose par la session.
//
// Le mapping nom de colonne SQL (snake_case) <-> champ Prisma (camelCase) est
// deduit du schema via le DMMF, donc aucune liste maintenue a la main.
import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { HttpError } from './middleware/auth.js';

// Tables Better Auth : accessibles uniquement via /api/auth/*.
const FORBIDDEN_TABLES = new Set(['account', 'session', 'verification']);

// Colonnes qu'un client generic n'a pas le droit d'ecrire. Le role, le tenant et
// le statut d'un profil se changent par PATCH /api/profiles/:id, qui verifie les
// regles de hierarchie.
const PROTECTED_PROFILE_COLUMNS = new Set([
  'role',
  'tenant_id',
  'is_active',
  'email_verified',
  'must_change_password',
  'email',
]);

// Niveau de role minimal autorise a ecrire dans la table.
const WRITE_LEVEL = {
  profiles: 'super_admin',
  tenants: 'super_admin',
  platform_settings: 'super_admin',
  app_settings: 'super_admin',
  subscription_plans: 'super_admin',
  tenant_settings: 'admin',
  tenant_home_settings: 'admin',
  loyalty_settings: 'admin',
  users: 'super_admin',
  user_tenants: 'super_admin',
};

// Roles par defaut quand la table n'est pas listee. Un employe peut supprimer
// une fiche comme il la cree : ce qui protege d'une suppression massive, c'est
// le perimetre tenant impose plus le refus de delete sans filtre (voir runQuery),
// pas un role plus eleve — sinon l'interface de gestion des clients serait
// inutilisable au quotidien.
const DEFAULT_WRITE = {
  insert: 'employee',
  update: 'employee',
  delete: 'employee',
  upsert: 'employee',
};
// Tables de configuration partagees par toute la plateforme : lecture ouverte
// a tout utilisateur authentifie, ecriture reservee au super_admin.
const GLOBAL_TABLES = new Set([
  'platform_settings',
  'app_settings',
  'subscription_plans',
  'loyalty_settings',
  'category_templates',
  'service_templates',
  'specialty_types',
]);

let REGISTRY = null;

/**
 * Chemins de portee tenant vers une table qui porte `tenant_id`.
 *
 * 16 tables n'ont pas de colonne tenant_id, et la plupart restent rattachees a
 * un tenant : employee_schedules par employee_id -> employees.tenant_id,
 * home_visits par appointment_id, medical_notes par client_id, etc. Sans ce
 * calcul, un utilisateur authentifie pourrait lire les plannings et les notes
 * medicales de tous les etablissements.
 *
 * Plusieurs chemins peuvent mener au tenant pour une meme table : une ligne de
 * transaction porte soit une transaction, soit un produit. On les renvoie tous
 * plutot que d'en choisir un, sinon les lignes de prestation (produit nul)
 * deviendraient invisibles jusqu'a leur propre tenant.
 *
 * Chaque chemin est une liste de relations a parcourir depuis la table ;
 * chemin vide = la table porte elle-meme tenant_id.
 */
function computeScopePaths(model, byName, prefix, seen, out, depth) {
  if (out.length >= 8 || depth > 4) return;
  if (model.fields.some((f) => f.dbName === 'tenant_id')) {
    out.push(prefix);
    return;
  }
  if (GLOBAL_TABLES.has(model.dbName)) return;
  if (seen.has(model.name)) return;
  seen.add(model.name);

  for (const field of model.fields) {
    if (field.kind !== 'object' || field.isList) continue;
    const target = byName.get(field.type);
    if (!target) continue;
    computeScopePaths(target, byName, [...prefix, field.name], new Set(seen), out, depth + 1);
  }
}

function computeScope(model, byName) {
  if (model.dbName === 'tenants') return 'self';
  if (model.fields.some((f) => f.dbName === 'tenant_id')) return 'direct';
  if (GLOBAL_TABLES.has(model.dbName)) return 'global';

  const paths = [];
  computeScopePaths(model, byName, [], new Set(), paths, 0);
  if (paths.length === 0) return 'global';
  return { paths };
}

function buildRegistry() {
  if (REGISTRY) return REGISTRY;

  const byName = new Map();
  for (const model of Prisma.dmmf.datamodel.models) byName.set(model.name, model);

  const tables = new Map();
  for (const model of Prisma.dmmf.datamodel.models) {
    const table = model.dbName;
    if (FORBIDDEN_TABLES.has(table)) continue;

    const columns = new Map();
    for (const field of model.fields) {
      // Seuls les vrais colonnes entrent dans le dictionnaire. Un champ de
      // relation n'a pas de dbName : sans ce filtre, `columns: 'tenant'`
      // passerait la validation et rapporterait des donnees liees non prevues.
      if (field.kind !== 'scalar' && field.kind !== 'enum') continue;
      const column = field.dbName ?? field.name;
      columns.set(column, {
        prisma: field.name,
        type: field.type,
        isId: field.isId === true,
        isList: field.isList === true,
        required: field.isRequired === true,
      });
    }
    tables.set(table, {
      model: model.name,
      columns,
      hasTenant: columns.has('tenant_id'),
      scope: computeScope(model, byName),
      primaryKey: model.primaryKey ?? null,
    });
  }

  REGISTRY = tables;
  return REGISTRY;
}

export function resolveTable(name) {
  const table = buildRegistry().get(String(name ?? '').toLowerCase());
  if (!table) throw new HttpError(400, 'UNKNOWN_TABLE', `Table inconnue : ${name}`);
  return table;
}

function columnOf(table, name) {
  const column = table.columns.get(String(name).toLowerCase());
  if (!column) {
    throw new HttpError(400, 'UNKNOWN_COLUMN', `Colonne inconnue : ${name}`);
  }
  return column;
}

/** Niveau de role requis pour une ecriture sur cette table. */
function requiredLevel(tableName, op) {
  const override = WRITE_LEVEL[tableName];
  if (override) return override;
  if (GLOBAL_TABLES.has(tableName)) return 'super_admin';
  return DEFAULT_WRITE[op] ?? 'employee';
}

// --- Filtres --------------------------------------------------------------

const OPERATORS = {
  eq: (v) => v,
  neq: (v) => ({ not: v }),
  gt: (v) => ({ gt: v }),
  gte: (v) => ({ gte: v }),
  lt: (v) => ({ lt: v }),
  lte: (v) => ({ lte: v }),
  like: (v) => v,
  ilike: (v) => v,
};

function buildFilter(table, filter) {
  const column = columnOf(table, filter.col);
  const op = String(filter.op ?? 'eq').toLowerCase();

  if (op === 'in') {
    const values = Array.isArray(filter.value) ? filter.value : [];
    return { [column.prisma]: { in: values } };
  }
  if (op === 'is') {
    // PostgREST : is.null / is.not_null
    return filter.value === 'not_null'
      ? { [column.prisma]: { not: null } }
      : { [column.prisma]: null };
  }
  if (op === 'not') {
    return { [column.prisma]: { not: filter.value } };
  }
  const handler = OPERATORS[op];
  if (!handler) throw new HttpError(400, 'UNKNOWN_OPERATOR', `Operateur inconnu : ${op}`);

  let value = filter.value;
  // MySQL est insensible a la casse pour les egalites de chaines ; on respecte
  // la casse demandee par le client.
  if (op === 'like' || op === 'ilike') {
    value = { contains: value };
  }
  return { [column.prisma]: handler(value) };
}

/**
 * Impose le perimetre tenant. C'est la seule garantie d'isolation : la valeur
 * vient de la session, jamais du client. Un super_admin peut restreindre la
 * requete a un tenant precis via ctx.queryTenantId, sinon il voit tout.
 */
function buildScope(table, ctx) {
  if (table.scope === 'global') return null;

  // Un membre sans etablissement ne doit voir aucune ligne scopee.
  const empty = { id: { in: [] } };
  if (!ctx.tenantId && ctx.role !== 'super_admin') return empty;

  if (table.scope === 'self') {
    return ctx.role === 'super_admin' && !ctx.queryTenantId
      ? null
      : { id: ctx.queryTenantId ?? ctx.tenantId };
  }

  if (table.scope === 'direct') {
    if (ctx.role === 'super_admin') {
      return ctx.queryTenantId ? { tenantId: ctx.queryTenantId } : null;
    }
    return { tenantId: ctx.tenantId };
  }

  // Portee heritee : on remonte la ou les relations jusqu'a la table qui porte
  // le tenant. Plusieurs chemins => OR, sinon les lignes dont une des relations
  // est nulle deviendraient invisibles.
  const target = ctx.queryTenantId ?? ctx.tenantId;
  const clauses = table.scope.paths.map((path) => {
    let clause = { tenantId: target };
    for (const relation of [...path].reverse()) clause = { [relation]: clause };
    return clause;
  });
  return clauses.length === 1 ? clauses[0] : { OR: clauses };
}

function buildWhere(table, body, ctx) {
  const clauses = [];

  for (const filter of body.filters ?? []) {
    clauses.push(buildFilter(table, filter));
  }

  if (Array.isArray(body.or) && body.or.length) {
    clauses.push({
      OR: body.or.map((group) => {
        const inner = (group.filters ?? []).map((f) => buildFilter(table, f));
        return inner.length === 1 ? inner[0] : { AND: inner };
      }),
    });
  }

  const scope = buildScope(table, ctx);
  if (scope) clauses.push(scope);

  if (body.id) clauses.push({ id: body.id });

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { AND: clauses };
}

/** Colonnes demandees -> select Prisma. '*' ou une liste de noms SQL. */
function buildSelect(table, columns) {
  if (!columns || columns === '*' || (Array.isArray(columns) && columns.length === 0)) {
    return undefined;
  }
  if (typeof columns === 'string') {
    if (columns.includes('(')) {
      throw new HttpError(
        501,
        'EMBED_NOT_SUPPORTED',
        `Les jointures imbriquees ne sont pas encore gerees : ${columns.slice(0, 80)}`
      );
    }
    columns = columns.split(',').map((c) => c.trim()).filter(Boolean);
  }
  const select = {};
  for (const raw of columns) {
    const column = columnOf(table, raw);
    select[column.prisma] = true;
  }
  return select;
}

/** Ligne Prisma -> objet JSON en snake_case. */
function toSnake(table, row) {
  if (row === null || row === undefined) return row;
  if (row instanceof Date) return row.toISOString();
  const out = {};
  for (const [column, meta] of table.columns) {
    const value = row[meta.prisma];
    if (value === undefined) continue;
    out[column] = value instanceof Date ? value.toISOString() : value;
  }
  return out;
}

function toSnakeRows(table, rows) {
  return rows.map((row) => toSnake(table, row));
}

/** Verifie qu'aucune colonne protegee n'est ecrite. */
function assertWritable(table, data, ctx) {
  if (table.model !== 'Profile') return;
  for (const key of Object.keys(data)) {
    if (PROTECTED_PROFILE_COLUMNS.has(key.toLowerCase())) {
      throw new HttpError(
        403,
        'COLUMN_PROTECTED',
        `La colonne ${key} ne se modifie que via l'API dediee.`
      );
    }
  }
  void ctx;
}

/** Convertit une charge utile snake_case en donnees Prisma. */
function toPrismaData(table, payload) {
  const data = {};
  for (const [key, value] of Object.entries(payload ?? {})) {
    const column = columnOf(table, key);
    data[column.prisma] = value;
  }
  return data;
}

/**
 * Point d'entree unique. `ctx` vient de requireAuth(), enrichi de
 * `queryTenantId` si un super_admin a demande un tenant precis.
 */
export async function runQuery(ctx, body) {
  const op = String(body.op ?? 'select').toLowerCase();
  const table = resolveTable(body.table);
  const client = table.model.charAt(0).toLowerCase() + table.model.slice(1);

  const levels = { super_admin: 4, admin: 3, employee: 2, client: 1 };
  const needed = levels[requiredLevel(body.table, op)];
  if (op !== 'select') {
    if ((levels[ctx.role] ?? 0) < needed) {
      throw new HttpError(403, 'FORBIDDEN', `Droits insuffisants pour ${op} sur ${body.table}.`);
    }
  }

  if (op === 'select') {
    const where = buildWhere(table, body, ctx);
    const select = buildSelect(table, body.columns);
    const orderBy = {};
    for (const o of body.order ?? []) {
      orderBy[columnOf(table, o.col).prisma] = o.dir === 'asc' ? 'asc' : 'desc';
    }

    let query = {
      where,
      ...(select ? { select } : {}),
      ...(Object.keys(orderBy).length ? { orderBy } : {}),
      ...(body.limit ? { take: Math.min(Number(body.limit), 1000) } : {}),
      ...(body.offset ? { skip: Number(body.offset) } : {}),
    };

    const [rows, count] = await Promise.all([
      prisma[client].findMany(query),
      body.count ? prisma[client].count({ where }) : Promise.resolve(null),
    ]);

    return {
      data: toSnakeRows(table, rows),
      error: null,
      ...(body.count ? { count } : {}),
    };
  }

  if (op === 'insert' || op === 'upsert') {
    const payload = Array.isArray(body.payload) ? body.payload : [body.payload];
    const rows = payload.map((row) => {
      assertWritable(table, row, ctx);
      const data = toPrismaData(table, row);
      // Le tenant est IMPOSE, jamais repris du client. Ne pas ecranger une
      // valeur fournie autoriserait un employe a injecter une fiche dans un
      // autre etablissement. Seul un super_admin, qui n'appartient a aucun
      // tenant, peut ecrire sans tenant ou en choisir un.
      if (table.hasTenant && ctx.role !== 'super_admin') data.tenantId = ctx.tenantId;
      return data;
    });

    // create() et non createMany() : 4 tables n'ont pas d'id par defaut, et le
    // frontend attend les lignes reelles (id, created_at...) via .insert().select().
    if (op === 'insert') {
      const created = rows.length === 1
        ? await prisma[client].create({ data: rows[0] })
        : await prisma.$transaction(rows.map((data) => prisma[client].create({ data })));
      return {
        data: toSnakeRows(table, Array.isArray(created) ? created : [created]),
        error: null,
        count: Array.isArray(created) ? created.length : 1,
      };
    }

    const key = table.primaryKey ? columnOf(table, table.primaryKey).prisma : 'id';
    const upserted = [];
    for (const data of rows) {
      upserted.push(await prisma[client].upsert({ where: { [key]: data[key] }, update: data, create: data }));
    }
    return { data: toSnakeRows(table, upserted), error: null, count: upserted.length };
  }

  // Un update ou un delete sans aucun filtre viserait toutes les lignes du
  // tenant : on l'interdit explicitement plutot que de compter sur le client.
  if (op === 'update' || op === 'delete') {
    const hasFilter = Boolean(body.id) || (body.filters ?? []).length > 0 || (body.or ?? []).length > 0;
    if (!hasFilter) {
      throw new HttpError(400, 'MISSING_FILTER', `${op} sans filtre : refusing d'ecrire en masse.`);
    }
  }

  if (op === 'update') {
    assertWritable(table, body.payload, ctx);
    const data = toPrismaData(table, body.payload);
    // Un update ne doit pas non plus deplacer une fiche vers un autre tenant.
    if (table.hasTenant && ctx.role !== 'super_admin') data.tenantId = ctx.tenantId;
    const where = buildWhere(table, body, ctx);
    const updated = await prisma[client].updateMany({ where, data });
    return { data: [], error: null, count: updated.count };
  }

  if (op === 'delete') {
    const where = buildWhere(table, body, ctx);
    const deleted = await prisma[client].deleteMany({ where });
    return { data: [], error: null, count: deleted.count };
  }

  throw new HttpError(400, 'UNKNOWN_OP', `Operation inconnue : ${op}`);
}