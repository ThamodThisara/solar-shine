import React, { useState } from 'react';
import { format } from 'date-fns';
import { Check, MailWarning, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DocumentDeleteRequest } from '@/types/payload-types';

interface FolderDeleteRequestsPanelProps {
  requests: DocumentDeleteRequest[];
  /** Approving deletes the document permanently. */
  onApprove: (request: DocumentDeleteRequest) => void;
  onReject: (request: DocumentDeleteRequest) => void;
  isBusy: boolean;
}

/**
 * The folder owner's queue of deletion requests. Shown only to whoever may act
 * on them — everyone else can raise a request but never see or resolve one.
 */
const FolderDeleteRequestsPanel: React.FC<FolderDeleteRequestsPanelProps> = ({
  requests,
  onApprove,
  onReject,
  isBusy,
}) => {
  // Approving is the point of no return — the document and its file go for
  // good — so it is confirmed before the request is resolved.
  const [requestToApprove, setRequestToApprove] = useState<DocumentDeleteRequest | null>(null);

  if (requests.length === 0) return null;

  return (
    <>
    <Card className="border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MailWarning className="h-4 w-4 text-amber-500" />
          Deletion Requests
          <Badge variant="secondary" className="text-[10px]">{requests.length} pending</Badge>
        </CardTitle>
        <CardDescription>
          Approving removes the document and its file permanently. Declining leaves it in place.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.$id}
            className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-semibold" title={request.file_name}>
                {request.file_name}
              </p>
              <p className="text-xs text-muted-foreground">
                Requested by{' '}
                <span className="font-medium text-foreground">
                  {request.requested_by_name || request.requested_by}
                </span>{' '}
                on {format(new Date(request.created_at), 'MMM d, yyyy')}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Reason:</span> {request.reason}
              </p>
            </div>

            <div className="flex flex-shrink-0 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50"
                disabled={isBusy}
                onClick={() => setRequestToApprove(request)}
              >
                <Check className="mr-1 h-3.5 w-3.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" disabled={isBusy} onClick={() => onReject(request)}>
                <X className="mr-1 h-3.5 w-3.5" /> Decline
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>

    <ConfirmDialog
      open={!!requestToApprove}
      onOpenChange={(open) => { if (!open) setRequestToApprove(null); }}
      title="Approve & Delete Document?"
      description={
        requestToApprove
          ? `Approving deletes "${requestToApprove.file_name}" and its stored file permanently, and notifies ${requestToApprove.requested_by_name || 'the requester'}. This action cannot be undone.`
          : ''
      }
      confirmText="Approve & Delete"
      cancelText="Cancel"
      variant="destructive"
      isLoading={isBusy}
      onConfirm={() => {
        if (requestToApprove) onApprove(requestToApprove);
        setRequestToApprove(null);
      }}
    />
    </>
  );
};

export default FolderDeleteRequestsPanel;
