
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAppointments, AppointmentData } from '@/services/cmsService';
import AppointmentList from './AppointmentList';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

const AppointmentsSection: React.FC = () => {
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  
  const { 
    data: appointments = [],
    isLoading: appointmentsLoading,
    refetch: refetchAppointments
  } = useQuery<AppointmentData[]>({
    queryKey: ['appointments'],
    queryFn: fetchAppointments,
    enabled: isAdmin,
  });

  if (isAuthLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">Authenticating...</CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
          <CardDescription>You do not have permission to view this page.</CardDescription>
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
      <CardHeader>
        <CardTitle>Appointment Requests</CardTitle>
        <CardDescription>Manage and respond to customer appointment requests.</CardDescription>
      </CardHeader>
      <CardContent>
        {appointmentsLoading ? (
          <div className="text-center py-8">Loading appointments...</div>
        ) : (
          <AppointmentList 
            appointments={appointments} 
            refetchAppointments={refetchAppointments} 
          />
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentsSection;
