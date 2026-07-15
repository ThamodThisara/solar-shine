import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Upload, UploadCloud, X, FileText, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatFileSize } from '@/lib/utils';
import { ALLOWED_FILE_EXTENSIONS, isAllowedFile } from '@/lib/documentTypes';
import { Department, DocumentVisibility, DocumentType } from '@/types/payload-types';
import { UploadDocumentsInput } from '@/services/documentService';
import {
  getTypeGroupLabel,
  getTypeOwnerDepartment,
  typeServesDepartment,
} from '@/services/documentTypeService';
import { useAuth } from '@/contexts/AuthContext';

interface ProjectOption {
  $id: string;
  name: string;
  client: string;
  project_code?: string;
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
  const { role, isAdmin } = useAuth();
  const [state, setState] = useState(initialState);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen]);

  const allowedTypes = React.useMemo(() => {
    if (isAdmin) return documentTypes;
    const userDept = role === 'sales_manager' ? 'sales' : role === 'hr' ? 'hr' : 'engineer';
    return documentTypes.filter((dt) => typeServesDepartment(dt, userDept));
  }, [documentTypes, role, isAdmin]);

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
    const selectedType = documentTypes.find((dt) => dt.$id === state.documentTypeId);
    // A document carries a single owning department, so one can only be derived
    // when the type maps to exactly one. Types spanning several departments (or
    // "all") are ambiguous and leave it unset, as "all" always has.
    const derivedDept = getTypeOwnerDepartment(selectedType) ?? undefined;

    onUpload({
      files: state.files,
      projectId: state.projectId,
      visibility: state.visibility as DocumentVisibility,
      department: state.visibility === 'internal' ? (derivedDept as Department) : undefined,
      documentTypeId: state.documentTypeId,
      uploadedBy,
    });
  };

  const isFormValid =
    !!state.projectId &&
    !!state.visibility &&
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
              options={projects.map((p) => ({ value: p.$id, label: `${p.project_code || p.name} — ${p.client}`, keywords: `${p.project_code || ''} ${p.name || ''} ${p.client}` }))}
            />
          </div>

          <div>
            <Label>Document Visibility</Label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              {(['internal', 'client_facing'] as DocumentVisibility[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setState((s) => ({ ...s, visibility: v }))}
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
              options={allowedTypes.map((dt) => ({
                value: dt.$id,
                label: `${dt.name} (${dt.type})`,
                keywords: dt.type,
                group: getTypeGroupLabel(dt),
              }))}
            />
          </div>

          <div>
            <Label>Files</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-md py-6 cursor-pointer transition-colors text-center px-4",
                  isDragging ? "border-primary bg-primary/5" : "hover:bg-accent/50"
                )}
              >
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground font-semibold">Select File(s)</span>
                <span className="text-xs text-muted-foreground">{ALLOWED_FILE_EXTENSIONS.join(', ')}</span>
              </div>

              <div
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-md py-6 cursor-pointer hover:bg-accent/50 transition-colors text-center px-4"
              >
                <Camera className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground font-semibold">Take Photo (Camera)</span>
                <span className="text-xs text-muted-foreground">Mobile Camera Capture</span>
              </div>
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
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
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
