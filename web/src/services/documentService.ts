import { databases, storage, COLLECTIONS, DATABASE_ID, DOCUMENTS_BUCKET_ID, account } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { DocumentRecord, DocumentVisibility, Department } from '@/types/payload-types';
import { isAllowedFile, validateFile } from '@/lib/documentTypes';
import { filterAccessibleDocuments } from '@/lib/permissions';

// ── Upload helpers ────────────────────────────────────────────────────────────────

/**
 * Describes the state of an upload attempt. Consumed by the UI layer
 * (e.g. DocumentUploadDialog) to show appropriate feedback without the
 * service layer needing to know about toast or React state.
 */
export type UploadStatus =
  | { type: 'uploading'; fileName: string; percent: number }
  | { type: 'offline_waiting' }
  | { type: 'retrying'; attempt: number; totalAttempts: number; fileName: string }
  | { type: 'failed'; fileName: string; error: string };

/**
 * Returns true for transient errors that are worth retrying:
 *   - Network-level failures (TypeError: "Failed to fetch", etc.)
 *   - HTTP 500 / 502 / 503 / 504
 *
 * Returns false for errors that retrying would never fix:
 *   - AbortError (user cancellation)
 *   - HTTP 400 / 401 / 403 / 404 / 413 (auth, validation, size, etc.)
 */
function isRetryableError(err: unknown): boolean {
  // User cancellation — do not retry.
  if (err instanceof DOMException && err.name === 'AbortError') return false;
  // Network-level failure with no HTTP response.
  if (err instanceof TypeError) return true;
  // Appwrite SDK wraps HTTP errors as AppwriteException with a numeric `code`.
  const code = (err as any)?.code ?? (err as any)?.status;
  if (typeof code === 'number') {
    if (code >= 500 && code < 600) return true;   // 5xx — transient server error
    if (code >= 400 && code < 500) return false;  // 4xx — permanent client error
  }
  // Unknown error shape — retry cautiously.
  return true;
}

/**
 * Resolves immediately when the browser is online. When offline, waits
 * indefinitely for the browser `online` event (no hard timeout).
 * Rejects with AbortError if the signal fires before coming back online.
 *
 * NOTE: Cannot cancel any active Appwrite storage.createFile() fetch.
 * The Appwrite Web SDK v18.1.1 has no AbortSignal support in createFile().
 */
function waitForOnline(signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('Upload cancelled', 'AbortError'));
  }
  if (navigator.onLine) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const onOnline = () => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    };
    const onAbort = () => {
      window.removeEventListener('online', onOnline);
      reject(new DOMException('Upload cancelled', 'AbortError'));
    };
    window.addEventListener('online', onOnline, { once: true });
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Resolves after `ms` milliseconds, or rejects early with AbortError if the
 * signal fires. Removes the abort listener when the timer completes normally
 * so listeners do not remain attached unnecessarily.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('Upload cancelled', 'AbortError'));
  }
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Upload cancelled', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

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
  /**
   * Real chunk-level progress 0–100, driven by Appwrite's built-in onProgress
   * callback. Only fires for files > 5 MB — smaller files are sent in a single
   * request and will not trigger this callback.
   */
  onProgress?: (percent: number) => void;
  /**
   * Upload lifecycle status changes. Kept separate from onProgress so the UI
   * can respond to state transitions (retrying, offline) independently of
   * byte-level progress ticks. No toast or UI calls are made inside the service.
   */
  onStatusChange?: (status: UploadStatus) => void;
  /**
   * Cancels waitForOnline() and sleep() waits, and the post-success / pre-DB
   * abort checks. Cannot cancel an active Appwrite storage.createFile() fetch —
   * the Appwrite Web SDK v18.1.1 provides no AbortSignal support in createFile().
   */
  abortSignal?: AbortSignal;
}

/**
 * Uploads a single file to Appwrite Storage and creates its database record.
 *
 * Structure:
 *   Phase 1 — Storage upload retry loop (handles ONLY storage.createFile).
 *             Retries on transient network / 5xx errors with exponential back-off.
 *             Every failed attempt is treated as potentially partial and cleaned up
 *             before the error is classified — regardless of whether onProgress fired.
 *             Uses a fresh fileId per attempt to avoid unverified server-side
 *             duplicate-chunk behaviour.
 *   Phase 2 — DB record creation, outside the retry loop. A DB failure cleans up
 *             the already-uploaded file and throws — it never triggers a re-upload.
 *
 * Limitation: This is NOT a true resumable upload. A mid-upload failure restarts
 * from byte 0. True resumability requires server-side chunk-state query support
 * that is not currently documented for this SDK version.
 */
