import { databases, COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { ExecutionMethod, Query } from 'appwrite';
import { callTeamFunction } from './teamService';
import { Quotation, QuotationItem, QuotationStatus } from '@/types/payload-types';
import { QUOTATION_STATUS_OPTIONS } from '@/lib/quotations';

/**
 * Quotations are read directly but are read-only to users: every write goes
 * through the team-management function, which computes all totals server-side,
 * enforces the approval workflow, and checks the `quotations:*` permissions.
 */

export const QUOTATION_PAGE_SIZE = 10;

export interface QuotationListParams {
  page?: number;
  status?: QuotationStatus | 'all';
  search?: string;
}

export interface QuotationListResult {
  documents: Quotation[];
  total: number;
}

export async function fetchQuotations(
  { page = 0, status = 'all', search = '' }: QuotationListParams = {}
): Promise<QuotationListResult> {
  const queries = [
    Query.orderDesc('$createdAt'),
    Query.limit(QUOTATION_PAGE_SIZE),
    Query.offset(page * QUOTATION_PAGE_SIZE),
  ];
  if (status !== 'all') queries.push(Query.equal('status', status));

  const term = search.trim();
  if (term) {
    queries.push(
      Query.or([Query.startsWith('quotation_code', term.toUpperCase()), Query.search('client_name', term)])
    );
  }

  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.QUOTATIONS, queries);
  return { documents: response.documents as unknown as Quotation[], total: response.total };
}

export type QuotationStats = Record<QuotationStatus, number>;

export async function fetchQuotationStats(): Promise<QuotationStats> {
  const counts = await Promise.all(
    QUOTATION_STATUS_OPTIONS.map(async ({ value }) => {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.QUOTATIONS, [
        Query.equal('status', value),
        Query.limit(1),
      ]);
      return [value, res.total] as const;
    })
  );
  return Object.fromEntries(counts) as QuotationStats;
}

export async function fetchQuotationItems(quotationId: string): Promise<QuotationItem[]> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.QUOTATION_ITEMS, [
    Query.equal('quotation_id', quotationId),
    Query.orderAsc('sort_order'),
    Query.limit(100),
  ]);
  return response.documents as unknown as QuotationItem[];
}

export interface QuotationLineInput {
  product_id?: string | null;
  description: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  discount?: number;
}

export interface QuotationInput {
  client_id?: string | null;
  lead_id?: string | null;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  valid_until?: string | null;
  tax_rate?: number;
  notes?: string;
  terms?: string;
  items: QuotationLineInput[];
}

export type QuotationWithItems = Quotation & { items: QuotationItem[] };

export function createQuotation(input: QuotationInput): Promise<QuotationWithItems> {
  return callTeamFunction<QuotationWithItems>('/quotations/create', ExecutionMethod.POST, input);
}

export function updateQuotation(id: string, input: QuotationInput): Promise<QuotationWithItems> {
  return callTeamFunction<QuotationWithItems>(`/quotations/${id}`, ExecutionMethod.PUT, input);
}

export function deleteQuotation(id: string): Promise<{ success: boolean }> {
  return callTeamFunction(`/quotations/${id}`, ExecutionMethod.DELETE);
}

const action = (id: string, name: string, body?: unknown) =>
  callTeamFunction<Quotation>(`/quotations/${id}/${name}`, ExecutionMethod.POST, body ?? {});

export const submitQuotation = (id: string) => action(id, 'submit');
export const approveQuotation = (id: string) => action(id, 'approve');
export const rejectQuotation = (id: string, reason: string) => action(id, 'reject', { reason });

export interface SendQuotationResult {
  quotation: Quotation;
  /** Link the customer opens to review the quotation — also shareable by hand (e.g. WhatsApp). */
  review_url: string;
  email_sent: boolean;
  email_error: string | null;
}

export function sendQuotation(id: string): Promise<SendQuotationResult> {
  return callTeamFunction<SendQuotationResult>(`/quotations/${id}/send`, ExecutionMethod.POST, {});
}

export interface ConvertQuotationInput {
  prefix_code: string;
  name?: string;
  location: string;
  address?: string;
  start_date: string;
  end_date: string;
  system_size?: number;
}

export interface ConvertQuotationResult {
  success: boolean;
  project_id: string;
  project_code: string;
  already_converted?: boolean;
  recovered?: boolean;
}

export function convertQuotation(id: string, input: ConvertQuotationInput): Promise<ConvertQuotationResult> {
  return callTeamFunction<ConvertQuotationResult>(`/quotations/${id}/convert`, ExecutionMethod.POST, {
    ...input,
    start_date: new Date(input.start_date).toISOString(),
    end_date: new Date(input.end_date).toISOString(),
  });
}

export interface QuotationPdf {
  filename: string;
  base64: string;
}

export function fetchQuotationPdf(id: string): Promise<QuotationPdf> {
  return callTeamFunction<QuotationPdf>(`/quotations/${id}/pdf`, ExecutionMethod.GET);
}

// ─── Customer review (public, no session — the token in the link is the credential) ───

export interface PublicQuotation {
  quotation_code: string;
  status: QuotationStatus;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  valid_until: string | null;
  issued_at: string;
  tax_rate: number | null;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  notes: string | null;
  terms: string | null;
  items: Array<Pick<QuotationItem, 'description' | 'quantity' | 'unit' | 'unit_price' | 'discount' | 'line_total'>>;
}

export function fetchPublicQuotation(token: string): Promise<PublicQuotation> {
  return callTeamFunction<PublicQuotation>(`/public/quotations/${token}`, ExecutionMethod.GET);
}

export function fetchPublicQuotationPdf(token: string): Promise<QuotationPdf> {
  return callTeamFunction<QuotationPdf>(`/public/quotations/${token}/pdf`, ExecutionMethod.GET);
}

export function respondToQuotation(token: string, response: 'accepted' | 'declined', comment?: string) {
  return callTeamFunction<{ success: boolean; response: string }>(
    `/public/quotations/${token}/respond`,
    ExecutionMethod.POST,
    { response, comment }
  );
}
