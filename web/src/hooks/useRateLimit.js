// /src/hooks/useRateLimit.js
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export function useRateLimit() {
  const [lastAttempt, setLastAttempt] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    const timeSinceLastAttempt = (now - lastAttempt) / 1000; // en secondes
    
    // Réinitialiser après 1 heure
    if (timeSinceLastAttempt > 3600) {
      setAttempts(0);
      setIsRateLimited(false);
    }

    // Limite de 10 tentatives par heure
    if (attempts >= 10) {
      setIsRateLimited(true);
      toast.error('Trop de tentatives. Veuillez réessayer dans 1 heure.');
      return false;
    }

    setLastAttempt(now);
    setAttempts(prev => prev + 1);
    return true;
  }, [attempts, lastAttempt]);

  return { checkRateLimit, isRateLimited, attempts };
}