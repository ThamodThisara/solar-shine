import { databases, COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { ExecutionMethod, Query } from 'appwrite';
import { callTeamFunction } from './teamService';
import { Lead, LeadSource, LeadStatus } from '@/types/payload-types';
import { LEAD_STATUS_OPTIONS } from '@/lib/leads';

/**
 * Leads are read directly from the database but are read-only to users: every
 * create/update/convert goes through the team-management function, which
 * validates input and enforces the `leads:*` permission keys server-side.
 */

export const LEAD_PAGE_SIZE = 10;

export interface LeadListParams {
  page?: number;
  status?: LeadStatus | 'all';
  /** Only leads assigned to this user $id. */
  assignedTo?: string;
  search?: string;
}

export interface LeadListResult {
  documents: Lead[];
  total: number;
}

export async function fetchLeads(
  { page = 0, status = 'all', assignedTo, search = '' }: LeadListParams = {}
): Promise<LeadListResult> {
  const queries = [
    Query.orderDesc('$createdAt'),
    Query.limit(LEAD_PAGE_SIZE),
    Query.offset(page * LEAD_PAGE_SIZE),
  ];
  if (status !== 'all') queries.push(Query.equal('status', status));
  if (assignedTo) queries.push(Query.equal('assigned_to', assignedTo));

  const term = search.trim();
  if (term) {
    queries.push(
      Query.or([
        Query.search('name', term),
        Query.startsWith('lead_code', term.toUpperCase()),
        Query.startsWith('email', term.toLowerCase()),
        Query.startsWith('phone', term),
      ])
    );
  }

  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.LEADS, queries);
  return { documents: response.documents as unknown as Lead[], total: response.total };
}

export type LeadStats = Record<LeadStatus, number>;

/** Lead counts per pipeline stage, one lightweight count query per status. */
export async function fetchLeadStats(): Promise<LeadStats> {
  const counts = await Promise.all(
    LEAD_STATUS_OPTIONS.map(async ({ value }) => {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.LEADS, [
        Query.equal('status', value),
        Query.limit(1),
      ]);
      return [value, res.total] as const;
    })
  );
  return Object.fromEntries(counts) as LeadStats;
}

export interface LeadInput {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  address?: string;
  source?: LeadSource;
  service_interest?: string;
  message?: string;
  estimated_system_size?: number | null;
  estimated_value?: number | null;
  notes?: string;
  next_follow_up?: string | null;
  assigned_to?: string | null;
}

export interface LeadUpdateInput extends Partial<LeadInput> {
  status?: LeadStatus;
  lost_reason?: string;
}

export function createLead(input: LeadInput): Promise<Lead> {
  return callTeamFunction<Lead>('/leads/create', ExecutionMethod.POST, input);
}

export function updateLead(leadId: string, input: LeadUpdateInput): Promise<Lead> {
  return callTeamFunction<Lead>(`/leads/${leadId}`, ExecutionMethod.PUT, input);
}

export interface ConvertLeadResult {
  lead: Lead;
  client_id: string;
  already_converted?: boolean;
}

/**
 * Converts a lead into a client. Pass `existingClientId` to link the lead to a
 * client that is already registered instead of creating a new one. Safe to
 * retry — the function returns the existing client if conversion already ran.
 */
export function convertLead(leadId: string, existingClientId?: string): Promise<ConvertLeadResult> {
  return callTeamFunction<ConvertLeadResult>(`/leads/${leadId}/convert`, ExecutionMethod.POST, {
    existing_client_id: existingClientId || undefined,
  });
}

export interface WebsiteLeadInput {
  name: string;
  email: string;
  phone?: string;
  service_interest?: string;
  message: string;
  /** Honeypot — must stay empty for real visitors. */
  website?: string;
}

/** Public contact-form submission. Works without a session. */
export async function submitWebsiteLead(input: WebsiteLeadInput): Promise<void> {
  await callTeamFunction('/public/leads', ExecutionMethod.POST, input);
}

export async function fetchLead(leadId: string): Promise<Lead> {
  const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.LEADS, leadId);
  return doc as unknown as Lead;
}
