import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useSubscriptionAuth } from '@/contexts/SubscriptionAuthContext.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Loader2 } from 'lucide-react';
import { PLANS_PATH, MANAGE_PATH } from '@/config/subscriptionRoutes.js';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * Bouton de gestion d'abonnement
 * Redirige vers la page de gestion ou les plans
 */
export default function ManageSubscriptionButton({ 
  className, 
  plansPath = PLANS_PATH,
  variant = 'outline',
  size = 'default'
}) {
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const { subscriptions, hasValidSubscription } = useSubscriptionAuth();
  const navigate = useNavigate();

  // Si l'utilisateur n'est pas authentifié
  if (!currentUser) return null;

  // Vérifier si l'utilisateur a un abonnement actif
  const hasActive = hasValidSubscription || subscriptions?.some(
    (s) => s?.status === 'active' || s?.status === 'trialing'
  );

  // Si pas d'abonnement actif, rediriger vers les plans
  if (!hasActive) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => navigate(plansPath)}
        className={className}
      >
        Voir les plans
      </Button>
    );
  }

  // Si abonnement actif, rediriger vers la gestion
  const handleManage = () => {
    setLoading(true);
    try {
      navigate(MANAGE_PATH);
    } catch (error) {
      console.error('Error navigating to manage:', error);
      toast.error('Erreur lors de la navigation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleManage}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Chargement...
        </>
      ) : (
        'Gérer l\'abonnement'
      )}
    </Button>
  );
}