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

export async function checkProjectsForPrefix(prefixCode: string): Promise<number> {
  try {
    const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECT_EXECUTIONS, [
      Query.equal('prefix_code', prefixCode),
      Query.limit(1),
    ]);
    return res.total;
  } catch (error) {
    console.error('Error checking projects for prefix:', error);
    throw error;
  }
}

export async function updateProjectType(
  id: string,
  input: CreateProjectTypeInput,
  oldPrefixCode: string
): Promise<ProjectType> {
  try {
    // 1. Update the project type record itself
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECT_TYPES,
      id,
      {
        prefix_code: input.prefix_code.trim(),
        service_title: input.service_title.trim(),
      }
    );

    // 2. If prefix_code has changed, fetch and update all projects matching oldPrefixCode
    const newPrefix = input.prefix_code.trim();
    if (oldPrefixCode.toLowerCase() !== newPrefix.toLowerCase()) {
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const projectsRes = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.PROJECT_EXECUTIONS,
          [
            Query.equal('prefix_code', oldPrefixCode),
            Query.limit(limit),
            Query.offset(offset)
          ]
        );

        if (projectsRes.documents.length === 0) {
          hasMore = false;
          break;
        }

        // Update each project
        const promises = projectsRes.documents.map((proj) => {
          const oldCode = proj.project_code || '';
          let newCode = oldCode;
          if (oldCode.startsWith(oldPrefixCode)) {
            newCode = newPrefix + oldCode.substring(oldPrefixCode.length);
          }

          return databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.PROJECT_EXECUTIONS,
            proj.$id,
            {
              prefix_code: newPrefix,
              project_code: newCode
            }
          );
        });

        await Promise.all(promises);

        if (projectsRes.documents.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }
    }

    return response as unknown as ProjectType;
  } catch (error) {
    console.error('Error updating project type:', error);
    throw error;
  }
}
