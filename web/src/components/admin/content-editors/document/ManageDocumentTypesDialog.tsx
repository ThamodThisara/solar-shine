import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchDocumentTypes,
  createDocumentType,
  deleteDocumentType,
} from '@/services/documentTypeService';

interface ManageDocumentTypesDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const ManageDocumentTypesDialog: React.FC<ManageDocumentTypesDialogProps> = ({ isOpen, setIsOpen }) => {
  const queryClient = useQueryClient();
  const [type, setType] = useState('');
  const [name, setName] = useState('');

  const { data: documentTypes = [], isLoading } = useQuery({
    queryKey: ['document-types'],
    queryFn: fetchDocumentTypes,
    enabled: isOpen,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['document-types'] });

  const createMutation = useMutation({
    mutationFn: createDocumentType,
    onSuccess: () => {
      invalidate();
      setType('');
      setName('');
      toast.success('Document type added');
    },
    onError: () => toast.error('Failed to add document type'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocumentType,
    onSuccess: () => {
      invalidate();
      toast.success('Document type deleted');
    },
    onError: () => toast.error('Failed to delete document type'),
  });

  const trimmedType = type.trim();
  const trimmedName = name.trim();
  const isFormValid = trimmedType.length > 0 && trimmedName.length > 0;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || createMutation.isPending) return;
    const duplicate = documentTypes.some(
      (dt) => dt.type.toLowerCase() === trimmedType.toLowerCase(),
    );
    if (duplicate) {
      toast.error(`Document type "${trimmedType}" already exists`);
      return;
    }
    createMutation.mutate({ type: trimmedType, name: trimmedName });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Manage Document Types</DialogTitle>
          <DialogDescription>
            Add the document types available across the Document Center. These drive the
            upload and filter options.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-3 items-end">
          <div>
            <Label htmlFor="document-type-code">Document Type</Label>
            <Input
              id="document-type-code"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g. D1"
              maxLength={50}
            />
          </div>
          <div>
            <Label htmlFor="document-type-name">Document Type Name</Label>
            <Input
              id="document-type-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Site Inspection Sheet"
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
          ) : documentTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No document types yet. Add your first one above.
            </p>
          ) : (
            documentTypes.map((dt) => (
              <div
                key={dt.$id}
                className="flex items-center justify-between gap-3 border rounded-md px-3 py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Tag className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{dt.name}</p>
                    <p className="text-xs text-muted-foreground">{dt.type}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-600 hover:bg-red-50 flex-shrink-0"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(dt.$id)}
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

export default ManageDocumentTypesDialog;
