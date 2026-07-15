import { databases, COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { Department, DocumentType } from '@/types/payload-types';

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

/** Sentinel stored in `departments` meaning "every department". */
export const ALL_DEPARTMENTS = 'all';

/** Selectable departments for a document type, excluding the "all" sentinel. */
export const DOCUMENT_TYPE_DEPARTMENTS: { value: string; label: string }[] = [
  { value: 'engineer', label: 'Engineer' },
  { value: 'sales', label: 'Sales' },
  { value: 'admin', label: 'Admin' },
  { value: 'hr', label: 'HR' },
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

/** Maps the document-type department taxonomy onto a Document's `department`. */
const OWNER_DEPARTMENT: Record<string, Department> = {
  engineer: 'Engineering',
  sales: 'Sales',
  hr: 'HR',
  admin: 'Finance',
};

/** Every department in the Document `department` taxonomy. */
export const ACCESS_DEPARTMENTS: Department[] = ['Marketing', 'Sales', 'Finance', 'Engineering', 'HR'];

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
 * every department; note Marketing has no document-type counterpart, so it is
 * only ever included via "all".
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

export interface CreateDocumentTypeInput {
  type: string;
  name: string;
  departments: string[];
}

/**
 * `department` is written as null so the deprecated scalar can never contradict
 * `departments`; `getTypeDepartments` ignores it once `departments` is set.
 */
function departmentFields(input: CreateDocumentTypeInput) {
  const departments = input.departments.map((d) => d.trim()).filter(Boolean);
  return {
    departments: departments.length ? departments : [ALL_DEPARTMENTS],
    department: null,
  };
}

export async function createDocumentType(input: CreateDocumentTypeInput): Promise<DocumentType> {
  try {
    const response = await databases.createDocument(DATABASE_ID, COLLECTIONS.DOCUMENT_TYPES, ID.unique(), {
      type: input.type.trim(),
      name: input.name.trim(),
      ...departmentFields(input),
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
      ...departmentFields(input),
    });
    return response as unknown as DocumentType;
  } catch (error) {
    console.error('Error updating document type:', error);
    throw error;
  }
}
