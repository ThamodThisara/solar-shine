import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderPlus, Globe, Lock, Save, Users, Trash2, ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Combobox } from '@/components/ui/combobox';
import { cn } from '@/lib/utils';
import { DocumentFolder, FolderType } from '@/types/payload-types';
import { FolderInput } from '@/services/folderService';
import { fetchDepartments } from '@/services/roleService';
import { fetchUsers } from '@/services/userService';
import { DOCUMENT_TYPE_DEPARTMENTS } from '@/lib/documentTypes';

interface FolderTypeOption {
  value: FolderType;
  label: string;
  description: string;
  icon: React.ElementType;
}

const FOLDER_TYPE_OPTIONS: FolderTypeOption[] = [
  {
    value: 'personal',
    label: 'Personal',
    description: 'Only you can see this folder and everything inside it.',
    icon: Lock,
  },
  {
    value: 'public',
    label: 'Public',
    description: 'Visible to every user, across all departments and roles.',
    icon: Globe,
  },
  {
    value: 'dynamic',
    label: 'Dynamic',
    description: 'Shared with the departments and people you choose.',
    icon: Users,
  },
];

interface FolderFormDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  /** Folder being edited; omit to create a new one. */
  folder?: DocumentFolder | null;
  /** Folder types the current role is allowed to create. */
  allowedTypes: FolderType[];
  onSubmit: (input: FolderInput) => void;
  isSaving: boolean;
}

const emptyState = {
  name: '',
  description: '',
  folderType: '' as FolderType | '',
  departments: [] as string[],
  users: [] as string[],
};

