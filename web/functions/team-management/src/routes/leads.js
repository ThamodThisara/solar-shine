import { ID, Query } from 'node-appwrite';
import { createWithSequentialCode, computeNextSequentialCode } from '../lib/codes.js';
import { HttpError, requirePermission } from '../lib/rbac.js';
import { str, email, nonNegativeNumber, isoDate, oneOf } from '../lib/validate.js';
import { createMailer, escapeHtml } from '../lib/mailer.js';

/**
 * Lead management routes. The `leads` collection is read-only from the frontend
 * (`read("users")`), so every write goes through here with the server API key.
 * Listing/reading stays a direct frontend DB read.
 *
 *   POST /leads/create         leads:create   Create a lead (staff)
 *   PUT  /leads/:id            leads:edit     Update a lead
 *   POST /leads/:id/convert    leads:convert  Convert a lead into a client
 *   POST /public/leads         (public)       Website contact-form capture
 */

const LEADS_COLLECTION_ID = 'leads';
const CLIENTS_COLLECTION_ID = 'clients';

// Keep in sync with LEAD_STATUS_OPTIONS / LEAD_SOURCE_OPTIONS in web/src/lib/leads.ts.
const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
const LEAD_SOURCES = ['website', 'referral', 'phone', 'walk_in', 'social_media', 'event', 'other'];

/** Window in which a repeat website submission from the same email is ignored. */
const WEBSITE_DEDUPE_MINUTES = 10;

const leadCodeBase = () => `LD-${new Date().getFullYear()}-`;

/**
 * Validates the editable lead fields shared by create and update. `partial`
 * skips fields absent from the body so updates only touch what was sent.
 */
function parseLeadFields(body, { partial = false } = {}) {
  const fields = {
    name: () => str(body.name, 'Name', { max: 255, required: true }),
    phone: () => str(body.phone, 'Phone', { max: 50 }),
    email: () => email(body.email, 'Email'),
    company: () => str(body.company, 'Company', { max: 255 }),
    address: () => str(body.address, 'Address', { max: 1000 }),
    source: () => oneOf(body.source, 'Source', LEAD_SOURCES, 'other'),
    service_interest: () => str(body.service_interest, 'Service interest', { max: 255 }),
    message: () => str(body.message, 'Message', { max: 5000 }),
    estimated_system_size: () => nonNegativeNumber(body.estimated_system_size, 'Estimated system size'),
    estimated_value: () => nonNegativeNumber(body.estimated_value, 'Estimated value'),
    notes: () => str(body.notes, 'Notes', { max: 5000 }),
    next_follow_up: () => isoDate(body.next_follow_up, 'Next follow-up'),
    lost_reason: () => str(body.lost_reason, 'Lost reason', { max: 1000 }),
  };

  const data = {};
  for (const [key, parse] of Object.entries(fields)) {
    if (partial && !(key in body)) continue;
    data[key] = parse();
  }
  return data;
}

/** Resolves an assignee id to `{ assigned_to, assigned_to_name }` using the server's user record. */
async function resolveAssignee(users, assigneeId) {
  if (!assigneeId) return { assigned_to: null, assigned_to_name: null };
  try {
    const u = await users.get(assigneeId);
    return { assigned_to: u.$id, assigned_to_name: u.name || u.email };
  } catch {
    throw new HttpError(400, 'Assigned user does not exist');
  }
}

async function handleCreate(ctx, body) {
  requirePermission(ctx.can, 'leads:create');
  const data = parseLeadFields(body);
  if (!data.phone && !data.email) {
    throw new HttpError(400, 'Provide at least a phone number or an email');
  }
  const caller = await ctx.getCaller();
  const assignee = await resolveAssignee(ctx.users, body.assigned_to);

  const lead = await createWithSequentialCode(
    ctx.dbs, ctx.databaseId, LEADS_COLLECTION_ID, 'lead_code', leadCodeBase(),
    () => ({
      ...data,
      ...assignee,
      status: 'new',
      created_by: caller.$id,
      created_by_name: caller.name || caller.email,
    }),
    () => ID.unique()
  );
  return { status: 200, body: lead };
}

