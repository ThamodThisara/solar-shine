import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, Edit, Trash2, Save, Calendar, Building, Image, Star } from 'lucide-react';
import { databases, storage } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';

interface Project {
  $id?: string;
  title: string;
  description: string;
  image_url: string;
  category: string;
  completion_date: string; // ISO date string
  featured: boolean;
}

export const ProjectsManager: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    category: '',
    completion_date: '',
    featured: false
  });

  const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
  const collectionId = 'projects';
  const bucketId = import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_ID;

  useEffect(() => {
    loadProjects();
  }, []);

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

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileId = ID.unique();
      const uploadedFile = await storage.createFile(bucketId, fileId, file);
      
      // Get the file URL
      const fileUrl = storage.getFileView(bucketId, uploadedFile.$id);
      
      setFormData(prev => ({
        ...prev,
        image_url: fileUrl.toString()
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
      category: project.category,
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
      category: '',
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  placeholder="e.g., Residential, Commercial, Industrial"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="completion_date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Completion Date
                </Label>
                <Input
                  id="completion_date"
                  type="date"
                  value={formData.completion_date}
                  onChange={(e) => handleInputChange('completion_date', e.target.value + 'T00:00:00.000Z')}
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
    </div>
  );
};
