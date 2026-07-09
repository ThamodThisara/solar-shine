import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchProjectTypes,
  createProjectType,
  deleteProjectType,
} from '@/services/projectTypeService';

interface ManageProjectTypesDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const ManageProjectTypesDialog: React.FC<ManageProjectTypesDialogProps> = ({ isOpen, setIsOpen }) => {
  const queryClient = useQueryClient();
  const [prefixCode, setPrefixCode] = useState('');
  const [serviceTitle, setServiceTitle] = useState('');

  const { data: projectTypes = [], isLoading } = useQuery({
    queryKey: ['project-types'],
    queryFn: fetchProjectTypes,
    enabled: isOpen,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['project-types'] });

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

  const trimmedCode = prefixCode.trim();
  const trimmedTitle = serviceTitle.trim();
  const isFormValid = trimmedCode.length > 0 && trimmedTitle.length > 0;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || createMutation.isPending) return;
    const duplicate = projectTypes.some(
      (pt) => pt.prefix_code.toLowerCase() === trimmedCode.toLowerCase(),
    );
    if (duplicate) {
      toast.error(`Prefix code "${trimmedCode}" already exists`);
      return;
    }
    createMutation.mutate({ prefix_code: trimmedCode, service_title: trimmedTitle });
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

        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-3 items-end">
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
          <Button type="submit" disabled={!isFormValid || createMutation.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            {createMutation.isPending ? 'Adding...' : 'Add'}
          </Button>
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
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-600 hover:bg-red-50 flex-shrink-0"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(pt.$id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageProjectTypesDialog;
