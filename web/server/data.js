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

// Un admin de salon met a jour sa propre fiche `tenants` (parametres du salon,
// demande d'abonnement). On restreint les colonnes pour ne jamais laisser un
// admin s'octroyer des droits : pas d'id/slug, pas de is_active, pas de
// subscription_mode ni de champs external_payment_* (qui contourneraient le
// guard d'abonnement). Le perimetre reste borne au tenant de la session (voir
// buildScope, scope 'self').
const TENANT_ADMIN_SELF_COLUMNS = new Set([
  'name',
  'description',
  'address',
  'phone',
  'email',
  'logo_url',
  'cover_image',
  'primary_color',
  'secondary_color',
  'city',
  'show_on_home',
  'subscription_status',
  'subscription_plan',
  'subscription_start',
  'subscription_end',
  'updated_at',
]);

/** Vrai si un admin met a jour sa fiche tenant avec des colonnes autorisees. */
function isAdminTenantSelfUpdate(tableName, op, body, ctx) {
  if (tableName !== 'tenants' || op !== 'update') return false;
  if (ctx.role !== 'admin') return false;
  const keys = Object.keys(body.payload ?? {});
  if (!keys.length) return false;
  return keys.every((key) => TENANT_ADMIN_SELF_COLUMNS.has(key.toLowerCase()));
}

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

// --- Acces public (visiteur sans session) ---------------------------------
// La vitrine d'un salon, la file d'attente et la reservation doivent marcher
// sans compte. On expose donc un sous-ensemble de tables en lecture (contenu
// vitrine + disponibilites), et la creation de tickets / rendez-vous / clients
// / avis. Tout est borne a un etablissement actif (voir buildScope /
// assertPublicTenant) ; aucune modification ni suppression n'est permise.
const PUBLIC_READ_TABLES = new Set([
  'tenants',
  'tenant_home_settings',
  'services',
  'employees',
  'reviews',
  'publications',
  'gallery',
  'products',
  'categories',
  'branches',
  'news',
  'promotions',
  'gift_cards',
  'tickets',
  'appointments',
  'clients',
  'platform_settings',
  'transactions',
  'transaction_lines',
  'tenant_specialties',
  'specialty_types',
  'service_templates',
  'category_templates',
]);
const PUBLIC_WRITE_TABLES = new Set([
  'tickets',
  'appointments',
  'clients',
  'reviews',
  'contact_messages',
  'notifications',
  'gift_cards',
  'transactions',
  'transaction_lines',
]);
// Tables de reference partagees, lisibles publiquement sans filtre tenant.
const PUBLIC_GLOBAL_TABLES = new Set([
  'specialty_types',
  'service_templates',
  'category_templates',
  'platform_settings',
]);
// La reponse publique ne doit jamais divulguer ces colonnes (secrets, sante,
// coordonnees). On les retire apres la lecture, quel que soit le `select`.
const PUBLIC_HIDDEN_COLUMNS = {
  platform_settings: new Set(['payments', 'security', 'app', 'subscriptions', 'notifications']),
  appointments: new Set(['client_email', 'client_phone', 'notes']),
  tickets: new Set(['client_email', 'client_phone']),
  clients: new Set(['email', 'phone', 'birthday', 'allergies', 'notes', 'profile_id']),
  transactions: new Set([
    'cashier_id',
    'employee_id',
    'appointment_id',
    'ticket_id',
    'client_id',
    'customer_id',
    'gift_card_id',
    'notes',
  ]),
};
// Certaines tables publiques n'exposent qu'une projection minimale.
const PUBLIC_ALLOWED_COLUMNS = {
  clients: new Set([
    'id',
    'tenant_id',
    'name',
    'profile',
    'loyalty_points',
    'total_visits',
    'total_spent',
    'created_at',
    'last_visit',
  ]),
};
// Un message de contact general (page /contact) n'a pas toujours d'etablissement.
const PUBLIC_TENANT_OPTIONAL = new Set(['contact_messages']);
// Table sans tenant_id qui herite du tenant par une relation parente. On valide
// l'etablissement du parent (transaction) avant d'autoriser la ligne.
const PUBLIC_TENANT_VIA_PARENT = {
  transaction_lines: { fk: 'transactionId' },
};
// Sans session, ces tables ne sont lisibles qu'en ciblant explicitement une
// ligne (recu de commande, lignes d'une transaction). Sans ce garde-fou, un
// visiteur pourrait enumerer toutes les commandes d'un etablissement. Le champ
// `columns` autorise la seule lecture de colonnes inoffensives (numero de recu
// pour calculer le suivant) sans jamais exposer les coordonnees client.
const PUBLIC_REQUIRE_FILTER = {
  transactions: {
    cols: ['customer_phone'],
    columns: new Set(['id', 'receipt_number', 'created_at']),
  },
  transaction_lines: { cols: ['transaction_id'] },
};

