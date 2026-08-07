import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Folder,
  Globe,
  Lock,
  Pin,
  PinOff,
  Search,
  Settings2,
  Upload,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { SimplePagination } from '@/components/ui/simple-pagination';
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
  deleteFolderDocument,
  fetchFolderDocuments,
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

const TYPE_META: Record<FolderType, { label: string; icon: React.ElementType; className: string }> = {
  personal: { label: 'Personal folder', icon: Lock, className: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300' },
  public: { label: 'Public folder', icon: Globe, className: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400' },
  dynamic: { label: 'Shared folder', icon: Users, className: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400' },
};

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

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [documentToRequest, setDocumentToRequest] = useState<FolderDocument | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Reset paging when the user navigates from one folder into another.
  useEffect(() => {
    setPage(0);
    setSearchInput('');
    setSearch('');
  }, [folder.$id]);

  const viewer = useMemo(() => ({ userId: user?.$id, role }), [user?.$id, role]);
  const canManage = canUserManageFolder(folder, viewer);
  const canUpload = canManage || hasPermission('documents:upload');

  const { data, isLoading } = useQuery({
    queryKey: ['folder-documents', folder.$id, page, search],
    queryFn: () => fetchFolderDocuments(folder.$id, page, search),
  });

  const documents = data?.documents ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / FOLDER_DOCUMENT_PAGE_SIZE));

  // Pending requests drive both the owner's review queue and the "already
  // requested" state on a card, so both read this one list.
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['folder-delete-requests', folder.$id],
    queryFn: () => fetchDeleteRequests(folder.$id, 'pending'),
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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['folder-documents', folder.$id] });
    queryClient.invalidateQueries({ queryKey: ['folder-document-counts'] });
  };

  const invalidateRequests = () => {
    queryClient.invalidateQueries({ queryKey: ['folder-delete-requests', folder.$id] });
    queryClient.invalidateQueries({ queryKey: ['folder-pending-request-counts'] });
  };

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) =>
      uploadFolderDocuments({
        files,
        folderId: folder.$id,
        folderName: folder.name,
        uploadedBy: user?.$id ?? '',
      }),
    onSuccess: ({ succeeded, failed }) => {
      invalidate();
      setIsUploadOpen(false);
      setPage(0);
      if (succeeded.length > 0) {
        toast.success(`${succeeded.length} document${succeeded.length === 1 ? '' : 's'} uploaded to ${folder.name}`);
      }
      failed.forEach((f) => toast.error(`${f.fileName}: ${f.error}`));
    },
    onError: () => toast.error('Failed to upload documents'),
  });

  const deleteMutation = useMutation({
    mutationFn: (doc: FolderDocument) => deleteFolderDocument(doc.$id, doc.file_id),
    onSuccess: () => {
      invalidate();
      invalidateRequests();
      toast.success('Document deleted');
    },
    onError: () => toast.error('Failed to delete document'),
  });

  const requestDeletionMutation = useMutation({
    mutationFn: ({ doc, reason }: { doc: FolderDocument; reason: string }) =>
      createDeleteRequest({
        folder,
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
      invalidate();
      invalidateRequests();
      toast.success('Request approved — the document has been deleted');
    },
    onError: () => toast.error('Failed to approve the request'),
  });

  const rejectMutation = useMutation({
    mutationFn: (request: DocumentDeleteRequest) => rejectDeleteRequest(request, user?.$id ?? ''),
    onSuccess: () => {
      invalidateRequests();
      toast.success('Request declined the document stays in the folder');
    },
    onError: () => toast.error('Failed to decline the request'),
  });

  // Deleting is the folder owner's call alone (admins keep their global
  // override). Everyone else — including whoever uploaded the document — can
  // only ask the owner to remove it.
  const meta = TYPE_META[folder.folder_type];
  const TypeIcon = meta.icon;

  return (
    <div className="space-y-5">
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
                  <span className="truncate">{folder.name}</span>
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', meta.className)}>
                    <TypeIcon className="h-3 w-3" /> {meta.label}
                  </span>
                </CardTitle>
                <CardDescription>
                  {folder.description || 'Browse and manage the documents stored in this folder.'}
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => onTogglePin(folder)}>
                {isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                {isPinned ? 'Unpin' : 'Pin'}
              </Button>
              {canManage && (
                <Button variant="outline" onClick={() => onEdit(folder)}>
                  <Settings2 className="mr-2 h-4 w-4" /> Settings
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

      {canManage && (
        <FolderDeleteRequestsPanel
          requests={pendingRequests}
          onApprove={(request) => approveMutation.mutate(request)}
          onReject={(request) => rejectMutation.mutate(request)}
          isBusy={approveMutation.isPending || rejectMutation.isPending}
        />
      )}

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

      {isLoading ? (
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

      {canUpload && (
        <FolderUploadDialog
          isOpen={isUploadOpen}
          setIsOpen={setIsUploadOpen}
          folderName={folder.name}
          onUpload={(files) => uploadMutation.mutate(files)}
          isUploading={uploadMutation.isPending}
        />
      )}

      <RequestDeletionDialog
        isOpen={!!documentToRequest}
        setIsOpen={(open) => { if (!open) setDocumentToRequest(null); }}
        document={documentToRequest}
        folderName={folder.name}
        onSubmit={(reason) => {
          if (documentToRequest) requestDeletionMutation.mutate({ doc: documentToRequest, reason });
        }}
        isSubmitting={requestDeletionMutation.isPending}
      />
    </div>
  );
};

export default FolderDetailView;
