import { DocumentRecord } from '@/types/payload-types';
import { getAccessDepartmentForRole } from '@/config/roles';

/**
 * Checks if a specific user is authorized to read/view a given document record
 * based on role, department, and explicit user-level sharing permissions.
 */
export function canUserAccessDocument(
  doc: DocumentRecord,
  userId?: string | null,
  userRole?: string | null
): boolean {
  // 1. Admins have complete visibility of all documents
  if (userRole === 'admin') return true;

  // 2. The uploader always retains access to their own uploads
  if (userId && doc.uploaded_by === userId) return true;

  // 3. Check explicit user sharing permissions
  if (userId && doc.allowed_users && doc.allowed_users.includes(userId)) return true;

  // 4. Map the user's platform role to a capitalized Department enum
  const userDept: string | null = getAccessDepartmentForRole(userRole);

  if (userDept) {
    // Check if the document has been customized
    const isCustomized = doc.updated_at && doc.uploaded_at && doc.updated_at !== doc.uploaded_at;
    
    // If it's internal, never customized, and has no allowed departments or users, allow access to all departments
    if (
      !isCustomized &&
      (!doc.allowed_departments || doc.allowed_departments.length === 0) &&
      (!doc.allowed_users || doc.allowed_users.length === 0) &&
      doc.document_visibility === 'internal'
    ) {
      return true;
    }

    // Check new array-based allowed_departments
    if (doc.allowed_departments && doc.allowed_departments.includes(userDept)) return true;
    
    // Fallback to legacy single department field
    if (doc.department && doc.department.toLowerCase() === userDept.toLowerCase()) return true;
    
    // Internal staff without department access cannot view the document, even if client-facing
    return false;
  }

  // 5. Client-facing documents are visible to all external/authenticated users without department mapping
  if (doc.document_visibility === 'client_facing') return true;

  return false;
}

/**
 * Filter an array of documents to return only those readable by the specified user.
 */
export function filterAccessibleDocuments(
  documents: DocumentRecord[],
  userId?: string | null,
  userRole?: string | null
): DocumentRecord[] {
  if (userRole === 'admin') return documents;
  return documents.filter((doc) => canUserAccessDocument(doc, userId, userRole));
}
