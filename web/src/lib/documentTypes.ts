import { Department, DocumentType } from '@/types/payload-types';

export const DEPARTMENTS: Department[] = ['Marketing', 'Sales', 'Finance', 'Engineering', 'HR', 'Admin'];

/** Sentinel stored in a document type's `departments` meaning "every department". */
export const ALL_DEPARTMENTS = 'all';

/** Selectable departments for a document type, excluding the "all" sentinel. */
export const DOCUMENT_TYPE_DEPARTMENTS: { value: string; label: string }[] = [
  { value: 'engineer', label: 'Engineer' },
  { value: 'sales', label: 'Sales' },
  { value: 'admin', label: 'Admin' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
  { value: 'marketing', label: 'Marketing' },
];

/**
 * Maps the document-type department taxonomy onto a Document's `department`.
 * Every document-type department has exactly one counterpart here, so a type's
 * owner department never collides with another department's documents.
 */
export const OWNER_DEPARTMENT: Record<string, Department> = {
  engineer: 'Engineering',
  sales: 'Sales',
  admin: 'Admin',
  hr: 'HR',
  finance: 'Finance',
  marketing: 'Marketing',
};

/** Every department in the Document `department` taxonomy. */
export const ACCESS_DEPARTMENTS: Department[] = [
  'Marketing',
  'Sales',
  'Finance',
  'Engineering',
  'HR',
  'Admin',
];

/**
 * Resolves the departments a type belongs to, falling back to the legacy scalar
 * `department` for rows written before the multi-department migration. Always
 * read a type's departments through here rather than off the raw fields.
 */
export function getTypeDepartments(dt: Pick<DocumentType, 'department' | 'departments'>): string[] {
  if (dt.departments?.length) return dt.departments;
  if (dt.department) return [dt.department];
  return [ALL_DEPARTMENTS];
}

/** True when `dt` is available to `department` (a concrete department value). */
export function typeServesDepartment(
  dt: Pick<DocumentType, 'department' | 'departments'>,
  department: string,
): boolean {
  const depts = getTypeDepartments(dt);
  return depts.includes(ALL_DEPARTMENTS) || depts.includes(department);
}

/**
 * The single department owning documents of this type, or null when the type
 * spans several departments (or "all") and no one owner can be determined.
 */
export function getTypeOwnerDepartment(
  dt: Pick<DocumentType, 'department' | 'departments'> | undefined | null,
): Department | null {
  if (!dt) return null;
  const depts = getTypeDepartments(dt);
  if (depts.length !== 1) return null;
  return OWNER_DEPARTMENT[depts[0]] ?? null;
}

/**
 * The departments a type's documents belong to, translated onto the Document
 * `department` taxonomy — the set to grant access to by default. "all" covers
 * every department.
 */
export function getTypeAccessDepartments(
  dt: Pick<DocumentType, 'department' | 'departments'> | undefined | null,
): Department[] {
  if (!dt) return [];
  const depts = getTypeDepartments(dt);
  if (depts.includes(ALL_DEPARTMENTS)) return [...ACCESS_DEPARTMENTS];
  return depts.map((d) => OWNER_DEPARTMENT[d]).filter((d): d is Department => Boolean(d));
}

/**
 * Heading a type is listed under in the document-type pickers. Each option gets
 * exactly one group, so types spanning several departments are labelled as such
 * rather than filed under an arbitrary one of them.
 */
export function getTypeGroupLabel(dt: Pick<DocumentType, 'department' | 'departments'>): string {
  const depts = getTypeDepartments(dt);
  if (depts.includes(ALL_DEPARTMENTS)) return 'All Departments';
  if (depts.length > 1) return 'Multiple Departments';
  return DOCUMENT_TYPE_DEPARTMENTS.find((d) => d.value === depts[0])?.label ?? 'All Departments';
}

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
