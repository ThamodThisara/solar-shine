import { databases, storage, COLLECTIONS, DATABASE_ID, DOCUMENTS_BUCKET_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { DocumentFolder, FolderDocument, FolderPin, FolderType } from '@/types/payload-types';
import { isAllowedFile } from '@/lib/documentTypes';
import { FolderViewer, filterAccessibleFolders } from '@/lib/permissions';

/** Documents per page inside a folder. */
const FOLDER_DOCUMENT_PAGE_SIZE = 9;

/**
 * Upper bound on the folders fetched in one go. Visibility is resolved on the
 * client (the collection is readable by any authenticated user, as the documents
 * collection is), so the whole accessible set has to be in hand before it can be
 * ordered pinned-first and paged.
 */
const FOLDER_FETCH_LIMIT = 500;

/** Root prefix for folder uploads inside the shared `documents` bucket. */
export const FOLDER_STORAGE_ROOT = 'Folder Documents';

/** Storage path recorded for a document filed inside a folder. */
export function buildFolderFilePath(folderName: string, fileName: string): string {
  return `${FOLDER_STORAGE_ROOT}/${folderName}/${fileName}`;
}

export async function fetchFolders(): Promise<DocumentFolder[]> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.DOCUMENT_FOLDERS, [
      Query.orderDesc('created_at'),
      Query.limit(FOLDER_FETCH_LIMIT),
    ]);
    return response.documents as unknown as DocumentFolder[];
  } catch (error) {
    console.error('Error fetching folders:', error);
    throw error;
  }
}

/** Every folder the given viewer is allowed to see, newest first. */
export async function fetchAccessibleFolders(viewer: FolderViewer): Promise<DocumentFolder[]> {
  const folders = await fetchFolders();
  return filterAccessibleFolders(folders, viewer);
}

export async function fetchFolder(folderId: string): Promise<DocumentFolder> {
  const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.DOCUMENT_FOLDERS, folderId);
  return doc as unknown as DocumentFolder;
}

export interface FolderInput {
  name: string;
  description?: string;
  folderType: FolderType;
  /** Departments granted access. Ignored unless `folderType` is `dynamic`. */
  allowedDepartments?: string[];
  /** Users granted access. Ignored unless `folderType` is `dynamic`. */
  allowedUsers?: string[];
}

/**
 * Personal and public folders derive their audience from the type alone, so any
 * department/user selection left over from a type switch is dropped rather than
 * silently kept — it would come back into effect if the type changed again.
 */
function sharingFields(input: FolderInput) {
  const isDynamic = input.folderType === 'dynamic';
  return {
    allowed_departments: isDynamic ? input.allowedDepartments ?? [] : [],
    allowed_users: isDynamic ? input.allowedUsers ?? [] : [],
  };
}

export async function createFolder(input: FolderInput, ownerId: string): Promise<DocumentFolder> {
  try {
    const now = new Date().toISOString();
    const doc = await databases.createDocument(DATABASE_ID, COLLECTIONS.DOCUMENT_FOLDERS, ID.unique(), {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      folder_type: input.folderType,
      owner_id: ownerId,
      ...sharingFields(input),
      created_at: now,
      updated_at: now,
      status: 'Active',
    });
    return doc as unknown as DocumentFolder;
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
}

export async function updateFolder(folderId: string, input: FolderInput): Promise<DocumentFolder> {
  try {
    const doc = await databases.updateDocument(DATABASE_ID, COLLECTIONS.DOCUMENT_FOLDERS, folderId, {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      folder_type: input.folderType,
      ...sharingFields(input),
      updated_at: new Date().toISOString(),
    });
    return doc as unknown as DocumentFolder;
  } catch (error) {
    console.error('Error updating folder:', error);
    throw error;
  }
}

/**
 * Deletes a folder along with everything filed inside it — records, stored
 * files, and any pins pointing at it.
 */
export async function deleteFolder(folderId: string): Promise<boolean> {
  try {
    const documents = await fetchAllFolderDocuments(folderId);
    for (const doc of documents) {
      await deleteFolderDocument(doc.$id, doc.file_id);
    }

    const pins = await databases.listDocuments(DATABASE_ID, COLLECTIONS.FOLDER_PINS, [
      Query.equal('folder_id', folderId),
      Query.limit(FOLDER_FETCH_LIMIT),
    ]);
    for (const pin of pins.documents) {
      await databases
        .deleteDocument(DATABASE_ID, COLLECTIONS.FOLDER_PINS, pin.$id)
        .catch(() => {});
    }

    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.DOCUMENT_FOLDERS, folderId);
    return true;
  } catch (error) {
    console.error('Error deleting folder:', error);
    throw error;
  }
}

export interface FolderDocumentListResult {
  documents: FolderDocument[];
  total: number;
}

/** One page of a folder's documents, newest upload first. */
export async function fetchFolderDocuments(
  folderId: string,
  page = 0,
  search = '',
): Promise<FolderDocumentListResult> {
  try {
    // Searching has to scan the folder: `file_name` has no fulltext index, so
    // `Query.search` is unavailable and matching happens here instead.
    if (search.trim()) {
      const all = await fetchAllFolderDocuments(folderId);
      const query = search.trim().toLowerCase();
      const matched = all.filter((doc) => doc.file_name.toLowerCase().includes(query));
      return {
        documents: matched.slice(page * FOLDER_DOCUMENT_PAGE_SIZE, (page + 1) * FOLDER_DOCUMENT_PAGE_SIZE),
        total: matched.length,
      };
    }

    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.FOLDER_DOCUMENTS, [
      Query.equal('folder_id', folderId),
      Query.orderDesc('uploaded_at'),
      Query.limit(FOLDER_DOCUMENT_PAGE_SIZE),
      Query.offset(page * FOLDER_DOCUMENT_PAGE_SIZE),
    ]);
    return {
      documents: response.documents as unknown as FolderDocument[],
      total: response.total,
    };
  } catch (error) {
    console.error('Error fetching folder documents:', error);
    throw error;
  }
}

