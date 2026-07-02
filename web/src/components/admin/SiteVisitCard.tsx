import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Trash2, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SiteVisit } from '@/types/payload-types';
import { priorityStyles, statusStyles, priorityLabel, statusLabel } from '@/lib/siteVisits';
import { PlatformUser } from '@/services/userService';
import { cn } from '@/lib/utils';

interface SiteVisitCardProps {
  visit: SiteVisit;
  projectName: string;
  /** The current user's $id, used to flag "Assigned to you". */
  currentUserId: string;
  onOpen: (visit: SiteVisit, tab?: 'details' | 'activity' | 'documents', hideTabs?: boolean) => void;
  /** Provided only for users allowed to delete (admins). */
  onDelete?: (visit: SiteVisit) => void;
  users?: PlatformUser[];
  hideProjectSummaryLink?: boolean;
}

const SiteVisitCard: React.FC<SiteVisitCardProps> = ({
  visit,
  projectName,
  currentUserId,
  onOpen,
  onDelete,
  users = [],
  hideProjectSummaryLink = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  const renderEngineers = () => {
    if (!visit.assigned_engineer_id) {
      return (
        <div>
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Assigned Engineer</p>
          <p className="text-sm font-semibold mt-1 text-foreground">Unassigned</p>
        </div>
      );
    }

    const ids = visit.assigned_engineer_id.split(',').map((s) => s.trim()).filter(Boolean);
    const names = visit.assigned_engineer_name ? visit.assigned_engineer_name.split(',').map((s) => s.trim()) : [];

    const projectEngineers: string[] = [];
    const planningEngineers: string[] = [];

    ids.forEach((id, index) => {
      const u = users.find((user) => user.$id === id);
      const name = names[index] || u?.name || u?.email || id;
      if (u?.role === 'planning_engineer') {
        planningEngineers.push(name);
      } else {
        projectEngineers.push(name);
      }
    });

    const blocks: React.ReactNode[] = [];

    if (projectEngineers.length > 0) {
      blocks.push(
        <div key="sv-eng-role-col">
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Project Engineer</p>
          <div className="text-sm font-semibold mt-1 text-foreground space-y-0.5">
            {projectEngineers.map((name, idx) => <p key={idx}>{name}</p>)}
          </div>
        </div>
      );
    }
    if (planningEngineers.length > 0) {
      blocks.push(
        <div key="sv-plan-role-col">
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Planning Engineer</p>
          <div className="text-sm font-semibold mt-1 text-foreground space-y-0.5">
            {planningEngineers.map((name, idx) => <p key={idx}>{name}</p>)}
          </div>
        </div>
      );
    }

    return blocks;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 sm:pb-4 cursor-pointer p-4 sm:p-6" onClick={() => setExpanded(!expanded)}>
        <div className="flex flex-col gap-3">
          {/* Row 1: Title and Status/Priority Badges */}
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-base font-bold text-foreground">{visit.title}</CardTitle>
            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
              <Badge className={cn("text-[10px] px-2 py-0.5 font-semibold capitalize", statusStyles[visit.status])}>
                {statusLabel(visit.status)}
              </Badge>
              <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 font-semibold capitalize", priorityStyles[visit.priority])}>
                {priorityLabel(visit.priority)}
              </Badge>
            </div>
          </div>
          
          {/* Row 2: Details Grid and Assignment Badge + Chevron */}
          <div className="flex items-end justify-between gap-4 border-t border-border/40 pt-3">
            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-xs text-muted-foreground w-full">
              <div className="flex items-center min-w-0">
                <span className="break-words">
                  Project: <strong className="text-foreground font-semibold">{projectName}</strong>
                </span>
              </div>
              <div className="flex items-center min-w-0">
                <span className="break-words">
                  Dates: <strong className="text-foreground font-semibold">
                    {visit.visit_date ? format(new Date(visit.visit_date), 'MMM d, yyyy') : '—'}
                    {visit.expected_completion_date ? ` — ${format(new Date(visit.expected_completion_date), 'MMM d, yyyy')}` : ''}
                  </strong>
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted/50 transition-colors">
                {expanded ? <ChevronDown className="h-5 w-5 text-muted-foreground/60" /> : <ChevronRight className="h-5 w-5 text-muted-foreground/60" />}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-4 px-4 sm:px-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          {/* Details Inset Block */}
          <div className="bg-muted/30 dark:bg-muted/5 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 border border-border/40 text-xs">
            {renderEngineers()}
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Visit Date</p>
              <p className="font-semibold text-foreground mt-1">
                {visit.visit_date ? format(new Date(visit.visit_date), 'MMM d, yyyy') : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Expected Completion</p>
              <p className="font-semibold text-foreground mt-1">
                {visit.expected_completion_date ? format(new Date(visit.expected_completion_date), 'MMM d, yyyy') : '—'}
              </p>
            </div>
          </div>

          {/* Reason & Description full-width inline blocks */}
          <div className="space-y-3">
            {visit.reason && (
              <div className="border border-border/30 rounded-lg p-3 bg-muted/10">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Reason for Visit</p>
                <p className="text-sm mt-1 text-foreground whitespace-pre-wrap">{visit.reason}</p>
              </div>
            )}
            {visit.description && (
              <div className="border border-border/30 rounded-lg p-3 bg-muted/10">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Description of Work</p>
                <p className="text-sm mt-1 text-foreground whitespace-pre-wrap">{visit.description}</p>
              </div>
            )}
            {visit.issue_observation && (
              <div className="border border-border/30 rounded-lg p-3 bg-muted/10">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Initial Observation / Issues</p>
                <p className="text-sm mt-1 text-foreground whitespace-pre-wrap">{visit.issue_observation}</p>
              </div>
            )}
            {visit.additional_notes && (
              <div className="border border-border/30 rounded-lg p-3 bg-muted/10">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Additional Notes</p>
                <p className="text-sm mt-1 text-foreground whitespace-pre-wrap">{visit.additional_notes}</p>
              </div>
            )}
          </div>

          {/* Expanded Action Footer */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/40 flex-wrap">
            <div className="text-xs text-muted-foreground">
              Created: {visit.created_at ? format(new Date(visit.created_at), 'MMM d, yyyy h:mm a') : '—'}
            </div>

            {/* Desktop Action Trigger (single button) */}
            <div className="hidden sm:flex items-center gap-2 justify-end w-auto">
              {!hideProjectSummaryLink && (
                <Button
                  variant="default"
                  size="sm"
                  className="bg-primary text-black hover:bg-primary/90 font-semibold"
                  asChild
                >
                  <Link to={`/project-summary/${visit.project_id}`}>
                    Project Summary
                  </Link>
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                className="bg-primary text-black hover:bg-primary/90 font-semibold"
                onClick={() => onOpen(visit, 'details', false)}
              >
                <ClipboardList className="h-3.5 w-3.5 mr-1" /> View Updates & Comments
              </Button>
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:border-red-400 hover:bg-red-50/50"
                  onClick={() => onDelete(visit)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              )}
            </div>

            {/* Mobile Action Triggers (three separate buttons) */}
            <div className="flex sm:hidden flex-col gap-2 w-full">
              <div className="grid grid-cols-3 gap-1.5 w-full">
                <Button
                  variant="default"
                  size="sm"
                  className="w-full text-[11px] h-8 px-1.5 bg-primary text-black hover:bg-primary/90 font-semibold"
                  onClick={() => onOpen(visit, 'details', true)}
                >
                  Details
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full text-[11px] h-8 px-1.5 bg-primary text-black hover:bg-primary/90 font-semibold"
                  onClick={() => onOpen(visit, 'activity', true)}
                >
                  Activity
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full text-[11px] h-8 px-1.5 bg-primary text-black hover:bg-primary/90 font-semibold"
                  onClick={() => onOpen(visit, 'documents', true)}
                >
                  Docs
                </Button>
              </div>
              {!hideProjectSummaryLink && (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full text-[11px] h-8 bg-primary text-black hover:bg-primary/90 font-semibold"
                  asChild
                >
                  <Link to={`/project-summary/${visit.project_id}`}>
                    Project Summary
                  </Link>
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:border-red-400 hover:bg-red-50/50 w-full text-[11px] h-8"
                  onClick={() => onDelete(visit)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default SiteVisitCard;
