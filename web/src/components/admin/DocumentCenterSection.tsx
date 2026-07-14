import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, Terminal, ChevronLeft, ChevronRight, FolderOpen, Search, Tags } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { Combobox } from '@/components/ui/combobox';
import { canAccessSection } from '@/config/roles';
import { DocumentRecord } from '@/types/payload-types';
import {
  fetchDocuments,
  fetchRecentDocuments,
  searchDocuments,
  uploadDocuments,
  deleteDocumentRecord,
  DOCUMENT_PAGE_SIZE,
} from '@/services/documentService';
import { fetchDocumentTypes } from '@/services/documentTypeService';
import { fetchProjectExecutionOptions } from '@/services/projectExecutionService';
import DocumentCard from './DocumentCard';
import DocumentUploadDialog from './content-editors/document/DocumentUploadDialog';
import ManageDocumentTypesDialog from './content-editors/document/ManageDocumentTypesDialog';
import ProjectSiteVisitsPanel from './ProjectSiteVisitsPanel';

const DocumentCenterSection: React.FC = () => {
  const { role, isLoading: isAuthLoading, user, isAdmin } = useAuth();
  const canAccess = canAccessSection('document-center', role);
  const queryClient = useQueryClient();

  const [projectFilter, setProjectFilter] = useState<string>('all');
  const departmentFilter = 'all';
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false);

  // Debounce the search input so we don't recompute on every keystroke.
  React.useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

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
      const userDept = role === 'sales_manager' ? 'sales' : role === 'hr' ? 'hr' : 'engineer';
      filtered = filtered.filter(dt => dt.department === userDept || dt.department === 'all' || !dt.department);
    } else if (departmentFilter !== 'all') {
      filtered = filtered.filter(dt => dt.department === departmentFilter);
    }
    return filtered.map(dt => dt.$id);
  }, [documentTypes, role, isAdmin, departmentFilter]);

  const queryDocTypeIds = useMemo(() => {
    if (documentTypeFilter !== 'all') {
      return documentTypeFilter;
    }
    return undefined;
  }, [documentTypeFilter]);

  const hasFilters = !isAdmin || projectFilter !== 'all' || departmentFilter !== 'all' || documentTypeFilter !== 'all' || visibilityFilter !== 'all';
  const isSearching = search.length > 0;
  // When a single project is in focus, its site-visit documents are shown in a
  // dedicated panel, so they're excluded from the main grid to avoid duplication.
  const isProjectSelected = projectFilter !== 'all';

  const documentTypeById = (id: string) => documentTypes.find((dt) => dt.$id === id);

  const { data: recentDocuments, isLoading: isRecentLoading } = useQuery({
    queryKey: ['documents-recent', user?.$id, role],
    queryFn: () => fetchRecentDocuments(user?.$id, role || undefined),
    enabled: canAccess && !hasFilters && !isSearching,
  });

  const { data: filteredData, isLoading: isFilteredLoading } = useQuery({
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
    enabled: canAccess && hasFilters && !isSearching,
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
  } else if (hasFilters) {
    documents = filteredData?.documents ?? [];
    total = filteredData?.total ?? 0;
    isLoading = isFilteredLoading;
  } else {
    documents = recentDocuments ?? [];
    total = 0;
    isLoading = isRecentLoading;
  }
  const totalPages = Math.max(1, Math.ceil(total / DOCUMENT_PAGE_SIZE));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['documents-recent'] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  };

  const uploadMutation = useMutation({
    mutationFn: uploadDocuments,
    onSuccess: ({ succeeded, failed }) => {
      invalidate();
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
      invalidate();
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

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Document Center</CardTitle>
            <CardDescription>Preview, download, and upload documents for your projects.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={() => setIsManageTypesOpen(true)}>
                <Tags className="mr-2 h-4 w-4" /> Manage Document Types
              </Button>
            )}
            <Button onClick={() => setIsUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Upload Document
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by project ID, project name or document name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

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
                group: dt.department === 'engineer' ? 'Engineering' :
                       dt.department === 'sales' ? 'Sales' :
                       dt.department === 'hr' ? 'HR' :
                       dt.department === 'admin' ? 'Admin' : 'All Departments'
              }))
          ]}
        />
      </div>

      {!hasFilters && !isSearching && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <FolderOpen className="h-3.5 w-3.5" /> Showing the 6 most recently uploaded documents
        </p>
      )}
      {isSearching && !isLoading && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Search className="h-3.5 w-3.5" /> {total} result{total === 1 ? '' : 's'} for "{search}"
        </p>
      )}

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

      {/* Pagination */}
      {(hasFilters || isSearching) && total > DOCUMENT_PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} ({total} documents)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Site visit documents + history for the focused project, shown separately */}
      {isProjectSelected && !isSearching && (
        <ProjectSiteVisitsPanel
          projectId={projectFilter}
          projectName={projectNameById(projectFilter)}
          documentTypes={documentTypes}
        />
      )}

      <DocumentUploadDialog
        isOpen={isUploadOpen}
        setIsOpen={setIsUploadOpen}
        projects={projects}
        documentTypes={documentTypes}
        uploadedBy={user?.$id ?? ''}
        onUpload={(input) => uploadMutation.mutate(input)}
        isUploading={uploadMutation.isPending}
      />

      {isAdmin && (
        <ManageDocumentTypesDialog
          isOpen={isManageTypesOpen}
          setIsOpen={setIsManageTypesOpen}
        />
      )}
    </div>
  );
};

export default DocumentCenterSection;
