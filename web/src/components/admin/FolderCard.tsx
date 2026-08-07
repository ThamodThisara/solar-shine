import React from 'react';
import { format } from 'date-fns';
import {
  ChevronRight,
  Folder,
  Globe,
  Lock,
  MailWarning,
  Pin,
  PinOff,
  Settings2,
  Trash2,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DocumentFolder, FolderType } from '@/types/payload-types';

const TYPE_META: Record<FolderType, { label: string; icon: React.ElementType; className: string }> = {
  personal: { label: 'Personal', icon: Lock, className: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300' },
  public: { label: 'Public', icon: Globe, className: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400' },
  dynamic: { label: 'Shared', icon: Users, className: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400' },
};

interface FolderCardProps {
  folder: DocumentFolder;
  documentCount?: number;
  /** Unresolved deletion requests waiting on the owner; shown only to them. */
  pendingRequestCount?: number;
  isPinned: boolean;
  canManage: boolean;
  onOpen: (folder: DocumentFolder) => void;
  onTogglePin: (folder: DocumentFolder) => void;
  onEdit: (folder: DocumentFolder) => void;
  onDelete: (folder: DocumentFolder) => void;
}

const FolderCard: React.FC<FolderCardProps> = ({
  folder,
  documentCount,
  pendingRequestCount = 0,
  isPinned,
  canManage,
  onOpen,
  onTogglePin,
  onEdit,
  onDelete,
}) => {
  const meta = TYPE_META[folder.folder_type];
  const TypeIcon = meta.icon;
  const sharedCount = (folder.allowed_departments?.length ?? 0) + (folder.allowed_users?.length ?? 0);

  return (
    <Card
      className={cn(
        'group transition-shadow hover:shadow-md',
        isPinned && 'border-primary/40 bg-primary/[0.03]',
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => onOpen(folder)}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors hover:bg-primary/20"
            aria-label={`Open ${folder.name}`}
          >
            <Folder className="h-5 w-5 text-primary" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', meta.className)}>
                <TypeIcon className="h-3 w-3" /> {meta.label}
              </span>
              <div className="flex items-center gap-1">
                {isPinned && <Badge variant="secondary" className="text-[10px]">Pinned</Badge>}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                  title={isPinned ? 'Unpin folder' : 'Pin folder'}
                  onClick={() => onTogglePin(folder)}
                >
                  {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpen(folder)}
              className="mt-1 block w-full truncate text-left text-sm font-semibold hover:text-primary"
              title={folder.name}
            >
              {folder.name}
            </button>
            <p className="truncate text-xs text-muted-foreground" title={folder.description ?? ''}>
              {folder.description || 'No description'}
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Documents</span>
            <span className="font-medium">{documentCount ?? '—'}</span>
          </div>
          {folder.folder_type === 'dynamic' && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Shared with</span>
              <span className="font-medium">
                {sharedCount} {sharedCount === 1 ? 'recipient' : 'recipients'}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium">{format(new Date(folder.created_at), 'MMM d, yyyy')}</span>
          </div>
          {canManage && pendingRequestCount > 0 && (
            <button
              type="button"
              onClick={() => onOpen(folder)}
              className="flex w-full items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50"
            >
              <MailWarning className="h-3.5 w-3.5 flex-shrink-0" />
              {pendingRequestCount} deletion request{pendingRequestCount === 1 ? '' : 's'} to review
            </button>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button size="sm" className="flex-1 text-xs" onClick={() => onOpen(folder)}>
            Open Folder <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
          {canManage && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                title="Folder settings & permissions"
                onClick={() => onEdit(folder)}
              >
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50"
                title="Delete folder"
                onClick={() => onDelete(folder)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FolderCard;
