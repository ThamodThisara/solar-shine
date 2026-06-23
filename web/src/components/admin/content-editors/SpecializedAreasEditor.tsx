import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Terminal } from 'lucide-react';
import { fetchSpecializedAreas, updateSpecializedArea, deleteSpecializedArea, addSpecializedArea } from '@/services/specializedAreaService';
import { SpecializedArea } from '@/types/payload-types';
import SpecializedAreasTable from './specialized-area/SpecializedAreasTable';
import SpecializedAreaFormDialog from './specialized-area/SpecializedAreaFormDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const SpecializedAreasEditor: React.FC = () => {
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<SpecializedArea | null>(null);

  const { data: areas = [], isLoading } = useQuery<SpecializedArea[]>({
    queryKey: ['specializedAreas'],
    queryFn: fetchSpecializedAreas,
    enabled: isAdmin,
    meta: {
      onError: (err: Error) => toast.error(`Failed to load areas: ${err.message}`),
    }
  });

  const onMutationSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['specializedAreas'] });
    setIsDialogOpen(false);
    setSelectedArea(null);
  };
  
  const addMutation = useMutation({
    mutationFn: addSpecializedArea,
    onSuccess: () => {
      onMutationSuccess();
      toast.success('Area added successfully');
    },
    onError: () => toast.error('Failed to add area')
  });

  const updateMutation = useMutation({
    mutationFn: updateSpecializedArea,
    onSuccess: () => {
      onMutationSuccess();
      toast.success('Area updated successfully');
    },
    onError: () => toast.error('Failed to update area')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSpecializedArea(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specializedAreas'] });
      toast.success('Area deleted successfully');
    },
    onError: () => toast.error('Failed to delete area')
  });
  
  const handleSave = (formData: FormData) => {
    if (selectedArea) {
      formData.append('id', selectedArea.$id);
      updateMutation.mutate(formData);
    } else {
      addMutation.mutate(formData);
    }
  };

  const handleAddNew = () => {
    setSelectedArea(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (area: SpecializedArea) => {
    setSelectedArea(area);
    setIsDialogOpen(true);
  };

  if (isAuthLoading) {
    return <Card><CardContent className="p-6 text-center">Authenticating...</CardContent></Card>;
  }

  if (!isAdmin) {
    return (
     <Card>
       <CardHeader>
         <CardTitle>Unauthorized</CardTitle>
         <CardDescription>You do not have permission to manage specialized areas.</CardDescription>
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Specialized Areas</CardTitle>
          <CardDescription>Manage the specialized areas you operate in.</CardDescription>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" /> Add Area
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <SpecializedAreasTable areas={areas} onEdit={handleEdit} onDelete={(id: string) => deleteMutation.mutate(id)} />
        )}
        <SpecializedAreaFormDialog
          isOpen={isDialogOpen}
          setIsOpen={setIsDialogOpen}
          area={selectedArea}
          onSave={handleSave}
          isSaving={addMutation.isPending || updateMutation.isPending}
        />
      </CardContent>
    </Card>
  );
};

export default SpecializedAreasEditor;
