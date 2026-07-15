export interface GlobalSettings {
  site_title: string;
  site_description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
}

export interface HeroSection {
  $id?: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cta_text: string | null;
  cta_url: string | null;
  background_image: string | null;
}

export interface ServicesBanner {
  $id?: string;
  title: string;
  subtitle: string | null;
  background_image: string | null;
}

export interface ServiceCard {
  $id: string;
  title: string;
  description: string | null;
  link_url?: string;
  order_index?: number;
  // Additional fields to match hardcoded services
  image?: string | null;
  benefits?: string[];
  features?: string[]; // Store as formatted strings: "Name: Description"
  service_type?: 'main' | 'additional'; // To distinguish between main services and additional services
}

export interface AdditionalService {
  $id: string;
  title: string;
  description: string | null;
  icon: string; // Store the icon name (e.g., "Sun", "Battery", "Wrench")
  order_index?: number;
}

export interface ServiceProcessStep {
  $id: string;
  number: string; // e.g., "01", "02", "03"
  title: string;
  description: string;
  order_index: number;
}

export interface ServiceProcess {
  $id: string;
  title: string;
  subtitle: string | null;
  steps: ServiceProcessStep[];
}

export interface SpecializedArea {
  $id: string;
  title: string;
  description: string | null;
  image: string | null;
  order: number | null;
}

export interface Project {
  $id: string;
  title: string;
  category: string; // Allow dynamic categories
  description: string | null;
  image_url: string | null;
  client: string | null;
  completion_date: string | null; // Match the field name used in Projects page
}

export type ProjectExecutionStatus =
  | "pending"
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

export interface ProjectExecution {
  $id: string;
  $createdAt: string;
  /** Structured human-readable identifier, e.g. "PRO-2026-0004". Null for legacy records. */
  project_code: string | null;
  /** Prefix code copied from the selected project type, e.g. "PRO". Null for legacy records. */
  prefix_code: string | null;
  name: string;
  client: string;
  /** Reference to the Clients collection document ($id) for the selected client. */
  clientId: string | null;
  /** Reference to the Sites collection document ($id) for the selected site. */
  siteId: string | null;
  siteCode: string | null;
  siteName: string | null;
  location: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  engineer: string | null;
  planning_engineer: string | null;
  sales_manager: string | null;
  status: ProjectExecutionStatus;
  system_size: number;
  contract_value: number;
  start_date: string;
  end_date: string;
  current_stage: string | null;
}

export type DocumentVisibility = "internal" | "client_facing";
export type DocumentStatus = "Active" | "Archived";
export type Department = "Marketing" | "Sales" | "Finance" | "Engineering" | "HR";

export interface DocumentType {
  $id: string;
  /** Short type code/label, e.g. "D1". */
  type: string;
  /** Human-readable name, e.g. "Site Inspection Sheet". */
  name: string;
  /**
   * @deprecated Superseded by `departments`. Retained only so rows written
   * before the multi-department migration keep resolving; read through
   * `getTypeDepartments` rather than touching this directly.
   */
  department?: string | null;
  /**
   * Departments this type is available under, e.g. ["engineer", "sales"].
   * The single value "all" is a sentinel meaning every department. Note this
   * is the lowercase document-type taxonomy, which is distinct from the
   * capitalized `Department` union used on Document records.
   */
  departments?: string[] | null;
}

export interface ProjectType {
  $id: string;
  /** Short prefix code, e.g. "PRO", "FAR", "REN". */
  prefix_code: string;
  /** Human-readable service title, e.g. "Professional Service (Operations & Maintenance)". */
  service_title: string;
}

export interface DocumentRecord {
  $id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  file_id: string;
  file_size: number;
  file_type: string;
  document_visibility: DocumentVisibility;
  department: Department | null;
  allowed_departments?: string[] | null;
  allowed_users?: string[] | null;
  /** Foreign key referencing a DocumentType ($id). */
  document_type_id: string;
  /**
   * Optional foreign key referencing a SiteVisit ($id). Set when the document
   * was uploaded through the Site Visits module; null/absent for ordinary
   * project documents.
   */
  site_visit_id: string | null;
  uploaded_by: string;
  uploaded_at: string;
  updated_at: string | null;
  status: DocumentStatus;
}

/** Priority of a site visit / inspection. */
export type SiteVisitPriority = "low" | "medium" | "high" | "critical";

/** Lifecycle status of a site visit. */
export type SiteVisitStatus =
  | "scheduled"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";

/**
 * A site visit / inspection raised against a project. Admins create and assign
 * them to an engineer; engineers record findings, progress, and documents.
 */
export interface SiteVisit {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  /** Foreign key referencing a project ($id) in the `projects` collection. */
  project_id: string;
  title: string;
  /** Why the visit was raised (provided by the admin on creation). */
  reason: string;
  /** User $id of the engineer the visit is assigned to, or null when unassigned. */
  assigned_engineer_id: string | null;
  /** Denormalised engineer name for display without an extra lookup. */
  assigned_engineer_name: string | null;
  issue_observation: string | null;
  description: string | null;
  priority: SiteVisitPriority;
  visit_date: string | null;
  expected_completion_date: string | null;
  location_details: string | null;
  status: SiteVisitStatus;
  additional_notes: string | null;
  /** Engineer's consolidated findings / observations. */
  findings: string | null;
  /** User $id of the admin who created the visit. */
  created_by: string;
  created_at: string;
  updated_at: string | null;
}

/** Kind of activity entry recorded against a site visit. */
export type SiteVisitUpdateType =
  | "progress"
  | "finding"
  | "observation"
  | "status_change"
  | "note";

/** A single entry in a site visit's activity / progress history. */
export interface SiteVisitUpdate {
  $id: string;
  $createdAt: string;
  /** Foreign key referencing a SiteVisit ($id). */
  site_visit_id: string;
  /** Denormalised project id for convenient cross-referencing. */
  project_id: string | null;
  author_id: string;
  author_name: string | null;
  update_type: SiteVisitUpdateType;
  content: string;
  created_at: string;
}

export interface Testimonial {
  $id: string;
  text: string;
  author: string;
  position: string | null;
  company?: string;
  rating?: number;
}

export interface BlogPost {
  $id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  author?: string;
  publishDate?: string;
  published?: boolean;
  featured_image?: string; // URL for display
  featured_image_id?: string; // ID for storage
  categories?: string[];
  tags?: string[];
}

export interface NavigationItem {
  $id: string;
  title: string;
  path: string;
  order: number;
}

export interface SocialLink {
  $id: string;
  name: string;
  icon: string;
  url: string;
  order?: number;
}

export interface FooterLink {
  $id: string;
  name: string;
  url: string;
  category: string;
}

export interface CompanyInfo {
  $id: string;
  name: string;
  description: string;
  website?: string;
  logo_url?: string;
  businessHours?: string;
}

export interface AboutContent {
  $id:string;
  title: string;
  subtitle: string;
  content: string;
  mission_statement?: string;
  vision_statement?: string;
  main_image?: string;
  main_image_id?: string;
  image_one?: string;
  image_one_id?: string;
  image_two?: string;
  image_two_id?: string;
  team_members?: { name: string; position: string; bio: string; image_id?: string; image?: string }[];
}

export interface SEO {
  $id: string;
  title: string;
  description: string;
  keywords: string[];
  robots: string;
  canonical: string;
  og_title: string;
  og_description: string;
  og_image: string;
  twitter_title: string;
  twitter_description: string;
  twitter_image: string;
}

export interface Notification {
  $id: string;
  $createdAt: string;
  user_id: string;
  title: string;
  content: string;
  read: boolean;
  link: string;
}
