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
import { Loader2, Plus, Edit, Trash2, Save, ArrowUp, ArrowDown, ListOrdered } from 'lucide-react';
import { ServiceProcessStep } from '@/types/payload-types';
import {
    fetchServiceProcessSteps,
    addServiceProcessStep,
    updateServiceProcessStep,
    deleteServiceProcessStep,
    reorderServiceProcessSteps
} from '@/services/serviceProcessService';

export const ServiceProcessManager: React.FC = () => {
    const [steps, setSteps] = useState<ServiceProcessStep[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingStep, setEditingStep] = useState<ServiceProcessStep | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<ServiceProcessStep>>({
        number: '',
        title: '',
        description: '',
        order_index: 0
    });

    useEffect(() => {
        loadSteps();
    }, []);

    const loadSteps = async () => {
        try {
            setLoading(true);
            const stepsData = await fetchServiceProcessSteps();
            const sortedSteps = stepsData.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            setSteps(sortedSteps);
        } catch (error) {
            console.error('Error loading service process steps:', error);
            toast.error('Failed to load service process steps');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.number?.trim()) {
            toast.error('Step number is required');
            return;
        }

        if (!formData.title?.trim()) {
            toast.error('Step title is required');
            return;
        }

        if (!formData.description?.trim()) {
            toast.error('Step description is required');
            return;
        }

        setSaving(true);
        try {
            const stepData = {
                number: formData.number.trim(),
                title: formData.title.trim(),
                description: formData.description.trim(),
                order_index: formData.order_index || 0
            };

            if (editingStep) {
                await updateServiceProcessStep({ $id: editingStep.$id, ...stepData });
                toast.success('Service process step updated successfully');
            } else {
                await addServiceProcessStep(stepData);
                toast.success('Service process step created successfully');
            }

            await loadSteps();
            resetForm();
            setIsDialogOpen(false);
        } catch (error) {
            console.error('Error saving service process step:', error);
            toast.error('Failed to save service process step');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (step: ServiceProcessStep) => {
        setEditingStep(step);
        setFormData({
            number: step.number,
            title: step.title,
            description: step.description,
            order_index: step.order_index || 0
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (stepId: string) => {
        if (!window.confirm('Are you sure you want to delete this service process step?')) return;

        try {
            await deleteServiceProcessStep(stepId);

            const deletedStep = steps.find(s => s.$id === stepId);
            if (deletedStep) {
                const stepsToUpdate = steps
                    .filter(s => s.$id !== stepId && (s.order_index || 0) > (deletedStep.order_index || 0))
                    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

                for (let i = 0; i < stepsToUpdate.length; i++) {
                    const newOrderIndex = (deletedStep.order_index || 0) + i;
                    await updateServiceProcessStep({
                        $id: stepsToUpdate[i].$id,
                        order_index: newOrderIndex
                    });
                }
            }

            toast.success('Service process step deleted successfully');
            await loadSteps();
        } catch (error) {
            console.error('Error deleting service process step:', error);
            toast.error('Failed to delete service process step');
        }
    };

    const handleReorder = async (stepId: string, direction: 'up' | 'down') => {
        const stepIndex = steps.findIndex(s => s.$id === stepId);
        if (stepIndex === -1) return;

        const stepToMove = steps[stepIndex];
        const targetIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;

        if (targetIndex < 0 || targetIndex >= steps.length) return;

        try {
            const newSteps = [...steps];
            [newSteps[stepIndex], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[stepIndex]];

            const updates = newSteps.map((step, index) => ({
                $id: step.$id,
                order_index: index
            }));

            for (const update of updates) {
                await updateServiceProcessStep(update);
            }

            await loadSteps();
            toast.success('Step order updated');
        } catch (error) {
            console.error('Error reordering step:', error);
            toast.error('Failed to reorder step');
        }
    };

    const resetForm = () => {
        const maxOrderIndex = steps.length > 0 ? Math.max(...steps.map(s => s.order_index || 0)) : -1;

        setFormData({
            number: '',
            title: '',
            description: '',
            order_index: maxOrderIndex + 1
        });
        setEditingStep(null);
    };

    const handleInputChange = (field: keyof typeof formData, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading service process steps...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <ListOrdered className="h-6 w-6" />
                        Service Process Steps
                    </h2>
                    <p className="text-muted-foreground">
                        Manage the steps displayed in the "Our Service Process" section on the Services page
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Process Step
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>
                                {editingStep ? 'Edit Process Step' : 'Add New Process Step'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingStep
                                    ? 'Update the process step information below.'
                                    : 'Fill in the details for the new process step.'
                                }
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="number">Step Number *</Label>
                                    <Input
                                        id="number"
                                        value={formData.number}
                                        onChange={(e) => handleInputChange('number', e.target.value)}
                                        placeholder="e.g., 01, 02, 03"
                                        maxLength={10}
                                    />
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

                            <div className="space-y-2">
                                <Label htmlFor="title">Step Title *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => handleInputChange('title', e.target.value)}
                                    placeholder="Enter step title"
                                    maxLength={255}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Step Description *</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    placeholder="Enter step description"
                                    maxLength={500}
                                    rows={3}
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
                                        {editingStep ? 'Update' : 'Create'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Process Steps</CardTitle>
                    <CardDescription>
                        {steps.length} process step{steps.length !== 1 ? 's' : ''} configured
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Number</TableHead>
                                    <TableHead className="w-[200px]">Title</TableHead>
                                    <TableHead className="w-[100px]">Order</TableHead>
                                    <TableHead className="w-[300px]">Description</TableHead>
                                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {steps.map((step, index) => (
                                    <TableRow key={step.$id}>
                                        <TableCell>
                                            <div className="flex items-center justify-center">
                                                <Badge variant="secondary" className="font-mono">
                                                    {step.number}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium max-w-[200px]">
                                            <div className="truncate" title={step.title}>
                                                {step.title}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <Badge variant="outline">{step.order_index}</Badge>
                                                <div className="flex flex-col gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleReorder(step.$id!, 'up')}
                                                        disabled={index === 0}
                                                        className="h-6 w-6 p-0"
                                                    >
                                                        <ArrowUp className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleReorder(step.$id!, 'down')}
                                                        disabled={index === steps.length - 1}
                                                        className="h-6 w-6 p-0"
                                                    >
                                                        <ArrowDown className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[300px]">
                                            <div className="truncate" title={step.description}>
                                                {step.description}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(step)}
                                                >
                                                    <Edit className="h-4 w-4 mr-1" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(step.$id)}
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

                    {steps.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <ListOrdered className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p>No process steps added yet.</p>
                            <p>Click "Add Process Step" to create your service process workflow.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};