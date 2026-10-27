/**
 * Sprint 1 validation (audit v2.2 §2): checks the Appwrite Cloud behaviour the
 * quotation/stock design depends on, against a TEMPORARY table that is
 * deleted afterwards. No existing table or row is touched.
 *
 *   V1  transaction commit + rollback
 *   V2  transaction conflict detection
 *   V3  atomic decrement below `min` is rejected
 *   V4  atomic decrement within bounds succeeds
 *   V5  staged decrement below `min` fails inside a transaction
 *   V6  unique index on a nullable attribute allows many nulls (projects.quotation_id)
 *
 * Usage (from web/):
 *   APPWRITE_API_KEY=<key with databases.read, tables.read/write, columns.read/write,
 *   indexes.read/write, rows.read/write scopes> node scripts/validate-appwrite-transactions.mjs
 *
 * Uses the TablesDB API (tables/rows) — the scopes current Appwrite Cloud API keys offer.
 *
 * Endpoint, project, and database default to the VITE_* values in web/.env.
 * Record the printed results before starting Sprint 2.
 */
import 'dotenv/config';
import { Client, TablesDB, ID } from 'node-appwrite';

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID;
const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID || '6873ba790033a7d5cfdb';
const apiKey = process.env.APPWRITE_API_KEY;

if (!endpoint || !projectId || !apiKey) {
  console.error('Missing APPWRITE_API_KEY (and/or endpoint / project id). See the header of this script.');
  process.exit(1);
}

const dbs = new TablesDB(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));
const collectionId = `zz_tx_validation_${Date.now()}`;
const results = [];
let collectionCreated = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const describeError = (e) => (e ? `${e.code ?? '?'} ${e.type ?? ''} — ${e.message}`.trim() : null);

/** Runs `fn`; returns the thrown error, or null when it succeeded. */
async function attempt(fn) {
  try { await fn(); return null; } catch (e) { return e; }
}

async function waitFor(kind, key) {
  for (let i = 0; i < 60; i++) {
    const item = kind === 'column'
      ? await dbs.getColumn(databaseId, collectionId, key)
      : await dbs.getIndex(databaseId, collectionId, key);
    if (item.status === 'available') return;
    if (item.status === 'failed') throw new Error(`${kind} "${key}" failed: ${item.error ?? ''}`);
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${kind} "${key}"`);
}

const getStock = async (id) => (await dbs.getRow(databaseId, collectionId, id)).current_stock;
const newProduct = (stock) => dbs.createRow(databaseId, collectionId, ID.unique(), { label: 'product', current_stock: stock });

async function rollbackQuietly(txId) {
  await attempt(() => dbs.updateTransaction(txId, false, true));
}

function record(id, name, pass, details) {
  results.push({ id, name, pass, details });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${name}\n      ${details}`);
}

async function setup() {
  console.log(`Creating temporary table ${collectionId} ...`);
  await dbs.createTable(databaseId, collectionId, collectionId, [], false);
  collectionCreated = true;
  await dbs.createStringColumn(databaseId, collectionId, 'label', 64, false);
  // No attribute-level `min`, so V3/V5 isolate the decrement's own `min` argument.
  await dbs.createIntegerColumn(databaseId, collectionId, 'current_stock', false);
  await dbs.createStringColumn(databaseId, collectionId, 'ref', 36, false);
  for (const key of ['label', 'current_stock', 'ref']) await waitFor('column', key);
  await dbs.createIndex(databaseId, collectionId, 'idx_ref_unique', 'unique', ['ref']);
  await waitFor('index', 'idx_ref_unique');
}

async function v1() {
  const tx1 = await dbs.createTransaction(60);
  const committedId = ID.unique();
  await dbs.createRow(databaseId, collectionId, committedId, { label: 'v1-commit' }, undefined, tx1.$id);
  await dbs.updateTransaction(tx1.$id, true);

  const tx2 = await dbs.createTransaction(60);
  const rolledBackId = ID.unique();
  await dbs.createRow(databaseId, collectionId, rolledBackId, { label: 'v1-rollback' }, undefined, tx2.$id);
  await dbs.updateTransaction(tx2.$id, false, true);

  const committedExists = !(await attempt(() => dbs.getRow(databaseId, collectionId, committedId)));
  const rolledBackExists = !(await attempt(() => dbs.getRow(databaseId, collectionId, rolledBackId)));
  record('V1', 'Transaction commit + rollback', committedExists && !rolledBackExists,
    `committed doc exists: ${committedExists}; rolled-back doc exists: ${rolledBackExists}`);
}

