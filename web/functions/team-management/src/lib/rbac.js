import { Query } from 'node-appwrite';

const ROLES_COLLECTION_ID = 'roles';

/**
 * Server-side mirror of the frontend `hasPermission` check (AuthContext). A
 * role's permission keys live in the `roles` collection (`slug` → `permissions[]`)
 * and are edited from the admin permission matrix. Admins bypass every check.
 *
 * Returns a `can(permissionKey)` predicate for the caller.
 */
export async function loadCallerPermissions(dbs, databaseId, role) {
  if (role === 'admin') return () => true;
  if (!role) return () => false;

  // The roles collection is small; list it the same way the frontend does
  // rather than relying on an index on `slug`.
  const result = await dbs.listDocuments(databaseId, ROLES_COLLECTION_ID, [Query.limit(100)]);
  const roleDoc = result.documents.find((r) => r.slug === role);
  const granted = new Set(roleDoc?.permissions ?? []);
  return (permissionKey) => granted.has(permissionKey);
}

/** Error carrying an HTTP status, turned into a JSON response by the router. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function requirePermission(can, permissionKey) {
  if (!can(permissionKey)) {
    throw new HttpError(403, `Forbidden: "${permissionKey}" permission required`);
  }
}