/** Vrai si le `select` ne demande que des colonnes de la liste blanche. */
function isSafeColumnOnlySelect(columns, allowed) {
  if (columns === undefined || columns === null) return false;
  const tokens = (Array.isArray(columns) ? columns : String(columns).split(','))
    .map((token) => String(token).trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((token) => !token.includes('(') && !token.includes(':') && allowed.has(token));
}



let REGISTRY = null;
let MODEL_TO_TABLE = null;

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
    // Relations exposables pour les jointures imbriquees de PostgREST
    // (`select('*, profile:profile_id(full_name)')`). byFromField relie la
    // colonne FK (`profile_id`) au champ de relation Prisma (`profile`).
    const relations = { byName: new Map(), byFromField: new Map() };
    for (const field of model.fields) {
      if (field.kind !== 'object') continue;
      const meta = {
        field: field.name,
        relatedModel: field.type,
        isList: field.isList === true,
        isRequired: field.isRequired === true,
        fromFields: field.relationFromFields ?? [],
      };
      relations.byName.set(field.name, meta);
      for (const scalar of meta.fromFields) relations.byFromField.set(scalar, meta);
    }

    tables.set(table, {
      model: model.name,
      table,
      columns,
      relations,
      hasTenant: columns.has('tenant_id'),
      scope: computeScope(model, byName),
      primaryKey: model.primaryKey ?? null,
    });
  }

  MODEL_TO_TABLE = new Map();
  for (const entry of tables.values()) MODEL_TO_TABLE.set(entry.model, entry);

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
    return { [column.prisma]: { in: values.map((value) => coerceValue(column, value)) } };
  }
  if (op === 'is') {
    // PostgREST : is.null / is.not_null
    return filter.value === 'not_null'
      ? { [column.prisma]: { not: null } }
      : { [column.prisma]: null };
  }
  if (op === 'not') {
    return { [column.prisma]: { not: coerceValue(column, filter.value) } };
  }
  const handler = OPERATORS[op];
  if (!handler) throw new HttpError(400, 'UNKNOWN_OPERATOR', `Operateur inconnu : ${op}`);

  let value = coerceValue(column, filter.value);
  // MySQL est insensible a la casse pour les egalites de chaines ; on respecte
  // la casse demandee par le client.
  if (op === 'like' || op === 'ilike') {
    value = { contains: value };
  }
  return { [column.prisma]: handler(value) };
}

/**
 * PostgREST acceptait `date=eq.2026-10-10` (date sans heure). Prisma, lui,
 * refuse une chaine non ISO-8601 complete sur une colonne DateTime et leve une
 * erreur de validation (=> 500). On normalise donc toute valeur de date en objet
 * Date, y compris pour les ecritures (`date: '2026-10-10'` a l'insertion d'un
 * ticket ou d'un rendez-vous).
 */
function coerceValue(column, value) {
  if (column.type !== 'DateTime' || value === null || value === undefined) return value;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new HttpError(400, 'INVALID_DATE', `Date invalide pour ${column.prisma} : ${value}`);
    }
    return date;
  }
  return value;
}

/**
 * Impose le perimetre tenant. C'est la seule garantie d'isolation : la valeur
 * vient de la session, jamais du client. Un super_admin peut restreindre la
 * requete a un tenant precis via ctx.queryTenantId, sinon il voit tout.
 */
