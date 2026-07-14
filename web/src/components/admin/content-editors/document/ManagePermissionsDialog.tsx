import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShieldAlert, Users, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Combobox } from '@/components/ui/combobox';
import { DocumentRecord, Department } from '@/types/payload-types';
import { updateDocumentPermissions } from '@/services/documentService';
import { fetchUsers } from '@/services/userService';
import { fetchDocumentTypes } from '@/services/documentTypeService';

interface ManagePermissionsDialogProps {
  doc: DocumentRecord;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const DEPARTMENTS: { value: Department; label: string }[] = [
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'HR', label: 'HR' },
];

export const ManagePermissionsDialog: React.FC<ManagePermissionsDialogProps> = ({
  doc,
  isOpen,
  onOpenChange,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchValue, setUserSearchValue] = useState<string>('');

  // Fetch all platform users
  const { data: allUsers = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ['platform-users-permissions'],
    queryFn: () => fetchUsers(),
    enabled: isOpen,
  });

  // Fetch all document types to determine the owner department of this document type
  const { data: documentTypes = [] } = useQuery({
    queryKey: ['document-types-permissions'],
    queryFn: () => fetchDocumentTypes(),
    enabled: isOpen,
  });

  const docType = useMemo(() => {
    return documentTypes.find(dt => dt.$id === doc.document_type_id);
  }, [documentTypes, doc.document_type_id]);

  const ownerDept = useMemo(() => {
    if (!docType || !docType.department) return null;
    if (docType.department === 'engineer') return 'Engineering';
    if (docType.department === 'sales') return 'Sales';
    if (docType.department === 'hr') return 'HR';
    if (docType.department === 'admin') return 'Finance';
    return null;
  }, [docType]);

  // Sync state with doc when opened
  useEffect(() => {
    if (isOpen && doc) {
      const depts = doc.allowed_departments || [];
      const legacyDept = doc.department;
      
      // If legacy single department is set, import it to allowed_departments initially
      let initialDepts = [...depts];
      if (legacyDept && !initialDepts.includes(legacyDept)) {
        initialDepts.push(legacyDept);
      }

      // Ensure ownerDept is checked by default
      if (ownerDept && !initialDepts.includes(ownerDept)) {
        initialDepts.push(ownerDept);
      }
      
      // If both allowed lists are empty (never customized) and visibility is internal, default to all departments
      const allowedUsers = doc.allowed_users || [];
      if (initialDepts.length === 0 && allowedUsers.length === 0 && doc.document_visibility === 'internal') {
        initialDepts = DEPARTMENTS.map(d => d.value);
      }
      
      setSelectedDepts(initialDepts);
      setSelectedUserIds(allowedUsers);
      setUserSearchValue('');
    }
  }, [isOpen, doc, ownerDept]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const deptsToSave = [...selectedDepts];
      if (ownerDept && !deptsToSave.includes(ownerDept)) {
        deptsToSave.push(ownerDept);
      }
      return updateDocumentPermissions(doc.$id, deptsToSave, selectedUserIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents-recent'] });
      queryClient.invalidateQueries({ queryKey: ['site-visit-documents'] });
      queryClient.invalidateQueries({ queryKey: ['project-general-docs'] });
      toast.success('Permissions updated successfully');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(`Failed to update permissions: ${err.message}`);
    },
  });

  const handleToggleDept = (dept: string, checked: boolean) => {
    if (checked) {
      setSelectedDepts((prev) => [...prev, dept]);
    } else {
      setSelectedDepts((prev) => prev.filter((d) => d !== dept));
    }
  };

  const handleAddUser = (userId: string) => {
    if (!userId) return;
    if (selectedUserIds.includes(userId)) {
      toast.error('User already has explicit access');
      return;
    }
    setSelectedUserIds((prev) => [...prev, userId]);
    setUserSearchValue('');
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
  };

  const userOptions = allUsers
    .filter((u) => u.$id !== doc.uploaded_by && !selectedUserIds.includes(u.$id))
    .map((u) => ({
      value: u.$id,
      label: `${u.name} (${u.email})`,
      keywords: `${u.name} ${u.email}`,
    }));

  const resolveUserName = (id: string) => {
    const u = allUsers.find((user) => user.$id === id);
    return u ? `${u.name} (${u.email})` : id;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" /> Manage Document Permissions
          </DialogTitle>
          <DialogDescription className="truncate" title={doc.file_name}>
            Set view access for document: {doc.file_name}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Departments Permission */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              Department Access
            </h4>
            <p className="text-xs text-muted-foreground">
              Select which departments are allowed to view this document.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              {DEPARTMENTS.map((dept) => {
                const isOwner = ownerDept === dept.value;
                return (
                  <div
                    key={dept.value}
                    className="flex items-center space-x-2 border rounded-md p-2 bg-muted/20 hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`dept-${dept.value}`}
                      checked={isOwner || selectedDepts.includes(dept.value)}
                      disabled={isOwner}
                      onCheckedChange={(checked) =>
                        handleToggleDept(dept.value, !!checked)
                      }
                    />
                    <Label
                      htmlFor={`dept-${dept.value}`}
                      className={`text-xs font-medium ${isOwner ? 'cursor-not-allowed text-muted-foreground opacity-70' : 'cursor-pointer'}`}
                    >
                      {dept.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-border/60" />

          {/* Users Permission */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              Specific User Access
            </h4>
            <p className="text-xs text-muted-foreground">
              Grant explicit view permission to individuals from other departments.
            </p>

            <div className="flex gap-2">
              <div className="flex-1">
                <Combobox
                  value={userSearchValue}
                  onChange={handleAddUser}
                  placeholder={
                    isUsersLoading ? 'Loading users...' : 'Search for a user...'
                  }
                  searchPlaceholder="Search by name or email..."
                  emptyText="No users found."
                  options={userOptions}
                  className="w-full"
                />
              </div>
            </div>

            {/* List of allowed users */}
            <div className="pt-2">
              <ScrollArea className="h-[120px] w-full border rounded-md p-2 bg-muted/10">
                {selectedUserIds.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground py-6">
                    <Users className="h-6 w-6 mb-1 opacity-40" />
                    No individual users added.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedUserIds.map((id) => (
                      <div
                        key={id}
                        className="flex items-center justify-between gap-2 border bg-card p-1.5 px-2.5 rounded-md text-xs"
                      >
                        <span className="font-medium truncate">
                          {resolveUserName(id)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                          onClick={() => handleRemoveUser(id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Permissions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
