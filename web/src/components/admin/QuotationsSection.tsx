import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Search, FileText, Eye, Terminal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SimplePagination } from '@/components/ui/simple-pagination';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { Quotation, QuotationStatus } from '@/types/payload-types';
import {
  QUOTATION_STATUS_OPTIONS,
  formatMoney,
  quotationStatusLabel,
  quotationStatusStyles,
} from '@/lib/quotations';
import {
  fetchQuotations,
  fetchQuotationStats,
  fetchQuotationItems,
  createQuotation,
  updateQuotation,
  convertQuotation,
  QUOTATION_PAGE_SIZE,
  QuotationInput,
  QuotationWithItems,
  ConvertQuotationInput,
} from '@/services/quotationService';
import { fetchActiveProducts } from '@/services/productService';
import { fetchClients } from '@/services/clientService';
import { fetchLead } from '@/services/leadService';
import QuotationFormDialog from './content-editors/quotation/QuotationFormDialog';
import QuotationDetailDialog from './content-editors/quotation/QuotationDetailDialog';
import QuotationConvertDialog from './content-editors/quotation/QuotationConvertDialog';

const QuotationsSection: React.FC = () => {
  const { isLoading: isAuthLoading, hasPermission } = useAuth();
  const canAccess = hasPermission('quotations:view');
  const canCreate = hasPermission('quotations:create');
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [page, setPage] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<QuotationWithItems | null>(null);
  const [prefill, setPrefill] = useState<Partial<QuotationInput> | null>(null);
  const [selected, setSelected] = useState<Quotation | null>(null);
  const [converting, setConverting] = useState<Quotation | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', statusFilter, debouncedSearch, page],
    queryFn: () => fetchQuotations({ page, status: statusFilter, search: debouncedSearch }),
    enabled: canAccess,
    meta: { onError: (error: Error) => toast.error(`Failed to load quotations: ${error.message}`) },
  });

  const { data: stats } = useQuery({
    queryKey: ['quotations-stats'],
    queryFn: fetchQuotationStats,
    enabled: canAccess,
  });

  // Pickers are only needed while the form is open.
  const { data: products = [] } = useQuery({ queryKey: ['active-products'], queryFn: fetchActiveProducts, enabled: canAccess && isFormOpen });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: fetchClients, enabled: canAccess && isFormOpen });

  // Arriving from a lead ("Create quotation"): open the form pre-filled from it.
  const fromLead = searchParams.get('fromLead');
  useEffect(() => {
    if (!fromLead || !canCreate) return;
    let cancelled = false;
    fetchLead(fromLead)
      .then((lead) => {
        if (cancelled) return;
        setEditing(null);
        setPrefill({
          lead_id: lead.$id,
          client_name: lead.company || lead.name,
          client_email: lead.email ?? '',
          client_phone: lead.phone ?? '',
          client_address: lead.address ?? '',
        });
        setIsFormOpen(true);
      })
      .catch(() => toast.error('Could not load that lead'))
      .finally(() => {
        if (cancelled) return;
        const next = new URLSearchParams(searchParams);
        next.delete('fromLead');
        setSearchParams(next, { replace: true });
      });
    return () => { cancelled = true; };
    // Run once per arrival; the param is removed as soon as it has been handled.
  }, [fromLead, canCreate]); // eslint-disable-line react-hooks/exhaustive-deps

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['quotations'] });
    queryClient.invalidateQueries({ queryKey: ['quotations-stats'] });
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    setPrefill(null);
  };

  const saveMutation = useMutation({
    mutationFn: (input: QuotationInput) => (editing ? updateQuotation(editing.$id, input) : createQuotation(input)),
    onSuccess: (quotation) => {
      invalidate();
      toast.success(editing ? `${quotation.quotation_code} updated` : `Quotation ${quotation.quotation_code} created`);
      closeForm();
      setSelected(quotation);
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to save quotation'),
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ConvertQuotationInput }) => convertQuotation(id, input),
    onSuccess: (result) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['project-execution-options'] });
      toast.success(
        result.already_converted
          ? `Already converted — project ${result.project_code}`
          : `Project ${result.project_code} created`
      );
      setConverting(null);
      setSelected(null);
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to convert quotation'),
  });

  const startEdit = async (quotation: Quotation) => {
    try {
      const items = await fetchQuotationItems(quotation.$id);
      setEditing({ ...quotation, items });
      setPrefill(null);
      setSelected(null);
      setIsFormOpen(true);
    } catch {
      toast.error('Could not load the quotation items');
    }
  };

  const changeStatusFilter = (value: QuotationStatus | 'all') => {
    setStatusFilter(value);
    setPage(0);
  };

  if (isAuthLoading) {
    return <Card><CardContent className="p-6 text-center">Authenticating...</CardContent></Card>;
  }

  if (!canAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
          <CardDescription>You do not have permission to view this page.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>Please contact an administrator if you believe this is an error.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const quotations = data?.documents ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Quotations</CardTitle>
            <CardDescription>Draft, approve, and send quotations, then turn accepted ones into projects.</CardDescription>
          </div>
          {canCreate && (
            <Button onClick={() => { setEditing(null); setPrefill(null); setIsFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> New Quotation
            </Button>
          )}
        </CardHeader>
      </Card>

      {/* Status stats — click one to filter by it */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {QUOTATION_STATUS_OPTIONS.map((s) => (
          <button key={s.value} type="button" className="text-left" onClick={() => changeStatusFilter(statusFilter === s.value ? 'all' : s.value)}>
            <Card className={cn('hover:shadow-md transition-shadow h-full', statusFilter === s.value && 'ring-2 ring-primary')}>
              <CardContent className="p-3 flex items-center gap-2">
                <div className={cn('h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold', quotationStatusStyles[s.value])}>
                  {stats ? stats[s.value] : '—'}
                </div>
                <p className="text-xs font-medium leading-tight">{s.label}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
        <div className="flex-1 md:max-w-sm space-y-1.5">
          <Label htmlFor="quotation-search" className="text-xs text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="quotation-search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Quotation number or customer"
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={statusFilter} onValueChange={(v) => changeStatusFilter(v as QuotationStatus | 'all')}>
            <SelectTrigger className="w-full md:w-[190px] bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {QUOTATION_STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : quotations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            {debouncedSearch || statusFilter !== 'all' ? 'No quotations match these filters.' : 'No quotations yet.'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quotation</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.map((q) => (
                <TableRow key={q.$id} className="cursor-pointer" onClick={() => setSelected(q)}>
                  <TableCell className="font-medium whitespace-nowrap">{q.quotation_code}</TableCell>
                  <TableCell className="min-w-[160px]">
                    <p className="text-sm">{q.client_name}</p>
                    {q.created_by_name && <p className="text-xs text-muted-foreground">by {q.created_by_name}</p>}
                  </TableCell>
                  <TableCell className="text-right text-sm whitespace-nowrap">{formatMoney(q.grand_total)}</TableCell>
                  <TableCell>
                    <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', quotationStatusStyles[q.status])}>
                      {quotationStatusLabel(q.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{q.valid_until ? format(new Date(q.valid_until), 'dd MMM yyyy') : '—'}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{format(new Date(q.$createdAt), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label={`Open ${q.quotation_code}`} onClick={(e) => { e.stopPropagation(); setSelected(q); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <SimplePagination
        page={page}
        totalPages={Math.max(1, Math.ceil(total / QUOTATION_PAGE_SIZE))}
        totalItems={total}
        pageSize={QUOTATION_PAGE_SIZE}
        onPageChange={setPage}
        label="quotations"
      />

      <QuotationFormDialog
        isOpen={isFormOpen}
        setIsOpen={(open) => { if (!open) closeForm(); }}
        quotation={editing}
        prefill={prefill}
        products={products}
        clients={clients}
        onSave={(input) => saveMutation.mutate(input)}
        isSaving={saveMutation.isPending}
      />

      <QuotationDetailDialog
        quotation={selected}
        setOpen={(open) => { if (!open) setSelected(null); }}
        onEdit={startEdit}
        onConvert={(q) => setConverting(q)}
        onUpdated={setSelected}
      />

      <QuotationConvertDialog
        quotation={converting}
        setOpen={(open) => { if (!open) setConverting(null); }}
        onConvert={(input) => converting && convertMutation.mutate({ id: converting.$id, input })}
        isConverting={convertMutation.isPending}
      />
    </div>
  );
};

export default QuotationsSection;
