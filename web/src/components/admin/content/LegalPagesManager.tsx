import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Shield, FileText, ScrollText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import RichTextEditor from '@/components/admin/RichTextEditor';
import {
  legalPageService,
  LegalPage,
  LegalPageType,
  DEFAULT_LEGAL_PAGES,
} from '@/services/legalPageService';

interface PageMeta {
  type: LegalPageType;
  tabLabel: string;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
}

const PAGES: PageMeta[] = [
  {
    type: 'privacy_policy',
    tabLabel: 'Privacy Policy',
    helper: 'Content shown on the public Privacy Policy page.',
    icon: Shield,
    route: '/privacy',
  },
  {
    type: 'terms_of_service',
    tabLabel: 'Terms of Service',
    helper: 'Content shown on the public Terms of Service page.',
    icon: ScrollText,
    route: '/terms',
  },
];

export const LegalPagesManager: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<LegalPageType | null>(null);
  const [pages, setPages] = useState<Record<LegalPageType, LegalPage>>({
    privacy_policy: { ...DEFAULT_LEGAL_PAGES.privacy_policy },
    terms_of_service: { ...DEFAULT_LEGAL_PAGES.terms_of_service },
  });

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      setLoading(true);
      const [privacy, terms] = await Promise.all([
        legalPageService.fetchLegalPage('privacy_policy'),
        legalPageService.fetchLegalPage('terms_of_service'),
      ]);
      setPages({ privacy_policy: privacy, terms_of_service: terms });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load legal page content',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (type: LegalPageType, field: 'title' | 'content', value: string) => {
    setPages((prev) => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
  };

  const handleSave = async (type: LegalPageType) => {
    try {
      setSavingType(type);
      const success = await legalPageService.updateLegalPage(pages[type]);
      if (success) {
        toast({ title: 'Success', description: 'Content saved successfully' });
        // Reload so we capture the $id after a first-time create.
        await loadPages();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to save content',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save content',
        variant: 'destructive',
      });
    } finally {
      setSavingType(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading legal pages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Legal Pages</h1>
            <p className="text-muted-foreground mt-1">
              Manage the Privacy Policy and Terms of Service pages with a rich text editor.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="privacy_policy" className="w-full">
        <TabsList className="mb-4 flex flex-wrap h-auto justify-start">
          {PAGES.map((p) => (
            <TabsTrigger key={p.type} value={p.type}>
              {p.tabLabel}
            </TabsTrigger>
          ))}
        </TabsList>

        {PAGES.map((page) => {
          const Icon = page.icon;
          const data = pages[page.type];
          const saving = savingType === page.type;
          return (
            <TabsContent key={page.type} value={page.type}>
              <Card className="border border-border/50">
                <CardHeader className="border-b border-border/50">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-semibold">{page.tabLabel}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {page.helper} Live at{' '}
                          <code className="text-xs">{page.route}</code>
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => handleSave(page.type)} disabled={saving} className="px-6">
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
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Page Title</Label>
                    <Input
                      value={data.title}
                      onChange={(e) => updateField(page.type, 'title', e.target.value)}
                      placeholder="Enter page title"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Content</Label>
                    <div className="mt-2">
                      <RichTextEditor
                        value={data.content}
                        onChange={(html) => updateField(page.type, 'content', html)}
                        placeholder="Write the page content here..."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default LegalPagesManager;