function buildScope(table, ctx) {
  if (ctx.role === 'public') {
    // Visiteur sans session : uniquement du contenu rattache a un
    // etablissement actif, plus quelques tables de reference partagees.
    if (PUBLIC_GLOBAL_TABLES.has(table.table)) return null;
    if (table.scope === 'global') return { id: { in: [] } };
    if (table.scope === 'self') return { isActive: true };
    if (table.scope === 'direct') return { tenant: { isActive: true } };
    // Portee heritee (ex. transaction_lines via product/transaction) : on
    // remonte chaque chemin jusqu'a un etablissement actif.
    if (table.scope && table.scope.paths) {
      const clauses = table.scope.paths.map((path) => {
        let clause = { tenant: { isActive: true } };
        for (const relation of [...path].reverse()) clause = { [relation]: clause };
        return clause;
      });
      return clauses.length === 1 ? clauses[0] : { OR: clauses };
    }
    return { id: { in: [] } };
  }

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

/** Decoupe une expression `a, b(x, y), c` au niveau 0, guillemets compris. */
function splitTopLevel(input) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';

  for (const char of input) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** Analyse une chaine `select` PostgREST en colonnes + jointures imbriquees. */
function parseSelectTokens(raw) {
  const result = { star: false, cols: [], embeds: [] };

  for (const token of splitTopLevel(raw)) {
    if (token === '*') {
      result.star = true;
      continue;
    }
    const match = token.match(/^([\w!:\s]+?)\((.*)\)$/s);
    if (match) {
      let left = match[1].trim();
      const inner = match[2].trim();
      let alias = null;
      const colon = left.indexOf(':');
      if (colon !== -1) {
        alias = left.slice(0, colon).trim();
        left = left.slice(colon + 1).trim();
      }
      let hint = null;
      const bang = left.indexOf('!');
      if (bang !== -1) {
        hint = left.slice(bang + 1).trim();
        left = left.slice(0, bang).trim();
      }
      result.embeds.push({ alias, target: left, hint, inner });
      continue;
    }
    result.cols.push(token);
  }

  return result;
}

/**
 * Resout une cible d'imbrication (`profile_id`, `tenant`, `tenants`,
 * `tenants!profiles_tenant_id_fkey`) vers le champ de relation Prisma.
 */
function resolveRelation(table, target) {
  const name = String(target).toLowerCase();
  if (table.relations.byName.has(target)) return table.relations.byName.get(target);

  const column = table.columns.get(name);
  if (column && table.relations.byFromField.has(column.prisma)) {
    return table.relations.byFromField.get(column.prisma);
  }

  for (const meta of table.relations.byName.values()) {
    const related = MODEL_TO_TABLE.get(meta.relatedModel);
    const names = new Set([meta.field.toLowerCase(), meta.relatedModel.toLowerCase()]);
    if (related) names.add(related.table.toLowerCase());
    if (names.has(name)) return meta;
  }

  return null;
}

/**
 * Traduit les colonnes demandees en `select` Prisma (`*` compris) et decrit les
 * jointures a reconstruire cote sortie. Le perimetre tenant est aussi applique
 * aux relations listees (to-many), sinon une jointure ouvrirait un trou dans
 * l'isolation. Renvoie aussi les relations `!inner` a exiger non nulles.
 */
function compileSelect(table, columns, ctx) {
  const raw =
    columns === undefined || columns === null
      ? '*'
      : Array.isArray(columns)
        ? columns.join(',')
        : String(columns);
  const parsed = parseSelectTokens(raw);
  const select = {};

  if (parsed.star || parsed.cols.length === 0) {
    for (const meta of table.columns.values()) select[meta.prisma] = true;
  } else {
    for (const name of parsed.cols) select[columnOf(table, name).prisma] = true;
  }

  const embeds = [];
  const inner = [];
  for (const embed of parsed.embeds) {
    const relation = resolveRelation(table, embed.target);
    if (!relation) {
      throw new HttpError(400, 'UNKNOWN_RELATION', `Relation inconnue : ${embed.target}`);
    }
    const related = MODEL_TO_TABLE.get(relation.relatedModel);
    if (!related) {
      throw new HttpError(400, 'UNKNOWN_RELATION', `Relation non exposable : ${embed.target}`);
    }
    // Public : on autorise les jointures to-one utiles a la vitrine (profil d'un
    // employe, auteur d'un avis) mais pas les listes vers des tables non
    // publiques, qui permettraient de dumper des profils en masse.
    if (ctx.role === 'public' && relation.isList && !PUBLIC_READ_TABLES.has(related.table)) {
      throw new HttpError(403, 'PUBLIC_FORBIDDEN', `Relation non accessible publiquement : ${embed.target}`);
    }
    const sub = compileSelect(related, embed.inner, ctx);
    const node = { select: sub.select };
    if (relation.isList) {
      const scope = buildScope(related, ctx);
      if (scope) node.where = scope;
    }
    if (!relation.isList && embed.hint === 'inner') inner.push(relation.field);
    select[relation.field] = node;
    embeds.push({
      key: embed.alias ?? embed.target,
      field: relation.field,
      related,
      isList: relation.isList,
      embeds: sub.embeds,
    });
  }

  return { select, embeds, inner };
}

/** Supprime les colonnes interdites au public (secrets, sante, coordonnees). */
function censorPublic(table, row) {
  const allowed = PUBLIC_ALLOWED_COLUMNS[table.table];
  if (allowed) {
    for (const key of Object.keys(row)) {
      if (!allowed.has(key)) delete row[key];
    }
  }
  const hidden = PUBLIC_HIDDEN_COLUMNS[table.table];
  if (hidden) {
    for (const key of hidden) delete row[key];
  }
  return row;
}

/** Reconstruit une ligne : colonnes snake_case + jointures sous leur alias. */
function projectRow(table, row, embeds, isPublic = false) {
  const out = toSnake(table, row);
  for (const embed of embeds) {
    const value = row[embed.field];
    if (embed.isList) {
      out[embed.key] = Array.isArray(value)
        ? value.map((child) => projectRow(embed.related, child, embed.embeds, isPublic))
        : [];
    } else {
      out[embed.key] = value ? projectRow(embed.related, value, embed.embeds, isPublic) : null;
    }
  }
  return isPublic ? censorPublic(table, out) : out;
}

/**
 * Valeur Prisma -> valeur JSON. Les colonnes `Decimal` sortent sous forme
 * d'objet decimal.js que JSON.stringify transforme en chaine : le frontend
 * ferait alors `0 + "12.50"` (concatenation) et afficherait des nombres
 * absurdes ou `NaN`. PostgREST renvoyait deja des nombres, on restaure ce
 * comportement. Les BigInt sont convertis de meme.
 */
function toJsonValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return Number(value);
  if (
    value !== null &&
    typeof value === 'object' &&
    typeof value.toFixed === 'function' &&
    typeof value.toNumber === 'function'
  ) {
    return Number(value);
  }
  return value;
}

