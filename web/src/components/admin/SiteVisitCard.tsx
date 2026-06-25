import React from 'react';
import { format } from 'date-fns';
import { Calendar, User, MapPin, Building2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SiteVisit } from '@/types/payload-types';
import { priorityStyles, statusStyles, priorityLabel, statusLabel } from '@/lib/siteVisits';

interface SiteVisitCardProps {
  visit: SiteVisit;
  projectName: string;
  /** The current user's $id, used to flag "Assigned to you". */
  currentUserId: string;
  onOpen: (visit: SiteVisit) => void;
  /** Provided only for users allowed to delete (admins). */
  onDelete?: (visit: SiteVisit) => void;
}

const SiteVisitCard: React.FC<SiteVisitCardProps> = ({ visit, projectName, currentUserId, onOpen, onDelete }) => {
  const assignment = !visit.assigned_engineer_id
    ? { label: 'Unassigned', className: 'bg-orange-100 text-orange-700' }
    : visit.assigned_engineer_id === currentUserId
      ? { label: 'Assigned to you', className: 'bg-emerald-100 text-emerald-700' }
      : { label: `Assigned: ${visit.assigned_engineer_name || 'Engineer'}`, className: 'bg-slate-100 text-slate-700' };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <button type="button" onClick={() => onOpen(visit)} className="w-full text-left">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate" title={visit.title}>{visit.title}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Building2 className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{projectName}</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge className={assignment.className}>{assignment.label}</Badge>
              <Badge className={priorityStyles[visit.priority]}>{priorityLabel(visit.priority)}</Badge>
              <Badge className={statusStyles[visit.status]}>{statusLabel(visit.status)}</Badge>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-muted-foreground">
            {visit.assigned_engineer_name && (
              <span className="flex items-center gap-1 truncate">
                <User className="h-3 w-3 flex-shrink-0" /> {visit.assigned_engineer_name}
              </span>
            )}
            {visit.visit_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 flex-shrink-0" /> {format(new Date(visit.visit_date), 'MMM d, yyyy')}
              </span>
            )}
            {visit.location_details && (
              <span className="flex items-center gap-1 truncate sm:col-span-2">
                <MapPin className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{visit.location_details}</span>
              </span>
            )}
          </div>

          {visit.reason && (
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{visit.reason}</p>
          )}
        </button>

        {onDelete && (
          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7"
              onClick={() => onDelete(visit)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SiteVisitCard;
