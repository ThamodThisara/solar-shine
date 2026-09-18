import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getFileCategory } from '@/lib/fileTypeUtils';

interface MediaPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Blob URL returned by getAuthenticatedFileBlob — revoked on close. */
  blobUrl: string | null;
  fileName: string;
  mimeType: string;
}

/**
 * Simple in-app media player dialog for video and audio files.
 * The blob URL is created in the parent and passed in; this component
 * revokes it when the dialog closes to free memory.
 */
const MediaPreviewDialog: React.FC<MediaPreviewDialogProps> = ({
  isOpen,
  onOpenChange,
  blobUrl,
  fileName,
  mimeType,
}) => {
  const category = getFileCategory(mimeType);

  const handleOpenChange = (open: boolean) => {
    if (!open && blobUrl) {
      // Release the object URL when the dialog closes
      URL.revokeObjectURL(blobUrl);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate text-sm font-semibold" title={fileName}>
            {fileName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center bg-black/5 rounded-lg overflow-hidden">
          {blobUrl && category === 'video' && (
            <video
              key={blobUrl}
              src={blobUrl}
              controls
              autoPlay={false}
              className="w-full max-h-[60vh] rounded"
              style={{ background: '#000' }}
            >
              Your browser does not support the video tag.
            </video>
          )}
          {blobUrl && category === 'audio' && (
            <div className="w-full py-8 flex flex-col items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                {/* Music note svg icon — no Lucide dependency */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-10 w-10 text-primary"
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <audio key={blobUrl} src={blobUrl} controls autoPlay={false} className="w-full max-w-md">
                Your browser does not support the audio tag.
              </audio>
            </div>
          )}
          {!blobUrl && (
            <div className="py-12 text-muted-foreground text-sm">Loading media…</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaPreviewDialog;
