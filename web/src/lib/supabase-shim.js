// Couche de compatibilite PostgREST -> API Node.
//
// 110 fichiers du frontend utilisent encore la syntaxe Supabase pour les
// donnees (`.from('clients').select('*').eq('tenant_id', id)`). Plutot que de
// les reecrire un par un — 566 appels a `.from()` — ce module reproduit le
// constructeur de requetes de supabase-js au-dessus de POST /api/data/query.
//
// Ce n'est PAS un pont vers Supabase : aucun client Supabase n'est cree ici.
// L'isolation tenant est appliquee cote serveur, elle ne peut pas etre contournee
// depuis le navigateur.
//
// Non couvert (renvoie une erreur explicite pour les attraper au lieu d'echouer
// silencieusement) : jointures imbriquees `select('*, tenants(*)')`, rpc(),
// storage, realtime et functions.invoke.
import { apiFetch } from './api.js';

const ENDPOINT = '/api/data/query';

function postgrestError(code, message, details = null) {
  return { data: null, error: { code, message, details, hint: null } };
}

/**
 * Convertit la syntaxe string de `.or()` en groupes de filtres.
 * Exemple : `.or('role.eq.admin,role.eq.employee')`
 */
function parseOr(expression) {
  const groups = [];
  let depth = 0;
  let quote = null;
  let current = '';

  for (const char of expression) {
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
      groups.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) groups.push(current);

  return groups.map((group) => {
    const match = group.trim().match(/^([\w.]+)\.(\w+)\.(.*)$/s);
    if (!match) return { filters: [{ op: 'eq', col: group.trim(), value: null }] };
    const [, col, op, rawValue] = match;
    let value = rawValue;
    if (value === 'null') value = null;
    else if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (/^-?\d+(\.\d+)?$/.test(value)) value = Number(value);
    else if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return { filters: [{ op: op.toLowerCase(), col, value }] };
  });
}

/** Le constructeur de requetes, volontairement chainable et differe. */
class Query {
  constructor(table, { op = 'select', payload = null } = {}) {
    this.table = table;
    this.op = op;
    this.payload = payload;
    this.columns = null;
    this.filters = [];
    this.orGroups = null;
    this.orders = [];
    // Prefixe _ : `this.limit = null` masquerait la methode limit() sur le
    // prototype, et le premier `.limit()` de l'application aurait echoue.
    this._limit = null;
    this._offset = null;
    this.countMode = null;
    this.mode = 'many';
    this._throw = false;
    this.maybe = false;
    this._promise = null;
  }

  // -- filtres ------------------------------------------------------------
  _push(op, col, value) {
    // `.not(col, op, value)` de PostgREST se decompose en un filtre simple.
    this.filters.push({ op: op === 'not.is' ? 'not' : op, col, value });
    return this;
  }

  eq(col, value) { return this._push('eq', col, value); }
  neq(col, value) { return this._push('neq', col, value); }
  gt(col, value) { return this._push('gt', col, value); }
  gte(col, value) { return this._push('gte', col, value); }
  lt(col, value) { return this._push('lt', col, value); }
  lte(col, value) { return this._push('lte', col, value); }
  like(col, value) { return this._push('like', col, value); }
  ilike(col, value) { return this._push('ilike', col, value); }
  in(col, values) { return this._push('in', col, Array.isArray(values) ? values : [values]); }
  is(col, value) { return this._push('is', col, value === 'not_null' ? 'not_null' : 'null'); }
  not(col, op, value) { return this.filters.push({ op, col, value }), this; }

  /** `.match({ a: 1, b: 2 })` : une suite d'egalites. */
  match(object) {
    for (const [col, value] of Object.entries(object ?? {})) this.eq(col, value);
    return this;
  }

  /** `.or('a.eq.1,b.eq.2')` */
  or(expression) {
    this.orGroups = parseOr(expression);
    return this;
  }

  // -- tri et pagination --------------------------------------------------
  order(col, options = {}) {
    const ascending = options === true || options?.ascending === true;
    this.orders.push({ col, dir: ascending ? 'asc' : 'desc' });
    return this;
  }

  limit(count, { offset } = {}) {
    this._limit = count;
    if (offset !== undefined) this._offset = offset;
    return this;
  }

  /** `.range(0, 9)` = 10 premiers elements. */
  range(from, to) {
    this._offset = from;
    this._limit = to - from + 1;
    return this;
  }

  // -- select / ecriture --------------------------------------------------
  select(columns = '*', { count } = {}) {
    this.columns = columns;
    if (count) this.countMode = count;
    return this;
  }

