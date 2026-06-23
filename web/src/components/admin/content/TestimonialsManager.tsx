import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Users, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { fetchTestimonials, addTestimonial, updateTestimonial, deleteTestimonial } from '@/services/testimonialService';
import { Testimonial } from '@/types/payload-types';

export const TestimonialsManager: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [newTestimonial, setNewTestimonial] = useState<Omit<Testimonial, '$id'>>({
    text: '',
    author: '',
    position: '',
  });

  useEffect(() => {
    loadTestimonials();
  }, []);

  const loadTestimonials = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTestimonials();
      setTestimonials(data);
      toast.success('Testimonials loaded successfully');
    } catch (error) {
      console.error('Error loading testimonials:', error);
      toast.error('Failed to load testimonials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTestimonial = async () => {
    if (!newTestimonial.text.trim() || !newTestimonial.author.trim()) {
      toast.error('Text and author are required');
      return;
    }

    setIsSaving(true);
    try {
      await addTestimonial(newTestimonial);
      await loadTestimonials();
      setNewTestimonial({
        text: '',
        author: '',
        position: '',
      });
      setIsAddDialogOpen(false);
      toast.success('Testimonial added successfully');
    } catch (error) {
      console.error('Error adding testimonial:', error);
      toast.error('Failed to add testimonial');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditTestimonial = async () => {
    if (!editingTestimonial || !editingTestimonial.text.trim() || !editingTestimonial.author.trim()) {
      toast.error('Text and author are required');
      return;
    }

    setIsSaving(true);
    try {
      await updateTestimonial(editingTestimonial);
      await loadTestimonials();
      setEditingTestimonial(null);
      setIsEditDialogOpen(false);
      toast.success('Testimonial updated successfully');
    } catch (error) {
      console.error('Error updating testimonial:', error);
      toast.error('Failed to update testimonial');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTestimonial = async (id: string) => {
    setIsSaving(true);
    try {
      await deleteTestimonial(id);
      await loadTestimonials();
      toast.success('Testimonial deleted successfully');
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      toast.error('Failed to delete testimonial');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditDialog = (testimonial: Testimonial) => {
    setEditingTestimonial({ ...testimonial });
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading testimonials...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            Testimonials Manager
          </h2>
          <p className="text-muted-foreground">
            Manage customer testimonials and reviews
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Testimonial
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Testimonial</DialogTitle>
              <DialogDescription>
                Add a new customer testimonial
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-text">Testimonial Text *</Label>
                <Textarea
                  id="new-text"
                  value={newTestimonial.text}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, text: e.target.value })}
                  placeholder="Customer testimonial text..."
                  rows={4}
                  maxLength={500}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-author">Author *</Label>
                  <Input
                    id="new-author"
                    value={newTestimonial.author}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, author: e.target.value })}
                    placeholder="Customer name"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-position">Position</Label>
                  <Input
                    id="new-position"
                    value={newTestimonial.position}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, position: e.target.value })}
                    placeholder="Job title"
                    maxLength={100}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTestimonial} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Testimonial'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Testimonials</CardTitle>
          <CardDescription>
            Manage testimonials from your satisfied customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {testimonials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No testimonials found. Add your first testimonial to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Author</TableHead>
                  <TableHead>Testimonial</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testimonials.map((testimonial) => (
                  <TableRow key={testimonial.$id}>
                    <TableCell className="font-medium">{testimonial.author}</TableCell>
                    <TableCell>{testimonial.text}</TableCell>
                    <TableCell>{testimonial.position}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(testimonial)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the testimonial.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteTestimonial(testimonial.$id!)}>
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Testimonial</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-author">Author</Label>
              <Input id="edit-author" value={editingTestimonial?.author || ''} onChange={(e) => setEditingTestimonial(prev => prev ? { ...prev, author: e.target.value } : null)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-position">Position</Label>
              <Input id="edit-position" value={editingTestimonial?.position || ''} onChange={(e) => setEditingTestimonial(prev => prev ? { ...prev, position: e.target.value } : null)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-text">Testimonial</Label>
              <Textarea id="edit-text" value={editingTestimonial?.text || ''} onChange={(e) => setEditingTestimonial(prev => prev ? { ...prev, text: e.target.value } : null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditTestimonial} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
