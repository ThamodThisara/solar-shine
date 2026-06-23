import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Save, Trash2, Edit, X } from 'lucide-react';
import { fetchNavigationItems, updateNavigationItem, deleteNavigationItem, addNavigationItem } from '@/services/navigationService';

interface NavItem {
  id: string;
  title: string;
  path: string;
  order: number;
}

const NavbarEditor: React.FC = () => {
  const queryClient = useQueryClient();
  const [newItem, setNewItem] = useState({ title: '', path: '' });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editedItem, setEditedItem] = useState<NavItem | null>(null);

  const { data: navItems, isLoading } = useQuery<NavItem[]>({
    queryKey: ['navigationItems'],
    queryFn: fetchNavigationItems,
  });

  const updateMutation = useMutation({
    mutationFn: updateNavigationItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['navigationItems'] });
      toast.success('Navigation item updated');
      setEditingItemId(null);
      setEditedItem(null);
    },
    onError: () => toast.error('Failed to update navigation item'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNavigationItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['navigationItems'] });
      toast.success('Navigation item deleted');
    },
    onError: () => toast.error('Failed to delete navigation item')
  });

  const addMutation = useMutation({
    mutationFn: addNavigationItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['navigationItems'] });
      setNewItem({ title: '', path: '' });
      toast.success('Navigation item added');
    },
    onError: () => toast.error('Failed to add navigation item')
  });

  const handleEditClick = (item: NavItem) => {
    setEditingItemId(item.id);
    setEditedItem({ ...item });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditedItem(null);
  };

  const handleSaveClick = () => {
    if (editedItem) {
      if (!editedItem.title || !editedItem.path) {
        toast.error("Title and Path cannot be empty.");
        return;
      }
      updateMutation.mutate(editedItem);
    }
  };

  const handleInputChange = (field: 'title' | 'path', value: string) => {
    if (editedItem) {
      setEditedItem({ ...editedItem, [field]: value });
    }
  };

  const handleDeleteItem = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleAddItem = () => {
    if (!newItem.title || !newItem.path) {
      toast.error('Please fill all fields');
      return;
    }
    
    addMutation.mutate(newItem);
  };

  if (isLoading) {
    return <div className="flex justify-center p-6">Loading navigation items...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Navigation Menu Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {navItems?.map((item: NavItem) => (
              <div key={item.id} className="flex flex-col md:flex-row gap-4 p-4 border rounded-md items-center">
                {editingItemId === item.id && editedItem ? (
                  <>
                    <div className="flex-1">
                      <Label htmlFor={`title-${item.id}`}>Title</Label>
                      <Input
                        id={`title-${item.id}`}
                        value={editedItem.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`path-${item.id}`}>URL Path</Label>
                      <Input
                        id={`path-${item.id}`}
                        value={editedItem.path}
                        onChange={(e) => handleInputChange('path', e.target.value)}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Button variant="default" size="icon" onClick={handleSaveClick}>
                        <Save size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={handleCancelEdit}>
                        <X size={16} />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Title</p>
                      <p className="font-medium">{item.title}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">URL Path</p>
                      <p>{item.path}</p>
                    </div>
                    <div className="flex items-end gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEditClick(item)}>
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}

            <div className="mt-6 border-t pt-4">
              <h3 className="font-medium mb-2">Add New Navigation Item</h3>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="new-title">Title</Label>
                  <Input
                    id="new-title"
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    placeholder="Home"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="new-path">URL Path</Label>
                  <Input
                    id="new-path"
                    value={newItem.path}
                    onChange={(e) => setNewItem({ ...newItem, path: e.target.value })}
                    placeholder="/home"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="default"
                    onClick={handleAddItem}
                    className="flex gap-2"
                  >
                    <Plus size={16} />
                    Add Item
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NavbarEditor;
