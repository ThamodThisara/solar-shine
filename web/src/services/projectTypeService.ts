import { databases, COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { ProjectType } from '@/types/payload-types';

export async function fetchProjectTypes(): Promise<ProjectType[]> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECT_TYPES, [
      Query.orderAsc('service_title'),
      Query.limit(200),
    ]);
    return response.documents as unknown as ProjectType[];
  } catch (error) {
    console.error('Error fetching project types:', error);
    throw error;
  }
}

export interface CreateProjectTypeInput {
  prefix_code: string;
  service_title: string;
}

export async function createProjectType(input: CreateProjectTypeInput): Promise<ProjectType> {
  try {
    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECT_TYPES,
      ID.unique(),
      {
        prefix_code: input.prefix_code.trim(),
        service_title: input.service_title.trim(),
      },
    );
    return response as unknown as ProjectType;
  } catch (error) {
    console.error('Error creating project type:', error);
    throw error;
  }
}

export async function deleteProjectType(id: string): Promise<boolean> {
  try {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECT_TYPES, id);
    return true;
  } catch (error) {
    console.error('Error deleting project type:', error);
    throw error;
  }
}
