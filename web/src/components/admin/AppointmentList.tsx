
import React from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, User, Phone, Mail, MessageSquare, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { AppointmentData, updateAppointmentStatus } from '@/services/cmsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AppointmentListProps {
  appointments: AppointmentData[] | undefined;
  refetchAppointments: () => void;
}

const AppointmentList: React.FC<AppointmentListProps> = ({ appointments, refetchAppointments }) => {
  const handleStatusChange = async (id: string, status: string) => {
    try {
      const success = await updateAppointmentStatus(id, status);
      if (success) {
        toast.success(`Appointment status updated to ${status}`);
        refetchAppointments();
      } else {
        toast.error('Failed to update appointment status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('An error occurred while updating status');
    }
  };

  if (!appointments || appointments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-brand-gray">No appointment requests yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {appointments.map((appointment: AppointmentData) => (
        <Card key={appointment.$id} className="overflow-hidden">
          <div className={`p-1 ${
            appointment.status === 'confirmed' ? 'bg-green-500' : 
            appointment.status === 'cancelled' ? 'bg-red-500' : 'bg-amber-500'
          }`}></div>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="text-primary mt-1" size={18} />
                  <div>
                    <p className="font-semibold">{appointment.name}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-brand-gray">
                      <span className="flex items-center">
                        <Mail className="mr-1" size={14} />
                        {appointment.email}
                      </span>
                      <span className="flex items-center">
                        <Phone className="mr-1" size={14} />
                        {appointment.phone}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Calendar className="text-primary mt-1" size={18} />
                  <div>
                    <p className="font-medium">Appointment Details</p>
                    <div className="text-sm text-brand-gray">
                      <p>Service: {appointment.service}</p>
                      <p>Date: {format(new Date(appointment.date), 'PPP')}</p>
                      <p>Time: {appointment.time_slot}</p>
                    </div>
                  </div>
                </div>
                
                {appointment.message && (
                  <div className="flex items-start gap-3">
                    <MessageSquare className="text-primary mt-1" size={18} />
                    <div>
                      <p className="font-medium">Additional Information</p>
                      <p className="text-sm text-brand-gray">{appointment.message}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:items-end gap-3">
                <Badge className={`
                  ${appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                    appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                    'bg-amber-100 text-amber-800'}
                `}>
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </Badge>
                <div className="flex gap-2 mt-2">
                  {appointment.status !== 'confirmed' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-1 text-green-600 border-green-600 hover:bg-green-50"
                      onClick={() => handleStatusChange(appointment.$id, 'confirmed')}
                    >
                      <Check size={14} />
                      Confirm
                    </Button>
                  )}
                  
                  {appointment.status !== 'cancelled' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-1 text-red-600 border-red-600 hover:bg-red-50"
                      onClick={() => handleStatusChange(appointment.$id, 'cancelled')}
                    >
                      <X size={14} />
                      Cancel
                    </Button>
                  )}
                  
                  {appointment.status !== 'pending' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => handleStatusChange(appointment.$id, 'pending')}
                    >
                      Reset to Pending
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AppointmentList;
