# Appwrite-only Phase 1 — Leads, Inventory, Quotations

Implements audit v2.2 ("Solar Shine — Final Revised Audit"), with the adjustments
below. Branch: `feature/appwrite-only-phase1`. Sprint 1 (leads) is deployed and
validated; **Sprint 2 (inventory + quotations) is built but not yet deployed** — see
"Sprint 2" at the end for its deployment steps.

## Adjustments to the audit plan

| Audit v2.2 | Adjustment | Why |
|---|---|---|
| Phase 0–2: delete `erpnextClient.js` / `erpnextProxy.ts`, remove `erpnext_*` fields | Already done. No references remained in `src/`, the function, or `appwrite.json`. The two files were only staged leftovers and have been unstaged. | Verified with grep |
| Phase 3: push to "staging" | **There is no staging project.** `685bcfb7001103824569` is production. Schema pushes must be additive-only, and the function deploy is shared with live users. | Single Appwrite project |
| Task 2: update Appwrite CLI v22 → v28 | Skipped. | Transactions run in the function SDK (node-appwrite 26.2 already supports them), not the CLI. A major CLI jump risks the attribute-recreate/data-loss pitfalls. |
| Risk 3: "split the function if it grows" | Split now. New code lives in `src/lib/` (rbac, validate, codes, mailer) and `src/routes/leads.js`. | `main.js` was already 916 lines |
| Task 6: lead convert needs a transaction-style design | Lead → client conversion is idempotent **without** a transaction: a deterministic client id (`ld<leadId>`) plus a `converted_client_id` check. | Keeps leads independent of the Sprint 1 transaction gate |
| Task 3: permission keys for leads, quotations, inventory | Only `leads:*` keys added now. Quotation/inventory keys ship with their UI in Sprint 2. | Keys with no UI would show up in the admin matrix and do nothing |
| Task 6 "list" route | Listing is a direct DB read (`read("users")`), as §1 states. There is no list Function route. | §1 and the task table disagreed |
| §2 V1–V5 | Added **V6**: a unique index on a nullable attribute must accept many nulls. | `projects.quotation_id` gets a unique index (the hard guarantee against duplicate project conversion) |

## What is implemented

**Schema (`appwrite.json`)**
- New collections, all `read("users")` only: `leads`, `products`, `quotations`, `quotation_items`, `stock_movements`.
- `projects.quotation_id` plus a unique index.
- Function scopes: added `databases.read`, `collections.read`, `documents.read`, `documents.write`.

**Function (`functions/team-management`)**

| Method | Path | Auth | Permission |
|---|---|---|---|
| POST | `/leads/create` | Session | `leads:create` |
| PUT | `/leads/:id` | Session | `leads:edit` |
| POST | `/leads/:id/convert` | Session | `leads:convert` |
| POST | `/public/leads` | Public | — (honeypot, validation, 10-min per-email dedupe) |

RBAC (`lib/rbac.js`) mirrors the frontend `hasPermission`: admin bypasses every check, and other roles resolve `prefs.role` → `roles.permissions[]`.
Lead codes are `LD-YYYY-####`, backed by a unique index with retry-on-409 (`lib/codes.js`, shared with project codes).
Optional env var **`LEADS_NOTIFY_EMAIL`**: staff address emailed on each website lead. Notification is skipped when unset.

**Frontend**
- `Leads` tab in the dashboard and sidebar, gated by `leads:view`: pipeline stats, search and filters, a create/edit dialog, and convert-to-client (new or existing client).
- The contact form records a lead first. It falls back to the old EmailJS/mailto flow only if lead capture fails.
- Default grants: `sales_manager` gets all `leads:*`; `marketing_manager` gets `leads:view` and `leads:create`.

## Deployment checklist (manual, in order)

1. **Backup.** In the Appwrite Console → Backups, confirm a backup from the last 24 h. Note document counts for `clients` and `projects`.
2. **Schema:** run `npm run push-collections` and **read the change table.**
   - Expected: 5 collections *adding*, plus the `projects.quotation_id` attribute and index *adding*.
   - Any *recreating* or *deleting* on an existing collection means **answer NO** and investigate first.
   - The live project may still have `erpnext_*` attributes that `appwrite.json` doesn't list; if so they show as deletions. Decide on those explicitly.
