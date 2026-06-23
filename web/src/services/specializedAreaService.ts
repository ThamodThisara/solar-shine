import { databases, storage, DATABASE_ID, COLLECTIONS, STORAGE_BUCKET_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { SpecializedArea } from '@/types/payload-types';

export async function fetchSpecializedAreas(): Promise<SpecializedArea[]> {
  try {
    console.log('Fetching specialized areas from:', DATABASE_ID, COLLECTIONS.SPECIALIZED_AREAS);
    
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SPECIALIZED_AREAS, [
      Query.orderAsc('order')
    ]);

    console.log('Raw response:', response);

    const areas = response.documents.map(doc => {
      // Construct proper image URL for Appwrite files
      let imageUrl = '';
      if (doc.image) {
        const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
        const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '685bcfb7001103824569';
        imageUrl = `${endpoint}/storage/buckets/${STORAGE_BUCKET_ID}/files/${doc.image}/view?project=${projectId}`;
      }
      
      return {
        ...doc,
        $id: doc.$id,
        image: imageUrl,
      } as unknown as SpecializedArea;
    });

    console.log('Processed areas:', areas);
    return areas;
  } catch (error) {
    console.error('Error fetching specialized areas:', error);
    console.error('Database ID:', DATABASE_ID);
    console.error('Collection ID:', COLLECTIONS.SPECIALIZED_AREAS);
    throw error;
  }
}

async function handleImageData(imageFile: File | null): Promise<string | undefined> {
    if (imageFile && imageFile.size > 0) {
        try {
            console.log('Uploading image file:', imageFile.name, imageFile.size);
            const fileResponse = await storage.createFile(STORAGE_BUCKET_ID, ID.unique(), imageFile);
            console.log('Image uploaded successfully:', fileResponse.$id);
            return fileResponse.$id;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }
    return undefined;
}

export async function addSpecializedArea(formData: FormData): Promise<boolean> {
    try {
        console.log('Adding specialized area with form data:', Object.fromEntries(formData.entries()));
        
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const order = parseInt(formData.get('order') as string) || 1;

        if (!title) {
            console.error('Title is required.');
            return false;
        }

        const data: { title: string; description: string; order: number; image?: string } = {
            title,
            description,
            order,
        };

        const imageFile = formData.get('image') as File | null;
        if (imageFile) {
            const imageId = await handleImageData(imageFile);
            if (imageId) {
                data.image = imageId;
            }
        }

        console.log('Creating document with data:', data);
        const result = await databases.createDocument(DATABASE_ID, COLLECTIONS.SPECIALIZED_AREAS, ID.unique(), data);
        console.log('Document created successfully:', result);
        return true;
    } catch (error) {
        console.error('Error adding specialized area:', error);
        return false;
    }
}

export async function updateSpecializedArea(formData: FormData): Promise<boolean> {
  try {
    console.log('Updating specialized area with form data:', Object.fromEntries(formData.entries()));
    
    const id = formData.get('id') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const order = parseInt(formData.get('order') as string) || 1;

    if (!id || !title) {
      console.error('ID and Title are required.');
      return false;
    }

    const data: { title: string; description: string; order: number; image?: string } = {
      title,
      description,
      order,
    };

    const imageFile = formData.get('image') as File | null;
    if (imageFile) {
        const imageId = await handleImageData(imageFile);
        if (imageId) {
            data.image = imageId;
        }
    }

    console.log('Updating document with data:', data);
    const result = await databases.updateDocument(DATABASE_ID, COLLECTIONS.SPECIALIZED_AREAS, id, data);
    console.log('Document updated successfully:', result);
    return true;
  } catch (error) {
    console.error('Error updating specialized area:', error);
    return false;
  }
}

export async function deleteSpecializedArea(id: string): Promise<boolean> {
  try {
    console.log('Deleting specialized area with ID:', id);
    const result = await databases.deleteDocument(DATABASE_ID, COLLECTIONS.SPECIALIZED_AREAS, id);
    console.log('Document deleted successfully:', result);
    return true;
  } catch (error) {
    console.error('Error deleting specialized area:', error);
    return false;
  }
}
