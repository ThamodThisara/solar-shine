import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Save, Loader2, Settings, Mail, Phone, MapPin, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';

interface GlobalSettings {
  $id?: string;
  site_title: string;
  site_description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
}

export const GlobalSettingsManager: React.FC = () => {
  const [settings, setSettings] = useState<GlobalSettings>({
    site_title: '',
    site_description: '',
    contact_email: '',
    contact_phone: '',
    address: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await databases.listDocuments(
        '6873ba790033a7d5cfdb', // Database ID from appwrite.json
        'global_settings' // Collection ID from appwrite.json
      );
      
      if (response.documents.length > 0) {
        const doc = response.documents[0];
        setSettings({
          $id: doc.$id,
          site_title: doc.site_title || '',
          site_description: doc.site_description || '',
          contact_email: doc.contact_email || '',
          contact_phone: doc.contact_phone || '',
          address: doc.address || ''
        });
      } else {
        // No settings exist yet, use defaults
        setSettings({
          site_title: 'Solar Shine',
          site_description: 'Professional solar panel installation and maintenance services',
          contact_email: 'info@solarshine.com',
          contact_phone: '+1 (555) 123-4567',
          address: '123 Solar Street, Energy City, EC 12345'
        });
      }
      toast.success('Settings loaded successfully');
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.site_title.trim()) {
      toast.error('Site title is required');
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        site_title: settings.site_title,
        site_description: settings.site_description,
        contact_email: settings.contact_email,
        contact_phone: settings.contact_phone,
        address: settings.address
      };

      if (settings.$id) {
        // Update existing document
        await databases.updateDocument(
          '6873ba790033a7d5cfdb', // Database ID
          'global_settings', // Collection ID
          settings.$id,
          data
        );
      } else {
        // Create new document
        const response = await databases.createDocument(
          '6873ba790033a7d5cfdb', // Database ID
          'global_settings', // Collection ID
          'unique()', // Document ID
          data
        );
        setSettings(prev => ({ ...prev, $id: response.$id }));
      }
      
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof GlobalSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Global Settings
          </h2>
          <p className="text-muted-foreground">
            Manage site-wide configuration and contact information
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
              Save Settings
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Site Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Site Information
            </CardTitle>
            <CardDescription>
              Basic information about your website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site_title">Site Title</Label>
              <Input
                id="site_title"
                value={settings.site_title}
                onChange={(e) => handleChange('site_title', e.target.value)}
                placeholder="Enter site title"
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site_description">Site Description</Label>
              <Textarea
                id="site_description"
                value={settings.site_description}
                onChange={(e) => handleChange('site_description', e.target.value)}
                placeholder="Enter site description"
                maxLength={500}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </CardTitle>
            <CardDescription>
              Contact details displayed on your website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Contact Email
                </Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={settings.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  placeholder="contact@example.com"
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contact Phone
                </Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={settings.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  maxLength={50}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Business Address
              </Label>
              <Textarea
                id="address"
                value={settings.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Enter business address"
                maxLength={500}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Changes are saved automatically when you click Save</span>
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
                    Save All Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