3. **Grant permissions.** Existing role documents do **not** pick up the new defaults automatically. In *Roles & Permissions*, enable the *Lead Management* keys for Sales/Marketing (or as wanted).
4. **Function:** optionally set `LEADS_NOTIFY_EMAIL`, then deploy (`appwrite push functions`). Smoke-test the existing routes (`/users`, `/projects/next-id`), then a lead create, update, and convert, then a contact-form submission from a logged-out browser.
5. **Sprint 1 validation:** run `APPWRITE_API_KEY=<key> npm run validate-appwrite` and record the output.
   - It uses a temporary collection and deletes it afterwards.
   - The key needs databases/collections/attributes/indexes/documents read+write scopes.
   - Apply the audit §2 decision gate. **Do not start Sprint 2 until it passes.**

## Sprint 1 validation results (2026-10-26, Appwrite Cloud fra, TablesDB API)

| # | Check | Result | Detail to code against |
|---|---|---|---|
| V1 | Transaction commit + rollback | ✅ Pass | Committed row exists, rolled-back row does not |
| V2 | Transaction conflict detection | ❌ **No conflict detection** | T1 committed over T2's change: **last write wins**. Transactions are atomic, but there is no optimistic locking. |
| V3 | Atomic decrement below `min` | ✅ Pass | `400 column_limit_exceeded`, stock unchanged |
| V4 | Atomic decrement within bounds | ✅ Pass | 3 → 1 |
| V5 | Staged decrement below `min` | ✅ Pass | Staging is accepted; **commit** fails with `400 attribute_limit_exceeded`, stock unchanged |
| V6 | Unique index on nullable column | ✅ Pass | Many nulls accepted; duplicate gives `409 row_unique_constraint_violation` |

**Decision gate:** proceed to Sprint 2 with an adjusted design. Transactions are available and `min` is enforced, so neither STOP condition applies. The V2 result means **a transaction cannot be used to detect concurrent requests**. Every "exactly one wins" flow needs a uniqueness guard *inside* the transaction, so that the loser's commit fails with 409:

- **Quotation → project (C3, C6):** already covered. The project row is created inside the transaction, and the `projects.quotation_id` unique index (V6) rejects the second commit. Recovery then re-reads the quotation and returns the winner's project.
- **Customer response (C4):** needs a guard. Inside the respond transaction, create a row with a deterministic `$id` (e.g. a `quotation_responses` row with `$id = quotationId`). A second response then fails with 409 at commit. *(Adds one small table; ~0.5 day.)*
- **Stock deduction (C1):** no change. `decrementRowColumn(..., min: 0)` is atomic per row.
- **Error handling:** treat both `column_limit_exceeded` (direct call) and `attribute_limit_exceeded` (at commit) as "insufficient stock"; treat `row_unique_constraint_violation` (409) as "already done / concurrent request".
- **Function API:** current Console API keys expose `tables/rows` scopes, not `documents`. Sprint 2 routes should use `TablesDB` (the validated API), and existing routes can migrate gradually.

## Corrections carried into Sprint 2 (all implemented — see Sprint 2 below)

- **Conversion vs. project codes (§4).** A 409 at commit can come from the `project_code` unique index, not only from a concurrent conversion. Regenerate the code and retry before reporting a conflict. Reuse `createWithSequentialCode` logic.
- **Orphaned `converted_project_id` (§4, step 2).** "Clearing the field to allow re-conversion" can't work, because the status is already `converted`. Return 409 for manual review instead.
- **Duplicate projects.** The `projects.quotation_id` unique index (V6) is the *only* guarantee: V2 showed there is no transaction conflict detection to fall back on.
- **Stock ledger.** "Sum of movements = `current_stock`" (§3) only holds if initial stock is written as an `opening` movement. Product create must do that, and `PUT /products/:id` must reject `current_stock`.
- **Customer review token.** Store only a SHA-256 hash (`review_token_hash`) with `review_token_expires_at`. Never store the raw token.

## Known risks (pre-existing, not introduced here)

- **The `roles` collection is writable by any authenticated user.** A user could edit their own role's `permissions` through the API and pass the server RBAC check. Recommended follow-up: make `roles`/`departments` `read("users")` and move matrix writes behind the function, as was done for leads.
- `read("users")` lets any signed-in staff member read all leads through the API. The UI enforces `leads:view`, but the database does not.
- Existing email templates in `main.js` interpolate user names without HTML escaping. New code uses `escapeHtml` (`lib/mailer.js`).

