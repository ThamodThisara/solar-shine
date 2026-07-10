import React, { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Image as ImageIcon, Download, ExternalLink, Trash2, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/utils';
import { DocumentRecord, DocumentType } from '@/types/payload-types';
import { getAuthenticatedFileBlob } from '@/services/documentService';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

const departmentStyles: Record<string, string> = {
  Marketing: 'text-violet-600 bg-violet-50',
  Sales: 'text-blue-600 bg-blue-50',
  Engineering: 'text-emerald-600 bg-emerald-50',
  Finance: 'text-amber-600 bg-amber-50',
  HR: 'text-purple-600 bg-purple-50',
};

interface DocumentCardProps {
  doc: DocumentRecord;
  projectName: string;
  documentType?: DocumentType;
  onDelete?: (doc: DocumentRecord) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ doc, projectName, documentType, onDelete }) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const isImage = doc.file_type.startsWith('image/');
  const typeCode = documentType?.type ?? 'Unknown';
  const typeName = documentType?.name ?? 'Unknown Type';

  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isDownloadLoading, setIsDownloadLoading] = useState(false);

  const handlePreview = async () => {
    setIsPreviewLoading(true);
    try {
      const url = await getAuthenticatedFileBlob(doc.file_id, false);
      window.open(url, '_blank');
    } catch (error) {
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
    } catch (error) {
      toast.error('Failed to download document');
    } finally {
      setIsDownloadLoading(false);
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              {isImage ? <ImageIcon className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-primary">{typeCode}</span>
                <Badge variant={doc.document_visibility === 'internal' ? 'secondary' : 'outline'} className="text-[10px]">
                  {doc.document_visibility === 'internal' ? 'Internal' : 'Client Facing'}
                </Badge>
              </div>
              <p className="text-sm font-semibold mt-1 truncate" title={doc.file_name}>{typeName}</p>
              <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> Project</span>
              <span className="font-medium truncate max-w-[160px]">{projectName}</span>
            </div>
            {doc.department && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Department</span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${departmentStyles[doc.department] ?? 'text-muted-foreground bg-muted'}`}>
                  {doc.department}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Size</span>
              <span className="font-medium">{formatFileSize(doc.file_size)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Uploaded</span>
              <span className="font-medium">{format(new Date(doc.uploaded_at), 'MMM d, yyyy')}</span>
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
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> {isPreviewLoading ? 'Loading...' : 'Preview'}
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs"
              onClick={handleDownload}
              disabled={isDownloadLoading}
            >
              <Download className="h-3.5 w-3.5 mr-1" /> {isDownloadLoading ? 'Loading...' : 'Download'}
            </Button>
            {onDelete && (
              <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => setIsConfirmOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Delete Document?"
        description={`Are you sure you want to delete the document "${doc.file_name}"? This action cannot be undone.`}
        onConfirm={() => {
          setIsConfirmOpen(false);
          onDelete?.(doc);
        }}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </>
  );
};

export default DocumentCard;
