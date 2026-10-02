import React, { useEffect, useState } from 'react';
import { FolderPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CreateSubfolderDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  parentFolderName: string;
  onCreate: (name: string, description?: string) => void;
  isCreating: boolean;
}

/**
 * A lightweight dialog for naming a new subfolder. Permissions are inherited
 * from the parent automatically - there is nothing to configure here.
 */
export const CreateSubfolderDialog: React.FC<CreateSubfolderDialogProps> = ({
  isOpen,
  setIsOpen,
  parentFolderName,
  onCreate,
  isCreating,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
    }
  }, [isOpen]);

  const isValid = name.trim().length > 0;

  const handleSubmit = () => {
    if (!isValid) return;
    onCreate(name.trim(), description.trim() || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && !isCreating) handleSubmit();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            Create Subfolder
          </DialogTitle>
          <DialogDescription>
            Adding a subfolder inside <strong>{parentFolderName}</strong>. It will automatically
            inherit the same access permissions as its parent folder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2" onKeyDown={handleKeyDown}>
          <div className="space-y-1.5">
            <Label htmlFor="subfolder-name">Subfolder Name</Label>
            <Input
              id="subfolder-name"
              placeholder="e.g., Q1 Reports"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subfolder-description">Description (optional)</Label>
            <Textarea
              id="subfolder-description"
              placeholder="What belongs in this subfolder?"
              rows={2}
              className="min-h-10 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isCreating}>
            <FolderPlus className="mr-2 h-4 w-4" />
            {isCreating ? 'Creating...' : 'Create Subfolder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSubfolderDialog;
