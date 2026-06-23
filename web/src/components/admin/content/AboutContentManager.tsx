import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Save, Info, Image as ImageIcon, Users, Trash2, Plus } from 'lucide-react';
import { AboutContent } from '@/types/payload-types';
import { getAboutContent, updateAboutContent, uploadAboutImage } from '@/services/aboutService';

export const AboutContentManager: React.FC = () => {
  const [content, setContent] = useState<AboutContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<AboutContent>>({});
  
  const [imageFiles, setImageFiles] = useState<{ [key: string]: File | null }>({
    main_image: null,
    image_one: null,
    image_two: null,
  });
  const [imagePreviews, setImagePreviews] = useState<{ [key: string]: string | null }>({
    main_image: null,
    image_one: null,
    image_two: null,
  });

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const data = await getAboutContent();
      setContent(data);
      if (data) {
        setFormData(data);
        setImagePreviews({
          main_image: data.main_image || null,
          image_one: data.image_one || null,
          image_two: data.image_two || null,
        });
      }
    } catch (error) {
      toast.error('Failed to load about content.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof AboutContent, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (field: 'main_image' | 'image_one' | 'image_two', file: File | null) => {
    if (file) {
      setImageFiles(prev => ({ ...prev, [field]: file }));
      setImagePreviews(prev => ({ ...prev, [field]: URL.createObjectURL(file) }));
    }
  };

  const handleTeamMemberChange = (index: number, field: string, value: string) => {
    const updatedMembers = [...(formData.team_members || [])];
    updatedMembers[index] = { ...updatedMembers[index], [field]: value };
    handleInputChange('team_members', updatedMembers);
  };

  const addTeamMember = () => {
    const newMember = { name: '', position: '', bio: '' };
    handleInputChange('team_members', [...(formData.team_members || []), newMember]);
  };

  const removeTeamMember = (index: number) => {
    const updatedMembers = [...(formData.team_members || [])];
    updatedMembers.splice(index, 1);
    handleInputChange('team_members', updatedMembers);
  };

  const handleSave = async () => {
    if (!content?.$id) return;

    setSaving(true);
    try {
      const dataToUpdate: Partial<Omit<AboutContent, '$id'>> = { ...formData };

      for (const key in imageFiles) {
        const file = imageFiles[key as keyof typeof imageFiles];
        if (file) {
          const imageId = await uploadAboutImage(file);
          (dataToUpdate as any)[`${key}_id`] = imageId;
        }
      }

      await updateAboutContent(content.$id, dataToUpdate);
      toast.success('About content updated successfully!');
      await loadContent();
    } catch (error) {
      toast.error('Failed to save about content.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!content) {
    return <div className="text-center py-8">No about content found. Contact support.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Info className="h-6 w-6" /> Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={formData.title || ''} onChange={e => handleInputChange('title', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input id="subtitle" value={formData.subtitle || ''} onChange={e => handleInputChange('subtitle', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="content">Main Content</Label>
            <Textarea id="content" value={formData.content || ''} onChange={e => handleInputChange('content', e.target.value)} rows={6} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ImageIcon className="h-6 w-6" /> Images</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.keys(imagePreviews).map(key => (
            <div key={key} className="space-y-2">
              <Label>{key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
              <Input type="file" accept="image/*" onChange={e => handleImageChange(key as any, e.target.files?.[0] || null)} />
              {imagePreviews[key as keyof typeof imagePreviews] && (
                <img src={imagePreviews[key as keyof typeof imagePreviews]!} alt={`${key} preview`} className="mt-2 h-40 w-full object-cover rounded-md" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-6 w-6" /> Team Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.team_members?.map((member, index) => (
            <div key={index} className="p-4 border rounded-md space-y-3 relative">
              <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removeTeamMember(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input value={member.name} onChange={e => handleTeamMemberChange(index, 'name', e.target.value)} />
                </div>
                <div>
                  <Label>Position</Label>
                  <Input value={member.position} onChange={e => handleTeamMemberChange(index, 'position', e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea value={member.bio} onChange={e => handleTeamMemberChange(index, 'bio', e.target.value)} />
              </div>
            </div>
          ))}
          <Button onClick={addTeamMember} variant="outline"><Plus className="mr-2 h-4 w-4" /> Add Team Member</Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
        </Button>
      </div>
    </div>
  );
};
