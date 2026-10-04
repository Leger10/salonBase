// /src/components/AppointmentModal.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { toast } from "sonner";
import { Calendar, Clock, User, Phone, Mail, Scissors } from "lucide-react";

export default function AppointmentModal({
  open,
  onOpenChange,
  appointment,
  onSuccess,
  employees,
}) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);

  // États du formulaire
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [status, setStatus] = useState("pending");
  const [notes, setNotes] = useState("");

  const tenantId = currentUser?.profile?.tenant_id;

  // Charger les services et clients
  useEffect(() => {
    if (open && tenantId) {
      fetchServices();
      fetchClients();
      if (appointment) {
        populateForm(appointment);
      } else {
        resetForm();
      }
    }
  }, [open, tenantId, appointment]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, duration, price")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, phone, email")
        .eq("tenant_id", tenantId)
        .order("name")
        .limit(50);

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const resetForm = () => {
    setClientId("");
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setServiceId("");
    setEmployeeId("");
    setAppointmentDate("");
    setStartTime("");
    setEndTime("");
    setStatus("pending");
    setNotes("");
  };

  const populateForm = (appt) => {
    setClientId(appt.client_id || "");
    setClientName(appt.client_name || "");
    setClientPhone(appt.client_phone || "");
    setClientEmail(appt.client_email || "");
    setServiceId(appt.service_id || "");
    setEmployeeId(appt.employee_id || "");
    setAppointmentDate(appt.appointment_date || "");
    setStartTime(appt.start_time || "");
    setEndTime(appt.end_time || "");
    setStatus(appt.status || "pending");
    setNotes(appt.notes || "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!clientName.trim()) {
      toast.error("Veuillez entrer le nom du client");
      return;
    }
    if (!serviceId) {
      toast.error("Veuillez sélectionner un service");
      return;
    }
    if (!appointmentDate) {
      toast.error("Veuillez sélectionner une date");
      return;
    }
    if (!startTime) {
      toast.error("Veuillez sélectionner une heure de début");
      return;
    }

    setLoading(true);
    try {
      let finalClientId = clientId;
      if (!finalClientId) {
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            tenant_id: tenantId,
            name: clientName.trim(),
            phone: clientPhone || null,
            email: clientEmail || null,
            loyalty_points: 0,
            total_visits: 0,
            total_spent: 0,
          })
          .select()
          .single();

        if (clientError) throw clientError;
        finalClientId = newClient.id;
      }

      const appointmentData = {
        tenant_id: tenantId,
        client_id: finalClientId,
        service_id: serviceId,
        employee_id: employeeId || null,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        status: status,
        notes: notes || null,
        client_name: clientName.trim(),
        client_phone: clientPhone || null,
        client_email: clientEmail || null,
      };

      let error;
      if (appointment) {
        const { error: updateError } = await supabase
          .from("appointments")
          .update(appointmentData)
          .eq("id", appointment.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("appointments")
          .insert([appointmentData]);
        error = insertError;
      }

      if (error) throw error;

      toast.success(
        appointment ? "Rendez-vous mis à jour" : "Rendez-vous créé avec succès",
      );
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving appointment:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appointment ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}
          </DialogTitle>
          <DialogDescription>
            {appointment
              ? "Modifiez les informations du rendez-vous"
              : "Créez un nouveau rendez-vous pour votre salon"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Informations client */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground">
              Client
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nom complet *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nom du client"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Téléphone</Label>
                <Input
                  id="clientPhone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+226 54 32 92 99"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@email.com"
                />
              </div>
            </div>
          </div>

          {/* Sélection client existant */}
          {clients.length > 0 && (
            <div className="space-y-2">
              <Label>Client existant (optionnel)</Label>
              <Select
                value={clientId}
                onValueChange={(value) => {
                  if (value && value !== "") {
                    setClientId(value);
                    const client = clients.find((c) => c.id === value);
                    if (client) {
                      setClientName(client.name || "");
                      setClientPhone(client.phone || "");
                      setClientEmail(client.email || "");
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client existant" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} {client.phone ? `- ${client.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="border-t pt-4" />

          {/* Service et employé */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground">
              Service & Employé
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serviceId">Service *</Label>
                <Select value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services && services.length > 0 ? (
                      services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - {service.price?.toLocaleString()}{" "}
                          FCFA
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-services" disabled>
                        Aucun service disponible
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeId">Employé</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un employé" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees && employees.length > 0 ? (
                      employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.profile?.full_name ||
                            `Employé #${emp.employee_number}`}
                          {!emp.is_available && " (Occupé)"}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-employees" disabled>
                        Aucun employé disponible
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="border-t pt-4" />

          {/* Date et heure */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground">
              Date & Heure
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appointmentDate">Date *</Label>
                <Input
                  id="appointmentDate"
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Heure de début *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Heure de fin</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4" />

          {/* Statut et notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="confirmed">Confirmé</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informations supplémentaires"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Enregistrement..."
                : appointment
                  ? "Mettre à jour"
                  : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
