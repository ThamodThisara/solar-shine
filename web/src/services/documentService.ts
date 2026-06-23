import { databases, storage, COLLECTIONS, DATABASE_ID, DOCUMENTS_BUCKET_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { DocumentRecord, DocumentVisibility, Department } from '@/types/payload-types';
import { getDocumentTypeName, isAllowedFile } from '@/lib/documentTypes';

const PAGE_SIZE = 9;
const RECENT_LIMIT = 6;
const SEARCH_LIMIT = 100;

export interface DocumentListParams {
  page?: number;
  projectId?: string;
  department?: Department | 'all';
  documentType?: string | 'all';
}

export interface DocumentListResult {
  documents: DocumentRecord[];
  total: number;
}

function buildFilterQueries(params: Omit<DocumentListParams, 'page'>) {
  const queries = [];
  if (params.projectId) queries.push(Query.equal('project_id', params.projectId));
  if (params.department && params.department !== 'all') queries.push(Query.equal('department', params.department));
  if (params.documentType && params.documentType !== 'all') queries.push(Query.equal('document_type', params.documentType));
  return queries;
}

export async function fetchDocuments(
  { page = 0, projectId, department, documentType }: DocumentListParams = {}
): Promise<DocumentListResult> {
  try {
    const queries = [
      Query.orderDesc('uploaded_at'),
      Query.limit(PAGE_SIZE),
      Query.offset(page * PAGE_SIZE),
      ...buildFilterQueries({ projectId, department, documentType }),
    ];

    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.DOCUMENTS, queries);

    return {
      documents: response.documents as unknown as DocumentRecord[],
      total: response.total,
    };
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
}

/**
 * Fetches a batch of documents (honouring the active filters) for client-side
 * search. Project name and document name are not indexed for full-text search
 * on the server — and the project name is not even stored on the document —
 * so the matching is performed in the component over this result set.
 */
export async function searchDocuments(
  { projectId, department, documentType }: Omit<DocumentListParams, 'page'> = {}
): Promise<DocumentRecord[]> {
  try {
    const queries = [
      Query.orderDesc('uploaded_at'),
      Query.limit(SEARCH_LIMIT),
      ...buildFilterQueries({ projectId, department, documentType }),
    ];

    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.DOCUMENTS, queries);
    return response.documents as unknown as DocumentRecord[];
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
}

export async function fetchRecentDocuments(): Promise<DocumentRecord[]> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.DOCUMENTS, [
      Query.orderDesc('uploaded_at'),
      Query.limit(RECENT_LIMIT),
    ]);
    return response.documents as unknown as DocumentRecord[];
  } catch (error) {
    console.error('Error fetching recent documents:', error);
    throw error;
  }
}

export interface UploadDocumentInput {
  file: File;
  projectId: string;
  visibility: DocumentVisibility;
  department?: Department;
  documentType: string;
  uploadedBy: string;
}

export async function uploadDocument(input: UploadDocumentInput): Promise<DocumentRecord> {
  if (!isAllowedFile(input.file)) {
    throw new Error('This file format is not supported.');
  }

  const fileId = ID.unique();
  await storage.createFile(DOCUMENTS_BUCKET_ID, fileId, input.file);

  try {
    const now = new Date().toISOString();
    const response = await databases.createDocument(DATABASE_ID, COLLECTIONS.DOCUMENTS, ID.unique(), {
      project_id: input.projectId,
      file_name: input.file.name,
      file_path: `projects/${input.projectId}/${input.documentType}/${input.file.name}`,
      file_id: fileId,
      file_size: input.file.size,
      file_type: input.file.type,
      document_visibility: input.visibility,
      department: input.visibility === 'internal' ? input.department ?? null : null,
      document_type: input.documentType,
      document_type_name: getDocumentTypeName(input.documentType),
      uploaded_by: input.uploadedBy,
      uploaded_at: now,
      updated_at: now,
      status: 'Active',
    });
    return response as unknown as DocumentRecord;
  } catch (error) {
    await storage.deleteFile(DOCUMENTS_BUCKET_ID, fileId).catch(() => {});
    console.error('Error creating document record:', error);
    throw error;
  }
}

export interface UploadDocumentsInput {
  files: File[];
  projectId: string;
  visibility: DocumentVisibility;
  department?: Department;
  documentType: string;
  uploadedBy: string;
}

export interface UploadDocumentsResult {
  succeeded: DocumentRecord[];
  failed: { fileName: string; error: string }[];
}

export async function uploadDocuments(input: UploadDocumentsInput): Promise<UploadDocumentsResult> {
  const succeeded: DocumentRecord[] = [];
  const failed: { fileName: string; error: string }[] = [];

  for (const file of input.files) {
    try {
      const doc = await uploadDocument({
        file,
        projectId: input.projectId,
        visibility: input.visibility,
        department: input.department,
        documentType: input.documentType,
        uploadedBy: input.uploadedBy,
      });
      succeeded.push(doc);
    } catch (error) {
      failed.push({ fileName: file.name, error: error instanceof Error ? error.message : 'Upload failed' });
    }
  }

  return { succeeded, failed };
}

export async function deleteDocumentRecord(id: string, fileId: string): Promise<boolean> {
  try {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.DOCUMENTS, id);
    await storage.deleteFile(DOCUMENTS_BUCKET_ID, fileId).catch((error) => {
      console.warn('Document record deleted, but failed to remove stored file:', error);
    });
    return true;
  } catch (error) {
    console.error('Error deleting document:', error);
    return false;
  }
}

export function getDocumentPreviewUrl(fileId: string): string {
  return storage.getFileView(DOCUMENTS_BUCKET_ID, fileId);
}

export function getDocumentDownloadUrl(fileId: string): string {
  return storage.getFileDownload(DOCUMENTS_BUCKET_ID, fileId);
}

export { PAGE_SIZE as DOCUMENT_PAGE_SIZE };
