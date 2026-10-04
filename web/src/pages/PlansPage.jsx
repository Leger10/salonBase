import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionAuth } from '@/contexts/SubscriptionAuthContext';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { toast } from 'sonner';
import { Check, Crown, Sparkles, Star, TrendingUp } from 'lucide-react';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29000,
    period: 'mois',
    description: 'Parfait pour les petits salons qui débutent',
    features: [
      'Jusqu\'à 50 clients',
      'Gestion des rendez-vous',
      'Notifications SMS basiques',
      'Support par email',
      '1 employé inclus'
    ],
    color: 'from-blue-500 to-blue-600',
    icon: Star,
    popular: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99000,
    period: 'mois',
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
    icon: Sparkles,
    popular: true
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 199000,
    period: 'mois',
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
    icon: Crown,
    popular: false
  }
];

export default function PlansPage() {
  const { isAuthenticated, currentUser } = useAuth();
  const { refreshSubscriptions } = useSubscriptionAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);

  useEffect(() => {
    if (isAuthenticated && currentUser?.profile?.tenant_id) {
      fetchCurrentPlan();
    }
  }, [isAuthenticated, currentUser]);

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
    if (!isAuthenticated) {
      toast.info('Veuillez vous connecter pour souscrire');
      navigate('/auth/login');
      return;
    }

    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error('Configuration du salon non trouvée');
        return;
      }

      // Mettre à jour l'abonnement du tenant
      const { error } = await supabase
        .from('tenants')
        .update({
          subscription_plan: planId,
          subscription_status: 'active',
          subscription_start: new Date().toISOString().split('T')[0],
          subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId);

      if (error) throw error;

      // Créer une transaction d'abonnement
      const plan = PLANS.find(p => p.id === planId);
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          tenant_id: tenantId,
          plan: planId,
          duration: 'monthly',
          amount: plan.price,
          status: 'completed',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          validated_by: currentUser?.id
        });

      if (subError) throw subError;

      await refreshSubscriptions();
      toast.success(`Abonnement ${plan.name} activé avec succès !`);
      navigate('/subscriptions');
      
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Erreur lors de l\'activation de l\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Choisissez votre plan
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Des tarifs adaptés à tous les besoins. Évoluez facilement selon votre activité.
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-8">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentPlan === plan.id;
            
            return (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden transition-all duration-300 ${
                  plan.popular 
                    ? 'border-primary shadow-xl scale-105 md:scale-105' 
                    : 'border-border hover:shadow-lg'
                } ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                      Populaire
                    </div>
                  </div>
                )}
                
                {isCurrentPlan && (
                  <div className="absolute top-0 left-0">
                    <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-br-lg">
                      Plan actuel
                    </div>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className={`mx-auto w-16 h-16 rounded-full bg-gradient-to-r ${plan.color} flex items-center justify-center mb-4`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price.toLocaleString()} FCFA</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loading || isCurrentPlan}
                    className={`w-full bg-gradient-to-r ${plan.color} text-white hover:opacity-90 transition-opacity`}
                    variant={isCurrentPlan ? "outline" : "default"}
                  >
                    {isCurrentPlan 
                      ? 'Plan actuel' 
                      : loading 
                        ? 'Chargement...' 
                        : `Choisir ${plan.name}`
                    }
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Tous les plans incluent une période d'essai de 14 jours. Annulation possible à tout moment.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Vous avez des questions ? <a href="/contact" className="text-primary hover:underline">Contactez-nous</a>
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}