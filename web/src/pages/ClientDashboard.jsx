import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Star, CreditCard, History, Plus, Gift, Wallet, TrendingUp, Bell, ChevronRight, Sparkles, Crown, Zap, Store, AlertCircle } from 'lucide-react';
import FloatingAiChat from '@/components/FloatingAiChat';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import TicketQueue from '@/components/client/TicketQueue';

export default function ClientDashboard() {
  const { currentUser } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    upcoming: 0,
    completed: 0,
    loyaltyPoints: 0,
    totalSpent: 0,
    totalVisits: 0,
    averageRating: 0
  });
  const [nextAppointment, setNextAppointment] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [clientData, setClientData] = useState(null);
  const [hasTenant, setHasTenant] = useState(true);
  const [allClients, setAllClients] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState(null);

  useEffect(() => {
    if (currentUser?.profile?.id) {
      fetchClientData();
      fetchPromotions();
    }
  }, [currentUser]);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      const profileId = currentUser?.profile?.id;
      const tenantId = currentUser?.profile?.tenant_id;

      // ✅ Récupérer TOUS les clients du profil (même sans tenant)
      const { data: allClientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          id,
          loyalty_points,
          total_visits,
          total_spent,
          profile_id,
          tenant_id,
          birthday,
          allergies,
          notes,
          tenants:tenant_id (
            id,
            name,
            slug,
            logo_url
          )
        `)
        .eq('profile_id', profileId);

      if (clientsError && clientsError.code !== 'PGRST116') {
        console.error('Error fetching clients:', clientsError);
      }

      // ✅ Si le client a des clients associés
      if (allClientsData && allClientsData.length > 0) {
        setAllClients(allClientsData);
        setHasTenant(true);

        // ✅ Priorité : tenant_id du profil OU premier client
        let targetClient = null;
        
        if (tenantId) {
          targetClient = allClientsData.find(c => c.tenant_id === tenantId);
        }
        
        if (!targetClient && allClientsData.length > 0) {
          targetClient = allClientsData[0];
        }

        if (targetClient) {
          setClientData(targetClient);
          setSelectedTenantId(targetClient.tenant_id);
          await loadClientAppointments(targetClient.id, targetClient.tenant_id);
          setStats(prev => ({
            ...prev,
            loyaltyPoints: targetClient.loyalty_points || 0,
            totalSpent: targetClient.total_spent || 0,
            totalVisits: targetClient.total_visits || 0
          }));
        }
      } else {
        // ✅ Aucun client existant - on en crée un si le profil a un tenant
        if (tenantId) {
          const { data: newClient, error: createError } = await supabase
            .from('clients')
            .insert({
              profile_id: profileId,
              tenant_id: tenantId,
              loyalty_points: 0,
              total_visits: 0,
              total_spent: 0,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (!createError && newClient) {
            setClientData(newClient);
            setAllClients([newClient]);
            setHasTenant(true);
            setSelectedTenantId(tenantId);
            // Pas de rendez-vous à charger, client nouveau
          }
        } else {
          // ✅ L'utilisateur n'a PAS de tenant - il peut voir son dashboard vide
          setHasTenant(false);
          setClientData(null);
          setAllClients([]);
        }
      }

    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fonction pour charger les rendez-vous d'un client
  const loadClientAppointments = async (clientId, tenantId) => {
    try {
      // Rendez-vous à venir
      const today = new Date().toISOString().split('T')[0];
      const { data: upcomingAppointments, error: upcomingError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          total_price,
          prepaid_amount,
          payment_status,
          rating,
          review,
          service:service_id (
            id,
            name,
            duration,
            price,
            description
          ),
          employee:employee_id (
            id,
            employee_number,
            profile:profile_id (
              id,
              full_name,
              avatar
            )
          ),
          room:room_id (
            id,
            name
          )
        `)
        .eq('client_id', clientId)
        .eq('tenant_id', tenantId)
        .in('status', ['confirmed', 'pending'])
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(10);

      if (upcomingError && upcomingError.code !== 'PGRST116') {
        console.error('Error fetching upcoming:', upcomingError);
      }

      // Historique
      const { data: historyData, error: historyError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          status,
          total_price,
          rating,
          review,
          service:service_id (
            id,
            name,
            price
          ),
          employee:employee_id (
            id,
            employee_number,
            profile:profile_id (
              id,
              full_name,
              avatar
            )
          )
        `)
        .eq('client_id', clientId)
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(5);

      if (historyError && historyError.code !== 'PGRST116') {
        console.error('Error fetching history:', historyError);
      }

      // Statistiques
      const { data: completedStats, error: statsError } = await supabase
        .from('appointments')
        .select('id, total_price, rating')
        .eq('client_id', clientId)
        .eq('tenant_id', tenantId)
        .eq('status', 'completed');

      if (statsError && statsError.code !== 'PGRST116') {
        console.error('Error fetching stats:', statsError);
      }

      const ratings = completedStats?.filter(a => a.rating).map(a => a.rating) || [];
      const averageRating = ratings.length > 0 
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
        : 0;

      setStats(prev => ({
        ...prev,
        upcoming: upcomingAppointments?.length || 0,
        completed: completedStats?.length || 0,
        averageRating: parseFloat(averageRating.toFixed(1))
      }));

      setAppointments(upcomingAppointments || []);
      setRecentHistory(historyData || []);
      
      if (upcomingAppointments && upcomingAppointments.length > 0) {
        setNextAppointment(upcomingAppointments[0]);
      }

    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  // ✅ Fonction pour changer de salon (si multiple)
  const switchTenant = async (clientId, tenantId) => {
    setLoading(true);
    try {
      const client = allClients.find(c => c.id === clientId);
      if (client) {
        setClientData(client);
        setSelectedTenantId(tenantId);
        await loadClientAppointments(clientId, tenantId);
        setStats(prev => ({
          ...prev,
          loyaltyPoints: client.loyalty_points || 0,
          totalSpent: client.total_spent || 0,
          totalVisits: client.total_visits || 0
        }));
      }
    } catch (error) {
      console.error('Error switching tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPromotions = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) return;

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .limit(3);

      if (error && error.code !== 'PGRST116') throw error;
      setPromotions(data || []);
    } catch (error) {
      console.error('Error fetching promotions:', error);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      confirmed: { class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', label: 'Confirmé' },
      pending: { class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', label: 'En attente' },
      completed: { class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: 'Terminé' },
      cancelled: { class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', label: 'Annulé' },
      no_show: { class: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300', label: 'Non présenté' },
      in_progress: { class: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', label: 'En cours' }
    };
    const { class: bgClass, label } = config[status] || config.pending;
    return <Badge className={bgClass}>{label}</Badge>;
  };

  const getLoyaltyTier = (points) => {
    if (points >= 2500) return { name: 'Platinum', icon: Crown, color: 'text-cyan-500 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-950/40' };
    if (points >= 1000) return { name: 'Gold', icon: Crown, color: 'text-yellow-500 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-950/40' };
    if (points >= 500) return { name: 'Silver', icon: Star, color: 'text-gray-400 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800/50' };
    return { name: 'Bronze', icon: Star, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/40' };
  };

  const tier = getLoyaltyTier(stats.loyaltyPoints);
  const TierIcon = tier.icon;

  // ✅ Affichage quand l'utilisateur n'a PAS de salon
  if (!hasTenant) {
    return (
      <div className="space-y-8 pb-20">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="rounded-full bg-primary/10 p-6 mb-6">
            <Store className="h-16 w-16 text-primary/60" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Bienvenue dans votre espace client</h2>
          <p className="text-muted-foreground max-w-md mb-4">
            Vous n'êtes actuellement associé à aucun salon. 
            Explorez notre annuaire pour découvrir les salons partenaires.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="gap-2">
              <Link to="/salons">
                <Store className="h-4 w-4" />
                Découvrir les salons
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/client/book">Prendre un rendez-vous</Link>
            </Button>
          </div>
        </div>

        {/* ✅ Accès rapide même sans salon */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-none shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Prendre RDV</p>
                  <p className="text-sm text-muted-foreground">Réservez en ligne</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Annuaire</p>
                  <p className="text-sm text-muted-foreground">Trouvez un salon</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Cadeaux</p>
                  <p className="text-sm text-muted-foreground">Offrez une carte</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ✅ Si plusieurs salons, afficher un sélecteur
  const showTenantSelector = allClients.length > 1;

  if (loading) {
    return (
      <div className="space-y-8 pb-20">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  // ✅ Récupérer le nom du salon actuel
  const currentTenantName = clientData?.tenants?.name || 'Salon';

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Bonjour, {currentUser?.profile?.full_name || currentUser?.full_name || 'Client'}
          </h1>
          <div className="flex items-center flex-wrap gap-3 mt-2">
            <p className="text-muted-foreground">
              Bienvenue dans votre espace client
            </p>
            <Badge className={`${tier.bg} ${tier.color} gap-1`}>
              <TierIcon className="h-3 w-3" />
              {tier.name}
            </Badge>
            {clientData?.tenants && (
              <Badge variant="outline" className="gap-1">
                <Store className="h-3 w-3" />
                {currentTenantName}
              </Badge>
            )}
          </div>
        </div>
        <Button asChild className="gap-2 shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-primary/80">
          <Link to="/client/book">
            <Plus className="h-4 w-4" /> 
            Prendre Rendez-vous
          </Link>
        </Button>
      </div>

      {/* ✅ Sélecteur de salon (si multiple) */}
      {showTenantSelector && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg">
          <span className="text-sm font-medium text-muted-foreground">Vos salons :</span>
          {allClients.map((client) => (
            <Button
              key={client.id}
              variant={selectedTenantId === client.tenant_id ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => switchTenant(client.id, client.tenant_id)}
            >
              <Store className="h-3 w-3" />
              {client.tenants?.name || 'Salon'}
              {client.loyalty_points > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {client.loyalty_points} pts
                </Badge>
              )}
            </Button>
          ))}
        </div>
      )}

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bento-card border-none shadow-sm hover:shadow-md transition-all group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Prochains RDV</CardTitle>
            <Calendar className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
            <p className="text-xs text-muted-foreground mt-1">Rendez-vous à venir</p>
          </CardContent>
        </Card>
        
        <Card className="bento-card border-none shadow-sm hover:shadow-md transition-all group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Visites totales</CardTitle>
            <History className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisits}</div>
            <p className="text-xs text-muted-foreground mt-1">Visites réalisées</p>
          </CardContent>
        </Card>
        
        <Card className="bento-card border-none shadow-sm hover:shadow-md transition-all group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Points fidélité</CardTitle>
            <Gift className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.loyaltyPoints}</div>
            <p className="text-xs text-muted-foreground mt-1">Points accumulés</p>
          </CardContent>
        </Card>
        
        <Card className="bento-card border-none shadow-sm hover:shadow-md transition-all group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dépenses totales</CardTitle>
            <Wallet className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSpent.toLocaleString()} FCFA</div>
            <p className="text-xs text-muted-foreground mt-1">Montant total dépensé</p>
          </CardContent>
        </Card>
      </div>

      {/* Deux colonnes principales */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Colonne de gauche */}
        <div className="space-y-6">
          <Card className="bento-card border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Prochain Rendez-vous
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {nextAppointment ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-lg">{nextAppointment.service?.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(nextAppointment.appointment_date), 'EEEE d MMMM yyyy', { locale: fr })}
                      </p>
                      <p className="text-sm flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {nextAppointment.start_time} - {nextAppointment.end_time}
                      </p>
                    </div>
                    {getStatusBadge(nextAppointment.status)}
                  </div>
                  
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium">Avec</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold">
                          {nextAppointment.employee?.profile?.full_name?.charAt(0) || 'E'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{nextAppointment.employee?.profile?.full_name}</p>
                        <p className="text-xs text-muted-foreground">Employé #{nextAppointment.employee?.employee_number}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" asChild className="flex-1">
                      <Link to={`/client/appointments/${nextAppointment.id}`}>
                        Voir détails
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="flex-1">
                      <Link to="/client/book">
                        Modifier
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">Aucun rendez-vous à venir</p>
                  <Button variant="link" asChild className="mt-2 text-primary">
                    <Link to="/client/book">Réserver maintenant</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {appointments.length > 1 && (
            <Card className="bento-card border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Autres rendez-vous</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {appointments.slice(1).map((appointment) => (
                  <div key={appointment.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium">{appointment.service?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(appointment.appointment_date), 'dd MMM yyyy', { locale: fr })} à {appointment.start_time}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{appointment.service?.price?.toLocaleString()} FCFA</p>
                      {getStatusBadge(appointment.status)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Colonne de droite */}
        <div className="space-y-6">
          {/* Historique */}
          <Card className="bento-card border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Historique Récent
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <History className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">Aucun historique pour le moment</p>
                  <Button variant="link" asChild className="mt-2">
                    <Link to="/client/history">Voir tout l'historique</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentHistory.map((appointment) => (
                    <div key={appointment.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium">{appointment.service?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(appointment.appointment_date), 'dd MMM yyyy', { locale: fr })}
                        </p>
                        {appointment.rating && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs">{appointment.rating}/5</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{appointment.service?.price?.toLocaleString()} FCFA</p>
                        <Button variant="link" size="sm" asChild className="h-auto p-0 text-xs">
                          <Link to={`/client/appointments/${appointment.id}`}>
                            Détails <ChevronRight className="h-3 w-3 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                  {recentHistory.length >= 5 && (
                    <Button variant="outline" size="sm" asChild className="w-full mt-2">
                      <Link to="/client/history">Voir tout l'historique</Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Promotions */}
          {promotions.length > 0 && (
            <Card className="bento-card border-none shadow-sm bg-gradient-to-r from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Offres spéciales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {promotions.map((promo) => (
                  <div key={promo.id} className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <p className="font-semibold text-primary">{promo.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{promo.description}</p>
                    <p className="text-xs text-primary mt-2">
                      Valable jusqu'au {format(new Date(promo.end_date), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* TicketQueue - seulement si un tenant est sélectionné */}
          {selectedTenantId && (
            <TicketQueue tenantId={selectedTenantId} />
          )}

          {/* Accès rapide */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2 group">
              <Link to="/client/loyalty">
                <Gift className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Points fidélité</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2 group">
              <Link to="/client/promotions">
                <Bell className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Promotions</span>
              </Link>
            </Button>
          </div>

          {stats.averageRating > 0 && (
            <div className="flex items-center justify-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">Votre note moyenne: {stats.averageRating}/5</span>
            </div>
          )}
        </div>
      </div>

      <FloatingAiChat endpointUrl="/integrated-ai/stream" />
    </div>
  );
}