import React, { useEffect, useRef, useState } from 'react';
import { Camera, FileText, Upload, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
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
import { cn, formatFileSize } from '@/lib/utils';
import { ALLOWED_FILE_EXTENSIONS, isAllowedFile } from '@/lib/documentTypes';

interface FolderUploadDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  folderName: string;
  onUpload: (files: File[]) => void;
  isUploading: boolean;
}

/**
 * Upload into a folder. Unlike project uploads there is no project, document
 * type, or visibility to pick — a folder document inherits the folder's access.
 */
export const FolderUploadDialog: React.FC<FolderUploadDialogProps> = ({
  isOpen,
  setIsOpen,
  folderName,
  onUpload,
  isUploading,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) setFiles([]);
  }, [isOpen]);

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
    setFiles((prev) => [...prev, ...accepted]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload to {folderName}</DialogTitle>
          <DialogDescription>
            Files uploaded here are visible to everyone who can open this folder.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Label>Files</Label>
          <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-md py-6 px-4 text-center cursor-pointer transition-colors',
                isDragging ? 'border-primary bg-primary/5' : 'hover:bg-accent/50',
              )}
            >
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground">Select File(s)</span>
              <span className="text-xs text-muted-foreground">{ALLOWED_FILE_EXTENSIONS.join(', ')}</span>
            </div>

            <div
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-md py-6 px-4 text-center cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <Camera className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground">Take Photo (Camera)</span>
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

          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 border rounded-md px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button disabled={files.length === 0 || isUploading} onClick={() => onUpload(files)}>
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? 'Uploading...' : `Upload ${files.length || ''} Document${files.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FolderUploadDialog;
