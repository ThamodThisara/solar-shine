import { SiteVisitPriority, SiteVisitStatus, SiteVisitUpdateType } from '@/types/payload-types';

export const PRIORITY_OPTIONS: Array<{ value: SiteVisitPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export const STATUS_OPTIONS: Array<{ value: SiteVisitStatus; label: string }> = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const UPDATE_TYPE_OPTIONS: Array<{ value: SiteVisitUpdateType; label: string }> = [
  { value: 'progress', label: 'Progress Update' },
  { value: 'finding', label: 'Finding' },
  { value: 'observation', label: 'Observation' },
  { value: 'status_change', label: 'Status Change' },
  { value: 'note', label: 'Note' },
];

export const priorityStyles: Record<SiteVisitPriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

export const statusStyles: Record<SiteVisitStatus, string> = {
  scheduled: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  on_hold: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

export const statusLabel = (status: SiteVisitStatus): string =>
  STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;

export const priorityLabel = (priority: SiteVisitPriority): string =>
  PRIORITY_OPTIONS.find((p) => p.value === priority)?.label ?? priority;

export const updateTypeLabel = (type: SiteVisitUpdateType): string =>
  UPDATE_TYPE_OPTIONS.find((u) => u.value === type)?.label ?? type;
