import { databases, storage, COLLECTIONS, DATABASE_ID, DOCUMENTS_BUCKET_ID, account } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { DocumentRecord, DocumentVisibility, Department } from '@/types/payload-types';
import { isAllowedFile } from '@/lib/documentTypes';
import { filterAccessibleDocuments } from '@/lib/permissions';

const PAGE_SIZE = 9;
/** Documents listed for a single site visit — far fewer than a page holds. */
const SITE_VISIT_DOCUMENT_LIMIT = 100;
/** Rows pulled per request while scanning the collection client-side. */
const SCAN_BATCH_SIZE = 100;
/**
 * Safety cap on a client-side scan. Access rules for non-admins are evaluated on
 * the client, so paging past the newest rows means walking the collection; this
 * bounds that walk to 20 requests.
 */
const MAX_SCANNED_DOCUMENTS = 2000;

/**
 * Root prefix for project uploads inside the shared `documents` bucket. Folder
 * uploads sit next to it under `Folder Documents/` (see `folderService`).
 */
export const PROJECT_STORAGE_ROOT = 'Project Documents';

export interface DocumentListParams {
  page?: number;
  projectId?: string;
  department?: Department | 'all';
  documentTypeId?: string | string[] | 'all';
  visibility?: string;
  /** When true, omit documents that belong to a site visit (shown separately). */
  excludeSiteVisitDocs?: boolean;
  currentUserId?: string;
  currentUserRole?: string;
}

export interface DocumentListResult {
  documents: DocumentRecord[];
  total: number;
}

function buildFilterQueries(params: Omit<DocumentListParams, 'page'>) {
  const queries = [];
  if (params.projectId) queries.push(Query.equal('project_id', params.projectId));
  if (params.department && params.department !== 'all') queries.push(Query.equal('department', params.department));
  if (params.documentTypeId && params.documentTypeId !== 'all') queries.push(Query.equal('document_type_id', params.documentTypeId));
  if (params.visibility && params.visibility !== 'all') queries.push(Query.equal('document_visibility', params.visibility));
  if (params.excludeSiteVisitDocs) queries.push(Query.isNull('site_visit_id'));
  return queries;
}

/**
 * Walks the documents collection newest-first, honouring `params`' filters, and
 * returns every row the user may see. Used for the non-admin paths: their access
 * is decided per document on the client, so a page of results can't be asked for
 * by offset — the accessible set has to be built first.
 */
async function scanAccessibleDocuments(
  params: Omit<DocumentListParams, 'page'>,
): Promise<DocumentRecord[]> {
  const accessible: DocumentRecord[] = [];
  let scanned = 0;
  let cursor: string | undefined;

  while (scanned < MAX_SCANNED_DOCUMENTS) {
    const queries = [
      Query.orderDesc('uploaded_at'),
      Query.limit(SCAN_BATCH_SIZE),
      ...buildFilterQueries(params),
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.DOCUMENTS, queries);
    const batch = response.documents as unknown as DocumentRecord[];
    if (batch.length === 0) break;

    accessible.push(...filterAccessibleDocuments(batch, params.currentUserId, params.currentUserRole));
    scanned += batch.length;
    if (batch.length < SCAN_BATCH_SIZE) break;
    cursor = batch[batch.length - 1].$id;
  }

  return accessible;
}

export async function fetchDocuments(
  params: DocumentListParams = {}
): Promise<DocumentListResult> {
  const { page = 0, currentUserRole } = params;
  try {
    // Admins see everything, so the server can page for them directly.
    if (currentUserRole === 'admin') {
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.DOCUMENTS, [
        Query.orderDesc('uploaded_at'),
        Query.limit(PAGE_SIZE),
        Query.offset(page * PAGE_SIZE),
        ...buildFilterQueries(params),
      ]);
      return {
        documents: response.documents as unknown as DocumentRecord[],
        total: response.total,
      };
    }

    const accessible = await scanAccessibleDocuments(params);
    return {
      documents: accessible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
      total: accessible.length,
    };
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
}

/**
 * Fetches the documents (honouring the active filters) a user may see, for
 * client-side search. Project name and document name are not indexed for
 * full-text search on the server — and the project name is not even stored on
 * the document — so the matching is performed in the component over this result
 * set. Scanning the collection rather than only its newest page means older
 * documents stay findable.
 */
export async function searchDocuments(
  params: Omit<DocumentListParams, 'page'> = {}
): Promise<DocumentRecord[]> {
  try {
    return await scanAccessibleDocuments(params);
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
}

/** Fetches every document linked to a specific site visit. */
export async function fetchDocumentsBySiteVisit(siteVisitId: string, userId?: string, userRole?: string): Promise<DocumentRecord[]> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.DOCUMENTS, [
      Query.equal('site_visit_id', siteVisitId),
      Query.orderDesc('uploaded_at'),
      Query.limit(SITE_VISIT_DOCUMENT_LIMIT),
    ]);
    const docs = response.documents as unknown as DocumentRecord[];
    return filterAccessibleDocuments(docs, userId, userRole);
  } catch (error) {
    console.error('Error fetching site visit documents:', error);
    throw error;
  }
}

export interface UploadDocumentInput {
  file: File;
  projectId: string;
  visibility: DocumentVisibility;
  department?: Department;
  documentTypeId: string;
  uploadedBy: string;
  /** When set, links the document to a site visit (still stored under the project). */
  siteVisitId?: string;
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
      file_path: input.siteVisitId
        ? `${PROJECT_STORAGE_ROOT}/${input.projectId}/site-visits/${input.siteVisitId}/${input.file.name}`
        : `${PROJECT_STORAGE_ROOT}/${input.projectId}/${input.documentTypeId}/${input.file.name}`,
      file_id: fileId,
      file_size: input.file.size,
      file_type: input.file.type,
      document_visibility: input.visibility,
      department: input.visibility === 'internal' ? input.department ?? null : null,
      allowed_departments: input.visibility === 'internal' && input.department ? [input.department] : [],
      allowed_users: [],
      document_type_id: input.documentTypeId,
      site_visit_id: input.siteVisitId ?? null,
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
  documentTypeId: string;
  uploadedBy: string;
  /** When set, links every uploaded document to a site visit. */
  siteVisitId?: string;
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
        documentTypeId: input.documentTypeId,
        uploadedBy: input.uploadedBy,
        siteVisitId: input.siteVisitId,
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

export async function getAuthenticatedFileBlob(fileId: string, isDownload = false): Promise<string> {
  const url = isDownload 
    ? storage.getFileDownload(DOCUMENTS_BUCKET_ID, fileId)
    : storage.getFileView(DOCUMENTS_BUCKET_ID, fileId);

  try {
    const jwtResponse = await account.createJWT();
    const jwt = jwtResponse.jwt;

    const response = await fetch(url, {
      headers: {
        'X-Appwrite-Project': import.meta.env.VITE_APPWRITE_PROJECT_ID,
        'X-Appwrite-JWT': jwt
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error fetching authenticated file:', error);
    // Fallback to direct URL if anything fails
    return url;
  }
}

export async function updateDocumentPermissions(
  documentId: string,
  allowedDepartments: string[],
  allowedUsers: string[]
): Promise<DocumentRecord> {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.DOCUMENTS,
      documentId,
      {
        allowed_departments: allowedDepartments,
        allowed_users: allowedUsers,
        updated_at: new Date().toISOString()
      }
    );
    return response as unknown as DocumentRecord;
  } catch (error) {
    console.error('Error updating document permissions:', error);
    throw error;
  }
}

export { PAGE_SIZE as DOCUMENT_PAGE_SIZE };
