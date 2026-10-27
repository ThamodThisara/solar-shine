import { createHash, randomBytes } from 'node:crypto';
import { ID, Query } from 'node-appwrite';
import { computeNextSequentialCode } from '../lib/codes.js';
import { HttpError, requirePermission } from '../lib/rbac.js';
import { str, email, isoDate, oneOf, ValidationError } from '../lib/validate.js';
import { runTransaction, isUniqueViolation } from '../lib/tx.js';
import { computeQuotation } from '../lib/quotationTotals.js';
import { createMailer, escapeHtml } from '../lib/mailer.js';
import { buildQuotationPdf } from '../lib/quotationPdf.js';

/**
 * Quotation routes. `quotations`, `quotation_items` are read-only from the
 * frontend, so every write goes through here.
 *
 * Lifecycle:  draft → pending_approval → approved → sent → accepted → converted
 *                         ↓ rejected (edit → draft)        ↓ declined
 *
 *   POST   /quotations/create          quotations:create
 *   PUT    /quotations/:id             quotations:edit      (draft / rejected only)
 *   DELETE /quotations/:id             quotations:edit      (draft / rejected only)
 *   POST   /quotations/:id/submit      quotations:edit
 *   POST   /quotations/:id/approve     quotations:approve
 *   POST   /quotations/:id/reject      quotations:approve
 *   POST   /quotations/:id/send        quotations:send      (mints the customer review link)
 *   POST   /quotations/:id/convert     quotations:convert   (accepted → project)
 *   GET    /quotations/:id/pdf         quotations:view
 *
 * Public (customer, no session — the review token is the credential):
 *   GET    /public/quotations/:token
 *   GET    /public/quotations/:token/pdf
 *   POST   /public/quotations/:token/respond
 *
 * Concurrency: transactions here have NO conflict detection (see lib/tx.js), so
 * each "only one may win" step carries its own unique guard:
 *   - convert  → unique index on projects.quotation_id
 *   - respond  → a `quotation_responses` row whose id is the quotation id
 *   - codes    → unique indexes on quotation_code / project_code, retried on 409
 */

const QUOTATIONS = 'quotations';
const ITEMS = 'quotation_items';
const RESPONSES = 'quotation_responses';
const CLIENTS = 'clients';
const LEADS = 'leads';
const PROJECTS = 'projects';
const NOTIFICATIONS = 'notifications';

const EDITABLE_STATUSES = ['draft', 'rejected'];
const DEFAULT_VALIDITY_DAYS = 30;
const CODE_ATTEMPTS = 5;

const quotationCodeBase = () => `QT-${new Date().getFullYear()}-`;
const publicSiteUrl = () => (process.env.PUBLIC_SITE_URL || 'https://solarmaps.lk').replace(/\/$/, '');
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

async function getRowOrNull(ctx, table, id) {
  try {
    return await ctx.tdb.getRow(ctx.databaseId, table, id);
  } catch (e) {
    if (e.code === 404) return null;
    throw e;
  }
}

async function getQuotationOr404(ctx, id) {
  const quotation = await getRowOrNull(ctx, QUOTATIONS, id);
  if (!quotation) throw new HttpError(404, 'Quotation not found');
  return quotation;
}

async function listItems(ctx, quotationId) {
  const result = await ctx.tdb.listRows(ctx.databaseId, ITEMS, [
    Query.equal('quotation_id', quotationId),
    Query.orderAsc('sort_order'),
    Query.limit(100),
  ]);
  return result.rows;
}

