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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  fetchDocumentTypes,
  createDocumentType,
  deleteDocumentType,
  updateDocumentType,
  getTypeDepartments,
  typeServesDepartment,
  ALL_DEPARTMENTS,
  DOCUMENT_TYPE_DEPARTMENTS,
  CreateDocumentTypeInput,
} from '@/services/documentTypeService';
import { fetchDocuments } from '@/services/documentService';
import { DocumentType } from '@/types/payload-types';

interface ManageDocumentTypesDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const departmentLabel = (value: string) =>
  value === ALL_DEPARTMENTS
    ? 'All Departments'
    : DOCUMENT_TYPE_DEPARTMENTS.find((d) => d.value === value)?.label ?? value;

const ManageDocumentTypesDialog: React.FC<ManageDocumentTypesDialogProps> = ({ isOpen, setIsOpen }) => {
  const queryClient = useQueryClient();
  const [type, setType] = useState('');
  const [name, setName] = useState('');
  const [departments, setDepartments] = useState<string[]>([ALL_DEPARTMENTS]);
  // Filters the list below; independent of the departments picked in the form.
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetCode, setDeleteTargetCode] = useState('');
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDescription, setAlertDescription] = useState('');

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
      setDepartments([ALL_DEPARTMENTS]);
      toast.success('Document type added');
    },
    onError: () => toast.error('Failed to add document type'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateDocumentTypeInput }) => updateDocumentType(id, input),
    onSuccess: () => {
      invalidate();
      setType('');
      setName('');
      setDepartments([ALL_DEPARTMENTS]);
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
  const isFormValid = trimmedType.length > 0 && trimmedName.length > 0 && departments.length > 0;

  // "All Departments" is exclusive: it already implies every department, so it
  // can't be combined with individual picks.
  const toggleDepartment = (value: string, checked: boolean) => {
    setDepartments((prev) => {
      if (value === ALL_DEPARTMENTS) return checked ? [ALL_DEPARTMENTS] : [];
      const next = checked
        ? [...prev.filter((d) => d !== ALL_DEPARTMENTS), value]
        : prev.filter((d) => d !== value);
      return next;
    });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || createMutation.isPending || updateMutation.isPending) return;

    // A code may repeat across departments but must stay unique within any one
    // of them, so a clash is an overlap between the two department sets.
    const clash = documentTypes.find((dt) => {
      if (dt.$id === editingId) return false;
      if (dt.type.toLowerCase() !== trimmedType.toLowerCase()) return false;
      const existing = getTypeDepartments(dt);
      if (existing.includes(ALL_DEPARTMENTS) || departments.includes(ALL_DEPARTMENTS)) return true;
      return existing.some((d) => departments.includes(d));
    });
    if (clash) {
      const overlap = getTypeDepartments(clash);
      toast.error(
        `Document type "${trimmedType}" already exists in: ${overlap.map(departmentLabel).join(', ')}`
      );
      return;
    }

    if (editingId) {
      setIsConfirmOpen(true);
    } else {
      createMutation.mutate({ type: trimmedType, name: trimmedName, departments });
    }
  };

  const confirmUpdate = () => {
    setIsConfirmOpen(false);
    if (!editingId) return;
    updateMutation.mutate({
      id: editingId,
      input: { type: trimmedType, name: trimmedName, departments },
    });
  };

  const handleDelete = async (id: string, code: string) => {
    try {
      const res = await fetchDocuments({ documentTypeId: id, page: 0 });
      if (res.total > 0) {
        setAlertTitle('Cannot Delete Document Type');
        setAlertDescription(`Cannot delete document type "${code}". There are ${res.total} document(s) uploaded under this type.`);
        setIsAlertOpen(true);
        return;
      }
      setDeleteTargetId(id);
      setDeleteTargetCode(code);
      setIsDeleteConfirmOpen(true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to check documents count before deleting');
    }
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    deleteMutation.mutate(deleteTargetId);
    setIsDeleteConfirmOpen(false);
    setDeleteTargetId(null);
    setDeleteTargetCode('');
  };

  const handleEditClick = (dt: DocumentType) => {
    setEditingId(dt.$id);
    setType(dt.type);
    setName(dt.name);
    setDepartments(getTypeDepartments(dt));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setType('');
    setName('');
    setDepartment('all');
  };

  const displayedTypes = useMemo(() => {
    let filtered = documentTypes;
    if (filterDepartment !== 'all') {
      filtered = filtered.filter((dt) => typeServesDepartment(dt, filterDepartment));
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
  }, [documentTypes, filterDepartment, searchTerm]);

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
          <div>
            <Label>Departments</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select every department this document type should appear under.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {[{ value: ALL_DEPARTMENTS, label: 'All Departments' }, ...DOCUMENT_TYPE_DEPARTMENTS].map((dept) => {
                const isChecked = departments.includes(dept.value);
                return (
                  <label
                    key={dept.value}
                    htmlFor={`document-type-dept-${dept.value}`}
                    className="flex items-center space-x-2 border rounded-md p-2 bg-muted/20 hover:bg-muted/50 transition-colors cursor-pointer min-h-10"
                  >
                    <Checkbox
                      id={`document-type-dept-${dept.value}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => toggleDepartment(dept.value, checked === true)}
                    />
                    <span className="text-sm font-medium leading-none">{dept.label}</span>
                  </label>
                );
              })}
            </div>
            {departments.length === 0 && (
              <p className="text-xs text-red-600 mt-1.5">Select at least one department.</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                {!editingId && <Plus className="mr-2 h-4 w-4" />}
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
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="h-10 text-sm w-full sm:w-[180px] shrink-0" aria-label="Filter list by department">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DOCUMENT_TYPE_DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{dt.type}</span>
                      {getTypeDepartments(dt).map((dept) => (
                        <span
                          key={dept}
                          className="text-[10px] uppercase font-bold tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-full"
                        >
                          {dept}
                        </span>
                      ))}
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
      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Delete Document Type?"
        description={`Are you sure you want to delete the document type "${deleteTargetCode}"? This action cannot be undone.`}
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
    </Dialog>
  );
};

export default ManageDocumentTypesDialog;
