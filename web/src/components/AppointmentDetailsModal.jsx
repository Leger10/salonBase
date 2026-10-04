// /src/components/appointments/AppointmentDetailsModal.jsx
import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { 
  User, Scissors, Clock, CalendarDays, ReceiptText, DollarSign, 
  Phone, Mail, MapPin, Building2, Hash, Calendar, Ticket
} from 'lucide-react';

export default function AppointmentDetailsModal({ open, onOpenChange, appointment }) {
  if (!appointment) return null;

  // ✅ Extraction des données avec gestion des cas null/undefined
  const date = appointment.appointment_date ? new Date(appointment.appointment_date) : new Date();
  
  // ✅ Informations du client (directement dans l'appointment ou via la relation)
  const clientName = appointment.client_name || appointment.client?.name || appointment.client?.profile?.full_name || 'Client inconnu';
  const clientEmail = appointment.client_email || appointment.client?.email || appointment.client?.profile?.email || '';
  const clientPhone = appointment.client_phone || appointment.client?.phone || appointment.client?.profile?.phone || '';
  
  // ✅ Informations de l'employé
  const employeeName = appointment.employee?.profile?.full_name || appointment.employee_name || 'Non assigné';
  const employeeNumber = appointment.employee?.employee_number || '';
  
  // ✅ Informations du service
  const serviceName = appointment.service?.name || appointment.service_name || 'Service';
  const serviceDuration = appointment.service?.duration || appointment.duration || 30;
  const servicePrice = appointment.service?.price || appointment.total_price || appointment.price || 0;
  
  // ✅ Numéro de réservation
  const bookingNumber = appointment.booking_number || appointment.ref || appointment.id?.substring(0, 8).toUpperCase() || 'N/A';
  
  // ✅ Informations du tenant
  const tenantName = appointment.tenant?.name || appointment.tenant_name || '';
  const tenantAddress = appointment.tenant?.address || appointment.tenant_address || '';
  const tenantPhone = appointment.tenant?.phone || appointment.tenant_phone || '';

  // ✅ Statut avec traduction
  const getStatusBadge = (status) => {
    const variants = {
      pending: { class: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: '⏳ En attente' },
      confirmed: { class: 'bg-blue-100 text-blue-800 border-blue-200', label: '✅ Confirmé' },
      in_progress: { class: 'bg-purple-100 text-purple-800 border-purple-200', label: '💇 En cours' },
      completed: { class: 'bg-green-100 text-green-800 border-green-200', label: '🎉 Terminé' },
      cancelled: { class: 'bg-red-100 text-red-800 border-red-200', label: '❌ Annulé' },
      no_show: { class: 'bg-gray-100 text-gray-800 border-gray-200', label: '🚫 Non présenté' },
      archived: { class: 'bg-gray-100 text-gray-600 border-gray-200', label: '📦 Archivé' }
    };
    const variant = variants[status] || variants.pending;
    return <Badge className={variant.class + ' border'}>{variant.label}</Badge>;
  };

  // ✅ Formatage de l'heure
  const formatTime = (timeStr) => {
    if (!timeStr) return '--:--';
    // Si c'est déjà au format HH:MM ou HH:MM:SS
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  };

  // ✅ Formatage de la date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Date non définie';
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return format(d, 'EEEE d MMMM yyyy', { locale: fr });
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  // ✅ Statut de paiement
  const getPaymentStatusLabel = (status) => {
    const labels = {
      paid: '✅ Payé',
      partial: '🔄 Paiement partiel',
      unpaid: '⏳ Non payé',
      refunded: '↩️ Remboursé'
    };
    return labels[status] || status || 'Non payé';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              Détails du rendez-vous
            </DialogTitle>
            {getStatusBadge(appointment.status)}
          </div>
          <DialogDescription className="flex items-center gap-2 text-sm font-mono text-primary">
            <Hash className="h-4 w-4" />
            Réservation #{bookingNumber}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 pt-2">
          {/* ✅ Client */}
          <div className="bg-muted/10 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4" /> Informations client
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{clientName}</p>
                {clientEmail && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {clientEmail}
                  </p>
                )}
                {clientPhone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {clientPhone}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Statut</p>
                <p className="text-sm font-medium capitalize">{appointment.status || 'En attente'}</p>
              </div>
            </div>
          </div>

          {/* ✅ Service */}
          <div className="bg-muted/10 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Scissors className="h-4 w-4" /> Prestation
            </p>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-foreground text-lg">{serviceName}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3 w-3" /> {serviceDuration} min
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Prix</p>
                <p className="text-xl font-bold text-primary">{servicePrice.toLocaleString()} FCFA</p>
              </div>
            </div>
          </div>

          {/* ✅ Date & Heure */}
          <div className="bg-muted/10 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Date et heure
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-semibold text-foreground capitalize">
                  {formatDate(appointment.appointment_date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horaire</p>
                <p className="font-semibold text-foreground">
                  {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                </p>
              </div>
            </div>
          </div>

          {/* ✅ Salon */}
          {tenantName && (
            <div className="bg-muted/10 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Salon
              </p>
              <div>
                <p className="font-semibold text-foreground">{tenantName}</p>
                {tenantAddress && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {tenantAddress}
                  </p>
                )}
                {tenantPhone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {tenantPhone}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ✅ Employé assigné */}
          <div className="bg-muted/10 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4" /> Professionnel
            </p>
            <div>
              <p className="font-semibold text-foreground">{employeeName}</p>
              {employeeNumber && (
                <p className="text-sm text-muted-foreground">#{employeeNumber}</p>
              )}
              {!employeeName || employeeName === 'Non assigné' ? (
                <p className="text-sm text-amber-600">⏳ En attente d'assignation</p>
              ) : null}
            </div>
          </div>

          {/* ✅ Paiement (si disponible) */}
          {(appointment.payment_status || appointment.prepaid_amount > 0) && (
            <div className="bg-muted/10 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Paiement
              </p>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <p className="font-medium">{getPaymentStatusLabel(appointment.payment_status)}</p>
                </div>
                {appointment.prepaid_amount > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Acompte</p>
                    <p className="font-medium text-primary">{appointment.prepaid_amount.toLocaleString()} FCFA</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ✅ Notes */}
          {appointment.notes && (
            <div className="bg-muted/10 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <ReceiptText className="h-4 w-4" /> Notes
              </p>
              <p className="text-sm text-foreground bg-background/50 p-3 rounded-lg italic">
                "{appointment.notes}"
              </p>
            </div>
          )}

          {/* ✅ Métadonnées supplémentaires */}
          <div className="border-t border-border/50 pt-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Référence: #{bookingNumber}</span>
              {appointment.created_at && (
                <span>Créé le: {format(new Date(appointment.created_at), 'dd/MM/yyyy HH:mm')}</span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}