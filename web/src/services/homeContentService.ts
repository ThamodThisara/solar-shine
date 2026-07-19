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

export const homeContentService = {
  fetchHomeContent,
  updateHomeContent,
};
