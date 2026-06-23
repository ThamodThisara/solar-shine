import { databases, COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { ServiceProcessStep } from '@/types/payload-types';

export async function fetchServiceProcessSteps(): Promise<ServiceProcessStep[]> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SERVICE_PROCESS_STEPS);
    return response.documents as ServiceProcessStep[];
  } catch (error) {
    console.error('Error fetching service process steps:', error);
    return [];
  }
}

export async function addServiceProcessStep(step: Omit<ServiceProcessStep, '$id'>): Promise<boolean> {
  try {
    await databases.createDocument(DATABASE_ID, COLLECTIONS.SERVICE_PROCESS_STEPS, ID.unique(), step);
    return true;
  } catch (error) {
    console.error('Error adding service process step:', error);
    return false;
  }
}

export async function updateServiceProcessStep(step: Partial<ServiceProcessStep>): Promise<boolean> {
  try {
    if (!step.$id) return false;
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.SERVICE_PROCESS_STEPS, step.$id, step);
    return true;
  } catch (error) {
    console.error('Error updating service process step:', error);
    return false;
  }
}

export async function deleteServiceProcessStep(id: string): Promise<boolean> {
  try {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.SERVICE_PROCESS_STEPS, id);
    return true;
  } catch (error) {
    console.error('Error deleting service process step:', error);
    return false;
  }
}

export async function reorderServiceProcessSteps(steps: ServiceProcessStep[]): Promise<boolean> {
  try {
    const updates = steps.map((step, index) => ({
      $id: step.$id,
      order_index: index
    }));

    for (const update of updates) {
      await updateServiceProcessStep(update);
    }
    return true;
  } catch (error) {
    console.error('Error reordering service process steps:', error);
    return false;
  }
}
