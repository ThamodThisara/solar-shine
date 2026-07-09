import { databases, COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { DocumentType } from '@/types/payload-types';

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
  department?: string | null;
}

export async function createDocumentType(input: CreateDocumentTypeInput): Promise<DocumentType> {
  try {
    const response = await databases.createDocument(DATABASE_ID, COLLECTIONS.DOCUMENT_TYPES, ID.unique(), {
      type: input.type.trim(),
      name: input.name.trim(),
      department: input.department ? input.department.trim() : null,
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
      department: input.department ? input.department.trim() : null,
    });
    return response as unknown as DocumentType;
  } catch (error) {
    console.error('Error updating document type:', error);
    throw error;
  }
}
