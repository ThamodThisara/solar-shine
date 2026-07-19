import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Save, Home, ShoppingBag, Award, Building, MessageSquare, BookOpen, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { homeContentService, HomeContent, DEFAULT_HOME_CONTENT } from '@/services/homeContentService';

interface SectionField {
  titleKey: keyof HomeContent;
  descKey: keyof HomeContent;
  label: string;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECTIONS: SectionField[] = [
  {
    titleKey: 'services_title',
    descKey: 'services_description',
    label: 'Our Services',
    helper: 'Heading shown above the service cards on the Home page.',
    icon: ShoppingBag,
  },
  {
    titleKey: 'specialized_title',
    descKey: 'specialized_description',
    label: 'Our Specialized Areas',
    helper: 'Heading shown above the specialized areas grid.',
    icon: Award,
  },
  {
    titleKey: 'projects_title',
    descKey: 'projects_description',
    label: 'Our Recent Projects',
    helper: 'Heading shown above the recent projects showcase.',
    icon: Building,
  },
  {
    titleKey: 'testimonials_title',
    descKey: 'testimonials_description',
    label: 'What Our Clients Say',
    helper: 'Heading shown above the testimonials carousel.',
    icon: MessageSquare,
  },
  {
    titleKey: 'blog_title',
    descKey: 'blog_description',
    label: 'Latest Insights',
    helper: 'Heading shown above the blog / insights section.',
    icon: BookOpen,
  },
  {
    titleKey: 'appointment_title',
    descKey: 'appointment_description',
    label: 'Book an Appointment',
    helper: 'Heading shown above the appointment booking form.',
    icon: Calendar,
  },
];

export const HomeContentManager: React.FC = () => {
  const [content, setContent] = useState<HomeContent>({ ...DEFAULT_HOME_CONTENT });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const data = await homeContentService.fetchHomeContent();
      setContent(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load home content',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof HomeContent, value: string) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const success = await homeContentService.updateHomeContent(content);
      if (success) {
        toast({
          title: 'Success',
          description: 'Home content saved successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to save home content',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save home content',
        variant: 'destructive',
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
          <p className="text-muted-foreground">Loading Home content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Home Content Manager</h1>
              <p className="text-muted-foreground mt-1">
                Edit the section titles and descriptions shown on the Home page
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="px-6">
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
      </div>

      {/* Section editors */}
      {SECTIONS.map(section => {
        const Icon = section.icon;
        return (
          <Card key={section.titleKey} className="border border-border/50 hover:border-border transition-all duration-200">
            <CardHeader className="border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">{section.label}</CardTitle>
                  <p className="text-sm text-muted-foreground">{section.helper}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label className="text-sm font-medium">Title</Label>
                <Input
                  value={(content[section.titleKey] as string) || ''}
                  onChange={e => handleChange(section.titleKey, e.target.value)}
                  placeholder="Enter section title"
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <Textarea
                  value={(content[section.descKey] as string) || ''}
                  onChange={e => handleChange(section.descKey, e.target.value)}
                  placeholder="Enter section description"
                  rows={3}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Footer save */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} className="px-8">
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
    </div>
  );
};

export default HomeContentManager;
