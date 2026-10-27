import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeDb, makeCtx, call } from './fakeDb.js';
import { handleQuotationRoute, handlePublicQuotationRoute } from '../src/routes/quotations.js';
import { computeQuotation } from '../src/lib/quotationTotals.js';

const ALL = ['quotations:view', 'quotations:create', 'quotations:edit', 'quotations:approve', 'quotations:send', 'quotations:convert'];
const year = new Date().getFullYear();

const newDb = () => new FakeDb({
  uniques: {
    quotations: ['quotation_code'],
    projects: ['project_code', 'quotation_id'],
    products: ['sku'],
  },
});
const staff = (db, perms, method, path, body) => call(handleQuotationRoute, makeCtx(db, perms), method, path, body);
const pub = (db, method, path, body) => call(handlePublicQuotationRoute, makeCtx(db, []), method, path, body);

const ITEMS = [
  { description: 'PV Panel 550W', quantity: 10, unit: 'pcs', unit_price: 42000, discount: 5000 },
  { description: 'Hybrid Inverter 5kW', quantity: 1, unit: 'pcs', unit_price: 250000 },
];
const baseBody = (overrides = {}) => ({
  client_name: 'Ann Perera', client_email: 'ann@x.lk', client_phone: '0771234567', tax_rate: 8, items: ITEMS, ...overrides,
});

async function createQuotation(db, overrides) {
  const r = await staff(db, ALL, 'POST', '/quotations/create', baseBody(overrides));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body;
}

/** Drives a quotation through to a sent state and returns it with the raw review token. */
async function sentQuotation(db, overrides) {
  const q = await createQuotation(db, overrides);
  for (const action of ['submit', 'approve']) {
    const r = await staff(db, ALL, 'POST', `/quotations/${q.$id}/${action}`);
    assert.equal(r.status, 200, `${action}: ${JSON.stringify(r.body)}`);
  }
  const sent = await staff(db, ALL, 'POST', `/quotations/${q.$id}/send`);
  assert.equal(sent.status, 200);
  const token = sent.body.review_url.split('/').pop();
  return { q, token, sent: sent.body };
}

const CONVERT_BODY = { prefix_code: 'SM-RES', location: 'Colombo', start_date: '2026-11-01', end_date: '2027-01-31', system_size: 5.5 };

// ─── totals ─────────────────────────────────────────────────────────────────

test('totals: computed server-side from items; client-supplied figures are ignored', async () => {
  const db = newDb();
  const q = await createQuotation(db, { grand_total: 1, subtotal: 1, tax_total: 1, discount_total: 1 });
  // gross = 10*42000 + 250000 = 670000; discount 5000; taxable 665000; tax 8% = 53200
  assert.equal(q.subtotal, 670000);
  assert.equal(q.discount_total, 5000);
  assert.equal(q.tax_total, 53200);
  assert.equal(q.grand_total, 718200);
  assert.equal(q.items[0].line_total, 415000);
  assert.equal(q.items.length, 2);
});

test('totals: rounding and validation', () => {
  const t = computeQuotation([{ description: 'x', quantity: 3, unit_price: 0.1 }, { description: 'y', quantity: 1, unit_price: 0.2 }], 0);
  assert.equal(t.subtotal, 0.5);
  assert.equal(t.grand_total, 0.5);
  const bad = (items, tax) => assert.throws(() => computeQuotation(items, tax));
  bad([], 0);
  bad([{ description: 'x', quantity: 0, unit_price: 1 }], 0);
  bad([{ description: 'x', quantity: 1, unit_price: -1 }], 0);
  bad([{ description: '', quantity: 1, unit_price: 1 }], 0);
  bad([{ description: 'x', quantity: 1, unit_price: 10, discount: 11 }], 0);
  bad([{ description: 'x', quantity: 1, unit_price: 1 }], 101);
  bad(Array.from({ length: 41 }, () => ({ description: 'x', quantity: 1, unit_price: 1 })), 0);
});