  insert(values) {
    return new Query(this.table, { op: 'insert', payload: values });
  }

  upsert(values) {
    return new Query(this.table, { op: 'upsert', payload: values });
  }

  update(values) {
    return new Query(this.table, { op: 'update', payload: values });
  }

  delete() {
    return new Query(this.table, { op: 'delete' });
  }

  // -- terminateurs -------------------------------------------------------
  single() {
    this.mode = 'single';
    return this;
  }

  maybeSingle() {
    this.mode = 'single';
    this.maybe = true;
    return this;
  }

  throwOnError() {
    this._throw = true;
    return this;
  }

  // -- execution ----------------------------------------------------------
  async execute() {
    // Un appel en attente est memorise : `await q` puis `q.catch(...)` ne doit
    // pas declencher deux requetes.
    if (this._promise) return this._promise;

    this._promise = this._run();
    return this._promise;
  }

  async _run() {
    const body = {
      table: this.table,
      op: this.op,
      columns: this.columns,
      filters: this.filters,
      or: this.orGroups,
      order: this.orders,
      limit: this._limit,
      offset: this._offset,
      count: this.countMode,
      payload: this.payload,
    };

    let result;
    try {
      result = await apiFetch(ENDPOINT, { method: 'POST', body });
    } catch (error) {
      if (this._throw) throw error;
      // PostgREST ne leve jamais : il renvoie { data: null, error }.
      return postgrestError(error.code ?? 'REQUEST_FAILED', error.message);
    }

    let { data, error } = result;

    if (!error && this.mode === 'single') {
      const rows = Array.isArray(data) ? data : data === null ? [] : [data];
      if (rows.length > 1) {
        error = {
          code: 'PGRST116',
          message: `JSON object requested, multiple rows returned (${rows.length})`,
          details: null,
          hint: null,
        };
        data = null;
      } else {
        data = rows[0] ?? null;
        if (data === null && !this.maybe) {
          error = {
            code: 'PGRST116',
            message: 'JSON object requested, multiple (or no) rows returned',
            details: null,
            hint: null,
          };
        }
      }
    }

    if (error && this._throw) {
      const thrown = new Error(error.message);
      thrown.code = error.code;
      throw thrown;
    }

    return { data, error, count: result?.count ?? null };
  }

  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this.execute().catch(onRejected);
  }

  finally(onFinally) {
    return this.execute().finally(onFinally);
  }
}

/**
 * Face cliente compatible avec `createClient()` de supabase-js, pour les seuls
 * appels de donnees. `.auth` n'expose que `getUser()` : l'authentification
 * passe par Better Auth (voir AuthContext), et `supabaseAdmin` n'a plus
 * d'equivalent — la cle service_role ne doit jamais atteindre le navigateur.
 */
export function createDataClient() {
  return {
    from: (table) => new Query(table),

    auth: {
      /**
       * Equivalent de `supabase.auth.getUser()`, qui attend `{ data: { user } }`.
       * La session Better Auth est lue via /api/me.
       */
      getUser: async () => {
        try {
          const me = await apiFetch('/api/me');
          if (!me?.id) return { data: { user: null }, error: null };
          return {
            data: {
              user: {
                id: me.id,
                email: me.email,
                user_metadata: { full_name: me.full_name ?? null },
              },
            },
            error: null,
          };
        } catch (error) {
          if (error.status === 401) return { data: { user: null }, error: null };
          return { data: { user: null }, error: { message: error.message } };
        }
      },

      signUp: () =>
        Promise.resolve(
          postgrestError(
            'SIGNUP_NOT_SUPPORTED',
            "La creation de compte doit passer par Better Auth (endpoint dedie a venir)."
          )
        ),
    },

    rpc: () => ({
      then: () => Promise.resolve(postgrestError('RPC_NOT_SUPPORTED', "Les fonctions SQL ne sont pas encore portees.")),
    }),

    storage: {
      from: () => ({
        // Les blobs (avatars, visuels) passent encore par Supabase Storage.
        // A migrer vers un stockage objet heberge.
        upload: () => Promise.resolve(postgrestError('STORAGE_NOT_SUPPORTED', 'Stockage non migre.')),
        getPublicUrl: (path) => ({ data: { publicUrl: `/storage/${path}` } }),
      }),
    },

    functions: {
      invoke: () => Promise.resolve(postgrestError('FUNCTIONS_NOT_SUPPORTED', 'Fctions non migrees.')),
    },

    channel: () => {
      throw new Error(
        'Realtime non migre : utilisez un rafraichissement manuel ou un SSE cote API.'
      );
    },
  };
}