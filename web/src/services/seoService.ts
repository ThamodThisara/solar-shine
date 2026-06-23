import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';

export interface SEOSettings {
  $id?: string;
  site_title: string;
  site_description: string;
  site_keywords: string;
  author: string;
  site_url: string;
  default_og_image: string;
  twitter_handle: string;
  facebook_app_id: string;
  google_analytics_id: string;
  google_search_console_id: string;
  robots_txt: string;
  sitemap_url: string;
}

export interface PageSEO {
  $id?: string;
  page_path: string;
  page_title: string;
  meta_description: string;
  meta_keywords: string;
  og_title: string;
  og_description: string;
  og_image: string;
  canonical_url: string;
}

export async function fetchSEOSettings(): Promise<SEOSettings | null> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SEO_SETTINGS
    );
    
    if (response.documents.length > 0) {
      const doc = response.documents[0];
      return {
        $id: doc.$id,
        site_title: doc.site_title || '',
        site_description: doc.site_description || '',
        site_keywords: doc.site_keywords || '',
        author: doc.author || '',
        site_url: doc.site_url || '',
        default_og_image: doc.default_og_image || '',
        twitter_handle: doc.twitter_handle || '',
        facebook_app_id: doc.facebook_app_id || '',
        google_analytics_id: doc.google_analytics_id || '',
        google_search_console_id: doc.google_search_console_id || '',
        robots_txt: doc.robots_txt || '',
        sitemap_url: doc.sitemap_url || ''
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching SEO settings:', error);
    throw error;
  }
}

export async function updateSEOSettings(settings: Partial<SEOSettings>): Promise<boolean> {
  try {
    if (settings.$id) {
      // Update existing settings
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.SEO_SETTINGS,
        settings.$id,
        settings
      );
    } else {
      // Create new settings
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.SEO_SETTINGS,
        ID.unique(),
        settings
      );
    }
    
    return true;
  } catch (error) {
    console.error('Error updating SEO settings:', error);
    return false;
  }
}

export async function fetchAllPageSEO(): Promise<PageSEO[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PAGE_SEO
    );
    
    return response.documents.map(doc => ({
      $id: doc.$id,
      page_path: doc.page_path,
      page_title: doc.page_title,
      meta_description: doc.meta_description,
      meta_keywords: doc.meta_keywords,
      og_title: doc.og_title,
      og_description: doc.og_description,
      og_image: doc.og_image,
      canonical_url: doc.canonical_url
    }));
  } catch (error) {
    console.error('Error fetching all page SEO:', error);
    return [];
  }
}

export async function fetchPageSEOByPath(pagePath: string): Promise<PageSEO | null> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PAGE_SEO,
      [Query.equal('page_path', pagePath)]
    );

    if (response.documents.length > 0) {
      const doc = response.documents[0];
      return {
        $id: doc.$id,
        page_path: doc.page_path,
        page_title: doc.page_title,
        meta_description: doc.meta_description,
        meta_keywords: doc.meta_keywords,
        og_title: doc.og_title,
        og_description: doc.og_description,
        og_image: doc.og_image,
        canonical_url: doc.canonical_url
      };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching page SEO for path: ${pagePath}`, error);
    return null;
  }
}

export async function addPageSEO(pageSEO: Omit<PageSEO, '$id'>): Promise<boolean> {
  try {
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PAGE_SEO,
      ID.unique(),
      pageSEO
    );
    
    return true;
  } catch (error) {
    console.error('Error adding page SEO:', error);
    return false;
  }
}

export async function updatePageSEO(pageSEO: PageSEO): Promise<boolean> {
  try {
    if (!pageSEO.$id) {
      return false;
    }
    
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PAGE_SEO,
      pageSEO.$id,
      pageSEO
    );
    
    return true;
  } catch (error) {
    console.error('Error updating page SEO:', error);
    return false;
  }
}

export async function deletePageSEO(id: string): Promise<boolean> {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.PAGE_SEO,
      id
    );
    
    return true;
  } catch (error) {
    console.error('Error deleting page SEO:', error);
    return false;
  }
}
