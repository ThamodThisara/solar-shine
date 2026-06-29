import { databases, COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { ProjectExecution, ProjectExecutionStatus } from '@/types/payload-types';

const PAGE_SIZE = 9;

export interface ProjectExecutionListParams {
  page?: number;
  status?: ProjectExecutionStatus | 'all';
  search?: string;
}

export interface ProjectExecutionListResult {
  documents: ProjectExecution[];
  total: number;
}

export async function fetchProjectExecutions(
  { page = 0, status = 'all', search = '' }: ProjectExecutionListParams = {}
): Promise<ProjectExecutionListResult> {
  try {
    const queries = [
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ];

    if (status !== 'all') {
      queries.push(Query.equal('status', status));
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_EXECUTIONS,
      queries
    );

    let documents = response.documents.map((doc: any) => {
      const hasDirectFields = doc.address !== undefined && doc.address !== null;
      let address = doc.address;
      let latitude = doc.latitude;
      let longitude = doc.longitude;
      
      if (!hasDirectFields && doc.location) {
        const parts = doc.location.split('|||');
        address = parts[0]?.trim() || '';
        const mapLink = parts[1]?.trim() || '';
        const match = mapLink.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/) || mapLink.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) {
          latitude = parseFloat(match[1]);
          longitude = parseFloat(match[2]);
        }
      }
      
      return {
        ...doc,
        address: address || null,
        latitude: latitude !== undefined ? latitude : null,
        longitude: longitude !== undefined ? longitude : null
      };
    }) as unknown as ProjectExecution[];

    const trimmedSearch = search.trim();
    if (trimmedSearch) {
      const searchLower = trimmedSearch.toLowerCase();
      documents = documents.filter((p) => {
        const nameMatch = p.name?.toLowerCase().includes(searchLower);
        const clientMatch = p.client?.toLowerCase().includes(searchLower);
        const addrVal = p.address || (p.location?.includes('|||') ? p.location.split('|||')[0] : p.location);
        const locationMatch = addrVal?.toLowerCase().includes(searchLower);

        return nameMatch || clientMatch || locationMatch;
      });
    }

    const total = documents.length;
    const offset = page * PAGE_SIZE;
    const paginatedDocuments = documents.slice(offset, offset + PAGE_SIZE);

    return {
      documents: paginatedDocuments,
      total: total,
    };
  } catch (error) {
    console.error('Error fetching project executions:', error);
    throw error;
  }
}

export interface CreateProjectExecutionInput {
  name: string;
  client: string;
  location: string;
  address: string;
  latitude?: number;
  longitude?: number;
  status: ProjectExecutionStatus;
  engineer?: string;
  sales_manager?: string;
  system_size: number;
  contract_value: number;
  start_date: string;
  end_date: string;
  current_stage?: string;
}

export async function createProjectExecution(
  input: CreateProjectExecutionInput
): Promise<ProjectExecution> {
  try {
    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECT_EXECUTIONS,
      ID.unique(),
      {
        ...input,
        start_date: new Date(input.start_date).toISOString(),
        end_date: new Date(input.end_date).toISOString(),
      }
    );
    return response as unknown as ProjectExecution;
  } catch (error) {
    console.error('Error creating project execution:', error);
    throw error;
  }
}

export async function updateProjectExecutionStatus(
  id: string,
  status: ProjectExecutionStatus
): Promise<boolean> {
  try {
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROJECT_EXECUTIONS, id, { status });
    return true;
  } catch (error) {
    console.error('Error updating project execution status:', error);
    return false;
  }
}

export async function deleteProjectExecution(id: string): Promise<boolean> {
  try {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECT_EXECUTIONS, id);
    return true;
  } catch (error) {
    console.error('Error deleting project execution:', error);
    return false;
  }
}

export interface ProjectExecutionStats {
  pending: number;
  planning: number;
  active: number;
  on_hold: number;
  completed: number;
  cancelled: number;
}

export async function fetchProjectExecutionStats(): Promise<ProjectExecutionStats> {
  const statuses: ProjectExecutionStatus[] = ['pending', 'planning', 'active', 'on_hold', 'completed', 'cancelled'];

  const counts = await Promise.all(
    statuses.map((status) =>
      databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECT_EXECUTIONS, [
        Query.equal('status', status),
        Query.limit(1),
      ])
    )
  );

  return statuses.reduce((acc, status, idx) => {
    acc[status] = counts[idx].total;
    return acc;
  }, {} as ProjectExecutionStats);
}

export async function fetchProjectExecutionOptions(): Promise<Pick<ProjectExecution, '$id' | 'name' | 'client'>[]> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECT_EXECUTIONS, [
      Query.orderAsc('name'),
      Query.limit(100),
    ]);
    return response.documents.map((doc) => ({ $id: doc.$id, name: doc.name, client: doc.client }));
  } catch (error) {
    console.error('Error fetching project execution options:', error);
    throw error;
  }
}

export { PAGE_SIZE as PROJECT_EXECUTION_PAGE_SIZE };
