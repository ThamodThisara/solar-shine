import { DocumentFolder, DocumentRecord } from '@/types/payload-types';
import { getAccessDepartmentForRole, getDocumentDepartmentForRole } from '@/config/roles';
import { OWNER_DEPARTMENT } from '@/lib/documentTypes';

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

/** Identity of the current viewer, as needed to resolve folder visibility. */
export interface FolderViewer {
  userId?: string | null;
  role?: string | null;
  /**
   * Slug of the department the user's role belongs to, from the `departments`
   * collection (see `AuthContext.departmentSlug`). Optional — a role mapped in
   * `ROLE_DOCUMENT_DEPARTMENT` still resolves without it.
   */
  departmentSlug?: string | null;
}

/**
 * Every department key that identifies the viewer's department, lowercased.
 *
 * A department is spelled differently across the app's three taxonomies (the
 * `departments` collection slug "engineering", the document-type key "engineer",
 * and the Document `department` value "Engineering"), and a folder stores
 * whichever key the creator picked. Matching against this set means a folder
 * shared with a department resolves regardless of which spelling was saved.
 */
export function getUserDepartmentKeys(viewer: FolderViewer): string[] {
  const keys = new Set<string>();
  if (viewer.departmentSlug) keys.add(viewer.departmentSlug.toLowerCase());

  const typeDept = getDocumentDepartmentForRole(viewer.role);
  if (typeDept) {
    keys.add(typeDept.toLowerCase());
    const accessDept = OWNER_DEPARTMENT[typeDept];
    if (accessDept) keys.add(accessDept.toLowerCase());
  }

  const accessDept = getAccessDepartmentForRole(viewer.role);
  if (accessDept) keys.add(accessDept.toLowerCase());

  return Array.from(keys);
}

/**
 * Whether a user may see a folder and the documents inside it. Folder documents
 * carry no permissions of their own — access is entirely the folder's.
 */
export function canUserAccessFolder(folder: DocumentFolder, viewer: FolderViewer): boolean {
  // Admins see every folder, including other users' personal ones.
  if (viewer.role === 'admin') return true;

  // The owner always keeps access to what they created.
  if (viewer.userId && folder.owner_id === viewer.userId) return true;

  if (folder.folder_type === 'public') return true;
  if (folder.folder_type === 'personal') return false;

  // Dynamic: shared with named users, named departments, or both.
  if (viewer.userId && folder.allowed_users?.includes(viewer.userId)) return true;

  const allowedDepts = (folder.allowed_departments ?? []).map((d) => d.toLowerCase());
  if (allowedDepts.length === 0) return false;
  return getUserDepartmentKeys(viewer).some((key) => allowedDepts.includes(key));
}

/** Filters folders down to the ones the viewer is allowed to see. */
export function filterAccessibleFolders(
  folders: DocumentFolder[],
  viewer: FolderViewer
): DocumentFolder[] {
  if (viewer.role === 'admin') return folders;
  return folders.filter((folder) => canUserAccessFolder(folder, viewer));
}

/**
 * Whether the viewer may rename a folder, change its visibility, upload into it,
 * or delete it. Sharing a folder grants read access only — edits stay with the
 * owner (and admins).
 */
export function canUserManageFolder(folder: DocumentFolder, viewer: FolderViewer): boolean {
  if (viewer.role === 'admin') return true;
  return !!viewer.userId && folder.owner_id === viewer.userId;
}
