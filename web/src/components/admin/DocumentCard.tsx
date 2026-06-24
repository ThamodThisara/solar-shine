import React from 'react';
import { format } from 'date-fns';
import { FileText, Image as ImageIcon, Download, ExternalLink, Trash2, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/utils';
import { DocumentRecord, DocumentType } from '@/types/payload-types';
import { getDocumentPreviewUrl, getDocumentDownloadUrl } from '@/services/documentService';

const departmentStyles: Record<string, string> = {
  Marketing: 'text-violet-600 bg-violet-50',
  Sales: 'text-blue-600 bg-blue-50',
  Engineering: 'text-emerald-600 bg-emerald-50',
  Finance: 'text-amber-600 bg-amber-50',
};

interface DocumentCardProps {
  doc: DocumentRecord;
  projectName: string;
  documentType?: DocumentType;
  onDelete: (doc: DocumentRecord) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ doc, projectName, documentType, onDelete }) => {
  const isImage = doc.file_type.startsWith('image/');
  const typeCode = documentType?.type ?? 'Unknown';
  const typeName = documentType?.name ?? 'Unknown Type';

  return (
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
          <Button size="sm" variant="outline" className="flex-1 text-xs" asChild>
            <a href={getDocumentPreviewUrl(doc.file_id)} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Preview
            </a>
          </Button>
          <Button size="sm" className="flex-1 text-xs" asChild>
            <a href={getDocumentDownloadUrl(doc.file_id)} target="_blank" rel="noopener noreferrer">
              <Download className="h-3.5 w-3.5 mr-1" /> Download
            </a>
          </Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => onDelete(doc)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentCard;
