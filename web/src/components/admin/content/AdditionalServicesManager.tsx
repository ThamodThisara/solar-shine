import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, Edit, Trash2, Save, Wrench, ArrowUp, ArrowDown, X } from 'lucide-react';
import { AdditionalService } from '@/types/payload-types';
import {
    fetchAdditionalServices,
    addAdditionalService,
    updateAdditionalService,
    deleteAdditionalService
} from '@/services/additionalServiceService';

// Available icons for selection
const availableIcons = [
    { name: 'Sun', component: 'Sun', description: 'Solar/Energy' },
    { name: 'Battery', component: 'Battery', description: 'Storage' },
    { name: 'Wrench', component: 'Wrench', description: 'Maintenance' },
    { name: 'BarChart3', component: 'BarChart3', description: 'Monitoring' },
    { name: 'Zap', component: 'Zap', description: 'Power' },
    { name: 'Shield', component: 'Shield', description: 'Protection' },
    { name: 'Home', component: 'Home', description: 'Residential' },
    { name: 'Building', component: 'Building', description: 'Commercial' },
    { name: 'Factory', component: 'Factory', description: 'Industrial' },
    { name: 'Settings', component: 'Settings', description: 'Configuration' },
    { name: 'Tool', component: 'Tool', description: 'Tools' },
    { name: 'Lightbulb', component: 'Lightbulb', description: 'Ideas' },
    { name: 'CheckCircle', component: 'CheckCircle', description: 'Success' },
    { name: 'Star', component: 'Star', description: 'Featured' },
    { name: 'Heart', component: 'Heart', description: 'Care' }
];

