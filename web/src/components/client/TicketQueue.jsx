// /src/components/client/TicketQueue.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Ticket, Clock, User, Users, CheckCircle, XCircle, 
  Loader2, ArrowRight, Calendar, AlertCircle, Volume2, VolumeX,
  Bell, Zap, Star, Award
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// ✅ Hook personnalisé pour les sons
const useSound = () => {
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [audioContext, setAudioContext] = useState(null);

  useEffect(() => {
    const initAudio = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(ctx);
      } catch (e) {
        console.debug('Web Audio API not available');
      }
    };

    const handleUserInteraction = () => {
      if (!audioContext) {
        initAudio();
      }
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  const playBeep = useCallback((frequency = 800, duration = 200, type = 'sine') => {
    if (!isSoundEnabled) return;
    
    try {
      if (audioContext) {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
      }
    } catch (e) {
      console.debug('Audio play error:', e);
    }
  }, [audioContext, isSoundEnabled]);

  const playTicketSound = useCallback(() => {
    playBeep(800, 200, 'sine');
    setTimeout(() => playBeep(1000, 200, 'sine'), 300);
  }, [playBeep]);

  const playSuccessSound = useCallback(() => {
    playBeep(600, 150, 'sine');
    setTimeout(() => playBeep(900, 150, 'sine'), 200);
    setTimeout(() => playBeep(1200, 200, 'sine'), 400);
  }, [playBeep]);

  const playErrorSound = useCallback(() => {
    playBeep(300, 300, 'sawtooth');
  }, [playBeep]);

  const toggleSound = () => {
    setIsSoundEnabled(!isSoundEnabled);
    toast.info(isSoundEnabled ? '🔇 Son désactivé' : '🔊 Son activé');
  };

  return {
    playBeep,
    playTicketSound,
    playSuccessSound,
    playErrorSound,
    isSoundEnabled,
    toggleSound,
  };
};

export default function TicketQueue({ tenantId, onTicketCalled }) {
  const { currentUser, isAuthenticated } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [takingTicket, setTakingTicket] = useState(false);
  const [myTicket, setMyTicket] = useState(null);
  const [calledTicket, setCalledTicket] = useState(null);
  const [showCallAlert, setShowCallAlert] = useState(false);
  const [stats, setStats] = useState({
    waiting: 0,
    inProgress: 0,
    served: 0
  });

  const { playSuccessSound, playTicketSound, isSoundEnabled, toggleSound } = useSound();

  // ✅ Écouter les changements de statut des tickets
  useEffect(() => {
    if (!tenantId) return;

    const subscription = supabase
      .channel('ticket_queue_changes')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'tickets',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          const updatedTicket = payload.new;
          
          // ✅ Si un ticket passe en statut "called"
          if (updatedTicket.status === 'called') {
            // Vérifier si c'est le ticket de l'utilisateur
            if (myTicket && updatedTicket.id === myTicket.id) {
              setCalledTicket(updatedTicket);
              setShowCallAlert(true);
              playTicketSound();
              
              // Notification desktop
              if (Notification.permission === 'granted') {
                new Notification('🛎️ Votre tour est arrivé !', {
                  body: `Ticket #${updatedTicket.ticket_number} - Rendez-vous au comptoir`,
                  icon: '/icon.png'
                });
              }
              
              // Appeler le callback
              if (onTicketCalled) {
                onTicketCalled(updatedTicket);
              }
            }
          }
          
          fetchTickets();
        }
      )
      .subscribe();

    // Demander la permission de notification
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [tenantId, myTicket, playTicketSound, onTicketCalled]);

  useEffect(() => {
    if (tenantId) {
      fetchTickets();
      const interval = setInterval(fetchTickets, 15000); // ✅ Plus fréquent
      return () => clearInterval(interval);
    }
  }, [tenantId]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const profileId = currentUser?.profile?.id;

      let clientId = null;
      if (profileId) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', profileId)
          .eq('tenant_id', tenantId)
          .maybeSingle();
        clientId = clientData?.id;
      }

      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('date', today)
        .in('status', ['waiting', 'called', 'in_progress', 'served'])
        .order('ticket_number', { ascending: true });

      if (error) throw error;

      setTickets(data || []);
      
      const waiting = data?.filter(t => t.status === 'waiting').length || 0;
      const inProgress = data?.filter(t => t.status === 'called' || t.status === 'in_progress').length || 0;
      const served = data?.filter(t => t.status === 'served').length || 0;
      setStats({ waiting, inProgress, served });
      
      if (clientId) {
        const myTicketData = data?.find(t => t.client_id === clientId);
        setMyTicket(myTicketData || null);
        
        // ✅ Vérifier si mon ticket est appelé
        if (myTicketData?.status === 'called') {
          setCalledTicket(myTicketData);
          setShowCallAlert(true);
        }
      } else {
        setMyTicket(null);
      }

    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Erreur lors du chargement de la file d\'attente');
    } finally {
      setLoading(false);
    }
  };

  const takeTicket = async () => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour prendre un ticket');
      return;
    }

    if (myTicket) {
      toast.info('Vous avez déjà un ticket en attente');
      return;
    }

    setTakingTicket(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const profileId = currentUser?.profile?.id;
      const fullName = currentUser?.profile?.full_name || currentUser?.full_name || 'Client';

      if (!profileId) {
        toast.error('Profil utilisateur non trouvé');
        return;
      }

      let clientId;
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', profileId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const { data: newClient, error: createError } = await supabase
          .from('clients')
          .insert({
            profile_id: profileId,
            tenant_id: tenantId,
            name: fullName,
            email: currentUser?.profile?.email || currentUser?.email,
            phone: currentUser?.profile?.phone || null,
            loyalty_points: 0,
            total_visits: 0,
            total_spent: 0
          })
          .select()
          .single();

        if (createError) throw createError;
        clientId = newClient.id;
      }

      const { data: lastTicket } = await supabase
        .from('tickets')
        .select('ticket_number')
        .eq('tenant_id', tenantId)
        .eq('date', today)
        .order('ticket_number', { ascending: false })
        .limit(1);

      const nextNumber = (lastTicket && lastTicket.length > 0) ? lastTicket[0].ticket_number + 1 : 1;

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          tenant_id: tenantId,
          client_id: clientId,
          client_name: fullName,
          client_phone: currentUser?.profile?.phone || null,
          ticket_number: nextNumber,
          date: today,
          status: 'waiting',
          created_by: 'client_portal'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Ticket #${nextNumber} pris avec succès !`);
      playSuccessSound();
      
      setMyTicket(data);
      fetchTickets();
    } catch (error) {
      console.error('Error taking ticket:', error);
      toast.error('Erreur lors de la prise de ticket');
    } finally {
      setTakingTicket(false);
    }
  };

  const cancelTicket = async () => {
    if (!myTicket) return;

    if (!confirm('Êtes-vous sûr de vouloir annuler votre ticket ?')) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: 'cancelled' })
        .eq('id', myTicket.id);

      if (error) throw error;

      toast.success('Ticket annulé');
      setMyTicket(null);
      setCalledTicket(null);
      setShowCallAlert(false);
      fetchTickets();
    } catch (error) {
      console.error('Error cancelling ticket:', error);
      toast.error('Erreur lors de l\'annulation');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      waiting: { label: 'En attente', className: 'bg-amber-100 text-amber-800 border-amber-200' },
      called: { label: '📢 Appelé', className: 'bg-emerald-100 text-emerald-800 border-emerald-200 animate-pulse' },
      in_progress: { label: '💆 En cours', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
      served: { label: '✅ Servi', className: 'bg-green-100 text-green-800 border-green-200' },
      cancelled: { label: '❌ Annulé', className: 'bg-gray-100 text-gray-800 border-gray-200' }
    };
    return config[status] || config.waiting;
  };

  const getStatusIcon = (status) => {
    const icons = {
      waiting: Clock,
      called: Bell,
      in_progress: Zap,
      served: CheckCircle,
      cancelled: XCircle
    };
    const Icon = icons[status] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* ✅ Alerte d'appel - Animation élégante */}
      <AnimatePresence>
        {showCallAlert && calledTicket && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed inset-4 md:inset-auto md:top-4 md:right-4 md:w-96 z-50 pointer-events-none"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.02, 1],
                boxShadow: [
                  '0 0 0 0 rgba(16, 185, 129, 0.4)',
                  '0 0 0 20px rgba(16, 185, 129, 0)',
                  '0 0 0 0 rgba(16, 185, 129, 0.4)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="pointer-events-auto bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-2 border-emerald-400 rounded-2xl shadow-2xl p-6 backdrop-blur-sm"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="h-16 w-16 rounded-full bg-emerald-500 flex items-center justify-center animate-pulse">
                    <Bell className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        🎯 Votre tour est arrivé !
                      </p>
                      <p className="text-3xl font-bold text-emerald-800 dark:text-emerald-200 mt-1">
                        #{calledTicket.ticket_number}
                      </p>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                        {calledTicket.client_name || 'Client'}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowCallAlert(false)}
                      className="text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-200"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge className="bg-emerald-500 text-white border-0 animate-pulse">
                      <Bell className="h-3 w-3 mr-1" />
                      Appelé
                    </Badge>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">
                      Rendez-vous au comptoir
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 overflow-hidden">
        {/* ✅ Header avec dégradé */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5" />
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Ticket className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    File d'attente
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {stats.waiting > 0 ? `${stats.waiting} client(s) en attente` : 'Aucun client en attente'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSound}
                className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl"
                title={isSoundEnabled ? 'Désactiver le son' : 'Activer le son'}
              >
                {isSoundEnabled ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <VolumeX className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CardHeader>
        </div>

        <CardContent className="space-y-6 relative">
          {/* ✅ Statistiques élégantes */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'En attente', value: stats.waiting, color: 'amber', icon: Clock },
              { label: 'En cours', value: stats.inProgress, color: 'indigo', icon: Zap },
              { label: 'Servis', value: stats.served, color: 'green', icon: Award }
            ].map((stat) => (
              <div 
                key={stat.label}
                className={`relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-${stat.color}-50/50 to-${stat.color}-100/30 dark:from-${stat.color}-950/20 dark:to-${stat.color}-900/10 border border-${stat.color}-200/50 dark:border-${stat.color}-800/30`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-${stat.color}-700 dark:text-${stat.color}-300">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                  <stat.icon className={`h-6 w-6 text-${stat.color}-400/60`} />
                </div>
              </div>
            ))}
          </div>

          {/* ✅ Mon ticket - Version améliorée */}
          {myTicket && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative overflow-hidden rounded-2xl p-6 ${
                myTicket.status === 'called' 
                  ? 'bg-gradient-to-br from-emerald-50 to-green-100/50 dark:from-emerald-950/30 dark:to-green-950/20 border-2 border-emerald-400/50 shadow-lg shadow-emerald-500/10'
                  : myTicket.status === 'in_progress'
                    ? 'bg-gradient-to-br from-indigo-50 to-purple-100/50 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-300/50 dark:border-indigo-800/30'
                    : 'bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 border border-primary/20'
              }`}
            >
              {/* ✅ Effet de brillance */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
                    myTicket.status === 'called'
                      ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                      : myTicket.status === 'in_progress'
                        ? 'bg-indigo-500 shadow-lg shadow-indigo-500/30'
                        : 'bg-primary shadow-lg shadow-primary/30'
                  }`}>
                    <Ticket className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-3xl font-bold">
                        #{myTicket.ticket_number}
                      </p>
                      <Badge className={`${getStatusBadge(myTicket.status).className} border-0 font-medium px-3 py-1`}>
                        {getStatusIcon(myTicket.status)}
                        <span className="ml-1">{getStatusBadge(myTicket.status).label}</span>
                      </Badge>
                    </div>
                    <p className="font-medium text-lg mt-0.5">
                      {currentUser?.profile?.full_name || 'Client'}
                    </p>
                    {myTicket.status === 'called' && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                        <Bell className="h-4 w-4" />
                        Votre tour est arrivé !
                      </p>
                    )}
                  </div>
                </div>
                {myTicket.status === 'waiting' && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={cancelTicket}
                    className="rounded-xl shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Annuler
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* ✅ Bouton prendre ticket */}
          {!myTicket && isAuthenticated && (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                className="w-full gap-2 h-14 text-lg rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all bg-gradient-to-r from-primary to-primary/80"
                onClick={takeTicket}
                disabled={takingTicket}
              >
                {takingTicket ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Ticket className="h-5 w-5" />
                )}
                {takingTicket ? 'Prise en cours...' : 'Prendre un ticket'}
              </Button>
            </motion.div>
          )}

          {/* ✅ Liste des tickets - Version améliorée */}
          {tickets.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  File d'attente
                  <Badge variant="secondary" className="text-xs">
                    {tickets.filter(t => t.status === 'waiting').length}
                  </Badge>
                </p>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
                {tickets.slice(0, 10).map((ticket, index) => {
                  const isMyTicket = ticket.id === myTicket?.id;
                  const statusInfo = getStatusBadge(ticket.status);
                  
                  return (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                        isMyTicket
                          ? 'bg-primary/5 border-2 border-primary/30 shadow-md'
                          : ticket.status === 'called'
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30'
                            : 'hover:bg-muted/30 border border-transparent hover:border-primary/10'
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${
                          isMyTicket 
                            ? 'bg-primary/20' 
                            : ticket.status === 'called'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30'
                              : 'bg-muted/30'
                        }`}>
                          <span className={`font-bold ${
                            isMyTicket 
                              ? 'text-primary' 
                              : ticket.status === 'called'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-muted-foreground'
                          }`}>
                            #{ticket.ticket_number}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-medium truncate ${isMyTicket ? 'text-primary' : ''}`}>
                              {ticket.client_name || 'Client'}
                            </p>
                            <Badge className={`${statusInfo.className} border-0 text-xs px-2 py-0.5`}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                          {isMyTicket && (
                            <p className="text-xs text-primary/70 font-medium">← Votre ticket</p>
                          )}
                        </div>
                      </div>
                      {ticket.status === 'called' && (
                        <div className="flex-shrink-0">
                          <Bell className="h-5 w-5 text-emerald-500 animate-pulse" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
                {tickets.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    + {tickets.length - 10} autres tickets
                  </p>
                )}
              </div>
            </div>
          )}

          {!isAuthenticated && (
            <div className="text-center py-6 bg-muted/30 rounded-2xl border border-dashed border-muted-foreground/20">
              <AlertCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">
                Connectez-vous pour prendre un ticket
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Rejoignez la file d'attente en quelques secondes
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}