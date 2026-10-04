import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useSubscriptionAuth } from '@/contexts/SubscriptionAuthContext.jsx';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Crown, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { MANAGE_PATH } from '@/config/subscriptionRoutes.js';

// Plans prédéfinis
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29000,
    description: 'Parfait pour les petits salons qui débutent',
    features: [
      'Jusqu\'à 50 clients',
      'Gestion des rendez-vous',
      'Notifications SMS basiques',
      'Support par email',
      '1 employé inclus'
    ],
    color: 'from-blue-500 to-blue-600',
    popular: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99000,
    description: 'Idéal pour les salons en pleine croissance',
    features: [
      'Clients illimités',
      'Gestion avancée des rendez-vous',
      'Notifications SMS et email',
      'Support prioritaire',
      'Jusqu\'à 10 employés',
      'Programme de fidélité',
      'Analytique avancée'
    ],
    color: 'from-purple-500 to-pink-500',
    popular: true
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 199000,
    description: 'Pour les grands salons et chaînes',
    features: [
      'Tout inclus du plan Pro',
      'Employés illimités',
      'API personnalisée',
      'Support dédié 24/7',
      'Formation équipe',
      'Marketing automation',
      'Multi-boutiques'
    ],
    color: 'from-amber-500 to-orange-500',
    popular: false
  }
];

export default function PlansList({ className }) {
  const { currentUser } = useAuth();
  const { subscriptions, refreshSubscriptions, hasValidSubscription } = useSubscriptionAuth();
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);

  useEffect(() => {
    if (currentUser?.profile?.tenant_id) {
      fetchCurrentPlan();
    }
  }, [currentUser]);

  const fetchCurrentPlan = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) return;

      const { data, error } = await supabase
        .from('tenants')
        .select('subscription_plan, subscription_status')
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      setCurrentPlan(data?.subscription_plan);
    } catch (error) {
      console.error('Error fetching current plan:', error);
    }
  };

  const handleSubscribe = async (planId) => {
    if (!currentUser) {
      toast.info('Veuillez vous connecter pour souscrire');
      return;
    }

    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error('Configuration du salon non trouvée');
        return;
      }

      const plan = PLANS.find(p => p.id === planId);
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      // Mettre à jour l'abonnement du tenant
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({
          subscription_plan: planId,
          subscription_status: 'active',
          subscription_start: startDate.toISOString().split('T')[0],
          subscription_end: endDate.toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId);

      if (tenantError) throw tenantError;

      // Créer une transaction d'abonnement
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          tenant_id: tenantId,
          plan: planId,
          duration: 'monthly',
          amount: plan.price,
          status: 'active',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          validated_by: currentUser?.id
        });

      if (subError) throw subError;

      await refreshSubscriptions();
      toast.success(`Abonnement ${plan.name} activé avec succès !`);
      fetchCurrentPlan();
      
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Erreur lors de l\'activation de l\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  const PlanCard = ({ plan, isCurrentPlan, isLocked }) => {
    const [isSubscribing, setIsSubscribing] = useState(false);

    const handleSubscribeClick = async () => {
      setIsSubscribing(true);
      await handleSubscribe(plan.id);
      setIsSubscribing(false);
    };

    return (
      <div className={`rounded-2xl border bg-card overflow-hidden transition-all duration-300 flex flex-col ${
        plan.popular ? 'border-primary shadow-xl scale-105 md:scale-105' : 'border-border hover:shadow-lg'
      } ${isLocked && !isCurrentPlan ? 'opacity-60' : ''}`}>
        
        {plan.popular && (
          <div className="bg-primary text-primary-foreground text-center text-xs font-bold py-1.5 uppercase tracking-wider">
            Plus populaire
          </div>
        )}
        
        <div className="p-6 flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
            </div>
            {isCurrentPlan && (
              <Badge className="bg-green-100 text-green-800 shrink-0 ml-2">
                <Check className="h-3 w-3 mr-1" />
                Actuel
              </Badge>
            )}
          </div>

          <div className="mt-4">
            <span className="text-3xl font-bold">{plan.price.toLocaleString()} FCFA</span>
            <span className="text-muted-foreground text-sm ml-1">/ mois</span>
          </div>

          <ul className="mt-4 space-y-2">
            {plan.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 pt-0">
          {isCurrentPlan ? (
            <Button asChild variant="outline" className="w-full">
              <Link to={MANAGE_PATH}>Gérer l'abonnement</Link>
            </Button>
          ) : isLocked ? (
            <Button disabled className="w-full opacity-60" title="Vous avez déjà un abonnement actif">
              Déjà abonné
            </Button>
          ) : (
            <Button 
              onClick={handleSubscribeClick}
              disabled={isSubscribing || loading}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {isSubscribing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Activation...
                </>
              ) : (
                `Souscrire à ${plan.name}`
              )}
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-6 h-96 animate-pulse">
            <div className="h-6 bg-muted rounded w-3/4 mb-4" />
            <div className="h-4 bg-muted rounded w-1/2 mb-6" />
            <div className="h-8 bg-muted rounded w-1/3 mb-4" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-4 bg-muted rounded w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Choisissez votre plan</h2>
        <p className="text-muted-foreground mt-2">
          Des tarifs adaptés à tous les besoins. Évoluez facilement selon votre activité.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 items-stretch">
        {PLANS.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id;
          const hasActive = hasValidSubscription;
          const isLocked = hasActive && !isCurrentPlan;
          
          return (
            <PlanCard 
              key={plan.id}
              plan={plan}
              isCurrentPlan={isCurrentPlan}
              isLocked={isLocked}
            />
          );
        })}
      </div>

      <div className="text-center mt-8">
        <p className="text-sm text-muted-foreground">
          Tous les plans incluent une période d'essai de 14 jours. Annulation possible à tout moment.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Vous avez des questions ? <a href="/contact" className="text-primary hover:underline">Contactez-nous</a>
        </p>
      </div>
    </div>
  );
}