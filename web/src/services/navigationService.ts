import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import { ID } from 'appwrite';
import { NavigationItem } from '@/types/payload-types';

export async function fetchNavigationItems(): Promise<NavigationItem[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.NAVIGATION_ITEMS
    );
    
    if (!response.documents) {
      return [];
    }
    
    return response.documents.map(item => ({
      $id: item.$id,
      title: item.title,
      path: item.path,
      order: item.order
    })).sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Error in fetchNavigationItems:', error);
    return [];
  }
}

export async function updateNavigationItem(item: NavigationItem): Promise<boolean> {
  try {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.NAVIGATION_ITEMS,
      item.$id,
      {
        title: item.title,
        path: item.path,
        order: item.order
      }
    );
    
    return true;
  } catch (error) {
    console.error('Error in updateNavigationItem:', error);
    return false;
  }
}

export async function addNavigationItem(item: { title: string; path: string }): Promise<boolean> {
  try {
    // Get the current max order value
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.NAVIGATION_ITEMS
    );
    
    const maxOrder = response.documents.length > 0 
      ? Math.max(...response.documents.map(doc => doc.order || 0))
      : 0;
    
    const newOrder = maxOrder + 1;
    
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.NAVIGATION_ITEMS,
      ID.unique(),
      {
        title: item.title,
        path: item.path,
        order: newOrder
      }
    );
    
    return true;
  } catch (error) {
    console.error('Error in addNavigationItem:', error);
    return false;
  }
}

export async function deleteNavigationItem(id: string): Promise<boolean> {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.NAVIGATION_ITEMS,
      id
    );
    
    return true;
  } catch (error) {
    console.error('Error in deleteNavigationItem:', error);
    return false;
  }
}
