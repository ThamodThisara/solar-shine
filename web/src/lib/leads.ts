import { LeadSource, LeadStatus } from '@/types/payload-types';

// Keep in sync with LEAD_STATUSES / LEAD_SOURCES in functions/team-management/src/routes/leads.js.

export const LEAD_STATUS_OPTIONS: Array<{ value: LeadStatus; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

/** Statuses a user can pick directly — "won" is set by converting the lead. */
export const EDITABLE_LEAD_STATUS_OPTIONS = LEAD_STATUS_OPTIONS.filter((s) => s.value !== 'won');

export const LEAD_SOURCE_OPTIONS: Array<{ value: LeadSource; label: string }> = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

/** Services offered on the public contact form, reused for manually-entered leads. */
export const SERVICE_INTEREST_OPTIONS = [
  'Residential Solar',
  'Commercial Solar',
  'Industrial Solar',
  'Maintenance & Support',
  'Energy Consultation',
];

export const leadStatusStyles: Record<LeadStatus, string> = {
  new: 'bg-sky-100 text-sky-800',
  contacted: 'bg-indigo-100 text-indigo-800',
  qualified: 'bg-amber-100 text-amber-800',
  proposal: 'bg-violet-100 text-violet-800',
  won: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-red-100 text-red-800',
};

export const leadStatusLabel = (status: LeadStatus) =>
  LEAD_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;

export const leadSourceLabel = (source: LeadSource) =>
  LEAD_SOURCE_OPTIONS.find((s) => s.value === source)?.label ?? source;