/** Validates the editable quotation fields + line items, prefilling client details when a client/lead is linked. */
async function parseQuotationInput(ctx, body) {
  const calc = computeQuotation(body.items, body.tax_rate);

  const clientId = str(body.client_id, 'Client', { max: 36 });
  const leadId = str(body.lead_id, 'Lead', { max: 36 });
  let name = str(body.client_name, 'Client name', { max: 255 });
  let clientEmail = email(body.client_email, 'Client email');
  let phone = str(body.client_phone, 'Client phone', { max: 50 });
  let address = str(body.client_address, 'Client address', { max: 1000 });

  const source = clientId
    ? await getRowOrNull(ctx, CLIENTS, clientId)
    : leadId ? await getRowOrNull(ctx, LEADS, leadId) : null;
  if (clientId && !source) throw new ValidationError('Selected client does not exist');
  if (leadId && !clientId && !source) throw new ValidationError('Selected lead does not exist');
  if (source) {
    name ??= source.name;
    clientEmail ??= source.email ?? null;
    phone ??= source.phone ?? null;
    address ??= source.address ?? null;
  }
  if (!name) throw new ValidationError('Client name is required');

  const validUntil = isoDate(body.valid_until, 'Valid until')
    ?? new Date(Date.now() + DEFAULT_VALIDITY_DAYS * 86_400_000).toISOString();
  if (new Date(validUntil).getTime() < Date.now() - 86_400_000) {
    throw new ValidationError('Valid-until date cannot be in the past');
  }

  return {
    header: {
      client_id: clientId,
      lead_id: leadId,
      client_name: name,
      client_email: clientEmail,
      client_phone: phone,
      client_address: address,
      valid_until: validUntil,
      tax_rate: calc.tax_rate,
      subtotal: calc.subtotal,
      discount_total: calc.discount_total,
      tax_total: calc.tax_total,
      grand_total: calc.grand_total,
      notes: str(body.notes, 'Notes', { max: 5000 }),
      terms: str(body.terms, 'Terms', { max: 5000 }),
    },
    items: calc.items,
  };
}

async function withItems(ctx, quotation) {
  return { ...quotation, items: await listItems(ctx, quotation.$id) };
}

// ─── Authoring ──────────────────────────────────────────────────────────────

async function handleCreate(ctx, body) {
  requirePermission(ctx.can, 'quotations:create');
  const { header, items } = await parseQuotationInput(ctx, body);
  const caller = await ctx.getCaller();

  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
    const code = await computeNextSequentialCode(ctx.tdb, ctx.databaseId, QUOTATIONS, 'quotation_code', quotationCodeBase());
    const quotationId = ID.unique();
    try {
      await runTransaction(ctx.tdb, async (tx) => {
        await ctx.tdb.createRow(ctx.databaseId, QUOTATIONS, quotationId, {
          ...header,
          quotation_code: code,
          status: 'draft',
          created_by: caller.$id,
          created_by_name: caller.name || caller.email,
        }, undefined, tx);
        for (const item of items) {
          await ctx.tdb.createRow(ctx.databaseId, ITEMS, ID.unique(), { ...item, quotation_id: quotationId }, undefined, tx);
        }
      });
    } catch (e) {
      if (isUniqueViolation(e)) continue; // a concurrent create took this code — regenerate
      throw e;
    }
    return { status: 200, body: await withItems(ctx, await ctx.tdb.getRow(ctx.databaseId, QUOTATIONS, quotationId)) };
  }
  throw new HttpError(409, 'Could not allocate a unique quotation number, please retry.');
}

async function handleUpdate(ctx, id, body) {
  requirePermission(ctx.can, 'quotations:edit');
  const quotation = await getQuotationOr404(ctx, id);
  if (!EDITABLE_STATUSES.includes(quotation.status)) {
    throw new HttpError(400, `A ${quotation.status.replace('_', ' ')} quotation cannot be edited`);
  }
  const { header, items } = await parseQuotationInput(ctx, body);
  const oldItems = await listItems(ctx, id);

  await runTransaction(ctx.tdb, async (tx) => {
    // Editing a rejected quotation puts it back to draft for resubmission.
    await ctx.tdb.updateRow(ctx.databaseId, QUOTATIONS, id, { ...header, status: 'draft', rejection_reason: null }, undefined, tx);
    for (const old of oldItems) {
      await ctx.tdb.deleteRow(ctx.databaseId, ITEMS, old.$id, tx);
    }
    for (const item of items) {
      await ctx.tdb.createRow(ctx.databaseId, ITEMS, ID.unique(), { ...item, quotation_id: id }, undefined, tx);
    }
  });
  return { status: 200, body: await withItems(ctx, await ctx.tdb.getRow(ctx.databaseId, QUOTATIONS, id)) };
}

