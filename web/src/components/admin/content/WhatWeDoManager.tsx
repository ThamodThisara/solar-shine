import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Plus,
    Edit,
    Trash2,
    Save,
    BadgeCheck,
    Sun,
    BarChart3,
    Settings,
    Users,
    ChevronDown,
    ChevronRight,
    X,
    Upload
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { whatWeDoService, WhatWeDoContent } from '@/services/whatWeDoService';
import { fileUploadService } from '@/services/appwriteService';

const AVAILABLE_ICONS = [
    { value: 'Sun', label: 'Sun', icon: Sun },
    { value: 'BarChart3', label: 'Bar Chart', icon: BarChart3 },
    { value: 'Settings', label: 'Settings', icon: Settings },
    { value: 'Users', label: 'Users', icon: Users },
];

export const WhatWeDoManager: React.FC = () => {
    const [content, setContent] = useState<WhatWeDoContent>({
        hero: { title: '', subtitle: '', image: '' },
        approach: { title: '', description: '', steps: [] },
        expertise: { title: '', description: '', areas: [] },
        benefits: { title: '', items: [] },
        impact: { title: '', description: '', stats: [] }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        hero: true,
        approach: false,
        expertise: false,
        benefits: false,
        impact: false
    });
    const { toast } = useToast();

    // Helper function to get image URL (handles both file IDs and URLs)
    const getImageUrl = async (imageValue: string) => {
        if (!imageValue) return '';

        if (imageValue.startsWith('http')) {
            return imageValue;
        }

        try {
            return await fileUploadService.getFileUrl(imageValue);
        } catch (error) {
            return '';
        }
    };

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    useEffect(() => {
        loadContent();
    }, []);

    useEffect(() => {
        const convertFileIdsToUrls = async () => {
            if (content.hero.image && !content.hero.image.startsWith('http')) {
                try {
                    const imageUrl = await getImageUrl(content.hero.image);
                    if (imageUrl) {
                        handleHeroChange('image', imageUrl);
                    }
                } catch (error) {
                    // Auto-conversion failed silently
                }
            }
        };

        if (content.hero.image) {
            convertFileIdsToUrls();
        }
    }, [content.hero.image]);

    const loadContent = async () => {
        try {
            setLoading(true);
            setError(null);

            const existingContent = await whatWeDoService.fetchWhatWeDoContent();

            if (existingContent) {
                setContent(existingContent);
            } else {
                const defaultContent = {
                    hero: {
                        title: 'What We Do',
                        subtitle: 'Delivering comprehensive solar energy solutions tailored to your specific needs',
                        image: ''
                    },
                    approach: {
                        title: 'Our Approach',
                        description: 'We believe in a comprehensive, consultative approach that ensures each solar solution is perfectly tailored to our clients\' specific energy needs, property characteristics, and budget considerations.',
                        steps: []
                    },
                    expertise: {
                        title: 'Our Expertise',
                        description: 'With years of experience in the solar industry, we\'ve developed specialized expertise across various domains of solar energy implementation.',
                        areas: []
                    },
                    benefits: {
                        title: 'Benefits of Working With Us',
                        items: []
                    },
                    impact: {
                        title: 'Our Environmental Impact',
                        description: 'Through our solar installations, we\'ve helped our clients significantly reduce their carbon footprint while saving on energy costs.',
                        stats: []
                    }
                };
                setContent(defaultContent);
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Unknown error occurred');
            toast({
                title: "Error",
                description: "Failed to load content",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);

            const success = await whatWeDoService.updateWhatWeDoContent(content);

            if (success) {
                toast({
                    title: "Success",
                    description: "Content saved successfully",
                });
            } else {
                toast({
                    title: "Error",
                    description: "Failed to save content",
                    variant: "destructive"
                });
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Unknown error occurred');
            toast({
                title: "Error",
                description: "Failed to save content",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    const handleHeroChange = (field: 'title' | 'subtitle' | 'image', value: string) => {
        setContent(prev => ({
            ...prev,
            hero: { ...prev.hero, [field]: value }
        }));
    };

    const handleSaveHero = async () => {
        try {
            setSaving(true);
            setError(null);

            const success = await whatWeDoService.updateWhatWeDoContent(content);

            if (success) {
                toast({
                    title: "Success",
                    description: "Hero section saved successfully",
                });
            } else {
                toast({
                    title: "Error",
                    description: "Failed to save hero section",
                    variant: "destructive"
                });
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Unknown error occurred');
            toast({
                title: "Error",
                description: "Failed to save hero section",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading What We Do content...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 bg-destructive rounded-full"></div>
                    <h3 className="font-semibold text-destructive">Error Loading Content</h3>
                </div>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={loadContent} variant="outline" size="sm">
                    Try Again
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="border-b border-border pb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">What We Do Manager</h1>
                        <p className="text-muted-foreground mt-2">
                            Manage the content and layout of your "What We Do" page
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6"
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save All Changes
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <Card className="border-2 border-primary/20 hover:border-primary/30 transition-all duration-200">
                <CardHeader
                    className="cursor-pointer hover:bg-primary/5 transition-colors duration-200 border-b border-border/50"
                    onClick={() => toggleSection('hero')}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Sun className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-semibold">Hero Section</CardTitle>
                                <p className="text-sm text-muted-foreground">Main banner and headline content</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant={content.hero.title ? "default" : "secondary"} className="text-xs">
                                {content.hero.title ? 'Configured' : 'Not Set'}
                            </Badge>
                            {expandedSections.hero ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                    </div>
                </CardHeader>
                {expandedSections.hero && (
                    <CardContent className="pt-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="hero-title" className="text-sm font-medium">Title</Label>
                                    <Input
                                        id="hero-title"
                                        value={content.hero.title || ''}
                                        onChange={(e) => handleHeroChange('title', e.target.value)}
                                        placeholder="Enter hero title"
                                        className="mt-2"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="hero-subtitle" className="text-sm font-medium">Subtitle</Label>
                                    <Textarea
                                        id="hero-subtitle"
                                        value={content.hero.subtitle || ''}
                                        onChange={(e) => handleHeroChange('subtitle', e.target.value)}
                                        placeholder="Enter hero subtitle"
                                        rows={3}
                                        className="mt-2"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-sm font-medium">Hero Image</Label>
                                <div className="space-y-3">
                                    {content.hero.image && (
                                        <div className="relative group">
                                            <img
                                                src={content.hero.image}
                                                alt="Hero preview"
                                                className="w-full h-32 object-cover rounded-lg border-2 border-border group-hover:border-primary/50 transition-colors duration-200"
                                            />
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                                onClick={() => handleHeroChange('image', '')}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={content.hero.image || ''}
                                            onChange={(e) => handleHeroChange('image', e.target.value)}
                                            placeholder="Enter image URL or upload a file"
                                            className="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => document.getElementById('hero-image-upload')?.click()}
                                            className="shrink-0"
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload
                                        </Button>
                                        <input
                                            id="hero-image-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    try {
                                                        const fileId = await fileUploadService.uploadFile(file);
                                                        const imageUrl = await fileUploadService.getFileUrl(fileId);
                                                        handleHeroChange('image', imageUrl);
                                                    } catch (error) {
                                                        toast({
                                                            title: "Upload Failed",
                                                            description: "Failed to upload image. Please try again.",
                                                            variant: "destructive",
                                                        });
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-6 border-t border-border/50">
                            <Button onClick={handleSaveHero} className="px-8" disabled={saving}>
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Hero Section
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Approach Section */}
            <Card className="border border-border/50 hover:border-border transition-all duration-200">
                <CardHeader
                    className="cursor-pointer hover:bg-muted/30 transition-colors duration-200 border-b border-border/50"
                    onClick={() => toggleSection('approach')}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                <Settings className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-semibold">Our Approach</CardTitle>
                                <p className="text-sm text-muted-foreground">Process steps and methodology</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant={content.approach.steps.length > 0 ? "default" : "secondary"} className="text-xs">
                                {content.approach.steps.length > 0 ? `${content.approach.steps.length} steps` : 'No Steps'}
                            </Badge>
                            {expandedSections.approach ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                    </div>
                </CardHeader>
                {expandedSections.approach && (
                    <CardContent className="pt-6">
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="approach-title" className="text-sm font-medium">Section Title</Label>
                                    <Input
                                        id="approach-title"
                                        value={content.approach.title || ''}
                                        onChange={(e) => setContent(prev => ({
                                            ...prev,
                                            approach: { ...prev.approach, title: e.target.value }
                                        }))}
                                        placeholder="Enter approach section title"
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="approach-description" className="text-sm font-medium">Description</Label>
                                    <Textarea
                                        id="approach-description"
                                        value={content.approach.description || ''}
                                        onChange={(e) => setContent(prev => ({
                                            ...prev,
                                            approach: { ...prev.approach, description: e.target.value }
                                        }))}
                                        placeholder="Enter approach description"
                                        rows={3}
                                        className="mt-2"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-border/50 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <Label className="text-base font-semibold">Process Steps</Label>
                                    <Button
                                        onClick={() => {
                                            const newStep: any = {
                                                number: `${content.approach.steps.length + 1}`,
                                                title: '',
                                                description: ''
                                            };
                                            setContent(prev => ({
                                                ...prev,
                                                approach: {
                                                    ...prev.approach,
                                                    steps: [...prev.approach.steps, newStep]
                                                }
                                            }));
                                        }}
                                        size="sm"
                                        className="bg-blue-500 hover:bg-blue-600"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Step
                                    </Button>
                                </div>

                                {content.approach.steps.length > 0 && (
                                    <div className="space-y-4">
                                        {content.approach.steps.map((step, index) => (
                                            <div key={index} className="bg-muted/30 rounded-lg p-4 border border-border/50">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <span className="text-blue-500 font-bold text-lg">{step.number}</span>
                                                    </div>
                                                    <div className="flex-1 space-y-3">
                                                        <Input
                                                            value={step.title || ''}
                                                            onChange={(e) => {
                                                                const updatedSteps = [...content.approach.steps];
                                                                updatedSteps[index] = { ...step, title: e.target.value };
                                                                setContent(prev => ({
                                                                    ...prev,
                                                                    approach: { ...prev.approach, steps: updatedSteps }
                                                                }));
                                                            }}
                                                            placeholder="Step title"
                                                            className="font-medium"
                                                        />
                                                        <Textarea
                                                            value={step.description || ''}
                                                            onChange={(e) => {
                                                                const updatedSteps = [...content.approach.steps];
                                                                updatedSteps[index] = { ...step, description: e.target.value };
                                                                setContent(prev => ({
                                                                    ...prev,
                                                                    approach: { ...prev.approach, steps: updatedSteps }
                                                                }));
                                                            }}
                                                            placeholder="Step description"
                                                            rows={2}
                                                        />
                                                    </div>
                                                    <Button
                                                        onClick={() => {
                                                            const updatedSteps = content.approach.steps.filter((_, i) => i !== index);
                                                            setContent(prev => ({
                                                                ...prev,
                                                                approach: { ...prev.approach, steps: updatedSteps }
                                                            }));
                                                        }}
                                                        variant="destructive"
                                                        size="sm"
                                                        className="flex-shrink-0"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {content.approach.steps.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p className="font-medium">No process steps added yet</p>
                                        <p className="text-sm">Click "Add Step" to create your first process step</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-6 border-t border-border/50">
                            <Button
                                onClick={() => handleSave()}
                                className="px-8"
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Approach Section
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Expertise Section */}
            <Card className="border border-border/50 hover:border-border transition-all duration-200">
                <CardHeader
                    className="cursor-pointer hover:bg-muted/30 transition-colors duration-200 border-b border-border/50"
                    onClick={() => toggleSection('expertise')}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                                <Users className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-semibold">Our Expertise</CardTitle>
                                <p className="text-sm text-muted-foreground">Specialized areas and services</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant={content.expertise.areas.length > 0 ? "default" : "secondary"} className="text-xs">
                                {content.expertise.areas.length > 0 ? `${content.expertise.areas.length} areas` : 'No Areas'}
                            </Badge>
                            {expandedSections.expertise ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                    </div>
                </CardHeader>
                {expandedSections.expertise && (
                    <CardContent className="pt-6">
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="expertise-title" className="text-sm font-medium">Section Title</Label>
                                    <Input
                                        id="expertise-title"
                                        value={content.expertise.title || ''}
                                        onChange={(e) => setContent(prev => ({
                                            ...prev,
                                            expertise: { ...prev.expertise, title: e.target.value }
                                        }))}
                                        placeholder="Enter expertise section title"
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="expertise-description" className="text-sm font-medium">Description</Label>
                                    <Textarea
                                        id="expertise-description"
                                        value={content.expertise.description || ''}
                                        onChange={(e) => setContent(prev => ({
                                            ...prev,
                                            expertise: { ...prev.expertise, description: e.target.value }
                                        }))}
                                        placeholder="Enter expertise description"
                                        rows={3}
                                        className="mt-2"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-border/50 pt-6">
                                <div className="flex items-center justify-between mb-6">
                                    <Label className="text-base font-semibold">Expertise Areas</Label>
                                    <Button
                                        onClick={() => {
                                            const newArea: any = {
                                                title: '',
                                                description: '',
                                                icon: 'Sun',
                                                image: ''
                                            };
                                            setContent(prev => ({
                                                ...prev,
                                                expertise: {
                                                    ...prev.expertise,
                                                    areas: [...prev.expertise.areas, newArea]
                                                }
                                            }));
                                        }}
                                        size="sm"
                                        className="bg-green-500 hover:bg-green-600"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Expertise Area
                                    </Button>
                                </div>

                                {content.expertise.areas.length > 0 && (
                                    <div className="space-y-6">
                                        {content.expertise.areas.map((area, index) => (
                                            <div key={index} className="bg-muted/30 rounded-lg p-6 border border-border/50">
                                                <div className="grid md:grid-cols-2 gap-6">
                                                    {/* Left Column - Text Content */}
                                                    <div className="space-y-4">
                                                        <div>
                                                            <Label className="text-sm font-medium">Title</Label>
                                                            <Input
                                                                value={area.title || ''}
                                                                onChange={(e) => {
                                                                    const updatedAreas = [...content.expertise.areas];
                                                                    updatedAreas[index] = { ...area, title: e.target.value };
                                                                    setContent(prev => ({
                                                                        ...prev,
                                                                        expertise: { ...prev.expertise, areas: updatedAreas }
                                                                    }));
                                                                }}
                                                                placeholder="Expertise area title"
                                                                className="mt-2 font-medium"
                                                            />
                                                        </div>

                                                        <div>
                                                            <Label className="text-sm font-medium">Description</Label>
                                                            <Textarea
                                                                value={area.description || ''}
                                                                onChange={(e) => {
                                                                    const updatedAreas = [...content.expertise.areas];
                                                                    updatedAreas[index] = { ...area, description: e.target.value };
                                                                    setContent(prev => ({
                                                                        ...prev,
                                                                        expertise: { ...prev.expertise, areas: updatedAreas }
                                                                    }));
                                                                }}
                                                                placeholder="Describe this expertise area"
                                                                rows={3}
                                                                className="mt-2"
                                                            />
                                                        </div>

                                                        <div>
                                                            <Label className="text-sm font-medium">Icon</Label>
                                                            <Select
                                                                value={area.icon || 'Sun'}
                                                                onValueChange={(value) => {
                                                                    const updatedAreas = [...content.expertise.areas];
                                                                    updatedAreas[index] = { ...area, icon: value };
                                                                    setContent(prev => ({
                                                                        ...prev,
                                                                        expertise: { ...prev.expertise, areas: updatedAreas }
                                                                    }));
                                                                }}
                                                            >
                                                                <SelectTrigger className="mt-2">
                                                                    <SelectValue placeholder="Select an icon" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {AVAILABLE_ICONS.map((iconOption) => {
                                                                        const IconComponent = iconOption.icon;
                                                                        return (
                                                                            <SelectItem key={iconOption.value} value={iconOption.value}>
                                                                                <div className="flex items-center gap-2">
                                                                                    <IconComponent className="h-4 w-4" />
                                                                                    {iconOption.label}
                                                                                </div>
                                                                            </SelectItem>
                                                                        );
                                                                    })}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>

                                                    {/* Right Column - Image */}
                                                    <div className="space-y-4">
                                                        <Label className="text-sm font-medium">Image</Label>
                                                        <div className="space-y-3">
                                                            {area.image && (
                                                                <div className="relative group">
                                                                    <img
                                                                        src={area.image}
                                                                        alt="Expertise area preview"
                                                                        className="w-full max-w-64 h-auto object-cover rounded-lg border-2 border-border group-hover:border-green-500/50 transition-colors duration-200"
                                                                        onError={(e) => {
                                                                            e.currentTarget.style.display = 'none';
                                                                        }}
                                                                    />
                                                                    <Button
                                                                        type="button"
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                                                        onClick={() => {
                                                                            const updatedAreas = [...content.expertise.areas];
                                                                            updatedAreas[index] = { ...area, image: '' };
                                                                            setContent(prev => ({
                                                                                ...prev,
                                                                                expertise: { ...prev.expertise, areas: updatedAreas }
                                                                            }));
                                                                        }}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            )}

                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    value={area.image || ''}
                                                                    onChange={(e) => {
                                                                        const updatedAreas = [...content.expertise.areas];
                                                                        updatedAreas[index] = { ...area, image: e.target.value };
                                                                        setContent(prev => ({
                                                                            ...prev,
                                                                            expertise: { ...prev.expertise, areas: updatedAreas }
                                                                        }));
                                                                    }}
                                                                    placeholder="Enter image URL or upload a file"
                                                                    className="flex-1"
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    onClick={() => document.getElementById(`expertise-image-${index}`)?.click()}
                                                                    className="shrink-0"
                                                                >
                                                                    <Upload className="h-4 w-4 mr-2" />
                                                                    Upload
                                                                </Button>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    id={`expertise-image-${index}`}
                                                                    onChange={async (e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            try {
                                                                                const fileId = await fileUploadService.uploadFile(file);
                                                                                const imageUrl = await fileUploadService.getFileUrl(fileId);

                                                                                const updatedAreas = [...content.expertise.areas];
                                                                                updatedAreas[index] = {
                                                                                    ...updatedAreas[index],
                                                                                    image: imageUrl,
                                                                                    image_id: fileId
                                                                                };
                                                                                setContent(prev => ({
                                                                                    ...prev,
                                                                                    expertise: { ...prev.expertise, areas: updatedAreas }
                                                                                }));
                                                                            } catch (error) {
                                                                                toast({
                                                                                    title: "Upload Failed",
                                                                                    description: "Failed to upload image. Please try again.",
                                                                                    variant: "destructive",
                                                                                });
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end pt-4 border-t border-border/50 mt-4">
                                                    <Button
                                                        onClick={() => {
                                                            const updatedAreas = content.expertise.areas.filter((_, i) => i !== index);
                                                            setContent(prev => ({
                                                                ...prev,
                                                                expertise: { ...prev.expertise, areas: updatedAreas }
                                                            }));
                                                        }}
                                                        variant="destructive"
                                                        size="sm"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Remove Area
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {content.expertise.areas.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p className="font-medium">No expertise areas added yet</p>
                                        <p className="text-sm">Click "Add Expertise Area" to create your first expertise area</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-6 border-t border-border/50">
                            <Button
                                onClick={() => handleSave()}
                                className="px-8"
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Expertise Section
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Benefits Section */}
            <Card className="border border-border/50 hover:border-border transition-all duration-200">
                <CardHeader
                    className="cursor-pointer hover:bg-muted/30 transition-colors duration-200 border-b border-border/50"
                    onClick={() => toggleSection('benefits')}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                                <BadgeCheck className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-semibold">Benefits</CardTitle>
                                <p className="text-sm text-muted-foreground">Advantages of working with us</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant={content.benefits.items.length > 0 ? "default" : "secondary"} className="text-xs">
                                {content.benefits.title ? `${content.benefits.items.length} items` : 'Not Set'}
                            </Badge>
                            {expandedSections.benefits ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                    </div>
                </CardHeader>
                {expandedSections.benefits && (
                    <CardContent className="pt-6">
                        <div className="space-y-6">
                            <div>
                                <Label htmlFor="benefits-title" className="text-sm font-medium">Section Title</Label>
                                <Input
                                    id="benefits-title"
                                    value={content.benefits.title || ''}
                                    onChange={(e) => setContent(prev => ({
                                        ...prev,
                                        benefits: { ...prev.benefits, title: e.target.value }
                                    }))}
                                    placeholder="Enter benefits section title"
                                    className="mt-2"
                                />
                            </div>

                            <div className="border-t border-border/50 pt-6">
                                <div className="flex items-center justify-between mb-6">
                                    <Label className="text-base font-semibold">Benefit Items</Label>
                                    <Button
                                        onClick={() => {
                                            const newBenefit: any = {
                                                text: '',
                                                order_index: content.benefits.items.length
                                            };
                                            setContent(prev => ({
                                                ...prev,
                                                benefits: {
                                                    ...prev.benefits,
                                                    items: [...prev.benefits.items, newBenefit]
                                                }
                                            }));
                                        }}
                                        size="sm"
                                        className="bg-purple-500 hover:bg-purple-600"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Benefit
                                    </Button>
                                </div>

                                {content.benefits.items.length > 0 && (
                                    <div className="space-y-4">
                                        {content.benefits.items.map((benefit, index) => (
                                            <div key={index} className="bg-muted/30 rounded-lg p-4 border border-border/50">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                                        <BadgeCheck className="h-4 w-4 text-purple-500" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <Input
                                                            value={benefit.text || ''}
                                                            onChange={(e) => {
                                                                const updatedItems = [...content.benefits.items];
                                                                updatedItems[index] = { ...benefit, text: e.target.value };
                                                                setContent(prev => ({
                                                                    ...prev,
                                                                    benefits: {
                                                                        ...prev.benefits,
                                                                        items: updatedItems
                                                                    }
                                                                }));
                                                            }}
                                                            placeholder="Enter benefit (one sentence)"
                                                            className="font-medium"
                                                        />
                                                    </div>
                                                    <Button
                                                        onClick={() => {
                                                            const updatedItems = content.benefits.items.filter((_, i) => i !== index);
                                                            setContent(prev => ({
                                                                ...prev,
                                                                benefits: {
                                                                    ...prev.benefits,
                                                                    items: updatedItems
                                                                }
                                                            }));
                                                        }}
                                                        variant="destructive"
                                                        size="sm"
                                                        className="flex-shrink-0"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {content.benefits.items.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <BadgeCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p className="font-medium">No benefit items added yet</p>
                                        <p className="text-sm">Click "Add Benefit" to create your first benefit item</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-6 border-t border-border/50">
                            <Button
                                onClick={() => handleSave()}
                                className="px-8"
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Benefits Section
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Impact Section */}
            <Card className="border border-border/50 hover:border-border transition-all duration-200">
                <CardHeader
                    className="cursor-pointer hover:bg-muted/30 transition-colors duration-200 border-b border-border/50"
                    onClick={() => toggleSection('impact')}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                                <BarChart3 className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-semibold">Environmental Impact</CardTitle>
                                <p className="text-sm text-muted-foreground">Statistics and achievements</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant={content.impact.stats.length > 0 ? "default" : "secondary"} className="text-xs">
                                {content.impact.stats.length > 0 ? `${content.impact.stats.length} stats` : 'No Stats'}
                            </Badge>
                            {expandedSections.impact ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                    </div>
                </CardHeader>
                {expandedSections.impact && (
                    <CardContent className="pt-6">
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="impact-title" className="text-sm font-medium">Section Title</Label>
                                    <Input
                                        id="impact-title"
                                        value={content.impact.title || ''}
                                        onChange={(e) => setContent(prev => ({
                                            ...prev,
                                            impact: { ...prev.impact, title: e.target.value }
                                        }))}
                                        placeholder="Enter impact section title"
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="impact-description" className="text-sm font-medium">Description</Label>
                                    <Textarea
                                        id="impact-description"
                                        value={content.impact.description || ''}
                                        onChange={(e) => setContent(prev => ({
                                            ...prev,
                                            impact: { ...prev.impact, description: e.target.value }
                                        }))}
                                        placeholder="Enter impact description"
                                        rows={3}
                                        className="mt-2"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-border/50 pt-6">
                                <div className="flex items-center justify-between mb-6">
                                    <Label className="text-base font-semibold">Impact Statistics</Label>
                                    <Button
                                        onClick={() => {
                                            const newStat: any = {
                                                value: '',
                                                label: ''
                                            };
                                            setContent(prev => ({
                                                ...prev,
                                                impact: {
                                                    ...prev.impact,
                                                    stats: [...prev.impact.stats, newStat]
                                                }
                                            }));
                                        }}
                                        size="sm"
                                        className="bg-orange-500 hover:bg-orange-600"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Statistic
                                    </Button>
                                </div>

                                {content.impact.stats.length > 0 && (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {content.impact.stats.map((stat, index) => (
                                            <div key={index} className="bg-muted/30 rounded-lg p-4 border border-border/50">
                                                <div className="space-y-3">
                                                    <div>
                                                        <Label className="text-sm font-medium">Value</Label>
                                                        <Input
                                                            value={stat.value || ''}
                                                            onChange={(e) => {
                                                                const updatedStats = [...content.impact.stats];
                                                                updatedStats[index] = { ...stat, value: e.target.value };
                                                                setContent(prev => ({
                                                                    ...prev,
                                                                    impact: { ...prev.impact, stats: updatedStats }
                                                                }));
                                                            }}
                                                            placeholder="e.g., 5MW+, 7,500+"
                                                            className="mt-2 font-bold text-lg"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-sm font-medium">Label</Label>
                                                        <Input
                                                            value={stat.label || ''}
                                                            onChange={(e) => {
                                                                const updatedStats = [...content.impact.stats];
                                                                updatedStats[index] = { ...stat, label: e.target.value };
                                                                setContent(prev => ({
                                                                    ...prev,
                                                                    impact: { ...prev.impact, stats: updatedStats }
                                                                }));
                                                            }}
                                                            placeholder="e.g., Total Capacity Installed"
                                                            className="mt-2"
                                                        />
                                                    </div>
                                                    <div className="flex justify-end pt-2">
                                                        <Button
                                                            onClick={() => {
                                                                const updatedStats = content.impact.stats.filter((_, i) => i !== index);
                                                                setContent(prev => ({
                                                                    ...prev,
                                                                    impact: { ...prev.impact, stats: updatedStats }
                                                                }));
                                                            }}
                                                            variant="destructive"
                                                            size="sm"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Remove
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {content.impact.stats.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p className="font-medium">No impact statistics added yet</p>
                                        <p className="text-sm">Click "Add Statistic" to create your first impact statistic</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-6 border-t border-border/50">
                            <Button
                                onClick={() => handleSave()}
                                className="px-8"
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Impact Section
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    );
};
