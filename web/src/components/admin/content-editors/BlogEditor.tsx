
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, Search, Image, Calendar, User, FileText, ExternalLink, AlertCircle } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogClose 
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  createBlogPost, 
  updateBlogPost, 
  deleteBlogPost, 
  fetchBlogPosts 
} from '@/services/cmsService';
import { BlogPost } from '@/types/payload-types';

const BlogEditor: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch blog posts
  const { 
    data: blogPosts = [], 
    isLoading, 
    error 
  } = useQuery<BlogPost[]>({
    queryKey: ['blogPosts'],
    queryFn: fetchBlogPosts
  });
  
  // Create blog post mutation
  const createMutation = useMutation({
    mutationFn: (formData: FormData) => createBlogPost(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogPosts'] });
      setIsAddDialogOpen(false);
      toast.success('Blog post created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create blog post');
      console.error('Error creating blog post:', error);
    }
  });
  
  // Update blog post mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) => 
      updateBlogPost(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogPosts'] });
      setIsEditDialogOpen(false);
      toast.success('Blog post updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update blog post');
      console.error('Error updating blog post:', error);
    }
  });
  
  // Delete blog post mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBlogPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogPosts'] });
      setIsDeleteDialogOpen(false);
      toast.success('Blog post deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete blog post');
      console.error('Error deleting blog post:', error);
    }
  });
  
  // Handle form submission for creating a new blog post
  const handleAddPost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      await createMutation.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle form submission for updating a blog post
  const handleUpdatePost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      formData.append('originalTitle', selectedPost?.title || '');
      
      if (selectedPost?.id) {
        await updateMutation.mutateAsync({ id: selectedPost.id, formData });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle delete blog post
  const handleDeletePost = async () => {
    if (selectedPost?.id) {
      await deleteMutation.mutateAsync(selectedPost.id);
    }
  };
  
  // Filter blog posts based on search query
  const filteredPosts = blogPosts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return dateString;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">Blog Management</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Post
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Blog Posts</CardTitle>
          <CardDescription>Manage your blog posts</CardDescription>
          <div className="mt-4 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search blog posts..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6">Loading blog posts...</div>
          ) : error ? (
            <div className="text-center py-6 text-red-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              Failed to load blog posts
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="h-10 w-10 mx-auto mb-2 text-gray-400" />
              <p className="text-muted-foreground">No blog posts found</p>
              {searchQuery && (
                <Button 
                  variant="ghost" 
                  className="mt-2"
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableCaption>A list of all blog posts</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        {post.featured_image && (
                          <div className="h-8 w-8 mr-2 overflow-hidden rounded">
                            <img 
                              src={post.featured_image} 
                              alt={post.title} 
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <span className="line-clamp-1">{post.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>{post.author || 'Unknown'}</TableCell>
                    <TableCell>{formatDate(post.publishDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPost(post);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPost(post);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Add Blog Post Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Blog Post</DialogTitle>
            <DialogDescription>
              Create a new blog post. Fill in all the required fields.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAddPost}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Enter post title"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  name="author"
                  placeholder="Enter author name"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="publishDate">Publish Date</Label>
                <Input
                  id="publishDate"
                  name="publishDate"
                  type="date"
                  required
                  defaultValue={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  name="excerpt"
                  placeholder="Enter a short excerpt for the post"
                  required
                  rows={3}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  name="content"
                  placeholder="Enter post content"
                  required
                  rows={10}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="featured_image">Cover Image</Label>
                <Input
                  id="featured_image"
                  name="featured_image"
                  type="file"
                  accept="image/*"
                />
              </div>
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Post'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Blog Post Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Blog Post</DialogTitle>
            <DialogDescription>
              Update the blog post information.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPost && (
            <form onSubmit={handleUpdatePost}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    name="title"
                    defaultValue={selectedPost.title}
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-author">Author</Label>
                  <Input
                    id="edit-author"
                    name="author"
                    defaultValue={selectedPost.author || ''}
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-publishDate">Publish Date</Label>
                  <Input
                    id="edit-publishDate"
                    name="publishDate"
                    type="date"
                    required
                    defaultValue={selectedPost.publishDate ? format(new Date(selectedPost.publishDate), 'yyyy-MM-dd') : ''}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-excerpt">Excerpt</Label>
                  <Textarea
                    id="edit-excerpt"
                    name="excerpt"
                    defaultValue={selectedPost.excerpt || ''}
                    required
                    rows={3}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-content">Content</Label>
                  <Textarea
                    id="edit-content"
                    name="content"
                    defaultValue={selectedPost.content || ''}
                    required
                    rows={10}
                  />
                </div>
                
                {selectedPost.featured_image && (
                  <div className="mb-2">
                    <p className="text-sm font-medium mb-1">Current Cover Image:</p>
                    <div className="h-32 w-full overflow-hidden rounded border">
                      <img 
                        src={selectedPost.featured_image} 
                        alt="Cover" 
                        className="h-full w-full object-cover object-center"
                      />
                    </div>
                  </div>
                )}
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-featured_image">New Cover Image (optional)</Label>
                  <Input
                    id="edit-featured_image"
                    name="featured_image"
                    type="file"
                    accept="image/*"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Post'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the blog post
              "{selectedPost?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePost}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlogEditor;
