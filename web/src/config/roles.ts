/**
 * Central role / panel / permission configuration.
 *
 * This is the single source of truth for role-based access in the app. To add a
 * new role or panel in the future, you typically only need to:
 *   1. Add the role string to `AppRole` (or just rely on the generic string type).
 *   2. Add/extend a `PanelDefinition` in `PANELS` with its route and allowed roles,
 *      and mount that route in App.tsx.
 *   3. Grant the role its sections via `ENGINEER_ROLES` / `SECTION_ACCESS`.
 *   4. Map it in `ROLE_DOCUMENT_DEPARTMENT` so document scoping resolves, and give
 *      it a `ROLE_PANEL_LABEL` if the panel heading is not "Engineer".
 *   5. Add the role to the `TEAM_ROLE_OPTIONS` dropdown in UserManagementSection,
 *      and to `TEAM_NAME_ROLE_RULES` / `ROLE_HOME_PATH` in the team-management
 *      function (its notification links resolve roles server-side).
 * The routing (App.tsx), route guards (ProtectedRoute), login redirect, and the
 * per-section authorization checks all read from here, so no other wiring changes.
 */

import { Department } from '@/types/payload-types';
import { OWNER_DEPARTMENT } from '@/lib/documentTypes';

export type AppRole =
  | 'admin'
  | 'project_engineer'
  | 'planning_engineer'
  | 'sales_manager'
  | 'hr'
  | 'finance_manager'
  | 'marketing_manager'
  | (string & {});

/** A logical feature/section inside a panel. */
export interface SectionDefinition {
  id: string;
  /** Roles allowed to view/use this section. */
  roles: AppRole[];
}

export interface PanelDefinition {
  /** Stable panel identifier. */
  id: string;
  /** Route the panel is mounted at. */
  path: string;
  /** Roles permitted to access this panel. */
  roles: AppRole[];
}

/**
 * Non-admin staff roles that share the engineer panel. Despite the name this is
 * broader than the two engineer roles — it is the set `SECTION_ACCESS` grants the
 * shared sections to, and backs `isEngineer` on the auth context.
 */
export const ENGINEER_ROLES: AppRole[] = [
  'project_engineer',
  'planning_engineer',
  'sales_manager',
  'finance_manager',
  'marketing_manager',
];

export type PanelId = 'admin' | 'engineer' | 'sales' | 'hr' | 'finance' | 'marketing';

export const PANELS: Record<PanelId, PanelDefinition> = {
  admin: {
    id: 'admin',
    path: '/admin',
    roles: ['admin'],
  },
  engineer: {
    id: 'engineer',
    path: '/engineer',
    roles: ['project_engineer', 'planning_engineer'],
  },
  sales: {
    id: 'sales',
    path: '/sales',
    roles: ['sales_manager'],
  },
  hr: {
    id: 'hr',
    path: '/hr',
    roles: ['hr'],
  },
  finance: {
    id: 'finance',
    path: '/finance',
    roles: ['finance_manager'],
  },
  marketing: {
    id: 'marketing',
    path: '/marketing',
    roles: ['marketing_manager'],
  },
};

/**
 * Which roles may access each section. Sections not listed here are treated as
 * admin-only by convention (see `canAccessSection`).
 */
export const SECTION_ACCESS: Record<string, AppRole[]> = {
  'project-execution': ['admin', ...ENGINEER_ROLES, 'hr'],
  'document-center': ['admin', ...ENGINEER_ROLES, 'hr'],
  'site-visits': ['admin', ...ENGINEER_ROLES, 'hr'],
  // Dashboard + Client Management are admin features also surfaced in the Sales panel.
  'dashboard': ['admin', 'sales_manager'],
  'clients': ['admin', 'sales_manager'],
};

/**
 * Short label for the panel a role works in, used for the panel heading and the
 * header badge (e.g. "Finance" -> "Finance Panel"). Defaults to "Engineer" for
 * the engineer roles and anything unmapped.
 */
export const ROLE_PANEL_LABEL: Record<string, string> = {
  hr: 'HR',
  sales_manager: 'Sales',
  finance_manager: 'Finance',
  marketing_manager: 'Marketing',
};

export function getPanelLabelForRole(role?: string | null): string {
  if (!role) return 'Engineer';
  return ROLE_PANEL_LABEL[role] ?? 'Engineer';
}

/**
 * The document-type department each role belongs to. Roles absent from this map
 * (notably `admin`, who is never scoped to one department) have no department.
 */
export const ROLE_DOCUMENT_DEPARTMENT: Record<string, string> = {
  project_engineer: 'engineer',
  planning_engineer: 'engineer',
  sales_manager: 'sales',
  hr: 'hr',
  finance_manager: 'finance',
  marketing_manager: 'marketing',
};

/**
 * The department a role's document types are filed under, or null when the role
 * is not scoped to a single department. Use this rather than testing role slugs
 * inline, so a new role only has to be added to `ROLE_DOCUMENT_DEPARTMENT`.
 */
export function getDocumentDepartmentForRole(role?: string | null): string | null {
  if (!role) return null;
  return ROLE_DOCUMENT_DEPARTMENT[role] ?? null;
}

/**
 * The Document `department` (access taxonomy) a role belongs to, or null when the
 * role is not scoped to one — admins included, as they see every department.
 */
export function getAccessDepartmentForRole(role?: string | null): Department | null {
  const dept = getDocumentDepartmentForRole(role);
  if (!dept) return null;
  return OWNER_DEPARTMENT[dept] ?? null;
}

/** All roles that are allowed to authenticate into a panel at all. */
export const LOGIN_ALLOWED_ROLES: AppRole[] = Array.from(
  new Set(Object.values(PANELS).flatMap((p) => p.roles)),
);

/** Resolve the panel a given role should land on after login. */
export function getPanelForRole(role?: string | null): PanelDefinition | null {
  if (!role) return null;
  return (
    Object.values(PANELS).find((panel) => panel.roles.includes(role)) ?? null
  );
}

/** The route a role should be redirected to after a successful login. */
export function getHomeRoute(role?: string | null): string | null {
  return getPanelForRole(role)?.path ?? null;
}

/** Whether a role may access a specific panel. */
export function canAccessPanel(panel: PanelId, role?: string | null): boolean {
  if (!role) return false;
  return PANELS[panel].roles.includes(role);
}

/**
 * Whether a role may access a given section id. Unknown/unlisted sections are
 * admin-only by default so newly-added admin features stay locked down unless
 * explicitly opened up here.
 */
export function canAccessSection(sectionId: string, role?: string | null): boolean {
  if (!role) return false;
  const allowed = SECTION_ACCESS[sectionId] ?? ['admin'];
  return allowed.includes(role);
}
