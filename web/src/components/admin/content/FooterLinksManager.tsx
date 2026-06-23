import React, { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Link, Save, FolderOpen } from 'lucide-react';
import { FooterLink } from '@/types/payload-types';

// Mock data for now - you'll need to implement the actual service
const mockFooterLinks: FooterLink[] = [
    { $id: '1', name: 'About Us', url: '/who-we-are', category: 'Company' },
    { $id: '2', name: 'Services', url: '/services', category: 'Company' },
    { $id: '3', name: 'Projects', url: '/projects', category: 'Company' },
    { $id: '4', name: 'Blog', url: '/blog', category: 'Content' },
    { $id: '5', name: 'Contact', url: '/contact', category: 'Support' },
    { $id: '6', name: 'Privacy Policy', url: '/privacy', category: 'Legal' },
    { $id: '7', name: 'Terms of Service', url: '/terms', category: 'Legal' },
];

interface FooterLinkFormData {
    name: string;
    url: string;
    category: string;
}

const linkCategories = [
    'Company',
    'Services',
    'Content',
    'Support',
    'Legal',
    'Resources',
    'Social'
];

export const FooterLinksManager: React.FC = () => {
    const [footerLinks, setFooterLinks] = useState<FooterLink[]>(mockFooterLinks);
    const [isAdding, setIsAdding] = useState(false);
    const [editingLink, setEditingLink] = useState<FooterLink | null>(null);
    const [formData, setFormData] = useState<FooterLinkFormData>({
        name: '',
        url: '',
        category: ''
    });

    const handleAddLink = () => {
        if (!formData.name || !formData.url || !formData.category) {
            toast.error('Please fill in all fields');
            return;
        }

        const newLink: FooterLink = {
            $id: Date.now().toString(),
            name: formData.name,
            url: formData.url,
            category: formData.category
        };

        setFooterLinks(prev => [...prev, newLink]);
        setFormData({ name: '', url: '', category: '' });
        setIsAdding(false);
        toast.success('Footer link added successfully!');
    };

    const handleEditLink = () => {
        if (!editingLink || !formData.name || !formData.url || !formData.category) {
            toast.error('Please fill in all fields');
            return;
        }

        const updatedLink: FooterLink = {
            ...editingLink,
            name: formData.name,
            url: formData.url,
            category: formData.category
        };

        setFooterLinks(prev => prev.map(link =>
            link.$id === editingLink.$id ? updatedLink : link
        ));

        setEditingLink(null);
        setFormData({ name: '', url: '', category: '' });
        toast.success('Footer link updated successfully!');
    };

    const handleDeleteLink = (id: string) => {
        setFooterLinks(prev => prev.filter(link => link.$id !== id));
        toast.success('Footer link deleted successfully!');
    };

    const handleEdit = (link: FooterLink) => {
        setEditingLink(link);
        setFormData({
            name: link.name,
            url: link.url,
            category: link.category
        });
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingLink(null);
        setFormData({ name: '', url: '', category: '' });
    };

    const getCategoryColor = (category: string) => {
        const colorMap: { [key: string]: string } = {
            'Company': 'bg-blue-100 text-blue-800',
            'Services': 'bg-green-100 text-green-800',
            'Content': 'bg-purple-100 text-purple-800',
            'Support': 'bg-orange-100 text-orange-800',
            'Legal': 'bg-red-100 text-red-800',
            'Resources': 'bg-indigo-100 text-indigo-800',
            'Social': 'bg-pink-100 text-pink-800'
        };
        return colorMap[category] || 'bg-gray-100 text-gray-800';
    };

    const groupedLinks = footerLinks.reduce((acc, link) => {
        if (!acc[link.category]) {
            acc[link.category] = [];
        }
        acc[link.category].push(link);
        return acc;
    }, {} as { [key: string]: FooterLink[] });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Footer Links</h2>
                    <p className="text-gray-600">Manage navigation links displayed in your website footer</p>
                </div>
                <Dialog open={isAdding} onOpenChange={setIsAdding}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Footer Link
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Footer Link</DialogTitle>
                            <DialogDescription>
                                Add a new navigation link to your website footer
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Link Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="About Us, Contact, etc."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="url">Link URL</Label>
                                <Input
                                    id="url"
                                    value={formData.url}
                                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                                    placeholder="/about, /contact, etc."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <select
                                    id="category"
                                    value={formData.category}
                                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select a category</option>
                                    {linkCategories.map(category => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button onClick={handleAddLink}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Link
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Footer Links by Category */}
            <div className="space-y-6">
                {Object.entries(groupedLinks).map(([category, links]) => (
                    <Card key={category}>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <FolderOpen className="h-5 w-5 mr-2" />
                                {category} Links
                                <Badge variant="secondary" className="ml-2">
                                    {links.length}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {links.map((link) => (
                                    <div key={link.$id} className="flex items-center justify-between p-3 border rounded-lg group hover:bg-gray-50">
                                        <div className="flex items-center space-x-3">
                                            <Link className="h-4 w-4 text-gray-500" />
                                            <div>
                                                <div className="font-medium text-gray-900">{link.name}</div>
                                                <div className="text-sm text-gray-600">{link.url}</div>
                                            </div>
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
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Empty State */}
            {footerLinks.length === 0 && (
                <Card className="text-center py-12">
                    <CardContent>
                        <Link className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No footer links yet</h3>
                        <p className="text-gray-600 mb-4">
                            Add navigation links to help visitors find important pages
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
                        <DialogTitle>Edit Footer Link</DialogTitle>
                        <DialogDescription>
                            Update the details for this footer link
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Link Name</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="About Us, Contact, etc."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-url">Link URL</Label>
                            <Input
                                id="edit-url"
                                value={formData.url}
                                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                                placeholder="/about, /contact, etc."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-category">Category</Label>
                            <select
                                id="edit-category"
                                value={formData.category}
                                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select a category</option>
                                {linkCategories.map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditLink}>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Help Section */}
            <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                    <CardTitle className="text-blue-900">💡 Tips for Footer Links</CardTitle>
                </CardHeader>
                <CardContent className="text-blue-800">
                    <ul className="space-y-2 text-sm">
                        <li>• Group related links into logical categories</li>
                        <li>• Use clear, descriptive names for each link</li>
                        <li>• Ensure all URLs are valid and accessible</li>
                        <li>• Keep the footer organized and easy to navigate</li>
                        <li>• Include important pages like Contact, About, and Legal</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
};