async function v2() {
  const doc = await dbs.createRow(databaseId, collectionId, ID.unique(), { label: 'v2-original' });
  const t1 = await dbs.createTransaction(60);
  await dbs.getRow(databaseId, collectionId, doc.$id); // T1's caller reads X

  const t2 = await dbs.createTransaction(60);
  await dbs.updateRow(databaseId, collectionId, doc.$id, { label: 'v2-by-t2' }, undefined, t2.$id);
  await dbs.updateTransaction(t2.$id, true);

  let err = await attempt(() => dbs.updateRow(databaseId, collectionId, doc.$id, { label: 'v2-by-t1' }, undefined, t1.$id));
  const failedAt = err ? 'stage' : 'commit';
  if (!err) err = await attempt(() => dbs.updateTransaction(t1.$id, true));
  if (err) await rollbackQuietly(t1.$id);

  const finalLabel = (await dbs.getRow(databaseId, collectionId, doc.$id)).label;
  record('V2', 'Transaction conflict detection', !!err,
    err
      ? `T1 rejected at ${failedAt}: ${describeError(err)}; final label "${finalLabel}"`
      : `T1 committed WITHOUT a conflict (last write wins); final label "${finalLabel}" — conversion must rely on the unique index / re-check instead`);
}

async function v3() {
  const p = await newProduct(3);
  const err = await attempt(() => dbs.decrementRowColumn(databaseId, collectionId, p.$id, 'current_stock', 5, 0));
  const stock = await getStock(p.$id);
  record('V3', 'Atomic decrement below min is rejected', !!err && stock === 3,
    `error: ${describeError(err) ?? 'none — decrement succeeded'}; stock now ${stock} (expected 3)`);
  return p.$id;
}

async function v4(productId) {
  const err = await attempt(() => dbs.decrementRowColumn(databaseId, collectionId, productId, 'current_stock', 2, 0));
  const stock = await getStock(productId);
  record('V4', 'Atomic decrement within bounds succeeds', !err && stock === 1,
    `error: ${describeError(err) ?? 'none'}; stock now ${stock} (expected 1)`);
}

async function v5() {
  const p = await newProduct(3);
  const tx = await dbs.createTransaction(60);
  let err = await attempt(() => dbs.decrementRowColumn(databaseId, collectionId, p.$id, 'current_stock', 5, 0, tx.$id));
  const failedAt = err ? 'stage' : 'commit';
  if (!err) err = await attempt(() => dbs.updateTransaction(tx.$id, true));
  if (err) await rollbackQuietly(tx.$id);
  const stock = await getStock(p.$id);
  record('V5', 'Staged decrement below min fails in a transaction', !!err && stock === 3,
    `${err ? `rejected at ${failedAt}: ${describeError(err)}` : 'commit SUCCEEDED'}; stock now ${stock} (expected 3)`);
}

async function v6() {
  const nullA = await attempt(() => dbs.createRow(databaseId, collectionId, ID.unique(), { label: 'v6-null-a' }));
  const nullB = await attempt(() => dbs.createRow(databaseId, collectionId, ID.unique(), { label: 'v6-null-b' }));
  const dupA = await attempt(() => dbs.createRow(databaseId, collectionId, ID.unique(), { label: 'v6-a', ref: 'quote-1' }));
  const dupB = await attempt(() => dbs.createRow(databaseId, collectionId, ID.unique(), { label: 'v6-b', ref: 'quote-1' }));
  const pass = !nullA && !nullB && !dupA && dupB?.code === 409;
  record('V6', 'Unique index on nullable attribute allows many nulls', pass,
    `two nulls: ${!nullA && !nullB ? 'accepted' : `rejected (${describeError(nullB || nullA)})`}; duplicate value: ${dupB ? describeError(dupB) : 'ACCEPTED'}`);
}

let exitCode = 0;
try {
  await setup();
  const steps = [['V1', v1], ['V2', v2], ['V3/V4', async () => v4(await v3())], ['V5', v5], ['V6', v6]];
  for (const [id, step] of steps) {
    try {
      await step();
    } catch (e) {
      // A missing key scope invalidates every remaining check — stop, don't report fake failures.
      if (e.type === 'general_unauthorized_scope') {
        console.error(`\nStopped: the API key is missing a scope. ${describeError(e)}`);
        console.error('Add the missing scope to the key and re-run. These are NOT Appwrite behaviour results.');
        results.length = 0;
        exitCode = 1;
        break;
      }
      // e.g. transactions not available on this instance — record and continue.
      record(id, 'Unexpected error', false, describeError(e));
    }
  }
} catch (e) {
  console.error(`Setup failed: ${describeError(e)}`);
  exitCode = 1;
} finally {
  if (collectionCreated) await cleanup();
}

async function cleanup() {
  const cleanupError = await attempt(() => dbs.deleteTable(databaseId, collectionId));
  console.log(cleanupError
    ? `\nWARNING: could not delete ${collectionId} — delete it in the Console (Databases). (${describeError(cleanupError)})`
    : `\nDeleted temporary table ${collectionId}.`);
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) {
  console.log('See the decision gate in audit v2.2 §2 before starting Sprint 2.');
  exitCode = 1;
}
process.exit(exitCode);
