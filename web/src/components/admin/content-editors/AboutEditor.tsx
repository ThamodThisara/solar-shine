
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Upload } from 'lucide-react';
import { fetchAboutContent, updateAboutContent } from '@/services/cmsService';
import { AboutContent } from '@/types/payload-types';

const AboutEditor: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedImages, setSelectedImages] = useState<Record<string, File | null>>({
    mainImage: null,
    imageOne: null,
    imageTwo: null
  });
  
  const { data: about, isLoading } = useQuery<AboutContent>({
    queryKey: ['aboutContent'],
    queryFn: fetchAboutContent,
    meta: {
      onError: (error: Error) => {
        console.error('Error fetching about content:', error);
        toast.error('Failed to load About content');
      }
    }
  });
  
  const updateMutation = useMutation({
    mutationFn: updateAboutContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aboutContent'] });
      setSelectedImages({
        mainImage: null,
        imageOne: null,
        imageTwo: null
      });
      toast.success('About content updated');
    },
    onError: () => toast.error('Failed to update about content')
  });
  
  const handleImageChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImages(prev => ({
        ...prev,
        [field]: e.target.files?.[0] || null
      }));
    }
  };
  
  const handleUpdateAbout = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!about) return;
    
    const formData = new FormData();
    formData.append('id', about.id || '');
    formData.append('title', about.title);
    formData.append('subtitle', about.subtitle || '');
    formData.append('content', about.content || '');
    formData.append('missionTitle', about.missionTitle || '');
    formData.append('missionDescription', about.missionDescription || '');
    formData.append('visionTitle', about.visionTitle || '');
    formData.append('visionDescription', about.visionDescription || '');
    
    if (selectedImages.mainImage) {
      formData.append('mainImage', selectedImages.mainImage);
    }
    
    if (selectedImages.imageOne) {
      formData.append('imageOne', selectedImages.imageOne);
    }
    
    if (selectedImages.imageTwo) {
      formData.append('imageTwo', selectedImages.imageTwo);
    }
    
    updateMutation.mutate(formData);
  };

  const handleFieldUpdate = (field: keyof AboutContent, value: string) => {
    if (!about) return;
    
    queryClient.setQueryData<AboutContent | undefined>(['aboutContent'], (oldData) => {
      if (!oldData) return;
      return {
        ...oldData,
        [field]: value
      }
    });
  };
  
  if (isLoading) {
    return <div className="flex justify-center p-6">Loading about content...</div>;
  }
  
  // If about doesn't exist yet, show a message and option to create default content
  if (!about) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>About Us Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8">
            <p className="text-center text-muted-foreground mb-4">
              No About Us content found in the database. Please create initial content.
            </p>
            <Button 
              onClick={() => {
                const defaultAbout = {
                  title: "About Our Company",
                  subtitle: "Sustainable Energy Solutions",
                  content: "We are a leading provider of renewable energy solutions, focused on helping individuals and businesses transition to clean, sustainable energy sources.",
                  missionTitle: "Our Mission",
                  missionDescription: "To accelerate the world's transition to sustainable energy through innovative solutions that are accessible to everyone.",
                  visionTitle: "Our Vision",
                  visionDescription: "A world powered by 100% renewable energy, with zero emissions and sustainable living for all."
                };
                
                const formData = new FormData();
                Object.entries(defaultAbout).forEach(([key, value]) => {
                  formData.append(key, value);
                });
                
                updateMutation.mutate(formData);
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
        <CardTitle>About Us Content</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdateAbout}>
          <Tabs defaultValue="main" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="main">Main Content</TabsTrigger>
              <TabsTrigger value="mission">Mission & Vision</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
            </TabsList>
            
            <TabsContent value="main" className="space-y-5">
              <div>
                <Label htmlFor="about-title">Title</Label>
                <Input 
                  id="about-title"
                  value={about.title} 
                  onChange={(e) => handleFieldUpdate('title', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="about-subtitle">Subtitle</Label>
                <Input 
                  id="about-subtitle"
                  value={about.subtitle || ''} 
                  onChange={(e) => handleFieldUpdate('subtitle', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="about-content">Content</Label>
                <Textarea 
                  id="about-content"
                  value={about.content || ''} 
                  onChange={(e) => handleFieldUpdate('content', e.target.value)}
                  rows={6}
                />
              </div>
              
              <Button 
                type="submit"
                className="mt-4"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </TabsContent>
            
            <TabsContent value="mission" className="space-y-5">
              <div>
                <Label htmlFor="mission-title">Mission Title</Label>
                <Input 
                  id="mission-title"
                  value={about.missionTitle || ''} 
                  onChange={(e) => handleFieldUpdate('missionTitle', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="mission-description">Mission Description</Label>
                <Textarea 
                  id="mission-description"
                  value={about.missionDescription || ''} 
                  onChange={(e) => handleFieldUpdate('missionDescription', e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="pt-4">
                <Label htmlFor="vision-title">Vision Title</Label>
                <Input 
                  id="vision-title"
                  value={about.visionTitle || ''} 
                  onChange={(e) => handleFieldUpdate('visionTitle', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="vision-description">Vision Description</Label>
                <Textarea 
                  id="vision-description"
                  value={about.visionDescription || ''} 
                  onChange={(e) => handleFieldUpdate('visionDescription', e.target.value)}
                  rows={4}
                />
              </div>
              
              <Button 
                type="submit"
                className="mt-4"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </TabsContent>
            
            <TabsContent value="images" className="space-y-5">
              <div>
                <Label htmlFor="main-image">Main Image</Label>
                <div className="mt-2">
                  <div className="mb-4">
                    <img 
                      src={about.mainImage || '/placeholder.svg'} 
                      alt="Main about us image" 
                      className="h-40 object-cover rounded-md border"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label 
                      htmlFor="main-image-upload" 
                      className="cursor-pointer bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-md flex items-center gap-2"
                    >
                      <Upload size={16} />
                      <span>Choose Image</span>
                    </Label>
                    <Input 
                      id="main-image-upload"
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange('mainImage')}
                    />
                    {selectedImages.mainImage && (
                      <span className="text-sm text-green-600">
                        {selectedImages.mainImage.name} selected
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-6 pt-4">
                <div className="flex-1">
                  <Label htmlFor="image-one">Image One</Label>
                  <div className="mt-2">
                    <div className="mb-4">
                      <img 
                        src={about.imageOne || '/placeholder.svg'} 
                        alt="Additional image one" 
                        className="h-40 object-cover rounded-md border w-full"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label 
                        htmlFor="image-one-upload" 
                        className="cursor-pointer bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-md flex items-center gap-2"
                      >
                        <Upload size={16} />
                        <span>Choose Image</span>
                      </Label>
                      <Input 
                        id="image-one-upload"
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange('imageOne')}
                      />
                      {selectedImages.imageOne && (
                        <span className="text-sm text-green-600">
                          {selectedImages.imageOne.name} selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <Label htmlFor="image-two">Image Two</Label>
                  <div className="mt-2">
                    <div className="mb-4">
                      <img 
                        src={about.imageTwo || '/placeholder.svg'} 
                        alt="Additional image two" 
                        className="h-40 object-cover rounded-md border w-full"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label 
                        htmlFor="image-two-upload" 
                        className="cursor-pointer bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-md flex items-center gap-2"
                      >
                        <Upload size={16} />
                        <span>Choose Image</span>
                      </Label>
                      <Input 
                        id="image-two-upload"
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange('imageTwo')}
                      />
                      {selectedImages.imageTwo && (
                        <span className="text-sm text-green-600">
                          {selectedImages.imageTwo.name} selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <Button 
                type="submit"
                className="mt-6"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </TabsContent>
          </Tabs>
        </form>
      </CardContent>
    </Card>
  );
};

export default AboutEditor;
