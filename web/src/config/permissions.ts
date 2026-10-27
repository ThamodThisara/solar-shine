/**
 * System-wide granular permission definitions.
 * Grouped by module/category for rendering in the admin permission matrix.
 */

import { FolderType } from '@/types/payload-types';

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
    id: 'leads',
    title: 'Lead Management',
    permissions: [
      { key: 'leads:view', label: 'View Leads', description: 'Access the lead pipeline, including website enquiries' },
      { key: 'leads:create', label: 'Create Lead', description: 'Register new leads manually' },
      { key: 'leads:edit', label: 'Edit Lead', description: 'Update lead details, status, follow-ups, and assignment' },
      { key: 'leads:convert', label: 'Convert Lead', description: 'Convert a qualified lead into a registered client' }
    ]
  },
  {
    id: 'quotations',
    title: 'Quotations',
    permissions: [
      { key: 'quotations:view', label: 'View Quotations', description: 'Browse quotations and download their PDFs' },
      { key: 'quotations:create', label: 'Create Quotation', description: 'Draft new quotations for leads and clients' },
      { key: 'quotations:edit', label: 'Edit Quotation', description: 'Edit, submit for approval, and delete draft quotations' },
      { key: 'quotations:approve', label: 'Approve Quotation', description: 'Approve or reject quotations awaiting approval' },
      { key: 'quotations:send', label: 'Send Quotation', description: 'Send approved quotations to customers for review' },
      { key: 'quotations:convert', label: 'Convert Quotation', description: 'Turn an accepted quotation into a project' }
    ]
  },
  {
    id: 'inventory',
    title: 'Inventory',
    permissions: [
      { key: 'inventory:view', label: 'View Inventory', description: 'Browse the product catalog, stock levels, and stock history' },
      { key: 'inventory:manage', label: 'Manage Inventory', description: 'Add and edit products and record stock received, consumed, or adjusted' }
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
    id: 'documents',
    title: 'Document Center',
    permissions: [
      { key: 'documents:view', label: 'View Document Center', description: 'Open the Document Center and browse accessible documents and folders' },
      { key: 'documents:upload', label: 'Upload Documents', description: 'Upload project documents into the Document Center' },
      { key: 'documents:manage_types', label: 'Manage Document Types', description: 'Create, edit, and delete the document types available when uploading' },
      { key: 'documents:manage_permissions', label: 'Manage Document Permissions', description: 'Change which departments and users can view an uploaded document' },
      { key: 'folders:create', label: 'Create Folder', description: 'Create folders in the Document Center and upload documents into them' },
      { key: 'folders:create_personal', label: 'Create Personal Folder', description: 'Create private folders visible only to their owner' },
      { key: 'folders:create_public', label: 'Create Public Folder', description: 'Create folders visible to every user across all departments' },
      { key: 'folders:create_dynamic', label: 'Create Dynamic Folder', description: 'Create folders shared with selected departments and/or users' }
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
 * The permission gating each folder type, on top of the `folders:create` grant.
 * A role needs both to offer that type in the create-folder dialog.
 */
export const FOLDER_TYPE_PERMISSIONS: Record<FolderType, string> = {
  personal: 'folders:create_personal',
  public: 'folders:create_public',
  dynamic: 'folders:create_dynamic'
};

/**
 * Document Center grants every staff role starts with: browse and upload, plus
 * folders for their own and shared use. Public folders and document-type
 * management are withheld by default — an administrator opts a role into them
 * from the permission matrix.
 */
const DEFAULT_DOCUMENT_PERMISSIONS = [
  'documents:view',
  'documents:upload',
  'folders:create',
  'folders:create_personal',
  'folders:create_dynamic'
];

/**
 * Hardcoded default permissions mapping for the fallback roles.
 * If the database collections aren't initialized yet, the app falls back to this mapping.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [...ALL_PERMISSIONS_KEYS],
  project_engineer: [
    'dashboard:view',
    'appointments:view',
    'inventory:view',
    'sites:view',
    'client-sites:view',
    'projects:view',
    'projects:edit',
    ...DEFAULT_DOCUMENT_PERMISSIONS
  ],
  planning_engineer: [
    'dashboard:view',
    'appointments:view',
    'inventory:view',
    'sites:view',
    'client-sites:view',
    'projects:view',
    'projects:edit',
    ...DEFAULT_DOCUMENT_PERMISSIONS
  ],
  sales_manager: [
    'dashboard:view',
    'appointments:view',
    'leads:view',
    'leads:create',
    'leads:edit',
    'leads:convert',
    'quotations:view',
    'quotations:create',
    'quotations:edit',
    'quotations:send',
    'quotations:convert',
    'inventory:view',
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
    ...DEFAULT_DOCUMENT_PERMISSIONS
  ],
  hr: [
    'dashboard:view',
    'appointments:view',
    'sites:view',
    'client-sites:view',
    'projects:view',
    'teams:manage',
    ...DEFAULT_DOCUMENT_PERMISSIONS
  ],
  finance_manager: [
    'dashboard:view',
    'appointments:view',
    'quotations:view',
    'quotations:approve',
    'inventory:view',
    'projects:view',
    ...DEFAULT_DOCUMENT_PERMISSIONS
  ],
  marketing_manager: [
    'dashboard:view',
    'appointments:view',
    'leads:view',
    'leads:create',
    ...DEFAULT_DOCUMENT_PERMISSIONS
  ],
  engineering_manager: [
    'dashboard:view',
    'appointments:view',
    'inventory:view',
    'inventory:manage',
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
    ...DEFAULT_DOCUMENT_PERMISSIONS
  ]
};