// ─── authoring ──────────────────────────────────────────────────────────────

test('create: sequential codes, draft status, server-side author; needs permission', async () => {
  const db = newDb();
  assert.equal((await staff(db, ['quotations:view'], 'POST', '/quotations/create', baseBody())).status, 403);
  const a = await createQuotation(db);
  const b = await createQuotation(db);
  assert.equal(a.quotation_code, `QT-${year}-0001`);
  assert.equal(b.quotation_code, `QT-${year}-0002`);
  assert.equal(a.status, 'draft');
  assert.equal(a.created_by_name, 'Casey Caller');
});

test('create: validation and linked-client prefill', async () => {
  const db = newDb();
  const bad = (overrides) => staff(db, ALL, 'POST', '/quotations/create', baseBody(overrides));
  assert.equal((await bad({ client_name: '' })).status, 400);
  assert.equal((await bad({ client_email: 'nope' })).status, 400);
  assert.equal((await bad({ items: [] })).status, 400);
  assert.equal((await bad({ client_id: 'ghost' })).status, 400);
  assert.equal((await bad({ valid_until: '2020-01-01' })).status, 400);
  assert.equal(db.table('quotations').size, 0, 'a failed create leaves nothing behind');

  db.seed('clients', [{ $id: 'c1', name: 'Acme Ltd', email: 'acme@x.lk', phone: '011', address: 'Galle Rd' }]);
  const r = await staff(db, ALL, 'POST', '/quotations/create', { client_id: 'c1', items: ITEMS });
  assert.equal(r.body.client_name, 'Acme Ltd');
  assert.equal(r.body.client_email, 'acme@x.lk');
});

test('update replaces items; only draft/rejected quotations are editable', async () => {
  const db = newDb();
  const q = await createQuotation(db);
  const r = await staff(db, ALL, 'PUT', `/quotations/${q.$id}`, baseBody({ tax_rate: 0, items: [{ description: 'Only item', quantity: 2, unit_price: 100 }] }));
  assert.equal(r.status, 200);
  assert.equal(r.body.items.length, 1);
  assert.equal(r.body.grand_total, 200);
  assert.equal(db.table('quotation_items').size, 1, 'old items are gone');

  await staff(db, ALL, 'POST', `/quotations/${q.$id}/submit`);
  assert.equal((await staff(db, ALL, 'PUT', `/quotations/${q.$id}`, baseBody())).status, 400);
  assert.equal((await staff(db, ALL, 'DELETE', `/quotations/${q.$id}`)).status, 400);
});

test('delete removes a draft and its items', async () => {
  const db = newDb();
  const q = await createQuotation(db);
  assert.equal((await staff(db, ['quotations:view'], 'DELETE', `/quotations/${q.$id}`)).status, 403);
  assert.equal((await staff(db, ALL, 'DELETE', `/quotations/${q.$id}`)).status, 200);
  assert.equal(db.table('quotations').size, 0);
  assert.equal(db.table('quotation_items').size, 0);
});

// ─── approval workflow ──────────────────────────────────────────────────────

test('workflow: approve needs its own permission; rejection needs a reason and edit reopens as draft', async () => {
  const db = newDb();
  const q = await createQuotation(db);
  assert.equal((await staff(db, ALL, 'POST', `/quotations/${q.$id}/approve`)).status, 400, 'cannot approve a draft');
  await staff(db, ALL, 'POST', `/quotations/${q.$id}/submit`);

  const noApprove = ALL.filter((p) => p !== 'quotations:approve');
  assert.equal((await staff(db, noApprove, 'POST', `/quotations/${q.$id}/approve`)).status, 403);
  assert.equal((await staff(db, ALL, 'POST', `/quotations/${q.$id}/reject`, {})).status, 400, 'reason required');

  const rejected = await staff(db, ALL, 'POST', `/quotations/${q.$id}/reject`, { reason: 'Margin too thin' });
  assert.equal(rejected.body.status, 'rejected');
  assert.equal(rejected.body.rejection_reason, 'Margin too thin');

  const edited = await staff(db, ALL, 'PUT', `/quotations/${q.$id}`, baseBody());
  assert.equal(edited.body.status, 'draft');
  assert.equal(edited.body.rejection_reason, null);
});

