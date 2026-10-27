import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeDb, makeCtx, call as callHandler, appwriteError } from './fakeDb.js';
import { handleLeadRoute, handlePublicLead } from '../src/routes/leads.js';
import { loadCallerPermissions } from '../src/lib/rbac.js';

const newDb = (uniques = {}) => new FakeDb({ uniques });
const noopLog = () => {};
const call = (dbs, perms, method, path, body) => callHandler(handleLeadRoute, makeCtx(dbs, perms), method, path, body);
const ALL = ['leads:create', 'leads:edit', 'leads:convert'];
const year = new Date().getFullYear();

test('admin bypasses; role grants come from roles collection', async () => {
  const dbs = newDb();
  dbs.seed('roles', [['r1', { $id: 'r1', slug: 'sales_manager', permissions: ['leads:view', 'leads:create'] }]].map(([, row]) => row));
  assert.equal((await loadCallerPermissions(dbs, 'db', 'admin'))('anything'), true);
  const can = await loadCallerPermissions(dbs, 'db', 'sales_manager');
  assert.equal(can('leads:create'), true);
  assert.equal(can('leads:convert'), false);
  assert.equal((await loadCallerPermissions(dbs, 'db', 'unknown_role'))('leads:view'), false);
  assert.equal((await loadCallerPermissions(dbs, 'db', undefined))('leads:view'), false);
});

test('create without permission → 403', async () => {
  const r = await call(newDb(), [], 'POST', '/leads/create', { name: 'A', phone: '1' });
  assert.equal(r.status, 403);
});
test('create assigns sequential codes and server-side names', async () => {
  const dbs = newDb({ leads: ['lead_code'] });
  const a = await call(dbs, ALL, 'POST', '/leads/create', { name: 'Ann', phone: '0771', assigned_to: 'u_sales', status: 'won' });
  const b = await call(dbs, ALL, 'POST', '/leads/create', { name: 'Ben', email: 'BEN@X.LK' });
  assert.equal(a.body.lead_code, `LD-${year}-0001`);
  assert.equal(b.body.lead_code, `LD-${year}-0002`);
  assert.equal(a.body.status, 'new', 'client cannot pick status on create');
  assert.equal(a.body.assigned_to_name, 'Sam Sales');
  assert.equal(a.body.created_by_name, 'Casey Caller');
  assert.equal(b.body.email, 'ben@x.lk');
});
test('create retries when a concurrent create took the code (409)', async () => {
  const dbs = newDb({ leads: ['lead_code'] });
  dbs.failNextCreate = { table: 'leads', error: appwriteError(409, 'row_unique_constraint_violation', 'Unique lead_code') };
  const r = await call(dbs, ALL, 'POST', '/leads/create', { name: 'Ann', phone: '0771' });
  assert.equal(r.status, 200);
});
test('create validation: name required, contact required, bad email, bad assignee', async () => {
  const dbs = newDb();
  assert.equal((await call(dbs, ALL, 'POST', '/leads/create', { phone: '1' })).status, 400);
  assert.equal((await call(dbs, ALL, 'POST', '/leads/create', { name: 'No Contact' })).status, 400);
  assert.equal((await call(dbs, ALL, 'POST', '/leads/create', { name: 'X', email: 'nope' })).status, 400);
  assert.equal((await call(dbs, ALL, 'POST', '/leads/create', { name: 'X', phone: '1', assigned_to: 'ghost' })).status, 400);
  assert.equal((await call(dbs, ALL, 'POST', '/leads/create', { name: 'X', phone: '1', source: 'tv' })).status, 400);
  assert.equal((await call(dbs, ALL, 'POST', '/leads/create', { name: 'X', phone: '1', estimated_value: -5 })).status, 400);
});
test('update: partial, cannot set won, lost_reason cleared when reopened', async () => {
  const dbs = newDb();
  const { body: lead } = await call(dbs, ALL, 'POST', '/leads/create', { name: 'Ann', phone: '0771', notes: 'keep me' });
  assert.equal((await call(dbs, ['leads:create'], 'PUT', `/leads/${lead.$id}`, { status: 'contacted' })).status, 403);
  let r = await call(dbs, ALL, 'PUT', `/leads/${lead.$id}`, { status: 'lost', lost_reason: 'Budget' });
  assert.equal(r.body.status, 'lost'); assert.equal(r.body.lost_reason, 'Budget'); assert.equal(r.body.notes, 'keep me');
  r = await call(dbs, ALL, 'PUT', `/leads/${lead.$id}`, { status: 'won' });
  assert.equal(r.status, 400);
  r = await call(dbs, ALL, 'PUT', `/leads/${lead.$id}`, { status: 'qualified' });
  assert.equal(r.body.lost_reason, null);
  assert.equal((await call(dbs, ALL, 'PUT', '/leads/missing', { notes: 'x' })).status, 404);
});

