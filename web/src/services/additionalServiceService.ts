import { databases, COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { AdditionalService } from '@/types/payload-types';

export async function fetchAdditionalServices(): Promise<AdditionalService[]> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ADDITIONAL_SERVICES);
    return response.documents as AdditionalService[];
  } catch (error) {
    console.error('Error fetching additional services:', error);
    return [];
  }
}

export async function addAdditionalService(service: Omit<AdditionalService, '$id'>): Promise<boolean> {
  try {
    await databases.createDocument(DATABASE_ID, COLLECTIONS.ADDITIONAL_SERVICES, ID.unique(), service);
    return true;
  } catch (error) {
    console.error('Error adding additional service:', error);
    return false;
  }
}

export async function updateAdditionalService(service: Partial<AdditionalService>): Promise<boolean> {
  try {
    if (!service.$id) return false;
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.ADDITIONAL_SERVICES, service.$id, service);
    return true;
  } catch (error) {
    console.error('Error updating additional service:', error);
    return false;
  }
}

export async function deleteAdditionalService(id: string): Promise<boolean> {
  try {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.ADDITIONAL_SERVICES, id);
    return true;
  } catch (error) {
    console.error('Error deleting additional service:', error);
    return false;
  }
}

