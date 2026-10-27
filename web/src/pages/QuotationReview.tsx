import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { format } from 'date-fns';
import { AlertTriangle, Check, CheckCircle2, Download, Loader2, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  fetchPublicQuotation,
  fetchPublicQuotationPdf,
  respondToQuotation,
} from '@/services/quotationService';
import { downloadBase64Pdf, formatMoney } from '@/lib/quotations';

const dateText = (value: string | null) => (value ? format(new Date(value), 'dd MMM yyyy') : '—');

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gray-50">
    <Helmet>
      <title>Your Quotation | Solar Maps</title>
      {/* Private, per-customer page: keep it out of search results. */}
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <header className="bg-white border-b">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <span className="text-xl font-bold">Solar <span className="text-primary">Maps</span></span>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-4 py-6 sm:py-10">{children}</main>
  </div>
);

const Notice: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-white border rounded-xl p-6 sm:p-8 text-center space-y-3">
    <div className="flex justify-center">{icon}</div>
    <h1 className="text-xl font-semibold">{title}</h1>
    <p className="text-muted-foreground">{children}</p>
  </div>
);

const QuotationReview: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const [comment, setComment] = useState('');
  const [answered, setAnswered] = useState<'accepted' | 'declined' | null>(null);

  const { data: quotation, isLoading, error } = useQuery({
    queryKey: ['public-quotation', token],
    queryFn: () => fetchPublicQuotation(token),
    retry: false,
  });

  const respond = useMutation({
    mutationFn: (response: 'accepted' | 'declined') => respondToQuotation(token, response, comment.trim() || undefined),
    onSuccess: (_, response) => setAnswered(response),
    onError: (e: Error) => toast.error(e.message || 'Something went wrong. Please try again.'),
  });

  const pdf = useMutation({
    mutationFn: () => fetchPublicQuotationPdf(token),
    onSuccess: ({ filename, base64 }) => downloadBase64Pdf(filename, base64),
    onError: () => toast.error('Could not prepare the PDF. Please try again.'),
  });

  if (isLoading) {
    return (
      <Shell>
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </Shell>
    );
  }

  if (answered) {
    return (
      <Shell>
        {answered === 'accepted' ? (
          <Notice icon={<CheckCircle2 className="h-12 w-12 text-emerald-600" />} title="Thank you — quotation accepted">
            We've let our team know. They will contact you shortly about the next steps.
          </Notice>
        ) : (
          <Notice icon={<XCircle className="h-12 w-12 text-gray-500" />} title="Response recorded">
            You have declined this quotation. If your plans change, just get in touch and we'll be happy to help.
          </Notice>
        )}
      </Shell>
    );
  }

  if (error || !quotation) {
    return (
      <Shell>
        <Notice icon={<AlertTriangle className="h-12 w-12 text-amber-500" />} title="This link can't be opened">
          {(error as Error | null)?.message || 'This link is not valid.'}
        </Notice>
      </Shell>
    );
  }

  const q = quotation;
  const open = q.status === 'sent';

  return (
    <Shell>
      <div className="bg-white border rounded-xl p-4 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Quotation {q.quotation_code}</h1>
            <p className="text-sm text-muted-foreground">Prepared for {q.client_name}</p>
            <p className="text-sm text-muted-foreground">Issued {dateText(q.issued_at)} · valid until {dateText(q.valid_until)}</p>
          </div>
          <Button variant="outline" onClick={() => pdf.mutate()} disabled={pdf.isPending} className="shrink-0">
            <Download className="mr-2 h-4 w-4" /> {pdf.isPending ? 'Preparing...' : 'Download PDF'}
          </Button>
        </div>

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
            {q.items.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="min-w-[180px] text-sm">
                  {item.description}
                  {!!item.discount && <span className="block text-xs text-muted-foreground">Discount: -{formatMoney(item.discount)}</span>}
                </TableCell>
                <TableCell className="text-right text-sm whitespace-nowrap">{item.quantity}{item.unit ? ` ${item.unit}` : ''}</TableCell>
                <TableCell className="text-right text-sm whitespace-nowrap">{formatMoney(item.unit_price)}</TableCell>
                <TableCell className="text-right text-sm whitespace-nowrap">{formatMoney(item.line_total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="ml-auto w-full sm:max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(q.subtotal)}</span></div>
          {q.discount_total > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatMoney(q.discount_total)}</span></div>}
          {q.tax_total > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax{q.tax_rate ? ` (${q.tax_rate}%)` : ''}</span><span>{formatMoney(q.tax_total)}</span></div>}
          <div className="flex justify-between border-t pt-2 text-lg font-semibold"><span>Total</span><span>{formatMoney(q.grand_total)}</span></div>
        </div>

        {(q.notes || q.terms) && (
          <div className="space-y-4 text-sm">
            {q.notes && <div><p className="font-semibold">Notes</p><p className="text-muted-foreground whitespace-pre-wrap">{q.notes}</p></div>}
            {q.terms && <div><p className="font-semibold">Terms & Conditions</p><p className="text-muted-foreground whitespace-pre-wrap">{q.terms}</p></div>}
          </div>
        )}

        {open ? (
          <div className="border-t pt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="customer-comment">Comments (optional)</Label>
              <Textarea
                id="customer-comment"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={2000}
                placeholder="Anything you'd like us to know — preferred start date, questions, changes..."
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <Button variant="outline" size="lg" disabled={respond.isPending} onClick={() => respond.mutate('declined')}>
                <X className="mr-2 h-4 w-4" /> Decline
              </Button>
              <Button size="lg" disabled={respond.isPending} onClick={() => respond.mutate('accepted')}>
                <Check className="mr-2 h-4 w-4" /> {respond.isPending ? 'Sending...' : 'Accept quotation'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="border-t pt-4 text-sm text-muted-foreground">This quotation has already been answered.</p>
        )}
      </div>
    </Shell>
  );
};

export default QuotationReview;
