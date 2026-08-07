import React, { useState } from 'react';
import { format } from 'date-fns';
import { Download, ExternalLink, FileText, Image as ImageIcon, Trash2, MailWarning } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatFileSize } from '@/lib/utils';
import { FolderDocument } from '@/types/payload-types';
import { getAuthenticatedFileBlob } from '@/services/documentService';

interface FolderDocumentCardProps {
  doc: FolderDocument;
  /** Deleting outright is the folder owner's call; pass only for them. */
  onDelete?: (doc: FolderDocument) => void;
  /** Offered to everyone else in place of deleting. */
  onRequestDelete?: (doc: FolderDocument) => void;
  /** True once this viewer has an unresolved request for the document. */
  hasPendingRequest?: boolean;
}

const FolderDocumentCard: React.FC<FolderDocumentCardProps> = ({
  doc,
  onDelete,
  onRequestDelete,
  hasPendingRequest = false,
}) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isDownloadLoading, setIsDownloadLoading] = useState(false);
  const isImage = doc.file_type.startsWith('image/');

  const handlePreview = async () => {
    setIsPreviewLoading(true);
    try {
      const url = await getAuthenticatedFileBlob(doc.file_id, false);
      window.open(url, '_blank');
    } catch {
      toast.error('Failed to load document preview');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloadLoading(true);
    try {
      const url = await getAuthenticatedFileBlob(doc.file_id, true);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error('Failed to download document');
    } finally {
      setIsDownloadLoading(false);
    }
  };

  return (
    <>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {isImage ? <ImageIcon className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-primary" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" title={doc.file_name}>{doc.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(doc.file_size)} · {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
              onClick={handlePreview}
              disabled={isPreviewLoading}
            >
              <ExternalLink className="mr-1 h-3.5 w-3.5" /> {isPreviewLoading ? 'Loading...' : 'Preview'}
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs"
              onClick={handleDownload}
              disabled={isDownloadLoading}
            >
              <Download className="mr-1 h-3.5 w-3.5" /> {isDownloadLoading ? 'Loading...' : 'Download'}
            </Button>
            {onDelete ? (
              <Button
                size="sm"
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50"
                title="Delete document"
                onClick={() => setIsConfirmOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ) : onRequestDelete ? (
              <Button
                size="sm"
                variant="outline"
                className="text-amber-600 border-amber-500/60 hover:bg-amber-50 disabled:opacity-60"
                title={
                  hasPendingRequest
                    ? 'Deletion already requested — waiting on the folder owner'
                    : 'Request deletion from the folder owner'
                }
                disabled={hasPendingRequest}
                onClick={() => onRequestDelete(doc)}
              >
                <MailWarning className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>

          {hasPendingRequest && (
            <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
              Deletion requested awaiting the folder owner's decision.
            </p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Delete Document?"
        description={`Are you sure you want to delete "${doc.file_name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => {
          setIsConfirmOpen(false);
          onDelete?.(doc);
        }}
      />
    </>
  );
};

export default FolderDocumentCard;
