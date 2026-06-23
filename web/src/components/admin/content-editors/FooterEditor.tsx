import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Save, Trash2 } from 'lucide-react';
import { 
  fetchFooterData, 
  updateCompanyInfo, 
  fetchSocialLinks, 
  updateSocialLink,
  addSocialLink,
  deleteSocialLink,
  fetchFooterLinks,
  updateFooterLink,
  addFooterLink,
  deleteFooterLink
} from '@/services/cmsService';
import { CompanyInfo, SocialLink, FooterLink } from '@/types/payload-types';

const FooterEditor: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('company');
  const [newSocialLink, setNewSocialLink] = useState({ name: '', icon: '', url: '' });
  const [newFooterLink, setNewFooterLink] = useState({ name: '', url: '', category: 'quick_links' });
  
  const { data: companyInfo, isLoading: loadingCompany } = useQuery<CompanyInfo>({
    queryKey: ['footerData'],
    queryFn: fetchFooterData
  });
  
  const { data: socialLinks = [], isLoading: loadingSocial } = useQuery<SocialLink[]>({
    queryKey: ['socialLinks'],
    queryFn: fetchSocialLinks
  });
  
  const { data: footerLinks = [], isLoading: loadingLinks } = useQuery<FooterLink[]>({
    queryKey: ['footerLinks'],
    queryFn: fetchFooterLinks
  });
  
  const updateCompanyMutation = useMutation({
    mutationFn: updateCompanyInfo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['footerData'] });
      toast.success('Company information updated');
    },
    onError: () => toast.error('Failed to update company information')
  });
  
  const updateSocialMutation = useMutation({
    mutationFn: updateSocialLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialLinks'] });
      toast.success('Social link updated');
    },
    onError: () => toast.error('Failed to update social link')
  });
  
  const addSocialMutation = useMutation({
    mutationFn: addSocialLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialLinks'] });
      setNewSocialLink({ name: '', icon: '', url: '' });
      toast.success('Social link added');
    },
    onError: () => toast.error('Failed to add social link')
  });
  
  const deleteSocialMutation = useMutation({
    mutationFn: deleteSocialLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialLinks'] });
      toast.success('Social link deleted');
    },
    onError: () => toast.error('Failed to delete social link')
  });
  
  const updateLinkMutation = useMutation({
    mutationFn: updateFooterLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['footerLinks'] });
      toast.success('Footer link updated');
    },
    onError: () => toast.error('Failed to update footer link')
  });
  
  const addLinkMutation = useMutation({
    mutationFn: addFooterLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['footerLinks'] });
      setNewFooterLink({ name: '', url: '', category: 'quick_links' });
      toast.success('Footer link added');
    },
    onError: () => toast.error('Failed to add footer link')
  });
  
  const deleteLinkMutation = useMutation({
    mutationFn: deleteFooterLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['footerLinks'] });
      toast.success('Footer link deleted');
    },
    onError: () => toast.error('Failed to delete footer link')
  });
  
  const handleUpdateCompany = () => {
    if (companyInfo) {
      updateCompanyMutation.mutate(companyInfo);
    }
  };
  
  const handleAddSocialLink = () => {
    if (!newSocialLink.name || !newSocialLink.icon || !newSocialLink.url) {
      toast.error('Please fill all fields');
      return;
    }
    
    addSocialMutation.mutate(newSocialLink);
  };
  
  const handleAddFooterLink = () => {
    if (!newFooterLink.name || !newFooterLink.url) {
      toast.error('Please fill all fields');
      return;
    }
    
    addLinkMutation.mutate(newFooterLink);
  };
  
  if (loadingCompany || loadingSocial || loadingLinks) {
    return <div className="flex justify-center p-6">Loading footer data...</div>;
  }
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="company">Company Info</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="links">Footer Links</TabsTrigger>
        </TabsList>
        
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent>
              {companyInfo && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input 
                      id="company-name"
                      value={companyInfo.name} 
                      onChange={(e) => {
                        if (companyInfo) {
                          const updatedInfo = {...companyInfo, name: e.target.value};
                          queryClient.setQueryData(['footerData'], updatedInfo);
                          updateCompanyMutation.mutate(updatedInfo);
                        }
                      }}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="company-description">Description</Label>
                    <Textarea 
                      id="company-description"
                      value={companyInfo.description} 
                      onChange={(e) => {
                        if (companyInfo) {
                          const updatedInfo = {...companyInfo, description: e.target.value};
                          queryClient.setQueryData(['footerData'], updatedInfo);
                          updateCompanyMutation.mutate(updatedInfo);
                        }
                      }}
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="company-address">Address</Label>
                    <Input 
                      id="company-address"
                      value={companyInfo.address} 
                      onChange={(e) => {
                        if (companyInfo) {
                          const updatedInfo = {...companyInfo, address: e.target.value};
                          queryClient.setQueryData(['footerData'], updatedInfo);
                          updateCompanyMutation.mutate(updatedInfo);
                        }
                      }}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="company-email">Email</Label>
                    <Input 
                      id="company-email"
                      type="email"
                      value={companyInfo.email} 
                      onChange={(e) => {
                        if (companyInfo) {
                          const updatedInfo = {...companyInfo, email: e.target.value};
                          queryClient.setQueryData(['footerData'], updatedInfo);
                          updateCompanyMutation.mutate(updatedInfo);
                        }
                      }}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="company-phone">Phone</Label>
                    <Input 
                      id="company-phone"
                      value={companyInfo.phone} 
                      onChange={(e) => {
                        if (companyInfo) {
                          const updatedInfo = {...companyInfo, phone: e.target.value};
                          queryClient.setQueryData(['footerData'], updatedInfo);
                          updateCompanyMutation.mutate(updatedInfo);
                        }
                      }}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleUpdateCompany}
                    className="mt-4"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {socialLinks?.map((link: SocialLink) => (
                  <div key={link.id} className="flex flex-col md:flex-row gap-4 p-4 border rounded-md">
                    <div className="flex-1">
                      <Label htmlFor={`name-${link.id}`}>Platform</Label>
                      <Input
                        id={`name-${link.id}`}
                        value={link.name}
                        onChange={(e) => {
                          updateSocialMutation.mutate({
                            ...link,
                            name: e.target.value
                          });
                        }}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <Label htmlFor={`icon-${link.id}`}>Icon</Label>
                      <Input
                        id={`icon-${link.id}`}
                        value={link.icon}
                        onChange={(e) => {
                          updateSocialMutation.mutate({
                            ...link,
                            icon: e.target.value
                          });
                        }}
                        placeholder="facebook"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <Label htmlFor={`url-${link.id}`}>URL</Label>
                      <Input
                        id={`url-${link.id}`}
                        value={link.url}
                        onChange={(e) => {
                          updateSocialMutation.mutate({
                            ...link,
                            url: e.target.value
                          });
                        }}
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <Button 
                        variant="destructive" 
                        size="icon"
                        onClick={() => deleteSocialMutation.mutate(link.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div className="mt-6 border-t pt-4">
                  <h3 className="font-medium mb-2">Add New Social Link</h3>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <Label htmlFor="new-social-name">Platform</Label>
                      <Input
                        id="new-social-name"
                        value={newSocialLink.name}
                        onChange={(e) => setNewSocialLink({ ...newSocialLink, name: e.target.value })}
                        placeholder="Facebook"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <Label htmlFor="new-social-icon">Icon</Label>
                      <Input
                        id="new-social-icon"
                        value={newSocialLink.icon}
                        onChange={(e) => setNewSocialLink({ ...newSocialLink, icon: e.target.value })}
                        placeholder="facebook"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <Label htmlFor="new-social-url">URL</Label>
                      <Input
                        id="new-social-url"
                        value={newSocialLink.url}
                        onChange={(e) => setNewSocialLink({ ...newSocialLink, url: e.target.value })}
                        placeholder="https://facebook.com/yourpage"
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <Button 
                        variant="default" 
                        onClick={handleAddSocialLink}
                        className="flex gap-2"
                      >
                        <Plus size={16} />
                        Add Link
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="links">
          <Card>
            <CardHeader>
              <CardTitle>Footer Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {footerLinks?.map((link: FooterLink) => (
                  <div key={link.id} className="flex flex-col md:flex-row gap-4 p-4 border rounded-md">
                    <div className="flex-1">
                      <Label htmlFor={`name-${link.id}`}>Name</Label>
                      <Input
                        id={`name-${link.id}`}
                        value={link.name}
                        onChange={(e) => {
                          updateLinkMutation.mutate({
                            ...link,
                            name: e.target.value
                          });
                        }}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <Label htmlFor={`url-${link.id}`}>URL</Label>
                      <Input
                        id={`url-${link.id}`}
                        value={link.url}
                        onChange={(e) => {
                          updateLinkMutation.mutate({
                            ...link,
                            url: e.target.value
                          });
                        }}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <Label htmlFor={`category-${link.id}`}>Category</Label>
                      <select
                        id={`category-${link.id}`}
                        value={link.category}
                        onChange={(e) => {
                          updateLinkMutation.mutate({
                            ...link,
                            category: e.target.value
                          });
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="quick_links">Quick Links</option>
                        <option value="services">Services</option>
                        <option value="legal">Legal</option>
                      </select>
                    </div>
                    
                    <div className="flex items-end">
                      <Button 
                        variant="destructive" 
                        size="icon"
                        onClick={() => deleteLinkMutation.mutate(link.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div className="mt-6 border-t pt-4">
                  <h3 className="font-medium mb-2">Add New Footer Link</h3>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <Label htmlFor="new-link-name">Name</Label>
                      <Input
                        id="new-link-name"
                        value={newFooterLink.name}
                        onChange={(e) => setNewFooterLink({ ...newFooterLink, name: e.target.value })}
                        placeholder="About Us"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <Label htmlFor="new-link-url">URL</Label>
                      <Input
                        id="new-link-url"
                        value={newFooterLink.url}
                        onChange={(e) => setNewFooterLink({ ...newFooterLink, url: e.target.value })}
                        placeholder="/about"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <Label htmlFor="new-link-category">Category</Label>
                      <select
                        id="new-link-category"
                        value={newFooterLink.category}
                        onChange={(e) => setNewFooterLink({ ...newFooterLink, category: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="quick_links">Quick Links</option>
                        <option value="services">Services</option>
                        <option value="legal">Legal</option>
                      </select>
                    </div>
                    
                    <div className="flex items-end">
                      <Button 
                        variant="default" 
                        onClick={handleAddFooterLink}
                        className="flex gap-2"
                      >
                        <Plus size={16} />
                        Add Link
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FooterEditor;
