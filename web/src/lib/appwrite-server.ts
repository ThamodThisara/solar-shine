import { Client, Account, Databases, Storage, Permission, Role } from "appwrite";
import { config } from "dotenv";

// Load environment variables for Node.js scripts
config();

const endpoint = process.env.VITE_APPWRITE_ENDPOINT;
const projectId = process.env.VITE_APPWRITE_PROJECT_ID;

if (!endpoint || !projectId) {
  throw new Error("Appwrite endpoint or project ID is not defined in environment variables.");
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

// Database and Collection IDs
export const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'main';
export const STORAGE_BUCKET_ID = process.env.VITE_APPWRITE_STORAGE_BUCKET_ID || 'media';

// Collection IDs
export const COLLECTIONS = {
  GLOBAL_SETTINGS: 'global_settings',
  HERO_SECTION: 'hero_section',
  SERVICE_CARDS: 'service_cards',
  ADDITIONAL_SERVICES: 'additional_services',
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
  SEO_SETTINGS: 'seo_settings'
};

export { client, account, databases, storage, Permission, Role };
