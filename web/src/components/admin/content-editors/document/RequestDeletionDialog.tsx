import React, { useEffect, useState } from 'react';
import { MailWarning, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FolderDocument } from '@/types/payload-types';
import { DELETE_REQUEST_REASON_MAX_LENGTH } from '@/services/documentDeleteRequestService';

interface RequestDeletionDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  /** The document the request is about; null while the dialog is closed. */
  document: FolderDocument | null;
  folderName: string;
  onSubmit: (reason: string) => void;
  isSubmitting: boolean;
}

export const RequestDeletionDialog: React.FC<RequestDeletionDialogProps> = ({
  isOpen,
  setIsOpen,
  document,
  folderName,
  onSubmit,
  isSubmitting,
}) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!isOpen) setReason('');
  }, [isOpen]);

  const isValid = reason.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MailWarning className="h-5 w-5 text-amber-500" /> Request Deletion
          </DialogTitle>
          <DialogDescription>
            Only the owner of <span className="font-medium">{folderName}</span> can delete documents
            from it. Send them a request explaining why this one should go.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="truncate text-sm font-medium" title={document?.file_name}>
              {document?.file_name}
            </p>
            <p className="text-xs text-muted-foreground">This document will not be removed until the owner approves.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deletion-reason">Reason for deletion</Label>
            <Textarea
              id="deletion-reason"
              placeholder="e.g., Uploaded to the wrong folder / superseded by a newer revision"
              rows={4}
              maxLength={DELETE_REQUEST_REASON_MAX_LENGTH}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                The reason is sent to the folder owner along with your name and the document details.
              </p>
              <span className="flex-shrink-0 text-xs text-muted-foreground tabular-nums">
                {reason.length}/{DELETE_REQUEST_REASON_MAX_LENGTH}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button disabled={!isValid || isSubmitting} onClick={() => onSubmit(reason)}>
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Sending...' : 'Send Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestDeletionDialog;
