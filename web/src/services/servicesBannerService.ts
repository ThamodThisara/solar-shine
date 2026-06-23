import { client, DATABASE_ID, STORAGE_BUCKET_ID } from '@/lib/appwrite';
import { Databases, Storage } from 'appwrite';
import { ServicesBanner } from '@/types/payload-types';

const databases = new Databases(client);
const storage = new Storage(client);

const COLLECTION_ID = 'services_banner';

export const fetchServicesBanner = async (): Promise<ServicesBanner | null> => {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID);
    
    if (response.documents.length > 0) {
      const doc = response.documents[0];
      return {
        $id: doc.$id,
        title: doc.title || '',
        subtitle: doc.subtitle || null,
        description: doc.description || null,
        cta_text: doc.cta_text || null,
        cta_url: doc.cta_url || null,
        background_image: doc.background_image || null,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching services banner:', error);
    return null;
  }
};

export const updateServicesBanner = async (bannerData: {
  title: string;
  subtitle: string;
  background_image_url?: string;
  background_image_file?: File;
}): Promise<boolean> => {
  try {
    let backgroundImageUrl = bannerData.background_image_url;

    // Handle new image upload if provided
    if (bannerData.background_image_file) {
      const uploadedFile = await storage.createFile(
        STORAGE_BUCKET_ID,
        `services-banner-${Date.now()}`,
        bannerData.background_image_file
      );
      backgroundImageUrl = uploadedFile.$id;
    }

    // Check if banner exists
    const existingBanner = await fetchServicesBanner();
    
    if (existingBanner) {
      // Update existing banner
              await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_ID,
          existingBanner.$id!,
          {
            title: bannerData.title,
            subtitle: bannerData.subtitle,
            background_image: backgroundImageUrl,
          }
        );
    } else {
      // Create new banner
              await databases.createDocument(
          DATABASE_ID,
          COLLECTION_ID,
          'unique()',
          {
            title: bannerData.title,
            subtitle: bannerData.subtitle,
            background_image: backgroundImageUrl,
          }
        );
    }

    return true;
  } catch (error) {
    console.error('Error updating services banner:', error);
    return false;
  }
};
