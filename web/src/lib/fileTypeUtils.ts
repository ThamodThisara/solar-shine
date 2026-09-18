/**
 * Utilities for classifying uploaded file MIME types and deciding how to
 * display / preview them in document cards.
 */

export type FileCategory = 'image' | 'video' | 'audio' | 'archive' | 'document';

/** Classify a MIME type string into one of the broad display categories. */
export function getFileCategory(mimeType: string): FileCategory {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (isArchiveMime(mimeType)) return 'archive';
  return 'document';
}

const ARCHIVE_MIME_TYPES = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
  'application/x-gzip',
  'application/x-bzip2',
  'application/x-xz',
]);

function isArchiveMime(mimeType: string): boolean {
  return ARCHIVE_MIME_TYPES.has(mimeType);
}

/**
 * Returns true when the browser can meaningfully display the file inline
 * (images, PDFs, video, audio). Archives and most office documents cannot.
 */
export function isPreviewableInBrowser(mimeType: string): boolean {
  const cat = getFileCategory(mimeType);
  if (cat === 'image' || cat === 'video' || cat === 'audio') return true;
  if (mimeType === 'application/pdf') return true;
  if (mimeType.startsWith('text/')) return true;
  return false;
}

/**
 * Returns true when the file should be shown with an in-app media player
 * (video or audio) rather than simply opening in a new browser tab.
 */
export function needsMediaPlayer(mimeType: string): boolean {
  const cat = getFileCategory(mimeType);
  return cat === 'video' || cat === 'audio';
}
