import { databases, DATABASE_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { DEFAULT_ROLE_PERMISSIONS } from '@/config/permissions';

export interface DepartmentRecord {
  $id?: string;
  name: string;
  slug: string;
  description?: string;
  $createdAt?: string;
}

export interface RoleRecord {
  $id?: string;
  name: string;
  slug: string;
  department_id: string; // References DepartmentRecord.$id
  permissions: string[];
  is_system?: boolean;
  $createdAt?: string;
}

// Collection mapping (extending custom collections if not defined)
const DEPARTMENTS_COL_ID = 'departments';
const ROLES_COL_ID = 'roles';

// Static default departments to seed / fall back on
export const DEFAULT_DEPARTMENTS: Omit<DepartmentRecord, '$id'>[] = [
  { name: 'Engineering', slug: 'engineering', description: 'Technical, planning, and execution engineering roles' },
  { name: 'Sales', slug: 'sales', description: 'Sales and customer acquisition roles' },
  { name: 'Human Resources', slug: 'hr', description: 'Recruitment, employee relations, and team coordination' },
  { name: 'Finance', slug: 'finance', description: 'Financial management and billing roles' },
  { name: 'Marketing', slug: 'marketing', description: 'Marketing and promotional operations' },
  { name: 'Administration', slug: 'admin', description: 'System administrators and managers' }
];

// Static default roles to seed / fall back on
export const DEFAULT_ROLES = [
  { name: 'Project Engineer', slug: 'project_engineer', departmentSlug: 'engineering', is_system: false },
  { name: 'Planning Engineer', slug: 'planning_engineer', departmentSlug: 'engineering', is_system: false },
  { name: 'Engineering Manager', slug: 'engineering_manager', departmentSlug: 'engineering', is_system: false },
  { name: 'Sales Manager', slug: 'sales_manager', departmentSlug: 'sales', is_system: false },
  { name: 'HR Manager', slug: 'hr', departmentSlug: 'hr', is_system: false },
  { name: 'Finance Manager', slug: 'finance_manager', departmentSlug: 'finance', is_system: false },
  { name: 'Marketing Manager', slug: 'marketing_manager', departmentSlug: 'marketing', is_system: false },
  { name: 'Administrator', slug: 'admin', departmentSlug: 'admin', is_system: true }
];

/**
 * Fetches all departments. Returns empty array if database fails.
 */
export async function fetchDepartments(): Promise<DepartmentRecord[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      DEPARTMENTS_COL_ID,
      [Query.limit(100), Query.orderAsc('name')]
    );
    return response.documents as unknown as DepartmentRecord[];
  } catch (error: any) {
    console.warn('[roleService] Departments collection not available or empty.', error.message);
    return [];
  }
}

/**
 * Creates a new department.
 */
export async function createDepartment(name: string, description?: string): Promise<DepartmentRecord> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_+|_+$)/g, '');
  try {
    const doc = await databases.createDocument(
      DATABASE_ID,
      DEPARTMENTS_COL_ID,
      ID.unique(),
      { name, slug, description }
    );
    return doc as unknown as DepartmentRecord;
  } catch (error) {
    console.error('Error creating department in Appwrite:', error);
    throw error;
  }
}

/**
 * Fetches all roles. Returns empty array if database fails.
 */
export async function fetchRoles(): Promise<RoleRecord[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      ROLES_COL_ID,
      [Query.limit(100)]
    );
    return response.documents as unknown as RoleRecord[];
  } catch (error: any) {
    console.warn('[roleService] Roles collection not available.', error.message);
    return [];
  }
}

/**
 * Seeds the default structure (Departments & Roles) in the database.
 */
export async function seedDefaultStructure(): Promise<void> {
  const deptIdMap: Record<string, string> = {};

  // Seed departments
  for (const dept of DEFAULT_DEPARTMENTS) {
    const doc = await databases.createDocument(
      DATABASE_ID,
      DEPARTMENTS_COL_ID,
      ID.unique(),
      { name: dept.name, slug: dept.slug, description: dept.description }
    );
    deptIdMap[dept.slug] = doc.$id;
  }

  // Seed roles
  for (const role of DEFAULT_ROLES) {
    const deptId = deptIdMap[role.departmentSlug];
    if (!deptId) continue;
    
    const permissions = DEFAULT_ROLE_PERMISSIONS[role.slug] || [];
    
    await databases.createDocument(
      DATABASE_ID,
      ROLES_COL_ID,
      ID.unique(),
      {
        name: role.name,
        slug: role.slug,
        department_id: deptId,
        permissions,
        is_system: role.is_system
      }
    );
  }
}

/**
 * Creates a new custom role.
 */
export async function createRole(name: string, departmentId: string, permissions: string[]): Promise<RoleRecord> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_+|_+$)/g, '');
  try {
    const doc = await databases.createDocument(
      DATABASE_ID,
      ROLES_COL_ID,
      ID.unique(),
      {
        name,
        slug,
        department_id: departmentId,
        permissions,
        is_system: false
      }
    );
    return doc as unknown as RoleRecord;
  } catch (error) {
    console.error('Error creating role in Appwrite:', error);
    throw error;
  }
}

/**
 * Updates a role's permissions or properties.
 */
export async function updateRole(roleId: string, updates: Partial<Omit<RoleRecord, '$id'>>): Promise<RoleRecord> {
  try {
    const doc = await databases.updateDocument(
      DATABASE_ID,
      ROLES_COL_ID,
      roleId,
      updates
    );
    return doc as unknown as RoleRecord;
  } catch (error) {
    console.error(`Error updating role ${roleId}:`, error);
    throw error;
  }
}

/**
 * Deletes a role (prevents deleting system admin roles).
 */
export async function deleteRole(roleId: string): Promise<void> {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      ROLES_COL_ID,
      roleId
    );
  } catch (error) {
    console.error(`Error deleting role ${roleId}:`, error);
    throw error;
  }
}
