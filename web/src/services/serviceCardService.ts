import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import { ID, Query } from '@/lib/appwrite';
import { ServiceCard } from '@/types/payload-types';

export async function fetchServiceCards(): Promise<ServiceCard[]> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SERVICE_CARDS, [
      Query.orderAsc('order_index')
    ]);
    return response.documents as unknown as ServiceCard[];
  } catch (error) {
    console.error('Error fetching service cards:', error);
    throw error;
  }
}

export async function updateServiceCard(serviceCard: Partial<ServiceCard>): Promise<boolean> {
  try {
    if (!serviceCard.$id) throw new Error('Service card ID is required for update.');
    const { $id, ...data } = serviceCard;
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.SERVICE_CARDS, $id, data);
    return true;
  } catch (error) {
    console.error('Error updating service card:', error);
    return false;
  }
}

export async function addServiceCard(serviceCard: Omit<ServiceCard, '$id'>): Promise<boolean> {
  try {
    await databases.createDocument(DATABASE_ID, COLLECTIONS.SERVICE_CARDS, ID.unique(), serviceCard);
    return true;
  } catch (error) {
    console.error('Error adding service card:', error);
    return false;
  }
}

export async function deleteServiceCard(id: string): Promise<boolean> {
  try {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.SERVICE_CARDS, id);
    return true;
  } catch (error) {
    console.error('Error deleting service card:', error);
    return false;
  }
}
