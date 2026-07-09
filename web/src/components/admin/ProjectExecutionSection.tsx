import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Terminal, Search, Tags } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { canAccessSection } from '@/config/roles';
import { cn } from '@/lib/utils';
import { ProjectExecution, ProjectExecutionStatus } from '@/types/payload-types';
import { fetchUsers } from '@/services/userService';
import {
  fetchProjectExecutions,
  fetchProjectExecutionStats,
  createProjectExecution,
  updateProjectExecutionStatus,
  deleteProjectExecution,
  updateProjectExecution,
  notifyAssignees,
  PROJECT_EXECUTION_PAGE_SIZE,
} from '@/services/projectExecutionService';
import ProjectExecutionCard from './ProjectExecutionCard';
import ProjectExecutionFormDialog from './content-editors/project-execution/ProjectExecutionFormDialog';
import ManageProjectTypesDialog from './content-editors/project-execution/ManageProjectTypesDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SimplePagination } from '@/components/ui/simple-pagination';

const filterOptions: Array<{ id: ProjectExecutionStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'planning', label: 'Planning' },
  { id: 'active', label: 'Active' },
  { id: 'on_hold', label: 'On Hold' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const statCards: Array<{ key: keyof Awaited<ReturnType<typeof fetchProjectExecutionStats>>; label: string; color: string }> = [
  { key: 'pending', label: 'Pending', color: 'text-gray-600 bg-gray-50 dark:bg-gray-950/30' },
  { key: 'planning', label: 'Planning', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
  { key: 'active', label: 'Active', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
  { key: 'on_hold', label: 'On Hold', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
  { key: 'completed', label: 'Completed', color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30' },
];

const ProjectExecutionSection: React.FC = () => {
  const { role, user, isAdmin, isLoading: isAuthLoading } = useAuth();
  const canAccess = canAccessSection('project-execution', role);
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<ProjectExecutionStatus | 'all'>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'me'>('all');
  const [page, setPage] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<ProjectExecution | null>(null);

  // Debounce the search input so we don't query on every keystroke.
  React.useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['project-executions', filter, page, search, assignmentFilter, user?.email],
    queryFn: () => fetchProjectExecutions({
      page,
      status: filter,
      search,
      assignedEmail: assignmentFilter === 'me' ? user?.email : undefined
    }),
    enabled: canAccess,
    meta: {
      onError: (error: Error) => toast.error(`Failed to load projects: ${error.message}`),
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['project-executions-stats'],
    queryFn: fetchProjectExecutionStats,
    enabled: canAccess,
  });

  const { data: usersResponse } = useQuery({
    queryKey: ['platform-users'],
    queryFn: () => fetchUsers(),
    enabled: canAccess,
  });
  const usersList = usersResponse ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['project-executions'] });
    queryClient.invalidateQueries({ queryKey: ['project-executions-stats'] });
  };

  const createMutation = useMutation({
    mutationFn: createProjectExecution,
    onSuccess: (data, variables) => {
      invalidate();
      setIsDialogOpen(false);
      toast.success('Project created');

      // Send emails and create database notifications for all assignees
      const emails: string[] = [];
      if (variables.engineer) {
        emails.push(...variables.engineer.split(',').map((s) => s.trim()).filter(Boolean));
      }
      if (variables.planning_engineer) {
        emails.push(...variables.planning_engineer.split(',').map((s) => s.trim()).filter(Boolean));
      }
      if (variables.sales_manager) {
        emails.push(...variables.sales_manager.split(',').map((s) => s.trim()).filter(Boolean));
      }
      if (emails.length > 0) {
        notifyAssignees(emails, data.project_code || data.name || variables.name || '', data.$id);
      }
    },
    onError: () => toast.error('Failed to create project'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateProjectExecutionInput> }) =>
      updateProjectExecution(id, input),
    onSuccess: (data, variables) => {
      invalidate();
      setIsDialogOpen(false);
      setProjectToEdit(null);
      toast.success('Project updated');

      // Send emails/notifications to newly added assignees if applicable
      const emails: string[] = [];
      if (variables.input.engineer) {
        emails.push(...variables.input.engineer.split(',').map((s) => s.trim()).filter(Boolean));
      }
      if (variables.input.planning_engineer) {
        emails.push(...variables.input.planning_engineer.split(',').map((s) => s.trim()).filter(Boolean));
      }
      if (variables.input.sales_manager) {
        emails.push(...variables.input.sales_manager.split(',').map((s) => s.trim()).filter(Boolean));
      }
      if (emails.length > 0) {
        notifyAssignees(emails, data.project_code || data.name || variables.input.name || '', data.$id);
      }
    },
    onError: () => toast.error('Failed to update project'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProjectExecutionStatus }) =>
      updateProjectExecutionStatus(id, status),
    onSuccess: () => {
      invalidate();
      toast.success('Project status updated');
    },
    onError: () => toast.error('Failed to update project status'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProjectExecution,
    onSuccess: () => {
      invalidate();
      toast.success('Project deleted');
      setIsDeleteConfirmOpen(false);
      setProjectToDelete(null);
    },
    onError: () => toast.error('Failed to delete project'),
  });

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
            <AlertDescription>
              Please contact an administrator if you believe this is an error.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const projects = data?.documents ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PROJECT_EXECUTION_PAGE_SIZE));

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Project Execution</CardTitle>
            <CardDescription>Track and manage solar installation projects from kickoff to handover.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={() => setIsManageTypesOpen(true)}>
                <Tags className="mr-2 h-4 w-4" /> Add Project Types
              </Button>
            )}
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Project
            </Button>
          </div>
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
      </div>

      {/* Search & Filters */}
      {role === 'admin' ? (
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by project ID, name or client..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={filter}
            onValueChange={(val) => { setFilter(val as ProjectExecutionStatus | 'all'); setPage(0); }}
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
      ) : (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by project ID, name or client..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex justify-between items-center gap-2 flex-wrap">
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
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
                onClick={() => { setAssignmentFilter('me'); setPage(0); }}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  assignmentFilter === 'me' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Assigned to me
              </button>
            </div>

            <Select
              value={filter}
              onValueChange={(val) => { setFilter(val as ProjectExecutionStatus | 'all'); setPage(0); }}
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
      )}

      {/* Projects */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No projects found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <ProjectExecutionCard
              key={project.$id}
              project={project}
              users={usersList}
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
              onDelete={(id) => {
                setProjectToDelete({ id, name: project.project_code || project.name });
                setIsDeleteConfirmOpen(true);
              }}
              onEdit={(proj) => {
                setProjectToEdit(proj);
                setIsDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <SimplePagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PROJECT_EXECUTION_PAGE_SIZE}
        onPageChange={setPage}
        label="projects"
      />

      <ProjectExecutionFormDialog
        isOpen={isDialogOpen}
        setIsOpen={(open) => {
          setIsDialogOpen(open);
          if (!open) setProjectToEdit(null);
        }}
        project={projectToEdit || undefined}
        onSave={(input) => {
          if (projectToEdit) {
            editMutation.mutate({ id: projectToEdit.$id, input });
          } else {
            createMutation.mutate(input);
          }
        }}
        isSaving={createMutation.isPending || editMutation.isPending}
      />

      {isAdmin && (
        <ManageProjectTypesDialog isOpen={isManageTypesOpen} setIsOpen={setIsManageTypesOpen} />
      )}

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Delete Project Execution"
        description={projectToDelete ? `Are you sure you want to delete the project "${projectToDelete.name}"? This action cannot be undone.` : ''}
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (projectToDelete) {
            deleteMutation.mutate(projectToDelete.id);
          }
        }}
      />
    </div>
  );
};

export default ProjectExecutionSection;
