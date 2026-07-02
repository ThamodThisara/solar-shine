import { databases, COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { ID, Query, ExecutionMethod } from 'appwrite';
import { callTeamFunction } from './teamService';
import {
  SiteVisit,
  SiteVisitPriority,
  SiteVisitStatus,
  SiteVisitUpdate,
  SiteVisitUpdateType,
} from '@/types/payload-types';

const PAGE_SIZE = 9;

export interface SiteVisitListParams {
  page?: number;
  projectId?: string;
  /** Limit to visits assigned to a specific engineer (their user $id). */
  assignedEngineerId?: string;
  /**
   * Filter by assignment relative to `userId`:
   * `'mine'` = assigned to `userId`, `'unassigned'` = no assignee, `'all'`/unset = no filter.
   */
  assignment?: 'all' | 'mine' | 'unassigned';
  /** Current user's $id, used to resolve `assignment: 'mine'`. */
  userId?: string;
  status?: SiteVisitStatus | 'all';
  search?: string;
}

export interface SiteVisitListResult {
  documents: SiteVisit[];
  total: number;
}

export async function fetchSiteVisits(
  { page = 0, projectId, assignedEngineerId, assignment = 'all', userId, status = 'all', search = '' }: SiteVisitListParams = {}
): Promise<SiteVisitListResult> {
  try {
    const queries = [
      Query.orderDesc('created_at'),
      Query.limit(100),
    ];
    if (projectId) queries.push(Query.equal('project_id', projectId));
    if (status && status !== 'all') queries.push(Query.equal('status', status));

    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SITE_VISITS, queries);
    let documents = response.documents as unknown as SiteVisit[];

    // In-memory filter for assignment
    if (assignment === 'mine' && userId) {
      documents = documents.filter((doc) => {
        const ids = doc.assigned_engineer_id
          ? doc.assigned_engineer_id.split(',').map((s) => s.trim())
          : [];
        return ids.includes(userId);
      });
    } else if (assignment === 'unassigned') {
      documents = documents.filter((doc) => !doc.assigned_engineer_id);
    }

    if (assignedEngineerId) {
      documents = documents.filter((doc) => {
        const ids = doc.assigned_engineer_id
          ? doc.assigned_engineer_id.split(',').map((s) => s.trim())
          : [];
        return ids.includes(assignedEngineerId);
      });
    }

    // In-memory filter for search (on title)
    const trimmedSearch = search.trim().toLowerCase();
    if (trimmedSearch) {
      documents = documents.filter((doc) => doc.title?.toLowerCase().includes(trimmedSearch));
    }

    const total = documents.length;
    const offset = page * PAGE_SIZE;
    const paginatedDocuments = documents.slice(offset, offset + PAGE_SIZE);

    return {
      documents: paginatedDocuments,
      total,
    };
  } catch (error) {
    console.error('Error fetching site visits:', error);
    throw error;
  }
}

/** Fetches every site visit for a project (used by the Document Center view). */
export async function fetchSiteVisitsByProject(projectId: string): Promise<SiteVisit[]> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SITE_VISITS, [
      Query.equal('project_id', projectId),
      Query.orderDesc('created_at'),
      Query.limit(100),
    ]);
    return response.documents as unknown as SiteVisit[];
  } catch (error) {
    console.error('Error fetching site visits by project:', error);
    throw error;
  }
}

export async function fetchSiteVisit(id: string): Promise<SiteVisit> {
  const response = await databases.getDocument(DATABASE_ID, COLLECTIONS.SITE_VISITS, id);
  return response as unknown as SiteVisit;
}

export interface CreateSiteVisitInput {
  project_id: string;
  title: string;
  reason: string;
  /** Optional — omit/leave empty to create an unassigned (shared pool) visit. */
  assigned_engineer_id?: string;
  assigned_engineer_name?: string;
  issue_observation?: string;
  description?: string;
  priority: SiteVisitPriority;
  visit_date?: string;
  expected_completion_date?: string;
  location_details?: string;
  status: SiteVisitStatus;
  additional_notes?: string;
  created_by: string;
}

export async function createSiteVisit(input: CreateSiteVisitInput): Promise<SiteVisit> {
  try {
    const now = new Date().toISOString();
    const response = await databases.createDocument(DATABASE_ID, COLLECTIONS.SITE_VISITS, ID.unique(), {
      project_id: input.project_id,
      title: input.title,
      reason: input.reason,
      assigned_engineer_id: input.assigned_engineer_id ?? null,
      assigned_engineer_name: input.assigned_engineer_name ?? null,
      issue_observation: input.issue_observation ?? null,
      description: input.description ?? null,
      priority: input.priority,
      visit_date: input.visit_date ? new Date(input.visit_date).toISOString() : null,
      expected_completion_date: input.expected_completion_date
        ? new Date(input.expected_completion_date).toISOString()
        : null,
      location_details: input.location_details ?? null,
      status: input.status,
      additional_notes: input.additional_notes ?? null,
      findings: null,
      created_by: input.created_by,
      created_at: now,
      updated_at: now,
    });
    return response as unknown as SiteVisit;
  } catch (error) {
    console.error('Error creating site visit:', error);
    throw error;
  }
}

