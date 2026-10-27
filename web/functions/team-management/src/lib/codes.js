import { Query } from 'node-appwrite';

/**
 * Computes the next sequential code for `base` (e.g. `"LD-2026-"` →
 * `"LD-2026-0001"`). Sequences are zero-padded to 4 digits, so lexicographic
 * ordering matches numeric ordering and `orderDesc` + `limit(1)` yields the
 * highest existing code.
 *
 * This is a read-then-write: callers must back the field with a unique index
 * and retry on a 409 (see `createWithSequentialCode`).
 */
export async function computeNextSequentialCode(dbs, databaseId, collectionId, field, base) {
  const queries = [Query.startsWith(field, base), Query.orderDesc(field), Query.limit(1)];
  // Accepts either the legacy Databases client or the TablesDB client.
  const existing = typeof dbs.listRows === 'function'
    ? { documents: (await dbs.listRows(databaseId, collectionId, queries)).rows }
    : await dbs.listDocuments(databaseId, collectionId, queries);

  let seq = 1;
  if (existing.documents.length > 0) {
    const last = existing.documents[0][field] || '';
    const parsed = parseInt(last.slice(base.length), 10);
    if (!Number.isNaN(parsed)) seq = parsed + 1;
  }

  if (seq > 9999) {
    throw new Error(`Sequence limit reached for ${base} (max 9999).`);
  }

  return `${base}${String(seq).padStart(4, '0')}`;
}

/**
 * Creates a document whose `field` holds the next sequential code. The unique
 * index on `field` rejects a code taken by a concurrent create (409); on
 * conflict we regenerate and retry.
 */
export async function createWithSequentialCode(dbs, databaseId, collectionId, field, base, buildData, documentId) {
  const MAX_ATTEMPTS = 5;
  let lastError;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = await computeNextSequentialCode(dbs, databaseId, collectionId, field, base);
    try {
      return await dbs.createDocument(databaseId, collectionId, documentId(), {
        ...buildData(code),
        [field]: code,
      });
    } catch (e) {
      if (e.code === 409) {
        lastError = e;
        continue;
      }
      throw e;
    }
  }
  const err = new Error(`Could not allocate a unique ${field} after ${MAX_ATTEMPTS} attempts: ${lastError?.message}`);
  err.status = 409;
  throw err;
}