async function handleUpdate(ctx, leadId, body) {
  requirePermission(ctx.can, 'leads:edit');
  const existing = await getLeadOr404(ctx, leadId);
  const data = parseLeadFields(body, { partial: true });

  if ('status' in body) {
    const status = oneOf(body.status, 'Status', LEAD_STATUSES);
    if (existing.converted_client_id && status !== existing.status) {
      throw new HttpError(400, 'A converted lead\'s status cannot be changed');
    }
    // "won" means a client exists for this lead, so it is only reachable via /convert.
    if (status === 'won' && existing.status !== 'won') {
      throw new HttpError(400, 'Use "Convert to client" to mark a lead as won');
    }
    data.status = status;
  }
  if ('assigned_to' in body) {
    Object.assign(data, await resolveAssignee(ctx.users, body.assigned_to));
  }
  if ((data.status ?? existing.status) !== 'lost') {
    data.lost_reason = null;
  }

  const updated = await ctx.dbs.updateDocument(ctx.databaseId, LEADS_COLLECTION_ID, leadId, data);
  return { status: 200, body: updated };
}

/**
 * Converts a lead into a client (or links it to an existing one). Made
 * idempotent without a transaction:
 *   - a lead that already has `converted_client_id` returns that client;
 *   - the new client gets a deterministic id derived from the lead id, so a
 *     retry after a partial failure hits a 409 and reuses the client it
 *     created instead of making a duplicate.
 */
async function handleConvert(ctx, leadId, body) {
  requirePermission(ctx.can, 'leads:convert');
  const lead = await getLeadOr404(ctx, leadId);

  if (lead.converted_client_id) {
    return { status: 200, body: { lead, client_id: lead.converted_client_id, already_converted: true } };
  }
  if (lead.status === 'lost') {
    throw new HttpError(400, 'Reopen this lead before converting it');
  }

  let clientId;
  if (body.existing_client_id) {
    const existingClientId = str(body.existing_client_id, 'Existing client', { max: 36, required: true });
    try {
      await ctx.dbs.getDocument(ctx.databaseId, CLIENTS_COLLECTION_ID, existingClientId);
    } catch {
      throw new HttpError(400, 'Selected client does not exist');
    }
    clientId = existingClientId;
  } else {
    // The clients collection requires both phone and email.
    if (!lead.phone || !lead.email) {
      throw new HttpError(400, 'Add both a phone number and an email to the lead before converting it to a new client');
    }
    clientId = await createClientForLead(ctx, lead);
  }

  const updated = await ctx.dbs.updateDocument(ctx.databaseId, LEADS_COLLECTION_ID, leadId, {
    status: 'won',
    converted_client_id: clientId,
    converted_at: new Date().toISOString(),
    lost_reason: null,
  });
  return { status: 200, body: { lead: updated, client_id: clientId } };
}

async function createClientForLead(ctx, lead) {
  // Deterministic id: "ld" + the 20-char lead id fits Appwrite's 36-char limit.
  const clientDocId = `ld${lead.$id}`;

  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Same SM-CL-#### format the Client Management UI generates.
    const clientCode = await computeNextSequentialCode(ctx.dbs, ctx.databaseId, CLIENTS_COLLECTION_ID, 'clientCode', 'SM-CL-');
    try {
      const client = await ctx.dbs.createDocument(ctx.databaseId, CLIENTS_COLLECTION_ID, clientDocId, {
        clientCode,
        name: lead.company || lead.name,
        phone: lead.phone,
        email: lead.email,
        channels: 'Phone, Email',
        address: lead.address ? lead.address.slice(0, 500) : null,
      });
      return client.$id;
    } catch (e) {
      if (e.code !== 409) throw e;
      // 409 is either our deterministic id (a previous attempt already created
      // the client — reuse it) or a clientCode collision (regenerate and retry).
      try {
        const existing = await ctx.dbs.getDocument(ctx.databaseId, CLIENTS_COLLECTION_ID, clientDocId);
        return existing.$id;
      } catch {
        continue;
      }
    }
  }
  throw new HttpError(409, 'Could not allocate a unique client code, please retry.');
}