export const AdditionalServicesManager: React.FC = () => {
    const [services, setServices] = useState<AdditionalService[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState<AdditionalService | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<AdditionalService>>({
        title: '',
        description: '',
        icon: 'Sun',
        order_index: 0
    });

    useEffect(() => {
        loadServices();
    }, []);

    const loadServices = async () => {
        try {
            setLoading(true);
            const servicesData = await fetchAdditionalServices();
            const sortedServices = servicesData.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            setServices(sortedServices);
        } catch (error) {
            console.error('Error loading additional services:', error);
            toast.error('Failed to load additional services');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.title?.trim()) {
            toast.error('Title is required');
            return;
        }

        if (!formData.icon) {
            toast.error('Icon is required');
            return;
        }

        setSaving(true);
        try {
            const serviceData = {
                title: formData.title.trim(),
                description: formData.description?.trim() || '',
                icon: formData.icon,
                order_index: formData.order_index || 0
            };

            if (editingService) {
                await updateAdditionalService({ $id: editingService.$id, ...serviceData });
                toast.success('Additional service updated successfully');
            } else {
                await addAdditionalService(serviceData);
                toast.success('Additional service created successfully');
            }

            await loadServices();
            resetForm();
            setIsDialogOpen(false);
        } catch (error) {
            console.error('Error saving additional service:', error);
            setTimeout(() => toast.error('Failed to save additional service'), 0);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (service: AdditionalService) => {
        setEditingService(service);
        setFormData({
            title: service.title,
            description: service.description || '',
            icon: service.icon,
            order_index: service.order_index || 0
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (serviceId: string) => {
        if (!window.confirm('Are you sure you want to delete this additional service?')) return;

        try {
            await deleteAdditionalService(serviceId);

            const deletedService = services.find(s => s.$id === serviceId);
            if (deletedService) {
                const servicesToUpdate = services
                    .filter(s => s.$id !== serviceId && (s.order_index || 0) > (deletedService.order_index || 0))
                    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

                for (let i = 0; i < servicesToUpdate.length; i++) {
                    const newOrderIndex = (deletedService.order_index || 0) + i;
                    await updateAdditionalService({
                        $id: servicesToUpdate[i].$id,
                        order_index: newOrderIndex
                    });
                }
            }

            toast.success('Additional service deleted successfully');
            await loadServices();
        } catch (error) {
            console.error('Error deleting additional service:', error);
            toast.error('Failed to delete additional service');
        }
    };

    const handleReorder = async (serviceId: string, direction: 'up' | 'down') => {
        const serviceIndex = services.findIndex(s => s.$id === serviceId);
        if (serviceIndex === -1) return;

        const serviceToMove = services[serviceIndex];
        const targetIndex = direction === 'up' ? serviceIndex - 1 : serviceIndex + 1;

        if (targetIndex < 0 || targetIndex >= services.length) return;

        try {
            const newServices = [...services];
            [newServices[serviceIndex], newServices[targetIndex]] = [newServices[targetIndex], newServices[serviceIndex]];

            const updates = newServices.map((service, index) => ({
                $id: service.$id,
                order_index: index
            }));

            for (const update of updates) {
                await updateAdditionalService(update);
            }

            await loadServices();
            toast.success('Service order updated');
        } catch (error) {
            console.error('Error reordering service:', error);
            toast.error('Failed to reorder service');
        }
    };

    const resetForm = () => {
        const maxOrderIndex = services.length > 0 ? Math.max(...services.map(s => s.order_index || 0)) : -1;

        setFormData({
            title: '',
            description: '',
            icon: 'Sun',
            order_index: maxOrderIndex + 1
        });
        setEditingService(null);
    };

    const handleInputChange = (field: keyof typeof formData, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const renderIconPreview = (iconName: string) => {
        const iconData = availableIcons.find(icon => icon.name === iconName);
        if (!iconData) return <div className="w-6 h-6 bg-gray-200 rounded" />;

        return (
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                {iconName.charAt(0)}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading additional services...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Wrench className="h-6 w-6" />
                        Additional Services
                    </h2>
                    <p className="text-muted-foreground">
                        Manage additional services displayed on the Services page
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Additional Service
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>
                                {editingService ? 'Edit Additional Service' : 'Add New Additional Service'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingService
                                    ? 'Update the additional service information below.'
                                    : 'Fill in the details for the new additional service.'
                                }
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => handleInputChange('title', e.target.value)}
                                    placeholder="Enter service title"
                                    maxLength={255}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    placeholder="Enter service description"
                                    maxLength={500}
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="icon">Icon *</Label>
                                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                                    {availableIcons.map((icon) => (
                                        <button
                                            key={icon.name}
                                            type="button"
                                            onClick={() => handleInputChange('icon', icon.name)}
                                            className={`p-2 rounded-md border text-left hover:bg-muted transition-colors ${formData.icon === icon.name ? 'border-primary bg-primary/10' : 'border-border'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                                                    {icon.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium">{icon.name}</div>
                                                    <div className="text-xs text-muted-foreground">{icon.description}</div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="order_index">Display Order</Label>
                                <Input
                                    id="order_index"
                                    type="number"
                                    value={formData.order_index}
                                    onChange={(e) => handleInputChange('order_index', parseInt(e.target.value) || 0)}
                                    placeholder="Enter display order"
                                    min={0}
                                />
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
                                        {editingService ? 'Update' : 'Create'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Additional Services</CardTitle>
                    <CardDescription>
                        {services.length} additional service{services.length !== 1 ? 's' : ''} configured
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Icon</TableHead>
                                    <TableHead className="w-[200px]">Title</TableHead>
                                    <TableHead className="w-[100px]">Order</TableHead>
                                    <TableHead className="w-[300px]">Description</TableHead>
                                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {services.map((service, index) => (
                                    <TableRow key={service.$id}>
                                        <TableCell>
                                            <div className="flex items-center justify-center">
                                                {renderIconPreview(service.icon)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium max-w-[200px]">
                                            <div className="truncate" title={service.title}>
                                                {service.title}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <Badge variant="outline">{service.order_index}</Badge>
                                                <div className="flex flex-col gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleReorder(service.$id!, 'up')}
                                                        disabled={index === 0}
                                                        className="h-6 w-6 p-0"
                                                    >
                                                        <ArrowUp className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleReorder(service.$id!, 'down')}
                                                        disabled={index === services.length - 1}
                                                        className="h-6 w-6 p-0"
                                                    >
                                                        <ArrowDown className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[300px]">
                                            <div className="truncate" title={service.description || ''}>
                                                {service.description || 'No description'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(service)}
                                                >
                                                    <Edit className="h-4 w-4 mr-1" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(service.$id)}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {services.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <Wrench className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p>No additional services added yet.</p>
                            <p>Click "Add Additional Service" to create your additional service offerings.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};