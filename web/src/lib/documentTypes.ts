import { Department } from '@/types/payload-types';

export interface DocumentTypeOption {
  code: string;
  name: string;
}

export const DOCUMENT_TYPES: DocumentTypeOption[] = [
  { code: 'G1S1', name: 'Leads & Inquiries' },
  { code: 'G1S2', name: 'Contact Category & Follow Up' },
  { code: 'G2S1', name: 'Project: Overall Quotation Summary' },
  { code: 'G2S2', name: 'Project: Approved Projects' },
  { code: 'G2S3', name: 'Project: Invoice Updates' },
  { code: 'D1', name: 'Site Inspection Sheet' },
  { code: 'D2', name: 'Engineering Design Report' },
  { code: 'D3', name: 'Pre-Costing Sheet' },
  { code: 'D4', name: 'Project Pre-Plan & Timeline' },
  { code: 'D5', name: 'Actual Project Plan' },
  { code: 'D6', name: 'Project Cost Forecast' },
  { code: 'D7', name: 'Project Completion Reports' },
  { code: 'OTHER', name: 'Other' },
];

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

export function getDocumentTypeName(code: string): string {
  return DOCUMENT_TYPES.find((d) => d.code === code)?.name ?? code;
}
