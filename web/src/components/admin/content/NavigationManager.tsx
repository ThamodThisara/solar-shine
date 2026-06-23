import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Navigation, ArrowUp, ArrowDown, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchNavigationItems, updateNavigationItem, addNavigationItem, deleteNavigationItem } from '@/services/navigationService';
import { NavigationItem } from '@/types/payload-types';

export const NavigationManager: React.FC = () => {
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NavigationItem | null>(null);
  const [newItem, setNewItem] = useState({ title: '', path: '' });

  useEffect(() => {
    loadNavigationItems();
  }, []);

  const loadNavigationItems = async () => {
    setIsLoading(true);
    try {
      const items = await fetchNavigationItems();
      setNavigationItems(items);
      toast.success('Navigation items loaded successfully');
    } catch (error) {
      console.error('Error loading navigation items:', error);
      toast.error('Failed to load navigation items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.title.trim() || !newItem.path.trim()) {
      toast.error('Title and path are required');
      return;
    }

    setIsSaving(true);
    try {
      const success = await addNavigationItem(newItem);
      if (success) {
        toast.success('Navigation item added successfully');
        setNewItem({ title: '', path: '' });
        setIsAddDialogOpen(false);
        loadNavigationItems();
      } else {
        toast.error('Failed to add navigation item');
      }
    } catch (error) {
      console.error('Error adding navigation item:', error);
      toast.error('Failed to add navigation item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditItem = async () => {
    if (!editingItem || !editingItem.title.trim() || !editingItem.path.trim()) {
      toast.error('Title and path are required');
      return;
    }

    setIsSaving(true);
    try {
      const success = await updateNavigationItem(editingItem);
      if (success) {
        toast.success('Navigation item updated successfully');
        setEditingItem(null);
        setIsEditDialogOpen(false);
        loadNavigationItems();
      } else {
        toast.error('Failed to update navigation item');
      }
    } catch (error) {
      console.error('Error updating navigation item:', error);
      toast.error('Failed to update navigation item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setIsSaving(true);
    try {
      const success = await deleteNavigationItem(id);
      if (success) {
        toast.success('Navigation item deleted successfully');
        loadNavigationItems();
      } else {
        toast.error('Failed to delete navigation item');
      }
    } catch (error) {
      console.error('Error deleting navigation item:', error);
      toast.error('Failed to delete navigation item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveItem = async (index: number, direction: 'up' | 'down') => {
    const newItems = [...navigationItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    // Swap items
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    
    // Update order values
    newItems.forEach((item, i) => {
      item.order = i + 1;
    });

    setNavigationItems(newItems);

    // Update in database
    try {
      await Promise.all(newItems.map(item => updateNavigationItem(item)));
      toast.success('Navigation order updated');
    } catch (error) {
      console.error('Error updating navigation order:', error);
      toast.error('Failed to update navigation order');
      loadNavigationItems(); // Reload to revert changes
    }
  };

  const openEditDialog = (item: NavigationItem) => {
    setEditingItem({ ...item });
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading navigation items...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Navigation className="h-6 w-6" />
            Navigation Manager
          </h2>
          <p className="text-muted-foreground">
            Manage header and footer navigation items
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Navigation Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Navigation Item</DialogTitle>
              <DialogDescription>
                Create a new navigation item for your website
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-title">Title</Label>
                <Input
                  id="new-title"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="Home"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-path">Path</Label>
                <Input
                  id="new-path"
                  value={newItem.path}
                  onChange={(e) => setNewItem({ ...newItem, path: e.target.value })}
                  placeholder="/"
                  maxLength={255}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddItem} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Item'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Navigation Items</CardTitle>
          <CardDescription>
            Manage the order and content of navigation items. Items are displayed in the order shown below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {navigationItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No navigation items found. Add your first navigation item to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {navigationItems.map((item, index) => (
                  <TableRow key={item.$id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline">{item.order}</Badge>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveItem(index, 'up')}
                            disabled={index === 0}
                            className="h-6 w-6 p-0"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveItem(index, 'down')}
                            disabled={index === navigationItems.length - 1}
                            className="h-6 w-6 p-0"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell className="font-mono text-sm">{item.path}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={item.path} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Navigation Item</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{item.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteItem(item.$id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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
            <DialogTitle>Edit Navigation Item</DialogTitle>
            <DialogDescription>
              Update the navigation item details
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  placeholder="Home"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-path">Path</Label>
                <Input
                  id="edit-path"
                  value={editingItem.path}
                  onChange={(e) => setEditingItem({ ...editingItem, path: e.target.value })}
                  placeholder="/"
                  maxLength={255}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditItem} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Item'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