/** Every document in a folder, paging through the collection until exhausted. */
async function fetchAllFolderDocuments(folderId: string): Promise<FolderDocument[]> {
  const collected: FolderDocument[] = [];
  let cursor: string | undefined;

  for (;;) {
    const queries = [
      Query.equal('folder_id', folderId),
      Query.orderDesc('uploaded_at'),
      Query.limit(100),
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.FOLDER_DOCUMENTS, queries);
    const batch = response.documents as unknown as FolderDocument[];
    collected.push(...batch);
    if (batch.length < 100) break;
    cursor = batch[batch.length - 1].$id;
  }

  return collected;
}

/**
 * Number of documents in each of the given folders, keyed by folder id. Counts
 * come from each query's `total`, so they stay exact no matter how large a
 * folder grows — call it with the folders on screen rather than every folder.
 */
export async function fetchFolderDocumentCounts(folderIds: string[]): Promise<Record<string, number>> {
  if (folderIds.length === 0) return {};
  try {
    const entries = await Promise.all(
      folderIds.map(async (folderId) => {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.FOLDER_DOCUMENTS, [
          Query.equal('folder_id', folderId),
          Query.limit(1),
        ]);
        return [folderId, response.total] as const;
      }),
    );
    return Object.fromEntries(entries);
  } catch (error) {
    console.warn('Failed to load folder document counts:', error);
    return {};
  }
}

export interface UploadFolderDocumentsInput {
  files: File[];
  folderId: string;
  /** Used to build the storage path; the bucket is shared with project documents. */
  folderName: string;
  uploadedBy: string;
}

export interface UploadFolderDocumentsResult {
  succeeded: FolderDocument[];
  failed: { fileName: string; error: string }[];
}

async function uploadFolderDocument(
  file: File,
  input: Omit<UploadFolderDocumentsInput, 'files'>,
): Promise<FolderDocument> {
  if (!isAllowedFile(file)) {
    throw new Error('This file format is not supported.');
  }

  const fileId = ID.unique();
  await storage.createFile(DOCUMENTS_BUCKET_ID, fileId, file);

  try {
    const now = new Date().toISOString();
    const doc = await databases.createDocument(DATABASE_ID, COLLECTIONS.FOLDER_DOCUMENTS, ID.unique(), {
      folder_id: input.folderId,
      file_name: file.name,
      file_path: buildFolderFilePath(input.folderName, file.name),
      file_id: fileId,
      file_size: file.size,
      file_type: file.type,
      uploaded_by: input.uploadedBy,
      uploaded_at: now,
      updated_at: now,
      status: 'Active',
    });
    return doc as unknown as FolderDocument;
  } catch (error) {
    await storage.deleteFile(DOCUMENTS_BUCKET_ID, fileId).catch(() => {});
    console.error('Error creating folder document record:', error);
    throw error;
  }
}

export async function uploadFolderDocuments(
  input: UploadFolderDocumentsInput,
): Promise<UploadFolderDocumentsResult> {
  const succeeded: FolderDocument[] = [];
  const failed: { fileName: string; error: string }[] = [];

  for (const file of input.files) {
    try {
      succeeded.push(await uploadFolderDocument(file, input));
    } catch (error) {
      failed.push({ fileName: file.name, error: error instanceof Error ? error.message : 'Upload failed' });
    }
  }

  return { succeeded, failed };
}

export async function deleteFolderDocument(id: string, fileId: string): Promise<boolean> {
  try {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.FOLDER_DOCUMENTS, id);
    await storage.deleteFile(DOCUMENTS_BUCKET_ID, fileId).catch((error) => {
      console.warn('Folder document deleted, but failed to remove stored file:', error);
    });
    return true;
  } catch (error) {
    console.error('Error deleting folder document:', error);
    return false;
  }
}

/** The folder ids the given user has pinned. */
export async function fetchPinnedFolderIds(userId?: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.FOLDER_PINS, [
      Query.equal('user_id', userId),
      Query.limit(FOLDER_FETCH_LIMIT),
    ]);
    return (response.documents as unknown as FolderPin[]).map((pin) => pin.folder_id);
  } catch (error) {
    console.warn('Failed to load pinned folders:', error);
    return [];
  }
}

/** Pins or unpins a folder for one user; pins are private to that user. */
export async function setFolderPinned(
  folderId: string,
  userId: string,
  pinned: boolean,
): Promise<boolean> {
  try {
    const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.FOLDER_PINS, [
      Query.equal('folder_id', folderId),
      Query.equal('user_id', userId),
      Query.limit(FOLDER_FETCH_LIMIT),
    ]);

    if (pinned) {
      if (existing.total === 0) {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.FOLDER_PINS, ID.unique(), {
          folder_id: folderId,
          user_id: userId,
          pinned_at: new Date().toISOString(),
        });
      }
      return true;
    }

    // Unpinning clears every row, so a duplicate written by a racing pin can't
    // leave the folder stuck at the top.
    for (const pin of existing.documents) {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.FOLDER_PINS, pin.$id);
    }
    return true;
  } catch (error) {
    console.error('Error updating folder pin:', error);
    throw error;
  }
}

export { FOLDER_DOCUMENT_PAGE_SIZE };
