import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeDb, makeCtx, call } from './fakeDb.js';
import { handleProductRoute } from '../src/routes/products.js';

const MANAGE = ['inventory:manage'];
const newDb = () => new FakeDb({ uniques: { products: ['sku'] }, mins: { 'products.current_stock': 0 } });
const run = (db, perms, method, path, body) => call(handleProductRoute, makeCtx(db, perms), method, path, body);

const ledgerSum = (db, productId) =>
  [...db.table('stock_movements').values()].filter((m) => m.product_id === productId).reduce((s, m) => s + m.quantity, 0);

async function createProduct(db, overrides = {}) {
  const r = await run(db, MANAGE, 'POST', '/products/create', {
    sku: 'pv-550', name: 'PV Panel 550W', unit_price: 42000, opening_stock: 10, ...overrides,
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body;
}

test('create requires inventory:manage', async () => {
  const r = await run(newDb(), ['inventory:view'], 'POST', '/products/create', { sku: 'A', name: 'A' });
  assert.equal(r.status, 403);
});

test('create stores an opening-stock movement so the ledger matches stock', async () => {
  const db = newDb();
  const p = await createProduct(db);
  assert.equal(p.sku, 'PV-550', 'SKU is normalised to upper case');
  assert.equal(p.current_stock, 10);
  assert.equal(p.is_active, true);
  assert.equal(ledgerSum(db, p.$id), 10);
  assert.equal([...db.table('stock_movements').values()][0].movement_type, 'opening');
  assert.equal([...db.table('stock_movements').values()][0].performed_by_name, 'Casey Caller');
});

test('create with zero opening stock writes no movement', async () => {
  const db = newDb();
  await createProduct(db, { opening_stock: 0 });
  assert.equal(db.table('stock_movements').size, 0);
});

test('create rejects a duplicate SKU (409) and writes nothing', async () => {
  const db = newDb();
  await createProduct(db);
  const r = await run(db, MANAGE, 'POST', '/products/create', { sku: 'pv-550', name: 'Dup', opening_stock: 5 });
  assert.equal(r.status, 409);
  assert.equal(db.table('products').size, 1);
  assert.equal(db.table('stock_movements').size, 1, 'no orphan movement from the failed create');
});

test('create validates input and refuses a raw current_stock', async () => {
  const db = newDb();
  const bad = (body) => run(db, MANAGE, 'POST', '/products/create', { sku: 'S', name: 'N', ...body });
  assert.equal((await bad({ current_stock: 99 })).status, 400);
  assert.equal((await bad({ opening_stock: -1 })).status, 400);
  assert.equal((await bad({ opening_stock: 1.5 })).status, 400);
  assert.equal((await bad({ unit_price: -5 })).status, 400);
  assert.equal((await bad({ name: '' })).status, 400);
  assert.equal(db.table('products').size, 0);
});

test('update changes catalog fields but never stock', async () => {
  const db = newDb();
  const p = await createProduct(db);
  const ok = await run(db, MANAGE, 'PUT', `/products/${p.$id}`, { name: 'Renamed', unit_price: 45000 });
  assert.equal(ok.body.name, 'Renamed');
  assert.equal(ok.body.current_stock, 10);
  assert.equal((await run(db, MANAGE, 'PUT', `/products/${p.$id}`, { current_stock: 999 })).status, 400);
  assert.equal((await run(db, MANAGE, 'PUT', '/products/missing', { name: 'x' })).status, 404);
  assert.equal((await run(db, [], 'PUT', `/products/${p.$id}`, { name: 'x' })).status, 403);
});

test('delete is a soft delete and blocks further stock entries', async () => {
  const db = newDb();
  const p = await createProduct(db);
  const r = await run(db, MANAGE, 'DELETE', `/products/${p.$id}`);
  assert.equal(r.body.is_active, false);
  assert.equal(db.table('products').size, 1, 'row is kept');
  assert.equal((await run(db, MANAGE, 'POST', `/products/${p.$id}/stock`, { type: 'receive', quantity: 1 })).status, 400);
});

test('stock receive / consume / adjust keep the ledger equal to stock', async () => {
  const db = newDb();
  const p = await createProduct(db);
  const stock = (body) => run(db, MANAGE, 'POST', `/products/${p.$id}/stock`, body);

  assert.equal((await stock({ type: 'receive', quantity: 5 })).body.current_stock, 15);
  assert.equal((await stock({ type: 'consume', quantity: 4, notes: 'Site A' })).body.current_stock, 11);
  assert.equal((await stock({ type: 'adjust', quantity: -2, notes: 'Damaged in storage' })).body.current_stock, 9);
  assert.equal((await stock({ type: 'adjust', quantity: 3, notes: 'Recount' })).body.current_stock, 12);

  assert.equal(ledgerSum(db, p.$id), 12);
  const consume = [...db.table('stock_movements').values()].find((m) => m.movement_type === 'consume');
  assert.equal(consume.quantity, -4, 'consumption is stored as a negative movement');
});

test('consuming more than on hand fails, leaving stock and ledger untouched', async () => {
  const db = newDb();
  const p = await createProduct(db, { opening_stock: 3 });
  const r = await run(db, MANAGE, 'POST', `/products/${p.$id}/stock`, { type: 'consume', quantity: 5 });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /Insufficient stock: only 3/);
  assert.equal((await db.getRow('db', 'products', p.$id)).current_stock, 3);
  assert.equal(db.table('stock_movements').size, 1, 'only the opening movement exists');
});

test('stock entry validation', async () => {
  const db = newDb();
  const p = await createProduct(db);
  const stock = (body) => run(db, MANAGE, 'POST', `/products/${p.$id}/stock`, body);
  assert.equal((await stock({ type: 'sell', quantity: 1 })).status, 400);
  assert.equal((await stock({ type: 'receive', quantity: 0 })).status, 400);
  assert.equal((await stock({ type: 'receive', quantity: -3 })).status, 400);
  assert.equal((await stock({ type: 'receive', quantity: 1.5 })).status, 400);
  assert.equal((await stock({ type: 'adjust', quantity: 2 })).status, 400, 'adjustments need a reason');
  assert.equal((await run(db, MANAGE, 'POST', '/products/missing/stock', { type: 'receive', quantity: 1 })).status, 404);
  assert.equal((await run(db, [], 'POST', `/products/${p.$id}/stock`, { type: 'receive', quantity: 1 })).status, 403);
});

test('C1: two simultaneous deductions of 4 from stock 5 — exactly one succeeds, never negative', async () => {
  const db = newDb();
  const p = await createProduct(db, { opening_stock: 5 });
  const consume = () => run(db, MANAGE, 'POST', `/products/${p.$id}/stock`, { type: 'consume', quantity: 4 });
  const results = await Promise.all([consume(), consume()]);

  assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
  const stock = (await db.getRow('db', 'products', p.$id)).current_stock;
  assert.equal(stock, 1);
  assert.equal(ledgerSum(db, p.$id), stock, 'ledger matches stock');
});

test('C2: two simultaneous additions both land', async () => {
  const db = newDb();
  const p = await createProduct(db, { opening_stock: 10 });
  const receive = () => run(db, MANAGE, 'POST', `/products/${p.$id}/stock`, { type: 'receive', quantity: 5 });
  await Promise.all([receive(), receive()]);
  const stock = (await db.getRow('db', 'products', p.$id)).current_stock;
  assert.equal(stock, 20);
  assert.equal(ledgerSum(db, p.$id), 20);
});
