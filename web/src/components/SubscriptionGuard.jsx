// /src/components/SubscriptionGuard.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Crown,
  AlertTriangle,
  Calendar,
  Clock,
  CreditCard,
  RefreshCw,
  Loader2,
  Shield,
  X,
  CheckCircle,
  ArrowRight,
  Eye,
  Sparkles,
  Zap,
  Users,
  Scissors,
  Package,
  Star,
  Rocket,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function SubscriptionGuard({ children }) {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tenant, setTenant] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  // ✅ Exclure certaines routes du guard
  const excludedRoutes = ['/admin/subscription/success', '/admin/subscription'];
  const isExcludedRoute = excludedRoutes.some(route => location.pathname.startsWith(route));

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && currentUser?.profile?.tenant_id) {
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, [currentUser, isAuthenticated, isLoading, location.pathname]);

  const checkSubscription = async () => {
    // ✅ Ne pas vérifier sur les routes exclues
    if (isExcludedRoute) {
      setLoading(false);
      return;
    }

    // ✅ Éviter les appels multiples
    if (checkingSubscription) return;
    setCheckingSubscription(true);
    setLoading(true);

    try {
      const tenantId = currentUser?.profile?.tenant_id;
      const role = currentUser?.profile?.role;

      // Seul les admins sont concernés
      if (role !== "admin") {
        setLoading(false);
        setCheckingSubscription(false);
        return;
      }

      if (!tenantId) {
        setLoading(false);
        setCheckingSubscription(false);
        return;
      }

      // Récupérer les infos du salon
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();

      if (tenantError) throw tenantError;
      setTenant(tenantData);

      // Récupérer l'abonnement actif
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError && subError.code !== "PGRST116") throw subError;

      // Récupérer les plans disponibles
      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Vérifier le statut
      const hasActiveSub = subData !== null && subData?.status === "active";

      let isActive = false;
      let daysRemaining = 0;

      if (hasActiveSub && subData?.end_date) {
        const endDate = new Date(subData.end_date);
        const now = new Date();
        daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        isActive = endDate > now;
      }

      if (
        tenantData?.subscription_mode === "external" &&
        tenantData?.external_payment_expiry
      ) {
        const expiryDate = new Date(tenantData.external_payment_expiry);
        const now = new Date();
        daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        isActive = expiryDate > now;
      }

      if (tenantData?.subscription_mode === "free") {
        isActive = true;
        daysRemaining = 30;
      }

      if (tenantData?.subscription_status === "active" && !hasActiveSub) {
        if (
          tenantData?.subscription_mode === "external" &&
          tenantData?.external_payment_expiry
        ) {
          const expiryDate = new Date(tenantData.external_payment_expiry);
          const now = new Date();
          daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
          isActive = expiryDate > now;
        } else {
          isActive = false;
        }
      }

      setSubscriptionStatus({
        status: isActive ? "active" : "inactive",
        subscription: subData,
        tenant: tenantData,
        endDate: subData?.end_date || tenantData?.external_payment_expiry,
        mode: tenantData?.subscription_mode || "subscription",
        daysRemaining: daysRemaining,
      });

      // ✅ Ne pas afficher le modal sur les routes exclues
      if (!isActive && !isExcludedRoute) {
        setShowModal(true);
      } else {
        setShowModal(false);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      if (!isExcludedRoute) {
        setShowModal(true);
      }
    } finally {
      setLoading(false);
      setCheckingSubscription(false);
    }
  };

  // ✅ Fonction pour souscrire directement depuis le modal
  const handleSubscribe = async (plan) => {
    setSelectedPlan(plan);
    setProcessing(true);

    try {
      const tenantId = currentUser?.profile?.tenant_id;

      if (!tenantId) {
        toast.error('Salon non trouvé');
        setProcessing(false);
        return;
      }

      // Vérifier si un abonnement est déjà en attente
      const { data: existingPending, error: pendingError } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingPending) {
        toast.error('Une demande d\'abonnement est déjà en attente de validation');
        setProcessing(false);
        return;
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + plan.duration_months);

      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          tenant_id: tenantId,
          plan: plan.name,
          duration: `${plan.duration_months} mois`,
          amount: plan.price,
          payment_method: 'online',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          status: 'pending',
          auto_renew: false,
          max_employees: plan.max_employees,
          max_services: plan.max_services,
          max_products: plan.max_products,
          features: plan.features || {},
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('tenants')
        .update({
          subscription_status: 'pending',
          subscription_plan: plan.name,
          subscription_start: startDate.toISOString().split('T')[0],
          subscription_end: endDate.toISOString().split('T')[0]
        })
        .eq('id', tenantId);

      // ✅ Fermer le modal avant de rediriger
      setShowModal(false);
      toast.success(`Demande d'abonnement "${plan.name}" envoyée avec succès !`);
      
      // ✅ Rediriger vers la page de succès
      navigate('/admin/subscription/success');
      
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error(error.message || 'Erreur lors de la souscription');
    } finally {
      setProcessing(false);
    }
  };

  // ✅ Rendu du modal avec les plans
  const renderModal = () => {
    // Trouver le plan le plus populaire (généralement celui du milieu)
    const popularPlanIndex = Math.floor(plans.length / 2);
    const popularPlan = plans[popularPlanIndex];

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="bg-background rounded-2xl shadow-2xl overflow-hidden border border-red-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-full animate-pulse">
                    <AlertTriangle className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Abonnement requis</h2>
                    <p className="text-white/90 text-sm">
                      {tenant?.name || "Votre salon"} n'a pas d'abonnement actif
                    </p>
                  </div>
                </div>
                <Badge className="bg-red-700 text-white border-none">
                  <Clock className="h-3 w-3 mr-1" />
                  Expiré
                </Badge>
              </div>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Message d'alerte */}
              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <p className="text-red-800 text-sm flex items-start gap-2">
                  <span className="mt-0.5">⚠️</span>
                  <span>
                    Pour accéder à l'administration de votre salon et continuer à gérer
                    vos rendez-vous, clients et employés, vous devez{" "}
                    <strong>souscrire à un abonnement</strong>.
                  </span>
                </p>
              </div>

              {/* ✅ Plans disponibles */}
              {plans.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Crown className="h-5 w-5 text-primary" />
                      Choisissez votre plan
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowModal(false);
                        navigate('/admin/subscription');
                      }}
                      className="text-primary"
                    >
                      Voir tous les plans <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    {plans.map((plan) => {
                      const isPopular = plan.id === popularPlan?.id;
                      const isSelected = selectedPlan?.id === plan.id;

                      return (
                        <div
                          key={plan.id}
                          className={`relative border-2 rounded-xl p-5 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : isPopular
                              ? 'border-amber-400 bg-amber-50/30 hover:border-primary/50'
                              : 'border-border hover:border-primary/30'
                          }`}
                          onClick={() => setSelectedPlan(plan)}
                        >
                          {isPopular && (
                            <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                              🌟 Populaire
                            </div>
                          )}

                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-bold text-lg">{plan.name}</h4>
                              {plan.description && (
                                <p className="text-xs text-muted-foreground">
                                  {plan.description}
                                </p>
                              )}
                            </div>
                            {isSelected && (
                              <Badge className="bg-primary text-white border-0">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Sélectionné
                              </Badge>
                            )}
                          </div>

                          <div className="mb-3">
                            <span className="text-2xl font-bold">
                              {plan.price.toLocaleString()} FCFA
                            </span>
                            <span className="text-sm text-muted-foreground">
                              / {plan.duration_months} mois
                            </span>
                          </div>

                          <div className="space-y-1.5 text-sm">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-primary" />
                              <span>{plan.max_employees} employés</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Scissors className="h-4 w-4 text-primary" />
                              <span>{plan.max_services} services</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-primary" />
                              <span>{plan.max_products} produits</span>
                            </div>
                          </div>

                          <Button
                            className="w-full mt-4 gap-2"
                            variant={isSelected ? 'default' : 'outline'}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlan(plan);
                            }}
                          >
                            {isSelected ? (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Sélectionné
                              </>
                            ) : (
                              'Choisir ce plan'
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  {/* ✅ Bouton de souscription */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t">
                    <Button
                      className="flex-1 gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-500/30"
                      size="lg"
                      disabled={!selectedPlan || processing}
                      onClick={() => selectedPlan && handleSubscribe(selectedPlan)}
                    >
                      {processing ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Souscription en cours...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5" />
                          {selectedPlan ? `Souscrire à ${selectedPlan.name}` : 'Sélectionnez un plan'}
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      size="lg"
                      onClick={() => {
                        setShowModal(false);
                        navigate('/admin/subscription');
                      }}
                    >
                      <Eye className="h-5 w-5" />
                      Voir tous les plans
                    </Button>
                  </div>
                </div>
              )}

              {/* Si pas de plans disponibles */}
              {plans.length === 0 && (
                <div className="text-center py-6">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Aucun plan disponible pour le moment.
                  </p>
                  <Button className="mt-4" onClick={() => {
                    setShowModal(false);
                    navigate('/admin/subscription');
                  }}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualiser
                  </Button>
                </div>
              )}

              {/* Support */}
              <div className="text-center text-sm text-muted-foreground pt-4 border-t">
                <p>
                  Une question ? Contactez le support :
                  <a
                    href="mailto:support@beautyflow.com"
                    className="text-primary hover:underline ml-1"
                  >
                    support@beautyflow.com
                  </a>
                </p>
              </div>
            </CardContent>
          </div>
        </div>
      </div>
    );
  };

  // ✅ Si l'authentification est en cours de chargement
  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ✅ Si l'utilisateur n'est pas admin, afficher le contenu
  if (currentUser?.profile?.role !== "admin") {
    return children;
  }

  // ✅ Si l'abonnement est actif ou si on est sur une route exclue, afficher le contenu
  if (!showModal || isExcludedRoute) {
    return children;
  }

  // ✅ Afficher le modal de blocage
  return (
    <>
      {renderModal()}
      {/* Empêcher l'interaction avec le contenu derrière */}
      <div className="fixed inset-0 z-[9998]" style={{ pointerEvents: "none" }} />
    </>
  );
}