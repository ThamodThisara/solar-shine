import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, Terminal, FolderPlus, Search, Tags, Folder } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SimplePagination } from '@/components/ui/simple-pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { client, COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { Combobox } from '@/components/ui/combobox';
import { getDocumentDepartmentForRole } from '@/config/roles';
import { FOLDER_TYPE_PERMISSIONS } from '@/config/permissions';
import { DocumentFolder, DocumentRecord, FolderType } from '@/types/payload-types';
import {
  fetchDocuments,
  searchDocuments,
  uploadDocuments,
  deleteDocumentRecord,
  DOCUMENT_PAGE_SIZE,
} from '@/services/documentService';
import {
  FolderInput,
  createFolder,
  deleteFolder,
  fetchAccessibleFolders,
  fetchFolderDocumentCounts,
  fetchPinnedFolderIds,
  setFolderPinned,
  updateFolder,
} from '@/services/folderService';
import { fetchPendingRequestCounts } from '@/services/documentDeleteRequestService';
import { canUserManageFolder } from '@/lib/permissions';
import { fetchDocumentTypes, getTypeGroupLabel, typeServesDepartment } from '@/services/documentTypeService';
import { fetchProjectExecutionOptions } from '@/services/projectExecutionService';
import DocumentCard from './DocumentCard';
import FolderCard from './FolderCard';
import FolderDetailView from './FolderDetailView';
import DocumentUploadDialog from './content-editors/document/DocumentUploadDialog';
import FolderFormDialog from './content-editors/document/FolderFormDialog';
import ManageDocumentTypesDialog from './content-editors/document/ManageDocumentTypesDialog';
import ProjectSiteVisitsPanel from './ProjectSiteVisitsPanel';

/** Folders shown per page in the folders grid. */
const FOLDER_PAGE_SIZE = 8;

const ALL_FOLDER_TYPES: FolderType[] = ['personal', 'public', 'dynamic'];

