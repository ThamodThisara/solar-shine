/**
 * System-wide granular permission definitions.
 * Grouped by module/category for rendering in the admin permission matrix.
 */

export interface PermissionDefinition {
  key: string;
  label: string;
  description: string;
}

export interface PermissionModule {
  id: string;
  title: string;
  permissions: PermissionDefinition[];
}

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: 'dashboard',
    title: 'Dashboard Overview',
    permissions: [
      { key: 'dashboard:view', label: 'View Dashboard', description: 'Access dashboard summary metrics and statistics' },
      { key: 'appointments:view', label: 'View Appointments', description: 'View scheduled site visit calendars and client appointments' }
    ]
  },
  {
    id: 'clients',
    title: 'Client Management',
    permissions: [
      { key: 'clients:view', label: 'View Clients', description: 'Access lists, search, and profiles of registered clients' },
      { key: 'clients:create', label: 'Register Client', description: 'Create new client entries' },
      { key: 'clients:edit', label: 'Edit Client', description: 'Update profile information for clients' },
      { key: 'clients:delete', label: 'Delete Client', description: 'Remove client profiles from system' },
      { key: 'client-sites:view', label: 'View Client Sites', description: 'Access client site details and locations' },
      { key: 'client-sites:create', label: 'Add Client Site', description: 'Add new sites/installations for a client' },
      { key: 'client-sites:edit', label: 'Edit Client Site', description: 'Modify details, solar panel/inverter details for a site' }
    ]
  },
  {
    id: 'projects',
    title: 'Project Execution',
    permissions: [
      { key: 'projects:view', label: 'View Project Progress', description: 'Access project pipelines and executions board' },
      { key: 'projects:create', label: 'Create Project', description: 'Initialize new projects' },
      { key: 'projects:edit', label: 'Edit Project Info', description: 'Modify status, project manager, or timeline information' }
    ]
  },
  {
    id: 'sites',
    title: 'Site Visit Management',
    permissions: [
      { key: 'sites:view', label: 'View Site Visits', description: 'View scheduled and past visits' },
      { key: 'sites:create', label: 'Register Site Visit', description: 'Schedule new site visits' },
      { key: 'sites:edit', label: 'Edit Site Visit', description: 'Modify visit details, dates, or details' },
      { key: 'sites:assign', label: 'Assign Engineer', description: 'Assign engineers to site visits' }
    ]
  },
  {
    id: 'cms',
    title: 'Content Management',
    permissions: [
      { key: 'cms:manage', label: 'Manage Pages & Articles', description: 'Create, update, and publish web pages and articles' }
    ]
  },
  {
    id: 'configuration',
    title: 'System Configuration',
    permissions: [
      { key: 'settings:manage', label: 'Manage Global Settings', description: 'Change company info, SEO settings, and social links' }
    ]
  },
  {
    id: 'teams',
    title: 'Teams & Roles',
    permissions: [
      { key: 'teams:manage', label: 'Manage Team Members', description: 'Invite, edit, or remove members inside teams' },
      { key: 'roles:manage', label: 'Manage Roles & Permissions', description: 'Create custom roles and set permission matrix values' }
    ]
  }
];

// Flat list of all permission keys
export const ALL_PERMISSIONS_KEYS = PERMISSION_MODULES.flatMap(m => m.permissions.map(p => p.key));

/**
 * Hardcoded default permissions mapping for the fallback roles.
 * If the database collections aren't initialized yet, the app falls back to this mapping.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    ...ALL_PERMISSIONS_KEYS,
    'cms:manage',
    'documents:view',
    'documents:upload',
    'documents:manage_permissions'
  ],
  project_engineer: [
    'dashboard:view',
    'appointments:view',
    'sites:view',
    'client-sites:view',
    'projects:view',
    'projects:edit',
    'documents:view'
  ],
  planning_engineer: [
    'dashboard:view',
    'appointments:view',
    'sites:view',
    'client-sites:view',
    'projects:view',
    'projects:edit',
    'documents:view'
  ],
  sales_manager: [
    'dashboard:view',
    'appointments:view',
    'clients:view',
    'clients:create',
    'clients:edit',
    'client-sites:view',
    'client-sites:create',
    'client-sites:edit',
    'sites:view',
    'sites:create',
    'sites:edit',
    'projects:view',
    'documents:view'
  ],
  hr: [
    'dashboard:view',
    'appointments:view',
    'sites:view',
    'client-sites:view',
    'projects:view',
    'documents:view',
    'teams:manage'
  ],
  finance_manager: [
    'dashboard:view',
    'appointments:view',
    'projects:view',
    'documents:view'
  ],
  marketing_manager: [
    'dashboard:view',
    'appointments:view',
    'documents:view'
  ],
  engineering_manager: [
    'dashboard:view',
    'appointments:view',
    'sites:view',
    'sites:create',
    'sites:edit',
    'sites:assign',
    'client-sites:view',
    'client-sites:create',
    'client-sites:edit',
    'projects:view',
    'projects:create',
    'projects:edit',
    'documents:view'
  ]
};