async function handleDelete(ctx, id) {
  requirePermission(ctx.can, 'quotations:edit');
  const quotation = await getQuotationOr404(ctx, id);
  if (!EDITABLE_STATUSES.includes(quotation.status)) {
    throw new HttpError(400, 'Only draft or rejected quotations can be deleted');
  }
  const oldItems = await listItems(ctx, id);
  await runTransaction(ctx.tdb, async (tx) => {
    for (const old of oldItems) await ctx.tdb.deleteRow(ctx.databaseId, ITEMS, old.$id, tx);
    await ctx.tdb.deleteRow(ctx.databaseId, QUOTATIONS, id, tx);
  });
  return { status: 200, body: { success: true } };
}

// ─── Approval workflow ──────────────────────────────────────────────────────

/** Moves a quotation between statuses, refusing when it isn't currently in one of `from`. */
async function transition(ctx, id, { permission, from, to, data = {} }) {
  requirePermission(ctx.can, permission);
  const quotation = await getQuotationOr404(ctx, id);
  if (!from.includes(quotation.status)) {
    throw new HttpError(400, `Cannot do this while the quotation is "${quotation.status.replace('_', ' ')}"`);
  }
  const updated = await ctx.tdb.updateRow(ctx.databaseId, QUOTATIONS, id, { status: to, ...data });
  return { status: 200, body: updated };
}

const handleSubmit = (ctx, id) =>
  transition(ctx, id, { permission: 'quotations:edit', from: ['draft'], to: 'pending_approval' });

async function handleApprove(ctx, id) {
  const caller = await ctx.getCaller();
  return transition(ctx, id, {
    permission: 'quotations:approve',
    from: ['pending_approval'],
    to: 'approved',
    data: { approved_by: caller.$id, approved_at: new Date().toISOString(), rejection_reason: null },
  });
}

function handleReject(ctx, id, body) {
  const reason = str(body.reason, 'Reason', { max: 1000, required: true });
  return transition(ctx, id, {
    permission: 'quotations:approve',
    from: ['pending_approval'],
    to: 'rejected',
    data: { rejection_reason: reason },
  });
}

// ─── Sending to the customer ────────────────────────────────────────────────

async function handleSend(ctx, id) {
  requirePermission(ctx.can, 'quotations:send');
  const quotation = await getQuotationOr404(ctx, id);
  if (!['approved', 'sent'].includes(quotation.status)) {
    throw new HttpError(400, 'Only an approved quotation can be sent');
  }

  // Only a hash is stored; the raw token exists in the link alone. Re-sending
  // mints a new token, which invalidates the previous link.
  const token = randomBytes(32).toString('hex');
  const validUntil = quotation.valid_until ? new Date(quotation.valid_until) : null;
  const expires = validUntil && validUntil.getTime() > Date.now()
    ? validUntil
    : new Date(Date.now() + DEFAULT_VALIDITY_DAYS * 86_400_000);

  const updated = await ctx.tdb.updateRow(ctx.databaseId, QUOTATIONS, id, {
    status: 'sent',
    sent_at: new Date().toISOString(),
    review_token_hash: hashToken(token),
    review_token_expires_at: expires.toISOString(),
  });

  const reviewUrl = `${publicSiteUrl()}/quotation/review/${token}`;
  let emailSent = false;
  let emailError = null;
  if (quotation.client_email) {
    try {
      await emailQuotationLink(updated, reviewUrl);
      emailSent = true;
    } catch (e) {
      emailError = e.message;
      ctx.error(`Quotation send: email failed for ${quotation.quotation_code}: ${e.message}`);
    }
  }
  return { status: 200, body: { quotation: updated, review_url: reviewUrl, email_sent: emailSent, email_error: emailError } };
}

