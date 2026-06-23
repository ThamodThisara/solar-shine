import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Loader2, Image as ImageIcon, Link, Type } from 'lucide-react';
import { toast } from 'sonner';
import { fetchHeroSection, updateHeroSection } from '@/services/heroService';
import { HeroSection } from '@/types/payload-types';

export const HeroSectionManager: React.FC = () => {
  const [heroData, setHeroData] = useState<HeroSection>({
    title: '',
    subtitle: '',
    description: '',
    background_image: '',
    cta_text: '',
    cta_url: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string>('');

  useEffect(() => {
    loadHeroSection();

    // Cleanup function to revoke object URLs
    return () => {
      if (previewImage && previewImage.startsWith('blob:')) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, []);

  const loadHeroSection = async () => {
    setIsLoading(true);
    try {
      const data = await fetchHeroSection();
      if (data) {
        setHeroData(data);
        if (data.background_image) {
          // Ensure the image URL is properly formatted for display
          const imageUrl = data.background_image.startsWith('http')
            ? data.background_image
            : `${import.meta.env.VITE_APPWRITE_ENDPOINT}/storage/buckets/${import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_ID}/files/${data.background_image}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID}`;
          setPreviewImage(imageUrl);
        }
      }
      toast.success('Hero section loaded successfully');
    } catch (error) {
      console.error('Error loading hero section:', error);
      toast.error('Failed to load hero section');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!heroData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsSaving(true);
    try {
      const success = await updateHeroSection({
        title: heroData.title,
        subtitle: heroData.subtitle || '',
        description: heroData.description || '',
        cta_text: heroData.cta_text || '',
        cta_url: heroData.cta_url || '',
        background_image_url: previewImage,
        background_image_file: backgroundImageFile || undefined
      });

      if (success) {
        toast.success('Hero section saved successfully');
        loadHeroSection(); // Reload to get updated data
      } else {
        toast.error('Failed to save hero section');
      }
    } catch (error) {
      console.error('Error saving hero section:', error);
      toast.error('Failed to save hero section');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof HeroSection, value: string) => {
    setHeroData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackgroundImageFile(file);
      // Create a preview URL for the selected file
      const previewUrl = URL.createObjectURL(file);
      setPreviewImage(previewUrl);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading hero section...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Type className="h-6 w-6" />
            Hero Section Manager
          </h2>
          <p className="text-muted-foreground">
            Manage the main hero section content on your homepage
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Content Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              Hero Content
            </CardTitle>
            <CardDescription>
              Main headline and descriptive content for your hero section
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={heroData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Enter hero title"
                maxLength={255}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Textarea
                id="subtitle"
                value={heroData.subtitle || ''}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                placeholder="Enter hero subtitle"
                maxLength={500}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={heroData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Enter hero description"
                maxLength={1000}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Call to Action
            </CardTitle>
            <CardDescription>
              Button text and link for the hero section
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cta_text">Button Text</Label>
                <Input
                  id="cta_text"
                  value={heroData.cta_text || ''}
                  onChange={(e) => handleChange('cta_text', e.target.value)}
                  placeholder="Get Started"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cta_url">Button Link</Label>
                <Input
                  id="cta_url"
                  value={heroData.cta_url || ''}
                  onChange={(e) => handleChange('cta_url', e.target.value)}
                  placeholder="/contact"
                  maxLength={255}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Background Image */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Background Image
            </CardTitle>
            <CardDescription>
              Upload a background image for the hero section
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="background_image">Background Image</Label>
              <Input
                id="background_image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="cursor-pointer"
              />
            </div>
            {previewImage && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={previewImage}
                    alt="Background preview"
                    className="w-full h-48 object-cover"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Preview how your hero section will look
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="relative h-64 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center"
              style={{
                backgroundImage: previewImage ? `url(${previewImage})` : 'none', /* This is just CSS, not a field name */
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="absolute inset-0 bg-black bg-opacity-40"></div>
              <div className="relative text-center text-white space-y-4 p-6">
                <h1 className="text-3xl font-bold">
                  {heroData.title || 'Your Hero Title'}
                </h1>
                {heroData.subtitle && (
                  <p className="text-lg opacity-90">
                    {heroData.subtitle}
                  </p>
                )}
                {heroData.description && (
                  <p className="text-base opacity-80">
                    {heroData.description}
                  </p>
                )}
                {heroData.cta_text && (
                  <Button className="mt-4">
                    {heroData.cta_text}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