export async function uploadDocument(input: UploadDocumentInput): Promise<DocumentRecord> {
  // Local validation — no network call, so no storage cleanup is ever needed here.
  const fileError = validateFile(input.file);
  if (fileError) throw new Error(fileError);

  const MAX_ATTEMPTS = 4; // 1 initial + 3 retries
  const BASE_DELAY_MS = 1500;

  // ── Phase 1: Storage upload ──────────────────────────────────────────────────────
  let successfulFileId: string | null = null;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const fileId = ID.unique(); // always fresh per attempt
    const fileMB = (input.file.size / (1024 * 1024)).toFixed(2);

    console.info(
      `[Upload] "${input.file.name}" (${fileMB} MB) storage attempt ${attempt}/${MAX_ATTEMPTS} — fileId=${fileId}`,
    );

    try {
      // storage.createFile automatically chunks files > 5 MB (Appwrite SDK v16+).
      // The 5th argument is Appwrite's built-in chunk-progress callback.
      await storage.createFile(
        DOCUMENTS_BUCKET_ID,
        fileId,
        input.file,
        [],
        (progress) => {
          const pct = progress.progress ?? 0;
          console.info(
            `[Upload] "${input.file.name}" chunk ${progress.chunksUploaded}/${progress.chunksTotal} — ${pct}%`,
          );
          input.onStatusChange?.({ type: 'uploading', fileName: input.file.name, percent: pct });
          input.onProgress?.(pct);
        },
      );

      // Storage confirmed successful. However, the SDK cannot cancel an active
      // fetch, so the user may have clicked Cancel while this was in flight.
      // Check the signal immediately before accepting the result.
      if (input.abortSignal?.aborted) {
        console.info(
          `[Upload] "${input.file.name}" storage succeeded but upload was cancelled — cleaning up fileId=${fileId}`,
        );
        await storage.deleteFile(DOCUMENTS_BUCKET_ID, fileId).catch((e) => {
          console.warn(`[Upload] Cleanup of cancelled fileId=${fileId} failed:`, e);
        });
        throw new DOMException('Upload cancelled', 'AbortError');
      }

      successfulFileId = fileId;
      console.info(`[Upload] "${input.file.name}" storage succeeded — fileId=${fileId}`);
      break; // exit the storage retry loop

    } catch (err: unknown) {
      lastError = err;
      const code = (err as any)?.code ?? (err as any)?.status ?? 'network';
      const isLast = attempt >= MAX_ATTEMPTS;

      console.error(
        `[Upload] "${input.file.name}" storage attempt ${attempt} failed`,
        { code, isLast, fileId, error: err },
      );

      // Best-effort cleanup BEFORE classifying the error. Every failed attempt
      // is treated as potentially partial — a chunk response can be lost in
      // transit after the server has already stored the bytes, meaning
      // onProgress never fires even though data was written. A 404 here means
      // nothing was stored and is expected; log it but do not throw.
      await storage.deleteFile(DOCUMENTS_BUCKET_ID, fileId).catch((cleanupErr) => {
        console.warn(
          `[Upload] Cleanup of potentially-partial fileId=${fileId} failed (404 expected if nothing was stored):`,
          cleanupErr,
        );
      });

      // Classify error AFTER cleanup.
      const retryable = isRetryableError(err);

      // Non-retryable (AbortError, 4xx): surface immediately without further attempts.
      if (!retryable) throw err;

      if (isLast) throw lastError;

      // Check for cancellation before scheduling the next attempt.
      if (input.abortSignal?.aborted) {
        throw new DOMException('Upload cancelled', 'AbortError');
      }

      // Notify UI of the upcoming retry.
      input.onStatusChange?.({
        type: 'retrying',
        attempt: attempt + 1,
        totalAttempts: MAX_ATTEMPTS,
        fileName: input.file.name,
      });

      // If offline: wait indefinitely for reconnection (cancellable via signal).
      // NOTE: The signal cannot cancel any fetch already in flight.
      if (!navigator.onLine) {
        input.onStatusChange?.({ type: 'offline_waiting' });
        await waitForOnline(input.abortSignal);
      }

      // Exponential back-off: 1.5 s → 3 s → 6 s.
      const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
      console.info(`[Upload] "${input.file.name}" retrying in ${delay} ms`);
      await sleep(delay, input.abortSignal);
    }
  }

  if (!successfulFileId) throw lastError;

  // Final abort check before DB creation. There is a narrow window where
  // cancellation can occur between the post-storage abort check above and
  // this point. Catch it so no orphaned storage file with a missing DB
  // record is ever created.
  if (input.abortSignal?.aborted) {
    console.info(
      `[Upload] "${input.file.name}" cancelled before DB record creation — cleaning up fileId=${successfulFileId}`,
    );
    await storage.deleteFile(DOCUMENTS_BUCKET_ID, successfulFileId).catch((e) => {
      console.warn(`[Upload] Pre-DB cleanup failed (fileId=${successfulFileId}):`, e);
    });
    throw new DOMException('Upload cancelled', 'AbortError');
  }

  // ── Phase 2: DB record creation ────────────────────────────────────────────────────
  // Runs ONLY after storage is confirmed. DB errors never trigger a re-upload.
  try {
    const now = new Date().toISOString();
    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.DOCUMENTS,
      ID.unique(),
      {
        project_id: input.projectId,
        file_name: input.file.name,
        file_path: input.siteVisitId
          ? `${PROJECT_STORAGE_ROOT}/${input.projectId}/site-visits/${input.siteVisitId}/${input.file.name}`
          : `${PROJECT_STORAGE_ROOT}/${input.projectId}/${input.documentTypeId}/${input.file.name}`,
        file_id: successfulFileId,
        file_size: input.file.size,
        file_type: input.file.type,
        document_visibility: input.visibility,
        department: input.visibility === 'internal' ? (input.department ?? null) : null,
        allowed_departments:
          input.visibility === 'internal' && input.department ? [input.department] : [],
        allowed_users: [],
        document_type_id: input.documentTypeId,
        site_visit_id: input.siteVisitId ?? null,
        uploaded_by: input.uploadedBy,
        uploaded_at: now,
        updated_at: now,
        status: 'Active',
      },
    );
    console.info(`[Upload] "${input.file.name}" DB record created — docId=${response.$id}`);
    return response as unknown as DocumentRecord;
  } catch (dbError) {
    // Storage succeeded but DB record creation failed. Clean up the stored
    // file to avoid orphaned storage objects. Never retry the storage upload.
    console.error(
      `[Upload] "${input.file.name}" DB record failed (fileId=${successfulFileId}), cleaning up storage`,
      dbError,
    );
    await storage.deleteFile(DOCUMENTS_BUCKET_ID, successfulFileId).catch((cleanupErr) => {
      console.warn(
        `[Upload] Storage cleanup also failed (fileId=${successfulFileId}):`,
        cleanupErr,
      );
    });
    throw dbError;
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
  /**
   * Per-file chunk progress. Receives the file index (0-based), file name,
   * and percent 0–100. Only fires for files > 5 MB (Appwrite SDK limitation).
   */
  onProgress?: (fileIndex: number, fileName: string, percent: number) => void;
  /** Upload lifecycle status, forwarded from uploadDocument. */
  onStatusChange?: (status: UploadStatus) => void;
  /** Cancels waitForOnline() and sleep() waits. Cannot abort active Appwrite fetches. */
  abortSignal?: AbortSignal;
}

