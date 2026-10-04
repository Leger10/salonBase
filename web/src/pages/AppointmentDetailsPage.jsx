// /src/pages/AppointmentDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AppointmentDetailsModal from '@/components/AppointmentDetailsModal.jsx';
import { Button } from '@/components/ui/button.jsx';
import { ArrowLeft } from 'lucide-react';

export default function AppointmentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            client:client_id (
              id,
              name,
              email,
              phone,
              profile:profile_id (
                full_name,
                phone,
                email
              )
            ),
            employee:employee_id (
              id,
              employee_number,
              profile:profile_id (
                full_name
              )
            ),
            service:service_id (
              id,
              name,
              duration,
              price
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        // Formater les données comme dans AdminAppointmentsPage
        const formattedAppt = {
          ...data,
          client_name: data.client?.profile?.full_name || data.client?.name || 'Client inconnu',
          client_phone: data.client?.profile?.phone || data.client?.phone || '',
          client_email: data.client?.profile?.email || data.client?.email || '',
          employee_name: data.employee?.profile?.full_name || 'Non assigné',
          service_name: data.service?.name || 'Service inconnu',
          service_duration: data.service?.duration || 30,
          service_price: data.service?.price || 0,
        };

        setAppointment(formattedAppt);
      } catch (error) {
        console.error('Error fetching appointment:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAppointment();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-xl text-muted-foreground">Rendez-vous non trouvé</p>
        <Button onClick={() => navigate('/appointments')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/appointments')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour
      </Button>
      
      <AppointmentDetailsModal
        open={true}
        onOpenChange={(open) => {
          if (!open) navigate('/appointments');
        }}
        appointment={appointment}
      />
    </div>
  );
}