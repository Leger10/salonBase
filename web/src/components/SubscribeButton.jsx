import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useSubscriptionAuth } from '@/contexts/SubscriptionAuthContext.jsx';
import { supabase } from '@/lib/supabase';
import { LOGIN_PATH, MANAGE_PATH } from '@/config/subscriptionRoutes.js';
import { toast } from 'sonner';

/**
 * Bouton d'abonnement pour souscrire à un plan
 * Utilise Supabase pour créer l'abonnement
 */
export default function SubscribeButton({ plan, variant, className, label }) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const { currentUser, isAuthenticated } = useAuth();
  const { refreshSubscriptions } = useSubscriptionAuth();
  const navigate = useNavigate();

  const handleClick = async () => {
    if (!isAuthenticated) {
      navigate(LOGIN_PATH);
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const tenantId = currentUser?.profile?.tenant_id;
      
      if (!tenantId) {
        throw new Error('Configuration du salon non trouvée');
      }

      // Créer un abonnement dans la table subscriptions
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 mois d'abonnement

      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .insert({
          tenant_id: tenantId,
          plan: plan.id || plan.name || 'starter',
          duration: 'monthly',
          amount: plan.price || 29000,
          payment_method: 'pending',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Mettre à jour le tenant
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({
          subscription_plan: plan.id || plan.name || 'starter',
          subscription_status: 'active',
          subscription_start: startDate.toISOString().split('T')[0],
          subscription_end: endDate.toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId);

      if (tenantError) throw tenantError;

      // Rafraîchir les abonnements
      await refreshSubscriptions();

      toast.success('Abonnement activé avec succès !');
      navigate(MANAGE_PATH);

    } catch (err) {
      console.error('Subscription failed', err);
      setLoading(false);
      
      // Vérifier si l'utilisateur a déjà un abonnement actif
      const freshSubscriptions = await refreshSubscriptions();
      const hasActive = freshSubscriptions.some(
        (sub) => sub && (sub.status === 'active' || sub.status === 'trialing')
      );
      
      if (hasActive) {
        navigate(MANAGE_PATH);
      } else {
        setErrorMessage("Impossible de démarrer l'abonnement. Veuillez réessayer.");
        toast.error("Erreur lors de l'activation de l'abonnement");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={className ?? 'w-full rounded-md bg-primary text-primary-foreground px-4 py-2 font-medium hover:bg-primary/90 disabled:opacity-60'}
      >
        {loading ? 'Chargement…' : (label ?? `Souscrire à ${plan?.title ?? 'ce plan'}`)}
      </button>
      {errorMessage && (
        <p className="text-sm text-destructive mt-2" role="alert">{errorMessage}</p>
      )}
    </div>
  );
}