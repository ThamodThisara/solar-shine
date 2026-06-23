
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Save } from 'lucide-react';
import { SpecializedArea } from '@/types/payload-types';
import { toast } from 'sonner';

interface SpecializedAreaFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  area: SpecializedArea | null;
  onSave: (formData: FormData) => void;
  isSaving: boolean;
}

const SpecializedAreaFormDialog: React.FC<SpecializedAreaFormDialogProps> = ({ isOpen, setIsOpen, area, onSave, isSaving }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (area?.image) {
      setPreviewUrl(area.image);
    } else {
      setPreviewUrl(null);
    }
    setImageFile(null);
  }, [area, isOpen]);

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
    if (area?.id) {
      formData.append('id', area.id);
    }
    
    if (imageFile) {
      formData.append('image', imageFile);
    } else if (!area) {
        toast.error("Image is required for a new area.");
        return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{area ? 'Edit Area' : 'Add New Area'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={area?.title || ''} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={area?.description || ''} rows={4} required />
          </div>
          <div>
            <Label>Image</Label>
            <div className="mt-2 aspect-video w-full border rounded-md flex items-center justify-center bg-muted/20">
              <img src={previewUrl || '/placeholder.svg'} alt="Area preview" className="w-full h-full object-cover rounded-md" />
            </div>
            <div className="flex items-center gap-3 mt-3">
              <Label htmlFor="area-image-upload" className="cursor-pointer bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-md flex items-center gap-2">
                <Upload size={16} />
                <span>{imageFile ? 'Image Selected' : 'Change Image'}</span>
              </Label>
              <Input id="area-image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              {imageFile && <span className="text-sm text-green-600 truncate">{imageFile.name}</span>}
            </div>
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

export default SpecializedAreaFormDialog;
