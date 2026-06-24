import { Department } from '@/types/payload-types';

export const DEPARTMENTS: Department[] = ['Marketing', 'Sales', 'Finance', 'Engineering'];

export const ALLOWED_FILE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.odt', '.ods', '.odp',
];

export const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet', 'application/vnd.oasis.opendocument.presentation',
];

export function isAllowedFile(file: File): boolean {
  const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
  return ALLOWED_FILE_EXTENSIONS.includes(extension) || ALLOWED_MIME_TYPES.includes(file.type);
}
