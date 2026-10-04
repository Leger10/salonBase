// /src/pages/ClientDetailPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/lib/supabase';
import DashboardLayout from "@/layouts/DashboardLayout.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  Award,
  Clock,
  Star,
  Gift,
  Edit,
  Trash2,
  Plus,
  MessageSquare,
  History,
  DollarSign,
  Store,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [client, setClient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalVisits: 0,
    loyaltyPoints: 0,
    averageRating: 0,
  });

  useEffect(() => {
    if (id) {
      fetchClientDetails();
    }
  }, [id]);

  const fetchClientDetails = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;

      // 1. Récupérer le client avec son profil
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select(
          `
          *,
          profile:profile_id (
            id,
            full_name,
            email,
            phone,
            is_active,
            avatar
          ),
          tenants:tenant_id (
            id,
            name,
            slug,
            logo_url,
            address,
            phone,
            email
          )
        `,
        )
        .eq("id", id);

      if (clientError) throw clientError;

      // ✅ Si plusieurs résultats (normalement un seul)
      const client = clientData?.[0] || null;
      if (!client) {
        toast.error("Client non trouvé");
        navigate("/admin/clients");
        return;
      }

      setClient(client);
      setTenantInfo(client.tenants);

      // 2. Récupérer les rendez-vous du client
      const { data: appointmentsData, error: appointmentsError } =
        await supabase
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
            employee_number,
            profile:profile_id (
              full_name
            )
          )
        `,
          )
          .eq("client_id", id)
          .order("appointment_date", { ascending: false })
          .order("start_time", { ascending: false });

      if (appointmentsError) throw appointmentsError;

      // 3. Calculer les statistiques
      const completedAppointments =
        appointmentsData?.filter((a) => a.status === "completed") || [];
      const totalSpent = completedAppointments.reduce(
        (sum, a) => sum + (a.total_price || 0),
        0,
      );
      const ratings = completedAppointments
        .filter((a) => a.rating)
        .map((a) => a.rating);
      const averageRating =
        ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : 0;

      setAppointments(appointmentsData || []);
      setStats({
        totalSpent,
        totalVisits: completedAppointments.length,
        loyaltyPoints: client.loyalty_points || 0,
        averageRating: parseFloat(averageRating.toFixed(1)),
      });
    } catch (error) {
      console.error("Error fetching client details:", error);
      toast.error("Erreur lors du chargement du profil client");
      navigate("/admin/clients");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      confirmed: { class: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", label: "Confirmé" },
      pending: { class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", label: "En attente" },
      completed: { class: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", label: "Terminé" },
      cancelled: { class: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", label: "Annulé" },
      in_progress: { class: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300", label: "En cours" },
      no_show: { class: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300", label: "Non présenté" },
    };
    return (
      <Badge className={config[status]?.class || "bg-gray-100"}>
        {config[status]?.label || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <Skeleton className="h-12 w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Client introuvable</p>
          <Button asChild className="mt-4">
            <Link to="/admin/clients">Retour à la liste</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const getInitials = (name) => {
    return name?.charAt(0)?.toUpperCase() || "C";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              <Link to="/admin/clients">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Profil Client</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Carte d'identité */}
          <Card className="lg:col-span-1 dashboard-card bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none shadow-lg">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center text-4xl font-bold mb-4">
                {getInitials(client.profile?.full_name)}
              </div>
              <h2 className="text-2xl font-bold mb-1">
                {client.profile?.full_name}
              </h2>
              <Badge
                variant="outline"
                className="bg-white/10 text-white border-white/20 mb-6"
              >
                {client.profile?.is_active ? "Actif" : "Inactif"}
              </Badge>

              <div className="w-full space-y-3 text-sm text-primary-foreground/90 text-left">
                {client.profile?.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4" />
                    <span>{client.profile.email}</span>
                  </div>
                )}
                {client.profile?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4" />
                    <span>{client.profile.phone}</span>
                  </div>
                )}
                {client.birthday && (
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-4 h-4" />
                    <span>
                      {format(new Date(client.birthday), "dd MMMM yyyy", {
                        locale: fr,
                      })}
                    </span>
                  </div>
                )}
                {client.allergies && (
                  <div className="flex items-start gap-3">
                    <span className="text-xs bg-red-500/30 px-2 py-0.5 rounded">
                      ⚠️
                    </span>
                    <span className="text-sm">
                      Allergies: {client.allergies}
                    </span>
                  </div>
                )}
                {tenantInfo && (
                  <div className="flex items-center gap-3 pt-2 border-t border-white/20">
                    <Store className="w-4 h-4" />
                    <span className="text-sm">{tenantInfo.name}</span>
                  </div>
                )}
              </div>

              {/* Statistiques */}
              <div className="grid grid-cols-3 gap-4 w-full mt-6 pt-6 border-t border-white/20">
                <div className="text-center">
                  <p className="text-primary-foreground/60 text-xs uppercase tracking-wider mb-1">
                    Dépensé
                  </p>
                  <p className="text-xl font-bold">
                    {stats.totalSpent.toLocaleString()} FCFA
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-primary-foreground/60 text-xs uppercase tracking-wider mb-1">
                    Visites
                  </p>
                  <p className="text-xl font-bold">{stats.totalVisits}</p>
                </div>
                <div className="text-center">
                  <p className="text-primary-foreground/60 text-xs uppercase tracking-wider mb-1">
                    Points
                  </p>
                  <p className="text-xl font-bold flex items-center justify-center gap-1">
                    <Award className="w-4 h-4 text-amber-300" />
                    {stats.loyaltyPoints}
                  </p>
                </div>
              </div>

              {stats.averageRating > 0 && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/20">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm">
                    Note moyenne: {stats.averageRating}/5
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historique des rendez-vous */}
          <Card className="lg:col-span-2 dashboard-card border-none shadow-md">
            <Tabs
              defaultValue="appointments"
              className="w-full h-full flex flex-col"
            >
              <CardHeader className="pb-0 border-b">
                <TabsList className="bg-transparent border-b-0 w-full justify-start rounded-none h-auto p-0 space-x-6">
                  <TabsTrigger
                    value="appointments"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-0 gap-2"
                  >
                    <History className="h-4 w-4" />
                    Historique des visites
                  </TabsTrigger>
                  <TabsTrigger
                    value="notes"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-0 gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Notes internes
                  </TabsTrigger>
                  <TabsTrigger
                    value="loyalty"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-0 gap-2"
                  >
                    <Gift className="h-4 w-4" />
                    Fidélité
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="p-6 flex-1">
                <TabsContent value="appointments" className="m-0">
                  {appointments.length === 0 ? (
                    <div className="text-center py-12">
                      <History className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-30" />
                      <p className="text-muted-foreground">
                        Aucun rendez-vous trouvé
                      </p>
                      <Button variant="link" asChild className="mt-2">
                        <Link to="/admin/appointments/new">
                          Créer un rendez-vous
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {appointments.map((appt) => (
                        <div
                          key={appt.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border hover:shadow-md transition-all"
                        >
                          <div className="flex items-start gap-4">
                            <div className="bg-muted rounded-lg p-3 text-center min-w-[70px]">
                              <p className="text-xs font-bold text-muted-foreground uppercase">
                                {format(
                                  new Date(appt.appointment_date),
                                  "MMM",
                                  { locale: fr },
                                )}
                              </p>
                              <p className="text-lg font-bold">
                                {format(new Date(appt.appointment_date), "dd")}
                              </p>
                            </div>
                            <div>
                              <p className="font-bold">
                                {appt.service?.name || "Service"}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                <Clock className="h-3 w-3" />
                                {appt.start_time} - {appt.end_time}
                              </p>
                              {appt.employee?.profile?.full_name && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Avec {appt.employee.profile.full_name}
                                </p>
                              )}
                              {appt.rating && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs">
                                    {appt.rating}/5
                                  </span>
                                  {appt.review && (
                                    <span className="text-xs text-muted-foreground">
                                      • "{appt.review}"
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-left sm:text-right mt-3 sm:mt-0">
                            <p className="font-bold text-primary">
                              {appt.total_price?.toLocaleString()} FCFA
                            </p>
                            <div className="mt-1">
                              {getStatusBadge(appt.status)}
                            </div>
                            <Button
                              variant="link"
                              size="sm"
                              asChild
                              className="h-auto p-0 mt-1"
                            >
                              <Link to={`/admin/appointments/${appt.id}`}>
                                Détails
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="m-0">
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-30" />
                    <p className="text-muted-foreground">Aucune note interne</p>
                    <Button variant="outline" className="mt-4 gap-2">
                      <Plus className="h-4 w-4" />
                      Ajouter une note
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="loyalty" className="m-0">
                  <div className="space-y-6">
                    <div className="text-center p-6 bg-primary/5 rounded-xl">
                      <Award className="h-12 w-12 text-primary mx-auto mb-3" />
                      <p className="text-3xl font-bold text-primary">
                        {stats.loyaltyPoints}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Points fidélité
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold">
                        Comment gagner des points ?
                      </h3>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• 1 point pour 100 FCFA dépensés</li>
                        <li>• 50 points bonus pour 5 visites</li>
                        <li>• Points anniversaire</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}