/** Fields an engineer (or admin) may patch on an existing site visit. */
export interface UpdateSiteVisitInput {
  title?: string;
  reason?: string;
  issue_observation?: string | null;
  description?: string | null;
  priority?: SiteVisitPriority;
  visit_date?: string | null;
  expected_completion_date?: string | null;
  location_details?: string | null;
  status?: SiteVisitStatus;
  additional_notes?: string | null;
  findings?: string | null;
  assigned_engineer_id?: string;
  assigned_engineer_name?: string | null;
}

export async function updateSiteVisit(id: string, input: UpdateSiteVisitInput): Promise<SiteVisit> {
  try {
    const payload: Record<string, unknown> = { ...input, updated_at: new Date().toISOString() };
    if (input.visit_date) payload.visit_date = new Date(input.visit_date).toISOString();
    if (input.expected_completion_date) {
      payload.expected_completion_date = new Date(input.expected_completion_date).toISOString();
    }
    const response = await databases.updateDocument(DATABASE_ID, COLLECTIONS.SITE_VISITS, id, payload);
    return response as unknown as SiteVisit;
  } catch (error) {
    console.error('Error updating site visit:', error);
    throw error;
  }
}

export async function deleteSiteVisit(id: string): Promise<boolean> {
  try {
    // Best-effort cascade of the activity history; documents are intentionally
    // left intact so they remain available in the Document Center.
    const updates = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SITE_VISIT_UPDATES, [
      Query.equal('site_visit_id', id),
      Query.limit(100),
    ]);
    await Promise.all(
      updates.documents.map((u) =>
        databases.deleteDocument(DATABASE_ID, COLLECTIONS.SITE_VISIT_UPDATES, u.$id).catch(() => {})
      )
    );
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.SITE_VISITS, id);
    return true;
  } catch (error) {
    console.error('Error deleting site visit:', error);
    return false;
  }
}

export interface SiteVisitStats {
  scheduled: number;
  in_progress: number;
  on_hold: number;
  completed: number;
  cancelled: number;
}

export async function fetchSiteVisitStats(assignedEngineerId?: string): Promise<SiteVisitStats> {
  const statuses: SiteVisitStatus[] = ['scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled'];

  const counts = await Promise.all(
    statuses.map((status) => {
      const queries = [Query.equal('status', status), Query.limit(1)];
      if (assignedEngineerId) queries.push(Query.equal('assigned_engineer_id', assignedEngineerId));
      return databases.listDocuments(DATABASE_ID, COLLECTIONS.SITE_VISITS, queries);
    })
  );

  return statuses.reduce((acc, status, idx) => {
    acc[status] = counts[idx].total;
    return acc;
  }, {} as SiteVisitStats);
}

/* -------------------------------------------------------------------------- */
/* Activity history (site_visit_updates)                                       */
/* -------------------------------------------------------------------------- */

export async function fetchSiteVisitUpdates(siteVisitId: string): Promise<SiteVisitUpdate[]> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SITE_VISIT_UPDATES, [
      Query.equal('site_visit_id', siteVisitId),
      Query.orderDesc('created_at'),
      Query.limit(100),
    ]);
    return response.documents as unknown as SiteVisitUpdate[];
  } catch (error) {
    console.error('Error fetching site visit updates:', error);
    throw error;
  }
}

export interface AddSiteVisitUpdateInput {
  site_visit_id: string;
  project_id?: string;
  author_id: string;
  author_name?: string;
  update_type: SiteVisitUpdateType;
  content: string;
}

export async function addSiteVisitUpdate(input: AddSiteVisitUpdateInput): Promise<SiteVisitUpdate> {
  try {
    const response = await databases.createDocument(DATABASE_ID, COLLECTIONS.SITE_VISIT_UPDATES, ID.unique(), {
      site_visit_id: input.site_visit_id,
      project_id: input.project_id ?? null,
      author_id: input.author_id,
      author_name: input.author_name ?? null,
      update_type: input.update_type,
      content: input.content,
      created_at: new Date().toISOString(),
    });
    return response as unknown as SiteVisitUpdate;
  } catch (error) {
    console.error('Error adding site visit update:', error);
    throw error;
  }
}

export async function notifySiteVisitAssignees(emails: string[], visitTitle: string, projectName: string, projectId: string) {
  if (emails.length === 0) return;
  try {
    const origin = window.location.origin;
    await callTeamFunction('/projects/assign', ExecutionMethod.POST, {
      assignees: emails,
      projectName,
      visitTitle,
      projectId,
      origin,
      type: 'site_visit'
    });
  } catch (err) {
    console.error('Failed to notify site visit assignees:', err);
  }
}

export { PAGE_SIZE as SITE_VISIT_PAGE_SIZE };
