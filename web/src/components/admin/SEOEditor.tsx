
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { fetchSEOData, updateSEOData } from '@/services/seoService';

interface SEOEditorProps {
  editingSEO: { pagePath: string, data: any } | null;
  setEditingSEO: React.Dispatch<React.SetStateAction<{ pagePath: string, data: any } | null>>;
}

const SEOEditor: React.FC<SEOEditorProps> = ({ editingSEO, setEditingSEO }) => {
  const handleSEOSave = async () => {
    if (!editingSEO) return;
    
    try {
      const success = await updateSEOData(editingSEO.pagePath, editingSEO.data);
      if (success) {
        toast.success('SEO data updated successfully');
        setEditingSEO(null);
      } else {
        toast.error('Failed to update SEO data');
      }
    } catch (error) {
      console.error('Error updating SEO data:', error);
      toast.error('An error occurred while updating SEO data');
    }
  };

  if (!editingSEO) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Editing SEO for: {editingSEO.pagePath}</h3>
      
      <div className="space-y-4">
        <div className="grid w-full gap-1.5">
          <Label htmlFor="title">Page Title</Label>
          <Input 
            id="title" 
            value={editingSEO.data.title} 
            onChange={(e) => setEditingSEO({
              ...editingSEO,
              data: {...editingSEO.data, title: e.target.value}
            })}
          />
          <p className="text-xs text-brand-gray">The title appears in search engine results and browser tabs.</p>
        </div>
        
        <div className="grid w-full gap-1.5">
          <Label htmlFor="description">Meta Description</Label>
          <Textarea 
            id="description" 
            value={editingSEO.data.description}
            onChange={(e) => setEditingSEO({
              ...editingSEO,
              data: {...editingSEO.data, description: e.target.value}
            })}
          />
          <p className="text-xs text-brand-gray">The description appears in search engine results below the title.</p>
        </div>
        
        <div className="grid w-full gap-1.5">
          <Label htmlFor="keywords">Keywords</Label>
          <Input 
            id="keywords" 
            value={editingSEO.data.keywords || ''} 
            onChange={(e) => setEditingSEO({
              ...editingSEO,
              data: {...editingSEO.data, keywords: e.target.value}
            })}
          />
          <p className="text-xs text-brand-gray">Comma-separated keywords related to the page content.</p>
        </div>
        
        <div className="grid w-full gap-1.5">
          <Label htmlFor="ogImage">OG Image URL</Label>
          <Input 
            id="ogImage" 
            value={editingSEO.data.ogImage || ''} 
            onChange={(e) => setEditingSEO({
              ...editingSEO,
              data: {...editingSEO.data, ogImage: e.target.value}
            })}
          />
          <p className="text-xs text-brand-gray">The image that appears when sharing the page on social media.</p>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={() => setEditingSEO(null)}>
          Cancel
        </Button>
        <Button onClick={handleSEOSave}>
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default SEOEditor;
