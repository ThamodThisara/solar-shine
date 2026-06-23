import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, Edit, Trash2, Save, Wrench, ArrowUp, ArrowDown, Info, ImageIcon, Upload, X } from 'lucide-react';
import { ServiceCard, ServicesBanner } from '@/types/payload-types';
import {
  fetchServiceCards,
  addServiceCard,
  updateServiceCard,
  deleteServiceCard
} from '@/services/serviceCardService';
import { fetchServicesBanner, updateServicesBanner } from '@/services/servicesBannerService';
import { storage, STORAGE_BUCKET_ID, ID } from '@/lib/appwrite';
import { AdditionalServicesManager } from './AdditionalServicesManager';
import { ServiceProcessManager } from './ServiceProcessManager';

export const ServicesManager: React.FC = () => {
  const [services, setServices] = useState<ServiceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceCard | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<ServiceCard>>({
    title: '',
    description: '',
    order_index: 0,
    image: '',
    benefits: [],
    features: []
  });
  const [showBannerSection, setShowBannerSection] = useState(false);
  const [bannerData, setBannerData] = useState<ServicesBanner>({
    title: '',
    subtitle: '',
    background_image: '',
  });
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string>('');
  const [isSavingBanner, setIsSavingBanner] = useState(false);

  // New state variables for service form
  const [newBenefit, setNewBenefit] = useState('');
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureDescription, setNewFeatureDescription] = useState('');
  const [serviceImageFile, setServiceImageFile] = useState<File | null>(null);
  const [serviceImagePreview, setServiceImagePreview] = useState<string>('');

  useEffect(() => {
    loadServices();
    loadBannerData();
  }, []);



  const loadServices = async () => {
    try {
      setLoading(true);
      const servicesData = await fetchServiceCards();
      setServices(servicesData);
    } catch (error) {
      console.error('Error loading services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setSaving(true);
    try {
      let imageUrl = formData.image;

      // Handle image upload if there's a new image file
      if (serviceImageFile) {
        try {
          const fileId = ID.unique();
          await storage.createFile(STORAGE_BUCKET_ID, fileId, serviceImageFile);
          imageUrl = fileId;
        } catch (error) {
          console.error('Error uploading image:', error);
          toast.error('Failed to upload image');
          setSaving(false);
          return;
        }
      }

      const serviceData = {
        title: formData.title!,
        description: formData.description || '',
        image: imageUrl,
        order_index: formData.order_index || 0,
        benefits: formData.benefits || [],
        features: formData.features || []
      };

      if (editingService) {
        await updateServiceCard({ $id: editingService.$id, ...serviceData });
        toast.success('Service updated successfully');
      } else {
        // Use the order_index from formData which is properly calculated in resetForm
        await addServiceCard({ ...serviceData, order_index: formData.order_index || 0 });
        toast.success('Service created successfully');
      }

      await loadServices();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (service: ServiceCard) => {
    setEditingService(service);
    setFormData({
      title: service.title,
      description: service.description || '',
      order_index: service.order_index || 0,
      image: service.image || '',
      benefits: service.benefits || [],
      features: service.features || []
    });
    // Set the image preview to the actual image URL for display
    if (service.image) {
      const imageUrl = getImageUrl(service.image);
      setServiceImagePreview(imageUrl || '');
    } else {
      setServiceImagePreview('');
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (serviceId: string) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await deleteServiceCard(serviceId);

      // Get the deleted service to know its order_index
      const deletedService = services.find(s => s.$id === serviceId);
      if (deletedService) {
        // Find all services that had a higher order_index than the deleted one
        const servicesToUpdate = services
          .filter(s => s.$id !== serviceId && (s.order_index || 0) > (deletedService.order_index || 0))
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        // Update their order indices to fill the gap
        for (let i = 0; i < servicesToUpdate.length; i++) {
          const newOrderIndex = (deletedService.order_index || 0) + i;
          await updateServiceCard({
            $id: servicesToUpdate[i].$id,
            order_index: newOrderIndex
          });
        }
      }

      toast.success('Service deleted successfully');
      await loadServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Failed to delete service');
    }
  };

  const handleReorder = async (serviceId: string, direction: 'up' | 'down') => {
    const serviceIndex = services.findIndex(s => s.$id === serviceId);
    if (serviceIndex === -1) return;

    const serviceToMove = services[serviceIndex];
    const targetIndex = direction === 'up' ? serviceIndex - 1 : serviceIndex + 1;

    if (targetIndex < 0 || targetIndex >= services.length) return;

    const otherService = services[targetIndex];

    try {
      // Create a new array with the reordered services
      const newServices = [...services];
      [newServices[serviceIndex], newServices[targetIndex]] = [newServices[targetIndex], newServices[serviceIndex]];

      // Update the order_index for all affected services
      const updates = newServices.map((service, index) => ({
        $id: service.$id,
        order_index: index
      }));

      // Update all services with their new order indices
      for (const update of updates) {
        await updateServiceCard(update);
      }

      await loadServices();
      toast.success('Service order updated');
    } catch (error) {
      console.error('Error reordering service:', error);
      toast.error('Failed to reorder service');
    }
  };

  const resetForm = () => {
    // Find the highest order_index and add 1 for the new service
    const maxOrderIndex = services.length > 0 ? Math.max(...services.map(s => s.order_index || 0)) : -1;

    setFormData({
      title: '',
      description: '',
      order_index: maxOrderIndex + 1,
      image: '',
      benefits: [],
      features: []
    });
    setEditingService(null);
    setServiceImageFile(null);
    setServiceImagePreview('');
    setNewBenefit('');
    setNewFeatureName('');
    setNewFeatureDescription('');
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper functions for managing benefits and features
  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData(prev => ({
        ...prev,
        benefits: [...(prev.benefits || []), newBenefit.trim()]
      }));
      setNewBenefit('');
    }
  };

  const removeBenefit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits?.filter((_, i) => i !== index) || []
    }));
  };

  const addFeature = () => {
    if (newFeatureName.trim() && newFeatureDescription.trim()) {
      const featureString = `${newFeatureName.trim()}: ${newFeatureDescription.trim()}`;
      setFormData(prev => ({
        ...prev,
        features: [...(prev.features || []), featureString]
      }));
      setNewFeatureName('');
      setNewFeatureDescription('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features?.filter((_, i) => i !== index) || []
    }));
  };

  // Helper function to get image URL from Appwrite storage
  const getImageUrl = (imageId: string | null | undefined): string | null => {
    if (!imageId) return null;

    try {
      // If it's already a full URL, return it as is
      if (imageId.startsWith('http')) {
        return imageId;
      }

      // Get the direct file URL from Appwrite storage
      const fileUrl = storage.getFileView(STORAGE_BUCKET_ID, imageId);

      if (!fileUrl) return null;

      // Convert to string safely - Appwrite returns URL objects
      return String(fileUrl);
    } catch (error) {
      console.error('Error getting image URL for ID:', imageId, error);
      return null;
    }
  };

  const handleServiceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setServiceImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setServiceImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeServiceImage = () => {
    setServiceImageFile(null);
    setServiceImagePreview('');
    setFormData(prev => ({
      ...prev,
      image: ''
    }));
  };

  const loadBannerData = async () => {
    try {
      const data = await fetchServicesBanner();
      if (data) {
        setBannerData(data);
        if (data.background_image) {
          try {
            const imageUrl = getImageUrl(data.background_image);
            setBackgroundImagePreview(imageUrl || '');
          } catch (error) {
            console.error('Error loading background image:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading banner data:', error);
    }
  };

  const handleBannerInputChange = (field: keyof ServicesBanner, value: string) => {
    setBannerData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackgroundImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBannerImage = () => {
    setBackgroundImageFile(null);
    setBackgroundImagePreview('');
    setBannerData(prev => ({
      ...prev,
      background_image: ''
    }));
  };

  const handleSaveBanner = async () => {
    if (!bannerData.title.trim()) {
      toast.error('Banner title is required');
      return;
    }

    setIsSavingBanner(true);
    try {
      const success = await updateServicesBanner({
        title: bannerData.title,
        subtitle: bannerData.subtitle || '',
        background_image_url: bannerData.background_image,
        background_image_file: backgroundImageFile,
      });

      if (success) {
        toast.success('Services banner updated successfully');
        await loadBannerData();
        setBackgroundImageFile(null);
      } else {
        toast.error('Failed to update services banner');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSavingBanner(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading services...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Services
          </h2>
          <p className="text-muted-foreground">
            Manage your service offerings and their display order
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingService ? 'Edit Service' : 'Add New Service'}
              </DialogTitle>
              <DialogDescription>
                {editingService
                  ? 'Update the service information below.'
                  : 'Fill in the details for the new service.'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Basic Information</h3>

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

                <div className="space-y-2">
                  <Label htmlFor="link_url">Link URL</Label>
                  <Input
                    id="link_url"
                    value={formData.link_url}
                    onChange={(e) => handleInputChange('link_url', e.target.value)}
                    placeholder="Enter link URL (optional)"
                    maxLength={255}
                  />
                </div>

              </div>

              <Separator />

              {/* Service Image */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Service Image</h3>

                {/* Show preview if there's an image (either new upload or existing) */}
                {(serviceImagePreview || formData.image) && (
                  <div className="relative">
                    <img
                      src={serviceImagePreview || getImageUrl(formData.image) || ''}
                      alt="Service preview"
                      className="w-full h-32 object-cover rounded-lg border"
                      onError={(e) => {
                        // If image fails to load, show fallback
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    {/* Fallback for failed images */}
                    <div
                      className="w-full h-32 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400 hidden"
                      style={{ display: 'none' }}
                    >
                      <div className="text-center">
                        <div className="text-lg mb-1">📷</div>
                        <div className="text-sm">Image Preview</div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={removeServiceImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="service-image">Upload Image</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="service-image"
                      type="file"
                      accept="image/*"
                      onChange={handleServiceImageChange}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('service-image')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Browse
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Recommended size: 400x300px. Max file size: 5MB.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Benefits Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Benefits</h3>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newBenefit}
                      onChange={(e) => setNewBenefit(e.target.value)}
                      placeholder="Enter a benefit"
                      maxLength={200}
                    />
                    <Button type="button" onClick={addBenefit} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {formData.benefits && formData.benefits.length > 0 && (
                  <div className="space-y-2">
                    {formData.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <span className="text-sm">{benefit}</span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeBenefit(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Features Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">Features</h3>

                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-2">
                    <Input
                      value={newFeatureName}
                      onChange={(e) => setNewFeatureName(e.target.value)}
                      placeholder="Feature name"
                      maxLength={100}
                    />
                    <Textarea
                      value={newFeatureDescription}
                      onChange={(e) => setNewFeatureDescription(e.target.value)}
                      placeholder="Feature description"
                      maxLength={300}
                      rows={2}
                    />
                    <Button type="button" onClick={addFeature} size="sm" className="w-fit">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Feature
                    </Button>
                  </div>
                </div>

                {formData.features && formData.features.length > 0 && (
                  <div className="space-y-2">
                    {formData.features.map((feature, index) => (
                      <div key={index} className="p-3 bg-muted rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{feature}</span>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeFeature(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* Banner Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Services Page Banner</CardTitle>
              <CardDescription>
                Manage the banner section displayed at the top of the Services page
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowBannerSection(!showBannerSection)}
            >
              {showBannerSection ? 'Hide' : 'Show'} Banner Settings
            </Button>
          </div>
        </CardHeader>
        {showBannerSection && (
          <CardContent className="space-y-6">
            {/* Banner Content Form */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Banner Content</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="banner-title">Title *</Label>
                  <Input
                    id="banner-title"
                    value={bannerData.title}
                    onChange={(e) => handleBannerInputChange('title', e.target.value)}
                    placeholder="Enter banner title"
                    maxLength={255}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="banner-subtitle">Subtitle</Label>
                  <Input
                    id="banner-subtitle"
                    value={bannerData.subtitle || ''}
                    onChange={(e) => handleBannerInputChange('subtitle', e.target.value)}
                    placeholder="Enter banner subtitle"
                    maxLength={500}
                  />
                </div>
              </div>




            </div>

            <Separator />

            {/* Background Image */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Background Image</h3>

              <div className="space-y-4">
                {/* Current Image Preview */}
                {backgroundImagePreview && (
                  <div className="relative">
                    <img
                      src={backgroundImagePreview}
                      alt="Background preview"
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={removeBannerImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Image Upload */}
                <div className="space-y-2">
                  <Label htmlFor="banner-background-image">Upload New Image</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="banner-background-image"
                      type="file"
                      accept="image/*"
                      onChange={handleBannerImageChange}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('banner-background-image')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Browse
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Recommended size: 1920x600px. Max file size: 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSaveBanner}
                disabled={isSavingBanner}
                className="min-w-[120px]"
              >
                {isSavingBanner ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Banner'
                )}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service Cards</CardTitle>
          <CardDescription>
            {services.length} service{services.length !== 1 ? 's' : ''} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Title</TableHead>
                  <TableHead className="w-[100px]">Order</TableHead>
                  <TableHead className="w-[120px]">Image</TableHead>
                  <TableHead className="w-[200px]">Benefits</TableHead>
                  <TableHead className="w-[200px]">Features</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service, index) => (
                  <TableRow key={service.$id}>
                    <TableCell className="font-medium max-w-[200px]">
                      <div className="truncate" title={service.title}>
                        {service.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
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
                    <TableCell>
                      {service.image ? (
                        <div className="w-20 h-20 rounded-lg overflow-hidden border shadow-sm relative">
                          <img
                            src={getImageUrl(service.image) || ''}
                            alt={service.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // If image fails to load, show fallback
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          {/* Fallback for failed images */}
                          <div
                            className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400 text-xs"
                            style={{ display: 'none' }}
                          >
                            <div className="text-center">
                              <div className="text-lg mb-1">📷</div>
                              <div>Image</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <div className="text-lg mb-1">📷</div>
                            <div className="text-xs">No Image</div>
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {service.benefits && service.benefits.length > 0 ? (
                        <div>
                          <div className="text-sm font-medium mb-1">Benefits:</div>
                          <ul className="text-xs space-y-1">
                            {service.benefits.slice(0, 3).map((benefit, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-primary mr-1">•</span>
                                <span className="truncate">{benefit}</span>
                              </li>
                            ))}
                            {service.benefits.length > 3 && (
                              <li className="text-xs text-gray-500">
                                +{service.benefits.length - 3} more
                              </li>
                            )}
                          </ul>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No benefits</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {service.features && service.features.length > 0 ? (
                        <div>
                          <div className="text-sm font-medium mb-1">Features:</div>
                          <ul className="text-xs space-y-1">
                            {service.features.slice(0, 3).map((feature, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-primary mr-1">•</span>
                                <span className="truncate">{feature}</span>
                              </li>
                            ))}
                            {service.features.length > 3 && (
                              <li className="text-xs text-gray-500">
                                +{service.features.length - 3} more
                              </li>
                            )}
                          </ul>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">No features</span>
                      )}
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
              <p>No services added yet.</p>
              <p>Click "Add Service" to create your service offerings.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Services Management */}
      <AdditionalServicesManager />

      {/* Service Process Management */}
      <ServiceProcessManager />
    </div>
  );
};
