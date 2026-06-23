import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Terminal, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessSection } from '@/config/roles';
import { cn } from '@/lib/utils';
import { ProjectExecutionStatus } from '@/types/payload-types';
import {
  fetchProjectExecutions,
  fetchProjectExecutionStats,
  createProjectExecution,
  updateProjectExecutionStatus,
  deleteProjectExecution,
  PROJECT_EXECUTION_PAGE_SIZE,
} from '@/services/projectExecutionService';
import ProjectExecutionCard from './ProjectExecutionCard';
import ProjectExecutionFormDialog from './content-editors/project-execution/ProjectExecutionFormDialog';

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
  const { role, isLoading: isAuthLoading } = useAuth();
  const canAccess = canAccessSection('project-execution', role);
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<ProjectExecutionStatus | 'all'>('all');
  const [page, setPage] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Debounce the search input so we don't query on every keystroke.
  React.useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['project-executions', filter, page, search],
    queryFn: () => fetchProjectExecutions({ page, status: filter, search }),
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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['project-executions'] });
    queryClient.invalidateQueries({ queryKey: ['project-executions-stats'] });
  };

  const createMutation = useMutation({
    mutationFn: createProjectExecution,
    onSuccess: () => {
      invalidate();
      setIsDialogOpen(false);
      toast.success('Project created');
    },
    onError: () => toast.error('Failed to create project'),
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
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Project
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
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search projects by name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {filterOptions.map((f) => (
          <button
            key={f.id}
            onClick={() => { setFilter(f.id); setPage(0); }}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              filter === f.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent text-muted-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

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
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > PROJECT_EXECUTION_PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} ({total} projects)
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

      <ProjectExecutionFormDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        onSave={(input) => createMutation.mutate(input)}
        isSaving={createMutation.isPending}
      />
    </div>
  );
};

export default ProjectExecutionSection;
