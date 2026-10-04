// /src/pages/TicketQueuePage.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Ticket,
  Bell,
  Volume2,
  VolumeX,
  Loader2,
  ArrowLeft,
  Clock,
  XCircle,
  CheckCircle,
  Users,
  Calendar,
  User,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function TicketQueuePage() {
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get('service');
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);
  const [todayTickets, setTodayTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [serviceError, setServiceError] = useState(null);
  
  // État pour les clients non authentifiés
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [showGuestForm, setShowGuestForm] = useState(false);

  // Récupérer le tenant actif
  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('id, name, slug')
          .eq('subscription_status', 'active')
          .limit(1)
          .single();

        if (error) throw error;
        if (data) {
          setTenantId(data.id);
          setTenant(data);
        }
      } catch (error) {
        console.error('Error fetching tenant:', error);
        toast.error('Impossible de charger le salon');
      }
    };
    fetchTenant();
  }, []);

  // Si un service est spécifié, le récupérer
  useEffect(() => {
    const fetchService = async () => {
      if (!serviceId || !tenantId) return;
      
      try {
        setServiceError(null);
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('id', serviceId)
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching service:', error);
          setServiceError('Erreur lors du chargement du service');
          return;
        }

        if (data) {
          setSelectedService(data);
        } else {
          setServiceError('Ce service n\'est pas disponible dans ce salon');
          toast.warning('Service non trouvé');
        }
      } catch (error) {
        console.error('Error fetching service:', error);
        setServiceError('Impossible de charger le service');
      }
    };
    fetchService();
  }, [serviceId, tenantId]);

  // Fonction de lecture audio
  const playSound = async (soundName = "ticket.mp3") => {
    if (!soundEnabled) return;
    try {
      const audio = new Audio(`/sounds/${soundName}?t=${Date.now()}`);
      audio.volume = 0.5;
      await audio.play();
    } catch (error) {
      console.debug("Audio not available:", error);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchTodayTickets();
      const interval = setInterval(fetchTodayTickets, 30000);
      return () => clearInterval(interval);
    }
  }, [tenantId]);

  useEffect(() => {
    if (isAuthenticated && tenantId) {
      fetchTicket();
    } else {
      setFetching(false);
    }
  }, [isAuthenticated, tenantId]);

  const fetchTicket = async () => {
    setFetching(true);
    try {
      const profileId = currentUser?.profile?.id;

      if (!tenantId || !profileId) {
        setTicket(null);
        setFetching(false);
        return;
      }

      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id")
        .eq("profile_id", profileId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (clientError && clientError.code !== "PGRST116") {
        console.error("Error fetching client:", clientError);
        setFetching(false);
        return;
      }

      if (!client) {
        setTicket(null);
        setFetching(false);
        return;
      }

      // ✅ Récupérer UNIQUEMENT les tickets non archivés
      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .select("*")
        .eq("client_id", client.id)
        .eq("tenant_id", tenantId)
        .neq("status", "archived") // ✅ EXCLURE les archivés
        .in("status", ["waiting", "called", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ticketError) throw ticketError;

      setTicket(ticketData || null);

      if (ticketData) {
        updateQueuePosition(ticketData);
      }
    } catch (error) {
      console.error("Error fetching ticket:", error);
    } finally {
      setFetching(false);
    }
  };

  // ✅ Récupérer les tickets du jour (exclure les archivés)
  const fetchTodayTickets = async () => {
    if (!tenantId) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("date", today)
        .neq("status", "archived") // ✅ EXCLURE les archivés
        .in("status", ["waiting", "called", "in_progress", "served", "completed"])
        .order("ticket_number", { ascending: true });

      if (error) throw error;
      setTodayTickets(data || []);
    } catch (error) {
      console.error("Error fetching today tickets:", error);
    }
  };

  const updateQueuePosition = async (currentTicket) => {
    if (!currentTicket) return;

    try {
      // ✅ Compter uniquement les tickets en attente non archivés
      const { data: waitingTickets, error } = await supabase
        .from("tickets")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("status", "waiting")
        .neq("status", "archived") // ✅ EXCLURE les archivés
        .order("ticket_number", { ascending: true });

      if (error) throw error;

      const position =
        waitingTickets?.findIndex((t) => t.id === currentTicket.id) + 1;
      setQueuePosition(position > 0 ? position : null);
    } catch (error) {
      console.error("Error updating queue position:", error);
    }
  };

  // ✅ PRISE DE TICKET AVEC PRIX DU SERVICE
  const takeTicket = async () => {
    setLoading(true);
    try {
      if (!tenantId) {
        toast.error("Salon non trouvé");
        return;
      }

      let clientId = null;

      // Si l'utilisateur est connecté, utiliser son profil
      if (isAuthenticated) {
        const profileId = currentUser?.profile?.id;
        if (!profileId) {
          toast.error("Profil non trouvé");
          return;
        }

        const { data: existingClient, error: clientError } = await supabase
          .from("clients")
          .select("id")
          .eq("profile_id", profileId)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (clientError) throw clientError;

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          const { data: newClient, error: createError } = await supabase
            .from("clients")
            .insert({
              profile_id: profileId,
              tenant_id: tenantId,
              name: currentUser?.profile?.full_name || "Client",
              email: currentUser?.profile?.email || currentUser?.email,
              phone: currentUser?.profile?.phone || null,
              loyalty_points: 0,
              total_visits: 0,
              total_spent: 0,
            })
            .select()
            .single();

          if (createError) throw createError;
          clientId = newClient.id;
        }
      } else {
        // Mode invité
        if (!guestName.trim()) {
          toast.error("Veuillez entrer votre nom");
          setLoading(false);
          return;
        }

        const { data: existingClient, error: clientError } = await supabase
          .from("clients")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("name", guestName.trim())
          .maybeSingle();

        if (clientError && clientError.code !== 'PGRST116') {
          console.error('Error searching client:', clientError);
        }

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          const { data: newClient, error: createError } = await supabase
            .from("clients")
            .insert({
              tenant_id: tenantId,
              name: guestName.trim(),
              phone: guestPhone || null,
              loyalty_points: 0,
              total_visits: 0,
              total_spent: 0,
            })
            .select()
            .single();

          if (createError) throw createError;
          clientId = newClient.id;
        }
      }

      const today = new Date().toISOString().split("T")[0];

      // ✅ Récupérer le dernier numéro de ticket (non archivé)
      const { data: lastTicket, error: lastError } = await supabase
        .from("tickets")
        .select("ticket_number")
        .eq("tenant_id", tenantId)
        .eq("date", today)
        .neq("status", "archived") // ✅ EXCLURE les archivés
        .order("ticket_number", { ascending: false })
        .limit(1);

      if (lastError) throw lastError;

      const newNumber = (lastTicket?.[0]?.ticket_number || 0) + 1;

      // ✅ CONSTRUCTION DU TICKET AVEC LE PRIX DU SERVICE
      const ticketData = {
        tenant_id: tenantId,
        client_id: clientId,
        client_name: isAuthenticated ? currentUser?.profile?.full_name || "Client" : guestName.trim(),
        client_phone: isAuthenticated ? currentUser?.profile?.phone || null : guestPhone || null,
        ticket_number: newNumber,
        status: "waiting",
        date: today,
        created_by: isAuthenticated ? "client_portal" : "guest",
        service_price: selectedService?.price || 0,
        service_id: selectedService?.id || null,
         estimated_duration: selectedService?.duration || null,
      };

      // Ajouter le service si spécifié
      if (selectedService) {
        ticketData.service_type = selectedService.name;
        ticketData.service_id = selectedService.id;
        ticketData.estimated_duration = selectedService.duration;
        ticketData.service_price = selectedService.price || 0;
      }

      const { data, error } = await supabase
        .from("tickets")
        .insert(ticketData)
        .select()
        .single();

      if (error) throw error;

      setTicket(data);
      await playSound("success.mp3");
      toast.success(`Ticket #${newNumber} pris avec succès !`);
      
      // Afficher le prix dans la notification
      if (selectedService?.price) {
        toast.info(`💰 ${selectedService.price.toLocaleString()} FCFA - ${selectedService.name}`);
      }
      
      updateQueuePosition(data);
      fetchTodayTickets();
    } catch (error) {
      console.error("Error taking ticket:", error);
      toast.error("Erreur lors de la prise du ticket: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelTicket = async () => {
    if (!ticket) return;

    if (!confirm("Êtes-vous sûr de vouloir annuler votre ticket ?")) return;

    try {
      const { error } = await supabase
        .from("tickets")
        .update({ status: "cancelled" })
        .eq("id", ticket.id);

      if (error) throw error;

      toast.success("Ticket annulé");
      setTicket(null);
      setQueuePosition(null);
      fetchTicket();
      fetchTodayTickets();
    } catch (error) {
      console.error("Error cancelling ticket:", error);
      toast.error("Erreur lors de l'annulation");
    }
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    toast.info(soundEnabled ? "🔇 Son désactivé" : "🔊 Son activé");
  };

  const handleRefresh = () => {
    fetchTodayTickets();
    if (isAuthenticated) {
      fetchTicket();
    }
    toast.info("🔄 File d'attente actualisée");
  };

  if (!tenantId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  const todayStats = {
    waiting: todayTickets.filter(t => t.status === 'waiting').length,
    called: todayTickets.filter(t => t.status === 'called').length,
    inProgress: todayTickets.filter(t => t.status === 'in_progress').length,
    served: todayTickets.filter(t => t.status === 'served' || t.status === 'completed').length,
    total: todayTickets.length
  };

  const hasValidTicket = ticket && (
    isAuthenticated || 
    (ticket.client_name === guestName && guestName.trim() !== '')
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualiser
          </Button>
        </div>

        {/* Message d'erreur si le service n'est pas trouvé */}
        {serviceError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700">Service non disponible</p>
              <p className="text-sm text-red-600">{serviceError}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => navigate('/services')}
              >
                Voir tous les services
              </Button>
            </div>
          </div>
        )}

        {selectedService && (
          <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm text-muted-foreground">Ticket pour le service :</p>
            <p className="font-semibold">{selectedService.name}</p>
            <p className="text-sm text-muted-foreground">
              {selectedService.price?.toLocaleString()} FCFA - {selectedService.duration} min
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold">File d'attente</h1>
            <p className="text-muted-foreground">
              {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSound}
            className="text-muted-foreground hover:text-primary"
            title={soundEnabled ? "Désactiver le son" : "Activer le son"}
          >
            {soundEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Statistiques du jour */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="text-center p-2 bg-yellow-50 rounded-lg">
            <p className="text-lg font-bold text-yellow-600">{todayStats.waiting}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <p className="text-lg font-bold text-blue-600">{todayStats.called}</p>
            <p className="text-xs text-muted-foreground">Appelés</p>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded-lg">
            <p className="text-lg font-bold text-purple-600">{todayStats.inProgress}</p>
            <p className="text-xs text-muted-foreground">En cours</p>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <p className="text-lg font-bold text-green-600">{todayStats.served}</p>
            <p className="text-xs text-muted-foreground">Servis</p>
          </div>
        </div>

        {/* File d'attente du jour */}
        {todayTickets.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                📋 Tickets du jour ({todayTickets.length})
              </p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {todayTickets.map((t) => {
                  const statusColors = {
                    waiting: 'bg-yellow-100 text-yellow-800',
                    called: 'bg-blue-100 text-blue-800',
                    in_progress: 'bg-purple-100 text-purple-800',
                    served: 'bg-green-100 text-green-800',
                    completed: 'bg-green-100 text-green-800',
                    cancelled: 'bg-gray-100 text-gray-400'
                  };
                  return (
                    <Badge key={t.id} className={statusColors[t.status] || 'bg-gray-100'}>
                      #{t.ticket_number}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {!hasValidTicket ? (
          <Card className="text-center p-8">
            <Ticket className="h-16 w-16 mx-auto text-primary mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Vous n'avez pas de ticket en cours
            </p>
            
            {/* Formulaire pour les invités */}
            {!isAuthenticated && (
              <div className="space-y-3 mb-4 text-left">
                <div>
                  <Label htmlFor="guestName" className="text-sm">Votre nom *</Label>
                  <Input
                    id="guestName"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Entrez votre nom"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="guestPhone" className="text-sm">Téléphone (optionnel)</Label>
                  <Input
                    id="guestPhone"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="Votre numéro de téléphone"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <Button
              onClick={takeTicket}
              disabled={loading || (!isAuthenticated && !guestName.trim()) || !!serviceError}
              size="lg"
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Prendre un ticket
            </Button>

            {!isAuthenticated && (
              <p className="text-xs text-muted-foreground mt-3">
                💡 Pas besoin de compte ! Entrez simplement votre nom pour prendre un ticket.
              </p>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="text-center p-8 bg-primary/5 border-primary/20">
              <p className="text-sm text-muted-foreground">Votre numéro</p>
              <p className="text-6xl font-bold text-primary">
                #{ticket.ticket_number}
              </p>
              {queuePosition && (
                <p className="mt-2 text-sm">
                  Position dans la file : <strong>{queuePosition}</strong>
                </p>
              )}
              <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                <Badge
                  className={
                    ticket.status === "waiting"
                      ? "bg-yellow-100 text-yellow-800"
                      : ticket.status === "called"
                        ? "bg-blue-100 text-blue-800 animate-pulse"
                        : ticket.status === "in_progress"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-green-100 text-green-800"
                  }
                >
                  {ticket.status === "waiting"
                    ? "En attente"
                    : ticket.status === "called"
                      ? "Appelé 📢"
                      : ticket.status === "in_progress"
                        ? "En cours 💆"
                        : ticket.status}
                </Badge>
                {ticket.service_type && (
                  <Badge variant="outline" className="text-xs">
                    {ticket.service_type}
                  </Badge>
                )}
                {/* ✅ Afficher le prix du service */}
                {ticket.service_price > 0 && (
                  <Badge className="bg-green-100 text-green-800">
                    {ticket.service_price.toLocaleString()} FCFA
                  </Badge>
                )}
              </div>
              {!isAuthenticated && (
                <p className="text-xs text-muted-foreground mt-2">
                  👤 {ticket.client_name}
                </p>
              )}
            </Card>

            {ticket.status === "called" && (
              <Card className="text-center p-6 bg-green-50 border-green-200 animate-pulse">
                <Bell className="h-12 w-12 mx-auto text-green-600 mb-2" />
                <p className="font-semibold text-green-800 text-lg">
                  🔔 Votre tour est arrivé !
                </p>
                <p className="text-sm text-muted-foreground">
                  Rendez-vous au comptoir
                </p>
              </Card>
            )}

            {ticket.status === "in_progress" && (
              <Card className="text-center p-6 bg-purple-50 border-purple-200">
                <Clock className="h-12 w-12 mx-auto text-purple-600 mb-2" />
                <p className="font-semibold text-purple-800 text-lg">
                  💆 En cours de service
                </p>
                <p className="text-sm text-muted-foreground">
                  Votre prestation a commencé
                </p>
              </Card>
            )}

            {ticket.status === "waiting" && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={cancelTicket}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Annuler mon ticket
              </Button>
            )}
          </div>
        )}

        <Button variant="outline" className="w-full mt-4" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l'accueil
          </Link>
        </Button>
      </div>

      <Footer />
    </div>
  );
}