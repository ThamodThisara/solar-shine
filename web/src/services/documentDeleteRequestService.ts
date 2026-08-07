import { databases, COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import {
  DocumentDeleteRequest,
  DocumentFolder,
  FolderDocument,
} from '@/types/payload-types';
import { deleteFolderDocument } from '@/services/folderService';

const REQUEST_FETCH_LIMIT = 200;

/** Matches the `reason` attribute, and the notification `content` it feeds. */
export const DELETE_REQUEST_REASON_MAX_LENGTH = 1000;

/** Keeps composed notification text inside the `content` attribute's size. */
function fitNotificationContent(content: string): string {
  const max = 1000;
  return content.length <= max ? content : `${content.slice(0, max - 1)}…`;
}

/** Where a notification about a folder request should take the recipient. */
function folderLink(folderId: string): string {
  return `/dashboard?tab=document-center&folder=${folderId}`;
}

/**
 * Notifications are ordinary documents in a collection any authenticated user
 * may write to, which is how the rest of the app raises them client-side. A
 * failure here must not fail the request itself, so it is logged and swallowed.
 */
async function notify(userId: string, title: string, content: string, link: string): Promise<void> {
  try {
    await databases.createDocument(DATABASE_ID, COLLECTIONS.NOTIFICATIONS, ID.unique(), {
      user_id: userId,
      title,
      content: fitNotificationContent(content),
      read: false,
      link,
    });
  } catch (error) {
    console.warn('Failed to create notification:', error);
  }
}

/** Requests raised against a folder, newest first. */
export async function fetchDeleteRequests(
  folderId: string,
  status?: DocumentDeleteRequest['status'],
): Promise<DocumentDeleteRequest[]> {
  try {
    const queries = [
      Query.equal('folder_id', folderId),
      Query.orderDesc('created_at'),
      Query.limit(REQUEST_FETCH_LIMIT),
    ];
    if (status) queries.push(Query.equal('status', status));

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.DOCUMENT_DELETE_REQUESTS,
      queries,
    );
    return response.documents as unknown as DocumentDeleteRequest[];
  } catch (error) {
    console.error('Error fetching delete requests:', error);
    throw error;
  }
}

/**
 * Pending requests per folder, keyed by folder id — drives the badge on a
 * folder card. Only worth calling for folders the viewer owns.
 */
export async function fetchPendingRequestCounts(folderIds: string[]): Promise<Record<string, number>> {
  if (folderIds.length === 0) return {};
  try {
    const entries = await Promise.all(
      folderIds.map(async (folderId) => {
        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.DOCUMENT_DELETE_REQUESTS,
          [Query.equal('folder_id', folderId), Query.equal('status', 'pending'), Query.limit(1)],
        );
        return [folderId, response.total] as const;
      }),
    );
    return Object.fromEntries(entries);
  } catch (error) {
    console.warn('Failed to load pending delete request counts:', error);
    return {};
  }
}

export interface CreateDeleteRequestInput {
  folder: DocumentFolder;
  document: FolderDocument;
  requestedBy: string;
  /** Display name of the requester, snapshotted onto the request. */
  requestedByName?: string;
  reason: string;
}

/**
 * Raises a deletion request and notifies the folder owner. Rejects a second
 * pending request for the same document from the same person, so the owner's
 * queue can't be flooded by repeated clicks.
 */
export async function createDeleteRequest(
  input: CreateDeleteRequestInput,
): Promise<DocumentDeleteRequest> {
  const { folder, document, requestedBy, requestedByName, reason } = input;

  const existing = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.DOCUMENT_DELETE_REQUESTS,
    [
      Query.equal('document_id', document.$id),
      Query.equal('requested_by', requestedBy),
      Query.equal('status', 'pending'),
      Query.limit(1),
    ],
  );
  if (existing.total > 0) {
    throw new Error('You already have a pending deletion request for this document.');
  }

  const created = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.DOCUMENT_DELETE_REQUESTS,
    ID.unique(),
    {
      folder_id: folder.$id,
      folder_name: folder.name,
      document_id: document.$id,
      file_id: document.file_id,
      file_name: document.file_name,
      owner_id: folder.owner_id,
      requested_by: requestedBy,
      requested_by_name: requestedByName || null,
      reason: reason.trim().slice(0, DELETE_REQUEST_REASON_MAX_LENGTH),
      status: 'pending',
      created_at: new Date().toISOString(),
    },
  );

  await notify(
    folder.owner_id,
    'Document Deletion Request',
    `**${requestedByName || 'A user'}** asked you to delete **${document.file_name}** from the folder **${folder.name}**. Reason: ${reason.trim()}`,
    folderLink(folder.$id),
  );

  return created as unknown as DocumentDeleteRequest;
}

/**
 * Approves a request: the document and its stored file are removed, and the
 * requester is told. Any other pending request for the same document is closed
 * at the same time, since the document no longer exists.
 */
export async function approveDeleteRequest(
  request: DocumentDeleteRequest,
  resolvedBy: string,
): Promise<void> {
  await deleteFolderDocument(request.document_id, request.file_id);

  const now = new Date().toISOString();
  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.DOCUMENT_DELETE_REQUESTS,
    request.$id,
    { status: 'approved', resolved_at: now, resolved_by: resolvedBy },
  );

  const duplicates = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.DOCUMENT_DELETE_REQUESTS,
    [
      Query.equal('document_id', request.document_id),
      Query.equal('status', 'pending'),
      Query.limit(REQUEST_FETCH_LIMIT),
    ],
  );
  for (const duplicate of duplicates.documents) {
    if (duplicate.$id === request.$id) continue;
    await databases
      .updateDocument(DATABASE_ID, COLLECTIONS.DOCUMENT_DELETE_REQUESTS, duplicate.$id, {
        status: 'approved',
        resolved_at: now,
        resolved_by: resolvedBy,
      })
      .catch(() => {});
  }

  await notify(
    request.requested_by,
    'Deletion Request Approved',
    `**${request.file_name}** has been deleted from the folder **${request.folder_name}**.`,
    folderLink(request.folder_id),
  );
}

/** Rejects a request; the document stays in the folder. */
export async function rejectDeleteRequest(
  request: DocumentDeleteRequest,
  resolvedBy: string,
): Promise<void> {
  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.DOCUMENT_DELETE_REQUESTS,
    request.$id,
    { status: 'rejected', resolved_at: new Date().toISOString(), resolved_by: resolvedBy },
  );

  await notify(
    request.requested_by,
    'Deletion Request Declined',
    `Your request to delete **${request.file_name}** from the folder **${request.folder_name}** was declined. The document remains in the folder.`,
    folderLink(request.folder_id),
  );
}
