import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import { ID, Query } from '@/lib/appwrite';
import { Testimonial } from '@/types/payload-types';

export async function fetchTestimonials(): Promise<Testimonial[]> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TESTIMONIALS, [
      Query.orderDesc('$createdAt')
    ]);
    return response.documents.map(doc => ({
        $id: doc.$id,
        text: doc.text,
        author: doc.author,
        position: doc.position,
    })) as unknown as Testimonial[];
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    throw error;
  }
}

export async function updateTestimonial(testimonial: Testimonial): Promise<boolean> {
  try {
    const { $id, text, author, position } = testimonial;
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.TESTIMONIALS, $id, { text, author, position });
    return true;
  } catch (error) {
    console.error('Error updating testimonial:', error);
    return false;
  }
}

export async function addTestimonial(testimonial: { text: string; author: string; position: string }): Promise<boolean> {
  try {
    await databases.createDocument(DATABASE_ID, COLLECTIONS.TESTIMONIALS, ID.unique(), testimonial);
    return true;
  } catch (error) {
    console.error('Error adding testimonial:', error);
    return false;
  }
}

export async function deleteTestimonial(id: string): Promise<boolean> {
  try {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.TESTIMONIALS, id);
    return true;
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    return false;
  }
}
