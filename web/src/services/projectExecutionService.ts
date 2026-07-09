import { databases, COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { Query, ExecutionMethod } from 'appwrite';
import { ProjectExecution, ProjectExecutionStatus } from '@/types/payload-types';
import { callTeamFunction } from './teamService';

const PAGE_SIZE = 9;

export interface ProjectExecutionListParams {
  page?: number;
  status?: ProjectExecutionStatus | 'all';
  search?: string;
  assignedEmail?: string;
}

export interface ProjectExecutionListResult {
  documents: ProjectExecution[];
  total: number;
}

export async function fetchProjectExecutions(
  { page = 0, status = 'all', search = '', assignedEmail }: ProjectExecutionListParams = {}
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
        const codeMatch = p.project_code?.toLowerCase().includes(searchLower);
        const prefixMatch = p.prefix_code?.toLowerCase().includes(searchLower);
        const nameMatch = p.name?.toLowerCase().includes(searchLower);
        const clientMatch = p.client?.toLowerCase().includes(searchLower);
        const addrVal = p.address || (p.location?.includes('|||') ? p.location.split('|||')[0] : p.location);
        const locationMatch = addrVal?.toLowerCase().includes(searchLower);

        return codeMatch || prefixMatch || nameMatch || clientMatch || locationMatch;
      });
    }

    if (assignedEmail) {
      const emailLower = assignedEmail.toLowerCase();
      documents = documents.filter((p) => {
        const eng = p.engineer ? p.engineer.split(',').map((s) => s.trim().toLowerCase()) : [];
        const plan = p.planning_engineer ? p.planning_engineer.split(',').map((s) => s.trim().toLowerCase()) : [];
        const sales = p.sales_manager ? p.sales_manager.split(',').map((s) => s.trim().toLowerCase()) : [];
        return eng.includes(emailLower) || plan.includes(emailLower) || sales.includes(emailLower);
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
  /** Prefix copied from the selected project type; drives the generated project_code. */
  prefix_code: string;
  /** Optional — a project no longer needs a name to be created. */
  name?: string;
  client: string;
  location: string;
  address: string;
  latitude?: number;
  longitude?: number;
  status: ProjectExecutionStatus;
  engineer?: string;
  planning_engineer?: string;
  sales_manager?: string;
  system_size: number;
  contract_value: number;
  start_date: string;
  end_date: string;
  current_stage?: string;
}

/**
 * Returns a non-authoritative preview of the next project code for a prefix, used
 * to fill the read-only Project ID field in the form. The authoritative code is
 * assigned server-side at creation time (see createProjectExecution).
 */
export async function fetchNextProjectCode(prefixCode: string): Promise<string> {
  const result = await callTeamFunction<{ projectCode: string }>(
    `/projects/next-id?prefix=${encodeURIComponent(prefixCode)}`,
    ExecutionMethod.GET
  );
  return result.projectCode;
}

/**
 * Creates a project via the Cloud Function so the project_code is generated and
 * assigned atomically (server-authoritative year + unique-index-protected retry),
 * preventing duplicate IDs when multiple users create projects concurrently.
 */
export async function createProjectExecution(
  input: CreateProjectExecutionInput
): Promise<ProjectExecution> {
  try {
    const { prefix_code, ...projectData } = input;
    const payload = {
      ...projectData,
      start_date: new Date(input.start_date).toISOString(),
      end_date: new Date(input.end_date).toISOString(),
      prefixCode: prefix_code,
    };
    return await callTeamFunction<ProjectExecution>(
      '/projects/create',
      ExecutionMethod.POST,
      payload
    );
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

export async function updateProjectExecution(
  id: string,
  input: Partial<CreateProjectExecutionInput>
): Promise<ProjectExecution> {
  try {
    const payload: Record<string, any> = { ...input };
    if (input.start_date) payload.start_date = new Date(input.start_date).toISOString();
    if (input.end_date) payload.end_date = new Date(input.end_date).toISOString();
    
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECT_EXECUTIONS,
      id,
      payload
    );
    return response as unknown as ProjectExecution;
  } catch (error) {
    console.error('Error updating project execution:', error);
    throw error;
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

export async function fetchProjectExecutionOptions(): Promise<Pick<ProjectExecution, '$id' | 'project_code' | 'prefix_code' | 'name' | 'client' | 'engineer' | 'planning_engineer'>[]> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECT_EXECUTIONS, [
      Query.orderAsc('name'),
      Query.limit(100),
    ]);
    return response.documents.map((doc) => ({
      $id: doc.$id,
      project_code: doc.project_code || null,
      prefix_code: doc.prefix_code || null,
      name: doc.name,
      client: doc.client,
      engineer: doc.engineer || '',
      planning_engineer: doc.planning_engineer || '',
    }));
  } catch (error) {
    console.error('Error fetching project execution options:', error);
    throw error;
  }
}

export async function fetchProjectExecution(id: string): Promise<ProjectExecution> {
  try {
    const doc = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECT_EXECUTIONS,
      id
    );

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
    } as unknown as ProjectExecution;
  } catch (error) {
    console.error('Error fetching project execution:', error);
    throw error;
  }
}

export async function notifyAssignees(emails: string[], projectName: string, projectId?: string) {
  if (emails.length === 0) return;
  try {
    const origin = window.location.origin;
    await callTeamFunction('/projects/assign', ExecutionMethod.POST, {
      assignees: emails,
      projectName,
      projectId,
      origin,
      type: 'project'
    });
  } catch (err) {
    console.error('Failed to notify project assignees:', err);
  }
}

/**
 * The primary identifier to show for a project: its generated Project ID when
 * present, falling back to the name for legacy records that predate codes.
 */
export function projectPrimaryLabel(
  p: { project_code?: string | null; name?: string | null }
): string {
  return p.project_code || p.name || 'Untitled Project';
}

export { PAGE_SIZE as PROJECT_EXECUTION_PAGE_SIZE };
