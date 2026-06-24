import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Upload, UploadCloud, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatFileSize } from '@/lib/utils';
import { DEPARTMENTS, ALLOWED_FILE_EXTENSIONS, isAllowedFile } from '@/lib/documentTypes';
import { Department, DocumentVisibility, DocumentType } from '@/types/payload-types';
import { UploadDocumentsInput } from '@/services/documentService';

interface ProjectOption {
  $id: string;
  name: string;
  client: string;
}

interface DocumentUploadDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  projects: ProjectOption[];
  documentTypes: DocumentType[];
  uploadedBy: string;
  onUpload: (input: UploadDocumentsInput) => void;
  isUploading: boolean;
}

const initialState = {
  projectId: '',
  visibility: '' as DocumentVisibility | '',
  department: '' as Department | '',
  documentTypeId: '',
  files: [] as File[],
};

const DocumentUploadDialog: React.FC<DocumentUploadDialogProps> = ({
  isOpen,
  setIsOpen,
  projects,
  documentTypes,
  uploadedBy,
  onUpload,
  isUploading,
}) => {
  const [state, setState] = useState(initialState);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => setState(initialState);

  const close = () => {
    setIsOpen(false);
    reset();
  };

  const addFiles = (incoming: FileList | File[]) => {
    const accepted: File[] = [];
    let rejectedCount = 0;
    Array.from(incoming).forEach((file) => {
      if (isAllowedFile(file)) accepted.push(file);
      else rejectedCount++;
    });
    if (rejectedCount > 0) {
      toast.error(`${rejectedCount} file(s) were skipped because their format is not supported.`);
    }
    setState((s) => ({ ...s, files: [...s.files, ...accepted] }));
  };

  const removeFile = (index: number) => {
    setState((s) => ({ ...s, files: s.files.filter((_, i) => i !== index) }));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleSubmit = () => {
    if (!isFormValid) return;
    onUpload({
      files: state.files,
      projectId: state.projectId,
      visibility: state.visibility as DocumentVisibility,
      department: state.visibility === 'internal' ? (state.department as Department) : undefined,
      documentTypeId: state.documentTypeId,
      uploadedBy,
    });
  };

  const isFormValid =
    !!state.projectId &&
    !!state.visibility &&
    (state.visibility !== 'internal' || !!state.department) &&
    !!state.documentTypeId &&
    state.files.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? setIsOpen(true) : close())}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
          <div>
            <Label htmlFor="upload-project">Project</Label>
            <Combobox
              id="upload-project"
              modal
              className="focus:ring-0 focus:ring-offset-0"
              value={state.projectId}
              onChange={(v) => setState((s) => ({ ...s, projectId: v }))}
              placeholder="Select a project"
              searchPlaceholder="Search projects..."
              emptyText="No projects found."
              options={projects.map((p) => ({ value: p.$id, label: `${p.name} — ${p.client}`, keywords: p.client }))}
            />
          </div>

          <div>
            <Label>Document Visibility</Label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              {(['internal', 'client_facing'] as DocumentVisibility[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setState((s) => ({ ...s, visibility: v, department: '' }))}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    state.visibility === v ? "border-primary bg-primary/10 text-primary" : "border-input hover:bg-accent"
                  )}
                >
                  {v === 'internal' ? 'Internal Document' : 'Client Facing Document'}
                </button>
              ))}
            </div>
          </div>

          {state.visibility === 'internal' && (
            <div>
              <Label htmlFor="upload-department">Department</Label>
              <Combobox
                id="upload-department"
                modal
                className="focus:ring-0 focus:ring-offset-0"
                value={state.department}
                onChange={(v) => setState((s) => ({ ...s, department: v as Department }))}
                placeholder="Select a department"
                searchPlaceholder="Search departments..."
                emptyText="No departments found."
                options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
              />
            </div>
          )}

          <div>
            <Label htmlFor="upload-document-type">Document Type</Label>
            <Combobox
              id="upload-document-type"
              modal
              className="focus:ring-0 focus:ring-offset-0"
              value={state.documentTypeId}
              onChange={(v) => setState((s) => ({ ...s, documentTypeId: v }))}
              placeholder="Select a document type"
              searchPlaceholder="Search document types..."
              emptyText="No document types found."
              options={documentTypes.map((dt) => ({ value: dt.$id, label: `${dt.name} (${dt.type})`, keywords: dt.type }))}
            />
          </div>

          <div>
            <Label>Files</Label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-md py-8 cursor-pointer transition-colors mt-1",
                isDragging ? "border-primary bg-primary/5" : "hover:bg-accent/50"
              )}
            >
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Drag & drop files here, or click to browse</span>
              <span className="text-xs text-muted-foreground">{ALLOWED_FILE_EXTENSIONS.join(', ')}</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = '';
              }}
            />

            {state.files.length > 0 && (
              <div className="mt-3 space-y-2">
                {state.files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between border rounded-md px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate max-w-[380px]">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>Cancel</Button>
          <Button type="button" disabled={!isFormValid || isUploading} onClick={handleSubmit}>
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? 'Uploading...' : `Upload ${state.files.length > 0 ? state.files.length : ''} Document${state.files.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentUploadDialog;
