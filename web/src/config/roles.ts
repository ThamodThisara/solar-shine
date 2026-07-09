/**
 * Central role / panel / permission configuration.
 *
 * This is the single source of truth for role-based access in the app. To add a
 * new role or panel in the future, you typically only need to:
 *   1. Add the role string to `AppRole` (or just rely on the generic string type).
 *   2. Add/extend a `PanelDefinition` in `PANELS` with its route and allowed roles.
 *   3. List the sections the panel exposes.
 * The routing (App.tsx), route guards (ProtectedRoute), login redirect, and the
 * per-section authorization checks all read from here, so no other wiring changes.
 */

export type AppRole =
  | 'admin'
  | 'project_engineer'
  | 'planning_engineer'
  | 'sales_manager'
  | 'hr'
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

export const ENGINEER_ROLES: AppRole[] = ['project_engineer', 'planning_engineer', 'sales_manager'];

export const PANELS: Record<'admin' | 'engineer' | 'sales' | 'hr', PanelDefinition> = {
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
};

/**
 * Which roles may access each section. Sections not listed here are treated as
 * admin-only by convention (see `canAccessSection`).
 */
export const SECTION_ACCESS: Record<string, AppRole[]> = {
  'project-execution': ['admin', ...ENGINEER_ROLES, 'hr'],
  'document-center': ['admin', ...ENGINEER_ROLES, 'hr'],
  'site-visits': ['admin', ...ENGINEER_ROLES, 'hr'],
};

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

/** Whether a role may access a specific panel ('admin' | 'engineer' | 'sales' | 'hr'). */
export function canAccessPanel(
  panel: 'admin' | 'engineer' | 'sales' | 'hr',
  role?: string | null,
): boolean {
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