async function emailQuotationLink(quotation, reviewUrl) {
  const { transporter, from } = createMailer();
  const name = escapeHtml(quotation.client_name);
  const total = `LKR ${Number(quotation.grand_total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const validUntil = quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

  await transporter.sendMail({
    from,
    to: quotation.client_email,
    subject: `[Solar Shine] Quotation ${quotation.quotation_code}`,
    text: `Hello ${quotation.client_name},\n\nYour quotation ${quotation.quotation_code} (${total}) is ready. Review it and accept or decline here:\n${reviewUrl}\n${validUntil ? `\nThis quotation is valid until ${validUntil}.\n` : ''}\nBest regards,\nSolar Shine Team`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F8F8; padding: 40px 20px; color: #333;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; padding: 40px;">
          <div style="margin-bottom: 24px; border-bottom: 1px solid #F3F4F6; padding-bottom: 16px;">
            <span style="font-size: 24px; font-weight: bold; color: #000000;">Solar <span style="color: #FEC105;">Maps</span></span>
          </div>
          <h2 style="font-size: 20px; margin-top: 0; color: #111827;">Your quotation is ready</h2>
          <p style="font-size: 15px; color: #4B5563; line-height: 1.5;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 15px; color: #4B5563; line-height: 1.5;">Quotation <strong>${escapeHtml(quotation.quotation_code)}</strong> for <strong>${escapeHtml(total)}</strong> is ready for your review.${validUntil ? ` It is valid until <strong>${escapeHtml(validUntil)}</strong>.` : ''}</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${escapeHtml(reviewUrl)}" style="display: inline-block; padding: 12px 28px; background-color: #FEC105; color: #000000; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; text-transform: uppercase;">Review Quotation</a>
          </div>
          <p style="font-size: 13px; color: #6B7280; word-break: break-all;">Or open this link: ${escapeHtml(reviewUrl)}</p>
          <p style="font-size: 12px; color: #9CA3AF; border-top: 1px solid #F3F4F6; padding-top: 16px; margin-bottom: 0;">&copy; ${new Date().getFullYear()} Solar Shine Team.</p>
        </div>
      </div>`,
  });
}

// ─── Conversion to a project ────────────────────────────────────────────────

async function existingConversion(ctx, quotation) {
  const project = await getRowOrNull(ctx, PROJECTS, quotation.converted_project_id);
  if (!project) {
    // Never expected (project + quotation commit together). Don't guess — a person should look.
    throw new HttpError(409, 'This quotation is marked converted but its project was not found. Contact an administrator.');
  }
  return { status: 200, body: { success: true, project_id: project.$id, project_code: project.project_code, already_converted: true } };
}

