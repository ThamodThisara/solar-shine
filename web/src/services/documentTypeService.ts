import { databases, COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { DocumentType } from '@/types/payload-types';
import { ALL_DEPARTMENTS } from '@/lib/documentTypes';

// The department taxonomy and its pure helpers live in `@/lib/documentTypes` so
// modules that must not pull in the Appwrite client can use them; re-exported
// here for the many callers that already import them from this module.
export {
  ACCESS_DEPARTMENTS,
  ALL_DEPARTMENTS,
  DOCUMENT_TYPE_DEPARTMENTS,
  OWNER_DEPARTMENT,
  getTypeDepartments,
  typeServesDepartment,
  getTypeOwnerDepartment,
  getTypeAccessDepartments,
  getTypeGroupLabel,
} from '@/lib/documentTypes';

/**
 * Fetches every document type, ordered by name. The result drives the upload /
 * filter dropdowns and the management list — there is no hardcoded fallback, the
 * system relies entirely on the records stored in the `document_types` table.
 */
export async function fetchDocumentTypes(): Promise<DocumentType[]> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.DOCUMENT_TYPES, [
      Query.orderAsc('name'),
      Query.limit(200),
    ]);
    return response.documents as unknown as DocumentType[];
  } catch (error) {
    console.error('Error fetching document types:', error);
    throw error;
  }
}

export interface CreateDocumentTypeInput {
  type: string;
  name: string;
  departments: string[];
}

/**
 * `department` is written as null so the deprecated scalar can never contradict
 * `departments`; `getTypeDepartments` ignores it once `departments` is set.
 */
function departmentFields(input: CreateDocumentTypeInput) {
  const departments = input.departments.map((d) => d.trim()).filter(Boolean);
  return {
    departments: departments.length ? departments : [ALL_DEPARTMENTS],
    department: null,
  };
}

export async function createDocumentType(input: CreateDocumentTypeInput): Promise<DocumentType> {
  try {
    const response = await databases.createDocument(DATABASE_ID, COLLECTIONS.DOCUMENT_TYPES, ID.unique(), {
      type: input.type.trim(),
      name: input.name.trim(),
      ...departmentFields(input),
    });
    return response as unknown as DocumentType;
  } catch (error) {
    console.error('Error creating document type:', error);
    throw error;
  }
}

export async function deleteDocumentType(id: string): Promise<boolean> {
  try {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.DOCUMENT_TYPES, id);
    return true;
  } catch (error) {
    console.error('Error deleting document type:', error);
    throw error;
  }
}

export async function updateDocumentType(id: string, input: CreateDocumentTypeInput): Promise<DocumentType> {
  try {
    const response = await databases.updateDocument(DATABASE_ID, COLLECTIONS.DOCUMENT_TYPES, id, {
      type: input.type.trim(),
      name: input.name.trim(),
      ...departmentFields(input),
    });
    return response as unknown as DocumentType;
  } catch (error) {
    console.error('Error updating document type:', error);
    throw error;
  }
}
