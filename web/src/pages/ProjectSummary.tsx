import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, Calendar, Activity, FileText, ClipboardList } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchProjectExecution, fetchProjectExecutionOptions } from '@/services/projectExecutionService';
import { fetchSiteVisits } from '@/services/siteVisitService';
import { fetchDocuments } from '@/services/documentService';
import { fetchUsers } from '@/services/userService';
import { fetchDocumentTypes } from '@/services/documentTypeService';
import { formatCurrency } from '@/lib/utils';
import DocumentCard from '@/components/admin/DocumentCard';
import SiteVisitCard from '@/components/admin/SiteVisitCard';
import SiteVisitDetailDialog from '@/components/admin/content-editors/site-visit/SiteVisitDetailDialog';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { EngineerLayout } from '@/components/engineer/EngineerLayout';
import { cn } from '@/lib/utils';

const projectStatusStyles = {
  pending: 'bg-gray-100 text-gray-800 border-gray-200',
  planning: 'bg-blue-100 text-blue-800 border-blue-200',
  active: 'bg-green-100 text-green-800 border-green-200',
  on_hold: 'bg-amber-100 text-amber-800 border-amber-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

interface LayoutWrapperProps {
  children: React.ReactNode;
  role: string | null;
  navigate: (path: string) => void;
}

const LayoutWrapper: React.FC<LayoutWrapperProps> = ({ children, role, navigate }) => {
  const [activeSec, setActiveSec] = useState('project-execution');
  if (role === 'admin') {
    return (
      <AdminLayout
        activeSection={activeSec}
        onSectionChange={(sec) => {
          setActiveSec(sec);
          navigate('/admin');
        }}
      >
        {children}
      </AdminLayout>
    );
  } else {
    return (
      <EngineerLayout
        activeSection={activeSec}
        onSectionChange={(sec) => {
          setActiveSec(sec);
          if (role === 'sales_manager') {
            navigate('/sales');
          } else {
            navigate('/engineer');
          }
        }}
      >
        {children}
      </EngineerLayout>
    );
  }
};

const ProjectSummary: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { role, user } = useAuth();
  const navigate = useNavigate();

  // Dialog and navigation states for Site Visit Cards
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);
  const [selectedVisitTab, setSelectedVisitTab] = useState<'details' | 'activity' | 'documents'>('details');
  const [hideDialogTabs, setHideDialogTabs] = useState<boolean>(false);
  const [department, setDepartment] = useState<string>('all');

  // Redirect back to dashboard based on role
  const handleBack = () => {
    if (role === 'admin') {
      navigate('/admin');
    } else if (role === 'sales_manager') {
      navigate('/sales');
    } else {
      navigate('/engineer');
    }
  };

  // 1. Fetch project execution details
  const { data: project, isLoading: isProjectLoading, error: projectError } = useQuery({
    queryKey: ['project-execution', projectId],
    queryFn: () => fetchProjectExecution(projectId!),
    enabled: !!projectId,
  });

  // 2. Fetch site visits under this project
  const { data: siteVisitsData, isLoading: isVisitsLoading } = useQuery({
    queryKey: ['project-site-visits', projectId],
    queryFn: () => fetchSiteVisits({ projectId: projectId! }),
    enabled: !!projectId,
  });
  const siteVisits = siteVisitsData?.documents ?? [];

  // 3. Fetch general project documents (excluding site visit ones)
  const { data: docsData, isLoading: isDocsLoading } = useQuery({
    queryKey: ['project-general-docs', projectId, department],
    queryFn: () =>
      fetchDocuments({
        projectId: projectId!,
        excludeSiteVisitDocs: true,
        department: department === 'all' ? undefined : (department as any),
      }),
    enabled: !!projectId,
  });
  const generalDocs = docsData?.documents ?? [];

  // 4. Fetch users to resolve uploader names
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers(),
  });

  // 5. Fetch document types
  const { data: documentTypes = [] } = useQuery({
    queryKey: ['document-types'],
    queryFn: fetchDocumentTypes,
  });

  // 6. Fetch project options (needed for SiteVisitDetailDialog dropdown options resolving)
  const { data: projectsList = [] } = useQuery({
    queryKey: ['project-execution-options'],
    queryFn: fetchProjectExecutionOptions,
  });

  const renderEngineersList = (emails?: string) => {
    if (!emails) return <p className="font-semibold text-foreground mt-0.5">—</p>;
    const names = emails
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
      .map((email) => {
        const u = users.find((user) => user.email.toLowerCase() === email.toLowerCase());
        return u?.name || email;
      });
    if (names.length === 0) return <p className="font-semibold text-foreground mt-0.5">—</p>;
    return (
      <div className="text-sm font-semibold mt-1 text-foreground space-y-0.5">
        {names.map((name, idx) => (
          <p key={idx}>{name}</p>
        ))}
      </div>
    );
  };

  const getUserName = (id?: string) => {
    if (!id) return 'System';
    const u = users.find((user) => user.$id === id);
    return u?.name || u?.email || id;
  };

  const canEditVisit = (visit: any) => {
    if (role === 'admin') return true;
    const ids = visit.assigned_engineer_id
      ? visit.assigned_engineer_id.split(',').map((s: string) => s.trim())
      : [];
    return ids.includes(user?.$id ?? '');
  };

  if (isProjectLoading) {
    return (
      <LayoutWrapper role={role} navigate={navigate}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </LayoutWrapper>
    );
  }

  if (projectError || !project) {
    return (
      <LayoutWrapper role={role} navigate={navigate}>
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
          <h2 className="text-xl font-bold text-destructive">Project Not Found</h2>
          <p className="text-muted-foreground">The requested project summary cannot be loaded.</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper role={role} navigate={navigate}>
      <div className="space-y-6">
        {/* Top Navigation Row */}
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex items-center gap-2">
              <Button onClick={handleBack} variant="default" size="sm" className="h-8 shrink-0 font-semibold bg-primary text-black hover:bg-primary/90 border-none">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
              <Badge className={cn("text-xs font-semibold capitalize sm:hidden", projectStatusStyles[project.status])}>
                {project.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <h1 className="text-lg sm:text-xl font-bold text-foreground break-words">
              {project.name}
            </h1>
          </div>
          <Badge className={cn("text-xs font-semibold capitalize hidden sm:inline-flex self-start sm:self-auto", projectStatusStyles[project.status])}>
            {project.status.replace('_', ' ')}
          </Badge>
        </div>

        {/* Main Grid: Details Card & Map */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project Details Panel */}
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" /> Project Metadata
              </CardTitle>
              <CardDescription>Core execution metrics and team roles</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Client</span>
                <p className="font-semibold text-foreground mt-0.5">{project.client}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">System Size</span>
                <p className="font-semibold text-foreground mt-0.5">{project.system_size || 0} kW</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Contract Value</span>
                <p className="font-semibold text-foreground mt-0.5">{formatCurrency(project.contract_value)}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Current Stage</span>
                <p className="font-semibold text-foreground mt-0.5">{project.current_stage || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Start Date</span>
                <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Expected End Date</span>
                <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {project.end_date ? format(new Date(project.end_date), 'MMM d, yyyy') : '—'}
                </p>
              </div>
              <div className="sm:col-span-2 border-t pt-3 mt-1">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Project Engineers</span>
                {renderEngineersList(project.engineer)}
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Planning Engineers</span>
                {renderEngineersList(project.planning_engineer)}
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Sales Managers</span>
                {renderEngineersList(project.sales_manager)}
              </div>
              <div className="sm:col-span-2 border-t pt-3">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Site Address</span>
                <p className="font-medium text-foreground mt-0.5 flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>{project.address || '—'}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Map Panel */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Geolocation Map
              </CardTitle>
              <CardDescription>Project location preview</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {project.latitude && project.longitude ? (
                <div className="space-y-3">
                  <div className="w-full h-[220px] rounded-lg overflow-hidden border border-border">
                    <iframe
                      title="Project Geolocation Map"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      src={`https://maps.google.com/maps?q=${project.latitude},${project.longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                    />
                  </div>
                  <Button size="sm" variant="default" className="w-full text-xs font-semibold bg-primary text-black hover:bg-primary/90 border-none" asChild>
                    <a
                      href={`https://www.google.com/maps?q=${project.latitude},${project.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on Google Maps
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="w-full h-[220px] rounded-lg bg-muted flex flex-col items-center justify-center text-center p-4 border border-dashed">
                  <MapPin className="h-8 w-8 text-muted-foreground opacity-50 mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">No coordinates set</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Edit project details to define coordinates.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Centralized Activity Hub: Site Visits */}
        <div className="space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2 border-b pb-2">
            <Activity className="h-4 w-4 text-primary" /> Site Visit Activity Hub
          </h2>
          
          {isVisitsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : siteVisits.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No site visit reports registered for this project yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {siteVisits.map((visit) => (
                <SiteVisitCard
                  key={visit.$id}
                  visit={visit}
                  projectName={project.name}
                  currentUserId={user?.$id ?? ''}
                  onOpen={(v, tab, hideTabs) => {
                    setSelectedVisit(v);
                    setSelectedVisitTab(tab ?? 'details');
                    setHideDialogTabs(!!hideTabs);
                  }}
                  users={users}
                  hideProjectSummaryLink={true}
                />
              ))}
            </div>
          )}
        </div>

        {/* General Documents Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-2">
            <h2 className="text-base font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> General Project Documents
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="dept-filter" className="text-xs font-semibold text-muted-foreground">Department:</label>
              <select
                id="dept-filter"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-3 text-xs font-medium focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
              >
                <option value="all">All Departments</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="Engineering">Engineering</option>
                <option value="Finance">Finance</option>
              </select>
            </div>
          </div>
          
          {isDocsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          ) : generalDocs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No general files uploaded from the Document Center for this project.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {generalDocs.map((doc) => (
                <div key={doc.$id} className="relative group flex flex-col">
                  <DocumentCard
                    doc={doc}
                    projectName={project.name}
                    documentType={documentTypes.find((dt) => dt.$id === doc.document_type_id)}
                  />
                  {/* Uploader audit footer */}
                  <div className="mt-2 border-t border-border/30 pt-2 px-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="truncate">By: <strong className="font-semibold text-foreground">{getUserName(doc.uploaded_by)}</strong></span>
                    <span>{format(new Date(doc.uploaded_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reused SiteVisitDetailDialog */}
      {selectedVisit && (
        <SiteVisitDetailDialog
          visit={selectedVisit}
          isOpen={!!selectedVisit}
          setIsOpen={(open) => { if (!open) setSelectedVisit(null); }}
          projectName={project.name}
          documentTypes={documentTypes}
          currentUser={{ $id: user?.$id ?? '', name: user?.name ?? 'User' }}
          canEdit={canEditVisit(selectedVisit)}
          isAdmin={role === 'admin'}
          users={users}
          projects={projectsList}
          defaultTab={selectedVisitTab}
          hideTabs={hideDialogTabs}
        />
      )}
    </LayoutWrapper>
  );
};

export default ProjectSummary;
