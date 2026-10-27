import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, UserCheck, Search, Target, Terminal, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
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
import { Lead, LeadStatus } from '@/types/payload-types';
import { LEAD_STATUS_OPTIONS, leadSourceLabel, leadStatusLabel, leadStatusStyles } from '@/lib/leads';
import {
  fetchLeads,
  fetchLeadStats,
  createLead,
  updateLead,
  convertLead,
  LEAD_PAGE_SIZE,
  LeadInput,
  LeadUpdateInput,
} from '@/services/leadService';
import { fetchUsers } from '@/services/userService';
import LeadFormDialog from './content-editors/lead/LeadFormDialog';
import LeadConvertDialog from './content-editors/lead/LeadConvertDialog';

const formatDate = (value: string | null) => (value ? format(new Date(value), 'dd MMM yyyy') : '—');

/** A follow-up date on or before today that still needs action. */
const isFollowUpDue = (lead: Lead) =>
  !!lead.next_follow_up &&
  !['won', 'lost'].includes(lead.status) &&
  new Date(lead.next_follow_up) <= new Date();

const LeadsSection: React.FC = () => {
  const { user, isLoading: isAuthLoading, hasPermission } = useAuth();
  const canAccess = hasPermission('leads:view');
  const canCreate = hasPermission('leads:create');
  const canEdit = hasPermission('leads:edit');
  const canConvert = hasPermission('leads:convert');
  const canQuote = hasPermission('quotations:create');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [assignment, setAssignment] = useState<'all' | 'mine'>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [page, setPage] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['leads', statusFilter, assignment, debouncedSearch, page, user?.$id],
    queryFn: () =>
      fetchLeads({
        page,
        status: statusFilter,
        assignedTo: assignment === 'mine' ? user?.$id : undefined,
        search: debouncedSearch,
      }),
    enabled: canAccess,
    meta: { onError: (error: Error) => toast.error(`Failed to load leads: ${error.message}`) },
  });

  const { data: stats } = useQuery({
    queryKey: ['leads-stats'],
    queryFn: fetchLeadStats,
    enabled: canAccess,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['platform-users'],
    queryFn: () => fetchUsers(),
    enabled: canAccess && (canCreate || canEdit),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['leads-stats'] });
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingLead(null);
  };

  const saveMutation = useMutation({
    mutationFn: (input: LeadUpdateInput) =>
      editingLead ? updateLead(editingLead.$id, input) : createLead(input as LeadInput),
    onSuccess: (lead) => {
      invalidate();
      toast.success(editingLead ? 'Lead updated' : `Lead ${lead.lead_code} created`);
      closeForm();
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to save lead'),
  });

  const convertMutation = useMutation({
    mutationFn: ({ leadId, clientId }: { leadId: string; clientId?: string }) => convertLead(leadId, clientId),
    onSuccess: (result) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(result.already_converted ? 'Lead was already converted' : 'Lead converted to client');
      setConvertingLead(null);
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to convert lead'),
  });

  const changeStatusFilter = (value: LeadStatus | 'all') => {
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

  const leads = data?.documents ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LEAD_PAGE_SIZE));

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Leads</CardTitle>
            <CardDescription>Track enquiries from the website and other channels through to won clients.</CardDescription>
          </div>
          {canCreate && (
            <Button onClick={() => { setEditingLead(null); setIsFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Add Lead
            </Button>
          )}
        </CardHeader>
      </Card>

      {/* Pipeline stats — click a stage to filter by it */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {LEAD_STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => changeStatusFilter(statusFilter === s.value ? 'all' : s.value)}
            className="text-left"
          >
            <Card className={cn('hover:shadow-md transition-shadow h-full', statusFilter === s.value && 'ring-2 ring-primary')}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('h-10 w-10 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold', leadStatusStyles[s.value])}>
                  {stats ? stats[s.value] : '—'}
                </div>
                <p className="text-sm font-medium">{s.label}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
        <div className="flex-1 md:max-w-sm space-y-1.5">
          <Label htmlFor="lead-search" className="text-xs text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="lead-search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Name, lead code, email, or phone"
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Assignment</Label>
            <div className="flex gap-1 bg-muted p-1 rounded-lg border border-border/40">
              {(['all', 'mine'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setAssignment(value); setPage(0); }}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    assignment === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {value === 'all' ? 'All' : 'Assigned to me'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => changeStatusFilter(v as LeadStatus | 'all')}>
              <SelectTrigger className="w-[160px] bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {LEAD_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Leads table */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            {debouncedSearch || statusFilter !== 'all' || assignment !== 'all'
              ? 'No leads match these filters.'
              : 'No leads yet. Website enquiries appear here automatically.'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead>Created</TableHead>
                {(canEdit || canConvert || canQuote) && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.$id}>
                  <TableCell className="min-w-[180px]">
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.lead_code}{lead.company ? ` · ${lead.company}` : ''}
                    </p>
                    {lead.service_interest && <p className="text-xs text-muted-foreground">{lead.service_interest}</p>}
                  </TableCell>
                  <TableCell className="min-w-[160px] text-sm">
                    {lead.phone && <p>{lead.phone}</p>}
                    {lead.email && <p className="text-muted-foreground break-all">{lead.email}</p>}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{leadSourceLabel(lead.source)}</TableCell>
                  <TableCell>
                    <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', leadStatusStyles[lead.status])}>
                      {leadStatusLabel(lead.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{lead.assigned_to_name || <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                  <TableCell className={cn('text-sm whitespace-nowrap', isFollowUpDue(lead) && 'text-red-600 font-medium')}>
                    {formatDate(lead.next_follow_up)}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{formatDate(lead.$createdAt)}</TableCell>
                  {(canEdit || canConvert || canQuote) && (
                    <TableCell className="text-right whitespace-nowrap">
                      {canQuote && !['won', 'lost'].includes(lead.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0"
                          title="Create quotation"
                          aria-label={`Create a quotation for ${lead.lead_code}`}
                          onClick={() => navigate(`/dashboard?tab=quotations&fromLead=${lead.$id}`)}
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0"
                          title="Edit lead"
                          aria-label={`Edit ${lead.lead_code}`}
                          onClick={() => { setEditingLead(lead); setIsFormOpen(true); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canConvert && !lead.converted_client_id && lead.status !== 'lost' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 text-emerald-700 hover:text-emerald-800"
                          title="Convert to client"
                          aria-label={`Convert ${lead.lead_code} to client`}
                          onClick={() => setConvertingLead(lead)}
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <SimplePagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={LEAD_PAGE_SIZE}
        onPageChange={setPage}
        label="leads"
      />

      <LeadFormDialog
        isOpen={isFormOpen}
        setIsOpen={(open) => { if (!open) closeForm(); }}
        lead={editingLead}
        users={users}
        onSave={(input) => saveMutation.mutate(input)}
        isSaving={saveMutation.isPending}
      />

      <LeadConvertDialog
        lead={convertingLead}
        setOpen={(open) => { if (!open) setConvertingLead(null); }}
        onConvert={(clientId) => convertingLead && convertMutation.mutate({ leadId: convertingLead.$id, clientId })}
        isConverting={convertMutation.isPending}
      />
    </div>
  );
};

export default LeadsSection;
