import React from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useSubscriptionAuth } from '@/contexts/SubscriptionAuthContext.jsx';
import { Link } from 'react-router-dom';
import { MANAGE_PATH, PLANS_PATH } from '@/config/subscriptionRoutes.js';
import { Button } from '@/components/ui/button.jsx';
import { Loader2, Crown, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Section d'affichage de l'abonnement dans le compte utilisateur
 */
export default function SubscriptionAccountSection({ className }) {
  const { isAuthenticated } = useAuth();
  const { subscriptions, hasValidSubscription, polling, pollingExhausted } = useSubscriptionAuth();

  if (!isAuthenticated) return null;

  const active = subscriptions?.find((s) => s?.status === 'active' || s?.status === 'trialing');
  const wrapper = className ?? 'rounded-lg border bg-card p-6';

  if (polling) {
    return (
      <section className={wrapper}>
        <div className="flex items-center gap-3 mb-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <h2 className="text-lg font-semibold">Activation de votre abonnement…</h2>
        </div>
        <p className="text-muted-foreground">
          Veuillez patienter pendant que nous finalisons votre paiement.
        </p>
      </section>
    );
  }

  if (pollingExhausted && !active) {
    return (
      <section className={wrapper}>
        <h2 className="text-lg font-semibold mb-2">Presque terminé</h2>
        <p className="text-muted-foreground mb-4">
          Votre paiement est en cours de traitement. Rafraîchissez la page dans un instant.
        </p>
        <Button asChild variant="outline">
          <Link to={MANAGE_PATH}>Gérer mon abonnement</Link>
        </Button>
      </section>
    );
  }

  if (!active) {
    return (
      <section className={wrapper}>
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Crown className="h-5 w-5 text-muted-foreground" />
          Abonnement
        </h2>
        <p className="text-muted-foreground mb-4">
          Vous n'avez pas d'abonnement actif. Débloquez des fonctionnalités premium avec un plan payant.
        </p>
        <Button asChild>
          <Link to={PLANS_PATH}>Voir les plans</Link>
        </Button>
      </section>
    );
  }

  const statusLabel = active.status === 'trialing' ? 'Essai' : 'Actif';
  const endDate = active.end_date ? new Date(active.end_date) : null;
  const daysRemaining = endDate ? Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <section className={wrapper}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Abonnement
          </h2>
          <p className="text-2xl font-bold mt-1 capitalize">{active.plan || active.product_title || 'Starter'}</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-semibold uppercase">
          {statusLabel}
        </span>
      </div>

      {endDate && (
        <div className="flex items-center gap-2 text-sm mb-4">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Expire le :</span>
          <span className="font-medium">{endDate.toLocaleDateString('fr-FR')}</span>
          <span className="text-muted-foreground">•</span>
          <span className={daysRemaining > 30 ? 'text-green-600' : daysRemaining > 7 ? 'text-yellow-600' : 'text-red-600'}>
            {daysRemaining} jours restants
          </span>
        </div>
      )}

      <div className="mt-4 flex gap-3">
        <Button asChild variant="outline">
          <Link to={MANAGE_PATH}>Gérer</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={PLANS_PATH}>Changer de plan</Link>
        </Button>
      </div>
    </section>
  );
}