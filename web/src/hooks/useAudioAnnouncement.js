// /src/hooks/useAudioAnnouncement.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { audioService } from '@/services/AudioService';

export const useAudioAnnouncement = () => {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    const initAudio = async () => {
      try {
        await audioService.initialize();
        if (isMounted.current) {
          setIsReady(true);
        }
      } catch (error) {
        console.error('Erreur d\'initialisation audio:', error);
      }
    };

    initAudio();

    return () => {
      isMounted.current = false;
    };
  }, []);

  // ✅ Annonce sans pause
  const announceTicket = useCallback(async (ticketNumber, employeeNumber) => {
    if (!isReady || isPlaying) return;
    
    setIsPlaying(true);
    try {
      await audioService.announceTicket(ticketNumber, employeeNumber);
    } catch (error) {
      console.error('Erreur d\'annonce:', error);
    } finally {
      setIsPlaying(false);
    }
  }, [isReady, isPlaying]);

  const playNotificationOnly = useCallback(async () => {
    if (!isReady) return;
    
    try {
      await audioService.playNotification();
    } catch (error) {
      console.error('Erreur de notification:', error);
    }
  }, [isReady]);

  return {
    isReady,
    isPlaying,
    announceTicket,
    playNotificationOnly
  };
};