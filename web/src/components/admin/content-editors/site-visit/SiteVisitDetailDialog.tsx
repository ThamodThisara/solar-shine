import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Pencil, Save, X, Send, UploadCloud, FileText, Clock, Camera } from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';
import { DocumentType, DocumentVisibility, SiteVisit, SiteVisitUpdateType, ProjectExecution } from '@/types/payload-types';
import {
  PRIORITY_OPTIONS, STATUS_OPTIONS, UPDATE_TYPE_OPTIONS,
  priorityStyles, statusStyles, priorityLabel, statusLabel, updateTypeLabel,
} from '@/lib/siteVisits';
import {
  updateSiteVisit, UpdateSiteVisitInput,
  fetchSiteVisitUpdates, addSiteVisitUpdate,
} from '@/services/siteVisitService';
import {
  fetchDocumentsBySiteVisit, uploadDocuments, deleteDocumentRecord,
} from '@/services/documentService';
import { isAllowedFile, ALLOWED_FILE_EXTENSIONS } from '@/lib/documentTypes';
import DocumentCard from '@/components/admin/DocumentCard';
import { PlatformUser, fetchEngineers } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import { MultiSelectPopover } from '@/components/ui/multi-select-popover';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface CurrentUser {
  $id: string;
  name: string;
}

interface SiteVisitDetailDialogProps {
  visit: SiteVisit;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  projectName: string;
  documentTypes: DocumentType[];
  currentUser: CurrentUser;
  /** Whether the current user may edit / add updates / upload (admin or assignee). */
  canEdit: boolean;
  isAdmin: boolean;
  users?: PlatformUser[];
  projects?: Pick<ProjectExecution, '$id' | 'name' | 'client' | 'engineer' | 'planning_engineer'>[];
  defaultTab?: 'details' | 'activity' | 'documents';
  hideTabs?: boolean;
}

interface EditState {
  title: string;
  reason: string;
  assigned_engineer_id: string;
  assigned_engineer_name: string;
  status: SiteVisit['status'];
  priority: SiteVisit['priority'];
  issue_observation: string;
  description: string;
  location_details: string;
  additional_notes: string;
  findings: string;
  visit_date: string;
  expected_completion_date: string;
}

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

const buildEditState = (v: SiteVisit): EditState => ({
  title: v.title ?? '',
  reason: v.reason ?? '',
  assigned_engineer_id: v.assigned_engineer_id ?? '',
  assigned_engineer_name: v.assigned_engineer_name ?? '',
  status: v.status,
  priority: v.priority,
  issue_observation: v.issue_observation ?? '',
  description: v.description ?? '',
  location_details: v.location_details ?? '',
  additional_notes: v.additional_notes ?? '',
  findings: v.findings ?? '',
  visit_date: toDateInput(v.visit_date),
  expected_completion_date: toDateInput(v.expected_completion_date),
});

const DetailRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="text-sm font-medium mt-0.5 whitespace-pre-wrap break-words">{value || '—'}</div>
  </div>
);

