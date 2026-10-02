import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  Globe,
  Lock,
  Pin,
  PinOff,
  Search,
  Settings2,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { SimplePagination } from '@/components/ui/simple-pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  DocumentDeleteRequest,
  DocumentFolder,
  FolderDocument,
  FolderType,
} from '@/types/payload-types';
import {
  FOLDER_DOCUMENT_PAGE_SIZE,
  createSubfolder,
  deleteFolderDocument,
  deleteSubfolder,
  fetchFolderDocuments,
  fetchSubfolders,
  uploadFolderDocuments,
} from '@/services/folderService';
import {
  approveDeleteRequest,
  createDeleteRequest,
  fetchDeleteRequests,
  rejectDeleteRequest,
} from '@/services/documentDeleteRequestService';
import { canUserManageFolder } from '@/lib/permissions';
import FolderDocumentCard from './FolderDocumentCard';
import FolderDeleteRequestsPanel from './FolderDeleteRequestsPanel';
import FolderUploadDialog from './content-editors/document/FolderUploadDialog';
import RequestDeletionDialog from './content-editors/document/RequestDeletionDialog';
import CreateSubfolderDialog from './content-editors/document/CreateSubfolderDialog';

const TYPE_META: Record<FolderType, { label: string; icon: React.ElementType; className: string }> = {
  personal: { label: 'Personal folder', icon: Lock, className: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300' },
  public: { label: 'Public folder', icon: Globe, className: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400' },
  dynamic: { label: 'Shared folder', icon: Users, className: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400' },
};

/**
 * A breadcrumb entry for tracking which folder (or subfolder) we are currently
 * viewing. The root entry is always the main folder opened from the Document
 * Center; every subfolder the user opens pushes another entry.
 */
interface BreadcrumbEntry {
  folder: DocumentFolder;
}

interface FolderDetailViewProps {
  folder: DocumentFolder;
  isPinned: boolean;
  onBack: () => void;
  onTogglePin: (folder: DocumentFolder) => void;
  onEdit: (folder: DocumentFolder) => void;
}

const FolderDetailView: React.FC<FolderDetailViewProps> = ({
  folder,
  isPinned,
  onBack,
  onTogglePin,
  onEdit,
}) => {
  const { user, role, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  // The breadcrumb trail starts with the root folder and grows as the user
  // navigates into subfolders. The active folder is always the last entry.
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([{ folder }]);

  // Reset the breadcrumb trail whenever the root folder changes (e.g. the user
  // navigated back and opened a different folder from the grid).
  useEffect(() => {
    setBreadcrumbs([{ folder }]);
  }, [folder.$id]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFolder = breadcrumbs[breadcrumbs.length - 1].folder;
  const isInsideSubfolder = breadcrumbs.length > 1;
  // Root folder is always the first breadcrumb.
  const rootFolder = breadcrumbs[0].folder;

  const navigateInto = (subfolder: DocumentFolder) => {
    setBreadcrumbs((prev) => [...prev, { folder: subfolder }]);
    setSearchInput('');
    setSearch('');
    setPage(0);
  };

  const navigateTo = (index: number) => {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setSearchInput('');
    setSearch('');
    setPage(0);
  };

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateSubfolderOpen, setIsCreateSubfolderOpen] = useState(false);
  const [subfolderToDelete, setSubfolderToDelete] = useState<DocumentFolder | null>(null);
  const [documentToRequest, setDocumentToRequest] = useState<FolderDocument | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Reset paging/search when the active folder changes.
  useEffect(() => {
    setPage(0);
    setSearchInput('');
    setSearch('');
  }, [activeFolder.$id]);

  // Permissions: manage is always root-folder-based (subfolder inherits).
  const viewer = useMemo(() => ({ userId: user?.$id, role }), [user?.$id, role]);
  const canManage = canUserManageFolder(rootFolder, viewer);
  const canUpload = canManage || hasPermission('documents:upload');

  // ── Documents in the active folder ──────────────────────────────────────────
  const { data, isLoading: isDocumentsLoading } = useQuery({
    queryKey: ['folder-documents', activeFolder.$id, page, search],
    queryFn: () => fetchFolderDocuments(activeFolder.$id, page, search),
  });

  const documents = data?.documents ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / FOLDER_DOCUMENT_PAGE_SIZE));

  // ── Subfolders of the active folder ─────────────────────────────────────────
  const { data: subfolders = [], isLoading: isSubfoldersLoading } = useQuery({
    queryKey: ['subfolders', activeFolder.$id],
    queryFn: () => fetchSubfolders(activeFolder.$id),
  });

  // ── Pending deletion requests (root-folder scope only) ──────────────────────
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['folder-delete-requests', rootFolder.$id],
    queryFn: () => fetchDeleteRequests(rootFolder.$id, 'pending'),
  });

  const myPendingDocumentIds = useMemo(
    () =>
      new Set(
        pendingRequests
          .filter((request) => request.requested_by === user?.$id)
          .map((request) => request.document_id),
      ),
    [pendingRequests, user?.$id],
  );

  // ── Cache invalidation helpers ───────────────────────────────────────────────
  const invalidateDocs = () => {
    queryClient.invalidateQueries({ queryKey: ['folder-documents', activeFolder.$id] });
    queryClient.invalidateQueries({ queryKey: ['folder-document-counts'] });
  };

  const invalidateSubfolders = () => {
    queryClient.invalidateQueries({ queryKey: ['subfolders', activeFolder.$id] });
    queryClient.invalidateQueries({ queryKey: ['document-folders'] });
  };

  const invalidateRequests = () => {
    queryClient.invalidateQueries({ queryKey: ['folder-delete-requests', rootFolder.$id] });
    queryClient.invalidateQueries({ queryKey: ['folder-pending-request-counts'] });
  };

  // ── Mutations ────────────────────────────────────────────────────────────────

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) =>
      uploadFolderDocuments({
        files,
        folderId: activeFolder.$id,
        folderName: activeFolder.name,
        uploadedBy: user?.$id ?? '',
      }),
    onSuccess: ({ succeeded, failed }) => {
      invalidateDocs();
      setIsUploadOpen(false);
      setPage(0);
      if (succeeded.length > 0) {
        toast.success(`${succeeded.length} document${succeeded.length === 1 ? '' : 's'} uploaded to ${activeFolder.name}`);
      }
      failed.forEach((f) => toast.error(`${f.fileName}: ${f.error}`));
    },
    onError: () => toast.error('Failed to upload documents'),
  });

  const deleteMutation = useMutation({
    mutationFn: (doc: FolderDocument) => deleteFolderDocument(doc.$id, doc.file_id),
    onSuccess: () => {
      invalidateDocs();
      invalidateRequests();
      toast.success('Document deleted');
    },
    onError: () => toast.error('Failed to delete document'),
  });

  const createSubfolderMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      createSubfolder(name, description, activeFolder),
    onSuccess: (created) => {
      invalidateSubfolders();
      setIsCreateSubfolderOpen(false);
      toast.success(`Subfolder "${created.name}" created`);
    },
    onError: (error: Error) => toast.error(`Failed to create subfolder: ${error.message}`),
  });

  const deleteSubfolderMutation = useMutation({
    mutationFn: (sf: DocumentFolder) => deleteSubfolder(sf.$id),
    onSuccess: (_result, sf) => {
      invalidateSubfolders();
      setSubfolderToDelete(null);
      toast.success(`Subfolder "${sf.name}" deleted`);
    },
    onError: (error: Error) => {
      setSubfolderToDelete(null);
      toast.error(error.message);
    },
  });

  const requestDeletionMutation = useMutation({
    mutationFn: ({ doc, reason }: { doc: FolderDocument; reason: string }) =>
      createDeleteRequest({
        folder: rootFolder,
        document: doc,
        requestedBy: user?.$id ?? '',
        requestedByName: user?.name || user?.email,
        reason,
      }),
    onSuccess: () => {
      invalidateRequests();
      setDocumentToRequest(null);
      toast.success('Deletion request sent to the folder owner');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to send the deletion request'),
  });

  const approveMutation = useMutation({
    mutationFn: (request: DocumentDeleteRequest) => approveDeleteRequest(request, user?.$id ?? ''),
    onSuccess: () => {
      invalidateDocs();
      invalidateRequests();
      toast.success('Request approved — the document has been deleted');
    },
    onError: () => toast.error('Failed to approve the request'),
  });

  const rejectMutation = useMutation({
    mutationFn: (request: DocumentDeleteRequest) => rejectDeleteRequest(request, user?.$id ?? ''),
    onSuccess: () => {
      invalidateRequests();
      toast.success('Request declined — the document stays in the folder');
    },
    onError: () => toast.error('Failed to decline the request'),
  });

  const meta = TYPE_META[rootFolder.folder_type];
  const TypeIcon = meta.icon;

  return (
    <div className="space-y-5">
      {/* ── Header card ───────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto w-fit p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
            onClick={onBack}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Document Center
          </Button>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Folder className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <span className="truncate">{rootFolder.name}</span>
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', meta.className)}>
                    <TypeIcon className="h-3 w-3" /> {meta.label}
                  </span>
                </CardTitle>
                <CardDescription>
                  {rootFolder.description || 'Browse and manage the documents stored in this folder.'}
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Pin/unpin only shown at the root level */}
              {!isInsideSubfolder && (
                <Button variant="outline" onClick={() => onTogglePin(rootFolder)}>
                  {isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                  {isPinned ? 'Unpin' : 'Pin'}
                </Button>
              )}
              {canManage && !isInsideSubfolder && (
                <Button variant="outline" onClick={() => onEdit(rootFolder)}>
                  <Settings2 className="mr-2 h-4 w-4" /> Settings
                </Button>
              )}
              {canManage && (
                <Button variant="outline" onClick={() => setIsCreateSubfolderOpen(true)}>
                  <FolderPlus className="mr-2 h-4 w-4" /> New Subfolder
                </Button>
              )}
              {canUpload && (
                <Button onClick={() => setIsUploadOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" /> Upload to Folder
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ── Breadcrumb trail (shown when inside a subfolder) ─────────────────── */}
      {isInsideSubfolder && (
        <nav className="flex items-center flex-wrap gap-1 text-sm text-muted-foreground" aria-label="Folder path">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.folder.$id}>
                {index > 0 && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                {isLast ? (
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <FolderOpen className="h-4 w-4" />
                    {crumb.folder.name}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigateTo(index)}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <Folder className="h-4 w-4" />
                    {crumb.folder.name}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* ── Pending deletion requests (root-folder owner only) ────────────────── */}
      {canManage && !isInsideSubfolder && (
        <FolderDeleteRequestsPanel
          requests={pendingRequests}
          onApprove={(request) => approveMutation.mutate(request)}
          onReject={(request) => rejectMutation.mutate(request)}
          isBusy={approveMutation.isPending || rejectMutation.isPending}
        />
      )}

      {/* ── Subfolders grid ──────────────────────────────────────────────────── */}
      {(isSubfoldersLoading || subfolders.length > 0 || canManage) && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Folder className="h-4 w-4 text-muted-foreground" />
              Subfolders
              {subfolders.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">({subfolders.length})</span>
              )}
            </h3>
          </div>

          {isSubfoldersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : subfolders.length === 0 ? (
            canManage && (
              <Card>
                <CardContent className="p-4 text-center text-sm text-muted-foreground">
                  No subfolders yet. Click <strong>New Subfolder</strong> to organise documents further.
                </CardContent>
              </Card>
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {subfolders.map((sf) => (
                <Card
                  key={sf.$id}
                  className="group transition-shadow hover:shadow-md cursor-pointer"
                  onClick={() => navigateInto(sf)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                        <Folder className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold group-hover:text-primary transition-colors" title={sf.name}>
                          {sf.name}
                        </p>
                        {sf.description && (
                          <p className="truncate text-xs text-muted-foreground" title={sf.description}>
                            {sf.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        {canManage && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete subfolder"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubfolderToDelete(sf);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Document search ──────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search documents in this folder..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* ── Documents grid ───────────────────────────────────────────────────── */}
      {isDocumentsLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {search
              ? `No documents match "${search}" in this folder.`
              : 'This folder is empty. Upload a document to get started.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {documents.map((doc) => (
            <FolderDocumentCard
              key={doc.$id}
              doc={doc}
              onDelete={canManage ? (d) => deleteMutation.mutate(d) : undefined}
              onRequestDelete={canManage ? undefined : setDocumentToRequest}
              hasPendingRequest={myPendingDocumentIds.has(doc.$id)}
            />
          ))}
        </div>
      )}

      <SimplePagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={FOLDER_DOCUMENT_PAGE_SIZE}
        onPageChange={setPage}
        label="documents"
      />

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}

      {canUpload && (
        <FolderUploadDialog
          isOpen={isUploadOpen}
          setIsOpen={setIsUploadOpen}
          folderName={activeFolder.name}
          onUpload={(files) => uploadMutation.mutate(files)}
          isUploading={uploadMutation.isPending}
        />
      )}

      {canManage && (
        <CreateSubfolderDialog
          isOpen={isCreateSubfolderOpen}
          setIsOpen={setIsCreateSubfolderOpen}
          parentFolderName={activeFolder.name}
          onCreate={(name, description) =>
            createSubfolderMutation.mutate({ name, description })
          }
          isCreating={createSubfolderMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={!!subfolderToDelete}
        onOpenChange={(open) => { if (!open) setSubfolderToDelete(null); }}
        title="Delete Subfolder?"
        description={
          subfolderToDelete
            ? `Delete the subfolder "${subfolderToDelete.name}"? The subfolder must be completely empty (no documents or nested subfolders) before it can be removed.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        isLoading={deleteSubfolderMutation.isPending}
        onConfirm={() => {
          if (subfolderToDelete) deleteSubfolderMutation.mutate(subfolderToDelete);
        }}
      />

      <RequestDeletionDialog
        isOpen={!!documentToRequest}
        setIsOpen={(open) => { if (!open) setDocumentToRequest(null); }}
        document={documentToRequest}
        folderName={rootFolder.name}
        onSubmit={(reason) => {
          if (documentToRequest) requestDeletionMutation.mutate({ doc: documentToRequest, reason });
        }}
        isSubmitting={requestDeletionMutation.isPending}
      />
    </div>
  );
};

export default FolderDetailView;
