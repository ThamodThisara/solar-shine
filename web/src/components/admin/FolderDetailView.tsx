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
import { DocumentFolder, FolderDocument, FolderType } from '@/types/payload-types';
import {
  FOLDER_DOCUMENT_PAGE_SIZE,
  deleteFolderDocument,
  fetchFolderDocuments,
  uploadFolderDocuments,
} from '@/services/folderService';
import { canUserManageFolder } from '@/lib/permissions';
import FolderDocumentCard from './FolderDocumentCard';
import FolderUploadDialog from './content-editors/document/FolderUploadDialog';

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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['folder-documents', folder.$id] });
    queryClient.invalidateQueries({ queryKey: ['folder-document-counts'] });
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
      toast.success('Document deleted');
    },
    onError: () => toast.error('Failed to delete document'),
  });

  // Anyone who can manage the folder may prune it; otherwise a user can only
  // remove what they uploaded themselves.
  const canDeleteDocument = (doc: FolderDocument) =>
    canManage || (!!user?.$id && doc.uploaded_by === user.$id);

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
              onDelete={canDeleteDocument(doc) ? (d) => deleteMutation.mutate(d) : undefined}
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
    </div>
  );
};

export default FolderDetailView;
