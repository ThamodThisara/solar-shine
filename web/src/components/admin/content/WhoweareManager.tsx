import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    Upload,
    Eye,
    EyeOff,
    ImageIcon,
    AlertCircle,
    CheckCircle,
    ArrowUp,
    ArrowDown,
    RefreshCw
} from 'lucide-react';
import {
    createOrUpdateAboutPageWithImage,
    createTeamMemberWithImage,
    updateTeamMemberWithImage,
    deleteTeamMember,
    createValueWithImage,
    updateValueWithImage,
    deleteValue,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    getAboutContent,
    populateDefaultData,
    AboutContent,
    TeamMember,
    Value,
    Milestone,
    getPublicFileUrl
} from '@/services/whoweareService';

interface EditableAboutPage {
    title?: string;
    subtitle?: string;
    main_image?: string;
    mission_statement?: string;
    vision_statement?: string;
    cta_title?: string;
    cta_description?: string;
    contact_button_text?: string;
    projects_button_text?: string;
}

export const WhoweareManager: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'general' | 'team' | 'values' | 'milestones'>('general');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedMainImage, setSelectedMainImage] = useState<File | null>(null);
    const [selectedTeamImage, setSelectedTeamImage] = useState<File | null>(null);
    const [valueIconFile, setValueIconFile] = useState<File | null>(null);

    const { data: aboutContent, isLoading, error, refetch } = useQuery<AboutContent>({
        queryKey: ['aboutContent'],
        queryFn: getAboutContent,
    });

    const [formData, setFormData] = useState<{
        aboutPage: EditableAboutPage;
        teamMembers: (TeamMember & { isNew?: boolean })[];
        values: (Value & { isNew?: boolean })[];
        milestones: (Milestone & { isNew?: boolean })[];
    }>({
        aboutPage: {},
        teamMembers: [],
        values: [],
        milestones: []
    });

    useEffect(() => {
        if (aboutContent) {
            setFormData({
                aboutPage: {
                    title: aboutContent.title,
                    subtitle: aboutContent.subtitle,
                    main_image: aboutContent.main_image,
                    mission_statement: aboutContent.mission_statement,
                    vision_statement: aboutContent.vision_statement,
                    cta_title: aboutContent.cta_title,
                    cta_description: aboutContent.cta_description,
                    contact_button_text: aboutContent.contact_button_text,
                    projects_button_text: aboutContent.projects_button_text,
                },
                teamMembers: aboutContent.team_members || [],
                values: aboutContent.values || [],
                milestones: aboutContent.milestones || []
            });
        }
    }, [aboutContent]);

    // Mutations
    const updateAboutPageMutation = useMutation({
        mutationFn: ({ data, imageFile }: { data: EditableAboutPage; imageFile?: File }) =>
            createOrUpdateAboutPageWithImage(data, imageFile),
        onSuccess: () => {
            toast.success('About page updated successfully');
            queryClient.invalidateQueries({ queryKey: ['aboutContent'] });
            setSelectedMainImage(null);
        },
        onError: (error) => {
            console.error('Update error:', error);
            toast.error('Failed to update about page');
        }
    });

    const teamMemberMutation = useMutation({
        mutationFn: async ({ action, data, id, imageFile }: {
            action: 'create' | 'update' | 'delete';
            data?: Partial<TeamMember>;
            id?: string;
            imageFile?: File;
        }) => {
            if (action === 'create' && data) {
                return createTeamMemberWithImage(data, imageFile);
            }
            if (action === 'update' && id && data) {
                return updateTeamMemberWithImage(id, data, imageFile);
            }
            if (action === 'delete' && id) {
                return deleteTeamMember(id);
            }
            throw new Error('Invalid mutation parameters');
        },
        onSuccess: () => {
            toast.success('Team member updated successfully');
            queryClient.invalidateQueries({ queryKey: ['aboutContent'] });
            setEditingId(null);
            setSelectedTeamImage(null);
        },
        onError: (error) => {
            console.error('Team member mutation error:', error);
            toast.error('Failed to update team member');
        }
    });

    const valueMutation = useMutation({
        mutationFn: async ({ action, data, id, imageFile }: {
            action: 'create' | 'update' | 'delete';
            data?: Partial<Value>;
            id?: string;
            imageFile?: File;
        }) => {
            if (action === 'create' && data) {
                return createValueWithImage(data, imageFile);
            }
            if (action === 'update' && id && data) {
                return updateValueWithImage(id, data, imageFile);
            }
            if (action === 'delete' && id) {
                return deleteValue(id);
            }
            throw new Error('Invalid mutation parameters');
        },
        onSuccess: () => {
            toast.success('Value updated successfully');
            queryClient.invalidateQueries({ queryKey: ['aboutContent'] });
            setEditingId(null);
            setValueIconFile(null);
        },
        onError: (error) => {
            console.error('Value mutation error:', error);
            toast.error('Failed to update value');
        }
    });

    const milestoneMutation = useMutation({
        mutationFn: async ({ action, data, id }: { action: 'create' | 'update' | 'delete'; data?: Partial<Milestone>; id?: string }) => {
            if (action === 'create' && data) return createMilestone(data as Omit<Milestone, '$id' | '$createdAt' | '$updatedAt'>);
            if (action === 'update' && id && data) return updateMilestone(id, data as Partial<Omit<Milestone, '$id' | '$createdAt' | '$updatedAt'>>);
            if (action === 'delete' && id) return deleteMilestone(id);
            throw new Error('Invalid mutation parameters');
        },
        onSuccess: () => {
            toast.success('Milestone updated successfully');
            queryClient.invalidateQueries({ queryKey: ['aboutContent'] });
            setEditingId(null);
        },
        onError: (error) => {
            console.error('Milestone mutation error:', error);
            toast.error('Failed to update milestone');
        }
    });

    const populateDefaultMutation = useMutation({
        mutationFn: populateDefaultData,
        onSuccess: () => {
            toast.success('Default data populated successfully');
            queryClient.invalidateQueries({ queryKey: ['aboutContent'] });
        },
        onError: (error) => {
            console.error('Populate default data error:', error);
            toast.error('Failed to populate default data');
        }
    });

    // Handler functions
    const handleSaveAboutPage = () => {
        if (!formData.aboutPage.title?.trim() || !formData.aboutPage.subtitle?.trim()) {
            toast.error('Title and subtitle are required');
            return;
        }
        updateAboutPageMutation.mutate({
            data: formData.aboutPage,
            imageFile: selectedMainImage || undefined
        });
    };

    const handleSaveTeamMember = (member: TeamMember & { isNew?: boolean }) => {
        if (!member.name?.trim() || !member.position?.trim()) {
            toast.error('Name and position are required');
            return;
        }

        // Sanitize data for both create and update
        const memberData = {
            name: member.name,
            position: member.position,
            bio: member.bio,
            image: member.image,
            order: member.order
        };

        if (member.isNew) {
            teamMemberMutation.mutate({
                action: 'create',
                data: memberData,
                imageFile: selectedTeamImage || undefined
            });
        } else if (member.$id && !member.$id.startsWith('default-')) {
            teamMemberMutation.mutate({
                action: 'update',
                data: memberData,
                id: member.$id,
                imageFile: selectedTeamImage || undefined
            });
        }
    };

    const handleDeleteTeamMember = (id: string) => {
        if (id.startsWith('default-')) {
            toast.error('Cannot delete default team members. Please populate database first.');
            return;
        }

        if (window.confirm('Are you sure you want to delete this team member?')) {
            teamMemberMutation.mutate({ action: 'delete', id });
        }
    };

    const handleSaveValue = (value: Value & { isNew?: boolean }) => {
        if (!value.title?.trim() || !value.description?.trim()) {
            toast.error('Title and description are required');
            return;
        }

        // Sanitize data for both create and update
        const valueData = {
            title: value.title,
            description: value.description,
            icon: value.icon,
            order: value.order
        };

        if (value.isNew) {
            valueMutation.mutate({
                action: 'create',
                data: valueData,
                imageFile: valueIconFile || undefined
            });
        } else if (value.$id && !value.$id.startsWith('default-')) {
            valueMutation.mutate({
                action: 'update',
                data: valueData,
                id: value.$id,
                imageFile: valueIconFile || undefined
            });
        }
    };

    const handleDeleteValue = (id: string) => {
        if (id.startsWith('default-')) {
            toast.error('Cannot delete default values. Please populate database first.');
            return;
        }

        if (window.confirm('Are you sure you want to delete this value?')) {
            valueMutation.mutate({ action: 'delete', id });
        }
    };

    const handleSaveMilestone = (milestone: Milestone & { isNew?: boolean }) => {
        if (!milestone.year?.trim() || !milestone.title?.trim() || !milestone.description?.trim()) {
            toast.error('Year, title and description are required');
            return;
        }

        // Sanitize data for both create and update
        const milestoneData = {
            year: milestone.year,
            title: milestone.title,
            description: milestone.description,
            order: milestone.order
        };

        if (milestone.isNew) {
            milestoneMutation.mutate({ action: 'create', data: milestoneData });
        } else if (milestone.$id && !milestone.$id.startsWith('default-')) {
            milestoneMutation.mutate({ action: 'update', data: milestoneData, id: milestone.$id });
        }
    };

    const handleDeleteMilestone = (id: string) => {
        if (id.startsWith('default-')) {
            toast.error('Cannot delete default milestones. Please populate database first.');
            return;
        }

        if (window.confirm('Are you sure you want to delete this milestone?')) {
            milestoneMutation.mutate({ action: 'delete', id });
        }
    };

    const addNewItem = (type: 'team' | 'values' | 'milestones') => {
        const tempId = `temp-${Date.now()}`;

        if (type === 'team') {
            const newMember: TeamMember & { isNew: boolean } = {
                $id: tempId,
                name: '',
                position: '',
                bio: '',
                image: '',
                order: formData.teamMembers.length + 1,
                $createdAt: '',
                $updatedAt: '',
                isNew: true
            };
            setFormData(prev => ({ ...prev, teamMembers: [...prev.teamMembers, newMember] }));
        } else if (type === 'values') {
            const newValue: Value & { isNew: boolean } = {
                $id: tempId,
                title: '',
                description: '',
                icon: '',
                order: formData.values.length + 1,
                $createdAt: '',
                $updatedAt: '',
                isNew: true
            };
            setFormData(prev => ({ ...prev, values: [...prev.values, newValue] }));
        } else if (type === 'milestones') {
            const newMilestone: Milestone & { isNew: boolean } = {
                $id: tempId,
                year: '',
                title: '',
                description: '',
                order: formData.milestones.length + 1,
                $createdAt: '',
                $updatedAt: '',
                isNew: true
            };
            setFormData(prev => ({ ...prev, milestones: [...prev.milestones, newMilestone] }));
        }

        setEditingId(tempId);
    };

    const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
    const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
    const bucketId = import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_ID;

    const getStorageFileUrl = (fileId: string) => {
        if (!bucketId || !projectId) return '';
        return `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;
    };

    const hasDefaultData = formData.teamMembers.some(m => m.$id.startsWith('default-')) ||
        formData.values.some(v => v.$id.startsWith('default-')) ||
        formData.milestones.some(m => m.$id.startsWith('default-'));

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <RefreshCw className="animate-spin" size={20} />
                    <span className="text-lg">Loading content...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Content</h2>
                    <p className="text-gray-600 mb-4">Failed to load page content. Please try again.</p>
                    <button
                        onClick={() => refetch()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Who We Are Page Management</h1>
                        <p className="text-gray-600 mt-2">Manage all content for the Who We Are page</p>
                        {hasDefaultData && (
                            <div className="flex items-center gap-2 mt-2 text-amber-600">
                                <AlertCircle size={16} />
                                <span className="text-sm">
                                    You're viewing default data. Changes will be saved to database.
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-4">
                        {hasDefaultData && (
                            <button
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to set default values? This will overwrite any existing database data. Make sure you have backed up any important information.')) {
                                        populateDefaultMutation.mutate();
                                    }
                                }}
                                disabled={populateDefaultMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                <CheckCircle size={16} />
                                {populateDefaultMutation.isPending ? 'Populating...' : 'Save Defaults to DB'}
                            </button>
                        )}
                        <a
                            href="/who-we-are"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            <Eye size={16} />
                            View Live Page
                        </a>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        {[
                            { key: 'general', label: 'General Info' },
                            { key: 'team', label: `Team Members (${formData.teamMembers.length})` },
                            { key: 'values', label: `Core Values (${formData.values.length})` },
                            { key: 'milestones', label: `Milestones (${formData.milestones.length})` }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === tab.key
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* General Info Tab */}
                {activeTab === 'general' && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-6">General Information</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Page Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.aboutPage.title || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        aboutPage: { ...prev.aboutPage, title: e.target.value }
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Who We Are"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Main Image
                                </label>
                                <div className="space-y-3">
                                    {formData.aboutPage.main_image && (
                                        <div className="relative">
                                            <img
                                                src={formData.aboutPage.main_image}
                                                alt="Current main image"
                                                className="w-48 h-32 object-cover rounded-lg border-2 border-gray-200"
                                            />
                                            <div className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md">
                                                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                                                    Current
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setSelectedMainImage(file);
                                                    const reader = new FileReader();
                                                    reader.onload = (e) => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            aboutPage: { ...prev.aboutPage, main_image: e.target?.result as string }
                                                        }));
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedMainImage(null);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    aboutPage: { ...prev.aboutPage, main_image: '' }
                                                }));
                                            }}
                                            className="px-3 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                                        >
                                            Clear
                                        </button>
                                    </div>

                                    {selectedMainImage && (
                                        <div className="relative">
                                            <img
                                                src={URL.createObjectURL(selectedMainImage)}
                                                alt="Selected image preview"
                                                className="w-32 h-24 object-cover rounded border-2 border-blue-300"
                                            />
                                            <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-1">
                                                <span className="text-xs text-white px-2 py-1 rounded-full">
                                                    New
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Subtitle <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={formData.aboutPage.subtitle || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        aboutPage: { ...prev.aboutPage, subtitle: e.target.value }
                                    }))}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="A leading solar energy provider..."
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mission Statement
                                </label>
                                <textarea
                                    value={formData.aboutPage.mission_statement || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        aboutPage: { ...prev.aboutPage, mission_statement: e.target.value }
                                    }))}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="To empower communities with sustainable..."
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Vision Statement
                                </label>
                                <textarea
                                    value={formData.aboutPage.vision_statement || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        aboutPage: { ...prev.aboutPage, vision_statement: e.target.value }
                                    }))}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="To be a leading force in the global transition..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    CTA Title
                                </label>
                                <input
                                    type="text"
                                    value={formData.aboutPage.cta_title || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        aboutPage: { ...prev.aboutPage, cta_title: e.target.value }
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ready to Work With Us?"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    CTA Description
                                </label>
                                <input
                                    type="text"
                                    value={formData.aboutPage.cta_description || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        aboutPage: { ...prev.aboutPage, cta_description: e.target.value }
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Join us in our mission..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Contact Button Text
                                </label>
                                <input
                                    type="text"
                                    value={formData.aboutPage.contact_button_text || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        aboutPage: { ...prev.aboutPage, contact_button_text: e.target.value }
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Contact Us"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Projects Button Text
                                </label>
                                <input
                                    type="text"
                                    value={formData.aboutPage.projects_button_text || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        aboutPage: { ...prev.aboutPage, projects_button_text: e.target.value }
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="View Our Projects"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={handleSaveAboutPage}
                                disabled={updateAboutPageMutation.isPending}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                <Save size={16} />
                                {updateAboutPageMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Team Members Tab */}
                {activeTab === 'team' && (
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold">Team Members</h2>
                                <button
                                    onClick={() => addNewItem('team')}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    <Plus size={16} />
                                    Add Team Member
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {formData.teamMembers.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No team members added yet. Click "Add Team Member" to get started.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {formData.teamMembers.map((member) => (
                                        <div key={member.$id} className="border border-gray-200 rounded-lg p-4">
                                            {editingId === member.$id ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Name <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={member.name || ''}
                                                            onChange={(e) => {
                                                                const updated = formData.teamMembers.map(m =>
                                                                    m.$id === member.$id ? { ...m, name: e.target.value } : m
                                                                );
                                                                setFormData(prev => ({ ...prev, teamMembers: updated }));
                                                            }}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Position <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={member.position || ''}
                                                            onChange={(e) => {
                                                                const updated = formData.teamMembers.map(m =>
                                                                    m.$id === member.$id ? { ...m, position: e.target.value } : m
                                                                );
                                                                setFormData(prev => ({ ...prev, teamMembers: updated }));
                                                            }}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image</label>
                                                        <div className="mt-2 flex items-center gap-4">
                                                            <img
                                                                src={member.image || '/placeholder.svg'}
                                                                alt={member.name || 'Member'}
                                                                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                                                            />
                                                            <div className="flex-1">
                                                                <input
                                                                    id={`file-upload-${member.$id}`}
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            setSelectedTeamImage(file);
                                                                            const reader = new FileReader();
                                                                            reader.onload = (e) => {
                                                                                const updated = formData.teamMembers.map(m =>
                                                                                    m.$id === member.$id ? { ...m, image: e.target?.result as string } : m
                                                                                );
                                                                                setFormData(prev => ({ ...prev, teamMembers: updated }));
                                                                            };
                                                                            reader.readAsDataURL(file);
                                                                        }
                                                                    }}
                                                                    className="hidden"
                                                                />
                                                                <label
                                                                    htmlFor={`file-upload-${member.$id}`}
                                                                    className="cursor-pointer bg-white rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                                                >
                                                                    <Upload className="inline-block w-4 h-4 mr-2" />
                                                                    Change Image
                                                                </label>
                                                                {selectedTeamImage && editingId === member.$id && (
                                                                    <p className="text-xs text-gray-500 mt-2">
                                                                        New image selected: {selectedTeamImage.name}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                                                        <textarea
                                                            value={member.bio || ''}
                                                            onChange={(e) => {
                                                                const updated = formData.teamMembers.map(m =>
                                                                    m.$id === member.$id ? { ...m, bio: e.target.value } : m
                                                                );
                                                                setFormData(prev => ({ ...prev, teamMembers: updated }));
                                                            }}
                                                            rows={3}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2 flex gap-2">
                                                        <button
                                                            onClick={() => handleSaveTeamMember(member)}
                                                            disabled={teamMemberMutation.isPending}
                                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                                        >
                                                            <Save size={16} />
                                                            {teamMemberMutation.isPending ? 'Saving...' : 'Save'}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingId(null);
                                                                setSelectedTeamImage(null);
                                                                if (member.isNew) {
                                                                    const filtered = formData.teamMembers.filter(m => m.$id !== member.$id);
                                                                    setFormData(prev => ({ ...prev, teamMembers: filtered }));
                                                                }
                                                            }}
                                                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                                        >
                                                            <X size={16} />
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        {member.image && (
                                                            <img
                                                                src={member.image}
                                                                alt={member.name}
                                                                className="w-12 h-12 rounded-full object-cover"
                                                            />
                                                        )}
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-semibold">{member.name}</h3>
                                                                {member.$id.startsWith('default-') && (
                                                                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                                                                        Default
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-gray-600">{member.position}</p>
                                                            {member.bio && (
                                                                <p className="text-sm text-gray-500 mt-1">{member.bio}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setEditingId(member.$id)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteTeamMember(member.$id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Values Tab */}
                {activeTab === 'values' && (
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold">Core Values</h2>
                                <button
                                    onClick={() => addNewItem('values')}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    <Plus size={16} />
                                    Add Value
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {formData.values.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No values added yet. Click "Add Value" to get started.
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {formData.values.map((value) => (
                                        <div key={value.$id} className="border border-gray-200 rounded-lg p-4">
                                            {editingId === value.$id ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Title <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={value.title || ''}
                                                            onChange={(e) => {
                                                                const updated = formData.values.map(v =>
                                                                    v.$id === value.$id ? { ...v, title: e.target.value } : v
                                                                );
                                                                setFormData(prev => ({ ...prev, values: updated }));
                                                            }}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                                                        <div className="space-y-3">
                                                            {value.icon && (
                                                                <div className="relative">
                                                                    <img
                                                                        src={value.icon.length <= 50 ? getStorageFileUrl(value.icon) : value.icon}
                                                                        alt="Current icon"
                                                                        className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
                                                                    />
                                                                    <div className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md">
                                                                        <span className="text-xs text-gray-600 bg-gray-100 px-1 py-0.5 rounded-full">
                                                                            Current
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*,.svg"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            setValueIconFile(file);
                                                                            const reader = new FileReader();
                                                                            reader.onload = (event) => {
                                                                                const updated = formData.values.map(v =>
                                                                                    v.$id === value.$id ? { ...v, icon: event.target?.result as string } : v
                                                                                );
                                                                                setFormData(prev => ({ ...prev, values: updated }));
                                                                            };
                                                                            reader.readAsDataURL(file);
                                                                        }
                                                                    }}
                                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setValueIconFile(null);
                                                                        const updated = formData.values.map(v =>
                                                                            v.$id === value.$id ? { ...v, icon: '' } : v
                                                                        );
                                                                        setFormData(prev => ({ ...prev, values: updated }));
                                                                    }}
                                                                    className="px-3 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                                                                >
                                                                    Clear
                                                                </button>
                                                            </div>

                                                            {valueIconFile && editingId === value.$id && (
                                                                <div className="relative">
                                                                    <img
                                                                        src={URL.createObjectURL(valueIconFile)}
                                                                        alt="Selected icon preview"
                                                                        className="w-12 h-12 object-cover rounded border-2 border-blue-300"
                                                                    />
                                                                    <div className="absolute top-0 right-0 bg-blue-500 rounded-full p-1">
                                                                        <span className="text-xs text-white px-1 py-0.5 rounded-full">
                                                                            New
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Description <span className="text-red-500">*</span>
                                                        </label>
                                                        <textarea
                                                            value={value.description || ''}
                                                            onChange={(e) => {
                                                                const updated = formData.values.map(v =>
                                                                    v.$id === value.$id ? { ...v, description: e.target.value } : v
                                                                );
                                                                setFormData(prev => ({ ...prev, values: updated }));
                                                            }}
                                                            rows={3}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2 flex gap-2">
                                                        <button
                                                            onClick={() => handleSaveValue(value)}
                                                            disabled={valueMutation.isPending}
                                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                                        >
                                                            <Save size={16} />
                                                            {valueMutation.isPending ? 'Saving...' : 'Save'}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingId(null);
                                                                setValueIconFile(null);
                                                                if (value.isNew) {
                                                                    const filtered = formData.values.filter(v => v.$id !== value.$id);
                                                                    setFormData(prev => ({ ...prev, values: filtered }));
                                                                }
                                                            }}
                                                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                                        >
                                                            <X size={16} />
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        {value.icon ? (
                                                            <img
                                                                src={value.icon.length <= 50 ? getStorageFileUrl(value.icon) : value.icon}
                                                                alt="Value icon"
                                                                className="w-10 h-10 rounded-md object-cover border"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-md border flex items-center justify-center bg-gray-50">
                                                                <ImageIcon className="text-gray-400" size={18} />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-semibold">{value.title}</h3>
                                                                {value.$id.startsWith('default-') && (
                                                                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">Default</span>
                                                                )}
                                                            </div>
                                                            <p className="text-gray-600 text-sm">{value.description}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setEditingId(value.$id)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteValue(value.$id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Milestones Tab */}
                {activeTab === 'milestones' && (
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold">Company Milestones</h2>
                                <button
                                    onClick={() => addNewItem('milestones')}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    <Plus size={16} />
                                    Add Milestone
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {formData.milestones.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No milestones added yet. Click "Add Milestone" to get started.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {formData.milestones.map((milestone) => (
                                        <div key={milestone.$id} className="border border-gray-200 rounded-lg p-4">
                                            {editingId === milestone.$id ? (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Year <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={milestone.year || ''}
                                                            onChange={(e) => {
                                                                const updated = formData.milestones.map(m =>
                                                                    m.$id === milestone.$id ? { ...m, year: e.target.value } : m
                                                                );
                                                                setFormData(prev => ({ ...prev, milestones: updated }));
                                                            }}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            placeholder="2010"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Title <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={milestone.title || ''}
                                                            onChange={(e) => {
                                                                const updated = formData.milestones.map(m =>
                                                                    m.$id === milestone.$id ? { ...m, title: e.target.value } : m
                                                                );
                                                                setFormData(prev => ({ ...prev, milestones: updated }));
                                                            }}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            placeholder="Company Founded"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-3">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Description <span className="text-red-500">*</span>
                                                        </label>
                                                        <textarea
                                                            value={milestone.description || ''}
                                                            onChange={(e) => {
                                                                const updated = formData.milestones.map(m =>
                                                                    m.$id === milestone.$id ? { ...m, description: e.target.value } : m
                                                                );
                                                                setFormData(prev => ({ ...prev, milestones: updated }));
                                                            }}
                                                            rows={3}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            placeholder="Started with a small team..."
                                                        />
                                                    </div>
                                                    <div className="md:col-span-3 flex gap-2">
                                                        <button
                                                            onClick={() => handleSaveMilestone(milestone)}
                                                            disabled={milestoneMutation.isPending}
                                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                                        >
                                                            <Save size={16} />
                                                            {milestoneMutation.isPending ? 'Saving...' : 'Save'}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingId(null);
                                                                if (milestone.isNew) {
                                                                    const filtered = formData.milestones.filter(m => m.$id !== milestone.$id);
                                                                    setFormData(prev => ({ ...prev, milestones: filtered }));
                                                                }
                                                            }}
                                                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                                        >
                                                            <X size={16} />
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                                                                {milestone.year}
                                                            </span>
                                                            <h3 className="font-semibold">{milestone.title}</h3>
                                                            {milestone.$id.startsWith('default-') && (
                                                                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                                                                    Default
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-gray-600 text-sm mt-2">{milestone.description}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setEditingId(milestone.$id)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteMilestone(milestone.$id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};