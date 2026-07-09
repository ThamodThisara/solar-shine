import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Tag, Search, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  fetchDocumentTypes,
  createDocumentType,
  deleteDocumentType,
  updateDocumentType,
} from '@/services/documentTypeService';
import { fetchDocuments } from '@/services/documentService';

interface ManageDocumentTypesDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const ManageDocumentTypesDialog: React.FC<ManageDocumentTypesDialogProps> = ({ isOpen, setIsOpen }) => {
  const queryClient = useQueryClient();
  const [type, setType] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

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
      setDepartment('all');
      toast.success('Document type added');
    },
    onError: () => toast.error('Failed to add document type'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: any }) => updateDocumentType(id, input),
    onSuccess: () => {
      invalidate();
      setType('');
      setName('');
      setDepartment('all');
      setEditingId(null);
      toast.success('Document type updated');
    },
    onError: () => toast.error('Failed to update document type'),
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
    if (!isFormValid || createMutation.isPending || updateMutation.isPending) return;

    const duplicate = documentTypes.some(
      (dt) =>
        dt.$id !== editingId &&
        dt.type.toLowerCase() === trimmedType.toLowerCase() &&
        (dt.department || 'all') === department
    );
    if (duplicate) {
      toast.error(`Document type "${trimmedType}" already exists in the selected department`);
      return;
    }

    if (editingId) {
      setIsConfirmOpen(true);
    } else {
      createMutation.mutate({ type: trimmedType, name: trimmedName, department });
    }
  };

  const confirmUpdate = () => {
    setIsConfirmOpen(false);
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      input: { type: trimmedType, name: trimmedName, department },
    });
  };

  const handleDelete = async (id: string, code: string) => {
    try {
      const res = await fetchDocuments({ documentTypeId: id, page: 0 });
      if (res.total > 0) {
        toast.error(`Cannot delete document type "${code}". There are ${res.total} document(s) uploaded under this type.`);
        return;
      }
      deleteMutation.mutate(id);
    } catch (error) {
      console.error(error);
      toast.error('Failed to check documents count before deleting');
    }
  };

  const handleEditClick = (dt: any) => {
    setEditingId(dt.$id);
    setType(dt.type);
    setName(dt.name);
    setDepartment(dt.department || 'all');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setType('');
    setName('');
    setDepartment('all');
  };

  const displayedTypes = useMemo(() => {
    let filtered = documentTypes;
    if (department !== 'all') {
      filtered = filtered.filter((dt) => dt.department === department);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (dt) =>
          dt.name.toLowerCase().includes(term) ||
          dt.type.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [documentTypes, department, searchTerm]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Manage Document Types</DialogTitle>
          <DialogDescription>
            Add or edit the document types available across the Document Center. These drive the
            upload and filter options.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="document-type-dept">Department</Label>
              <select
                id="document-type-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="all">All Departments</option>
                <option value="engineer">Engineer</option>
                <option value="sales">Sales</option>
                <option value="admin">Admin</option>
                <option value="hr">HR</option>
              </select>
            </div>
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
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <Button type="submit" className="w-full sm:w-auto font-semibold" disabled={!isFormValid || createMutation.isPending || updateMutation.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                {editingId ? (updateMutation.isPending ? 'Updating...' : 'Update') : (createMutation.isPending ? 'Adding...' : 'Add')}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" className="w-full sm:w-auto font-semibold" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search document types below..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 text-sm"
              />
            </div>
          </div>
        </form>

        <div className="mt-2 max-h-[45vh] overflow-y-auto space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          ) : displayedTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No matching document types found.
            </p>
          ) : (
            displayedTypes.map((dt) => (
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
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{dt.type}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{dt.department || 'all'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-primary border-primary hover:bg-primary/5 h-8 w-8 p-0 flex items-center justify-center flex-shrink-0"
                    disabled={deleteMutation.isPending || updateMutation.isPending}
                    onClick={() => handleEditClick(dt)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-600 hover:bg-red-50 h-8 w-8 p-0 flex items-center justify-center flex-shrink-0"
                    disabled={deleteMutation.isPending || updateMutation.isPending}
                    onClick={() => handleDelete(dt.$id, dt.type)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Update Document Type?"
        description="Are you sure you want to update this document type? This will instantly change the document type name/code for all existing uploaded documents linked to this type."
        onConfirm={confirmUpdate}
        confirmText="Update"
        cancelText="Cancel"
      />
    </Dialog>
  );
};

export default ManageDocumentTypesDialog;
