import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, Edit, Trash2, Save, Calendar, Building, Image, Star, Settings, X, GripVertical } from 'lucide-react';
import { databases, storage, COLLECTIONS } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { fetchPageHeaders, updatePageHeaders, DEFAULT_PAGE_HEADERS } from '@/services/homeContentService';

interface Project {
  $id?: string;
  title: string;
  description: string;
  image_url: string;
  category: string;
  completion_date: string; // ISO date string
  featured: boolean;
}

interface Category {
  id: string;
  name: string;
  color: string;
  order: number;
}

export const ProjectsManager: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([
    { id: 'residential', name: 'Residential', color: 'bg-blue-100 text-blue-800', order: 1 },
    { id: 'commercial', name: 'Commercial', color: 'bg-green-100 text-green-800', order: 2 },
    { id: 'industrial', name: 'Industrial', color: 'bg-purple-100 text-purple-800', order: 3 },
  ]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    category: 'Residential',
    completion_date: '',
    featured: false
  });
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    color: 'bg-blue-100 text-blue-800'
  });
  const [pageHeader, setPageHeader] = useState({
    title: DEFAULT_PAGE_HEADERS.projects_page_title,
    description: DEFAULT_PAGE_HEADERS.projects_page_description,
  });
  const [savingHeader, setSavingHeader] = useState(false);

  const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const collectionId = COLLECTIONS.PORTFOLIO_PROJECTS;
  const bucketId = import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_ID;

  const colorOptions = [
    { value: 'bg-blue-100 text-blue-800', label: 'Blue' },
    { value: 'bg-green-100 text-green-800', label: 'Green' },
    { value: 'bg-purple-100 text-purple-800', label: 'Purple' },
    { value: 'bg-orange-100 text-orange-800', label: 'Orange' },
    { value: 'bg-red-100 text-red-800', label: 'Red' },
    { value: 'bg-yellow-100 text-yellow-800', label: 'Yellow' },
    { value: 'bg-pink-100 text-pink-800', label: 'Pink' },
    { value: 'bg-indigo-100 text-indigo-800', label: 'Indigo' },
  ];

  useEffect(() => {
    loadProjects();
    loadCategories();
    loadPageHeader();
  }, []);

  const loadPageHeader = async () => {
    try {
      const header = await fetchPageHeaders();
      setPageHeader({
        title: header.projects_page_title,
        description: header.projects_page_description,
      });
    } catch (error) {
      console.error('Error loading projects page header:', error);
    }
  };

  const handleSavePageHeader = async () => {
    setSavingHeader(true);
    try {
      const success = await updatePageHeaders({
        projects_page_title: pageHeader.title,
        projects_page_description: pageHeader.description,
      });
      if (success) {
        toast.success('Projects page header updated successfully');
      } else {
        toast.error('Failed to update projects page header');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setSavingHeader(false);
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        databaseId,
        collectionId,
        [Query.orderDesc('completion_date')]
      );

      const projectsData = response.documents.map(doc => ({
        $id: doc.$id,
        title: doc.title,
        description: doc.description,
        image_url: doc.image_url,
        category: doc.category,
        completion_date: doc.completion_date,
        featured: doc.featured
      }));

      setProjects(projectsData);
      toast.success('Projects loaded successfully');
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await databases.listDocuments(
        databaseId,
        'categories',
        [Query.orderAsc('order')]
      );

      if (response.documents.length > 0) {
        const categoriesData = response.documents.map(doc => ({
          id: doc.$id,
          name: doc.name,
          color: doc.color,
          order: doc.order
        }));
        setCategories(categoriesData);
      } else {
        // If no categories exist, create default ones
        await createDefaultCategories();
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // If categories collection doesn't exist, create default ones
      await createDefaultCategories();
    }
  };

  const createDefaultCategories = async () => {
    const defaultCategories = [
      { name: 'Residential', color: 'bg-blue-100 text-blue-800', order: 1 },
      { name: 'Commercial', color: 'bg-green-100 text-green-800', order: 2 },
      { name: 'Industrial', color: 'bg-purple-100 text-purple-800', order: 3 },
    ];

    try {
      for (const category of defaultCategories) {
        await databases.createDocument(
          databaseId,
          'categories',
          ID.unique(),
          category
        );
      }

      // Reload categories after creating defaults
      await loadCategories();
    } catch (error) {
      console.error('Error creating default categories:', error);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileId = ID.unique();
      const uploadedFile = await storage.createFile(bucketId, fileId, file);

      // Get the file URL - construct it properly
      const fileUrl = `${import.meta.env.VITE_APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${uploadedFile.$id}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID}`;

      setFormData(prev => ({
        ...prev,
        image_url: fileUrl
      }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!formData.category) {
      toast.error('Category is required');
      return;
    }

    // Validate category
    const validCategories = categories.map(cat => cat.name);
    if (!validCategories.includes(formData.category)) {
      toast.error('Invalid category selected');
      return;
    }

    setSaving(true);
    try {
      const projectData = {
        title: formData.title,
        description: formData.description,
        image_url: formData.image_url,
        category: formData.category,
        completion_date: formData.completion_date,
        featured: formData.featured
      };

      if (editingProject) {
        // Update existing project
        await databases.updateDocument(
          databaseId,
          collectionId,
          editingProject.$id!,
          projectData
        );
        toast.success('Project updated successfully');
      } else {
        // Create new project
        await databases.createDocument(
          databaseId,
          collectionId,
          ID.unique(),
          projectData
        );
        toast.success('Project created successfully');
      }

      await loadProjects();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description,
      image_url: project.image_url,
      category: project.category || 'Residential',
      completion_date: project.completion_date.split('T')[0], // Convert to date input format
      featured: project.featured
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (projectId: string) => {
    try {
      await databases.deleteDocument(databaseId, collectionId, projectId);
      toast.success('Project deleted successfully');
      await loadProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      category: 'Residential',
      completion_date: '',
      featured: false
    });
    setEditingProject(null);
  };

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    const isoString = dateValue ? new Date(dateValue).toISOString() : '';
    setFormData(prev => ({
      ...prev,
      completion_date: isoString
    }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Category Management Functions
  const handleAddCategory = async () => {
    if (!categoryFormData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const newCategory = {
        name: categoryFormData.name,
        color: categoryFormData.color,
        order: Math.max(...categories.map(cat => cat.order), 0) + 1 // Get the highest order number + 1
      };

      const response = await databases.createDocument(
        databaseId,
        'categories',
        ID.unique(),
        newCategory
      );

      const savedCategory: Category = {
        id: response.$id,
        name: response.name,
        color: response.color,
        order: response.order
      };

      setCategories(prev => [...prev, savedCategory]);
      setCategoryFormData({ name: '', color: 'bg-blue-100 text-blue-800' });
      setIsCategoryDialogOpen(false);
      toast.success('Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !categoryFormData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const updatedCategory = {
        name: categoryFormData.name,
        color: categoryFormData.color
      };

      await databases.updateDocument(
        databaseId,
        'categories',
        editingCategory.id,
        updatedCategory
      );

      setCategories(prev => prev.map(cat =>
        cat.id === editingCategory.id
          ? { ...cat, name: categoryFormData.name, color: categoryFormData.color }
          : cat
      ));

      setEditingCategory(null);
      setCategoryFormData({ name: '', color: 'bg-blue-100 text-blue-800' });
      setIsCategoryDialogOpen(false);
      toast.success('Category updated successfully');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    // Check if category is used by any projects
    const projectsUsingCategory = projects.filter(p => p.category === categories.find(c => c.id === categoryId)?.name);

    if (projectsUsingCategory.length > 0) {
      toast.error(`Cannot delete category. ${projectsUsingCategory.length} project(s) are using it.`);
      return;
    }

    try {
      await databases.deleteDocument(
        databaseId,
        'categories',
        categoryId
      );

      // Remove the category and reorder the remaining ones
      setCategories(prev => {
        const remainingCategories = prev.filter(cat => cat.id !== categoryId);

        // Reorder remaining categories starting from 1
        const reorderedCategories = remainingCategories.map((cat, index) => ({
          ...cat,
          order: index + 1
        }));

        // Update order numbers in database
        reorderedCategories.forEach(async (cat) => {
          try {
            await databases.updateDocument(
              databaseId,
              'categories',
              cat.id,
              { order: cat.order }
            );
          } catch (error) {
            console.error('Error updating category order after delete:', error);
          }
        });

        return reorderedCategories;
      });

      toast.success('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const openCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({ name: category.name, color: category.color });
    } else {
      setEditingCategory(null);
      setCategoryFormData({ name: '', color: 'bg-blue-100 text-blue-800' });
    }
    setIsCategoryDialogOpen(true);
  };

  const moveCategory = async (categoryId: string, direction: 'up' | 'down') => {
    setCategories(prev => {
      const currentIndex = prev.findIndex(cat => cat.id === categoryId);
      if (currentIndex === -1) return prev;

      const newCategories = [...prev];
      if (direction === 'up' && currentIndex > 0) {
        [newCategories[currentIndex], newCategories[currentIndex - 1]] =
          [newCategories[currentIndex - 1], newCategories[currentIndex]];
      } else if (direction === 'down' && currentIndex < newCategories.length - 1) {
        [newCategories[currentIndex], newCategories[currentIndex + 1]] =
          [newCategories[currentIndex + 1], newCategories[currentIndex]];
      }

      // Update order numbers starting from 1
      const updatedCategories = newCategories.map((cat, index) => ({ ...cat, order: index + 1 }));

      // Save new order to database
      updatedCategories.forEach(async (cat) => {
        try {
          await databases.updateDocument(
            databaseId,
            'categories',
            cat.id,
            { order: cat.order }
          );
        } catch (error) {
          console.error('Error updating category order:', error);
        }
      });

      return updatedCategories;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading projects...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building className="h-6 w-6" />
            Projects
          </h2>
          <p className="text-muted-foreground">
            Manage your completed solar installation projects
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingProject ? 'Edit Project' : 'Add New Project'}
              </DialogTitle>
              <DialogDescription>
                {editingProject
                  ? 'Update the project information below.'
                  : 'Fill in the details for the new project.'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter project title"
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter project description"
                  maxLength={1000}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleInputChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="completion_date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Completion Date
                </Label>
                <Input
                  id="completion_date"
                  type="date"
                  value={formData.completion_date ? formData.completion_date.split('T')[0] : ''}
                  onChange={handleDateChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image_url" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Image
                </Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => handleInputChange('image_url', e.target.value)}
                  placeholder="Enter image URL or upload below"
                  maxLength={255}
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleImageUpload(file);
                      };
                      input.click();
                    }}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Upload Image'
                    )}
                  </Button>
                </div>

                {/* Image Preview */}
                {formData.image_url && (
                  <div className="mt-2">
                    <Label>Image Preview</Label>
                    <div className="border rounded-lg overflow-hidden mt-1">
                      <img
                        src={formData.image_url}
                        alt="Project preview"
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                          console.error('Failed to load project image:', formData.image_url);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) => handleInputChange('featured', checked)}
                />
                <Label htmlFor="featured" className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Featured Project
                </Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {editingProject ? 'Update' : 'Create'}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Page Header Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Page Header
          </CardTitle>
          <CardDescription>
            The title and description shown at the top of the public Projects page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projects-header-title">Title</Label>
            <Input
              id="projects-header-title"
              value={pageHeader.title}
              onChange={(e) => setPageHeader(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Our Solar Projects"
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="projects-header-description">Description</Label>
            <Textarea
              id="projects-header-description"
              value={pageHeader.description}
              onChange={(e) => setPageHeader(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Explore our portfolio of successfully completed solar installations..."
              rows={3}
              maxLength={2000}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSavePageHeader} disabled={savingHeader} className="min-w-[120px]">
              {savingHeader ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Header
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Category Management
              </CardTitle>
              <CardDescription>
                Manage project categories and their display order
              </CardDescription>
            </div>
            <Button onClick={() => openCategoryDialog()} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categories.map((category, index) => (
              <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                  <Badge className={category.color}>
                    {category.name}
                  </Badge>
                  <span className="text-sm text-gray-500">Order: {category.order}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveCategory(category.id, 'up')}
                    disabled={index === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveCategory(category.id, 'down')}
                    disabled={index === categories.length - 1}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openCategoryDialog(category)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>
            {projects.length} project{projects.length !== 1 ? 's' : ''} in portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Completion Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.$id}>
                  <TableCell>
                    {project.image_url && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden border">
                        <img
                          src={project.image_url}
                          alt={project.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Failed to load project image:', project.image_url);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="max-w-sm">
                      <div className="font-medium">{project.title}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {project.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {project.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDate(project.completion_date)}
                  </TableCell>
                  <TableCell>
                    {project.featured && (
                      <Badge variant="default" className="flex items-center gap-1 w-fit">
                        <Star className="h-3 w-3" />
                        Featured
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(project)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(project.$id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {projects.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p>No projects added yet.</p>
              <p>Click "Add Project" to showcase your work.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update the category information below.'
                : 'Create a new category for your projects.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category Name *</Label>
              <Input
                id="categoryName"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter category name"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryColor">Color Theme</Label>
              <Select
                value={categoryFormData.color}
                onValueChange={(value) => setCategoryFormData(prev => ({ ...prev, color: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a color" />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${option.value.split(' ')[0]}`}></div>
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={editingCategory ? handleEditCategory : handleAddCategory}
              disabled={!categoryFormData.name.trim()}
            >
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