export interface UploadDocumentsResult {
  succeeded: DocumentRecord[];
  failed: { fileName: string; error: string }[];
}

export async function uploadDocuments(input: UploadDocumentsInput): Promise<UploadDocumentsResult> {
  const succeeded: DocumentRecord[] = [];
  const failed: { fileName: string; error: string }[] = [];

  for (let i = 0; i < input.files.length; i++) {
    const file = input.files[i];
    console.info(`[Upload] Processing file ${i + 1}/${input.files.length}: "${file.name}"`);
    try {
      const doc = await uploadDocument({
        file,
        projectId: input.projectId,
        visibility: input.visibility,
        department: input.department,
        documentTypeId: input.documentTypeId,
        uploadedBy: input.uploadedBy,
        siteVisitId: input.siteVisitId,
        onProgress: (percent) => input.onProgress?.(i, file.name, percent),
        onStatusChange: input.onStatusChange,
        abortSignal: input.abortSignal,
      });
      succeeded.push(doc);
    } catch (error) {
      // If the user cancelled, stop processing further files silently.
      // Do not add to failed[] — the dialog is already closing via close().
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.info('[Upload] Upload cancelled by user — stopping batch.');
        break;
      }
      const message = error instanceof Error ? error.message : 'Upload failed';
      console.error(`[Upload] "${file.name}" failed permanently:`, error);
      failed.push({ fileName: file.name, error: message });
    }
  }

  console.info(
    `[Upload] Batch complete — succeeded: ${succeeded.length}, failed: ${failed.length}`,
  );
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

/**
 * Fetches a file from Appwrite storage using a short-lived JWT, then returns a
 * local object URL. An optional `onProgress` callback receives values from 0
 * to 100 as bytes arrive. When the server does not send a `Content-Length`
 * header the callback receives -1 (indeterminate) on every chunk.
 */
export async function getAuthenticatedFileBlob(
  fileId: string,
  isDownload = false,
  onProgress?: (percent: number) => void,
): Promise<string> {
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

    // Stream the response body so we can report byte-level progress.
    if (onProgress && response.body) {
      const contentLength = Number(response.headers.get('Content-Length') ?? '0');
      const hasLength = contentLength > 0;
      const reader = response.body.getReader();
      const chunks: BlobPart[] = [];
      let loaded = 0;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.byteLength;
        onProgress(hasLength ? Math.min(99, Math.round((loaded / contentLength) * 100)) : -1);
      }

      // Signal completion before building the blob URL.
      onProgress(100);
      const blob = new Blob(chunks);
      return URL.createObjectURL(blob);
    }

    // No progress tracking needed — simple blob read.
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
