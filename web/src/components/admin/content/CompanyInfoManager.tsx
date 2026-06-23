import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Building, Save, Loader2, Clock, Image, Upload, X } from 'lucide-react';
import { fetchCompanyInfo, updateCompanyInfo } from '@/services/companyService';
import { CompanyInfo } from '@/types/payload-types';
import { storage, STORAGE_BUCKET_ID, ID } from '@/lib/appwrite';

export const CompanyInfoManager: React.FC = () => {
    const [formData, setFormData] = useState<Partial<CompanyInfo>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const queryClient = useQueryClient();

    const { data: companyInfo, isLoading, error } = useQuery({
        queryKey: ['companyInfo'],
        queryFn: fetchCompanyInfo
    });

    const updateMutation = useMutation({
        mutationFn: updateCompanyInfo,
        onSuccess: () => {
            toast.success('Company information updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['companyInfo'] });
            setIsEditing(false);
            setLogoFile(null);

            // Update the logo preview from the current form data
            if (formData.logo_url) {
                setLogoPreview(formData.logo_url);
            }
        },
        onError: (error) => {
            toast.error('Failed to update company information');
            console.error('Update error:', error);
        }
    });

    useEffect(() => {
        if (companyInfo) {
            setFormData(companyInfo);
            // Set logo preview from existing logo URL
            if (companyInfo.logo_url) {
                setLogoPreview(companyInfo.logo_url);
            } else {
                setLogoPreview('');
            }
        }
    }, [companyInfo]);

    // Watch for changes in logo_url field
    useEffect(() => {
        if (formData.logo_url) {
            setLogoPreview(formData.logo_url);
        }
    }, [formData.logo_url]);

    const handleInputChange = (field: keyof CompanyInfo, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validateLogoFile = (file: File): boolean => {
        // Check file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file');
            return false;
        }

        // Check file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            toast.error('Logo file size must be less than 5MB');
            return false;
        }

        return true;
    };

    const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (validateLogoFile(file)) {
                setLogoFile(file);
                // Create preview from the selected file
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (e.target?.result) {
                        setLogoPreview(e.target.result as string);
                    }
                };
                reader.readAsDataURL(file);
            } else {
                // Reset the input
                event.target.value = '';
            }
        }
    };

    const uploadLogoToStorage = async (file: File): Promise<string | null> => {
        try {
            setIsUploading(true);

            // Create a unique filename
            const fileExtension = file.name.split('.').pop();
            const fileName = `company-logo-${Date.now()}.${fileExtension}`;

            // Upload to Appwrite storage
            const uploadedFile = await storage.createFile(
                STORAGE_BUCKET_ID,
                ID.unique(),
                file
            );

            // Generate the correct file URL using the same pattern as other services
            const fileUrl = `${import.meta.env.VITE_APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${uploadedFile.$id}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID}`;

            toast.success('Logo uploaded successfully!');
            return fileUrl;
        } catch (error) {
            console.error('Logo upload error:', error);
            toast.error('Failed to upload logo. Please try again.');
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    const removeLogo = () => {
        setLogoFile(null);
        setLogoPreview('');
        setFormData(prev => ({
            ...prev,
            logo_url: ''
        }));
        // Clear the file input
        const fileInput = document.getElementById('logo') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    };

    const handleSave = async () => {
        if (!formData.name) {
            toast.error('Company name is required');
            return;
        }

        try {
            let logoUrl = formData.logo_url;

            // If there's a new logo file, upload it first
            if (logoFile) {
                const uploadedUrl = await uploadLogoToStorage(logoFile);
                if (uploadedUrl) {
                    logoUrl = uploadedUrl;
                } else {
                    toast.error('Failed to upload logo. Please try again.');
                    return;
                }
            }

            // Update form data with new logo URL
            const updatedFormData = {
                ...formData,
                logo_url: logoUrl
            };

            // Save company info
            updateMutation.mutate(updatedFormData as CompanyInfo);
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Failed to save company information');
        }
    };

    const handleCancel = () => {
        setFormData(companyInfo || {});
        setLogoFile(null);
        // Reset logo preview to original state
        if (companyInfo?.logo_url) {
            setLogoPreview(companyInfo.logo_url);
        } else {
            setLogoPreview('');
        }
        setIsEditing(false);
        // Clear the file input
        const fileInput = document.getElementById('logo') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8 text-red-600">
                Failed to load company information. Please try again.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Company Information</h2>
                    <p className="text-gray-600">Manage your business details and company branding</p>
                </div>
                <div className="flex space-x-2">
                    {!isEditing ? (
                        <Button onClick={() => setIsEditing(true)}>
                            <Building className="h-4 w-4 mr-2" />
                            Edit Information
                        </Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={updateMutation.isPending || isUploading}
                            >
                                {updateMutation.isPending || isUploading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                {isUploading ? 'Uploading...' : 'Save Changes'}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Basic Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Building className="h-5 w-5 mr-2" />
                        Basic Information
                    </CardTitle>
                    <CardDescription>
                        Core business details and company description
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Company Name *</Label>
                            <Input
                                id="name"
                                value={formData.name || ''}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                disabled={!isEditing}
                                placeholder="Solar Shine Solutions"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="website">Website</Label>
                            <Input
                                id="website"
                                value={formData.website || ''}
                                onChange={(e) => handleInputChange('website', e.target.value)}
                                disabled={!isEditing}
                                placeholder="https://solarshine.com"
                                type="url"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Company Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description || ''}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            disabled={!isEditing}
                            placeholder="Describe your company's mission, values, and expertise..."
                            rows={4}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Logo Management */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Image className="h-5 w-5 mr-2" />
                        Logo Management
                    </CardTitle>
                    <CardDescription>
                        Upload and manage your company logo
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Current Logo Display */}
                    <div className="space-y-2">
                        <Label>Current Logo</Label>
                        {logoPreview ? (
                            <div className="flex items-center space-x-4">
                                <div className="border rounded-lg bg-gray-50 p-2">
                                    <img
                                        src={logoPreview}
                                        alt="Company Logo"
                                        className="h-20 w-20 object-contain"
                                        onError={(e) => {
                                            console.error('Logo image failed to load:', logoPreview);
                                            console.error('Error event:', e);
                                            // If image fails to load, show placeholder
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            setLogoPreview('');
                                        }}
                                        onLoad={(e) => {
                                            console.log('Logo image loaded successfully:', logoPreview);
                                        }}
                                    />
                                </div>
                                {isEditing && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={removeLogo}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Remove Logo
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-20 w-20 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                                <div className="text-center text-gray-500">
                                    <Image className="h-8 w-8 mx-auto mb-1" />
                                    <p className="text-xs">No Logo</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Logo Upload */}
                    {isEditing && (
                        <div className="space-y-2">
                            <Label htmlFor="logo">Upload New Logo</Label>
                            <div className="flex items-center space-x-2">
                                <Input
                                    id="logo"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoChange}
                                    className="flex-1"
                                    disabled={isUploading}
                                />
                                {logoFile && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={isUploading}
                                        onClick={() => setLogoFile(null)}
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Clear
                                    </Button>
                                )}
                            </div>
                            <p className="text-sm text-gray-500">
                                Recommended: Square image, 200x200px or larger, PNG or JPG format, max 5MB
                            </p>
                            {logoFile && (
                                <p className="text-sm text-green-600">
                                    ✓ Selected: {logoFile.name} ({(logoFile.size / 1024 / 1024).toFixed(2)} MB)
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Business Hours */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Clock className="h-5 w-5 mr-2" />
                        Business Hours
                    </CardTitle>
                    <CardDescription>
                        When your business is open for customers
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="businessHours">Business Hours</Label>
                        <Textarea
                            id="businessHours"
                            value={formData.businessHours || ''}
                            onChange={(e) => handleInputChange('businessHours', e.target.value)}
                            disabled={!isEditing}
                            placeholder="Monday - Friday: 8:00 AM - 6:00 PM&#10;Saturday: 9:00 AM - 4:00 PM&#10;Sunday: Closed"
                            rows={4}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