test('send: only approved quotations; stores a token HASH, never the token', async () => {
  const db = newDb();
  const q = await createQuotation(db);
  assert.equal((await staff(db, ALL, 'POST', `/quotations/${q.$id}/send`)).status, 400);

  const { token, sent } = await sentQuotation(db);
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(sent.quotation.status, 'sent');
  assert.equal(sent.email_sent, false, 'SMTP is not configured in tests');
  assert.ok(sent.email_error);

  const stored = JSON.stringify([...db.table('quotations').values()]);
  assert.ok(!stored.includes(token), 'raw token is not persisted');
  assert.ok(sent.quotation.review_token_hash && sent.quotation.review_token_hash !== token);
});

test('re-sending mints a new link and invalidates the old one', async () => {
  const db = newDb();
  const { q, token } = await sentQuotation(db);
  const again = await staff(db, ALL, 'POST', `/quotations/${q.$id}/send`);
  const newToken = again.body.review_url.split('/').pop();
  assert.notEqual(newToken, token);
  assert.equal((await pub(db, 'GET', `/public/quotations/${token}`)).status, 404);
  assert.equal((await pub(db, 'GET', `/public/quotations/${newToken}`)).status, 200);
});

// ─── customer review ────────────────────────────────────────────────────────

test('public view returns a customer-safe projection only', async () => {
  const db = newDb();
  const { token } = await sentQuotation(db, { notes: 'Panels: 10-year warranty' });
  const r = await pub(db, 'GET', `/public/quotations/${token}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.quotation_code, `QT-${year}-0001`);
  assert.equal(r.body.grand_total, 718200);
  assert.equal(r.body.items.length, 2);
  for (const secret of ['created_by', 'created_by_name', 'approved_by', 'review_token_hash', 'lead_id', 'client_id', '$id']) {
    assert.ok(!(secret in r.body), `${secret} must not be exposed`);
  }
  assert.ok(!('$id' in r.body.items[0]) && !('quotation_id' in r.body.items[0]));
});

test('public view: malformed, unknown, and expired tokens', async () => {
  const db = newDb();
  const { q, token } = await sentQuotation(db);
  assert.equal((await pub(db, 'GET', '/public/quotations/not-a-token')).status, 404);
  assert.equal((await pub(db, 'GET', `/public/quotations/${'a'.repeat(64)}`)).status, 404);
  db.table('quotations').get(q.$id).review_token_expires_at = new Date(Date.now() - 1000).toISOString();
  assert.equal((await pub(db, 'GET', `/public/quotations/${token}`)).status, 410);
  assert.equal((await pub(db, 'POST', `/public/quotations/${token}/respond`, { response: 'accepted' })).status, 410);
});

test('respond: validates, records once, revokes the link, and notifies the creator', async () => {
  const db = newDb();
  const { q, token } = await sentQuotation(db);
  assert.equal((await pub(db, 'POST', `/public/quotations/${token}/respond`, { response: 'maybe' })).status, 400);
  assert.equal((await pub(db, 'POST', `/public/quotations/${token}/respond`, {})).status, 400);

  const r = await pub(db, 'POST', `/public/quotations/${token}/respond`, { response: 'accepted', comment: 'Please start in December' });
  assert.equal(r.status, 200);
  const row = db.table('quotations').get(q.$id);
  assert.equal(row.status, 'accepted');
  assert.equal(row.customer_comment, 'Please start in December');
  assert.equal(row.review_token_hash, null, 'token revoked');
  assert.equal(db.table('quotation_responses').size, 1);

  const note = [...db.table('notifications').values()][0];
  assert.equal(note.user_id, 'u_caller');
  assert.equal(note.title, 'Quotation Accepted');

  assert.equal((await pub(db, 'GET', `/public/quotations/${token}`)).status, 404, 'revoked link no longer opens');
  assert.equal((await pub(db, 'POST', `/public/quotations/${token}/respond`, { response: 'declined' })).status, 404);
});

test('C4: two simultaneous customer responses — exactly one is recorded', async () => {
  const db = newDb();
  const { q, token } = await sentQuotation(db);
  const respond = (response) => pub(db, 'POST', `/public/quotations/${token}/respond`, { response });
  const results = await Promise.all([respond('accepted'), respond('declined')]);

  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(db.table('quotation_responses').size, 1);
  const winner = results.find((r) => r.status === 200).body.response;
  assert.equal(db.table('quotations').get(q.$id).status, winner);
});

// ─── conversion ─────────────────────────────────────────────────────────────

async function acceptedQuotation(db) {
  const { q, token } = await sentQuotation(db);
  await pub(db, 'POST', `/public/quotations/${token}/respond`, { response: 'accepted' });
  return q;
}

test('convert: creates a project and links both ways in one commit', async () => {
  const db = newDb();
  const q = await acceptedQuotation(db);
  assert.equal((await staff(db, ALL.filter((p) => p !== 'quotations:convert'), 'POST', `/quotations/${q.$id}/convert`, CONVERT_BODY)).status, 403);

  const r = await staff(db, ALL, 'POST', `/quotations/${q.$id}/convert`, CONVERT_BODY);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.project_code, `SM-RES-${year}-0001`);

  const project = db.table('projects').get(r.body.project_id);
  assert.equal(project.quotation_id, q.$id);
  assert.equal(project.contract_value, 718200);
  assert.equal(project.client, 'Ann Perera');
  assert.equal(project.status, 'pending');
  const quotation = db.table('quotations').get(q.$id);
  assert.equal(quotation.status, 'converted');
  assert.equal(quotation.converted_project_id, project.$id);
});

test('convert: only accepted quotations, and validates the project details', async () => {
  const db = newDb();
  const { q } = await sentQuotation(db);
  assert.equal((await staff(db, ALL, 'POST', `/quotations/${q.$id}/convert`, CONVERT_BODY)).status, 400, 'not accepted yet');

  const accepted = await acceptedQuotation(newDb());
  const db2 = newDb();
  const q2 = await acceptedQuotation(db2);
  for (const bad of [{ location: '' }, { prefix_code: '' }, { start_date: '' }, { end_date: '2020-01-01' }, { system_size: -1 }]) {
    assert.equal((await staff(db2, ALL, 'POST', `/quotations/${q2.$id}/convert`, { ...CONVERT_BODY, ...bad })).status, 400);
  }
  assert.equal(db2.table('projects').size, 0);
  assert.ok(accepted);
});

test('convert: a repeat request returns the existing project instead of a duplicate', async () => {
  const db = newDb();
  const q = await acceptedQuotation(db);
  const first = await staff(db, ALL, 'POST', `/quotations/${q.$id}/convert`, CONVERT_BODY);
  const second = await staff(db, ALL, 'POST', `/quotations/${q.$id}/convert`, CONVERT_BODY);
  assert.equal(second.status, 200);
  assert.equal(second.body.project_id, first.body.project_id);
  assert.equal(second.body.already_converted, true);
  assert.equal(db.table('projects').size, 1);
});

test('C3: two simultaneous conversions create exactly one project', async () => {
  const db = newDb();
  const q = await acceptedQuotation(db);
  const convert = () => staff(db, ALL, 'POST', `/quotations/${q.$id}/convert`, CONVERT_BODY);
  const [a, b] = await Promise.all([convert(), convert()]);

  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(a.body.project_id, b.body.project_id, 'the loser returns the winner\'s project');
  assert.equal(db.table('projects').size, 1);
  assert.equal(db.table('quotations').get(q.$id).converted_project_id, a.body.project_id);
});

test('C6: commit succeeded but the client saw an error — retry returns the project, no duplicate', async () => {
  const db = newDb();
  const q = await acceptedQuotation(db);
  db.failNextCommitAfterApply = true;
  const first = await staff(db, ALL, 'POST', `/quotations/${q.$id}/convert`, CONVERT_BODY);
  // The in-request recovery check already detects the committed conversion...
  assert.equal(first.status, 200);
  assert.equal(first.body.recovered, true);
  // ...and a client retry afterwards is idempotent.
  const retry = await staff(db, ALL, 'POST', `/quotations/${q.$id}/convert`, CONVERT_BODY);
  assert.equal(retry.body.project_id, first.body.project_id);
  assert.equal(db.table('projects').size, 1);
});

test('convert: a project_code taken by another project is regenerated, not reported as a conflict', async () => {
  const db = newDb();
  const q = await acceptedQuotation(db);
  // Another project grabs the code this conversion would compute, between its read and its commit.
  const realList = db.listRows.bind(db);
  let injected = false;
  db.listRows = async (dbId, table, queries) => {
    const result = await realList(dbId, table, queries);
    if (table === 'projects' && !injected) {
      injected = true;
      db.seed('projects', [{ $id: 'other', project_code: `SM-RES-${year}-0001`, quotation_id: null }]);
    }
    return result;
  };
  const r = await staff(db, ALL, 'POST', `/quotations/${q.$id}/convert`, CONVERT_BODY);
  assert.equal(r.status, 200);
  assert.equal(r.body.project_code, `SM-RES-${year}-0002`);
  assert.equal(db.table('projects').size, 2);
});

// ─── PDF ────────────────────────────────────────────────────────────────────

test('pdf: staff and customer links both return a real PDF; staff needs quotations:view', async () => {
  const db = newDb();
  const { q, token } = await sentQuotation(db, { notes: 'Panels carry a 10-year warranty.', terms: '50% advance, balance on commissioning.' });

  assert.equal((await staff(db, [], 'GET', `/quotations/${q.$id}/pdf`)).status, 403);
  const s = await staff(db, ALL, 'GET', `/quotations/${q.$id}/pdf`);
  assert.equal(s.status, 200);
  assert.equal(s.body.filename, `QT-${year}-0001.pdf`);
  assert.equal(Buffer.from(s.body.base64, 'base64').subarray(0, 5).toString(), '%PDF-');

  const p = await pub(db, 'GET', `/public/quotations/${token}/pdf`);
  assert.equal(p.status, 200);
  assert.ok(Buffer.from(p.body.base64, 'base64').length > 1000);
});

test('pdf: a long quotation paginates without error', async () => {
  const db = newDb();
  const items = Array.from({ length: 40 }, (_, i) => ({ description: `Line item ${i + 1} — a fairly long description that wraps across more than one line in the table column`, quantity: 1, unit_price: 1000 + i }));
  const q = await createQuotation(db, { items, notes: 'n'.repeat(1500) });
  const r = await staff(db, ALL, 'GET', `/quotations/${q.$id}/pdf`);
  assert.equal(r.status, 200);
  const pdf = Buffer.from(r.body.base64, 'base64').toString('latin1');
  assert.ok((pdf.match(/\/Type\s*\/Page\b/g) || []).length >= 2, 'expected multiple pages');
});

test('unknown routes return null', async () => {
  const db = newDb();
  assert.equal(await handleQuotationRoute({ ...makeCtx(db, ALL), method: 'PATCH', path: '/quotations/x', body: {} }), null);
  assert.equal(await handlePublicQuotationRoute({ ...makeCtx(db, []), method: 'DELETE', path: '/public/quotations/x', body: {} }), null);
});
