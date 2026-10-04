// /src/components/AppointmentCalendar.jsx
import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Scissors, Circle } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { cn } from "@/lib/utils";

export default function AppointmentCalendar({ appointments, onAppointmentClick }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekDays, setWeekDays] = useState([]);

  useEffect(() => {
    const start = startOfWeek(currentMonth, { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    setWeekDays(days);
  }, [currentMonth]);

  const getDayAppointments = (day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return appointments.filter((appt) => appt.appointment_date === dateStr);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: { bg: "bg-yellow-500/15", border: "border-yellow-500/40", text: "text-yellow-400", dot: "bg-yellow-400" },
      confirmed: { bg: "bg-blue-500/15", border: "border-blue-500/40", text: "text-blue-400", dot: "bg-blue-400" },
      in_progress: { bg: "bg-purple-500/15", border: "border-purple-500/40", text: "text-purple-400", dot: "bg-purple-400" },
      completed: { bg: "bg-green-500/15", border: "border-green-500/40", text: "text-green-400", dot: "bg-green-400" },
      cancelled: { bg: "bg-red-500/15", border: "border-red-500/40", text: "text-red-400", dot: "bg-red-400" },
      no_show: { bg: "bg-gray-500/15", border: "border-gray-500/40", text: "text-gray-400", dot: "bg-gray-400" },
    };
    return colors[status] || colors.pending;
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: "En attente",
      confirmed: "Confirmé",
      in_progress: "En cours",
      completed: "Terminé",
      cancelled: "Annulé",
      no_show: "Non présenté",
    };
    return labels[status] || status;
  };

  const navigateMonth = (direction) => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const handleDayClick = (day) => {
    setSelectedDate(day);
  };

  // Fonction pour tronquer le texte
  const truncateText = (text, maxLength = 12) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <div className="bg-background rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateMonth(-1)}
          className="text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold text-foreground">
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateMonth(1)}
          className="text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 gap-px bg-muted/30">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
          <div
            key={day}
            className="py-2.5 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grille des jours */}
      <div className="grid grid-cols-7 gap-px bg-muted/30">
        {weekDays.map((day, idx) => {
          const dayAppointments = getDayAppointments(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isTodayDate = isToday(day);
          const isSelected = isSameDay(day, selectedDate);

          return (
            <div
              key={idx}
              className={cn(
                "min-h-[120px] p-1.5 transition-colors cursor-pointer",
                isCurrentMonth ? "bg-card" : "bg-muted/20",
                isTodayDate && "bg-primary/5 border border-primary/20",
                isSelected && "ring-2 ring-primary ring-inset",
                !isCurrentMonth && "opacity-40"
              )}
              onClick={() => handleDayClick(day)}
            >
              {/* Numéro du jour */}
              <div className="flex justify-between items-start mb-1">
                <span
                  className={cn(
                    "text-sm font-semibold px-1.5 py-0.5 rounded",
                    isTodayDate ? "text-primary bg-primary/10" : "text-foreground",
                    !isCurrentMonth && "text-muted-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayAppointments.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-primary/10 text-primary border-primary/20">
                    {dayAppointments.length}
                  </Badge>
                )}
              </div>

              {/* Rendez-vous du jour */}
              <div className="space-y-1 mt-1">
                {dayAppointments.slice(0, 2).map((appt) => {
                  const statusStyle = getStatusColor(appt.status);
                  return (
                    <div
                      key={appt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onAppointmentClick) onAppointmentClick(appt);
                      }}
                      className={cn(
                        "text-xs p-1.5 rounded-md cursor-pointer hover:scale-[1.02] transition-transform border",
                        statusStyle.bg,
                        statusStyle.border
                      )}
                    >
                      {/* Heure */}
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="font-semibold text-foreground text-[11px]">
                          {appt.start_time}
                        </span>
                        <span className="flex-1"></span>
                        <span className="flex items-center gap-1">
                          <Circle className={cn("h-1.5 w-1.5 fill-current", statusStyle.dot)} />
                          <span className={cn("text-[9px] font-medium", statusStyle.text)}>
                            {getStatusLabel(appt.status)}
                          </span>
                        </span>
                      </div>
                      
                      {/* Client */}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-foreground/90 text-[11px] truncate">
                          {truncateText(appt.client_name || "Client", 10)}
                        </span>
                      </div>
                      
                      {/* Service */}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Scissors className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground text-[10px] truncate">
                          {truncateText(appt.service_name || "Service", 12)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {dayAppointments.length > 2 && (
                  <div className="text-[10px] text-muted-foreground text-center font-medium">
                    +{dayAppointments.length - 2} autre(s) rendez-vous
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center justify-center gap-3 p-3 border-t border-border bg-muted/20">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
          <span className="text-xs text-muted-foreground">En attente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
          <span className="text-xs text-muted-foreground">Confirmé</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
          <span className="text-xs text-muted-foreground">En cours</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
          <span className="text-xs text-muted-foreground">Terminé</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
          <span className="text-xs text-muted-foreground">Annulé</span>
        </div>
      </div>
    </div>
  );
}