test('convert creates client, marks won, and is idempotent', async () => {
  const dbs = newDb({ clients: ['clientCode'] });
  dbs.seed('clients', [['c0', { $id: 'c0', clientCode: 'SM-CL-0007', name: 'Old' }]].map(([, row]) => row));
  const { body: lead } = await call(dbs, ALL, 'POST', '/leads/create', { name: 'Ann', company: 'Ann Ltd', phone: '0771', email: 'ann@x.lk' });
  assert.equal((await call(dbs, ['leads:edit'], 'POST', `/leads/${lead.$id}/convert`)).status, 403);
  const r1 = await call(dbs, ALL, 'POST', `/leads/${lead.$id}/convert`);
  assert.equal(r1.status, 200);
  assert.equal(r1.body.client_id, `ld${lead.$id}`);
  const client = dbs.table('clients').get(r1.body.client_id);
  assert.equal(client.clientCode, 'SM-CL-0008');
  assert.equal(client.name, 'Ann Ltd');
  assert.equal(r1.body.lead.status, 'won');
  const r2 = await call(dbs, ALL, 'POST', `/leads/${lead.$id}/convert`);
  assert.equal(r2.body.already_converted, true);
  assert.equal(dbs.table('clients').size, 2, 'no duplicate client');
  assert.equal((await call(dbs, ALL, 'PUT', `/leads/${lead.$id}`, { status: 'lost' })).status, 400);
});
test('convert retry after partial failure reuses the client it already created', async () => {
  const dbs = newDb();
  const { body: lead } = await call(dbs, ALL, 'POST', '/leads/create', { name: 'Ann', phone: '0771', email: 'ann@x.lk' });
  // Simulate: client was created, but the lead update never happened.
  dbs.seed('clients', [[`ld${lead.$id}`, { $id: `ld${lead.$id}`, clientCode: 'SM-CL-0001', name: 'Ann' }]].map(([, row]) => row));
  const r = await call(dbs, ALL, 'POST', `/leads/${lead.$id}/convert`);
  assert.equal(r.status, 200);
  assert.equal(r.body.client_id, `ld${lead.$id}`);
  assert.equal(dbs.table('clients').size, 1);
});
test('convert: link existing client, missing contact, lost lead', async () => {
  const dbs = newDb();
  dbs.seed('clients', [['c1', { $id: 'c1', name: 'Existing' }]].map(([, row]) => row));
  const { body: noEmail } = await call(dbs, ALL, 'POST', '/leads/create', { name: 'Ann', phone: '0771' });
  assert.equal((await call(dbs, ALL, 'POST', `/leads/${noEmail.$id}/convert`)).status, 400);
  assert.equal((await call(dbs, ALL, 'POST', `/leads/${noEmail.$id}/convert`, { existing_client_id: 'nope' })).status, 400);
  const linked = await call(dbs, ALL, 'POST', `/leads/${noEmail.$id}/convert`, { existing_client_id: 'c1' });
  assert.equal(linked.body.client_id, 'c1');
  const { body: lost } = await call(dbs, ALL, 'POST', '/leads/create', { name: 'Lou', phone: '1', email: 'l@x.lk' });
  await call(dbs, ALL, 'PUT', `/leads/${lost.$id}`, { status: 'lost' });
  assert.equal((await call(dbs, ALL, 'POST', `/leads/${lost.$id}/convert`)).status, 400);
});
test('unknown lead route returns null', async () => {
  assert.equal(await handleLeadRoute({ ...makeCtx(newDb(), ALL), method: 'DELETE', path: '/leads/x', body: {} }), null);
});

const pub = (dbs, body) => handlePublicLead({ body, dbs, databaseId: 'db', log: noopLog, error: noopLog })
  .catch((e) => ({ status: e.status ?? 500, body: { error: e.message } }));
test('valid submission creates a website lead', async () => {
  const dbs = newDb();
  const r = await pub(dbs, { name: 'Web Visitor', email: 'Web@X.lk', phone: '077', service_interest: 'Residential Solar', message: 'Need a quote please' });
  assert.equal(r.status, 200);
  const [lead] = dbs.table('leads').values();
  assert.equal(lead.source, 'website'); assert.equal(lead.status, 'new'); assert.equal(lead.email, 'web@x.lk');
  assert.equal(r.body.lead_code, undefined, 'public response leaks nothing');
});
test('honeypot and duplicate submissions are silently dropped', async () => {
  const dbs = newDb();
  await pub(dbs, { name: 'Bot', email: 'b@x.lk', message: 'spam spam', website: 'http://spam' });
  assert.equal(dbs.table('leads').size, 0);
  await pub(dbs, { name: 'Web', email: 'w@x.lk', message: 'first message' });
  await pub(dbs, { name: 'Web', email: 'w@x.lk', message: 'double click' });
  assert.equal(dbs.table('leads').size, 1);
});
test('public validation rejects missing email / message and oversize input', async () => {
  const dbs = newDb();
  assert.equal((await pub(dbs, { name: 'X', message: 'hello there' })).status, 400);
  assert.equal((await pub(dbs, { name: 'X', email: 'x@x.lk' })).status, 400);
  assert.equal((await pub(dbs, { name: 'X', email: 'x@x.lk', message: 'a'.repeat(5001) })).status, 400);
  assert.equal((await pub(dbs, { name: { $ne: 1 }, email: 'x@x.lk', message: 'hello there' })).status, 400);
});

