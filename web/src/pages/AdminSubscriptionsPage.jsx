// /src/pages/AdminSubscription.jsx
import React, { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Crown, Users, Scissors, Package, Check,
  Calendar, DollarSign, CreditCard, ArrowRight,
  Loader2, Sparkles, Star, Zap, Shield, Clock
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function AdminSubscription() {
  const { currentUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;

      // Récupérer les plans disponibles
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Récupérer l'abonnement actuel du salon
      if (tenantId) {
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (subError && subError.code !== 'PGRST116') throw subError;
        setCurrentSubscription(subData || null);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan) => {
    setSelectedPlan(plan);
    setProcessing(true);

    try {
      const tenantId = currentUser?.profile?.tenant_id;

      if (!tenantId) {
        toast.error('Salon non trouvé');
        return;
      }

      // Calculer les dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + plan.duration_months);

      // Créer l'abonnement
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          tenant_id: tenantId,
          plan_id: plan.id,
          plan_name: plan.name,
          amount: plan.price,
          currency: plan.currency || 'FCFA',
          status: 'pending',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          max_employees: plan.max_employees,
          max_services: plan.max_services,
          max_products: plan.max_products,
          features: plan.features || {}
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Abonnement "${plan.name}" souscrit avec succès !`);
      setSelectedPlan(null);
      fetchData();

      // Rediriger vers la page de paiement
      // window.location.href = `/payment/subscription/${data.id}`;

    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Erreur lors de la souscription');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      active: { label: 'Actif', className: 'bg-green-100 text-green-800' },
      trial: { label: 'Essai', className: 'bg-blue-100 text-blue-800' },
      pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
      expired: { label: 'Expiré', className: 'bg-red-100 text-red-800' },
      cancelled: { label: 'Annulé', className: 'bg-gray-100 text-gray-800' }
    };
    return statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
  };

  const isSubscribed = currentSubscription && ['active', 'trial'].includes(currentSubscription.status);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Abonnement</h1>
          <p className="text-muted-foreground mt-1">
            Gérez votre abonnement et choisissez le plan adapté à votre salon
          </p>
        </div>
        {currentSubscription && (
          <Badge className={getStatusBadge(currentSubscription.status).className + " text-lg py-2 px-4"}>
            {getStatusBadge(currentSubscription.status).label}
          </Badge>
        )}
      </div>

      {/* Abonnement actuel */}
      {currentSubscription && (
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Votre abonnement actuel
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-2xl font-bold">{currentSubscription.plan_name}</h3>
                <p className="text-muted-foreground">
                  {currentSubscription.amount?.toLocaleString()} {currentSubscription.currency} / {currentSubscription.duration_months} mois
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{currentSubscription.max_employees} employés max</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Scissors className="h-4 w-4 text-primary" />
                    <span>{currentSubscription.max_services} services max</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <span>{currentSubscription.max_products} produits max</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Début: {new Date(currentSubscription.start_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Fin: {new Date(currentSubscription.end_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Renouvellement: {currentSubscription.auto_renew ? 'Automatique' : 'Manuel'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans disponibles */}
      <div>
        <h2 className="text-2xl font-bold mb-6">
          {isSubscribed ? 'Changer de plan' : 'Choisissez votre plan'}
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = currentSubscription?.plan_id === plan.id;
            const isActive = currentSubscription?.status === 'active';

            return (
              <Card
                key={plan.id}
                className={`border-2 transition-all hover:shadow-lg ${
                  isCurrentPlan && isActive
                    ? 'border-primary shadow-lg'
                    : 'border-transparent hover:border-primary/30'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                      )}
                    </div>
                    {isCurrentPlan && isActive && (
                      <Badge className="bg-green-100 text-green-800">
                        <Check className="h-3 w-3 mr-1" />
                        Actuel
                      </Badge>
                    )}
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-bold">{plan.price.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground"> {plan.currency}</span>
                    <span className="text-sm text-muted-foreground ml-1">/ {plan.duration_months} mois</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span>Jusqu'à {plan.max_employees} employés</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Scissors className="h-4 w-4 text-primary" />
                      <span>Jusqu'à {plan.max_services} services</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <span>Jusqu'à {plan.max_products} produits</span>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-6 gap-2"
                    variant={isCurrentPlan && isActive ? 'outline' : 'default'}
                    disabled={isCurrentPlan && isActive || processing}
                    onClick={() => handleSubscribe(plan)}
                  >
                    {processing && selectedPlan?.id === plan.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Traitement...
                      </>
                    ) : isCurrentPlan && isActive ? (
                      'Plan actuel'
                    ) : (
                      <>
                        Souscrire <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* FAQ ou informations supplémentaires */}
      <Card className="border-none shadow-sm bg-muted/20">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2">Besoin d'aide ?</h3>
          <p className="text-sm text-muted-foreground">
            Vous pouvez contacter le support pour toute question concernant les abonnements
            ou si vous souhaitez un plan personnalisé.
          </p>
          <Button variant="outline" className="mt-4">
            Contacter le support
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}