/**
 * Public website contact-form capture. Unauthenticated, so it is strict:
 * a honeypot field, tight validation, and a short dedupe window per email.
 */
export async function handlePublicLead({ body, dbs, databaseId, log, error }) {
  // Honeypot: real visitors never see or fill the `website` field. Pretend success.
  if (body.website) {
    log('Public lead: honeypot triggered — ignoring submission');
    return { status: 200, body: { success: true } };
  }

  const data = {
    name: str(body.name, 'Name', { max: 255, required: true }),
    email: email(body.email, 'Email', { required: true }),
    phone: str(body.phone, 'Phone', { max: 50 }),
    service_interest: str(body.service_interest, 'Service', { max: 255 }),
    message: str(body.message, 'Message', { max: 5000, required: true }),
  };

  const since = new Date(Date.now() - WEBSITE_DEDUPE_MINUTES * 60 * 1000).toISOString();
  const recent = await dbs.listDocuments(databaseId, LEADS_COLLECTION_ID, [
    Query.equal('email', data.email),
    Query.greaterThan('$createdAt', since),
    Query.limit(1),
  ]);
  if (recent.total > 0) {
    log(`Public lead: duplicate submission from ${data.email} within ${WEBSITE_DEDUPE_MINUTES} min — ignoring`);
    return { status: 200, body: { success: true } };
  }

  const lead = await createWithSequentialCode(
    dbs, databaseId, LEADS_COLLECTION_ID, 'lead_code', leadCodeBase(),
    () => ({ ...data, source: 'website', status: 'new' }),
    () => ID.unique()
  );

  await notifyNewWebsiteLead(lead, { log, error });
  return { status: 200, body: { success: true } };
}

/**
 * Best-effort staff notification for a website lead. Sent to LEADS_NOTIFY_EMAIL;
 * skipped when that is unset. A failure never fails the submission.
 */
async function notifyNewWebsiteLead(lead, { log, error }) {
  const to = process.env.LEADS_NOTIFY_EMAIL;
  if (!to) return;
  try {
    const { transporter, from } = createMailer();
    const rows = [
      ['Lead', lead.lead_code],
      ['Name', lead.name],
      ['Email', lead.email],
      ['Phone', lead.phone || '—'],
      ['Service', lead.service_interest || '—'],
    ];
    await transporter.sendMail({
      from,
      to,
      subject: `[Solar Shine] New website lead: ${lead.name}`,
      text: `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nMessage:\n${lead.message}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333;">
          <h2 style="font-size: 18px;">New website lead</h2>
          <table style="border-collapse: collapse; font-size: 14px;">
            ${rows.map(([k, v]) => `<tr><td style="padding: 4px 12px 4px 0; color: #6B7280;">${k}</td><td style="padding: 4px 0; font-weight: 600;">${escapeHtml(v)}</td></tr>`).join('')}
          </table>
          <p style="font-size: 14px; white-space: pre-wrap;">${escapeHtml(lead.message)}</p>
        </div>`,
    });
    log(`Public lead: notification sent for ${lead.lead_code}`);
  } catch (e) {
    error(`Public lead: notification failed for ${lead.lead_code}: ${e.message}`);
  }
}

async function getLeadOr404(ctx, leadId) {
  try {
    return await ctx.dbs.getDocument(ctx.databaseId, LEADS_COLLECTION_ID, leadId);
  } catch (e) {
    if (e.code === 404) throw new HttpError(404, 'Lead not found');
    throw e;
  }
}

/**
 * Dispatches an authenticated `/leads/*` request. Returns `{ status, body }`,
 * or null when the path is not a lead route.
 */
export async function handleLeadRoute(ctx) {
  const { method, path, body } = ctx;

  if (method === 'POST' && path === '/leads/create') {
    return handleCreate(ctx, body);
  }

  let match = path.match(/^\/leads\/([^/]+)\/convert$/);
  if (method === 'POST' && match) {
    return handleConvert(ctx, match[1], body);
  }

  match = path.match(/^\/leads\/([^/]+)$/);
  if (method === 'PUT' && match) {
    return handleUpdate(ctx, match[1], body);
  }

  return null;
}
