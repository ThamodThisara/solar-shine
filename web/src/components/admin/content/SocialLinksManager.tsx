import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Globe, Save, Loader2, X } from 'lucide-react';
import { SocialLink } from '@/types/payload-types';
import { socialLinkService } from '@/services/appwriteService';

interface SocialLinkFormData {
    name: string;
    icon: string;
    url: string;
    order: number;
}

export const SocialLinksManager: React.FC = () => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingLink, setEditingLink] = useState<SocialLink | null>(null);
    const [formData, setFormData] = useState<SocialLinkFormData>({
        name: '',
        icon: '',
        url: '',
        order: 1
    });

    const queryClient = useQueryClient();

    // Fetch social links from database
    const { data: socialLinks = [], isLoading, error } = useQuery({
        queryKey: ['socialLinks'],
        queryFn: async () => {
            try {
                console.log('Fetching social links...');
                const result = await socialLinkService.getAll();
                console.log('Social links fetched:', result);
                // Sort by order field to ensure correct display sequence
                return result.sort((a, b) => (a.order || 1) - (b.order || 1));
            } catch (error) {
                console.error('Error fetching social links:', error);
                throw error;
            }
        },
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: Omit<SocialLink, '$id'>) => socialLinkService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['socialLinks'] });
            toast.success('Social link added successfully!');
            handleCancel();
        },
        onError: (error) => {
            console.error('Error creating social link:', error);
            toast.error('Failed to add social link. Please try again.');
        }
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<SocialLink> }) =>
            socialLinkService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['socialLinks'] });
            toast.success('Social link updated successfully!');
            handleCancel();
        },
        onError: (error) => {
            console.error('Error updating social link:', error);
            toast.error('Failed to update social link. Please try again.');
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => socialLinkService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['socialLinks'] });
            toast.success('Social link deleted successfully!');
        },
        onError: (error) => {
            console.error('Error deleting social link:', error);
            toast.error('Failed to delete social link. Please try again.');
        }
    });

    const handleAddLink = async () => {
        if (!formData.name || !formData.icon || !formData.url) {
            toast.error('Please fill in all fields');
            return;
        }

        try {
            await createMutation.mutateAsync({
                name: formData.name,
                icon: formData.icon,
                url: formData.url,
                order: formData.order
            });
        } catch (error) {
            // Error is handled by the mutation
        }
    };

    const handleEditLink = async () => {
        if (!editingLink || !formData.name || !formData.icon || !formData.url) {
            toast.error('Please fill in all fields');
            return;
        }

        try {
            await updateMutation.mutateAsync({
                id: editingLink.$id,
                data: {
                    name: formData.name,
                    icon: formData.icon,
                    url: formData.url,
                    order: formData.order
                }
            });
        } catch (error) {
            // Error is handled by the mutation
        }
    };

    const handleDeleteLink = async (id: string) => {
        if (confirm('Are you sure you want to delete this social link?')) {
            try {
                await deleteMutation.mutateAsync(id);
            } catch (error) {
                // Error is handled by the mutation
            }
        }
    };

    const handleEdit = (link: SocialLink) => {
        setEditingLink(link);
        setFormData({
            name: link.name,
            icon: link.icon,
            url: link.url,
            order: link.order || 1
        });
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingLink(null);
        setFormData({ name: '', icon: '', url: '', order: 1 });
    };

    const getIconComponent = (iconName: string) => {
        const iconMap: { [key: string]: string } = {
            facebook: '📘',
            twitter: '🐦',
            linkedin: '💼',
            instagram: '📷',
            youtube: '📺',
            tiktok: '🎵',
            pinterest: '📌',
            snapchat: '👻'
        };
        return iconMap[iconName] || '🔗';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading social links...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="text-red-600 mb-4">Error loading social links</div>
                <div className="text-sm text-gray-600 mb-4">
                    {error instanceof Error ? error.message : 'Unknown error occurred'}
                </div>
                <div className="space-y-2">
                    <Button onClick={() => window.location.reload()}>Retry</Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            console.log('Current error:', error);
                            console.log('Environment variables:', {
                                endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT,
                                projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID,
                                databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
                                storageBucketId: import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_ID
                            });
                        }}
                    >
                        Debug Info
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Social Media Links</h2>
                    <p className="text-gray-600">Manage your social media profiles and external links</p>
                </div>
                <Dialog open={isAdding} onOpenChange={setIsAdding}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Social Link
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Social Media Link</DialogTitle>
                            <DialogDescription>
                                Add a new social media profile or external link
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Platform Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Facebook, LinkedIn, etc."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="icon">Icon Identifier</Label>
                                <Input
                                    id="icon"
                                    value={formData.icon}
                                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                                    placeholder="facebook, linkedin, twitter"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="url">Profile URL</Label>
                                <Input
                                    id="url"
                                    value={formData.url}
                                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                                    placeholder="https://facebook.com/yourpage"
                                    type="url"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="order">Display Order</Label>
                                <Input
                                    id="order"
                                    value={formData.order}
                                    onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                                    placeholder="1"
                                    type="number"
                                    min="1"
                                    className="w-24"
                                />
                                <p className="text-xs text-gray-500">Lower numbers appear first</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAddLink}
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4 mr-2" />
                                )}
                                {createMutation.isPending ? 'Adding...' : 'Add Link'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Social Links Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {socialLinks.map((link) => (
                    <Card key={link.$id} className="relative group">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <span className="text-2xl">{getIconComponent(link.icon)}</span>
                                    <CardTitle className="text-lg">{link.name}</CardTitle>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(link)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteLink(link.$id)}
                                        className="text-red-600 hover:text-red-700"
                                        disabled={deleteMutation.isPending}
                                    >
                                        {deleteMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Badge variant="secondary" className="text-xs">
                                        Order: {link.order || 1}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                        {link.icon}
                                    </Badge>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Globe className="h-4 w-4 text-gray-500" />
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 text-sm truncate"
                                    >
                                        {link.url}
                                    </a>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Empty State */}
            {socialLinks.length === 0 && (
                <Card className="text-center py-12">
                    <CardContent>
                        <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No social links yet</h3>
                        <p className="text-gray-600 mb-4">
                            Add your social media profiles to help customers connect with you
                        </p>
                        <Button onClick={() => setIsAdding(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Link
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Edit Dialog */}
            <Dialog open={!!editingLink} onOpenChange={() => setEditingLink(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Social Media Link</DialogTitle>
                        <DialogDescription>
                            Update the details for this social media link
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Platform Name</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Facebook, LinkedIn, etc."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-icon">Icon Identifier</Label>
                            <Input
                                id="edit-icon"
                                value={formData.icon}
                                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                                placeholder="facebook, linkedin, twitter"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-url">Profile URL</Label>
                            <Input
                                id="edit-url"
                                value={formData.url}
                                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                                placeholder="https://facebook.com/yourpage"
                                type="url"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-order">Display Order</Label>
                            <Input
                                id="edit-order"
                                value={formData.order}
                                onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                                placeholder="1"
                                type="number"
                                min="1"
                                className="w-24"
                            />
                            <p className="text-xs text-gray-500">Lower numbers appear first</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEditLink}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Help Section */}
            <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                    <CardTitle className="text-blue-900">💡 Tips for Social Media Links</CardTitle>
                </CardHeader>
                <CardContent className="text-blue-800">
                    <ul className="space-y-2 text-sm">
                        <li>• Use consistent naming for your social media platforms</li>
                        <li>• Ensure all URLs are complete and accessible</li>
                        <li>• Keep icon identifiers simple (e.g., "facebook", "linkedin")</li>
                        <li>• Set order numbers to control display sequence (1 = first, 2 = second, etc.)</li>
                        <li>• Test all links to make sure they work correctly</li>
                        <li>• Update links when you change social media handles</li>
                    </ul>
                </CardContent>
            </Card>

            {/* Sample Data Section */}
            {socialLinks.length === 0 && (
                <Card className="bg-yellow-50 border-yellow-200">
                    <CardHeader>
                        <CardTitle className="text-yellow-900">🚀 Quick Start</CardTitle>
                    </CardHeader>
                    <CardContent className="text-yellow-800">
                        <p className="mb-4">Need some sample data to get started?</p>
                        <Button
                            variant="outline"
                            onClick={async () => {
                                try {
                                    const sampleData = [
                                        { name: 'Facebook', icon: 'facebook', url: 'https://facebook.com/solarshine', order: 1 },
                                        { name: 'LinkedIn', icon: 'linkedin', url: 'https://linkedin.com/company/solarshine', order: 2 },
                                        { name: 'Twitter', icon: 'twitter', url: 'https://twitter.com/solarshine', order: 3 },
                                        { name: 'Instagram', icon: 'instagram', url: 'https://instagram.com/solarshine', order: 4 }
                                    ];

                                    for (const data of sampleData) {
                                        await createMutation.mutateAsync(data);
                                    }

                                    toast.success('Sample social links created successfully!');
                                } catch (error) {
                                    console.error('Error creating sample data:', error);
                                    toast.error('Failed to create sample data');
                                }
                            }}
                            disabled={createMutation.isPending}
                        >
                            {createMutation.isPending ? 'Creating...' : 'Create Sample Data'}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
