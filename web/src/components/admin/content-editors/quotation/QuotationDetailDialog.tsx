import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Check, Copy, Download, FileCheck2, Pencil, Send, Trash2, X, Briefcase, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Quotation } from '@/types/payload-types';
import {
  fetchQuotationItems,
  fetchQuotationPdf,
  submitQuotation,
  approveQuotation,
  rejectQuotation,
  sendQuotation,
  deleteQuotation,
  SendQuotationResult,
} from '@/services/quotationService';
import { downloadBase64Pdf, formatMoney, isQuotationEditable, quotationStatusLabel, quotationStatusStyles } from '@/lib/quotations';

interface QuotationDetailDialogProps {
  quotation: Quotation | null;
  setOpen: (open: boolean) => void;
  onEdit: (quotation: Quotation) => void;
  onConvert: (quotation: Quotation) => void;
  /** Called with the fresh row after an action that keeps the dialog open (sending). */
  onUpdated: (quotation: Quotation) => void;
}

const dateText = (value: string | null) => (value ? format(new Date(value), 'dd MMM yyyy') : '—');
const dateTimeText = (value: string | null) => (value ? format(new Date(value), 'dd MMM yyyy, HH:mm') : '—');

const QuotationDetailDialog: React.FC<QuotationDetailDialogProps> = ({ quotation, setOpen, onEdit, onConvert, onUpdated }) => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sendResult, setSendResult] = useState<SendQuotationResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setRejecting(false);
    setRejectReason('');
    setSendResult(null);
    setCopied(false);
  }, [quotation?.$id]);

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['quotation-items', quotation?.$id, quotation?.$updatedAt],
    queryFn: () => fetchQuotationItems(quotation!.$id),
    enabled: !!quotation,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['quotations'] });
    queryClient.invalidateQueries({ queryKey: ['quotations-stats'] });
  };

  /** Runs a workflow action, then closes the dialog so the list shows the new status. */
  const workflow = useMutation({
    mutationFn: ({ run }: { run: () => Promise<unknown>; success: string }) => run(),
    onSuccess: (_, { success }) => {
      refresh();
      toast.success(success);
      setOpen(false);
    },
    onError: (error: Error) => toast.error(error.message || 'That action failed'),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => sendQuotation(id),
    onSuccess: (result) => {
      refresh();
      onUpdated(result.quotation);
      setSendResult(result);
      toast.success(result.email_sent ? 'Quotation emailed to the customer' : 'Review link created');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to send quotation'),
  });

  const pdfMutation = useMutation({
    mutationFn: (id: string) => fetchQuotationPdf(id),
    onSuccess: ({ filename, base64 }) => downloadBase64Pdf(filename, base64),
    onError: (error: Error) => toast.error(error.message || 'Failed to generate PDF'),
  });

  if (!quotation) return null;
  const q = quotation;
  const busy = workflow.isPending || sendMutation.isPending;

  const copyLink = async () => {
    if (!sendResult) return;
    try {
      await navigator.clipboard.writeText(sendResult.review_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — select the link and copy it manually.');
    }
  };

  const canEdit = hasPermission('quotations:edit');
  const canApprove = hasPermission('quotations:approve');
  const canSend = hasPermission('quotations:send');
  const canConvert = hasPermission('quotations:convert');

  return (
    <>
      <Dialog open={!!quotation} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle>{q.quotation_code}</DialogTitle>
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', quotationStatusStyles[q.status])}>
                {quotationStatusLabel(q.status)}
              </span>
            </div>
            <DialogDescription>
              {q.client_name} · valid until {dateText(q.valid_until)} · created by {q.created_by_name || 'unknown'}
            </DialogDescription>
          </DialogHeader>

          {/* Status notes */}
          {q.status === 'rejected' && q.rejection_reason && (
            <p className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              <strong>Rejected:</strong> {q.rejection_reason}
            </p>
          )}
          {q.customer_response && (
            <p className={cn('rounded-md border p-3 text-sm', q.customer_response === 'accepted' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900')}>
              <strong>Customer {q.customer_response}</strong> on {dateTimeText(q.customer_response_at)}
              {q.customer_comment ? <> — “{q.customer_comment}”</> : null}
            </p>
          )}
          {q.status === 'converted' && q.converted_project_id && (
            <p className="rounded-md bg-violet-50 border border-violet-200 p-3 text-sm text-violet-900">
              Converted to a project.{' '}
              <a className="underline font-medium" href={`/project-summary/${q.converted_project_id}`}>View project</a>
            </p>
          )}

          {/* Customer + dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <p><span className="text-muted-foreground">Email: </span>{q.client_email || '—'}</p>
            <p><span className="text-muted-foreground">Phone: </span>{q.client_phone || '—'}</p>
            <p className="sm:col-span-2"><span className="text-muted-foreground">Address: </span>{q.client_address || '—'}</p>
            {q.approved_at && <p><span className="text-muted-foreground">Approved: </span>{dateTimeText(q.approved_at)}</p>}
            {q.sent_at && <p><span className="text-muted-foreground">Sent: </span>{dateTimeText(q.sent_at)}</p>}
          </div>

          {/* Items */}
          {itemsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.$id}>
                    <TableCell className="min-w-[180px] text-sm">
                      {i.description}
                      {!!i.discount && <span className="block text-xs text-muted-foreground">Discount: -{formatMoney(i.discount)}</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm whitespace-nowrap">{i.quantity}{i.unit ? ` ${i.unit}` : ''}</TableCell>
                    <TableCell className="text-right text-sm whitespace-nowrap">{formatMoney(i.unit_price)}</TableCell>
                    <TableCell className="text-right text-sm whitespace-nowrap">{formatMoney(i.line_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="ml-auto w-full sm:max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(q.subtotal)}</span></div>
            {q.discount_total > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatMoney(q.discount_total)}</span></div>}
            {q.tax_total > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax{q.tax_rate ? ` (${q.tax_rate}%)` : ''}</span><span>{formatMoney(q.tax_total)}</span></div>}
            <div className="flex justify-between border-t pt-1 text-base font-semibold"><span>Total</span><span>{formatMoney(q.grand_total)}</span></div>
          </div>

          {(q.notes || q.terms) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {q.notes && <div><p className="font-medium">Notes</p><p className="text-muted-foreground whitespace-pre-wrap">{q.notes}</p></div>}
              {q.terms && <div><p className="font-medium">Terms</p><p className="text-muted-foreground whitespace-pre-wrap">{q.terms}</p></div>}
            </div>
          )}

          {/* Review link, shown right after sending */}
          {sendResult && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <Mail className="h-4 w-4" />
                {sendResult.email_sent
                  ? `Emailed to ${q.client_email}`
                  : q.client_email
                    ? `Email could not be sent${sendResult.email_error ? ` (${sendResult.email_error})` : ''} — share the link below instead`
                    : 'No customer email on file — share the link below'}
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={sendResult.review_url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 h-10 rounded-md border border-input bg-background px-3 text-xs"
                  aria-label="Customer review link"
                />
                <Button type="button" variant="outline" onClick={copyLink}>
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Sending again creates a new link and disables this one.</p>
            </div>
          )}

          {/* Reject reason */}
          {rejecting && (
            <div className="rounded-md border p-3 space-y-2">
              <Label htmlFor="reject-reason">Reason for rejection *</Label>
              <Textarea id="reject-reason" rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} maxLength={1000} autoFocus />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setRejecting(false)}>Cancel</Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={!rejectReason.trim() || busy}
                  onClick={() => workflow.mutate({ run: () => rejectQuotation(q.$id, rejectReason.trim()), success: 'Quotation rejected' })}
                >
                  Reject quotation
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 justify-end border-t pt-4">
            {hasPermission('quotations:view') && (
              <Button type="button" variant="outline" disabled={pdfMutation.isPending} onClick={() => pdfMutation.mutate(q.$id)}>
                <Download className="mr-2 h-4 w-4" /> {pdfMutation.isPending ? 'Preparing...' : 'PDF'}
              </Button>
            )}
            {isQuotationEditable(q.status) && canEdit && (
              <>
                <Button type="button" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
                <Button type="button" variant="outline" onClick={() => onEdit(q)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
              </>
            )}
            {q.status === 'draft' && canEdit && (
              <Button type="button" disabled={busy} onClick={() => workflow.mutate({ run: () => submitQuotation(q.$id), success: 'Submitted for approval' })}>
                <FileCheck2 className="mr-2 h-4 w-4" /> Submit for approval
              </Button>
            )}
            {q.status === 'pending_approval' && canApprove && !rejecting && (
              <>
                <Button type="button" variant="outline" className="text-red-600 hover:text-red-700" disabled={busy} onClick={() => setRejecting(true)}>
                  <X className="mr-2 h-4 w-4" /> Reject
                </Button>
                <Button type="button" disabled={busy} onClick={() => workflow.mutate({ run: () => approveQuotation(q.$id), success: 'Quotation approved' })}>
                  <Check className="mr-2 h-4 w-4" /> Approve
                </Button>
              </>
            )}
            {(q.status === 'approved' || q.status === 'sent') && canSend && (
              <Button type="button" disabled={busy} onClick={() => sendMutation.mutate(q.$id)}>
                <Send className="mr-2 h-4 w-4" /> {sendMutation.isPending ? 'Sending...' : q.status === 'sent' ? 'Send again' : 'Send to customer'}
              </Button>
            )}
            {q.status === 'accepted' && canConvert && (
              <Button type="button" onClick={() => onConvert(q)}>
                <Briefcase className="mr-2 h-4 w-4" /> Convert to project
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete quotation?"
        description={`${q.quotation_code} and its line items will be permanently deleted.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        isLoading={workflow.isPending}
        onConfirm={() => {
          setConfirmDelete(false);
          workflow.mutate({ run: () => deleteQuotation(q.$id), success: 'Quotation deleted' });
        }}
      />
    </>
  );
};

export default QuotationDetailDialog;
