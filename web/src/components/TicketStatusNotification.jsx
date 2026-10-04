// /src/components/TicketStatusNotification.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, Clock, User, X, Zap, Sparkles, Scissors, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';

// ========== COMPOSANT : NOTIFICATION DE STATUT ==========
export function TicketStatusNotification({ ticket, onClose }) {
  const [visible, setVisible] = useState(true);

  if (!ticket) return null;

  const getStatusConfig = (status) => {
    const configs = {
      waiting: {
        icon: Clock,
        color: 'bg-amber-500',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-700',
        title: 'En attente',
        message: 'Votre ticket est en file d\'attente. Soyez patient !',
        emoji: '⏳'
      },
      called: {
        icon: Bell,
        color: 'bg-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        textColor: 'text-blue-700',
        title: '🎯 Votre tour est arrivé !',
        message: 'Rendez-vous au comptoir avec votre numéro',
        emoji: '🔔'
      },
      in_progress: {
        icon: User,
        color: 'bg-purple-500',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-300',
        textColor: 'text-purple-700',
        title: '💆 En cours de service',
        message: 'Un professionnel s\'occupe de vous',
        emoji: '💆'
      },
      completed: {
        icon: CheckCircle,
        color: 'bg-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300',
        textColor: 'text-green-700',
        title: '✅ Service terminé !',
        message: 'Merci pour votre visite. À bientôt !',
        emoji: '🎉'
      },
      cancelled: {
        icon: X,
        color: 'bg-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-300',
        textColor: 'text-gray-700',
        title: '❌ Ticket annulé',
        message: 'Votre ticket a été annulé',
        emoji: '❌'
      }
    };
    return configs[status] || configs.waiting;
  };

  const config = getStatusConfig(ticket.status);
  const StatusIcon = config.icon;
  const isCalled = ticket.status === 'called';
  const isCompleted = ticket.status === 'completed';
  const isInProgress = ticket.status === 'in_progress';

  const cardVariants = {
    initial: { opacity: 0, y: 50, scale: 0.95 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 25 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9,
      y: 20,
      transition: { duration: 0.3 }
    }
  };

  const pulseVariants = {
    initial: { scale: 1 },
    animate: { 
      scale: [1, 1.05, 1],
      transition: { 
        duration: 2, 
        repeat: Infinity,
        repeatType: 'reverse'
      }
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed bottom-4 right-4 z-50 max-w-md w-full"
        >
          <Card className={`
            relative overflow-hidden border-2 shadow-2xl
            ${config.borderColor}
            ${isCalled ? 'ring-4 ring-blue-400/20' : ''}
            ${isCompleted ? 'ring-4 ring-green-400/20' : ''}
            ${isInProgress ? 'ring-4 ring-purple-400/20' : ''}
          `}>
            {isCalled && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-white to-blue-50 animate-pulse" />
            )}
            
            <div className={`h-1 w-full ${config.color}`} />

            <CardContent className="p-6 relative">
              <div className="flex items-start gap-4">
                <motion.div
                  variants={pulseVariants}
                  initial="initial"
                  animate={isCalled ? "animate" : "initial"}
                  className={`
                    flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center
                    ${config.bgColor} ${config.textColor}
                    ${isCalled ? 'shadow-lg shadow-blue-500/30' : ''}
                    ${isCompleted ? 'shadow-lg shadow-green-500/30' : ''}
                  `}
                >
                  <StatusIcon className="h-8 w-8" />
                </motion.div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-lg font-bold ${config.textColor}`}>
                          {config.emoji} {config.title}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {config.message}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setVisible(false);
                        if (onClose) onClose();
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-4">
                    <div className={`
                      text-4xl font-extrabold
                      ${isCalled ? 'text-blue-600' : ''}
                      ${isCompleted ? 'text-green-600' : ''}
                      ${isInProgress ? 'text-purple-600' : ''}
                    `}>
                      #{ticket.ticket_number}
                    </div>
                    <Badge className={`
                      ${config.bgColor} ${config.textColor} border-0
                      ${isCalled ? 'animate-pulse' : ''}
                    `}>
                      {isCalled ? '📢 En appel' : 
                       isCompleted ? '✅ Terminé' : 
                       isInProgress ? '💆 En cours' : 
                       '⏳ En attente'}
                    </Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {ticket.service_type && (
                      <span className="flex items-center gap-1">
                        <Scissors className="h-3 w-3" />
                        {ticket.service_type}
                      </span>
                    )}
                    {ticket.client_name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {ticket.client_name}
                      </span>
                    )}
                    {ticket.called_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(ticket.called_at), 'HH:mm')}
                      </span>
                    )}
                  </div>

                  {isCalled && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="mt-3"
                    >
                      <Button 
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                        onClick={() => {
                          setVisible(false);
                          if (onClose) onClose();
                        }}
                      >
                        <Bell className="h-4 w-4 mr-2" />
                        J'ai compris, je me rends au comptoir
                      </Button>
                    </motion.div>
                  )}

                  {isCompleted && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3, type: 'spring' }}
                      className="mt-3 p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200"
                    >
                      <p className="text-sm text-green-700 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Merci pour votre visite ! Nous espérons vous revoir bientôt.
                        <Sparkles className="h-4 w-4" />
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ========== COMPOSANT : SUIVI COMPLET AVEC NOTIFICATIONS ==========
export function TicketStatusTrackerWithNotifications({ tenantId, currentUser, isAuthenticated }) {
  const [myTicket, setMyTicket] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [lastStatus, setLastStatus] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);

  useEffect(() => {
    if (tenantId && isAuthenticated) {
      fetchMyTicket();
      
      const subscription = supabase
        .channel('ticket_status_changes')
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'tickets',
            filter: `tenant_id=eq.${tenantId}`
          },
          (payload) => {
            const updatedTicket = payload.new;
            if (myTicket && updatedTicket.id === myTicket.id) {
              setStatusHistory(prev => [
                { 
                  status: updatedTicket.status, 
                  timestamp: new Date(), 
                  id: Date.now() 
                },
                ...prev
              ]);
              
              setMyTicket(updatedTicket);
              setLastStatus(updatedTicket.status);
              
              if (['called', 'in_progress', 'completed'].includes(updatedTicket.status)) {
                setShowNotification(true);
                playNotificationSound(updatedTicket.status);
              }
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [tenantId, isAuthenticated, myTicket]);

  const fetchMyTicket = async () => {
    if (!isAuthenticated || !currentUser?.profile?.id) return;
    
    try {
      const profileId = currentUser.profile.id;
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', profileId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (client) {
        const { data: ticket } = await supabase
          .from('tickets')
          .select('*')
          .eq('client_id', client.id)
          .eq('tenant_id', tenantId)
          .in('status', ['waiting', 'called', 'in_progress', 'completed'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ticket) {
          setMyTicket(ticket);
          setLastStatus(ticket.status);
          setStatusHistory([{ 
            status: ticket.status, 
            timestamp: new Date(), 
            id: Date.now() 
          }]);
          
          if (['called', 'in_progress', 'completed'].includes(ticket.status)) {
            setShowNotification(true);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
    }
  };

  const playNotificationSound = (status) => {
    try {
      const audio = new Audio(
        status === 'called' ? '/notification.mp3' : 
        status === 'completed' ? '/success.mp3' : 
        '/notification.mp3'
      );
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch (e) {
      console.log('Audio non supporté');
    }
  };

  const handleCloseNotification = () => {
    setShowNotification(false);
  };

  const getStatusInfo = (status) => {
    const config = {
      waiting: { 
        label: 'En attente', 
        icon: Clock, 
        color: 'bg-amber-500',
        progress: 0
      },
      called: { 
        label: '📢 Appelé', 
        icon: Bell, 
        color: 'bg-blue-500',
        progress: 33
      },
      in_progress: { 
        label: '💆 En cours', 
        icon: User, 
        color: 'bg-purple-500',
        progress: 66
      },
      completed: { 
        label: '✅ Terminé', 
        icon: CheckCircle, 
        color: 'bg-green-500',
        progress: 100
      },
      cancelled: { 
        label: '❌ Annulé', 
        icon: X, 
        color: 'bg-gray-500',
        progress: 0
      }
    };
    return config[status] || config.waiting;
  };

  if (!isAuthenticated || !myTicket) return null;

  const statusInfo = getStatusInfo(myTicket.status);
  const StatusIcon = statusInfo.icon;

  return (
    <>
      {showNotification && (
        <TicketStatusNotification 
          ticket={myTicket} 
          onClose={handleCloseNotification}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-6"
      >
        <Card className={`border-2 ${
          myTicket.status === 'called' 
            ? 'border-blue-400 shadow-lg shadow-blue-100/50' 
            : myTicket.status === 'in_progress'
            ? 'border-purple-400 shadow-lg shadow-purple-100/50'
            : myTicket.status === 'completed'
            ? 'border-green-400 shadow-lg shadow-green-100/50'
            : 'border-gray-200'
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                Mon ticket
              </CardTitle>
              <Badge className={`${statusInfo.color} text-white`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusInfo.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Numéro</p>
                <p className="text-6xl font-bold text-primary">
                  #{myTicket.ticket_number}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {myTicket.service_type || 'Service'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>En attente</span>
                  <span>Appelé</span>
                  <span>En cours</span>
                  <span>Terminé</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${statusInfo.progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                    className={`h-full rounded-full ${
                      myTicket.status === 'called' ? 'bg-blue-500' :
                      myTicket.status === 'in_progress' ? 'bg-purple-500' :
                      myTicket.status === 'completed' ? 'bg-green-500' :
                      'bg-yellow-500'
                    }`}
                  />
                </div>
              </div>

              <div className={`p-3 rounded-lg ${
                myTicket.status === 'called' ? 'bg-blue-50' :
                myTicket.status === 'in_progress' ? 'bg-purple-50' :
                myTicket.status === 'completed' ? 'bg-green-50' :
                'bg-yellow-50'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full animate-pulse ${
                    myTicket.status === 'waiting' ? 'bg-yellow-500' :
                    myTicket.status === 'called' ? 'bg-blue-500' :
                    myTicket.status === 'in_progress' ? 'bg-purple-500' :
                    myTicket.status === 'completed' ? 'bg-green-500' :
                    'bg-gray-500'
                  }`} />
                  <p className="font-medium">
                    {myTicket.status === 'waiting' && '⏳ En attente...'}
                    {myTicket.status === 'called' && '🔔 Votre tour est arrivé ! Rendez-vous au comptoir'}
                    {myTicket.status === 'in_progress' && '💆 Votre service est en cours'}
                    {myTicket.status === 'completed' && '✅ Service terminé !'}
                    {myTicket.status === 'cancelled' && '❌ Ticket annulé'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {statusHistory.length > 1 && (
          <Card className="mt-4 border-none shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Historique</p>
              <div className="space-y-1">
                {statusHistory.map((item) => {
                  const info = getStatusInfo(item.status);
                  const Icon = info.icon;
                  return (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <Icon className="h-3 w-3 text-muted-foreground" />
                      <span>{info.label}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(item.timestamp, 'HH:mm:ss')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </>
  );
}