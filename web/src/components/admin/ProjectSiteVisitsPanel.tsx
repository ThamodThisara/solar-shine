import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, ClipboardList, Clock, User, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SiteVisit, DocumentType } from '@/types/payload-types';
import { priorityStyles, statusStyles, priorityLabel, statusLabel, updateTypeLabel } from '@/lib/siteVisits';
import { fetchSiteVisitsByProject, fetchSiteVisitUpdates } from '@/services/siteVisitService';
import { fetchDocumentsBySiteVisit, deleteDocumentRecord } from '@/services/documentService';
import DocumentCard from './DocumentCard';
import { useAuth } from '@/contexts/AuthContext';

interface ProjectSiteVisitsPanelProps {
  projectId: string;
  projectName: string;
  documentTypes: DocumentType[];
}

const SiteVisitRow: React.FC<{
  visit: SiteVisit;
  projectName: string;
  documentTypes: DocumentType[];
}> = ({ visit, projectName, documentTypes }) => {
  const { user, role } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const { data: updates = [], isLoading: isUpdatesLoading } = useQuery({
    queryKey: ['site-visit-updates', visit.$id],
    queryFn: () => fetchSiteVisitUpdates(visit.$id),
    enabled: expanded,
  });

  const { data: documents = [], isLoading: isDocsLoading } = useQuery({
    queryKey: ['site-visit-documents', visit.$id, user?.$id, role],
    queryFn: () => fetchDocumentsBySiteVisit(visit.$id, user?.$id, role || undefined),
    enabled: expanded,
  });

  const documentTypeById = (id: string) => documentTypes.find((dt) => dt.$id === id);

  const deleteMutation = useMutation({
    mutationFn: ({ id, fileId }: { id: string; fileId: string }) => deleteDocumentRecord(id, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-visit-documents', visit.$id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted');
    },
    onError: () => toast.error('Failed to delete document'),
  });

  return (
    <Card>
      <CardHeader className="py-3 cursor-pointer" onClick={() => setExpanded((e) => !e)}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm">{visit.title}</CardTitle>
              <Badge className={priorityStyles[visit.priority]}>{priorityLabel(visit.priority)}</Badge>
              <Badge className={statusStyles[visit.status]}>{statusLabel(visit.status)}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><User className="h-3 w-3" /> {visit.assigned_engineer_name || 'Unassigned'}</span>
              {visit.visit_date && (
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(visit.visit_date), 'MMM d, yyyy')}</span>
              )}
            </div>
          </div>
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-b border-border pb-3">
            <div><p className="text-muted-foreground">Reason</p><p className="font-medium mt-0.5 whitespace-pre-wrap">{visit.reason || '—'}</p></div>
            <div><p className="text-muted-foreground">Location</p><p className="font-medium mt-0.5">{visit.location_details || '—'}</p></div>
            {visit.issue_observation && (
              <div className="sm:col-span-2"><p className="text-muted-foreground">Issue / Observation</p><p className="font-medium mt-0.5 whitespace-pre-wrap">{visit.issue_observation}</p></div>
            )}
            {visit.findings && (
              <div className="sm:col-span-2"><p className="text-muted-foreground">Findings</p><p className="font-medium mt-0.5 whitespace-pre-wrap">{visit.findings}</p></div>
            )}
          </div>

          {/* History */}
          <div>
            <p className="text-xs font-semibold mb-2">Activity History</p>
            {isUpdatesLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : updates.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activity recorded.</p>
            ) : (
              <div className="space-y-2">
                {updates.map((u) => (
                  <div key={u.$id} className="flex gap-2">
                    <Clock className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">{updateTypeLabel(u.update_type)}</Badge>
                        <span className="text-[11px] font-medium">{u.author_name || 'User'}</span>
                        <span className="text-[11px] text-muted-foreground">{format(new Date(u.created_at), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      <p className="text-xs mt-0.5 whitespace-pre-wrap break-words">{u.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documents */}
          <div>
            <p className="text-xs font-semibold mb-2">Site Visit Documents</p>
            {isDocsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : documents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No documents uploaded for this visit.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.$id}
                    doc={doc}
                    projectName={projectName}
                    documentType={documentTypeById(doc.document_type_id)}
                    onDelete={(d) => deleteMutation.mutate({ id: d.$id, fileId: d.file_id })}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

const ProjectSiteVisitsPanel: React.FC<ProjectSiteVisitsPanelProps> = ({ projectId, projectName, documentTypes }) => {
  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['site-visits-by-project', projectId],
    queryFn: () => fetchSiteVisitsByProject(projectId),
    enabled: !!projectId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4" /> Site Visits
        </CardTitle>
        <CardDescription>
          Inspections and their documents for {projectName}, shown separately from the project's general documents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : visits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No site visits recorded for this project.</p>
        ) : (
          visits.map((visit) => (
            <SiteVisitRow
              key={visit.$id}
              visit={visit}
              projectName={projectName}
              documentTypes={documentTypes}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectSiteVisitsPanel;
