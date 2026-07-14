import { DocumentRecord } from '@/types/payload-types';

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

  // 2. Client-facing documents are publicly visible to all authenticated users
  if (doc.document_visibility === 'client_facing') return true;

  // 3. The uploader always retains access to their own uploads
  if (userId && doc.uploaded_by === userId) return true;

  // 4. Check explicit user sharing permissions
  if (userId && doc.allowed_users && doc.allowed_users.includes(userId)) {
    return true;
  }

  // 5. Map the user's platform role to a capitalized Department enum
  let userDept: string | null = null;
  if (userRole === 'sales_manager') {
    userDept = 'Sales';
  } else if (userRole === 'hr') {
    userDept = 'HR';
  } else if (userRole === 'project_engineer' || userRole === 'planning_engineer') {
    userDept = 'Engineering';
  }

  if (userDept) {
    // Check new array-based allowed_departments
    if (doc.allowed_departments && doc.allowed_departments.includes(userDept)) {
      return true;
    }
    // Fallback to legacy single department field
    if (doc.department && doc.department.toLowerCase() === userDept.toLowerCase()) {
      return true;
    }
  }

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
