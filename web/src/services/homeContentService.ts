import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '@/lib/appwrite';

export interface HomeContent {
  $id?: string;
  services_title: string;
  services_description: string;
  specialized_title: string;
  specialized_description: string;
  projects_title: string;
  projects_description: string;
  testimonials_title: string;
  testimonials_description: string;
  blog_title: string;
  blog_description: string;
  appointment_title: string;
  appointment_description: string;
}

// Default copy — mirrors the values that were previously hardcoded on the Home page.
// Used as a fallback when the collection/document does not exist yet so the site
// never renders empty headings.
export const DEFAULT_HOME_CONTENT: HomeContent = {
  services_title: 'Our Services',
  services_description:
    'We provide comprehensive solar energy solutions to meet your renewable energy goals.',
  specialized_title: 'Our Specialized Areas',
  specialized_description:
    'We provide specialized solar solutions across different sectors, each tailored to specific energy requirements and environmental conditions.',
  projects_title: 'Our Recent Projects',
  projects_description:
    'Explore our portfolio of successfully completed solar installations across Sri Lanka.',
  testimonials_title: 'What Our Clients Say',
  testimonials_description:
    'Hear from businesses and homeowners who have experienced the transformative benefits of our solar solutions.',
  blog_title: 'Latest Insights',
  blog_description:
    'Stay updated with the latest news, trends, and innovations in solar energy. Discover cutting-edge solutions and industry insights from our expert team.',
  appointment_title: 'Book an Appointment',
  appointment_description:
    'Schedule a free consultation with our solar experts to discuss your energy needs and discover the best solar solutions for your property.',
};

const CONTENT_KEYS: (keyof HomeContent)[] = [
  'services_title',
  'services_description',
  'specialized_title',
  'specialized_description',
  'projects_title',
  'projects_description',
  'testimonials_title',
  'testimonials_description',
  'blog_title',
  'blog_description',
  'appointment_title',
  'appointment_description',
];

// Merge a raw Appwrite document over the defaults so missing/empty fields fall back gracefully.
const mergeWithDefaults = (doc: Record<string, unknown>): HomeContent => {
  const merged = { ...DEFAULT_HOME_CONTENT } as HomeContent;
  for (const key of CONTENT_KEYS) {
    const value = doc[key];
    if (typeof value === 'string' && value.trim() !== '') {
      (merged[key] as string) = value;
    }
  }
  merged.$id = doc.$id as string | undefined;
  return merged;
};

export const fetchHomeContent = async (): Promise<HomeContent> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.HOME_CONTENT,
      [Query.limit(1)]
    );

    if (response.documents.length > 0) {
      return mergeWithDefaults(response.documents[0] as unknown as Record<string, unknown>);
    }

    return { ...DEFAULT_HOME_CONTENT };
  } catch (error) {
    console.error('Error fetching home content:', error);
    // Never break the public page — fall back to the default copy.
    return { ...DEFAULT_HOME_CONTENT };
  }
};

export const updateHomeContent = async (content: HomeContent): Promise<boolean> => {
  try {
    // Only send the editable string fields (strip $id and any Appwrite metadata).
    const data: Record<string, string> = {};
    for (const key of CONTENT_KEYS) {
      data[key] = content[key] ?? '';
    }

    if (content.$id) {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.HOME_CONTENT,
        content.$id,
        data
      );
    } else {
      // No document exists yet — create the singleton row.
      const result = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.HOME_CONTENT,
        ID.unique(),
        data
      );
      content.$id = result.$id;
    }
    return true;
  } catch (error) {
    console.error('Error updating home content:', error);
    return false;
  }
};

// --- Standalone page headers (Projects & Blog pages) ---------------------------
// These live on the same home_content singleton document but are managed
// independently from the Home page section content above, so the Projects and
// Blog admin managers can edit their page header without touching home content.

export interface PageHeaders {
  $id?: string;
  projects_page_title: string;
  projects_page_description: string;
  blog_page_title: string;
  blog_page_description: string;
}

export const DEFAULT_PAGE_HEADERS: PageHeaders = {
  projects_page_title: 'Our Solar Projects',
  projects_page_description:
    'Explore our portfolio of successfully completed solar installations across various sectors.',
  blog_page_title: 'Solar Energy Insights & News',
  blog_page_description:
    'Stay updated with the latest trends, technologies, and news in the solar energy industry. Discover innovative solutions and industry insights from our expert team.',
};

const PAGE_HEADER_KEYS: (keyof Omit<PageHeaders, '$id'>)[] = [
  'projects_page_title',
  'projects_page_description',
  'blog_page_title',
  'blog_page_description',
];

// Parse the JSON `page_headers` blob stored on the home_content singleton,
// merging over defaults so missing/empty fields fall back gracefully.
const parsePageHeaders = (raw: unknown): Omit<PageHeaders, '$id'> => {
  const merged = { ...DEFAULT_PAGE_HEADERS };
  delete (merged as Partial<PageHeaders>).$id;
  if (typeof raw !== 'string' || raw.trim() === '') return merged;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const key of PAGE_HEADER_KEYS) {
      const value = parsed[key];
      if (typeof value === 'string' && value.trim() !== '') {
        merged[key] = value;
      }
    }
  } catch (error) {
    console.error('Error parsing page headers JSON:', error);
  }
  return merged;
};

export const fetchPageHeaders = async (): Promise<PageHeaders> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.HOME_CONTENT,
      [Query.limit(1)]
    );

    if (response.documents.length > 0) {
      const doc = response.documents[0] as unknown as Record<string, unknown>;
      return { ...parsePageHeaders(doc.page_headers), $id: doc.$id as string | undefined };
    }

    return { ...DEFAULT_PAGE_HEADERS };
  } catch (error) {
    console.error('Error fetching page headers:', error);
    return { ...DEFAULT_PAGE_HEADERS };
  }
};

// Partial update of the page-header fields, persisted as a single JSON blob on
// the home_content singleton (keeps the collection well under its row-size limit).
export const updatePageHeaders = async (
  fields: Partial<Omit<PageHeaders, '$id'>>
): Promise<boolean> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.HOME_CONTENT,
      [Query.limit(1)]
    );

    const existingDoc = response.documents[0] as unknown as Record<string, unknown> | undefined;
    // Merge the incoming fields over whatever is already stored.
    const current = parsePageHeaders(existingDoc?.page_headers);
    const next = { ...current };
    for (const key of PAGE_HEADER_KEYS) {
      const value = fields[key];
      if (typeof value === 'string') next[key] = value;
    }

    const data = { page_headers: JSON.stringify(next) };

    if (existingDoc) {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.HOME_CONTENT,
        existingDoc.$id as string,
        data
      );
    } else {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.HOME_CONTENT,
        ID.unique(),
        data
      );
    }
    return true;
  } catch (error) {
    console.error('Error updating page headers:', error);
    return false;
  }
};

export const homeContentService = {
  fetchHomeContent,
  updateHomeContent,
  fetchPageHeaders,
  updatePageHeaders,
};
