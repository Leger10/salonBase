import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, AlertCircle, CheckCircle, Crown, Clock, AlertTriangle } from 'lucide-react';
import { MANAGE_PATH, PLANS_PATH } from '@/config/subscriptionRoutes.js';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';

/**
 * Composant d'affichage du statut d'abonnement pour un salon
 */
export default function SubscriptionStatusComponent({ salon, showRenewalButton = true }) {
  if (!salon) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">Aucune information d'abonnement disponible</p>
      </div>
    );
  }

  // Les champs proviennent de la table tenants
  const endDate = salon.subscription_end ? new Date(salon.subscription_end) : null;
  const startDate = salon.subscription_start ? new Date(salon.subscription_start) : null;
  const today = new Date();
  const daysRemaining = endDate ? Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)) : 0;
  const isExpired = daysRemaining < 0;
  const isExpiringSoon = daysRemaining >= 0 && daysRemaining < 7;

  const getStatusColor = () => {
    if (salon.subscription_status === 'inactive' || salon.subscription_status === 'expired' || isExpired) {
      return 'text-red-600';
    }
    if (isExpiringSoon) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (salon.subscription_status === 'active' && daysRemaining > 7) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    if (isExpiringSoon && salon.subscription_status === 'active') {
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
    return <AlertCircle className={`h-5 w-5 ${getStatusColor()}`} />;
  };

  const getStatusBadge = () => {
    if (salon.subscription_status === 'active' && !isExpired) {
      return <Badge className="bg-green-100 text-green-800">Actif</Badge>;
    }
    if (isExpired || salon.subscription_status === 'inactive') {
      return <Badge className="bg-red-100 text-red-800">Expiré</Badge>;
    }
    if (isExpiringSoon) {
      <Badge className="bg-yellow-100 text-yellow-800">Expire bientôt</Badge>;
    }
    return <Badge variant="outline">{salon.subscription_status}</Badge>;
  };

  const planLabels = {
    starter: 'Starter',
    pro: 'Pro',
    premium: 'Premium'
  };

  const planName = planLabels[salon.subscription_plan] || salon.subscription_plan || 'Starter';

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-all">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Statut de l'abonnement
          </h3>
          <p className="text-sm text-muted-foreground">Gérez votre plan et vos factures</p>
        </div>
        {getStatusIcon()}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-muted/30 p-4">
          <div>
            <p className="text-sm text-muted-foreground">Plan actuel</p>
            <p className="text-xl font-bold capitalize">{planName}</p>
          </div>
          <div className="text-right">
            {getStatusBadge()}
            {salon.subscription_status === 'active' && !isExpired && (
              <p className="text-xs text-muted-foreground mt-1">
                {daysRemaining > 0 ? `${daysRemaining} jours restants` : 'Expire aujourd\'hui'}
              </p>
            )}
          </div>
        </div>

        {startDate && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Début :</span>
            <span className="font-medium">{startDate.toLocaleDateString('fr-FR')}</span>
          </div>
        )}

        {endDate && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Fin :</span>
            <span className={`font-medium ${getStatusColor()}`}>
              {endDate.toLocaleDateString('fr-FR')}
            </span>
          </div>
        )}

        {salon.subscription_status === 'active' && (
          <div className="rounded-lg bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">Jours restants</p>
            <p className={`text-2xl font-bold ${getStatusColor()}`}>
              {daysRemaining > 0 ? daysRemaining : 0} jours
            </p>
            {isExpiringSoon && daysRemaining > 0 && (
              <p className="mt-2 text-xs text-yellow-600">⚠️ Votre abonnement expire bientôt</p>
            )}
          </div>
        )}

        {showRenewalButton && (
          <div className="flex gap-3 mt-2">
            {salon.subscription_status === 'active' && (
              <Button asChild variant="outline" className="flex-1">
                <Link to={MANAGE_PATH}>Gérer l'abonnement</Link>
              </Button>
            )}
            {(salon.subscription_status === 'inactive' || salon.subscription_status === 'expired' || isExpired) && (
              <Button asChild className="flex-1">
                <Link to={PLANS_PATH}>Renouveler l'abonnement</Link>
              </Button>
            )}
            {salon.subscription_status === 'active' && !isExpired && (
              <Button asChild variant="outline" className="flex-1">
                <Link to={PLANS_PATH}>Changer de plan</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}