const DocumentCenterSection: React.FC = () => {
  const { role, isLoading: isAuthLoading, user, isAdmin, hasPermission, departmentSlug } = useAuth();
  const canAccess = hasPermission('documents:view');
  const canUpload = hasPermission('documents:upload');
  const canManageTypes = hasPermission('documents:manage_types');
  const queryClient = useQueryClient();

  const [projectFilter, setProjectFilter] = useState<string>('all');
  const departmentFilter = 'all';
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [folderPage, setFolderPage] = useState(0);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false);

  // Folder state: which folder is open, which is being edited/deleted.
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [isFolderFormOpen, setIsFolderFormOpen] = useState(false);
  // Notifications about a folder link straight to it via `?folder=<id>`.
  const [searchParams, setSearchParams] = useSearchParams();
  const folderParam = searchParams.get('folder');
  const [folderBeingEdited, setFolderBeingEdited] = useState<DocumentFolder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<DocumentFolder | null>(null);

  // Folder types this role may create; the dialog offers only these. Kept
  // referentially stable (the dialog seeds its form off it) by memoising on a
  // signature of the grants rather than on `hasPermission`, which is rebuilt on
  // every auth render.
  const folderTypeGrants = ALL_FOLDER_TYPES
    .map((type) => (hasPermission(FOLDER_TYPE_PERMISSIONS[type]) ? '1' : '0'))
    .join('');
  const allowedFolderTypes = useMemo(
    () => ALL_FOLDER_TYPES.filter((_type, index) => folderTypeGrants[index] === '1'),
    [folderTypeGrants],
  );
  const canCreateFolder = hasPermission('folders:create') && allowedFolderTypes.length > 0;

  // Debounce the search input so we don't recompute on every keystroke.
  React.useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
      setFolderPage(0);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Open the folder a notification pointed at. Runs on the param rather than on
  // mount so a second notification opened from the bell also lands correctly.
  React.useEffect(() => {
    if (folderParam) setOpenFolderId(folderParam);
  }, [folderParam]);

  const closeFolder = () => {
    setOpenFolderId(null);
    if (!folderParam) return;
    const next = new URLSearchParams(searchParams);
    next.delete('folder');
    setSearchParams(next, { replace: true });
  };

  // Folder visibility can change while the page is open — an owner adding or
  // removing a department/user. Refetch on any folder write so the change lands
  // for everyone immediately rather than on the next navigation.
  React.useEffect(() => {
    if (!canAccess) return;
    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.DOCUMENT_FOLDERS}.documents`,
      () => queryClient.invalidateQueries({ queryKey: ['document-folders'] }),
    );
    return () => unsubscribe();
  }, [canAccess, queryClient]);

  const { data: projects = [] } = useQuery({
    queryKey: ['project-execution-options'],
    queryFn: fetchProjectExecutionOptions,
    enabled: canAccess,
  });

  const { data: documentTypes = [] } = useQuery({
    queryKey: ['document-types'],
    queryFn: fetchDocumentTypes,
    enabled: canAccess,
  });

  // Derive allowed document type IDs based on user role and active department filter
  const allowedTypeIds = useMemo(() => {
    let filtered = documentTypes;
    if (!isAdmin) {
      const userDept = getDocumentDepartmentForRole(role);
      filtered = userDept ? filtered.filter(dt => typeServesDepartment(dt, userDept)) : [];
    } else if (departmentFilter !== 'all') {
      filtered = filtered.filter(dt => typeServesDepartment(dt, departmentFilter));
    }
    return filtered.map(dt => dt.$id);
  }, [documentTypes, role, isAdmin, departmentFilter]);

  const queryDocTypeIds = useMemo(() => {
    if (documentTypeFilter !== 'all') {
      return documentTypeFilter;
    }
    return undefined;
  }, [documentTypeFilter]);

  const isSearching = search.length > 0;
  // When a single project is in focus, its site-visit documents are shown in a
  // dedicated panel, so they're excluded from the main grid to avoid duplication.
  const isProjectSelected = projectFilter !== 'all';

  const documentTypeById = (id: string) => documentTypes.find((dt) => dt.$id === id);

  /* ------------------------------- Folders ------------------------------- */

  const folderViewer = useMemo(
    () => ({ userId: user?.$id, role, departmentSlug }),
    [user?.$id, role, departmentSlug],
  );

  const { data: folders = [], isLoading: isFoldersLoading } = useQuery({
    queryKey: ['document-folders', user?.$id, role, departmentSlug],
    queryFn: () => fetchAccessibleFolders(folderViewer),
    enabled: canAccess,
  });

  const { data: pinnedFolderIds = [] } = useQuery({
    queryKey: ['folder-pins', user?.$id],
    queryFn: () => fetchPinnedFolderIds(user?.$id),
    enabled: canAccess && !!user?.$id,
  });

  const isPinned = (folderId: string) => pinnedFolderIds.includes(folderId);

  // Pinned folders float to the top; the rest keep the newest-first order the
  // service returns. The search box matches folder names and descriptions.
  const visibleFolders = useMemo(() => {
    const query = search.toLowerCase();
    const matched = query
      ? folders.filter(
          (f) =>
            f.name.toLowerCase().includes(query) ||
            (f.description ?? '').toLowerCase().includes(query),
        )
      : folders;

    return [...matched].sort((a, b) => {
      const pinDiff = Number(isPinned(b.$id)) - Number(isPinned(a.$id));
      if (pinDiff !== 0) return pinDiff;
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders, search, pinnedFolderIds]);

  const folderTotalPages = Math.max(1, Math.ceil(visibleFolders.length / FOLDER_PAGE_SIZE));
  const pagedFolders = visibleFolders.slice(
    folderPage * FOLDER_PAGE_SIZE,
    folderPage * FOLDER_PAGE_SIZE + FOLDER_PAGE_SIZE,
  );

  // Counted one page at a time: a count costs a query per folder, so only the
  // cards actually on screen are worth asking about.
  const pagedFolderIds = pagedFolders.map((f) => f.$id);
  const { data: folderCounts = {} } = useQuery({
    queryKey: ['folder-document-counts', pagedFolderIds],
    queryFn: () => fetchFolderDocumentCounts(pagedFolderIds),
    enabled: canAccess && pagedFolderIds.length > 0,
  });

  // Deletion requests are only ever actioned by the folder's owner, so only
  // their own folders are worth counting.
  const managedFolderIds = pagedFolders
    .filter((folder) => canUserManageFolder(folder, folderViewer))
    .map((folder) => folder.$id);
  const { data: pendingRequestCounts = {} } = useQuery({
    queryKey: ['folder-pending-request-counts', managedFolderIds],
    queryFn: () => fetchPendingRequestCounts(managedFolderIds),
    enabled: canAccess && managedFolderIds.length > 0,
  });

  const openFolder = folders.find((f) => f.$id === openFolderId) ?? null;

  const invalidateFolders = () => {
    queryClient.invalidateQueries({ queryKey: ['document-folders'] });
    queryClient.invalidateQueries({ queryKey: ['folder-document-counts'] });
  };

  const saveFolderMutation = useMutation({
    mutationFn: (input: FolderInput) =>
      folderBeingEdited
        ? updateFolder(folderBeingEdited.$id, input)
        : createFolder(input, user?.$id ?? ''),
    onSuccess: (folder) => {
      invalidateFolders();
      setIsFolderFormOpen(false);
      toast.success(folderBeingEdited ? 'Folder updated' : `Folder "${folder.name}" created`);
      setFolderBeingEdited(null);
    },
    onError: (error: Error) => toast.error(`Failed to save folder: ${error.message}`),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (folder: DocumentFolder) => deleteFolder(folder.$id),
    onSuccess: (_result, folder) => {
      invalidateFolders();
      queryClient.invalidateQueries({ queryKey: ['folder-pins'] });
      if (openFolderId === folder.$id) closeFolder();
      setFolderToDelete(null);
      toast.success('Folder deleted');
    },
    onError: (error: Error) => toast.error(`Failed to delete folder: ${error.message}`),
  });

  const pinMutation = useMutation({
    mutationFn: ({ folder, pinned }: { folder: DocumentFolder; pinned: boolean }) =>
      setFolderPinned(folder.$id, user?.$id ?? '', pinned),
    onSuccess: (_result, { pinned }) => {
      queryClient.invalidateQueries({ queryKey: ['folder-pins'] });
      toast.success(pinned ? 'Folder pinned' : 'Folder unpinned');
    },
    onError: () => toast.error('Failed to update pin'),
  });

  const handleTogglePin = (folder: DocumentFolder) => {
    if (!user?.$id) return;
    pinMutation.mutate({ folder, pinned: !isPinned(folder.$id) });
  };

  const handleCreateFolder = () => {
    setFolderBeingEdited(null);
    setIsFolderFormOpen(true);
  };

  const handleEditFolder = (folder: DocumentFolder) => {
    setFolderBeingEdited(folder);
    setIsFolderFormOpen(true);
  };

  /* ------------------------------ Documents ------------------------------ */

  const { data: filteredData, isLoading: isDocumentsLoading } = useQuery({
    queryKey: ['documents', projectFilter, departmentFilter, documentTypeFilter, visibilityFilter, allowedTypeIds, page, user?.$id, role],
    queryFn: () => fetchDocuments({
      page,
      projectId: projectFilter === 'all' ? undefined : projectFilter,
      department: 'all',
      documentTypeId: queryDocTypeIds,
      visibility: visibilityFilter,
      excludeSiteVisitDocs: isProjectSelected,
      currentUserId: user?.$id,
      currentUserRole: role || undefined,
    }),
    enabled: canAccess && !isSearching,
  });

  // While searching, fetch a batch honouring the active filters and match by
  // project name / document name on the client (neither is server-searchable).
  const { data: searchResults, isLoading: isSearchLoading } = useQuery({
    queryKey: ['documents-search', projectFilter, departmentFilter, documentTypeFilter, visibilityFilter, allowedTypeIds, user?.$id, role],
    queryFn: () => searchDocuments({
      projectId: projectFilter === 'all' ? undefined : projectFilter,
      department: 'all',
      documentTypeId: queryDocTypeIds,
      visibility: visibilityFilter,
      excludeSiteVisitDocs: isProjectSelected,
      currentUserId: user?.$id,
      currentUserRole: role || undefined,
    }),
    enabled: canAccess && isSearching,
  });

  const projectNameById = (id: string) => {
    const p = projects.find((proj) => proj.$id === id);
    return p ? (p.project_code || p.name || 'Unknown Project') : 'Unknown Project';
  };

  const matchedDocuments = useMemo(() => {
    if (!isSearching) return [];
    const query = search.toLowerCase();
    return (searchResults ?? []).filter((doc) =>
      doc.file_name.toLowerCase().includes(query) ||
      projectNameById(doc.project_id).toLowerCase().includes(query)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearching, search, searchResults, projects]);

  let documents: DocumentRecord[];
  let isLoading: boolean;
  let total: number;
  if (isSearching) {
    total = matchedDocuments.length;
    documents = matchedDocuments.slice(page * DOCUMENT_PAGE_SIZE, page * DOCUMENT_PAGE_SIZE + DOCUMENT_PAGE_SIZE);
    isLoading = isSearchLoading;
  } else {
    documents = filteredData?.documents ?? [];
    total = filteredData?.total ?? 0;
    isLoading = isDocumentsLoading;
  }
  const totalPages = Math.max(1, Math.ceil(total / DOCUMENT_PAGE_SIZE));

  const invalidateDocuments = () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['documents-search'] });
  };

  const uploadMutation = useMutation({
    mutationFn: uploadDocuments,
    onSuccess: ({ succeeded, failed }) => {
      invalidateDocuments();
      setIsUploadOpen(false);
      if (succeeded.length > 0) {
        toast.success(`${succeeded.length} document${succeeded.length === 1 ? '' : 's'} uploaded successfully`);
      }
      failed.forEach((f) => toast.error(`${f.fileName}: ${f.error}`));
    },
    onError: () => toast.error('Failed to upload documents'),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, fileId }: { id: string; fileId: string }) => deleteDocumentRecord(id, fileId),
    onSuccess: () => {
      invalidateDocuments();
      toast.success('Document deleted');
    },
    onError: () => toast.error('Failed to delete document'),
  });

  if (isAuthLoading) {
    return <Card><CardContent className="p-6 text-center">Authenticating...</CardContent></Card>;
  }

  if (!canAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
          <CardDescription>You do not have permission to view this page.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              Please contact an administrator if you believe this is an error.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Browsing inside a folder replaces the whole section, so the folder's own
  // search and pagination don't compete with the project-document ones.
  if (openFolder) {
    return (
      <>
        <FolderDetailView
          folder={openFolder}
          isPinned={isPinned(openFolder.$id)}
          onBack={closeFolder}
          onTogglePin={handleTogglePin}
          onEdit={handleEditFolder}
        />
        <FolderFormDialog
          isOpen={isFolderFormOpen}
          setIsOpen={(open) => {
            setIsFolderFormOpen(open);
            if (!open) setFolderBeingEdited(null);
          }}
          folder={folderBeingEdited}
          allowedTypes={allowedFolderTypes}
          onSubmit={(input) => saveFolderMutation.mutate(input)}
          isSaving={saveFolderMutation.isPending}
        />
      </>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Document Center</CardTitle>
            <CardDescription>Preview, download, and upload documents for your projects and folders.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManageTypes && (
              <Button variant="outline" onClick={() => setIsManageTypesOpen(true)}>
                <Tags className="mr-2 h-4 w-4" /> Manage Document Types
              </Button>
            )}
            {canCreateFolder && (
              <Button variant="outline" onClick={handleCreateFolder}>
                <FolderPlus className="mr-2 h-4 w-4" /> Create Folder
              </Button>
            )}
            {canUpload && (
              <Button onClick={() => setIsUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Upload Document
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search folders, project ID, project name or document name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Folders */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Folder className="h-4 w-4 text-muted-foreground" /> Folders
            {visibleFolders.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">({visibleFolders.length})</span>
            )}
          </h3>
        </div>

        {isFoldersLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        ) : pagedFolders.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              {isSearching
                ? `No folders match "${search}".`
                : canCreateFolder
                  ? 'No folders yet. Create one to organise documents outside of projects.'
                  : 'No folders have been shared with you yet.'}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {pagedFolders.map((folder) => (
              <FolderCard
                key={folder.$id}
                folder={folder}
                documentCount={folderCounts[folder.$id] ?? 0}
                pendingRequestCount={pendingRequestCounts[folder.$id] ?? 0}
                isPinned={isPinned(folder.$id)}
                canManage={canUserManageFolder(folder, folderViewer)}
                onOpen={(f) => setOpenFolderId(f.$id)}
                onTogglePin={handleTogglePin}
                onEdit={handleEditFolder}
                onDelete={setFolderToDelete}
              />
            ))}
          </div>
        )}

        <SimplePagination
          page={folderPage}
          totalPages={folderTotalPages}
          totalItems={visibleFolders.length}
          pageSize={FOLDER_PAGE_SIZE}
          onPageChange={setFolderPage}
          label="folders"
        />
      </section>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Combobox
          value={projectFilter}
          onChange={(v) => { setProjectFilter(v); setPage(0); }}
          placeholder="All Projects"
          searchPlaceholder="Search projects..."
          emptyText="No projects found."
          options={[
            { value: 'all', label: 'All Projects' },
            ...projects.map((p) => ({ value: p.$id, label: p.name, keywords: p.client }))
          ]}
        />

        <Combobox
          value={visibilityFilter}
          onChange={(v) => { setVisibilityFilter(v); setPage(0); }}
          placeholder="All Visibility"
          searchPlaceholder="Search visibility..."
          emptyText="No options found."
          options={[
            { value: 'all', label: 'All Visibility' },
            { value: 'internal', label: 'Internal Documents' },
            { value: 'client_facing', label: 'Client Facing Documents' }
          ]}
        />

        <Combobox
          value={documentTypeFilter}
          onChange={(v) => { setDocumentTypeFilter(v); setPage(0); }}
          placeholder="All Document Types"
          searchPlaceholder="Search document types..."
          emptyText="No document types found."
          options={[
            { value: 'all', label: 'All Document Types' },
            ...documentTypes
              .filter((dt) => allowedTypeIds.includes(dt.$id))
              .map((dt) => ({
                value: dt.$id,
                label: `${dt.name} (${dt.type})`,
                keywords: dt.type,
                group: getTypeGroupLabel(dt),
              }))
          ]}
        />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold">Project Documents</h3>
        {isSearching && !isLoading && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Search className="h-3.5 w-3.5" /> {total} document result{total === 1 ? '' : 's'} for "{search}"
          </p>
        )}
      </div>

      {/* Documents */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No documents found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.$id}
              doc={doc}
              projectName={projectNameById(doc.project_id)}
              documentType={documentTypeById(doc.document_type_id)}
              onDelete={(d) => deleteMutation.mutate({ id: d.$id, fileId: d.file_id })}
            />
          ))}
        </div>
      )}

      <SimplePagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={DOCUMENT_PAGE_SIZE}
        onPageChange={setPage}
        label="documents"
      />

      {/* Site visit documents + history for the focused project, shown separately */}
      {isProjectSelected && !isSearching && (
        <ProjectSiteVisitsPanel
          projectId={projectFilter}
          projectName={projectNameById(projectFilter)}
          documentTypes={documentTypes}
        />
      )}

      {canUpload && (
        <DocumentUploadDialog
          isOpen={isUploadOpen}
          setIsOpen={setIsUploadOpen}
          projects={projects}
          documentTypes={documentTypes}
          uploadedBy={user?.$id ?? ''}
          onUpload={(input) => uploadMutation.mutate(input)}
          isUploading={uploadMutation.isPending}
        />
      )}

      <FolderFormDialog
        isOpen={isFolderFormOpen}
        setIsOpen={(open) => {
          setIsFolderFormOpen(open);
          if (!open) setFolderBeingEdited(null);
        }}
        folder={folderBeingEdited}
        allowedTypes={allowedFolderTypes}
        onSubmit={(input) => saveFolderMutation.mutate(input)}
        isSaving={saveFolderMutation.isPending}
      />

      <ConfirmDialog
        open={!!folderToDelete}
        onOpenChange={(open) => { if (!open) setFolderToDelete(null); }}
        title="Delete Folder?"
        description={
          folderToDelete
            ? `Delete "${folderToDelete.name}" and every document stored inside it? This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        isLoading={deleteFolderMutation.isPending}
        onConfirm={() => { if (folderToDelete) deleteFolderMutation.mutate(folderToDelete); }}
      />

      {canManageTypes && (
        <ManageDocumentTypesDialog
          isOpen={isManageTypesOpen}
          setIsOpen={setIsManageTypesOpen}
        />
      )}
    </div>
  );
};

export default DocumentCenterSection;
