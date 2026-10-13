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
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
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
  Loader2,
  Save,
  MessageSquare,
  History,
  DollarSign,
  Store,
  Ticket,
  ShoppingBag,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { activityForClient } from "@/lib/clientActivity";

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  // Les employes consultent le profil mais ne le modifient pas.
  const canManage = currentUser?.profile?.role !== "employee";
  const [client, setClient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [clientTickets, setClientTickets] = useState([]);
  const [clientTransactions, setClientTransactions] = useState([]);
  const [clientGiftCards, setClientGiftCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalVisits: 0,
    loyaltyPoints: 0,
    averageRating: 0,
  });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    birthday: "",
    allergies: "",
    notes: "",
    loyalty_points: "0",
  });
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

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

      // 2. Récupérer l'activité de l'établissement puis la rattacher au client
      // (id direct, sinon téléphone / email — l'activité publique n'a pas
      // toujours de client_id).
      const [appointmentsRes, ticketsRes, transactionsRes, giftCardsRes] =
        await Promise.all([
          supabase
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
        `
            )
            .eq("tenant_id", client.tenant_id),
          supabase
            .from("tickets")
            .select(
              "id, client_id, client_name, client_phone, client_email, status, service_price, service_type, ticket_number, date, created_at"
            )
            .eq("tenant_id", client.tenant_id),
          supabase
            .from("transactions")
            .select(
              "id, client_id, customer_id, customer_phone, customer_name, amount, status, description, receipt_number, transaction_date, created_at"
            )
            .eq("tenant_id", client.tenant_id),
          supabase
            .from("gift_cards")
            .select(
              "id, code, recipient_name, recipient_phone, recipient_email, sender_name, sender_phone, amount, status, created_at"
            )
            .eq("tenant_id", client.tenant_id),
        ]);

      if (appointmentsRes.error) throw appointmentsRes.error;

      const apptByClient = activityForClient(client, {
        appointments: appointmentsRes.data || [],
      });
      const ticketsByClient = activityForClient(client, {
        tickets: ticketsRes.data || [],
      });
      const txByClient = activityForClient(client, {
        transactions: transactionsRes.data || [],
      });
      const giftCardsByClient = activityForClient(client, {
        giftCards: giftCardsRes.data || [],
      });

      const appointmentsData = apptByClient.appointments || [];
      appointmentsData.sort(
        (a, b) =>
          new Date(b.appointment_date) - new Date(a.appointment_date) ||
          new Date(b.start_time) - new Date(a.start_time)
      );
      setClientTickets(ticketsByClient.tickets || []);
      setClientTransactions(txByClient.transactions || []);
      setClientGiftCards(giftCardsByClient.giftCards || []);

      // 3. Calculer les statistiques
      const completedAppointments =
        appointmentsData.filter((a) => a.status === "completed") || [];
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

      setAppointments(appointmentsData);
      setStats({
        totalSpent,
        totalVisits: appointmentsData.length + (ticketsByClient.tickets?.length || 0),
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

  const openEditDialog = () => {
    setEditForm({
      name: client.profile?.full_name || client.name || "",
      phone: client.profile?.phone || client.phone || "",
      email: client.profile?.email || client.email || "",
      birthday: client.birthday
        ? format(new Date(client.birthday), "yyyy-MM-dd")
        : "",
      allergies: client.allergies || "",
      notes: client.notes || "",
      loyalty_points: String(client.loyalty_points ?? 0),
    });
    setIsEditOpen(true);
  };

  const handleSaveClient = async () => {
    if (!editForm.name.trim()) {
      toast.error("Le nom du client est obligatoire");
      return;
    }
    setSavingClient(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null,
        birthday: editForm.birthday || null,
        allergies: editForm.allergies.trim() || null,
        notes: editForm.notes,
      };
      const points = parseInt(editForm.loyalty_points, 10);
      if (!Number.isNaN(points)) payload.loyalty_points = points;

      const { error: clientError } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", client.id);
      if (clientError) throw clientError;

      if (client.profile_id) {
        const profilePayload = { full_name: payload.name };
        if (payload.phone) profilePayload.phone = payload.phone;
        if (payload.email) profilePayload.email = payload.email;

        const { error: profileError } = await supabase
          .from("profiles")
          .update(profilePayload)
          .eq("id", client.profile_id);
        if (profileError) {
          console.warn("Profil lie non mis a jour:", profileError);
        }
      }

      toast.success("Client mis à jour");
      setIsEditOpen(false);
      fetchClientDetails();
    } catch (err) {
      console.error("Error saving client:", err);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSavingClient(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const stamp = format(new Date(), "dd/MM/yyyy HH:mm");
      const existing = (client.notes || "").trim();
      const entry = `[${stamp}] ${newNote.trim()}`;
      const merged = existing ? `${existing}\n${entry}` : entry;

      const { error } = await supabase
        .from("clients")
        .update({ notes: merged })
        .eq("id", client.id);

      if (error) throw error;

      setClient((c) => ({ ...c, notes: merged }));
      setNewNote("");
      toast.success("Note ajoutée");
    } catch (err) {
      console.error("Error adding note:", err);
      toast.error("Erreur lors de l'ajout de la note");
    } finally {
      setSavingNote(false);
    }
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
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openEditDialog}>
                <Edit className="h-4 w-4" />
                Modifier
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Carte d'identité */}
          <Card className="lg:col-span-1 dashboard-card bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none shadow-lg">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center text-4xl font-bold mb-4">
                {getInitials(client.profile?.full_name || client.name)}
              </div>
              <h2 className="text-2xl font-bold mb-1">
                {client.profile?.full_name || client.name}
              </h2>
              <Badge
                variant="outline"
                className="bg-white/10 text-white border-white/20 mb-6"
              >
                {client.profile?.is_active ? "Actif" : "Inactif"}
              </Badge>

              <div className="w-full space-y-3 text-sm text-primary-foreground/90 text-left">
                {(client.profile?.email || client.email) && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4" />
                    <span>{client.profile?.email || client.email}</span>
                  </div>
                )}
                {(client.profile?.phone || client.phone) && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4" />
                    <span>{client.profile?.phone || client.phone}</span>
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
              <div className="grid grid-cols-2 gap-4 w-full mt-6 pt-6 border-t border-white/20">
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
                <div className="text-center">
                  <p className="text-primary-foreground/60 text-xs uppercase tracking-wider mb-1">
                    Cartes cadeaux
                  </p>
                  <p className="text-xl font-bold flex items-center justify-center gap-1">
                    <Gift className="w-4 h-4 text-amber-300" />
                    {clientGiftCards.length}
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
                    value="tickets"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-0 gap-2"
                  >
                    <Ticket className="h-4 w-4" />
                    Tickets ({clientTickets.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="purchases"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-0 gap-2"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Achats ({clientTransactions.length})
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

                <TabsContent value="tickets" className="m-0">
                  {clientTickets.length === 0 ? (
                    <div className="text-center py-12">
                      <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-30" />
                      <p className="text-muted-foreground">
                        Aucun ticket pour ce client
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {clientTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">
                              #{ticket.ticket_number} -{" "}
                              {ticket.service_type || "Service"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ticket.date
                                ? format(new Date(ticket.date), "dd/MM/yyyy")
                                : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">
                              {Number(ticket.service_price || 0).toLocaleString()} FCFA
                            </p>
                            {getStatusBadge(ticket.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="purchases" className="m-0">
                  {clientTransactions.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-30" />
                      <p className="text-muted-foreground">
                        Aucun achat pour ce client
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {clientTransactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">
                              {tx.description || tx.customer_name || "Achat"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {tx.transaction_date
                                ? format(
                                    new Date(tx.transaction_date),
                                    "dd/MM/yyyy"
                                  )
                                : ""}{" "}
                              •{" "}
                              {tx.receipt_number || tx.description || ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">
                              {Number(tx.amount || 0).toLocaleString()} FCFA
                            </p>
                            {getStatusBadge(tx.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="m-0">
                  <div className="space-y-4">
                    {canManage && (
                      <div className="space-y-2">
                        <Label htmlFor="new-note">Ajouter une note interne</Label>
                        <Textarea
                          id="new-note"
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Ex: préférence de coiffure, remarque, suivi..."
                          rows={3}
                        />
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={handleAddNote}
                            disabled={savingNote || !newNote.trim()}
                          >
                            {savingNote ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                            Ajouter une note
                          </Button>
                        </div>
                      </div>
                    )}

                    {client.notes?.trim() ? (
                      <div className="rounded-xl border bg-muted/30 p-4">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {client.notes}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-30" />
                        <p className="text-muted-foreground">
                          Aucune note interne
                        </p>
                      </div>
                    )}
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
                    {clientGiftCards.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold">
                          Cartes cadeaux ({clientGiftCards.length})
                        </h3>
                        <div className="space-y-2">
                          {clientGiftCards.map((card) => (
                            <div
                              key={card.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div>
                                <p className="font-medium">
                                  {card.recipient_name || "Bénéficiaire"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Code {card.code || "—"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-primary">
                                  {Number(card.amount || 0).toLocaleString()} FCFA
                                </p>
                                {getStatusBadge(card.status)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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

      {/* Modale d'édition du client */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations du profil client.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nom complet *</Label>
              <Input
                id="client-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-phone">Téléphone</Label>
              <Input
                id="client-phone"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-birthday">Anniversaire</Label>
              <Input
                id="client-birthday"
                type="date"
                value={editForm.birthday}
                onChange={(e) =>
                  setEditForm({ ...editForm, birthday: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-points">Points fidélité</Label>
              <Input
                id="client-points"
                type="number"
                min="0"
                value={editForm.loyalty_points}
                onChange={(e) =>
                  setEditForm({ ...editForm, loyalty_points: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="client-allergies">Allergies</Label>
              <Input
                id="client-allergies"
                value={editForm.allergies}
                onChange={(e) =>
                  setEditForm({ ...editForm, allergies: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="client-notes">Notes internes</Label>
              <Textarea
                id="client-notes"
                rows={3}
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={savingClient}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveClient}
              disabled={savingClient}
              className="gap-2"
            >
              {savingClient ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}