async function handleConvert(ctx, id, body) {
  requirePermission(ctx.can, 'quotations:convert');

  const prefixCode = str(body.prefix_code, 'Project type', { max: 20, required: true });
  const location = str(body.location, 'Location', { max: 255, required: true });
  const startDate = isoDate(body.start_date, 'Start date');
  const endDate = isoDate(body.end_date, 'End date');
  if (!startDate || !endDate) throw new ValidationError('Start and end dates are required');
  if (new Date(endDate) < new Date(startDate)) throw new ValidationError('End date cannot be before the start date');
  const address = str(body.address, 'Address', { max: 500 });
  const systemSize = Number(body.system_size ?? 0);
  if (!Number.isFinite(systemSize) || systemSize < 0) throw new ValidationError('System size must be a non-negative number');
  const projectName = str(body.name, 'Project name', { max: 255 });

  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
    // Re-read each pass: a failed attempt may mean a concurrent request already converted it.
    const quotation = await getQuotationOr404(ctx, id);
    if (quotation.converted_project_id) return existingConversion(ctx, quotation);
    if (quotation.status !== 'accepted') {
      throw new HttpError(400, `Only an accepted quotation can be converted (this one is "${quotation.status.replace('_', ' ')}")`);
    }

    const base = `${prefixCode}-${new Date().getFullYear()}-`;
    const projectCode = await computeNextSequentialCode(ctx.tdb, ctx.databaseId, PROJECTS, 'project_code', base);
    const projectId = ID.unique();

    try {
      await runTransaction(ctx.tdb, async (tx) => {
        await ctx.tdb.createRow(ctx.databaseId, PROJECTS, projectId, {
          name: projectName || `${quotation.client_name} — ${quotation.quotation_code}`,
          client: quotation.client_name,
          clientId: quotation.client_id,
          location,
          address,
          project_code: projectCode,
          prefix_code: prefixCode,
          system_size: systemSize,
          contract_value: quotation.grand_total,
          start_date: startDate,
          end_date: endDate,
          status: 'pending',
          quotation_id: id,
        }, undefined, tx);
        await ctx.tdb.updateRow(ctx.databaseId, QUOTATIONS, id, {
          status: 'converted',
          converted_project_id: projectId,
        }, undefined, tx);
      });
      return { status: 200, body: { success: true, project_id: projectId, project_code: projectCode } };
    } catch (e) {
      // The commit may have succeeded even though we saw an error (timeout), or a
      // concurrent request may have won the quotation_id unique index. Check first.
      const after = await getRowOrNull(ctx, QUOTATIONS, id).catch(() => null);
      if (after?.converted_project_id) {
        const result = await existingConversion(ctx, after);
        return { ...result, body: { ...result.body, recovered: true } };
      }
      // Otherwise the clash was the project_code (a concurrent project took it): regenerate.
      if (isUniqueViolation(e)) continue;
      throw e;
    }
  }
  throw new HttpError(409, 'Could not allocate a unique project code, please retry.');
}

// ─── PDF ────────────────────────────────────────────────────────────────────

async function pdfResponse(ctx, quotation) {
  const items = await listItems(ctx, quotation.$id);
  const pdf = buildQuotationPdf(quotation, items);
  return { status: 200, body: { filename: `${quotation.quotation_code}.pdf`, base64: pdf.toString('base64') } };
}

async function handlePdf(ctx, id) {
  requirePermission(ctx.can, 'quotations:view');
  return pdfResponse(ctx, await getQuotationOr404(ctx, id));
}

// ─── Customer review (public) ───────────────────────────────────────────────

/** Finds the quotation a review token belongs to, or throws a deliberately vague 404. */
async function findByToken(ctx, token) {
  const invalid = new HttpError(404, 'This link is not valid. Please contact us for a new one.');
  if (!/^[a-f0-9]{64}$/.test(token)) throw invalid;
  const result = await ctx.tdb.listRows(ctx.databaseId, QUOTATIONS, [
    Query.equal('review_token_hash', hashToken(token)),
    Query.limit(1),
  ]);
  const quotation = result.rows[0];
  if (!quotation) throw invalid;
  if (quotation.review_token_expires_at && new Date(quotation.review_token_expires_at) < new Date()) {
    throw new HttpError(410, 'This quotation link has expired. Please contact us for an updated quotation.');
  }
  return quotation;
}

async function handlePublicView(ctx, token) {
  const quotation = await findByToken(ctx, token);
  const items = await listItems(ctx, quotation.$id);
  // Customer-safe projection: no internal ids, creator, approval, or token fields.
  return {
    status: 200,
    body: {
      quotation_code: quotation.quotation_code,
      status: quotation.status,
      client_name: quotation.client_name,
      client_email: quotation.client_email,
      client_phone: quotation.client_phone,
      client_address: quotation.client_address,
      valid_until: quotation.valid_until,
      issued_at: quotation.$createdAt,
      tax_rate: quotation.tax_rate,
      subtotal: quotation.subtotal,
      discount_total: quotation.discount_total,
      tax_total: quotation.tax_total,
      grand_total: quotation.grand_total,
      notes: quotation.notes,
      terms: quotation.terms,
      items: items.map(({ description, quantity, unit, unit_price, discount, line_total }) => (
        { description, quantity, unit, unit_price, discount, line_total }
      )),
    },
  };
}