/** Ligne Prisma -> objet JSON en snake_case. */
function toSnake(table, row) {
  if (row === null || row === undefined) return row;
  if (row instanceof Date) return row.toISOString();
  const out = {};
  for (const [column, meta] of table.columns) {
    const value = row[meta.prisma];
    if (value === undefined) continue;
    out[column] = toJsonValue(value);
  }
  return out;
}

function toSnakeRows(table, rows) {
  return rows.map((row) => toSnake(table, row));
}

/** Verifie qu'aucune colonne protegee n'est ecrite. */
function assertWritable(table, data, ctx) {
  if (table.model !== 'Profile') return;
  // Le super_admin est le seul role qui administre les comptes : les pages de
  // gestion (roles, statut, rattachement) ecrivent directement ces colonnes.
  // Les autres roles passent obligatoirement par les routes dediees.
  if (ctx.role === 'super_admin') return;
  for (const key of Object.keys(data)) {
    if (PROTECTED_PROFILE_COLUMNS.has(key.toLowerCase())) {
      throw new HttpError(
        403,
        'COLUMN_PROTECTED',
        `La colonne ${key} ne se modifie que via l'API dediee.`
      );
    }
  }
}

/** Verifie qu'un etablissement accepte les operations publiques (compte actif). */
async function assertPublicTenant(tenantId) {
  const tenant = await prisma.tenant.findFirst({
    where: { id: String(tenantId), isActive: true },
    select: { id: true },
  });
  if (!tenant) {
    throw new HttpError(403, 'TENANT_FORBIDDEN', 'Etablissement inconnu ou inactif.');
  }
}

/** Verifie le tenant d'une ligne parente pour une table qui en herite. */
async function assertPublicParentTenant(fkValue) {
  if (!fkValue) {
    throw new HttpError(400, 'TENANT_REQUIRED', 'Reference parente requise.');
  }
  const parent = await prisma.transaction.findFirst({
    where: { id: String(fkValue) },
    select: { tenant: { select: { isActive: true } } },
  });
  if (!parent?.tenant?.isActive) {
    throw new HttpError(403, 'TENANT_FORBIDDEN', 'Transaction parente inconnue ou inactive.');
  }
}

