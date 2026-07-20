import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '@/lib/appwrite';

// The two legal pages managed through the Admin Panel. The value is stored in the
// `page_type` attribute and used to look up / upsert the correct document.
export type LegalPageType = 'privacy_policy' | 'terms_of_service';

export interface LegalPage {
  $id?: string;
  page_type: LegalPageType;
  title: string;
  // Rich-text content stored as HTML (produced by the admin editor).
  content: string;
}

// Minimal fallback copy so the public pages never render empty before an
// administrator has published real content through the Admin Panel.
export const DEFAULT_LEGAL_PAGES: Record<LegalPageType, LegalPage> = {
  privacy_policy: {
    page_type: 'privacy_policy',
    title: 'Privacy Policy',
    content:
      '<p>Our Privacy Policy is being updated. Please check back soon or contact us for more information.</p>',
  },
  terms_of_service: {
    page_type: 'terms_of_service',
    title: 'Terms of Service',
    content:
      '<p>Our Terms of Service are being updated. Please check back soon or contact us for more information.</p>',
  },
};

// Map a raw Appwrite document onto our typed shape, falling back to defaults
// for any missing/empty field so the UI always has something sensible to show.
const mapDocument = (
  type: LegalPageType,
  doc: Record<string, unknown>
): LegalPage => {
  const fallback = DEFAULT_LEGAL_PAGES[type];
  const title = typeof doc.title === 'string' && doc.title.trim() !== '' ? doc.title : fallback.title;
  const content =
    typeof doc.content === 'string' && doc.content.trim() !== '' ? doc.content : fallback.content;
  return {
    $id: doc.$id as string | undefined,
    page_type: type,
    title,
    content,
  };
};

// Fetch the content for a single legal page. Never throws — on any error it
// returns the default copy so the public site keeps working.
export const fetchLegalPage = async (type: LegalPageType): Promise<LegalPage> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.LEGAL_PAGES,
      [Query.equal('page_type', type), Query.limit(1)]
    );

    if (response.documents.length > 0) {
      return mapDocument(type, response.documents[0] as unknown as Record<string, unknown>);
    }

    return { ...DEFAULT_LEGAL_PAGES[type] };
  } catch (error) {
    console.error(`Error fetching legal page "${type}":`, error);
    return { ...DEFAULT_LEGAL_PAGES[type] };
  }
};

// Upsert a legal page: update the existing document when we have its id,
// otherwise create the single row for that page type.
export const updateLegalPage = async (page: LegalPage): Promise<boolean> => {
  try {
    const data = {
      page_type: page.page_type,
      title: page.title ?? '',
      content: page.content ?? '',
    };

    if (page.$id) {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.LEGAL_PAGES,
        page.$id,
        data
      );
    } else {
      const result = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.LEGAL_PAGES,
        ID.unique(),
        data
      );
      page.$id = result.$id;
    }
    return true;
  } catch (error) {
    console.error(`Error updating legal page "${page.page_type}":`, error);
    return false;
  }
};

export const legalPageService = {
  fetchLegalPage,
  updateLegalPage,
};
