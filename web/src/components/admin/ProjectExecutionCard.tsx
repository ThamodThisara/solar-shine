import React, { useState } from 'react';
import { format } from 'date-fns';
import { MapPin, User, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { ProjectExecution, ProjectExecutionStatus } from '@/types/payload-types';

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
  onStatusChange: (id: string, status: ProjectExecutionStatus) => void;
  onDelete: (id: string) => void;
}

const ProjectExecutionCard: React.FC<ProjectExecutionCardProps> = ({ project, onStatusChange, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm">{project.name}</CardTitle>
              <Badge className={statusStyles[project.status]}>
                {project.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><User className="h-3 w-3" /> {project.client}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {project.location}</span>
              <span>{project.system_size} kW</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              <p className="text-muted-foreground">Contract</p>
              <p className="font-semibold text-sm">{formatCurrency(project.contract_value)}</p>
            </div>
            {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-3 border-b border-border">
            <div>
              <p className="text-xs text-muted-foreground">Engineer</p>
              <p className="text-xs font-medium mt-0.5">{project.engineer || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sales Manager</p>
              <p className="text-xs font-medium mt-0.5">{project.sales_manager || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="text-xs font-medium mt-0.5">{format(new Date(project.start_date), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">End Date</p>
              <p className="text-xs font-medium mt-0.5">{format(new Date(project.end_date), 'MMM d, yyyy')}</p>
            </div>
            {project.current_stage && (
              <div className="col-span-2 sm:col-span-4">
                <p className="text-xs text-muted-foreground">Current Stage</p>
                <p className="text-xs font-medium mt-0.5">{project.current_stage}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label htmlFor={`status-${project.$id}`} className="text-xs text-muted-foreground">Status</label>
              <select
                id={`status-${project.$id}`}
                value={project.status}
                onChange={(e) => onStatusChange(project.$id, e.target.value as ProjectExecutionStatus)}
                className={cn(
                  "h-8 rounded-md border border-input bg-background px-2 text-xs capitalize",
                )}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-600 hover:bg-red-50"
              onClick={() => onDelete(project.$id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default ProjectExecutionCard;