/** Convertit une charge utile snake_case en donnees Prisma. */
function toPrismaData(table, payload) {
  const data = {};
  for (const [key, value] of Object.entries(payload ?? {})) {
    const column = columnOf(table, key);
    data[column.prisma] = coerceValue(column, value);
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
  const isPublic = ctx.role === 'public';

  // Perimetre public : liste blanche stricte + creation uniquement. On verifie
  // ici, avant toute requete, pour ne jamais laisser un visiteur atteindre une
  // table ou une operation non prevue.
  if (isPublic) {
    if (op === 'select') {
      if (!PUBLIC_READ_TABLES.has(table.table)) {
        throw new HttpError(403, 'PUBLIC_FORBIDDEN', `Table non accessible publiquement : ${body.table}.`);
      }
      const rule = PUBLIC_REQUIRE_FILTER[table.table];
      if (rule) {
        const provided = new Set(
          [...(body.filters ?? []), ...((body.or ?? []).flatMap((g) => g.filters ?? []))]
            .map((f) => String(f.col).toLowerCase())
        );
        const hasId = Boolean(body.id);
        const hasRequiredFilter = rule.cols.some((col) => provided.has(col));
        const onlySafeColumns = rule.columns
          ? isSafeColumnOnlySelect(body.columns, rule.columns)
          : false;
        if (!hasId && !hasRequiredFilter && !onlySafeColumns) {
          throw new HttpError(
            403,
            'PUBLIC_FILTER_REQUIRED',
            `Lecture publique restreinte : precisez ${rule.cols.join(' ou ')}.`
          );
        }
      }
    } else if (op === 'insert') {
      if (!PUBLIC_WRITE_TABLES.has(table.table)) {
        throw new HttpError(403, 'PUBLIC_FORBIDDEN', `Creation publique non autorisee sur ${body.table}.`);
      }
    } else {
      throw new HttpError(403, 'PUBLIC_FORBIDDEN', `Operation non autorisee sans session : ${op}.`);
    }
  }

  const levels = { super_admin: 4, admin: 3, employee: 2, client: 1 };
  const needed = levels[requiredLevel(body.table, op)];
  if (op !== 'select' && !isPublic) {
    const adminTenantSelfUpdate = isAdminTenantSelfUpdate(table.table, op, body, ctx);
    if (!adminTenantSelfUpdate && (levels[ctx.role] ?? 0) < needed) {
      throw new HttpError(403, 'FORBIDDEN', `Droits insuffisants pour ${op} sur ${body.table}.`);
    }
  }

  if (op === 'select') {
    let where = buildWhere(table, body, ctx);
    const plan = compileSelect(table, body.columns, ctx);

    // `!inner` de PostgREST : exclut les lignes dont la relation est nulle.
    if (plan.inner.length) {
      const innerClauses = plan.inner.map((field) => ({ [field]: { isNot: null } }));
      const parts = Object.keys(where).length ? [where, ...innerClauses] : innerClauses;
      where = parts.length === 1 ? parts[0] : { AND: parts };
    }

    // Prisma refuse un objet `orderBy` a plusieurs cles selon la version : un
    // tableau d'objets a une seule cle est accepte partout.
    const orderBy = (body.order ?? []).map((o) => ({
      [columnOf(table, o.col).prisma]: o.dir === 'asc' ? 'asc' : 'desc',
    }));

    const query = {
      where,
      select: plan.select,
      ...(orderBy.length ? { orderBy } : {}),
      ...(body.limit ? { take: Math.min(Number(body.limit), 1000) } : {}),
      ...(body.offset ? { skip: Number(body.offset) } : {}),
    };

    const [rows, count] = await Promise.all([
      prisma[client].findMany(query),
      body.count ? prisma[client].count({ where }) : Promise.resolve(null),
    ]);

    return {
      data: rows.map((row) => projectRow(table, row, plan.embeds, isPublic)),
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
      // tenant, peut ecrire sans tenant ou en choisir un. Pour le public, le
      // tenant fourni est conserve puis valide par assertPublicTenant.
      if (table.hasTenant && !isPublic && ctx.role !== 'super_admin') data.tenantId = ctx.tenantId;
      return data;
    });

    // Le visiteur doit viser un etablissement actif ; on ne peut pas se fier au
    // tenant_id de la requete sans ce controle.
    if (isPublic) {
      for (const data of rows) {
        if (!data.tenantId) {
          const via = PUBLIC_TENANT_VIA_PARENT[table.table];
          if (via) {
            await assertPublicParentTenant(data[via.fk]);
            continue;
          }
          if (PUBLIC_TENANT_OPTIONAL.has(table.table)) continue;
          throw new HttpError(400, 'TENANT_REQUIRED', 'tenant_id requis.');
        }
        await assertPublicTenant(data.tenantId);
      }
    }

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