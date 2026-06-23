import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Target, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchSpecializedAreas, addSpecializedArea, updateSpecializedArea, deleteSpecializedArea } from '@/services/specializedAreaService';
import { SpecializedArea } from '@/types/payload-types';

export const SpecializedAreasManager: React.FC = () => {
  const [specializedAreas, setSpecializedAreas] = useState<SpecializedArea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<SpecializedArea | null>(null);
  const [newArea, setNewArea] = useState<SpecializedArea>({
    title: '',
    description: '',
    image: '',
    order: 1
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string>('');

  // Function to get proper image URL for display
  const getImageUrl = (imageId: string | null) => {
    if (!imageId) return '/placeholder.svg';

    // If it's already a full URL, return it
    if (imageId.startsWith('http')) return imageId;

    // If it's an Appwrite file ID, construct the URL
    const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
    const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '685bcfb7001103824569';
    const bucketId = import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_ID || '6873ba8f00060c027d7c';

    return `${endpoint}/storage/buckets/${bucketId}/files/${imageId}/view?project=${projectId}`;
  };

  useEffect(() => {
    loadSpecializedAreas();
  }, []);

  const loadSpecializedAreas = async () => {
    setIsLoading(true);
    try {
      const areas = await fetchSpecializedAreas();
      setSpecializedAreas(areas);
      toast.success('Specialized areas loaded successfully');
    } catch (error) {
      console.error('Error loading specialized areas:', error);
      toast.error('Failed to load specialized areas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddArea = async () => {
    if (!newArea.title.trim() || !newArea.description.trim()) {
      toast.error('Title and description are required');
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', newArea.title);
      formData.append('description', newArea.description);
      formData.append('order', newArea.order.toString());
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const success = await addSpecializedArea(formData);
      if (success) {
        await loadSpecializedAreas(); // Reload the data
        setNewArea({
          title: '',
          description: '',
          image: '',
          order: 1
        });
        setImageFile(null);
        setPreviewImage('');
        setIsAddDialogOpen(false);
        toast.success('Specialized area added successfully');
      } else {
        toast.error('Failed to add specialized area');
      }
    } catch (error) {
      console.error('Error adding specialized area:', error);
      toast.error('Failed to add specialized area');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditArea = async () => {
    if (!editingArea || !editingArea.title.trim() || !editingArea.description.trim()) {
      toast.error('Title and description are required');
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('id', editingArea.$id!);
      formData.append('title', editingArea.title);
      formData.append('description', editingArea.description);
      formData.append('order', (editingArea.order || 1).toString());
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const success = await updateSpecializedArea(formData);
      if (success) {
        await loadSpecializedAreas(); // Reload the data
        setEditingArea(null);
        setIsEditDialogOpen(false);
        setImageFile(null);
        setPreviewImage('');
        toast.success('Specialized area updated successfully');
      } else {
        toast.error('Failed to update specialized area');
      }
    } catch (error) {
      console.error('Error updating specialized area:', error);
      toast.error('Failed to update specialized area');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteArea = async (id: string) => {
    setIsSaving(true);
    try {
      const success = await deleteSpecializedArea(id);
      if (success) {
        await loadSpecializedAreas(); // Reload the data
        toast.success('Specialized area deleted successfully');
      } else {
        toast.error('Failed to delete specialized area');
      }
    } catch (error) {
      console.error('Error deleting specialized area:', error);
      toast.error('Failed to delete specialized area');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openEditDialog = (area: SpecializedArea) => {
    setEditingArea({ ...area });
    setImageFile(null);
    setPreviewImage('');
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading specialized areas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6" />
            Specialized Areas Manager
          </h2>
          <p className="text-muted-foreground">
            Manage your company's specialized service areas
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Specialized Area
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-h-[85vh]">
            <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
              <DialogTitle>Add Specialized Area</DialogTitle>
              <DialogDescription>
                Add a new specialized service area
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label htmlFor="new-title">Title *</Label>
                <Input
                  id="new-title"
                  value={newArea.title}
                  onChange={(e) => setNewArea({ ...newArea, title: e.target.value })}
                  placeholder="Residential Solar"
                  maxLength={100}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-description">Description *</Label>
                <Textarea
                  id="new-description"
                  value={newArea.description}
                  onChange={(e) => setNewArea({ ...newArea, description: e.target.value })}
                  placeholder="Describe this specialized area..."
                  rows={4}
                  maxLength={500}
                  className="w-full resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-order">Order *</Label>
                <Input
                  id="new-order"
                  type="number"
                  value={newArea.order}
                  onChange={(e) => setNewArea({ ...newArea, order: parseInt(e.target.value) || 1 })}
                  placeholder="1"
                  min="1"
                  max="100"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-image">Image</Label>
                <Input
                  id="new-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="cursor-pointer w-full"
                />
              </div>
              {previewImage && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="sticky bottom-0 bg-background border-t pt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddArea} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Area'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:gap-6">
        {specializedAreas.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No specialized areas found. Add your first specialized area to get started.
            </CardContent>
          </Card>
        ) : (
          specializedAreas.map((area) => (
            <Card key={area.$id} className="overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  <div className="flex-shrink-0 mx-auto sm:mx-0">
                    <img
                      src={getImageUrl(area.image)}
                      alt={area.title}
                      className="w-full sm:w-32 h-48 sm:h-32 object-cover rounded-lg shadow-sm"
                      onError={(e) => {
                        // Fallback to placeholder if loading fails
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-3 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="text-lg sm:text-xl font-semibold">{area.title}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">Order: {area.order || 1}</p>
                      </div>
                      <div className="flex justify-center sm:justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(area)}
                          className="flex-1 sm:flex-none h-9 sm:h-8"
                        >
                          <Edit className="h-4 w-4 mr-2 sm:mr-0" />
                          <span className="sm:hidden">Edit</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="flex-1 sm:flex-none h-9 sm:h-8">
                              <Trash2 className="h-4 w-4 mr-2 sm:mr-0" />
                              <span className="sm:hidden">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Specialized Area</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{area.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteArea(area.$id!)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">{area.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-h-[85vh]">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle>Edit Specialized Area</DialogTitle>
            <DialogDescription>
              Update the specialized area details
            </DialogDescription>
          </DialogHeader>
          {editingArea && (
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={editingArea.title}
                  onChange={(e) => setEditingArea({ ...editingArea, title: e.target.value })}
                  placeholder="Residential Solar"
                  maxLength={100}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description *</Label>
                <Textarea
                  id="edit-description"
                  value={editingArea.description}
                  onChange={(e) => setEditingArea({ ...editingArea, description: e.target.value })}
                  placeholder="Describe this specialized area..."
                  rows={4}
                  maxLength={500}
                  className="w-full resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-order">Order *</Label>
                <Input
                  id="edit-order"
                  type="number"
                  value={editingArea.order || 1}
                  onChange={(e) => setEditingArea({ ...editingArea, order: parseInt(e.target.value) || 1 })}
                  placeholder="1"
                  min="1"
                  max="100"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Current Image</Label>
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={getImageUrl(editingArea.image)}
                    alt={editingArea.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      // Fallback to placeholder if loading fails
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder.svg';
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-image">Update Image (Optional)</Label>
                <Input
                  id="edit-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="cursor-pointer w-full"
                />
              </div>
              {previewImage && (
                <div className="space-y-2">
                  <Label>New Image Preview</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="sticky bottom-0 bg-background border-t pt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditArea} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Area'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
