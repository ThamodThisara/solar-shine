import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Save, Trash2 } from 'lucide-react';
import { fetchServiceCards, updateServiceCard, addServiceCard, deleteServiceCard } from '@/services/serviceCardService';
import { ServiceCard } from '@/types/payload-types';

const ServicesEditor: React.FC = () => {
  const queryClient = useQueryClient();
  const [newService, setNewService] = useState({ title: '', description: '' });

  const { data: services, isLoading } = useQuery({
    queryKey: ['serviceCards'],
    queryFn: fetchServiceCards
  });

  const updateMutation = useMutation({
    mutationFn: updateServiceCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceCards'] });
      toast.success('Service updated');
    },
    onError: () => toast.error('Failed to update service')
  });

  const addMutation = useMutation({
    mutationFn: addServiceCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceCards'] });
      setNewService({ title: '', description: '' });
      toast.success('Service added');
    },
    onError: () => toast.error('Failed to add service')
  });

  const deleteMutation = useMutation({
    mutationFn: deleteServiceCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceCards'] });
      toast.success('Service deleted');
    },
    onError: () => toast.error('Failed to delete service')
  });

  const handleAddService = () => {
    if (!newService.title || !newService.description) {
      toast.error('Title and description are required');
      return;
    }

    addMutation.mutate(newService);
  };

  if (isLoading) {
    return <div className="flex justify-center p-6">Loading services data...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Services Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {services?.map((service: ServiceCard) => (
              <div key={service.$id} className="border rounded-lg p-5 space-y-4">
                <div>
                  <Label htmlFor={`title-${service.$id}`}>Title</Label>
                  <Input
                    id={`title-${service.$id}`}
                    value={service.title}
                    onChange={(e) => {
                      const updatedService = { ...service, title: e.target.value };
                      updateMutation.mutate(updatedService);
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor={`description-${service.$id}`}>Description</Label>
                  <Textarea
                    id={`description-${service.$id}`}
                    value={service.description || ''}
                    onChange={(e) => {
                      const updatedService = { ...service, description: e.target.value };
                      updateMutation.mutate(updatedService);
                    }}
                    rows={3}
                  />
                </div>



                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(service.$id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Service
                  </Button>
                </div>
              </div>
            ))}

            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Add New Service</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="new-service-title">Title</Label>
                  <Input
                    id="new-service-title"
                    value={newService.title}
                    onChange={(e) => setNewService({ ...newService, title: e.target.value })}
                    placeholder="Solar Panel Installation"
                  />
                </div>

                <div>
                  <Label htmlFor="new-service-description">Description</Label>
                  <Textarea
                    id="new-service-description"
                    value={newService.description}
                    onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                    placeholder="Expert installation of high-quality solar panels..."
                    rows={3}
                  />
                </div>



                <Button
                  onClick={handleAddService}
                  className="mt-2"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Service
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServicesEditor;
