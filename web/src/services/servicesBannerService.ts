import { client, DATABASE_ID, STORAGE_BUCKET_ID } from '@/lib/appwrite';
import { Databases, Storage } from 'appwrite';
import { ServicesBanner } from '@/types/payload-types';

const databases = new Databases(client);
const storage = new Storage(client);

const COLLECTION_ID = 'services_banner';

// Default copy — mirrors the values that were previously hardcoded on the
// Services page so the public page never renders empty section headings.
export const DEFAULT_SERVICES_CONTENT = {
  services_title: 'Our Services',
  services_description:
    'We provide comprehensive solar solutions tailored to different sectors, each with unique energy requirements and considerations.',
  services_button_text: 'Enquire About This Service',
  services_button_route: '/contact',
  additional_title: 'Additional Services',
  additional_description:
    'Beyond our core offerings, we provide these specialized services to enhance your solar experience.',
  process_title: 'Our Service Process',
  process_description:
    'Our streamlined process ensures a smooth experience from initial consultation to system activation.',
  cta_title: 'Ready to Get Started?',
  cta_description:
    'Contact us today for a free consultation and take the first step towards energy independence.',
  cta_button_text: 'Request a Free Quote',
  cta_button_route: '/contact',
};

// The editable section-content keys stored on the services_banner singleton.
export type ServicesContentFields = Partial<Record<keyof typeof DEFAULT_SERVICES_CONTENT, string>>;

export const fetchServicesBanner = async (): Promise<ServicesBanner | null> => {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID);

    if (response.documents.length > 0) {
      const doc = response.documents[0];
      return {
        $id: doc.$id,
        title: doc.title || '',
        subtitle: doc.subtitle || null,
        background_image: doc.background_image || null,
        services_title: doc.services_title || null,
        services_description: doc.services_description || null,
        services_button_text: doc.services_button_text || null,
        services_button_route: doc.services_button_route || null,
        additional_title: doc.additional_title || null,
        additional_description: doc.additional_description || null,
        process_title: doc.process_title || null,
        process_description: doc.process_description || null,
        cta_title: doc.cta_title || null,
        cta_description: doc.cta_description || null,
        cta_button_text: doc.cta_button_text || null,
        cta_button_route: doc.cta_button_route || null,
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

    return await upsertServicesBanner({
      title: bannerData.title,
      subtitle: bannerData.subtitle,
      background_image: backgroundImageUrl,
    });
  } catch (error) {
    console.error('Error updating services banner:', error);
    return false;
  }
};

// Partial update of the services_banner singleton. Used to persist the editable
// section headings / call-to-action content without touching the banner image.
export const updateServicesContent = async (fields: ServicesContentFields): Promise<boolean> => {
  return upsertServicesBanner(fields);
};

// Find-or-create the singleton services_banner document and partial-update it.
const upsertServicesBanner = async (data: Record<string, string | undefined>): Promise<boolean> => {
  try {
    // Strip undefined values so we never overwrite existing fields with undefined.
    const payload: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) payload[key] = value;
    }

    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID);

    if (response.documents.length > 0) {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        response.documents[0].$id,
        payload
      );
    } else {
      // A title is required by the schema when creating the row.
      if (!payload.title) payload.title = DEFAULT_SERVICES_CONTENT.services_title;
      await databases.createDocument(DATABASE_ID, COLLECTION_ID, 'unique()', payload);
    }

    return true;
  } catch (error) {
    console.error('Error saving services banner:', error);
    return false;
  }
};
