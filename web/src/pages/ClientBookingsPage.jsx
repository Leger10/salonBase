// /src/pages/ClientBookingsPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Scissors,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  CalendarDays,
  ListChecks,
  Loader2,
  Eye,
  Store,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export default function ClientBookingsPage() {
  const { currentUser, isAuthenticated } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [isLoadingClients, setIsLoadingClients] = useState(true);

  useEffect(() => {
    if (isAuthenticated && currentUser?.profile?.id) {
      fetchUserClients();
    }
  }, [isAuthenticated, currentUser]);

  const fetchUserClients = async () => {
    setIsLoadingClients(true);
    try {
      const profileId = currentUser?.profile?.id;
      const { data, error } = await supabase
        .from("clients")
        .select("id, tenant_id, tenants:tenant_id (id, name)")
        .eq("profile_id", profileId);

      if (error) throw error;
      setClients(data || []);
      
      if (data && data.length > 0) {
        const tenantId = currentUser?.profile?.tenant_id;
        let defaultClient = data[0];
        if (tenantId) {
          const tenantClient = data.find(c => c.tenant_id === tenantId);
          if (tenantClient) defaultClient = tenantClient;
        }
        setSelectedClientId(defaultClient.id);
        await fetchAppointments(defaultClient.id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching user clients:", error);
      setLoading(false);
    } finally {
      setIsLoadingClients(false);
    }
  };

  const fetchAppointments = async (clientId) => {
    setLoading(true);
    try {
      if (!clientId) {
        setAppointments([]);
        setFilteredAppointments([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          service:service_id (
            id,
            name,
            duration,
            price
          ),
          employee:employee_id (
            id,
            profile:profile_id (
              full_name,
              avatar,
              phone
            )
          )
        `,
        )
        .eq("client_id", clientId)
        .order("appointment_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (error) throw error;

      setAppointments(data || []);
      setFilteredAppointments(data || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Erreur lors du chargement des rendez-vous");
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = async (clientId) => {
    setSelectedClientId(clientId);
    await fetchAppointments(clientId);
    setFilterStatus("all");
  };

  useEffect(() => {
    if (filterStatus === "all") {
      setFilteredAppointments(appointments);
    } else {
      const filtered = appointments.filter((a) => a.status === filterStatus);
      setFilteredAppointments(filtered);
    }
  }, [filterStatus, appointments]);

  const getStatusBadge = (status) => {
    const config = {
      pending: {
        label: "En attente",
        className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
        icon: ClockIcon,
      },
      confirmed: {
        label: "Confirmé",
        className: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        icon: CheckCircle,
      },
      in_progress: {
        label: "En cours",
        className: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        icon: Clock,
      },
      completed: {
        label: "Terminé",
        className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        icon: CheckCircle,
      },
      cancelled: {
        label: "Annulé",
        className: "bg-red-500/20 text-red-300 border-red-500/30",
        icon: XCircle,
      },
      no_show: {
        label: "Non présenté",
        className: "bg-gray-500/20 text-gray-300 border-gray-500/30",
        icon: XCircle,
      },
    };
    return config[status] || config.pending;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "border-yellow-500/30 bg-yellow-950/30",
      confirmed: "border-blue-500/30 bg-blue-950/30",
      in_progress: "border-purple-500/30 bg-purple-950/30",
      completed: "border-emerald-500/30 bg-emerald-950/30",
      cancelled: "border-red-500/30 bg-red-950/30",
      no_show: "border-gray-500/30 bg-gray-800/30",
    };
    return colors[status] || colors.pending;
  };

  const statusCounts = {
    all: appointments.length,
    pending: appointments.filter((a) => a.status === "pending").length,
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
    completed: appointments.filter((a) => a.status === "completed").length,
    cancelled: appointments.filter((a) => a.status === "cancelled").length,
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center py-16">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold mb-2">Non authentifié</h2>
        <p className="text-muted-foreground">
          Veuillez vous connecter pour voir vos rendez-vous.
        </p>
        <Button className="mt-4" asChild>
          <Link to="/login">Se connecter</Link>
        </Button>
      </div>
    );
  }

  if (isLoadingClients) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-16">
          <div className="rounded-full bg-primary/10 p-6 mb-6 mx-auto w-24 h-24 flex items-center justify-center">
            <CalendarIcon className="h-12 w-12 text-primary/60" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Aucun rendez-vous</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Vous n'avez pas encore de rendez-vous. Commencez dès maintenant !
          </p>
          <Button asChild className="mt-4">
            <Link to="/client/book">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Prendre un rendez-vous
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-primary" />
            Mes rendez-vous
          </h1>
          <p className="text-muted-foreground mt-1">
            {appointments.length} rendez-vous au total
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/client/book">
            <CalendarIcon className="h-4 w-4" />
            Prendre un rendez-vous
          </Link>
        </Button>
      </div>

      {/* Sélecteur de salon si plusieurs clients */}
      {clients.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg mb-4">
          <span className="text-sm font-medium text-muted-foreground">Vos salons :</span>
          {clients.map((client) => (
            <Button
              key={client.id}
              variant={selectedClientId === client.id ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => handleClientChange(client.id)}
            >
              <Store className="h-3 w-3" />
              {client.tenants?.name || 'Salon'}
            </Button>
          ))}
        </div>
      )}

      {/* Statistiques */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-4">
        <Card className="border-gray-700 bg-gray-900/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{statusCounts.all}</p>
              </div>
              <CalendarIcon className="h-6 w-6 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/30 bg-yellow-950/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-yellow-300">En attente</p>
                <p className="text-xl font-bold text-yellow-300">
                  {statusCounts.pending}
                </p>
              </div>
              <ClockIcon className="h-6 w-6 text-yellow-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/30 bg-emerald-950/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-300">Terminés</p>
                <p className="text-xl font-bold text-emerald-300">
                  {statusCounts.completed}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-emerald-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/30 bg-red-950/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-300">Annulés</p>
                <p className="text-xl font-bold text-red-300">
                  {statusCounts.cancelled}
                </p>
              </div>
              <XCircle className="h-6 w-6 text-red-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres par statut */}
      <Tabs value={filterStatus} onValueChange={setFilterStatus} className="mb-4">
        <TabsList className="bg-gray-900/50 border border-gray-700">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary/20">
            Tous ({statusCounts.all})
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-500/20">
            En attente ({statusCounts.pending})
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="data-[state=active]:bg-blue-500/20">
            Confirmés ({statusCounts.confirmed})
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-emerald-500/20">
            Terminés ({statusCounts.completed})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="data-[state=active]:bg-red-500/20">
            Annulés ({statusCounts.cancelled})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Liste des rendez-vous */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="text-center py-12 bg-gray-900/30 rounded-2xl border border-gray-700">
          <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-30" />
          <p className="text-lg font-medium text-muted-foreground">
            Aucun rendez-vous
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {filterStatus !== "all"
              ? "Aucun rendez-vous avec ce statut"
              : "Vous n'avez pas encore de rendez-vous"}
          </p>
          <Button asChild className="mt-3" size="sm">
            <Link to="/client/book">Prendre un rendez-vous</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appointment) => {
            const statusConfig = getStatusBadge(appointment.status);
            const StatusIcon = statusConfig.icon;
            const statusColor = getStatusColor(appointment.status);
            const serviceName = appointment.service?.name || "Service";
            const employeeName =
              appointment.employee?.profile?.full_name || "Professionnel";
            const dateStr = appointment.appointment_date
              ? format(
                  new Date(appointment.appointment_date),
                  "EEEE d MMMM yyyy",
                  { locale: fr },
                )
              : "";
            const bookingNumber =
              appointment.booking_number ||
              appointment.id.substring(0, 6).toUpperCase();

            return (
              <Card
                key={appointment.id}
                className={`border-2 ${statusColor} hover:shadow-lg transition-all`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 flex-shrink-0">
                        <Scissors className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg font-bold">
                            #{bookingNumber}
                          </span>
                          <Badge className={statusConfig.className}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="font-semibold">{serviceName}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {dateStr}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {appointment.start_time} - {appointment.end_time}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {employeeName}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        <Eye className="h-4 w-4" />
                        Détails
                      </Button>
                      {appointment.status === "pending" && (
                        <Button variant="destructive" size="sm" className="gap-1">
                          <XCircle className="h-4 w-4" />
                          Annuler
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}