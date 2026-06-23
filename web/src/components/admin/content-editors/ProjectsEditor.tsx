import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Terminal } from 'lucide-react';
import { fetchProjects, updateProject, addProject, deleteProject } from '@/services/projectService';
import { Project } from '@/types/payload-types';
import ProjectsTable from './project/ProjectsTable';
import ProjectFormDialog from './project/ProjectFormDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const ProjectsEditor: React.FC = () => {
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    enabled: isAdmin,
    meta: {
      onError: (error: Error) => toast.error(`Failed to load projects: ${error.message}`),
    },
  });

  const onMutationSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    setIsDialogOpen(false);
    setSelectedProject(null);
  };

  const addMutation = useMutation({
    mutationFn: addProject,
    onSuccess: () => {
      onMutationSuccess();
      toast.success('Project added successfully');
    },
    onError: () => toast.error('Failed to add project'),
  });

  const updateMutation = useMutation({
    mutationFn: updateProject,
    onSuccess: () => {
      onMutationSuccess();
      toast.success('Project updated successfully');
    },
    onError: () => toast.error('Failed to update project'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted successfully');
    },
    onError: () => toast.error('Failed to delete project'),
  });

  const handleSave = (formData: FormData) => {
    if (selectedProject) {
      formData.append('id', selectedProject.$id);
      updateMutation.mutate(formData);
    } else {
      addMutation.mutate(formData);
    }
  };

  const handleAddNew = () => {
    setSelectedProject(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setIsDialogOpen(true);
  };

  if (isAuthLoading) {
    return <Card><CardContent className="p-6 text-center">Authenticating...</CardContent></Card>;
  }
  
  if (!isAdmin) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
          <CardDescription>You do not have permission to manage projects.</CardDescription>
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Manage your company's showcased projects.</CardDescription>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" /> Add Project
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <ProjectsTable projects={projects} onEdit={handleEdit} onDelete={(id: string) => deleteMutation.mutate(id)} />
        )}
        <ProjectFormDialog
          isOpen={isDialogOpen}
          setIsOpen={setIsDialogOpen}
          project={selectedProject}
          onSave={handleSave}
          isSaving={addMutation.isPending || updateMutation.isPending}
        />
      </CardContent>
    </Card>
  );
};

export default ProjectsEditor;
