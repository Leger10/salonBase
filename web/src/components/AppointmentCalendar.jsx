// /src/components/AppointmentCalendar.jsx
import React, { useState } from 'react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';

export default function AppointmentCalendar({ appointments, onDateSelect, onAppointmentClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const days = Array.from({ length: 7 }).map((_, i) => addDays(start, i));

  const nextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const prevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const goToday = () => setCurrentDate(new Date());

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-gray-100 text-gray-800';
      default: return 'bg-muted text-foreground';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'border-yellow-400 bg-yellow-50';
      case 'confirmed': return 'border-blue-400 bg-blue-50';
      case 'in_progress': return 'border-purple-400 bg-purple-50';
      case 'completed': return 'border-green-400 bg-green-50';
      case 'cancelled': return 'border-red-400 bg-red-50';
      case 'no_show': return 'border-gray-400 bg-gray-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'En attente',
      confirmed: 'Confirmé',
      in_progress: 'En cours',
      completed: 'Terminé',
      cancelled: 'Annulé',
      no_show: 'Non présenté'
    };
    return labels[status] || status;
  };

  const getEmployeeName = (appt) => {
    if (appt.employee?.profile?.full_name) {
      return appt.employee.profile.full_name;
    }
    return null;
  };

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm">
      <div className="flex items-center justify-between p-4 border-b bg-muted/10">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: fr })}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
              Aujourd'hui
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">{appointments?.length || 0}</span> rendez-vous
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* En-têtes des jours */}
          <div className="grid grid-cols-7 border-b bg-muted/5">
            {days.map((day, index) => (
              <div key={index} className="p-3 text-center border-r last:border-r-0">
                <div className="text-xs font-medium text-muted-foreground uppercase">
                  {format(day, 'EEE', { locale: fr })}
                </div>
                <div className={`text-lg font-semibold mt-1 ${isToday(day) ? 'text-primary' : ''}`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Grille des rendez-vous */}
          <div className="grid grid-cols-7 min-h-[300px]">
            {days.map((day, index) => {
              const dayAppts = appointments?.filter(a => {
                const apptDate = new Date(a.appointment_date);
                return isSameDay(apptDate, day);
              })?.sort((a, b) => a.start_time?.localeCompare(b.start_time || '')) || [];

              const isCurrentDay = isToday(day);

              return (
                <div 
                  key={`cell-${index}`} 
                  className={`p-2 border-r border-b last:border-r-0 min-h-[120px] ${isCurrentDay ? 'bg-primary/5' : ''}`}
                  onClick={() => onDateSelect?.(day)}
                >
                  <div className="space-y-2">
                    {dayAppts.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-xs text-muted-foreground/50 py-4">
                        Aucun RDV
                      </div>
                    ) : (
                      dayAppts.slice(0, 4).map((appt) => {
                        const employeeName = getEmployeeName(appt);
                        const clientName = appt.client?.profile?.full_name || appt.client_name || 'Client';
                        
                        return (
                          <div 
                            key={appt.id} 
                            className={`p-2 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all ${getStatusColor(appt.status)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAppointmentClick?.(appt);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">{appt.start_time}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusClass(appt.status)}`}>
                                {getStatusLabel(appt.status)}
                              </span>
                            </div>
                            <div className="text-sm font-medium truncate mt-0.5">
                              {clientName}
                            </div>
                            <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <span>{appt.service?.name || 'Service'}</span>
                              {employeeName && (
                                <span className="text-[10px] bg-primary/10 px-1 rounded">
                                  👤 {employeeName}
                                </span>
                              )}
                            </div>
                            {!appt.employee_id && appt.status === 'pending' && (
                              <div className="text-[10px] text-amber-600 mt-0.5">
                                ⏳ En attente d'assignation
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                    {dayAppts.length > 4 && (
                      <div className="text-xs text-center text-muted-foreground">
                        +{dayAppts.length - 4} autres
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-4 p-3 border-t bg-muted/10 text-xs">
        <span className="text-muted-foreground font-medium">Légende:</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-600"></span>
          <span>En attente</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-400 border border-blue-600"></span>
          <span>Confirmé</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-purple-400 border border-purple-600"></span>
          <span>En cours</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-400 border border-green-600"></span>
          <span>Terminé</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-400 border border-red-600"></span>
          <span>Annulé</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-gray-400 border border-gray-600"></span>
          <span>Non présenté</span>
        </div>
        <div className="flex items-center gap-2 ml-2 text-amber-600">
          <span className="text-xs">⏳</span>
          <span>En attente d'assignation</span>
        </div>
      </div>
    </Card>
  );
}