export const FolderFormDialog: React.FC<FolderFormDialogProps> = ({
  isOpen,
  setIsOpen,
  folder,
  allowedTypes,
  onSubmit,
  isSaving,
}) => {
  const isEditing = !!folder;
  const [state, setState] = useState(emptyState);
  const [userToAdd, setUserToAdd] = useState('');

  // Departments come from the same source the Roles & Permissions matrix uses,
  // so a folder can be shared with any department an administrator has created.
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
    enabled: isOpen,
  });

  const { data: users = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ['platform-users-folders'],
    queryFn: () => fetchUsers(),
    enabled: isOpen,
  });

  const departmentOptions = useMemo(() => {
    if (departments.length > 0) {
      return departments.map((d) => ({ value: d.slug, label: d.name }));
    }
    // The departments collection may not be seeded yet; fall back to the static
    // taxonomy so dynamic folders remain usable.
    return DOCUMENT_TYPE_DEPARTMENTS;
  }, [departments]);

  // An existing folder keeps its own type selectable even when the role can no
  // longer create that type, so editing its name never silently converts it.
  const selectableTypes = useMemo(() => {
    const values = new Set<FolderType>(allowedTypes);
    if (folder) values.add(folder.folder_type);
    return FOLDER_TYPE_OPTIONS.filter((option) => values.has(option.value));
  }, [allowedTypes, folder]);

  useEffect(() => {
    if (!isOpen) return;
    setUserToAdd('');
    if (folder) {
      setState({
        name: folder.name,
        description: folder.description ?? '',
        folderType: folder.folder_type,
        departments: folder.allowed_departments ?? [],
        users: folder.allowed_users ?? [],
      });
    } else {
      setState({
        ...emptyState,
        // Pre-select when there is only one type on offer.
        folderType: allowedTypes.length === 1 ? allowedTypes[0] : '',
      });
    }
  }, [isOpen, folder, allowedTypes]);

  const isDynamic = state.folderType === 'dynamic';
  const hasAudience = state.departments.length > 0 || state.users.length > 0;
  const isValid = !!state.name.trim() && !!state.folderType && (!isDynamic || hasAudience);

  const toggleDepartment = (slug: string) => {
    setState((s) => ({
      ...s,
      departments: s.departments.includes(slug)
        ? s.departments.filter((d) => d !== slug)
        : [...s.departments, slug],
    }));
  };

  const addUser = (userId: string) => {
    if (!userId) return;
    setState((s) => (s.users.includes(userId) ? s : { ...s, users: [...s.users, userId] }));
    setUserToAdd('');
  };

  const removeUser = (userId: string) => {
    setState((s) => ({ ...s, users: s.users.filter((id) => id !== userId) }));
  };

  const resolveUserLabel = (id: string) => {
    const match = users.find((u) => u.$id === id);
    if (!match) return id;
    return match.name ? `${match.name} (${match.email})` : match.email;
  };

  const userOptions = users
    .filter((u) => !state.users.includes(u.$id))
    .map((u) => ({
      value: u.$id,
      label: u.name ? `${u.name} (${u.email})` : u.email,
      keywords: `${u.name || ''} ${u.email}`,
      group: u.role ? u.role.replace(/_/g, ' ') : 'Unassigned',
    }));

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({
      name: state.name,
      description: state.description,
      folderType: state.folderType as FolderType,
      allowedDepartments: state.departments,
      allowedUsers: state.users,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            {isEditing ? 'Folder Settings' : 'Create Folder'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Rename the folder or update who can see it. Changes apply immediately.'
              : 'Group documents into a folder and choose who can see them.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                placeholder="e.g., Tender Submissions"
                value={state.name}
                onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="folder-description">Description (optional)</Label>
              <Textarea
                id="folder-description"
                placeholder="What belongs in this folder?"
                rows={1}
                className="min-h-10 resize-none"
                value={state.description}
                onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Folder Type</Label>
            {selectableTypes.length === 0 ? (
              <div className="flex items-start gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                <ShieldAlert className="h-4 w-4 flex-shrink-0 text-amber-500" />
                Your role is not allowed to create any folder type. Contact an administrator.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {selectableTypes.map((option) => {
                  const Icon = option.icon;
                  const isSelected = state.folderType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setState((s) => ({ ...s, folderType: option.value }))}
                      className={cn(
                        'flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                          : 'border-input hover:bg-accent',
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <Icon className={cn('h-4 w-4', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                        {option.label}
                      </span>
                      <span className="text-[11px] leading-snug text-muted-foreground">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {isDynamic && (
            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Departments with access</Label>
                <div className="flex flex-wrap gap-2">
                  {departmentOptions.map((dept) => {
                    const isSelected = state.departments.includes(dept.value);
                    return (
                      <button
                        key={dept.value}
                        type="button"
                        onClick={() => toggleDepartment(dept.value)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input bg-background hover:bg-accent',
                        )}
                      >
                        {dept.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Individual users with access</Label>
                <Combobox
                  modal
                  value={userToAdd}
                  onChange={addUser}
                  placeholder={isUsersLoading ? 'Loading users...' : 'Add a user...'}
                  searchPlaceholder="Search by name or email..."
                  emptyText="No users found."
                  options={userOptions}
                />
                {state.users.length > 0 && (
                  <ScrollArea className="max-h-[130px] rounded-md border bg-background p-2">
                    <div className="space-y-1.5">
                      {state.users.map((id) => (
                        <div
                          key={id}
                          className="flex items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-1.5 text-xs"
                        >
                          <span className="truncate font-medium">{resolveUserLabel(id)}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeUser(id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {!hasAudience && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Select at least one department or user — otherwise nobody but you could open the folder.
                </p>
              )}
            </div>
          )}

          {state.folderType === 'public' && (
            <Badge variant="secondary" className="font-normal">
              Everyone will be able to open this folder and its documents.
            </Badge>
          )}
          {state.folderType === 'personal' && (
            <Badge variant="secondary" className="font-normal">
              Only you will be able to open this folder and its documents.
            </Badge>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSaving}>
            {isEditing ? <Save className="mr-2 h-4 w-4" /> : <FolderPlus className="mr-2 h-4 w-4" />}
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FolderFormDialog;