const SiteVisitDetailDialog: React.FC<SiteVisitDetailDialogProps> = ({
  visit, isOpen, setIsOpen, projectName, documentTypes, currentUser, canEdit, isAdmin, users = [], projects = [], defaultTab = 'details', hideTabs = false,
}) => {
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const filteredTypes = React.useMemo(() => {
    if (isAdmin) return documentTypes;
    const userDept = role === 'sales_manager' ? 'sales' : 'engineer';
    return documentTypes.filter(dt => dt.department === userDept || dt.department === 'all' || !dt.department);
  }, [documentTypes, isAdmin, role]);

  // Local copy so the open dialog reflects saves without depending on the list
  // re-handing a fresh snapshot through props.
  const [current, setCurrent] = useState<SiteVisit>(visit);
  const [isEditing, setIsEditing] = useState(false);
  const [edit, setEdit] = useState<EditState>(buildEditState(visit));
  const [activeTab, setActiveTab] = useState<string>('details');

  const isLocked = current.status === 'completed' && !isAdmin;
  const effectiveCanEdit = canEdit && !isLocked;

  const [pendingStatus, setPendingStatus] = useState<SiteVisit['status'] | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<UpdateSiteVisitInput | null>(null);

  const triggerStatusChange = (newStatus: SiteVisit['status']) => {
    if (newStatus === current.status) return;
    setPendingStatus(newStatus);
    setIsConfirmOpen(true);
  };

  const confirmStatusChange = () => {
    if (pendingSaveData) {
      saveMutation.mutate(pendingSaveData);
      setPendingSaveData(null);
    } else if (pendingStatus) {
      saveMutation.mutate({ status: pendingStatus });
    }
    setIsConfirmOpen(false);
    setPendingStatus(null);
  };

  // Activity form
  const [updateType, setUpdateType] = useState<SiteVisitUpdateType>('progress');
  const [updateContent, setUpdateContent] = useState('');

  // Document upload form
  const [docTypeId, setDocTypeId] = useState('');
  const [visibility, setVisibility] = useState<DocumentVisibility>('internal');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrent(visit);
      setEdit(buildEditState(visit));
      setIsEditing(false);
      setUpdateContent('');
      setUpdateType('progress');
      setDocTypeId('');
      setVisibility('internal');
      setFiles([]);
      setActiveTab(defaultTab || 'details');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, visit.$id, defaultTab]);

  const { data: updates = [], isLoading: isUpdatesLoading } = useQuery({
    queryKey: ['site-visit-updates', visit.$id],
    queryFn: () => fetchSiteVisitUpdates(visit.$id),
    enabled: isOpen,
  });

  const { data: documents = [], isLoading: isDocsLoading } = useQuery({
    queryKey: ['site-visit-documents', visit.$id],
    queryFn: () => fetchDocumentsBySiteVisit(visit.$id),
    enabled: isOpen,
  });

  const documentTypeById = (id: string) => documentTypes.find((dt) => dt.$id === id);

  const invalidateVisit = () => {
    queryClient.invalidateQueries({ queryKey: ['site-visits'] });
    queryClient.invalidateQueries({ queryKey: ['site-visits-stats'] });
  };

  const saveMutation = useMutation({
    mutationFn: (input: UpdateSiteVisitInput) => updateSiteVisit(visit.$id, input),
    onSuccess: async (data, input) => {
      const previousStatus = current.status;
      setCurrent(data);
      invalidateVisit();
      // Log a status change as activity so the history stays meaningful.
      if (input.status && input.status !== previousStatus) {
        await addSiteVisitUpdate({
          site_visit_id: visit.$id,
          project_id: visit.project_id,
          author_id: currentUser.$id,
          author_name: currentUser.name,
          update_type: 'status_change',
          content: `Status changed from "${statusLabel(previousStatus)}" to "${statusLabel(input.status)}".`,
        });
        queryClient.invalidateQueries({ queryKey: ['site-visit-updates', visit.$id] });
      }
      setIsEditing(false);
      toast.success('Site visit updated');
    },
    onError: () => toast.error('Failed to update site visit'),
  });

  const addUpdateMutation = useMutation({
    mutationFn: () => addSiteVisitUpdate({
      site_visit_id: visit.$id,
      project_id: visit.project_id,
      author_id: currentUser.$id,
      author_name: currentUser.name,
      update_type: updateType,
      content: updateContent.trim(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-visit-updates', visit.$id] });
      setUpdateContent('');
      toast.success('Update added');
    },
    onError: () => toast.error('Failed to add update'),
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      const selectedType = documentTypes.find(dt => dt.$id === docTypeId);
      const docDept = selectedType?.department || 'admin';
      return uploadDocuments({
        files,
        projectId: visit.project_id,
        visibility,
        department: visibility === 'internal' ? (docDept as any) : undefined,
        documentTypeId: docTypeId,
        uploadedBy: currentUser.$id,
        siteVisitId: visit.$id,
      });
    },
    onSuccess: ({ succeeded, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['site-visit-documents', visit.$id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents-recent'] });
      setFiles([]);
      setDocTypeId('');
      if (succeeded.length > 0) toast.success(`${succeeded.length} document(s) uploaded`);
      failed.forEach((f) => toast.error(`${f.fileName}: ${f.error}`));
    },
    onError: () => toast.error('Failed to upload documents'),
  });

  const deleteDocMutation = useMutation({
    mutationFn: ({ id, fileId }: { id: string; fileId: string }) => deleteDocumentRecord(id, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-visit-documents', visit.$id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted');
    },
    onError: () => toast.error('Failed to delete document'),
  });

  const { data: engineers = [], isLoading: isEngineersLoading } = useQuery({
    queryKey: ['engineers'],
    queryFn: () => fetchEngineers(),
    enabled: isOpen && isEditing,
  });

  const selectedProject = projects.find((p) => p.$id === visit.project_id);
  const projectEmails = new Set<string>();
  if (selectedProject) {
    if (selectedProject.engineer) {
      selectedProject.engineer.split(',').forEach((email) => projectEmails.add(email.trim().toLowerCase()));
    }
    if (selectedProject.planning_engineer) {
      selectedProject.planning_engineer.split(',').forEach((email) => projectEmails.add(email.trim().toLowerCase()));
    }
  }

  const filteredEngineers = engineers.filter((eng) => projectEmails.has(eng.email.toLowerCase()));
  const engineerOptions = filteredEngineers.map((eng) => ({
    value: eng.$id,
    label: eng.name || eng.email,
    keywords: eng.email,
    group: eng.role === 'planning_engineer' ? 'Planning Engineers' : 'Project Engineers',
  }));

  const handleSave = () => {
    const saveData: UpdateSiteVisitInput = {
      title: edit.title.trim() || undefined,
      reason: edit.reason.trim() || undefined,
      assigned_engineer_id: edit.assigned_engineer_id || undefined,
      assigned_engineer_name: edit.assigned_engineer_name || null,
      status: edit.status,
      priority: edit.priority,
      issue_observation: edit.issue_observation.trim() || null,
      description: edit.description.trim() || null,
      location_details: edit.location_details.trim() || null,
      additional_notes: edit.additional_notes.trim() || null,
      findings: edit.findings.trim() || null,
      visit_date: edit.visit_date || null,
      expected_completion_date: edit.expected_completion_date || null,
    };

    if (edit.status !== current.status) {
      setPendingStatus(edit.status);
      setPendingSaveData(saveData);
      setIsConfirmOpen(true);
    } else {
      saveMutation.mutate(saveData);
    }
  };

  const addFiles = (incoming: FileList | File[]) => {
    const accepted: File[] = [];
    let rejected = 0;
    Array.from(incoming).forEach((f) => (isAllowedFile(f) ? accepted.push(f) : rejected++));
    if (rejected > 0) toast.error(`${rejected} file(s) skipped — unsupported format.`);
    setFiles((prev) => [...prev, ...accepted]);
  };

  const renderEngineersDetails = () => {
    if (!current.assigned_engineer_id) {
      return <DetailRow label="Assigned Engineers" value="Unassigned" />;
    }

    const ids = current.assigned_engineer_id.split(',').map((s) => s.trim()).filter(Boolean);
    const names = current.assigned_engineer_name ? current.assigned_engineer_name.split(',').map((s) => s.trim()) : [];

    const projectEngineers: string[] = [];
    const planningEngineers: string[] = [];

    ids.forEach((id, idx) => {
      const u = users.find((user) => user.$id === id);
      const name = names[idx] || u?.name || u?.email || id;
      if (u?.role === 'planning_engineer') {
        planningEngineers.push(name);
      } else {
        projectEngineers.push(name);
      }
    });

    return (
      <>
        {projectEngineers.length > 0 && (
          <DetailRow
            label="Project Engineer"
            value={
              <div className="space-y-0.5 font-semibold text-foreground">
                {projectEngineers.map((name, i) => <p key={i}>{name}</p>)}
              </div>
            }
          />
        )}
        {planningEngineers.length > 0 && (
          <DetailRow
            label="Planning Engineer"
            value={
              <div className="space-y-0.5 font-semibold text-foreground">
                {planningEngineers.map((name, i) => <p key={i}>{name}</p>)}
              </div>
            }
          />
        )}
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-lg font-bold pr-6 break-words">
            {current.title}
          </DialogTitle>
          <div className="flex items-center gap-1.5 pt-0.5">
            <Badge className={statusStyles[current.status]}>{statusLabel(current.status)}</Badge>
            <Badge variant="outline" className={priorityStyles[current.priority]}>{priorityLabel(current.priority)}</Badge>
          </div>
        </DialogHeader>

         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile-only view: Custom Button-style triggers to avoid squishing */}
          {!hideTabs && (
            <div className="grid grid-cols-3 sm:hidden gap-1 p-1 bg-muted rounded-lg border border-border/40 mb-3">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={cn(
                  "rounded-md px-1.5 py-1.5 text-[11px] font-semibold transition-all text-center truncate",
                  activeTab === 'details' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={cn(
                  "rounded-md px-1.5 py-1.5 text-[11px] font-semibold transition-all text-center truncate",
                  activeTab === 'activity' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Activity ({updates.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('documents')}
                className={cn(
                  "rounded-md px-1.5 py-1.5 text-[11px] font-semibold transition-all text-center truncate",
                  activeTab === 'documents' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Docs ({documents.length})
              </button>
            </div>
          )}

          {/* Desktop-only view: Standard TabsList */}
          {!hideTabs && (
            <TabsList className="hidden sm:grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="activity">Activity ({updates.length})</TabsTrigger>
              <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
            </TabsList>
          )}

          {/* DETAILS */}
          <TabsContent value="details" className="max-h-[60vh] overflow-y-auto pr-1">
            {!isEditing ? (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailRow label="Project" value={projectName} />
                  <DetailRow label="Reason for Visit" value={current.reason} />
                  <DetailRow
                    label="Visit Date"
                    value={current.visit_date ? format(new Date(current.visit_date), 'MMM d, yyyy') : undefined}
                  />
                  <DetailRow
                    label="Expected Completion"
                    value={current.expected_completion_date ? format(new Date(current.expected_completion_date), 'MMM d, yyyy') : undefined}
                  />
                  {renderEngineersDetails()}
                </div>
                <DetailRow label="Issue / Observation" value={current.issue_observation} />
                <DetailRow label="Description" value={current.description} />
                <DetailRow label="Findings" value={current.findings} />
                <DetailRow label="Additional Notes" value={current.additional_notes} />

                {effectiveCanEdit && (
                  <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="detail-status-select" className="text-xs text-muted-foreground font-semibold">Change Status:</Label>
                      <select
                        id="detail-status-select"
                        value={current.status}
                        onChange={(e) => triggerStatusChange(e.target.value as SiteVisit['status'])}
                        className={cn(
                          "h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-semibold focus:ring-1 focus:ring-ring focus:outline-none cursor-pointer",
                          statusStyles[current.status]
                        )}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value} className="bg-background text-foreground text-xs">
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button size="sm" onClick={() => setIsEditing(true)}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Details
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-title">Site Visit Title</Label>
                    <Input
                      id="edit-title" value={edit.title}
                      onChange={(e) => setEdit((s) => ({ ...s, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-status">Status</Label>
                    <select
                      id="edit-status"
                      value={edit.status}
                      onChange={(e) => setEdit((s) => ({ ...s, status: e.target.value as SiteVisit['status'] }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="edit-priority">Priority</Label>
                    <select
                      id="edit-priority"
                      value={edit.priority}
                      onChange={(e) => setEdit((s) => ({ ...s, priority: e.target.value as SiteVisit['priority'] }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="edit-visit-date">Visit Date</Label>
                    <Input
                      id="edit-visit-date" type="date" value={edit.visit_date}
                      onChange={(e) => setEdit((s) => ({ ...s, visit_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-completion">Expected Completion Date</Label>
                    <Input
                      id="edit-completion" type="date" value={edit.expected_completion_date}
                      onChange={(e) => setEdit((s) => ({ ...s, expected_completion_date: e.target.value }))}
                    />
                  </div>
                  {canEdit && (
                    <div>
                      <MultiSelectPopover
                        label="Assigned Engineers"
                        placeholder={isEngineersLoading ? 'Loading engineers...' : 'Unassigned (visible to all engineers)'}
                        emptyText="No engineers found."
                        options={engineerOptions}
                        selectedValues={edit.assigned_engineer_id ? edit.assigned_engineer_id.split(',').filter(Boolean) : []}
                        onChange={(vals) => {
                          const selectedNames = vals.map(val => {
                            const eng = engineers.find(e => e.$id === val);
                            return eng?.name || eng?.email || val;
                          });
                          setEdit(s => ({
                            ...s,
                            assigned_engineer_id: vals.join(','),
                            assigned_engineer_name: selectedNames.join(','),
                          }));
                        }}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="edit-reason">Reason for Visit</Label>
                  <Textarea
                    id="edit-reason" rows={2} value={edit.reason}
                    onChange={(e) => setEdit((s) => ({ ...s, reason: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-location">Location Details</Label>
                  <Input
                    id="edit-location" value={edit.location_details}
                    onChange={(e) => setEdit((s) => ({ ...s, location_details: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-issue">Issue / Observation</Label>
                  <Textarea
                    id="edit-issue" rows={2} value={edit.issue_observation}
                    onChange={(e) => setEdit((s) => ({ ...s, issue_observation: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description" rows={3} value={edit.description}
                    onChange={(e) => setEdit((s) => ({ ...s, description: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-findings">Findings</Label>
                  <Textarea
                    id="edit-findings" rows={3} value={edit.findings}
                    placeholder="Record findings and observations from the site"
                    onChange={(e) => setEdit((s) => ({ ...s, findings: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-notes">Additional Notes</Label>
                  <Textarea
                    id="edit-notes" rows={2} value={edit.additional_notes}
                    onChange={(e) => setEdit((s) => ({ ...s, additional_notes: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setEdit(buildEditState(current)); }}>
                    <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
                    <Save className="h-3.5 w-3.5 mr-1.5" /> {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ACTIVITY */}
          <TabsContent value="activity" className="max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-4 py-2">
              {effectiveCanEdit && (
                <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                  <Label htmlFor="update-type">Add Progress Update</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2">
                    <select
                      id="update-type"
                      value={updateType}
                      onChange={(e) => setUpdateType(e.target.value as SiteVisitUpdateType)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {UPDATE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <Textarea
                      value={updateContent}
                      onChange={(e) => setUpdateContent(e.target.value)}
                      placeholder="Describe the progress, finding, or observation..."
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => addUpdateMutation.mutate()}
                      disabled={!updateContent.trim() || addUpdateMutation.isPending}
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" /> {addUpdateMutation.isPending ? 'Adding...' : 'Add Update'}
                    </Button>
                  </div>
                </div>
              )}

              {isUpdatesLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : updates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No activity recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {updates.map((u) => (
                    <div key={u.$id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 w-px bg-border mt-1" />
                      </div>
                      <div className="flex-1 pb-3 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-[10px]">{updateTypeLabel(u.update_type)}</Badge>
                          <span className="text-xs font-medium">{u.author_name || 'User'}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(u.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-wrap break-words">{u.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* DOCUMENTS */}
          <TabsContent value="documents" className="max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-4 py-2">
              {effectiveCanEdit && (
                <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                  <Label>Upload Supporting Document</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Combobox
                      modal
                      value={docTypeId}
                      onChange={setDocTypeId}
                      placeholder="Document type"
                      searchPlaceholder="Search document types..."
                      emptyText="No document types found."
                      options={filteredTypes.map((dt) => ({
                        value: dt.$id,
                        label: `${dt.name} (${dt.type})`,
                        keywords: dt.type,
                        group: dt.department === 'engineer' ? 'Engineer' :
                               dt.department === 'sales' ? 'Sales' :
                               dt.department === 'admin' ? 'Admin' : 'All Departments'
                      }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {(['internal', 'client_facing'] as DocumentVisibility[]).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setVisibility(v)}
                          className={cn(
                            'rounded-md border px-2 py-2 text-xs font-medium transition-colors',
                            visibility === v ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-accent'
                          )}
                        >
                          {v === 'internal' ? 'Internal' : 'Client Facing'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-md py-5 cursor-pointer hover:bg-accent/50 transition-colors"
                    >
                      <UploadCloud className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-semibold">Select File(s)</span>
                      <span className="text-[10px] text-muted-foreground">{ALLOWED_FILE_EXTENSIONS.join(', ')}</span>
                    </div>

                    <div
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-md py-5 cursor-pointer hover:bg-accent/50 transition-colors"
                    >
                      <Camera className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-semibold">Take Photo (Camera)</span>
                      <span className="text-[10px] text-muted-foreground">Mobile Camera Capture</span>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef} type="file" multiple className="hidden"
                    onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }}
                  />
                  <input
                    ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }}
                  />

                  {files.length > 0 && (
                    <div className="space-y-1.5">
                      {files.map((f, i) => (
                        <div key={`${f.name}-${i}`} className="flex items-center justify-between border rounded-md px-2 py-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs truncate">{f.name}</span>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatFileSize(f.size)}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => uploadMutation.mutate()}
                      disabled={!docTypeId || files.length === 0 || uploadMutation.isPending}
                    >
                      <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                      {uploadMutation.isPending ? 'Uploading...' : `Upload ${files.length || ''} file(s)`}
                    </Button>
                  </div>
                </div>
              )}

              {isDocsLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : documents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No documents uploaded for this visit.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {documents.map((doc) => (
                    <DocumentCard
                      key={doc.$id}
                      doc={doc}
                      projectName={projectName}
                      documentType={documentTypeById(doc.document_type_id)}
                      onDelete={effectiveCanEdit ? (d) => deleteDocMutation.mutate({ id: d.$id, fileId: d.file_id }) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={pendingStatus === 'completed' ? 'Complete Site Visit?' : 'Change Status?'}
        description={
          pendingStatus === 'completed'
            ? 'Are you sure you want to mark this site visit as completed? Once completed, details will be locked to engineers and sales managers (only admins can edit).'
            : `Are you sure you want to change the status of this site visit to "${pendingStatus ? statusLabel(pendingStatus) : ''}"?`
        }
        onConfirm={confirmStatusChange}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </Dialog>
  );
};

export default SiteVisitDetailDialog;
