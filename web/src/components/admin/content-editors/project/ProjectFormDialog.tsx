
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Save } from 'lucide-react';
import { Project } from '@/types/payload-types';
import { toast } from 'sonner';

interface ProjectFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  project: Project | null;
  onSave: (formData: FormData) => void;
  isSaving: boolean;
}

const ProjectFormDialog: React.FC<ProjectFormDialogProps> = ({ isOpen, setIsOpen, project, onSave, isSaving }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (project?.image_url) {
      setPreviewUrl(project.image_url);
    } else {
      setPreviewUrl(null);
    }
    setImageFile(null);
  }, [project, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (project?.id) {
      formData.append('id', project.id);
    }

    if (imageFile) {
      formData.append('image', imageFile);
    } else if (!project) {
      toast.error("Image is required for a new project.");
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'Add New Project'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={project?.title || ''} required />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <select id="category" name="category" defaultValue={project?.category || 'Residential'} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Industrial">Industrial</option>
                </select>
              </div>
              <div>
                <Label htmlFor="client">Client</Label>
                <Input id="client" name="client" defaultValue={project?.client || ''} />
              </div>
              <div>
                <Label htmlFor="completionDate">Completion Date</Label>
                <Input id="completionDate" name="completionDate" type="date" defaultValue={project?.completionDate || ''} />
              </div>
            </div>
            <div>
              <Label>Project Image</Label>
              <div className="mt-2 aspect-video w-full border rounded-md flex items-center justify-center bg-muted/20">
                <img src={previewUrl || '/placeholder.svg'} alt="Project preview" className="w-full h-full object-cover rounded-md" />
              </div>
              <div className="flex items-center gap-3 mt-3">
                <Label htmlFor="project-image-upload" className="cursor-pointer bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-md flex items-center gap-2">
                  <Upload size={16} />
                  <span>{imageFile ? 'Image Selected' : 'Change Image'}</span>
                </Label>
                <Input id="project-image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                {imageFile && <span className="text-sm text-green-600 truncate">{imageFile.name}</span>}
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={project?.description || ''} rows={4} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectFormDialog;