async function handlePublicPdf(ctx, token) {
  return pdfResponse(ctx, await findByToken(ctx, token));
}

async function handlePublicRespond(ctx, token, body) {
  const response = oneOf(body.response, 'Response', ['accepted', 'declined']);
  if (!response) throw new ValidationError('Response is required');
  const comment = str(body.comment, 'Comment', { max: 2000 });

  const quotation = await findByToken(ctx, token);
  if (quotation.status !== 'sent') {
    throw new HttpError(409, 'This quotation has already been answered.');
  }

  const alreadyAnswered = new HttpError(409, 'This quotation has already been answered.');
  try {
    await runTransaction(ctx.tdb, async (tx) => {
      // The guard row: its id IS the quotation id, so a second response collides here at commit.
      await ctx.tdb.createRow(ctx.databaseId, RESPONSES, quotation.$id, { response, comment }, undefined, tx);
      await ctx.tdb.updateRow(ctx.databaseId, QUOTATIONS, quotation.$id, {
        status: response,
        customer_response: response,
        customer_response_at: new Date().toISOString(),
        customer_comment: comment,
        // Revoke the link: the decision is final.
        review_token_hash: null,
        review_token_expires_at: null,
      }, undefined, tx);
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw alreadyAnswered;
    throw e;
  }

  await notifyCreator(ctx, quotation, response, comment);
  return { status: 200, body: { success: true, response } };
}

/** Best-effort in-app notification to whoever created the quotation. Never fails the response. */
async function notifyCreator(ctx, quotation, response, comment) {
  if (!quotation.created_by) return;
  try {
    await ctx.tdb.createRow(ctx.databaseId, NOTIFICATIONS, ID.unique(), {
      user_id: quotation.created_by,
      title: response === 'accepted' ? 'Quotation Accepted' : 'Quotation Declined',
      content: `**${quotation.client_name}** ${response} quotation **${quotation.quotation_code}**.${comment ? ` Comment: ${comment}` : ''}`,
      read: false,
      link: '/dashboard?tab=quotations',
    });
  } catch (e) {
    ctx.error(`Quotation response: notification failed for ${quotation.quotation_code}: ${e.message}`);
  }
}

// ─── Dispatch ───────────────────────────────────────────────────────────────

/** Dispatches an authenticated `/quotations/*` request, or returns null when not a quotation route. */
export async function handleQuotationRoute(ctx) {
  const { method, path, body } = ctx;

  if (method === 'POST' && path === '/quotations/create') return handleCreate(ctx, body);

  let match = path.match(/^\/quotations\/([^/]+)\/(submit|approve|reject|send|convert)$/);
  if (method === 'POST' && match) {
    const [, id, action] = match;
    if (action === 'submit') return handleSubmit(ctx, id);
    if (action === 'approve') return handleApprove(ctx, id);
    if (action === 'reject') return handleReject(ctx, id, body);
    if (action === 'send') return handleSend(ctx, id);
    return handleConvert(ctx, id, body);
  }

  match = path.match(/^\/quotations\/([^/]+)\/pdf$/);
  if (method === 'GET' && match) return handlePdf(ctx, match[1]);

  match = path.match(/^\/quotations\/([^/]+)$/);
  if (match && method === 'PUT') return handleUpdate(ctx, match[1], body);
  if (match && method === 'DELETE') return handleDelete(ctx, match[1]);

  return null;
}

/** Dispatches an unauthenticated `/public/quotations/*` request, or returns null when not one. */
export async function handlePublicQuotationRoute(ctx) {
  const { method, path, body } = ctx;

  let match = path.match(/^\/public\/quotations\/([^/]+)\/respond$/);
  if (method === 'POST' && match) return handlePublicRespond(ctx, match[1], body);

  match = path.match(/^\/public\/quotations\/([^/]+)\/pdf$/);
  if (method === 'GET' && match) return handlePublicPdf(ctx, match[1]);

  match = path.match(/^\/public\/quotations\/([^/]+)$/);
  if (method === 'GET' && match) return handlePublicView(ctx, match[1]);

  return null;
}
