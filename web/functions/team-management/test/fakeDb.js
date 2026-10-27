/**
 * In-memory stand-in for the Appwrite database, used by the route tests.
 *
 * It mimics the behaviours the code depends on, as measured by the Sprint 1
 * validation against Appwrite Cloud (docs/appwrite-only-phase1.md):
 *   - transactions are atomic (all staged operations apply, or none);
 *   - there is NO conflict detection between transactions (last write wins);
 *   - unique indexes and min bounds on staged operations fail at COMMIT;
 *   - direct decrements below min fail immediately.
 *
 * It exposes both the TablesDB surface (rows) and the legacy Databases surface
 * (documents) over the same data.
 */

export function appwriteError(code, type, message) {
  const e = new Error(message);
  e.code = code;
  e.type = type;
  return e;
}

export class FakeDb {
  /**
   * @param {{ uniques?: Record<string, string[]>, mins?: Record<string, number> }} schema
   *   uniques: table → unique columns; mins: "table.column" → minimum value.
   */
  constructor({ uniques = {}, mins = {} } = {}) {
    this.tables = {};
    this.uniques = uniques;
    this.mins = mins;
    this.transactions = new Map();
    this.seq = 0;
    /** Set to make the NEXT commit apply successfully and then throw (a network timeout after commit). */
    this.failNextCommitAfterApply = false;
    /** Set to `{ table, error }` to make the next DIRECT create on that table throw once. */
    this.failNextCreate = null;
  }

  table(name) {
    return (this.tables[name] ??= new Map());
  }

  seed(tableName, rows) {
    for (const row of rows) this.table(tableName).set(row.$id, { $createdAt: new Date().toISOString(), ...row });
    return this;
  }

