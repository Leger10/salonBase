import React from 'react';
import { Calendar, Clock, User, Scissors, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AppointmentCard({ appointment, onStatusChange, showActions = true }) {
  // ✅ Structure Supabase
  const clientName = appointment.client?.profile?.full_name || 'Client';
  const employeeName = appointment.employee?.profile?.full_name || 'Non assigné';
  const serviceName = appointment.service?.name || 'Service';
  const servicePrice = appointment.service?.price || appointment.total_price || 0;

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-gray-100 text-gray-800'
  };

  const statusLabels = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    in_progress: 'En cours',
    completed: 'Terminé',
    cancelled: 'Annulé',
    no_show: 'Non présenté'
  };

  const handleStatusChange = (newStatus) => {
    if (onStatusChange) {
      onStatusChange(appointment.id, newStatus);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{serviceName}</h3>
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[appointment.status] || statusColors.pending}`}>
              {statusLabels[appointment.status] || appointment.status}
            </span>
            {appointment.payment_status === 'paid' && (
              <span className="rounded-full bg-green-100 text-green-800 px-2 py-1 text-xs font-medium">
                Payé
              </span>
            )}
          </div>
          
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{clientName}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Avec: {employeeName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(appointment.appointment_date), 'EEEE d MMMM yyyy', { locale: fr })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{appointment.start_time} - {appointment.end_time}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="font-semibold text-primary">{servicePrice.toLocaleString()} FCFA</span>
            </div>
          </div>
          
          {appointment.notes && (
            <p className="mt-2 text-sm text-muted-foreground italic">
              "{appointment.notes}"
            </p>
          )}
        </div>
      </div>
      
      {showActions && (appointment.status === 'pending' || appointment.status === 'confirmed') && (
        <div className="mt-4 flex gap-2">
          {appointment.status === 'pending' && (
            <button
              onClick={() => handleStatusChange('confirmed')}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              Confirmer
            </button>
          )}
          {appointment.status === 'confirmed' && (
            <button
              onClick={() => handleStatusChange('in_progress')}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 active:scale-[0.98]"
            >
              Démarrer
            </button>
          )}
          {appointment.status === 'in_progress' && (
            <button
              onClick={() => handleStatusChange('completed')}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-green-700 active:scale-[0.98]"
            >
              Terminer
            </button>
          )}
          {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
            <button
              onClick={() => handleStatusChange('cancelled')}
              className="flex-1 rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-500 transition-all hover:bg-red-50 active:scale-[0.98]"
            >
              Annuler
            </button>
          )}
        </div>
      )}
    </div>
  );
}