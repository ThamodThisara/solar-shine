import { Client, Databases, Storage, Permission, Role, ID, Query, Account, Teams, Functions } from "appwrite";

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const storageBucketId = import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_ID;
const documentsBucketId = import.meta.env.VITE_APPWRITE_DOCUMENTS_BUCKET_ID;

if (!endpoint || !projectId) {
  throw new Error("Appwrite endpoint or project ID is not defined in environment variables.");
}

// Initialize the Appwrite client
const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

// Initialize services (Appwrite v18+ syntax)
const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);
const teams = new Teams(client);
const functions = new Functions(client);

// Intercept all function executions in development mode for hot-reload
if (import.meta.env.DEV) {
  const originalCreateExecution = functions.createExecution.bind(functions);
  functions.createExecution = async function (
    functionId: string,
    body?: string,
    async?: boolean,
    path?: string,
    method?: string,
    headers?: any
  ) {
    console.log(`[Dev Interceptor] Intercepting execution for function: ${functionId}`);
    try {
      // Get the currently authenticated user's ID
      let callerUserId = '';
      try {
        const user = await account.get();
        callerUserId = user.$id;
      } catch (err) {
        // User not logged in, ignore
      }

      const localRunnerUrl = 'http://localhost:4002/execute';
      const response = await fetch(localRunnerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          functionId,
          body,
          async,
          path,
          method,
          headers: {
            ...headers,
            'x-appwrite-user-id': callerUserId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Local runner returned status ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.warn(`[Dev Interceptor] Local execution runner failed. Falling back to real Appwrite:`, err);
      return originalCreateExecution(functionId, body, async, path, method, headers);
    }
  } as any;
}

export const TEAM_MANAGEMENT_FUNCTION_ID = 'team-management';

// In Appwrite v18+, methods are on the prototype, not as direct properties
// The working methods are: listDocuments, createDocument, getDocument, etc.

// Database and Collection IDs
export const DATABASE_ID = databaseId || '6873ba790033a7d5cfdb';
export const STORAGE_BUCKET_ID = storageBucketId || '6873ba8f00060c027d7c';
export const DOCUMENTS_BUCKET_ID = documentsBucketId || '6a324efb0017a8ba26fd';

// Collection IDs
export const COLLECTIONS = {
  GLOBAL_SETTINGS: 'global_settings',
  HERO_SECTION: 'hero_section',
  SERVICE_CARDS: 'service_cards',
  SERVICES_BANNER: 'services_banner',
  ADDITIONAL_SERVICES: 'additional_services',
  SERVICE_PROCESS: 'service_process',
  SERVICE_PROCESS_STEPS: 'service_process_steps',
  SPECIALIZED_AREAS: 'specialized_areas',
  PORTFOLIO_PROJECTS: 'portfolio_projects',
  TESTIMONIALS: 'testimonials',
  BLOG_POSTS: 'blog_posts',
  NAVIGATION_ITEMS: 'navigation_items',
  SOCIAL_LINKS: 'social_links',
  FOOTER_LINKS: 'footer_links',
  COMPANY_INFO: 'company_info',
  ABOUT_CONTENT: 'about_content',
  APPOINTMENTS: 'appointments',
  AVAILABLE_TIME_SLOTS: 'available_time_slots',
  SEO_SETTINGS: 'seo_settings',
  PAGE_SEO: 'page_seo',
  WHAT_WE_DO: 'what_we_do',
  CLIENTS: 'clients',
  SITES: 'sites',
  PROJECT_EXECUTIONS: 'projects',
  DOCUMENTS: 'documents',
  DOCUMENT_TYPES: 'document_types',
  PROJECT_TYPES: 'project_types',
  SITE_VISITS: 'site_visits',
  SITE_VISIT_UPDATES: 'site_visit_updates',
  NOTIFICATIONS: 'notifications',
};

export { client, account, databases, storage, teams, functions, Permission, Role, ID, Query };