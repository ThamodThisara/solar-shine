import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, Search, Globe, Share2, FileText, Image as ImageIcon, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { 
  fetchSEOSettings,
  updateSEOSettings, 
  fetchAllPageSEO, 
  addPageSEO, 
  updatePageSEO,
  deletePageSEO,
  SEOSettings, 
  PageSEO 
} from '@/services/seoService';

export const SEOManager: React.FC = () => {
  const [seoSettings, setSeoSettings] = useState<SEOSettings>({
    site_title: '',
    site_description: '',
    site_keywords: '',
    author: '',
    site_url: '',
    default_og_image: '',
    twitter_handle: '',
    facebook_app_id: '',
    google_analytics_id: '',
    google_search_console_id: '',
    robots_txt: '',
    sitemap_url: ''
  });

  const [pageSEO, setPageSEO] = useState<PageSEO[]>([]);
  const [newPageSEO, setNewPageSEO] = useState<PageSEO>({
    page_path: '',
    page_title: '',
    meta_description: '',
    meta_keywords: '',
    og_title: '',
    og_description: '',
    og_image: '',
    canonical_url: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('global');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editedPageSEO, setEditedPageSEO] = useState<PageSEO | null>(null);

  useEffect(() => {
    loadSEOSettings();
    loadPageSEO();
  }, []);

  const loadSEOSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await fetchSEOSettings();
      if (settings) {
        setSeoSettings(settings);
      } else {
        // Set default values if no settings exist
        setSeoSettings({
          site_title: 'Solar Shine - Professional Solar Panel Installation',
          site_description: 'Expert solar panel installation and maintenance services. Transform your home with clean, renewable energy solutions.',
          site_keywords: 'solar panels, renewable energy, solar installation, clean energy, solar maintenance',
          author: 'Solar Shine Team',
          site_url: 'https://solarshine.com',
          default_og_image: '',
          twitter_handle: '@solarshine',
          facebook_app_id: '',
          google_analytics_id: '',
          google_search_console_id: '',
          robots_txt: 'User-agent: *\nAllow: /',
          sitemap_url: '/sitemap.xml'
        });
      }
    } catch (error) {
      console.error('Error loading SEO settings:', error);
      toast.error('Failed to load SEO settings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPageSEO = async () => {
    try {
      const pageSEOList = await fetchAllPageSEO();
      setPageSEO(pageSEOList);
    } catch (error) {
      console.error('Error loading page SEO:', error);
      toast.error('Failed to load page SEO settings');
    }
  };

  const handleSaveGlobalSEO = async () => {
    setIsSaving(true);
    try {
      const success = await updateSEOSettings(seoSettings);
      if (success) {
        toast.success('Global SEO settings saved successfully');
      } else {
        toast.error('Failed to save SEO settings');
      }
    } catch (error) {
      console.error('Error saving SEO settings:', error);
      toast.error('Failed to save SEO settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPageSEO = async () => {
    if (!newPageSEO.page_path.trim() || !newPageSEO.page_title.trim()) {
      toast.error('Page path and title are required');
      return;
    }

    setIsSaving(true);
    try {
      const success = await addPageSEO(newPageSEO);
      if (success) {
        setNewPageSEO({
          page_path: '',
          page_title: '',
          meta_description: '',
          meta_keywords: '',
          og_title: '',
          og_description: '',
          og_image: '',
          canonical_url: ''
        });
        await loadPageSEO(); // Reload the page SEO list
        toast.success('Page SEO settings added successfully');
      } else {
        toast.error('Failed to add page SEO settings');
      }
    } catch (error) {
      console.error('Error adding page SEO:', error);
      toast.error('Failed to add page SEO settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePageSEO = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this page SEO setting?')) return;

    try {
      const success = await deletePageSEO(id);
      if (success) {
        toast.success('Page SEO deleted successfully');
        loadPageSEO(); // Refresh list
      } else {
        toast.error('Failed to delete page SEO');
      }
    } catch (error) {
      console.error('Error deleting page SEO:', error);
      toast.error('Failed to delete page SEO');
    }
  };

  const handleUpdatePageSEO = async () => {
    if (!editedPageSEO) return;
    setIsSaving(true);
    try {
      const success = await updatePageSEO(editedPageSEO);
      if (success) {
        toast.success('Page SEO updated successfully');
        setEditingPageId(null);
        setEditedPageSEO(null);
        loadPageSEO();
      } else {
        toast.error('Failed to update page SEO');
      }
    } catch (error) {
      console.error('Error updating page SEO:', error);
      toast.error('Failed to update page SEO');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (page: PageSEO) => {
    setEditingPageId(page.$id!);
    setEditedPageSEO({ ...page });
  };

  const cancelEditing = () => {
    setEditingPageId(null);
    setEditedPageSEO(null);
  };

  const handleEditedPageSEOChange = (field: keyof PageSEO, value: string) => {
    if (editedPageSEO) {
      setEditedPageSEO({ ...editedPageSEO, [field]: value });
    }
  };

  const handleSEOChange = (field: keyof SEOSettings, value: string) => {
    setSeoSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNewPageSEOChange = (field: keyof PageSEO, value: string) => {
    setNewPageSEO(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading SEO settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Search className="h-6 w-6" />
            SEO Manager
          </h2>
          <p className="text-muted-foreground">
            Manage global SEO settings and page-specific meta tags
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="global">Global SEO</TabsTrigger>
          <TabsTrigger value="pages">Page SEO</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Global SEO Settings
              </CardTitle>
              <CardDescription>
                Default SEO settings that apply across your entire website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="site_title">Site Title</Label>
                  <Input
                    id="site_title"
                    value={seoSettings.site_title}
                    onChange={(e) => handleSEOChange('site_title', e.target.value)}
                    placeholder="Your Site Title"
                    maxLength={60}
                  />
                  <div className="text-xs text-muted-foreground">
                    {seoSettings.site_title.length}/60 characters
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={seoSettings.author}
                    onChange={(e) => handleSEOChange('author', e.target.value)}
                    placeholder="Author Name"
                    maxLength={100}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="site_description">Site Description</Label>
                <Textarea
                  id="site_description"
                  value={seoSettings.site_description}
                  onChange={(e) => handleSEOChange('site_description', e.target.value)}
                  placeholder="Brief description of your website"
                  maxLength={160}
                  rows={3}
                />
                <div className="text-xs text-muted-foreground">
                  {seoSettings.site_description.length}/160 characters
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="site_keywords">Keywords</Label>
                <Textarea
                  id="site_keywords"
                  value={seoSettings.site_keywords}
                  onChange={(e) => handleSEOChange('site_keywords', e.target.value)}
                  placeholder="keyword1, keyword2, keyword3"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="site_url">Site URL</Label>
                <Input
                  id="site_url"
                  value={seoSettings.site_url}
                  onChange={(e) => handleSEOChange('site_url', e.target.value)}
                  placeholder="https://yoursite.com"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveGlobalSEO} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Global Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Page-Specific SEO
              </CardTitle>
              <CardDescription>
                Configure SEO settings for individual pages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add New Page SEO */}
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">Add New Page SEO</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_page_path">Page Path</Label>
                    <Input
                      id="new_page_path"
                      value={newPageSEO.page_path}
                      onChange={(e) => handleNewPageSEOChange('page_path', e.target.value)}
                      placeholder="/about"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_page_title">Page Title</Label>
                    <Input
                      id="new_page_title"
                      value={newPageSEO.page_title}
                      onChange={(e) => handleNewPageSEOChange('page_title', e.target.value)}
                      placeholder="About Us - Your Site"
                      maxLength={60}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new_meta_description">Meta Description</Label>
                  <Textarea
                    id="new_meta_description"
                    value={newPageSEO.meta_description}
                    onChange={(e) => handleNewPageSEOChange('meta_description', e.target.value)}
                    placeholder="Page description for search engines"
                    maxLength={160}
                    rows={2}
                  />
                </div>

                <Button onClick={handleAddPageSEO} disabled={isSaving}>
                  <FileText className="mr-2 h-4 w-4" />
                  Add Page SEO
                </Button>
              </div>

              {/* Existing Page SEO */}
              <div className="space-y-4">
                <h4 className="font-medium">Existing Pages</h4>
                {pageSEO.map((page) => (
                  <Card key={page.$id}>
                    {editingPageId === page.$id ? (
                      <CardContent className="p-4 space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`edit_page_path_${page.$id}`}>Page Path</Label>
                            <Input
                              id={`edit_page_path_${page.$id}`}
                              value={editedPageSEO?.page_path || ''}
                              onChange={(e) => handleEditedPageSEOChange('page_path', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`edit_page_title_${page.$id}`}>Page Title</Label>
                            <Input
                              id={`edit_page_title_${page.$id}`}
                              value={editedPageSEO?.page_title || ''}
                              onChange={(e) => handleEditedPageSEOChange('page_title', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`edit_meta_description_${page.$id}`}>Meta Description</Label>
                          <Textarea
                            id={`edit_meta_description_${page.$id}`}
                            value={editedPageSEO?.meta_description || ''}
                            onChange={(e) => handleEditedPageSEOChange('meta_description', e.target.value)}
                            rows={2}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={cancelEditing}>Cancel</Button>
                          <Button onClick={handleUpdatePageSEO} disabled={isSaving}>
                            {isSaving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save Changes'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    ) : (
                      <>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">{page.page_title}</CardTitle>
                              <CardDescription>{page.page_path}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                               <Button variant="ghost" size="icon" onClick={() => startEditing(page)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeletePageSEO(page.$id!)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-muted-foreground">
                            {page.meta_description}
                          </div>
                        </CardContent>
                      </>
                    )}
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Social Media Settings
              </CardTitle>
              <CardDescription>
                Configure social media integration and Open Graph settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="twitter_handle">Twitter Handle</Label>
                  <Input
                    id="twitter_handle"
                    value={seoSettings.twitter_handle}
                    onChange={(e) => handleSEOChange('twitter_handle', e.target.value)}
                    placeholder="@yourhandle"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook_app_id">Facebook App ID</Label>
                  <Input
                    id="facebook_app_id"
                    value={seoSettings.facebook_app_id}
                    onChange={(e) => handleSEOChange('facebook_app_id', e.target.value)}
                    placeholder="Your Facebook App ID"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_og_image">Default Open Graph Image URL</Label>
                <Input
                  id="default_og_image"
                  value={seoSettings.default_og_image}
                  onChange={(e) => handleSEOChange('default_og_image', e.target.value)}
                  placeholder="https://yoursite.com/og-image.jpg"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveGlobalSEO} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Social Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Technical SEO
              </CardTitle>
              <CardDescription>
                Manage technical aspects like analytics, search console, and robots.txt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="google_analytics_id">Google Analytics ID</Label>
                  <Input
                    id="google_analytics_id"
                    value={seoSettings.google_analytics_id}
                    onChange={(e) => handleSEOChange('google_analytics_id', e.target.value)}
                    placeholder="UA-XXXXX-Y"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google_search_console_id">Google Search Console ID</Label>
                  <Input
                    id="google_search_console_id"
                    value={seoSettings.google_search_console_id}
                    onChange={(e) => handleSEOChange('google_search_console_id', e.target.value)}
                    placeholder="Verification code"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sitemap_url">Sitemap URL</Label>
                <Input
                  id="sitemap_url"
                  value={seoSettings.sitemap_url}
                  onChange={(e) => handleSEOChange('sitemap_url', e.target.value)}
                  placeholder="/sitemap.xml"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="robots_txt">robots.txt Content</Label>
                <Textarea
                  id="robots_txt"
                  value={seoSettings.robots_txt}
                  onChange={(e) => handleSEOChange('robots_txt', e.target.value)}
                  placeholder="User-agent: *&#10;Allow: /"
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveGlobalSEO} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Technical Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};