  // ── validation shared by direct and committed operations ──
  #checkUnique(tables, tableName, row, ignoreId) {
    for (const column of this.uniques[tableName] ?? []) {
      if (row[column] == null) continue; // nulls never collide
      for (const other of (tables[tableName] ?? new Map()).values()) {
        if (other.$id !== ignoreId && other[column] === row[column]) {
          throw appwriteError(409, 'row_unique_constraint_violation', `Row violates a unique column constraint (${column}).`);
        }
      }
    }
  }

  #applyOp(tables, op, { staged }) {
    const t = (tables[op.table] ??= new Map());
    const limitType = staged ? 'attribute_limit_exceeded' : 'column_limit_exceeded';

    if (op.kind === 'create') {
      if (t.has(op.rowId)) throw appwriteError(409, 'row_already_exists', 'Row with the requested ID already exists.');
      const row = { $id: op.rowId, $createdAt: new Date(Date.now() + this.seq++).toISOString(), ...op.data };
      this.#checkUnique(tables, op.table, row, op.rowId);
      t.set(op.rowId, row);
      return { ...row };
    }
    const row = t.get(op.rowId);
    if (!row) throw appwriteError(404, 'row_not_found', 'Row with the requested ID could not be found.');

    if (op.kind === 'update') {
      const next = { ...row, ...op.data };
      this.#checkUnique(tables, op.table, next, op.rowId);
      t.set(op.rowId, next);
      return { ...next };
    }
    if (op.kind === 'delete') {
      t.delete(op.rowId);
      return {};
    }
    // increment / decrement
    const delta = op.kind === 'increment' ? op.value : -op.value;
    const value = (row[op.column] ?? 0) + delta;
    const min = this.mins[`${op.table}.${op.column}`];
    if (op.kind === 'decrement' && op.bound !== undefined && value < op.bound) {
      throw appwriteError(400, limitType, `Column "${op.column}" has reached the minimum value of ${op.bound}`);
    }
    if (min !== undefined && value < min) {
      throw appwriteError(400, limitType, `Column "${op.column}" has reached the minimum value of ${min}`);
    }
    const next = { ...row, [op.column]: value };
    t.set(op.rowId, next);
    return { ...next };
  }

  #run(op, transactionId) {
    if (transactionId) {
      const tx = this.transactions.get(transactionId);
      if (!tx || tx.status !== 'pending') throw appwriteError(400, 'transaction_not_ready', 'Transaction is not pending.');
      tx.ops.push(op);
      return Promise.resolve({ $id: op.rowId, ...(op.data ?? {}) });
    }
    if (op.kind === 'create' && this.failNextCreate?.table === op.table) {
      const { error } = this.failNextCreate;
      this.failNextCreate = null;
      return Promise.reject(error);
    }
    return Promise.resolve().then(() => this.#applyOp(this.tables, op, { staged: false }));
  }

  // ── TablesDB surface ──
  async createTransaction() {
    const id = `tx${++this.seq}`;
    this.transactions.set(id, { status: 'pending', ops: [] });
    return { $id: id };
  }

  async updateTransaction(transactionId, commit = false, rollback = false) {
    const tx = this.transactions.get(transactionId);
    if (!tx) throw appwriteError(404, 'transaction_not_found', 'Transaction not found.');
    if (rollback) {
      tx.status = 'rolledback';
      return { $id: transactionId, status: 'rolledback' };
    }
    if (commit) {
      // Atomic: apply to a copy, swap in only if every operation succeeds.
      const copy = Object.fromEntries(Object.entries(this.tables).map(([k, v]) => [k, new Map(v)]));
      try {
        for (const op of tx.ops) this.#applyOp(copy, op, { staged: true });
      } catch (e) {
        tx.status = 'failed';
        throw e;
      }
      this.tables = copy;
      tx.status = 'committed';
      if (this.failNextCommitAfterApply) {
        this.failNextCommitAfterApply = false;
        throw appwriteError(500, 'general_server_error', 'socket hang up (simulated timeout after commit)');
      }
    }
    return { $id: transactionId, status: tx.status };
  }

  async getRow(_db, table, id) {
    const row = this.table(table).get(id);
    if (!row) throw appwriteError(404, 'row_not_found', 'Row with the requested ID could not be found.');
    return { ...row };
  }

  async listRows(_db, table, queries = []) {
    let rows = [...this.table(table).values()];
    let limit = 25;
    let order = null;
    for (const raw of queries) {
      const q = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const value = q.values?.[0];
      if (q.method === 'equal') rows = rows.filter((r) => q.values.includes(r[q.attribute]));
      if (q.method === 'startsWith') rows = rows.filter((r) => String(r[q.attribute] ?? '').startsWith(value));
      if (q.method === 'greaterThan') rows = rows.filter((r) => r[q.attribute] > value);
      if (q.method === 'orderDesc') order = [q.attribute, -1];
      if (q.method === 'orderAsc') order = [q.attribute, 1];
      if (q.method === 'limit') limit = value;
    }
    if (order) {
      const [attr, dir] = order;
      rows.sort((a, b) => dir * (a[attr] > b[attr] ? 1 : a[attr] < b[attr] ? -1 : 0));
    }
    return { total: rows.length, rows: rows.slice(0, limit).map((r) => ({ ...r })) };
  }

  createRow(_db, table, rowId, data, _permissions, transactionId) {
    return this.#run({ kind: 'create', table, rowId, data }, transactionId);
  }

  updateRow(_db, table, rowId, data, _permissions, transactionId) {
    return this.#run({ kind: 'update', table, rowId, data }, transactionId);
  }

  deleteRow(_db, table, rowId, transactionId) {
    return this.#run({ kind: 'delete', table, rowId }, transactionId);
  }

  incrementRowColumn(_db, table, rowId, column, value = 1, _max, transactionId) {
    return this.#run({ kind: 'increment', table, rowId, column, value }, transactionId);
  }

  decrementRowColumn(_db, table, rowId, column, value = 1, min, transactionId) {
    return this.#run({ kind: 'decrement', table, rowId, column, value, bound: min }, transactionId);
  }

  // ── legacy Databases surface (documents) over the same data ──
  async listDocuments(db, table, queries) {
    const { total, rows } = await this.listRows(db, table, queries);
    return { total, documents: rows };
  }

  getDocument(db, table, id) {
    return this.getRow(db, table, id);
  }

  createDocument(db, table, id, data) {
    return this.createRow(db, table, id, data);
  }

  updateDocument(db, table, id, data) {
    return this.updateRow(db, table, id, data);
  }
}

export const fakeUsers = {
  async get(id) {
    const known = {
      u_caller: { $id: 'u_caller', name: 'Casey Caller', email: 'casey@x.lk' },
      u_sales: { $id: 'u_sales', name: 'Sam Sales', email: 'sam@x.lk' },
    };
    if (known[id]) return known[id];
    throw appwriteError(404, 'user_not_found', 'User not found');
  },
};

/** Builds a route context. `perms` is a list of permission keys, or 'admin' for everything. */
export function makeCtx(db, perms, extra = {}) {
  return {
    dbs: db,
    tdb: db,
    users: fakeUsers,
    databaseId: 'db',
    can: perms === 'admin' ? () => true : (key) => perms.includes(key),
    getCaller: () => fakeUsers.get('u_caller'),
    log: () => {},
    error: () => {},
    ...extra,
  };
}

/** Runs a route handler and normalises thrown HttpError/ValidationError into `{ status, body }`. */
export async function call(handler, ctx, method, path, body = {}) {
  try {
    return await handler({ ...ctx, method, path, body });
  } catch (e) {
    return { status: e.status ?? 500, body: { error: e.message } };
  }
}
