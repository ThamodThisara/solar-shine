import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Upload } from 'lucide-react';
import { fetchHeroSection, updateHeroSection } from '@/services/heroService';
import { HeroSection } from '@/types/payload-types';

const HeroEditor: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedImageInfo, setSelectedImageInfo] = useState<{ name: string; resolution: string } | null>(null);
  const [currentImageRes, setCurrentImageRes] = useState<string | null>(null);
  
  const { data: hero, isLoading } = useQuery<HeroSection>({
    queryKey: ['heroSection'],
    queryFn: fetchHeroSection,
    meta: {
      onError: (error: Error) => {
        console.error('Error fetching hero section:', error);
        toast.error('Failed to load hero section');
      }
    }
  });
  
  useEffect(() => {
    if (hero?.background_image) {
      const img = new Image();
      img.onload = () => {
        setCurrentImageRes(`${img.width} x ${img.height}px`);
      };
      img.onerror = () => {
        setCurrentImageRes('N/A');
      };
      const cleanUrl = hero.background_image.split('?')[0];
      img.src = cleanUrl;
    } else {
      setCurrentImageRes(null);
    }
  }, [hero?.background_image]);
  
  const updateMutation = useMutation({
    mutationFn: updateHeroSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heroSection'] });
      setSelectedImage(null);
      setPreviewUrl(null);
      setSelectedImageInfo(null);
      toast.success('Hero section updated successfully');
    },
    onError: () => toast.error('Failed to update hero section')
  });
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setSelectedImageInfo(null); // Reset while loading
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      const img = new Image();
      img.onload = () => {
        setSelectedImageInfo({
          name: file.name,
          resolution: `${img.width} x ${img.height}px`,
        });
        URL.revokeObjectURL(img.src);
      };
      img.src = objectUrl;
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hero) return;
    
    const formData = new FormData();
    // Create the update object with the correct structure that the service expects
    const updateData = {
      title: hero.title,
      subtitle: hero.subtitle || '',
      description: hero.description || '',
      cta_text: hero.cta_text || '',
      cta_url: hero.cta_url || '',
      background_image_url: hero.background_image || '',
      ...(selectedImage && { background_image_file: selectedImage })
    };
    
    updateMutation.mutate(updateData);
  };
  
  const handleFieldUpdate = (field: keyof HeroSection, value: string) => {
    if (!hero) return;
    
    queryClient.setQueryData(['heroSection'], {
      ...hero,
      [field]: value
    });
  };
  
  if (isLoading) {
    return <div className="flex justify-center p-6">Loading hero section data...</div>;
  }
  
  if (!hero) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hero Section</CardTitle>
          <CardDescription>Create the hero section for your homepage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8">
            <p className="text-center text-muted-foreground mb-4">
              No hero section found in the database. Please create initial content.
            </p>
            <Button 
              onClick={() => {
                const defaultHero = {
                  title: "Your Renewable Energy Partner",
                  subtitle: "Professional solar solutions for homes and businesses across Sri Lanka",
                  description: "",
                  cta_text: "Get a Free Quote",
                  cta_url: "/contact",
                  background_image_url: ""
                };
                
                updateMutation.mutate(defaultHero);
              }}
            >
              Create Default Content
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero Section</CardTitle>
        <CardDescription>Edit your homepage hero section</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title"
              value={hero.title} 
              onChange={(e) => handleFieldUpdate('title', e.target.value)}
              placeholder="Enter headline"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="subtitle">Subtitle</Label>
            <Textarea 
              id="subtitle"
              value={hero.subtitle || ''} 
              onChange={(e) => handleFieldUpdate('subtitle', e.target.value)}
              placeholder="Enter subheadline"
              className="mt-1"
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cta-text">CTA Button Text</Label>
              <Input 
                id="cta-text"
                value={hero.cta_text || ''} 
                onChange={(e) => handleFieldUpdate('cta_text', e.target.value)}
                placeholder="Get Started"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="cta-link">CTA Button Link</Label>
              <Input 
                id="cta-link"
                value={hero.cta_url || ''} 
                onChange={(e) => handleFieldUpdate('cta_url', e.target.value)}
                placeholder="/contact"
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Background Image</Label>
            <div className="mt-2 mb-4">
              <img 
                src={previewUrl || hero.background_image || ''} 
                alt="Hero background" 
                className="w-full h-48 object-cover rounded-md border"
              />
              {currentImageRes && !previewUrl && (
                <p className="text-sm text-muted-foreground mt-1">Resolution: {currentImageRes}</p>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Label 
                htmlFor="hero-image" 
                className="cursor-pointer bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-md flex items-center gap-2"
              >
                <Upload size={16} />
                <span>{hero.background_image ? 'Change Image' : 'Upload Image'}</span>
              </Label>
              <Input 
                id="hero-image"
                type="file" 
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              {selectedImage && (
                <span className="text-sm text-muted-foreground break-all">
                  {selectedImageInfo
                    ? `${selectedImageInfo.name} (${selectedImageInfo.resolution})`
                    : `${selectedImage.name} (loading...)`}
                </span>
              )}
            </div>
          </div>
          
          <Button type="submit" className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default HeroEditor;
