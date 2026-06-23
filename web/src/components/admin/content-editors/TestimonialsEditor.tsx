import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Terminal } from 'lucide-react';
import { fetchTestimonials, updateTestimonial, addTestimonial, deleteTestimonial } from '@/services/testimonialService';
import { Testimonial } from '@/types/payload-types';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const TestimonialsEditor: React.FC = () => {
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const [newTestimonial, setNewTestimonial] = useState({
    text: '',
    author: '',
    position: ''
  });
  
  const { data: testimonials, isLoading } = useQuery({
    queryKey: ['testimonials'],
    queryFn: fetchTestimonials,
    enabled: isAdmin,
  });
  
  const updateMutation = useMutation({
    mutationFn: updateTestimonial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      toast.success('Testimonial updated');
    },
    onError: () => toast.error('Failed to update testimonial')
  });
  
  const addMutation = useMutation({
    mutationFn: addTestimonial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      setNewTestimonial({
        text: '',
        author: '',
        position: ''
      });
      toast.success('Testimonial added');
    },
    onError: () => toast.error('Failed to add testimonial')
  });
  
  const deleteMutation = useMutation({
    mutationFn: deleteTestimonial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      toast.success('Testimonial deleted');
    },
    onError: () => toast.error('Failed to delete testimonial')
  });
  
  const handleAddTestimonial = () => {
    if (!newTestimonial.text || !newTestimonial.author) {
      toast.error('Testimonial text and author are required');
      return;
    }
    
    addMutation.mutate(newTestimonial);
  };
  
  if (isAuthLoading) {
    return <div className="flex justify-center p-6">Authenticating...</div>;
  }

  if (!isAdmin) {
    return (
     <Card>
       <CardHeader>
         <CardTitle>Unauthorized</CardTitle>
         <CardDescription>You do not have permission to manage testimonials.</CardDescription>
       </CardHeader>
       <CardContent>
         <Alert variant="destructive">
           <Terminal className="h-4 w-4" />
           <AlertTitle>Access Denied</AlertTitle>
           <AlertDescription>
             Please contact an administrator if you believe this is an error.
           </AlertDescription>
         </Alert>
       </CardContent>
     </Card>
   );
  }

  if (isLoading) {
    return <div className="flex justify-center p-6">Loading testimonials data...</div>;
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Testimonials</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {testimonials?.map((testimonial: Testimonial) => (
              <div key={testimonial.id} className="border rounded-lg p-5 space-y-4">
                <div>
                  <Label htmlFor={`text-${testimonial.id}`}>Testimonial</Label>
                  <Textarea 
                    id={`text-${testimonial.id}`}
                    value={testimonial.text} 
                    onChange={(e) => updateMutation.mutate({...testimonial, text: e.target.value})}
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`author-${testimonial.id}`}>Author</Label>
                    <Input 
                      id={`author-${testimonial.id}`}
                      value={testimonial.author} 
                      onChange={(e) => updateMutation.mutate({...testimonial, author: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`position-${testimonial.id}`}>Position/Company</Label>
                    <Input 
                      id={`position-${testimonial.id}`}
                      value={testimonial.position || ''} 
                      onChange={(e) => updateMutation.mutate({...testimonial, position: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(testimonial.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Testimonial
                  </Button>
                </div>
              </div>
            ))}
            
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Add New Testimonial</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="new-testimonial-text">Testimonial</Label>
                  <Textarea 
                    id="new-testimonial-text"
                    value={newTestimonial.text} 
                    onChange={(e) => setNewTestimonial({...newTestimonial, text: e.target.value})}
                    placeholder="The solar installation has reduced our energy bills significantly..."
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new-testimonial-author">Author</Label>
                    <Input 
                      id="new-testimonial-author"
                      value={newTestimonial.author} 
                      onChange={(e) => setNewTestimonial({...newTestimonial, author: e.target.value})}
                      placeholder="John Smith"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="new-testimonial-position">Position/Company</Label>
                    <Input 
                      id="new-testimonial-position"
                      value={newTestimonial.position} 
                      onChange={(e) => setNewTestimonial({...newTestimonial, position: e.target.value})}
                      placeholder="Homeowner"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleAddTestimonial}
                  className="mt-2"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Testimonial
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestimonialsEditor;
