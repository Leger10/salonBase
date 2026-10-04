// /src/pages/EmployeeTicketQueuePage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { toast } from 'sonner';
import { 
  Ticket, Bell, User, CheckCircle, Clock, 
  Users, Loader2, RefreshCw, Phone,
  Calendar, Search, ArrowLeft, DollarSign, Scissors
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function EmployeeTicketQueuePage() {
  const { currentUser } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [myTicket, setMyTicket] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchData();
    
    const tenantId = currentUser?.profile?.tenant_id;
    if (!tenantId) return;

    const subscription = supabase
      .channel('employee_tickets_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tickets', filter: `tenant_id=eq.${tenantId}` },
        () => fetchData()
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [currentUser]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      const profileId = currentUser?.profile?.id;

      console.log('🔍 Tenant ID:', tenantId);
      console.log('🔍 Profile ID:', profileId);

      if (!tenantId || !profileId) {
        console.log('⚠️ Pas de tenant ou profile ID');
        setTickets([]);
        setMyTicket(null);
        setEmployee(null);
        setLoading(false);
        return;
      }

      // Récupérer l'employé avec son ID
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, employee_number, is_available, profile_id')
        .eq('profile_id', profileId)
        .eq('tenant_id', tenantId)
        .single();

      if (empError) {
        console.error('❌ Erreur récupération employé:', empError);
        setLoading(false);
        return;
      }

      console.log('👤 Employé connecté:', empData);
      setEmployee(empData);

      const today = new Date().toISOString().split('T')[0];

      // ✅ Récupérer TOUS les tickets du jour (non archivés) avec les infos de service
      const { data: allTickets, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          *,
          service:service_id (
            id,
            name,
            duration,
            price
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('date', today)
        .neq('status', 'archived')
        .order('ticket_number', { ascending: true });

      if (ticketsError) {
        console.error('❌ Erreur tickets:', ticketsError);
        throw ticketsError;
      }

      console.log('📋 Tickets du jour:', allTickets?.length || 0);
      
      // ✅ Filtrer les tickets VISIBLES pour l'employé
      const visibleTickets = allTickets?.filter(t => 
        t.assigned_employee_id === empData.id || 
        (t.assigned_employee_id === null && t.status === 'waiting')
      ) || [];

      // ✅ Formater les tickets avec les infos de service
      const formattedTickets = visibleTickets.map(ticket => ({
        ...ticket,
        service_name: ticket.service?.name || ticket.service_type || 'Service',
        service_price: ticket.service?.price || ticket.service_price || 0,
        service_duration: ticket.service?.duration || ticket.estimated_duration || 30
      }));

      console.log('👀 Tickets visibles pour l\'employé:', formattedTickets.length);
      setTickets(formattedTickets);
      setFilteredTickets(formattedTickets);

      // ✅ Récupérer MON ticket en cours (assigné à moi)
      const myData = formattedTickets.find(t => 
        t.assigned_employee_id === empData.id && 
        ['called', 'in_progress'].includes(t.status)
      );
      setMyTicket(myData || null);
      console.log('🎯 Mon ticket actif:', myData);

    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data) => {
    let filtered = [...data];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.ticket_number.toString().includes(term) ||
        t.client_name?.toLowerCase().includes(term) ||
        t.service_name?.toLowerCase().includes(term)
      );
    }

    setFilteredTickets(filtered);
  };

  useEffect(() => {
    applyFilters(tickets);
  }, [searchTerm, filterStatus, tickets]);

  const handleCallTicket = async (ticketId) => {
    if (!employee) {
      toast.error('Vous n\'êtes pas reconnu comme employé');
      return;
    }

    if (myTicket) {
      toast.error('Vous avez déjà un client en cours');
      return;
    }

    try {
      // Vérifier que le ticket n'est pas déjà assigné
      const { data: ticketCheck } = await supabase
        .from('tickets')
        .select('assigned_employee_id')
        .eq('id', ticketId)
        .single();

      if (ticketCheck?.assigned_employee_id && ticketCheck.assigned_employee_id !== employee.id) {
        toast.error('Ce ticket a déjà été assigné à un autre employé');
        return;
      }

      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'called',
          assigned_employee_id: employee.id,
          called_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast.success('Client appelé ! 🎯');
      fetchData();
      
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(e => console.log('Audio non supporté'));
      } catch (e) {
        console.log('Audio non supporté');
      }

    } catch (error) {
      console.error('Error calling ticket:', error);
      toast.error('Erreur lors de l\'appel');
    }
  };

  const handleStartService = async (ticketId) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .eq('assigned_employee_id', employee.id);

      if (error) throw error;

      toast.success('Service commencé ! 💪');
      fetchData();
    } catch (error) {
      console.error('Error starting service:', error);
      toast.error('Erreur lors du démarrage');
    }
  };

  const handleCompleteService = async (ticketId) => {
    try {
      if (!employee) {
        toast.error('Vous n\'êtes pas reconnu comme employé');
        return;
      }

      const { data: ticketCheck, error: checkError } = await supabase
        .from('tickets')
        .select('id, status, assigned_employee_id, client_name')
        .eq('id', ticketId)
        .single();

      if (checkError) {
        toast.error('Ticket non trouvé');
        return;
      }

      if (ticketCheck.assigned_employee_id !== employee.id) {
        toast.error('Ce ticket ne vous est pas assigné');
        return;
      }

      if (ticketCheck.status === 'completed' || ticketCheck.status === 'cancelled') {
        toast.info('Ce ticket est déjà terminé');
        return;
      }

      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .eq('assigned_employee_id', employee.id);

      if (error) throw error;

      toast.success(`🎉 Service terminé pour ${ticketCheck.client_name || 'le client'} !`);
      fetchData();
      
    } catch (error) {
      console.error('Error completing service:', error);
      toast.error('Erreur lors de la finalisation');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      waiting: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
      called: { label: 'Appelé 📢', className: 'bg-blue-100 text-blue-800 animate-pulse' },
      in_progress: { label: 'En cours 💆', className: 'bg-purple-100 text-purple-800' },
      completed: { label: 'Terminé ✅', className: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Annulé ❌', className: 'bg-gray-100 text-gray-800' }
    };
    return config[status] || config.waiting;
  };

  const waitingTickets = tickets.filter(t => t.status === 'waiting' && !t.assigned_employee_id);
  const myActiveTicket = tickets.find(t => 
    t.assigned_employee_id === employee?.id && 
    ['called', 'in_progress'].includes(t.status)
  );

  if (loading) {
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Button variant="ghost" size="sm" asChild className="p-0">
                <Link to="/employee/dashboard">
                  <ArrowLeft className="h-5 w-5 mr-1" />
                </Link>
              </Button>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Ticket className="h-7 w-7 text-primary" />
                Mes tickets
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Gérez votre file d'attente - {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className="bg-primary/10 text-primary px-3 py-1.5">
              <Users className="h-4 w-4 mr-1.5" />
              {waitingTickets.length} en attente
            </Badge>
            {employee && (
              <Badge className={employee.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {employee.is_available ? '🟢 Disponible' : '🔴 Indisponible'}
              </Badge>
            )}
            <Button onClick={fetchData} variant="outline" size="sm" className="gap-1">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mon ticket en cours */}
        {myActiveTicket && (
          <Card className="border-purple-200 bg-purple-50/30 dark:bg-purple-950/20 shadow-md mb-6">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <User className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">🔄 En cours</p>
                    <p className="font-bold text-xl">Ticket #{myActiveTicket.ticket_number}</p>
                    <p className="font-medium">
                      {myActiveTicket.client_name || 'Client'}
                    </p>
                    {myActiveTicket.service_name && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Scissors className="h-3 w-3" />
                        {myActiveTicket.service_name}
                      </p>
                    )}
                    {myActiveTicket.service_price > 0 && (
                      <p className="text-sm font-bold text-primary flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {myActiveTicket.service_price.toLocaleString()} FCFA
                      </p>
                    )}
                    {myActiveTicket.service_duration && (
                      <p className="text-xs text-muted-foreground">
                        ⏱️ {myActiveTicket.service_duration} min
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={getStatusBadge(myActiveTicket.status).className}>
                    {getStatusBadge(myActiveTicket.status).label}
                  </Badge>
                  {myActiveTicket.status === 'called' && (
                    <Button onClick={() => handleStartService(myActiveTicket.id)} className="gap-1">
                      <User className="h-4 w-4" />
                      Démarrer
                    </Button>
                  )}
                  {myActiveTicket.status === 'in_progress' && (
                    <Button 
                      onClick={() => handleCompleteService(myActiveTicket.id)} 
                      className="gap-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Terminer
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par nom, numéro ou service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="all">Tous les statuts</option>
            <option value="waiting">En attente</option>
            <option value="called">Appelés</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminés</option>
          </select>
        </div>

        {/* Clients en attente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Clients en attente
              {waitingTickets.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {waitingTickets.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTickets.length === 0 ? (
              <div className="text-center py-10">
                <Ticket className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-3" />
                <p className="text-muted-foreground">Aucun ticket trouvé</p>
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? 'Essayez de modifier votre recherche' : 'Profitez-en pour vous préparer'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((ticket) => {
                  // Ne pas afficher les tickets assignés à d'autres employés
                  if (ticket.assigned_employee_id && ticket.assigned_employee_id !== employee?.id) {
                    return null;
                  }

                  const isWaiting = ticket.status === 'waiting';
                  const isCalled = ticket.status === 'called';
                  const isCompleted = ticket.status === 'completed' || ticket.status === 'cancelled';
                  const isAssignedToMe = ticket.assigned_employee_id === employee?.id;
                  const hasService = ticket.service_name || ticket.service_type;

                  return (
                    <div 
                      key={ticket.id} 
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:shadow-md transition-all gap-3 ${
                        isWaiting && !ticket.assigned_employee_id ? 'hover:border-primary/30' : ''
                      } ${isCalled && isAssignedToMe ? 'border-blue-300 bg-blue-50/30' : ''} ${isCompleted ? 'border-green-300 bg-green-50/30 opacity-70' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${
                          isWaiting && !ticket.assigned_employee_id ? 'bg-primary/10' : 
                          isCalled && isAssignedToMe ? 'bg-blue-100' :
                          isCompleted ? 'bg-green-100' :
                          'bg-muted/20'
                        }`}>
                          <Ticket className={`h-5 w-5 ${
                            isWaiting && !ticket.assigned_employee_id ? 'text-primary' : 
                            isCalled && isAssignedToMe ? 'text-blue-600' :
                            isCompleted ? 'text-green-600' :
                            'text-muted-foreground'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold">#{ticket.ticket_number}</p>
                            <Badge className={getStatusBadge(ticket.status).className}>
                              {getStatusBadge(ticket.status).label}
                            </Badge>
                            {isCalled && isAssignedToMe && (
                              <Badge className="bg-blue-500 text-white border-0 animate-pulse text-xs">
                                <Bell className="h-3 w-3 mr-1" />
                                En appel
                              </Badge>
                            )}
                            {isCompleted && (
                              <Badge className="bg-green-500 text-white border-0 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Terminé
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium">{ticket.client_name || 'Client'}</p>
                          
                          {/* ✅ Affichage du service et du prix */}
                          {hasService && (
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <Scissors className="h-3 w-3" />
                                {ticket.service_name || ticket.service_type}
                              </Badge>
                              {ticket.service_price > 0 && (
                                <Badge className="text-xs bg-green-100 text-green-800 flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  {ticket.service_price.toLocaleString()} FCFA
                                </Badge>
                              )}
                              {ticket.service_duration && (
                                <span className="text-xs text-muted-foreground">
                                  ⏱️ {ticket.service_duration} min
                                </span>
                              )}
                            </div>
                          )}
                          
                          {ticket.client_phone && (
                            <p className="text-xs text-muted-foreground">
                              📞 {ticket.client_phone}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            🕐 {ticket.created_at ? format(new Date(ticket.created_at), 'HH:mm') : '-'}
                          </p>
                        </div>
                      </div>

                      {/* Actions selon le statut */}
                      {ticket.status === 'waiting' && !ticket.assigned_employee_id && !myActiveTicket && (
                        <Button 
                          onClick={() => handleCallTicket(ticket.id)}
                          className="gap-1 w-full sm:w-auto"
                          disabled={!!myActiveTicket}
                        >
                          <Bell className="h-4 w-4" />
                          Appeler
                        </Button>
                      )}

                      {ticket.status === 'waiting' && (myActiveTicket || ticket.assigned_employee_id) && (
                        <Badge className="bg-gray-100 text-gray-500">
                          {ticket.assigned_employee_id === employee?.id ? 'En cours...' : 'Assigné à un autre'}
                        </Badge>
                      )}

                      {ticket.status === 'called' && ticket.assigned_employee_id === employee?.id && (
                        <Button 
                          onClick={() => handleStartService(ticket.id)}
                          className="gap-1 w-full sm:w-auto"
                        >
                          <User className="h-4 w-4" />
                          Démarrer
                        </Button>
                      )}

                      {ticket.status === 'in_progress' && ticket.assigned_employee_id === employee?.id && (
                        <Button 
                          onClick={() => handleCompleteService(ticket.id)}
                          className="gap-1 w-full sm:w-auto bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Terminer
                        </Button>
                      )}

                      {isCompleted && ticket.assigned_employee_id === employee?.id && (
                        <Badge className="bg-green-100 text-green-700">
                          ✅ Terminé
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bouton retour */}
        <div className="mt-6">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link to="/employee/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au tableau de bord
            </Link>
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}