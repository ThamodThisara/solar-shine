import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { MapPin, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { ProjectExecution, ProjectExecutionStatus } from '@/types/payload-types';
import { PlatformUser } from '@/services/userService';

const statusStyles: Record<ProjectExecutionStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  planning: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  on_hold: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusOptions: ProjectExecutionStatus[] = [
  'pending',
  'planning',
  'active',
  'on_hold',
  'completed',
  'cancelled',
];

interface ProjectExecutionCardProps {
  project: ProjectExecution;
  users?: PlatformUser[];
  onStatusChange: (id: string, status: ProjectExecutionStatus) => void;
  onDelete: (id: string) => void;
  onEdit?: (project: ProjectExecution) => void;
}

const ProjectExecutionCard: React.FC<ProjectExecutionCardProps> = ({
  project,
  users = [],
  onStatusChange,
  onDelete,
  onEdit,
}) => {
  const [expanded, setExpanded] = useState(false);

  const address = project.address || (project.location && project.location.includes('|||') ? project.location.split('|||')[0] : project.location || '');
  const mapLink = project.latitude && project.longitude
    ? `https://www.google.com/maps?q=${project.latitude},${project.longitude}`
    : (project.location && project.location.includes('|||') ? project.location.split('|||')[1] : '');

  const getNamesFromEmails = (email?: string) => {
    if (!email) return '—';
    const emailClean = email.trim().toLowerCase();
    const u = users.find((user) => user.email.toLowerCase() === emailClean);
    return u?.name || email;
  };

  const renderAssignees = () => {
    const blocks: React.ReactNode[] = [];
    
    if (project.engineer) {
      const names = project.engineer.split(',').map(s => s.trim()).filter(Boolean).map(email => getNamesFromEmails(email));
      if (names.length > 0) {
        blocks.push(
          <div key="eng-role-col">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Project Engineer</p>
            <div className="text-sm font-semibold mt-1 text-foreground space-y-0.5">
              {names.map((name, idx) => <p key={idx}>{name}</p>)}
            </div>
          </div>
        );
      }
    }
    
    if (project.planning_engineer) {
      const names = project.planning_engineer.split(',').map(s => s.trim()).filter(Boolean).map(email => getNamesFromEmails(email));
      if (names.length > 0) {
        blocks.push(
          <div key="plan-role-col">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Planning Engineer</p>
            <div className="text-sm font-semibold mt-1 text-foreground space-y-0.5">
              {names.map((name, idx) => <p key={idx}>{name}</p>)}
            </div>
          </div>
        );
      }
    }
    
    if (project.sales_manager) {
      const names = project.sales_manager.split(',').map(s => s.trim()).filter(Boolean).map(email => getNamesFromEmails(email));
      if (names.length > 0) {
        blocks.push(
          <div key="sales-role-col">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Sales Manager</p>
            <div className="text-sm font-semibold mt-1 text-foreground space-y-0.5">
              {names.map((name, idx) => <p key={idx}>{name}</p>)}
            </div>
          </div>
        );
      }
    }
    
    return blocks;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 sm:pb-4 cursor-pointer p-4 sm:p-6" onClick={() => setExpanded(!expanded)}>
        <div className="flex flex-col gap-3">
          {/* Row 1: Title and Status Badge */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <CardTitle className="text-base font-bold text-foreground font-mono">
                {project.project_code || project.name}
              </CardTitle>
              {project.project_code && project.name && (
                <p className="text-xs text-muted-foreground mt-0.5 break-words">{project.name}</p>
              )}
            </div>
            <Badge className={cn("text-[10px] px-2 py-0.5 rounded font-semibold capitalize shrink-0 mt-0.5", statusStyles[project.status])}>
              {project.status.replace('_', ' ')}
            </Badge>
          </div>
          
          {/* Row 2: Details Grid and Chevron */}
          <div className="flex items-end justify-between gap-4 border-t border-border/40 pt-3">
            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-y-2 gap-x-4 text-xs text-muted-foreground w-full">
              <div className="flex items-center min-w-0">
                <span className="break-words">
                  Client: <strong className="text-foreground font-semibold">{project.client}</strong>
                </span>
              </div>
              <div className="flex items-center min-w-0">
                <span className="break-words">
                  System Size: <strong className="text-foreground font-semibold">{project.system_size} kW</strong>
                </span>
              </div>
              <div className="flex items-center min-w-0">
                <span className="break-words">
                  Contract: <strong className="text-foreground font-semibold">{formatCurrency(project.contract_value)}</strong>
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-center shrink-0 w-8 h-8 rounded-full hover:bg-muted/50 transition-colors">
              {expanded ? <ChevronDown className="h-5 w-5 text-muted-foreground/60" /> : <ChevronRight className="h-5 w-5 text-muted-foreground/60" />}
            </div>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-4 px-4 sm:px-6" onClick={(e) => e.stopPropagation()}>
          {/* Details Inset Grid Container */}
          <div className="bg-muted/30 dark:bg-muted/5 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 border border-border/40">
            {renderAssignees()}
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Start Date</p>
              <p className="text-sm font-semibold mt-1 text-foreground">{format(new Date(project.start_date), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">End Date</p>
              <p className="text-sm font-semibold mt-1 text-foreground">{format(new Date(project.end_date), 'MMM d, yyyy')}</p>
            </div>
            
            {/* Site Address and Show on Map Button Row */}
            <div className="col-span-2 sm:col-span-3 md:col-span-5 border-t border-border/30 pt-3 mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Site Address</p>
                <p className="text-sm font-semibold mt-1 text-foreground break-words">{address.trim() || '—'}</p>
              </div>
              {mapLink && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 px-3 text-xs flex items-center justify-center gap-1.5 shrink-0 w-full sm:w-auto self-start sm:self-center bg-primary text-black hover:bg-primary/90 font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(mapLink.trim(), '_blank');
                  }}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Show on Map
                </Button>
              )}
            </div>

            {project.current_stage && (
              <div className="col-span-2 sm:col-span-3 md:col-span-5 border-t border-border/30 pt-3 mt-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Current Stage</p>
                <p className="text-sm font-semibold mt-1 text-foreground">{project.current_stage}</p>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between gap-4 pt-4 mt-1 flex-wrap border-t border-border/40">
            <div className="flex items-center gap-2">
              <label htmlFor={`status-${project.$id}`} className="text-xs font-medium text-muted-foreground">Status:</label>
              <select
                id={`status-${project.$id}`}
                value={project.status}
                onChange={(e) => onStatusChange(project.$id, e.target.value as ProjectExecutionStatus)}
                className="h-8 rounded-md border border-input bg-background px-3 text-xs font-medium capitalize focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                className="bg-primary text-black hover:bg-primary/90 font-semibold"
                asChild
              >
                <Link to={`/project-summary/${project.$id}`}>
                  View Summary
                </Link>
              </Button>
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(project)}
                >
                  Edit
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:border-red-400 hover:bg-red-50/50"
                onClick={() => onDelete(project.$id)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default ProjectExecutionCard;
