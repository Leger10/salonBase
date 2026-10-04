import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, CheckCircle, Calendar, Gift, Star, X, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

// Canal global pour éviter les duplications
let globalChannel = null;
let globalListeners = [];
let isGlobalSubscribed = false;

export default function NotificationBell() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef(null);
  const mountedRef = useRef(true);
  const userId = currentUser?.profile?.id;

  // Initialiser l'audio
  useEffect(() => {
    audioRef.current = new Audio('/sounds/success.mp3');
    audioRef.current.preload = 'auto';
    
    const savedSoundPref = localStorage.getItem('notification_sound_enabled');
    if (savedSoundPref !== null) {
      setSoundEnabled(savedSoundPref === 'true');
    }
  }, []);

  // Jouer le son
  const playSound = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log('Audio playback failed:', err);
      });
    }
  };

  // Récupérer les notifications
  const fetchNotifications = async () => {
    if (!userId || !mountedRef.current) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      if (data && mountedRef.current) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Marquer comme lu
  const markAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Marquer tout comme lu
  const markAllAsRead = async () => {
    if (!userId || unreadCount === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
      toast.success('Toutes les notifications ont été marquées comme lues');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Erreur lors du marquage');
    }
  };

  // Supprimer une notification
  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const deleted = notifications.find(n => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (deleted && !deleted.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Toggle son
  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('notification_sound_enabled', newValue);
    
    if (newValue && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.log('Test sound failed:', err));
    }
  };

  // Obtenir l'icône en fonction du type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment_reminder':
      case 'appointment':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'promotion':
        return <Gift className="h-4 w-4 text-pink-500" />;
      case 'loyalty':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  // ============================================================
  // 🔔 CONFIGURATION DU CANAL REALTIME - APPROCHE GLOBALE
  // ============================================================
  useEffect(() => {
    mountedRef.current = true;

    if (!userId) {
      setLoading(false);
      return;
    }

    // Fonction pour ajouter un listener
    const addListener = (callback) => {
      if (!globalListeners.includes(callback)) {
        globalListeners.push(callback);
      }
    };

    // Fonction pour notifier tous les listeners
    const notifyListeners = (payload) => {
      globalListeners.forEach(callback => {
        try {
          callback(payload);
        } catch (e) {
          console.error('Erreur dans un listener:', e);
        }
      });
    };

    // Configurer le canal global une seule fois
    if (!globalChannel) {
      const channelName = 'notifications:global';
      globalChannel = supabase.channel(channelName);

      // Définir les callbacks AVANT subscribe
      globalChannel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
          },
          (payload) => {
            // Filtrer par user_id côté client
            if (payload.new.user_id === userId) {
              notifyListeners(payload);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
          },
          (payload) => {
            if (payload.new.user_id === userId) {
              notifyListeners(payload);
            }
          }
        );

      // S'abonner
      globalChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`🔔 Canal global connecté`);
          isGlobalSubscribed = true;
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Erreur canal global`);
          isGlobalSubscribed = false;
        }
      });
    }

    // Ajouter le listener pour ce composant
    const handleNotification = (payload) => {
      if (!mountedRef.current) return;
      
      if (payload.eventType === 'INSERT') {
        const newNotification = payload.new;
        setNotifications((prev) => [newNotification, ...prev]);
        setUnreadCount((prev) => prev + 1);
        playSound();
        
        if (Notification.permission === 'granted') {
          new Notification(newNotification.title || 'Nouvelle notification', {
            body: newNotification.message || '',
            icon: '/favicon.ico'
          });
        }
      } else if (payload.eventType === 'UPDATE') {
        const updated = payload.new;
        setNotifications((prev) =>
          prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
        );
      }
    };

    addListener(handleNotification);

    // Charger les notifications initiales
    fetchNotifications();

    // Demander la permission pour les notifications navigateur
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup - retirer le listener
    return () => {
      mountedRef.current = false;
      globalListeners = globalListeners.filter(l => l !== handleNotification);
      
      // Si plus de listeners, on peut garder le canal ouvert ou le fermer
      // On le garde ouvert pour les autres composants
    };
  }, [userId]);

  if (!userId) {
    return null;
  }

  return (
    <>
      <audio ref={audioRef} preload="auto">
        <source src="/sounds/success.mp3" type="audio/mpeg" />
      </audio>
      
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <div className="p-3 border-b flex justify-between items-center">
            <span className="font-semibold">Notifications</span>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSound}
                className="p-1 rounded hover:bg-muted transition-colors"
                title={soundEnabled ? 'Désactiver le son' : 'Activer le son'}
              >
                {soundEnabled ? (
                  <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-7 px-2"
                >
                  Tout lire
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className="max-h-96">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-xs text-muted-foreground mt-2">Chargement...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <DropdownMenuItem
                  key={notif.id}
                  className={`p-3 cursor-pointer flex items-start gap-3 ${
                    !notif.is_read ? 'bg-muted/50' : ''
                  } hover:bg-muted transition-colors group`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="mt-0.5">{getNotificationIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notif.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!notif.is_read && (
                      <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                    <button
                      onClick={(e) => deleteNotification(notif.id, e)}
                      className="p-0.5 rounded hover:bg-muted-foreground/20 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </ScrollArea>
          {notifications.length > 0 && (
            <div className="p-2 border-t text-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs w-full text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                Fermer
              </Button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}