import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Terminal, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessSection } from '@/config/roles';
import { cn } from '@/lib/utils';
import { SiteVisit, SiteVisitStatus } from '@/types/payload-types';
import { STATUS_OPTIONS } from '@/lib/siteVisits';
import {
  fetchSiteVisits,
  fetchSiteVisitStats,
  createSiteVisit,
  deleteSiteVisit,
  SITE_VISIT_PAGE_SIZE,
  notifySiteVisitAssignees,
} from '@/services/siteVisitService';
import { fetchProjectExecutionOptions } from '@/services/projectExecutionService';
import { fetchDocumentTypes } from '@/services/documentTypeService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchEngineers, fetchUsers } from '@/services/userService';
import SiteVisitCard from './SiteVisitCard';
import SiteVisitFormDialog from './content-editors/site-visit/SiteVisitFormDialog';
import SiteVisitDetailDialog from './content-editors/site-visit/SiteVisitDetailDialog';

const filterOptions: Array<{ id: SiteVisitStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  ...STATUS_OPTIONS.map((s) => ({ id: s.value, label: s.label })),
];



const statCards: Array<{ key: SiteVisitStatus; label: string; color: string }> = [
  { key: 'scheduled', label: 'Scheduled', color: 'text-gray-600 bg-gray-50 dark:bg-gray-950/30' },
  { key: 'in_progress', label: 'In Progress', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
  { key: 'on_hold', label: 'On Hold', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
  { key: 'completed', label: 'Completed', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
  { key: 'cancelled', label: 'Cancelled', color: 'text-red-600 bg-red-50 dark:bg-red-950/30' },
];

const SiteVisitsSection: React.FC = () => {
  const { role, isLoading: isAuthLoading, user, isAdmin } = useAuth();
  const canAccess = canAccessSection('site-visits', role);
  const queryClient = useQueryClient();

  const [searchParams] = useSearchParams();
  const paramProject = searchParams.get('project');
  const paramMine = searchParams.get('myVisits');

  const [projectFilter, setProjectFilter] = useState<string>(paramProject || '');
  const [filter, setFilter] = useState<SiteVisitStatus | 'all'>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'mine' | 'unassigned'>(
    paramMine === 'true' ? 'mine' : 'all'
  );
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (paramProject !== null) {
      setProjectFilter(paramProject);
      setPage(0);
    }
    if (paramMine === 'true') {
      setAssignmentFilter('mine');
      setPage(0);
    }
  }, [paramProject, paramMine]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<SiteVisit | null>(null);
  const [selectedVisitTab, setSelectedVisitTab] = useState<'details' | 'activity' | 'documents'>('details');
  const [hideDialogTabs, setHideDialogTabs] = useState<boolean>(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['project-execution-options'],
    queryFn: fetchProjectExecutionOptions,
    enabled: canAccess,
  });

  const { data: engineers = [] } = useQuery({
    queryKey: ['engineers'],
    queryFn: () => fetchEngineers(),
    enabled: canAccess,
  });

  const { data: usersResponse } = useQuery({
    queryKey: ['platform-users'],
    queryFn: () => fetchUsers(),
    enabled: canAccess,
  });
  const usersList = usersResponse ?? [];

  const { data: documentTypes = [] } = useQuery({
    queryKey: ['document-types'],
    queryFn: fetchDocumentTypes,
    enabled: canAccess,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['site-visits', projectFilter, filter, assignmentFilter, page, user?.$id],
    queryFn: () => fetchSiteVisits({
      page,
      projectId: projectFilter || undefined,
      status: filter,
      assignment: assignmentFilter,
      userId: user?.$id,
    }),
    enabled: canAccess,
    meta: { onError: (error: Error) => toast.error(`Failed to load site visits: ${error.message}`) },
  });

  const { data: stats } = useQuery({
    queryKey: ['site-visits-stats'],
    queryFn: () => fetchSiteVisitStats(),
    enabled: canAccess,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['site-visits'] });
    queryClient.invalidateQueries({ queryKey: ['site-visits-stats'] });
  };

  const createMutation = useMutation({
    mutationFn: createSiteVisit,
    onSuccess: (data, variables) => {
      invalidate();
      setIsCreateOpen(false);
      toast.success('Site visit created');

      // Send emails/notifications to assigned engineers
      if (variables.assigned_engineer_id) {
        const ids = variables.assigned_engineer_id.split(',').map(s => s.trim()).filter(Boolean);
        const emails = ids.map(id => {
          const eng = engineers.find(e => e.$id === id);
          return eng?.email;
        }).filter(Boolean) as string[];
        
        if (emails.length > 0) {
          const projName = projects.find(p => p.$id === variables.project_id)?.name || 'Project';
          notifySiteVisitAssignees(emails, variables.title, projName, variables.project_id);
        }
      }
    },
    onError: () => toast.error('Failed to create site visit'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSiteVisit,
    onSuccess: () => {
      invalidate();
      toast.success('Site visit deleted');
    },
    onError: () => toast.error('Failed to delete site visit'),
  });

  const projectNameById = (id: string) => {
    const p = projects.find((proj) => proj.$id === id);
    return p ? (p.project_code || p.name) : 'Unknown Project';
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

  const visits = data?.documents ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / SITE_VISIT_PAGE_SIZE));

  // Admins and engineers manage everything; sales managers have read-only access.
  const isEngineer = role === 'project_engineer' || role === 'planning_engineer';
  const canEditVisit = (_visit: SiteVisit) => isAdmin || isEngineer;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Site Visits</CardTitle>
            <CardDescription>
              {isAdmin
                ? 'Schedule, assign, and track on-site inspections for your projects.'
                : 'Create, view, and update site visits — including unassigned ones open to all engineers.'}
            </CardDescription>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Site Visit
          </Button>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <Card key={s.key} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-xs font-bold ${s.color}`}>
                {stats ? stats[s.key] : '—'}
              </div>
              <p className="text-sm font-medium">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>      {/* Filters (Combobox & Status Dropdown) */}
      {role === 'admin' ? (
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[250px] max-w-md">
            <Label htmlFor="sv-project-filter" className="text-xs text-muted-foreground">Filter by project</Label>
            <Combobox
              id="sv-project-filter"
              value={projectFilter}
              onChange={(v) => { setProjectFilter(v); setPage(0); }}
              placeholder="Search and select a project..."
              searchPlaceholder="Search projects by name..."
              emptyText="No projects found."
              options={[
                { value: '', label: 'All Projects' },
                ...projects.map((p) => ({ value: p.$id, label: `${p.project_code || p.name} — ${p.client}`, keywords: `${p.project_code || ''} ${p.name || ''} ${p.client}` })),
              ]}
            />
          </div>

          <div className="flex flex-col gap-1.5 self-end">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={filter}
              onValueChange={(val) => { setFilter(val as SiteVisitStatus | 'all'); setPage(0); }}
            >
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="max-w-md">
            <Label htmlFor="sv-project-filter" className="text-xs text-muted-foreground">Filter by project</Label>
            <Combobox
              id="sv-project-filter"
              value={projectFilter}
              onChange={(v) => { setProjectFilter(v); setPage(0); }}
              placeholder="Search and select a project..."
              searchPlaceholder="Search projects by name..."
              emptyText="No projects found."
              options={[
                { value: '', label: 'All Projects' },
                ...projects.map((p) => ({ value: p.$id, label: `${p.project_code || p.name} — ${p.client}`, keywords: `${p.project_code || ''} ${p.name || ''} ${p.client}` })),
              ]}
            />
          </div>

          <div className="flex justify-between items-end gap-4 flex-wrap">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Assignment</Label>
              <div className="flex gap-1 bg-muted p-1 rounded-lg border border-border/40">
                <button
                  type="button"
                  onClick={() => { setAssignmentFilter('all'); setPage(0); }}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    assignmentFilter === 'all' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => { setAssignmentFilter('mine'); setPage(0); }}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    assignmentFilter === 'mine' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Assigned to me
                </button>
                <button
                  type="button"
                  onClick={() => { setAssignmentFilter('unassigned'); setPage(0); }}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    assignmentFilter === 'unassigned' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Unassigned
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={filter}
                onValueChange={(val) => { setFilter(val as SiteVisitStatus | 'all'); setPage(0); }}
              >
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Visits */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : visits.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No site visits found. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => (
            <SiteVisitCard
              key={visit.$id}
              visit={visit}
              projectName={projectNameById(visit.project_id)}
              currentUserId={user?.$id ?? ''}
              onOpen={(visit, tab, hideTabs) => {
                setSelectedVisit(visit);
                setSelectedVisitTab(tab ?? 'details');
                setHideDialogTabs(!!hideTabs);
              }}
              onDelete={isAdmin ? (v) => deleteMutation.mutate(v.$id) : undefined}
              users={usersList}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > SITE_VISIT_PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} ({total} site visits)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <SiteVisitFormDialog
        isOpen={isCreateOpen}
        setIsOpen={setIsCreateOpen}
        projects={projects}
        lockedProjectId={projectFilter || undefined}
        createdBy={user?.$id ?? ''}
        canAssignEngineer={isAdmin}
        currentUser={{ $id: user?.$id ?? '', name: user?.name ?? 'User' }}
        onSave={(input) => createMutation.mutate(input)}
        isSaving={createMutation.isPending}
      />

      {selectedVisit && (
        <SiteVisitDetailDialog
          visit={selectedVisit}
          isOpen={!!selectedVisit}
          setIsOpen={(open) => { if (!open) setSelectedVisit(null); }}
          projectName={projectNameById(selectedVisit.project_id)}
          documentTypes={documentTypes}
          currentUser={{ $id: user?.$id ?? '', name: user?.name ?? 'User' }}
          canEdit={canEditVisit(selectedVisit)}
          isAdmin={isAdmin}
          users={usersList}
          projects={projects}
          defaultTab={selectedVisitTab}
          hideTabs={hideDialogTabs}
        />
      )}
    </div>
  );
};

export default SiteVisitsSection;
