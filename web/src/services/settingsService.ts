import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { GlobalSettings } from '@/types/payload-types';

export async function fetchGlobalSettings(): Promise<GlobalSettings | null> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GLOBAL_SETTINGS, [
      Query.limit(1)
    ]);
    if (response.documents.length > 0) {
      const doc = response.documents[0];
      return {
        site_title: doc.site_title,
        site_description: doc.site_description,
        contact_email: doc.contact_email,
        contact_phone: doc.contact_phone,
        address: doc.address,
      } as GlobalSettings;
    }
    return null;
  } catch (error) {
    console.error('Error fetching global settings:', error);
    throw error;
  }
}

export async function updateGlobalSettings(documentId: string, data: Partial<GlobalSettings>): Promise<boolean> {
    try {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.GLOBAL_SETTINGS, documentId, data as any);
        return true;
    } catch (error) {
        console.error('Error updating global settings:', error);
        return false;
    }
}
