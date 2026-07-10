import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Layers, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ProjectType } from '@/types/payload-types';
import {
  fetchProjectTypes,
  createProjectType,
  deleteProjectType,
  updateProjectType,
  checkProjectsForPrefix,
  CreateProjectTypeInput,
} from '@/services/projectTypeService';

interface ManageProjectTypesDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const ManageProjectTypesDialog: React.FC<ManageProjectTypesDialogProps> = ({ isOpen, setIsOpen }) => {
  const queryClient = useQueryClient();
  const [prefixCode, setPrefixCode] = useState('');
  const [serviceTitle, setServiceTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [oldPrefixCode, setOldPrefixCode] = useState('');

  // Confirmation dialogs state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetPrefix, setDeleteTargetPrefix] = useState('');
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDescription, setAlertDescription] = useState('');

  const { data: projectTypes = [], isLoading } = useQuery({
    queryKey: ['project-types'],
    queryFn: fetchProjectTypes,
    enabled: isOpen,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['project-types'] });
    queryClient.invalidateQueries({ queryKey: ['project-executions'] });
    queryClient.invalidateQueries({ queryKey: ['project-executions-stats'] });
    queryClient.invalidateQueries({ queryKey: ['project-execution-options'] });
    queryClient.invalidateQueries({ queryKey: ['site-visits'] });
    queryClient.invalidateQueries({ queryKey: ['site-visits-stats'] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['documents-recent'] });
    queryClient.invalidateQueries({ queryKey: ['documents-search'] });
  };

  const createMutation = useMutation({
    mutationFn: createProjectType,
    onSuccess: () => {
      invalidate();
      setPrefixCode('');
      setServiceTitle('');
      toast.success('Project type added');
    },
    onError: () => toast.error('Failed to add project type'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProjectType,
    onSuccess: () => {
      invalidate();
      toast.success('Project type deleted');
    },
    onError: () => toast.error('Failed to delete project type'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input, oldPrefix }: { id: string; input: CreateProjectTypeInput; oldPrefix: string }) =>
      updateProjectType(id, input, oldPrefix),
    onSuccess: () => {
      invalidate();
      setPrefixCode('');
      setServiceTitle('');
      setEditingId(null);
      setOldPrefixCode('');
      toast.success('Project type updated');
    },
    onError: () => toast.error('Failed to update project type'),
  });

  const trimmedCode = prefixCode.trim();
  const trimmedTitle = serviceTitle.trim();
  const isFormValid = trimmedCode.length > 0 && trimmedTitle.length > 0;

  const handleEditClick = (pt: ProjectType) => {
    setEditingId(pt.$id);
    setPrefixCode(pt.prefix_code);
    setServiceTitle(pt.service_title);
    setOldPrefixCode(pt.prefix_code);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setPrefixCode('');
    setServiceTitle('');
    setOldPrefixCode('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || createMutation.isPending || updateMutation.isPending) return;

    // Check duplicate prefix code (excluding current editing item)
    const duplicate = projectTypes.some(
      (pt) => pt.$id !== editingId && pt.prefix_code.toLowerCase() === trimmedCode.toLowerCase()
    );
    if (duplicate) {
      toast.error(`Prefix code "${trimmedCode}" already exists`);
      return;
    }

    if (editingId) {
      setIsConfirmOpen(true);
    } else {
      createMutation.mutate({ prefix_code: trimmedCode, service_title: trimmedTitle });
    }
  };

  const confirmUpdate = () => {
    setIsConfirmOpen(false);
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      input: { prefix_code: trimmedCode, service_title: trimmedTitle },
      oldPrefix: oldPrefixCode,
    });
  };

  const handleDeleteClick = async (id: string, prefixCodeToDelete: string) => {
    try {
      const activeProjectsCount = await checkProjectsForPrefix(prefixCodeToDelete);
      if (activeProjectsCount > 0) {
        setAlertTitle('Cannot Delete Project Type');
        setAlertDescription(`Cannot delete project type with prefix "${prefixCodeToDelete}". There are ${activeProjectsCount} project(s) under this project type.`);
        setIsAlertOpen(true);
        return;
      }
      setDeleteTargetId(id);
      setDeleteTargetPrefix(prefixCodeToDelete);
      setIsDeleteConfirmOpen(true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to check projects count before deleting');
    }
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    deleteMutation.mutate(deleteTargetId);
    setIsDeleteConfirmOpen(false);
    setDeleteTargetId(null);
    setDeleteTargetPrefix('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle>Manage Project Types</DialogTitle>
          <DialogDescription>
            Add the project types available in Project Execution. These define the service
            category and prefix code used for each project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-3 items-end">
          <div>
            <Label htmlFor="project-type-code">Prefix Code</Label>
            <Input
              id="project-type-code"
              value={prefixCode}
              onChange={(e) => setPrefixCode(e.target.value.toUpperCase())}
              placeholder="e.g. PRO"
              maxLength={20}
              className="w-28"
            />
          </div>
          <div>
            <Label htmlFor="project-type-title">Service Title</Label>
            <Input
              id="project-type-title"
              value={serviceTitle}
              onChange={(e) => setServiceTitle(e.target.value)}
              placeholder="e.g. Professional Service (Operations & Maintenance)"
              maxLength={255}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={!isFormValid || createMutation.isPending || updateMutation.isPending}>
              {!editingId && <Plus className="mr-2 h-4 w-4" />}
              {editingId ? (updateMutation.isPending ? 'Updating...' : 'Update') : (createMutation.isPending ? 'Adding...' : 'Add')}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
            )}
          </div>
        </form>

        <div className="mt-2 max-h-[45vh] overflow-y-auto space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          ) : projectTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No project types yet. Add your first one above.
            </p>
          ) : (
            projectTypes.map((pt) => (
              <div
                key={pt.$id}
                className="flex items-center justify-between gap-3 border rounded-md px-3 py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Layers className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{pt.service_title}</p>
                    <p className="text-xs text-muted-foreground font-mono">{pt.prefix_code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-primary border-primary hover:bg-primary/5 h-8 w-8 p-0 flex items-center justify-center flex-shrink-0"
                    disabled={deleteMutation.isPending || updateMutation.isPending}
                    onClick={() => handleEditClick(pt)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-600 hover:bg-red-50 h-8 w-8 p-0 flex items-center justify-center flex-shrink-0"
                    disabled={deleteMutation.isPending || updateMutation.isPending}
                    onClick={() => handleDeleteClick(pt.$id, pt.prefix_code)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        <ConfirmDialog
          open={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          title="Update Project Type?"
          description="Are you sure you want to update this project type? This will instantly change the prefix code and rename the project codes of all existing projects linked to this type."
          onConfirm={confirmUpdate}
          confirmText="Update"
          cancelText="Cancel"
        />
        <ConfirmDialog
          open={isDeleteConfirmOpen}
          onOpenChange={setIsDeleteConfirmOpen}
          title="Delete Project Type?"
          description={`Are you sure you want to delete the project type "${deleteTargetPrefix}"? This action cannot be undone.`}
          onConfirm={confirmDelete}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
        <ConfirmDialog
          open={isAlertOpen}
          onOpenChange={setIsAlertOpen}
          title={alertTitle}
          description={alertDescription}
          onConfirm={() => setIsAlertOpen(false)}
          confirmText="OK"
          showCancel={false}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ManageProjectTypesDialog;
