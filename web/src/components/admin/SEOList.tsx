
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SEOListProps {
  onEdit: (pagePath: string) => void;
}

const SEOList: React.FC<SEOListProps> = ({ onEdit }) => {
  const pages = [
    { path: '/', label: 'Home Page' },
    { path: '/who-we-are', label: 'About Us Page' },
    { path: '/what-we-do', label: 'What We Do Page' },
    { path: '/services', label: 'Services Page' },
    { path: '/projects', label: 'Projects Page' },
    { path: '/blog', label: 'Blog Page' },
    { path: '/contact', label: 'Contact Page' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {pages.map(page => (
        <Card key={page.path} className="overflow-hidden">
          <CardHeader className="p-4">
            <CardTitle className="text-lg">{page.label}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onEdit(page.path)}
            >
              Edit SEO Settings
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SEOList;
