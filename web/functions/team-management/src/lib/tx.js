/**
 * Transaction helpers for the TablesDB API. Sprint 1 validation (docs/appwrite-only-phase1.md)
 * established what these can rely on:
 *   - commit/rollback are atomic;
 *   - there is NO conflict detection between transactions (last write wins), so
 *     "exactly one wins" flows must put a unique index / deterministic row id
 *     inside the transaction and treat a 409 at commit as "someone else won";
 *   - a decrement below `min` is accepted when staged but fails at commit.
 */

/**
 * Runs `work(transactionId)` inside one transaction and commits it. Any error —
 * from staging or from the commit itself — rolls the transaction back and is
 * rethrown for the caller to classify (see `isUniqueViolation`, `isLimitExceeded`).
 */
export async function runTransaction(tdb, work, { ttl = 60 } = {}) {
  const tx = await tdb.createTransaction(ttl);
  try {
    const result = await work(tx.$id);
    await tdb.updateTransaction(tx.$id, true);
    return result;
  } catch (e) {
    try {
      await tdb.updateTransaction(tx.$id, false, true);
    } catch {
      // Already rolled back/expired — nothing to undo.
    }
    throw e;
  }
}

/** A unique index / duplicate row id was hit (e.g. a concurrent request won). */
export function isUniqueViolation(e) {
  return e?.code === 409 || /unique|already exists/i.test(e?.type ?? '');
}

/** An atomic increment/decrement was refused for crossing its min/max bound. */
export function isLimitExceeded(e) {
  return /limit_exceeded/i.test(e?.type ?? '');
}
