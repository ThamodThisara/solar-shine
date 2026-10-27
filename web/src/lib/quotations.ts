import { QuotationStatus, StockMovementType } from '@/types/payload-types';

// Keep the status names in sync with the lifecycle in functions/team-management/src/routes/quotations.js.

export const QUOTATION_STATUS_OPTIONS: Array<{ value: QuotationStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'converted', label: 'Converted' },
];

export const quotationStatusStyles: Record<QuotationStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_approval: 'bg-amber-100 text-amber-800',
  approved: 'bg-sky-100 text-sky-800',
  rejected: 'bg-red-100 text-red-800',
  sent: 'bg-indigo-100 text-indigo-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-rose-100 text-rose-800',
  converted: 'bg-violet-100 text-violet-800',
};

export const quotationStatusLabel = (status: QuotationStatus) =>
  QUOTATION_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;

/** Quotations whose content can still be edited (mirrors the server rule). */
export const isQuotationEditable = (status: QuotationStatus) => status === 'draft' || status === 'rejected';

export const MAX_QUOTATION_ITEMS = 40;
export const DEFAULT_VALIDITY_DAYS = 30;

export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  opening: 'Opening stock',
  receive: 'Received',
  consume: 'Consumed',
  adjust: 'Adjustment',
};

export const formatMoney = (value: number | null | undefined) =>
  `LKR ${Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface DraftLine {
  quantity: number;
  unit_price: number;
  discount: number;
}

/**
 * Live totals for the quotation form. A preview only — the server recomputes
 * every figure and is the source of truth (same formula as lib/quotationTotals.js).
 */
export function previewTotals(lines: DraftLine[], taxRate: number) {
  let gross = 0;
  let discount = 0;
  for (const l of lines) {
    gross += round2((l.quantity || 0) * (l.unit_price || 0));
    discount += l.discount || 0;
  }
  const taxable = gross - discount;
  const tax = round2((taxable * (taxRate || 0)) / 100);
  return {
    subtotal: round2(gross),
    discount_total: round2(discount),
    tax_total: tax,
    grand_total: round2(taxable + tax),
  };
}

/** Saves a base64 PDF returned by the function as a browser download. */
export function downloadBase64Pdf(filename: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