## Sprint 2 — Inventory and Quotations

Built after the Sprint 1 validation gate passed. 47 automated tests cover the backend
(`cd functions/team-management && npm test`), including audit cases C1–C4 and C6.

### What was added

| Method | Path | Permission |
|---|---|---|
| POST | `/products/create` | `inventory:manage` |
| PUT / DELETE | `/products/:id` (DELETE is a soft delete) | `inventory:manage` |
| POST | `/products/:id/stock` (receive / consume / adjust) | `inventory:manage` |
| POST | `/quotations/create` | `quotations:create` |
| PUT / DELETE | `/quotations/:id` (draft or rejected only) | `quotations:edit` |
| POST | `/quotations/:id/submit` | `quotations:edit` |
| POST | `/quotations/:id/approve`, `/reject` | `quotations:approve` |
| POST | `/quotations/:id/send` | `quotations:send` |
| POST | `/quotations/:id/convert` | `quotations:convert` |
| GET | `/quotations/:id/pdf` | `quotations:view` |
| GET / POST | `/public/quotations/:token`, `/pdf`, `/respond` | none — the review token is the credential |

Lifecycle: `draft → pending_approval → approved → sent → accepted → converted`; a rejected
quotation returns to draft when edited, and a customer can also decline.

Frontend: **Inventory** and **Quotations** tabs, a public page at `/quotation/review/:token`,
and a "Create quotation" shortcut on each open lead.

### Design decisions

- **Concurrency follows the V2 result** (no transaction conflict detection): every "only one wins" step has its own unique guard inside the transaction — `projects.quotation_id` for conversion, a `quotation_responses` row whose id is the quotation id for the customer response, and unique code indexes with retry for numbering.
- **Conversion** re-reads the quotation after any failed commit, so a commit that succeeded but timed out returns the project instead of a duplicate. A 409 with no project means the *project code* collided, so the code is regenerated rather than reported as a conflict (audit §4 corrections).
- **Stock** only changes through `/stock`, in one transaction with its ledger row. `balance_after` is deliberately not written: a transaction can't read the post-commit value, and a guessed number would mislead.
- **Customer links** store only a SHA-256 hash; re-sending issues a new link and disables the old one; responding revokes the link. Links expire at the quotation's valid-until date (or 30 days).
- **Totals are computed server-side** from the line items; line discounts are currency amounts; tax is one rate per quotation.
- **PDF** is generated on demand (jspdf) and returned as base64, not stored. `quotations.pdf_file_id` is therefore unused.
- **New routes use the TablesDB API** (the one the validation exercised, and the `rows.*` scopes current API keys offer). Leads still use the legacy API; both coexist.
- Default role grants: sales manager quotes end to end except approval; finance manager approves; engineers can view stock; engineering manager manages stock.

### Deployment checklist

1. **Schema:** `npm run push-collections` and read the change table. Expect only *adding*: `quotation_responses` (new) and `quotations.tax_rate`. Select **Quotations** and **Quotation Responses**.
2. **Function:** `appwrite push functions`. The function gains the `rows.read`/`rows.write` scopes and the `jspdf` dependency (installed by the build). If you removed the `APPWRITE_FUNCTION_API_KEY` variable earlier, the automatic key already carries the new scopes; if you re-added a custom key, give it `rows.read` and `rows.write` too.
3. **Optional env var `PUBLIC_SITE_URL`** (default `https://solarmaps.lk`): the base of the customer review links. Set it if the site lives elsewhere.
4. **Permissions:** existing roles don't pick up new defaults. In *Roles & Permissions*, enable the **Quotations** and **Inventory** keys for the roles that need them.
5. **Smoke test, in order:** add a product with opening stock → record a stock entry → create a quotation from a lead → submit → approve → send (copy the link) → open the link in a private window and accept → convert to a project. Confirm the project appears in Project Execution.

### Known limitations

- The quotation PDF layout has not been checked by eye here (no PDF renderer available). Open one from the app and review it.
- The UI was type-checked, linted, and built, but not exercised in a browser against live data.
- `nodemailer` 6.x in the function has high-severity `npm audit` advisories. This predates Sprint 2; the fix is a major-version upgrade that should be tested on its own.
- Stock is not deducted automatically when a quotation converts; stock is recorded manually via stock entries.
- `quotation_items` are capped at 40 per quotation so an edit fits in one transaction.
