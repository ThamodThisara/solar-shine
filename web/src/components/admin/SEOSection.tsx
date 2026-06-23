
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchSEOData } from '@/services/seoService';
import SEOList from './SEOList';
import SEOEditor from './SEOEditor';

const SEOSection: React.FC = () => {
  const [editingSEO, setEditingSEO] = useState<{pagePath: string, data: any} | null>(null);

  const handleSEOEdit = async (pagePath: string) => {
    try {
      const seoData = await fetchSEOData(pagePath);
      if (seoData) {
        setEditingSEO({ pagePath, data: seoData });
      } else {
        toast.error('Failed to fetch SEO data');
      }
    } catch (error) {
      console.error('Error fetching SEO data:', error);
      toast.error('An error occurred while fetching SEO data');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO Settings</CardTitle>
        <CardDescription>Manage SEO settings for each page of your website.</CardDescription>
      </CardHeader>
      <CardContent>
        {editingSEO ? (
          <SEOEditor 
            editingSEO={editingSEO} 
            setEditingSEO={setEditingSEO} 
          />
        ) : (
          <SEOList onEdit={handleSEOEdit} />
        )}
      </CardContent>
    </Card>
  );
};

export default SEOSection;
