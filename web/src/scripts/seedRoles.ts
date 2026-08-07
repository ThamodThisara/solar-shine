import * as dotenv from 'dotenv';
import { Client, Databases, ID, Query } from 'node-appwrite';

// Load environment variables
dotenv.config();

const endpoint = process.env.VITE_APPWRITE_ENDPOINT;
const projectId = process.env.VITE_APPWRITE_PROJECT_ID;
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || '6873ba790033a7d5cfdb';
const apiKey = process.env.APPWRITE_API_KEY || process.env.LOCAL_APPWRITE_API_KEY || '';

console.log('🚀 Solar Shine - Seeding Roles & Departments');
console.log('============================================');

if (!endpoint || !projectId) {
  console.error('❌ Environment variables VITE_APPWRITE_ENDPOINT or VITE_APPWRITE_PROJECT_ID are missing!');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

if (apiKey) {
  client.setKey(apiKey);
}

const databases = new Databases(client);

// Static default departments to seed
const DEFAULT_DEPARTMENTS = [
  { name: 'Engineering', slug: 'engineering', description: 'Technical, planning, and execution engineering roles' },
  { name: 'Sales', slug: 'sales', description: 'Sales and customer acquisition roles' },
  { name: 'Human Resources', slug: 'hr', description: 'Recruitment, employee relations, and team coordination' },
  { name: 'Finance', slug: 'finance', description: 'Financial management and billing roles' },
  { name: 'Marketing', slug: 'marketing', description: 'Marketing and promotional operations' },
  { name: 'Administration', slug: 'admin', description: 'System administrators and managers' }
];

// Flat lists of all permission keys grouped for default roles. Mirrors
// `src/config/permissions.ts` — this script runs on node-appwrite outside the
// Vite alias, so the definitions cannot be imported. Keep the two in step.
const ALL_PERMISSIONS_KEYS = [
  'dashboard:view', 'appointments:view',
  'clients:view', 'clients:create', 'clients:edit', 'clients:delete',
  'client-sites:view', 'client-sites:create', 'client-sites:edit',
  'sites:view', 'sites:create', 'sites:edit', 'sites:assign',
  'projects:view', 'projects:create', 'projects:edit',
  'documents:view', 'documents:upload', 'documents:manage_types', 'documents:manage_permissions',
  'folders:create', 'folders:create_personal', 'folders:create_public', 'folders:create_dynamic',
  'cms:manage', 'settings:manage',
  'teams:manage', 'roles:manage'
];

// Document Center grants every staff role starts with. Public folders and
// document-type management are left to an administrator to hand out.
const DEFAULT_DOCUMENT_PERMISSIONS = [
  'documents:view',
  'documents:upload',
  'folders:create',
  'folders:create_personal',
  'folders:create_dynamic'
];

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [...ALL_PERMISSIONS_KEYS],
  project_engineer: [
    'dashboard:view',
    'appointments:view',
    'sites:view',
    'client-sites:view',
    'projects:view',
    'projects:edit',
    ...DEFAULT_DOCUMENT_PERMISSIONS
  ],
  planning_engineer: [
    'dashboard:view',
    'appointments:view',
    'sites:view',
    'client-sites:view',
    'projects:view',
    'projects:edit',
    ...DEFAULT_DOCUMENT_PERMISSIONS
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
    ...DEFAULT_DOCUMENT_PERMISSIONS
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
    ...DEFAULT_DOCUMENT_PERMISSIONS
  ],
  hr_manager: [
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
    'projects:view',
    ...DEFAULT_DOCUMENT_PERMISSIONS
  ],
  marketing_manager: [
    'dashboard:view',
    'appointments:view',
    'cms:manage',
    ...DEFAULT_DOCUMENT_PERMISSIONS
  ]
};

const DEFAULT_ROLES = [
  { name: 'Project Engineer', slug: 'project_engineer', departmentSlug: 'engineering', is_system: false },
  { name: 'Planning Engineer', slug: 'planning_engineer', departmentSlug: 'engineering', is_system: false },
  { name: 'Engineering Manager', slug: 'engineering_manager', departmentSlug: 'engineering', is_system: false },
  { name: 'Sales Manager', slug: 'sales_manager', departmentSlug: 'sales', is_system: false },
  { name: 'HR Manager', slug: 'hr_manager', departmentSlug: 'hr', is_system: false },
  { name: 'Finance Manager', slug: 'finance_manager', departmentSlug: 'finance', is_system: false },
  { name: 'Marketing Manager', slug: 'marketing_manager', departmentSlug: 'marketing', is_system: false },
  { name: 'Administrator', slug: 'admin', departmentSlug: 'admin', is_system: true }
];

async function seed() {
  try {
    const deptIdMap: Record<string, string> = {};

    console.log('\n1️⃣  Seeding Departments...');
    for (const dept of DEFAULT_DEPARTMENTS) {
      // Check if department already exists
      const existing = await databases.listDocuments(databaseId, 'departments', [
        Query.equal('slug', dept.slug)
      ]);

      if (existing.total > 0) {
        console.log(`- Department "${dept.name}" already exists. Skipping.`);
        deptIdMap[dept.slug] = existing.documents[0].$id;
      } else {
        const created = await databases.createDocument(databaseId, 'departments', ID.unique(), dept);
        console.log(`- Created Department: "${dept.name}"`);
        deptIdMap[dept.slug] = created.$id;
      }
    }

    console.log('\n2️⃣  Seeding Roles...');
    for (const role of DEFAULT_ROLES) {
      // Check if role already exists
      const existing = await databases.listDocuments(databaseId, 'roles', [
        Query.equal('slug', role.slug)
      ]);

      const deptId = deptIdMap[role.departmentSlug];
      if (!deptId) {
        console.error(`❌ Missing department ID for slug: ${role.departmentSlug}`);
        continue;
      }

      const permissions = DEFAULT_ROLE_PERMISSIONS[role.slug] || [];

      if (existing.total > 0) {
        console.log(`- Role "${role.name}" already exists. Skipping.`);
      } else {
        await databases.createDocument(databaseId, 'roles', ID.unique(), {
          name: role.name,
          slug: role.slug,
          department_id: deptId,
          permissions,
          is_system: role.is_system
        });
        console.log(`- Created Role: "${role.name}" under Department: "${role.departmentSlug}"`);
      }
    }

    console.log('\n🎉 Roles and Departments successfully seeded!');
  } catch (error: any) {
    console.error('\n❌ Seeding failed with error:', error.message);
  }
}

seed();
