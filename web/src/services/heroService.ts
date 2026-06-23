import { databases, storage, DATABASE_ID, STORAGE_BUCKET_ID, COLLECTIONS, ID, Query } from '@/lib/appwrite';
import { HeroSection } from '@/types/payload-types';
import { prepareAppwriteData } from '@/lib/utils';

export const fetchHeroSection = async (): Promise<HeroSection | null> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.HERO_SECTION,
      [Query.limit(1)]
    );

    if (response.documents.length > 0) {
      const doc = response.documents[0];
      // Make sure we're extracting fields that actually exist in the schema
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
    console.error('Error fetching hero section:', error);
    // Return null instead of throwing to avoid breaking the UI
    return null;
  }
};

export const updateHeroSection = async (heroData: {
  title: string;
  subtitle: string;
  description: string;
  cta_text: string;
  cta_url: string;
  background_image_url?: string;
  background_image_file?: File;
}): Promise<boolean> => {
  try {
    // Get the existing hero section to check the ID and field structure
    const existingHero = await fetchHeroSection();
    const id = existingHero?.$id;

    // Handle image upload if needed
    let background_image_url = heroData.background_image_url;

    if (heroData.background_image_file) {
      // Upload new background image
      try {
        const fileResponse = await storage.createFile(
          STORAGE_BUCKET_ID,
          ID.unique(),
          heroData.background_image_file
        );
        background_image_url = `${import.meta.env.VITE_APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${fileResponse.$id}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID}`;
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        // Continue with the update even if image upload fails
      }
    }

    // Create the database update object based on the schema
    // Use the utility function to safely prepare the data
    const dbData = prepareAppwriteData({
      title: heroData.title,
      subtitle: heroData.subtitle,
      description: heroData.description,
      cta_text: heroData.cta_text,
      cta_url: heroData.cta_url,
      background_image: background_image_url
    });

    // Check if we have any data to update
    if (Object.keys(dbData).length === 0) {
      console.warn('No valid fields to update for hero section');
      return false;
    }

    try {
      if (id) {
        // Update existing hero section
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.HERO_SECTION, id, dbData);
      } else {
        // Create new hero section - must have title for new documents
        if (!dbData.title) {
          console.error('Title is required for creating a new hero section');
          return false;
        }
        await databases.createDocument(DATABASE_ID, COLLECTIONS.HERO_SECTION, ID.unique(), dbData);
      }
      return true;
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      // Log debugging information
      console.log('Database ID:', DATABASE_ID);
      console.log('Collection:', COLLECTIONS.HERO_SECTION);
      console.log('Fields being updated:', Object.keys(dbData).join(', '));
      return false;
    }
  } catch (error) {
    console.error('Error in updateHeroSection:', error);
    return false;
  }
};

