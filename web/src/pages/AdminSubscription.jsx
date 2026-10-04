// /src/pages/AdminSubscription.jsx - Version avec plans optimisés pour le Burkina Faso
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext.jsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Progress } from "@/components/ui/progress.jsx";
import {
  Crown, Users, Scissors, Package, Check,
  Calendar, DollarSign, CreditCard, ArrowRight,
  Loader2, Sparkles, Clock, Zap, Star, Gem,
  AlertCircle, CheckCircle, XCircle, TrendingUp,
  HelpCircle, RefreshCw, Info, Headphones, Shield,
  Award, Rocket, Target, Gift, Flame, Heart,
  Coffee, Sun, Moon, Cloud, Smile, ThumbsUp
} from "lucide-react";
import { toast } from "sonner";

export default function AdminSubscription() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [durationFilter, setDurationFilter] = useState('all');
  const [annualDiscount, setAnnualDiscount] = useState(30);
  const [usageStats, setUsageStats] = useState({
    employees: 0,
    services: 0,
    products: 0,
    appointments: 0,
    clients: 0
  });
  const [showSpecialOffer, setShowSpecialOffer] = useState(true);

  // Plans optimisés pour le marché burkinabé
  const defaultPlans = [
    {
      id: 'petit_salon',
      name: 'Petit Salon',
      description: '💈 Parfait pour les salons individuels',
      price: 2500,
      duration_months: 1,
      max_employees: 1,
      max_services: 5,
      max_products: 5,
      features: [
        'Gestion des rendez-vous',
        'Carnet de clients',
        'Planning simple',
        'Notifications SMS',
        'Support de base'
      ],
      is_active: true,
      popularity: 70,
      badge: '⭐ Nouveau',
      icon: '💈',
      category: 'starter'
    },
    {
      id: 'petit_salon_3mois',
      name: 'Petit Salon - 3 mois',
      description: '💈 Offre trimestrielle - Économisez 10%',
      price: 6750,
      duration_months: 3,
      max_employees: 1,
      max_services: 5,
      max_products: 5,
      features: [
        'Gestion des rendez-vous',
        'Carnet de clients',
        'Planning simple',
        'Notifications SMS',
        'Support de base'
      ],
      is_active: true,
      popularity: 65,
      badge: '📅 3 mois',
      icon: '💈',
      category: 'starter',
      discount: 10
    },
    {
      id: 'petit_salon_6mois',
      name: 'Petit Salon - 6 mois',
      description: '💈 Offre semestrielle - Économisez 20%',
      price: 12000,
      duration_months: 6,
      max_employees: 1,
      max_services: 5,
      max_products: 5,
      features: [
        'Gestion des rendez-vous',
        'Carnet de clients',
        'Planning simple',
        'Notifications SMS',
        'Support de base'
      ],
      is_active: true,
      popularity: 75,
      badge: '📅 6 mois',
      icon: '💈',
      category: 'starter',
      discount: 20
    },
    {
      id: 'petit_salon_12mois',
      name: 'Petit Salon - 1 an',
      description: '💈 Offre annuelle - Économisez 30% !',
      price: 21000,
      duration_months: 12,
      max_employees: 1,
      max_services: 5,
      max_products: 5,
      features: [
        'Gestion des rendez-vous',
        'Carnet de clients',
        'Planning simple',
        'Notifications SMS',
        'Support de base'
      ],
      is_active: true,
      popularity: 90,
      badge: '🏆 Meilleure offre',
      icon: '💈',
      category: 'starter',
      discount: 30
    },
    {
      id: 'salon_moyen',
      name: 'Salon Moyen',
      description: '✂️ Pour les salons avec 2-5 employés',
      price: 7500,
      duration_months: 1,
      max_employees: 5,
      max_services: 15,
      max_products: 20,
      features: [
        'Tout Petit Salon +',
        'Gestion d\'équipe',
        'Planning avancé',
        'Gestion des stocks',
        'Rapports mensuels',
        'Support prioritaire'
      ],
      is_active: true,
      popularity: 85,
      badge: '🔥 Populaire',
      icon: '✂️',
      category: 'growth'
    },
    {
      id: 'salon_moyen_3mois',
      name: 'Salon Moyen - 3 mois',
      description: '✂️ Offre trimestrielle - Économisez 10%',
      price: 20250,
      duration_months: 3,
      max_employees: 5,
      max_services: 15,
      max_products: 20,
      features: [
        'Tout Petit Salon +',
        'Gestion d\'équipe',
        'Planning avancé',
        'Gestion des stocks',
        'Rapports mensuels',
        'Support prioritaire'
      ],
      is_active: true,
      popularity: 80,
      badge: '📅 3 mois',
      icon: '✂️',
      category: 'growth',
      discount: 10
    },
    {
      id: 'salon_moyen_6mois',
      name: 'Salon Moyen - 6 mois',
      description: '✂️ Offre semestrielle - Économisez 20%',
      price: 36000,
      duration_months: 6,
      max_employees: 5,
      max_services: 15,
      max_products: 20,
      features: [
        'Tout Petit Salon +',
        'Gestion d\'équipe',
        'Planning avancé',
        'Gestion des stocks',
        'Rapports mensuels',
        'Support prioritaire'
      ],
      is_active: true,
      popularity: 88,
      badge: '📅 6 mois',
      icon: '✂️',
      category: 'growth',
      discount: 20
    },
    {
      id: 'salon_moyen_12mois',
      name: 'Salon Moyen - 1 an',
      description: '✂️ Offre annuelle - Économisez 30% !',
      price: 63000,
      duration_months: 12,
      max_employees: 5,
      max_services: 15,
      max_products: 20,
      features: [
        'Tout Petit Salon +',
        'Gestion d\'équipe',
        'Planning avancé',
        'Gestion des stocks',
        'Rapports mensuels',
        'Support prioritaire'
      ],
      is_active: true,
      popularity: 95,
      badge: '🏆 Offre exceptionnelle',
      icon: '✂️',
      category: 'growth',
      discount: 30
    },
    {
      id: 'grand_salon',
      name: 'Grand Salon',
      description: '💇‍♂️ Pour les grands salons et centres de beauté',
      price: 15000,
      duration_months: 1,
      max_employees: 20,
      max_services: 50,
      max_products: 100,
      features: [
        'Tout Salon Moyen +',
        'Gestion multi-sites',
        'CRM avancé',
        'Programme fidélité',
        'Réservation en ligne 24/7',
        'API personnalisée',
        'Tableaux de bord avancés'
      ],
      is_active: true,
      popularity: 92,
      badge: '💎 Premium',
      icon: '💇‍♂️',
      category: 'premium'
    },
    {
      id: 'grand_salon_3mois',
      name: 'Grand Salon - 3 mois',
      description: '💇‍♂️ Offre trimestrielle - Économisez 10%',
      price: 40500,
      duration_months: 3,
      max_employees: 20,
      max_services: 50,
      max_products: 100,
      features: [
        'Tout Salon Moyen +',
        'Gestion multi-sites',
        'CRM avancé',
        'Programme fidélité',
        'Réservation en ligne 24/7',
        'API personnalisée',
        'Tableaux de bord avancés'
      ],
      is_active: true,
      popularity: 87,
      badge: '📅 3 mois',
      icon: '💇‍♂️',
      category: 'premium',
      discount: 10
    },
    {
      id: 'grand_salon_6mois',
      name: 'Grand Salon - 6 mois',
      description: '💇‍♂️ Offre semestrielle - Économisez 20%',
      price: 72000,
      duration_months: 6,
      max_employees: 20,
      max_services: 50,
      max_products: 100,
      features: [
        'Tout Salon Moyen +',
        'Gestion multi-sites',
        'CRM avancé',
        'Programme fidélité',
        'Réservation en ligne 24/7',
        'API personnalisée',
        'Tableaux de bord avancés'
      ],
      is_active: true,
      popularity: 90,
      badge: '📅 6 mois',
      icon: '💇‍♂️',
      category: 'premium',
      discount: 20
    },
    {
      id: 'grand_salon_12mois',
      name: 'Grand Salon - 1 an',
      description: '💇‍♂️ Offre annuelle - Économisez 30% !',
      price: 126000,
      duration_months: 12,
      max_employees: 20,
      max_services: 50,
      max_products: 100,
      features: [
        'Tout Salon Moyen +',
        'Gestion multi-sites',
        'CRM avancé',
        'Programme fidélité',
        'Réservation en ligne 24/7',
        'API personnalisée',
        'Tableaux de bord avancés'
      ],
      is_active: true,
      popularity: 96,
      badge: '🏆 Offre exceptionnelle',
      icon: '💇‍♂️',
      category: 'premium',
      discount: 30
    },
    {
      id: 'salon_plus',
      name: 'Salon Plus',
      description: '👑 Pour les grands groupes et enseignes',
      price: 30000,
      duration_months: 1,
      max_employees: 50,
      max_services: 100,
      max_products: 200,
      features: [
        'Tout Grand Salon +',
        'Gestion multi-enseignes',
        'Analyses prédictives',
        'Support dédié 24/7',
        'Formation incluse',
        'Migration gratuite',
        'Compte manager dédié'
      ],
      is_active: true,
      popularity: 88,
      badge: '👑 Elite',
      icon: '👑',
      category: 'enterprise'
    },
    {
      id: 'salon_plus_3mois',
      name: 'Salon Plus - 3 mois',
      description: '👑 Offre trimestrielle - Économisez 10%',
      price: 81000,
      duration_months: 3,
      max_employees: 50,
      max_services: 100,
      max_products: 200,
      features: [
        'Tout Grand Salon +',
        'Gestion multi-enseignes',
        'Analyses prédictives',
        'Support dédié 24/7',
        'Formation incluse',
        'Migration gratuite',
        'Compte manager dédié'
      ],
      is_active: true,
      popularity: 82,
      badge: '📅 3 mois',
      icon: '👑',
      category: 'enterprise',
      discount: 10
    },
    {
      id: 'salon_plus_6mois',
      name: 'Salon Plus - 6 mois',
      description: '👑 Offre semestrielle - Économisez 20%',
      price: 144000,
      duration_months: 6,
      max_employees: 50,
      max_services: 100,
      max_products: 200,
      features: [
        'Tout Grand Salon +',
        'Gestion multi-enseignes',
        'Analyses prédictives',
        'Support dédié 24/7',
        'Formation incluse',
        'Migration gratuite',
        'Compte manager dédié'
      ],
      is_active: true,
      popularity: 86,
      badge: '📅 6 mois',
      icon: '👑',
      category: 'enterprise',
      discount: 20
    },
    {
      id: 'salon_plus_12mois',
      name: 'Salon Plus - 1 an',
      description: '👑 Offre annuelle - Économisez 30% !',
      price: 252000,
      duration_months: 12,
      max_employees: 50,
      max_services: 100,
      max_products: 200,
      features: [
        'Tout Grand Salon +',
        'Gestion multi-enseignes',
        'Analyses prédictives',
        'Support dédié 24/7',
        'Formation incluse',
        'Migration gratuite',
        'Compte manager dédié'
      ],
      is_active: true,
      popularity: 94,
      badge: '🏆 Offre exceptionnelle',
      icon: '👑',
      category: 'enterprise',
      discount: 30
    }
  ];

  useEffect(() => {
    if (currentUser?.profile?.tenant_id) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;

      if (!tenantId) {
        toast.error("Salon non trouvé");
        setLoading(false);
        return;
      }

      // 1. Récupérer les informations du salon
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .maybeSingle();

      if (tenantError) throw tenantError;

      // 2. Récupérer l'abonnement actuel
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError && subError.code !== 'PGRST116') throw subError;
      setCurrentSubscription(subData || null);

      // 3. Essayer de récupérer les plans depuis la DB, sinon utiliser les defaults
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (plansError || !plansData || plansData.length === 0) {
        // Utiliser les plans par défaut optimisés
        setPlans(defaultPlans);
      } else {
        setPlans(plansData);
      }

      // 4. Récupérer les statistiques d'utilisation
      await fetchUsageStats(tenantId);

    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast.error('Erreur lors du chargement des données');
      setPlans(defaultPlans);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageStats = async (tenantId) => {
    try {
      const { count: employeesCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_active', true);
      setUsageStats(prev => ({ ...prev, employees: employeesCount || 0 }));

      const { count: servicesCount } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_active', true);
      setUsageStats(prev => ({ ...prev, services: servicesCount || 0 }));

      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      setUsageStats(prev => ({ ...prev, products: productsCount || 0 }));

      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      setUsageStats(prev => ({ ...prev, clients: clientsCount || 0 }));

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: appointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', thirtyDaysAgo.toISOString());
      setUsageStats(prev => ({ ...prev, appointments: appointmentsCount || 0 }));

    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };

  const handleSubscribe = async (plan, duration = 1) => {
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
      
      // Appliquer la réduction annuelle
      let finalPrice = plan.price;
      let discount = plan.discount || 0;
      
      if (duration === 12) {
        discount = Math.max(discount, 30);
        finalPrice = finalPrice * (1 - discount / 100);
      } else if (duration === 6) {
        discount = Math.max(discount, 20);
        finalPrice = finalPrice * (1 - discount / 100);
      } else if (duration === 3) {
        discount = Math.max(discount, 10);
        finalPrice = finalPrice * (1 - discount / 100);
      }
      
      endDate.setMonth(endDate.getMonth() + duration);

      // Créer l'abonnement
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          tenant_id: tenantId,
          plan: `${plan.name}`,
          duration: `${duration} mois`,
          amount: Math.round(finalPrice),
          original_amount: plan.price,
          discount_percentage: discount,
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

      // Mettre à jour le tenant
      await supabase
        .from('tenants')
        .update({
          subscription_status: 'pending',
          subscription_plan: `${plan.name}`,
          subscription_start: startDate.toISOString().split('T')[0],
          subscription_end: endDate.toISOString().split('T')[0]
        })
        .eq('id', tenantId);

      toast.success(`Demande d'abonnement "${plan.name}" envoyée avec succès !`);
      
      navigate('/admin/subscription/success');

    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error(error.message || 'Erreur lors de la souscription');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      active: { label: 'Actif', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      trial: { label: 'Essai', className: 'bg-blue-100 text-blue-800', icon: Sparkles },
      pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      expired: { label: 'Expiré', className: 'bg-red-100 text-red-800', icon: XCircle },
      cancelled: { label: 'Annulé', className: 'bg-gray-100 text-gray-800', icon: XCircle }
    };
    return statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800', icon: Info };
  };

  const daysRemaining = currentSubscription?.end_date ? 
    Math.ceil((new Date(currentSubscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
  const isSubscribed = currentSubscription && ['active', 'trial'].includes(currentSubscription.status);
  const statusInfo = currentSubscription ? getStatusBadge(currentSubscription.status) : null;
  const StatusIcon = statusInfo?.icon || Info;

  // Filtrer les plans selon la durée
  const filteredPlans = durationFilter === 'all' 
    ? plans 
    : plans.filter(p => p.duration_months === parseInt(durationFilter));

  // Plan le plus populaire
  const popularPlan = plans.length > 0 ? plans.reduce((a, b) => 
    (a.popularity || 0) > (b.popularity || 0) ? a : b
  ) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header avec offre spéciale Burkina Faso */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="h-8 w-8 text-primary" />
            Abonnements
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Des plans adaptés aux petits et grands salons du Burkina Faso
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
          {currentSubscription && (
            <Badge className={`${statusInfo?.className} text-lg py-2 px-4 gap-2`}>
              <StatusIcon className="h-4 w-4" />
              {statusInfo?.label}
            </Badge>
          )}
        </div>
      </div>

      {/* Bannière d'offre spéciale Burkina Faso */}
      {showSpecialOffer && (
        <div className="bg-gradient-to-r from-green-600 via-yellow-500 to-red-500 rounded-xl p-6 text-white shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-full animate-pulse">
                <Heart className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  🇧🇫 Offre Spéciale Burkina Faso
                  <Badge className="bg-white text-red-600">-30%</Badge>
                </h3>
                <p className="text-white/90">
                  Économisez 30% sur tous les plans annuels • 
                  <span className="font-bold ml-1">Soutenez l'économie locale !</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white px-4 py-2 text-sm font-bold backdrop-blur-sm">
                <Gift className="h-4 w-4 mr-1" />
                Offre limitée
              </Badge>
              <Button 
                variant="secondary" 
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white"
                onClick={() => setShowSpecialOffer(false)}
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Abonnement actuel */}
      {currentSubscription && (
        <Card className={`border-2 ${isSubscribed ? 'border-green-500/30' : 'border-red-500/30'} shadow-lg`}>
          <CardHeader className={`${isSubscribed ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
            <CardTitle className="flex items-center gap-2">
              <Crown className={`h-5 w-5 ${isSubscribed ? 'text-green-600' : 'text-red-600'}`} />
              {isSubscribed ? 'Votre abonnement actif' : 'Votre abonnement'}
            </CardTitle>
            <CardDescription>
              Plan {currentSubscription.plan}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-2xl font-bold">{currentSubscription.plan}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">
                    {currentSubscription.amount?.toLocaleString()} FCFA
                  </span>
                  {currentSubscription.discount_percentage > 0 && (
                    <Badge className="ml-2 bg-green-500 text-white">
                      -{currentSubscription.discount_percentage}%
                    </Badge>
                  )}
                </div>
                {isSubscribed && daysRemaining > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Jours restants</span>
                      <span className={`font-medium ${
                        daysRemaining > 30 ? 'text-green-600' : 
                        daysRemaining > 7 ? 'text-yellow-600' : 
                        'text-red-600'
                      }`}>
                        {daysRemaining} jours
                      </span>
                    </div>
                    <Progress value={(daysRemaining / 30) * 100} className="h-2 mt-1" />
                  </div>
                )}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Employés: {usageStats.employees} / {currentSubscription.max_employees || '∞'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Scissors className="h-4 w-4 text-primary" />
                    <span>Services: {usageStats.services} / {currentSubscription.max_services || '∞'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-primary" />
                    <span>Produits: {usageStats.products} / {currentSubscription.max_products || '∞'}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Début: {new Date(currentSubscription.start_date).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Fin: {new Date(currentSubscription.end_date).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Renouvellement: {currentSubscription.auto_renew ? 'Automatique' : 'Manuel'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Heart className="h-4 w-4" />
                  <span>🇧🇫 Fièrement au service des salons burkinabés</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans disponibles */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              {isSubscribed ? 'Changer de plan' : 'Choisissez votre plan'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {plans.length} plans disponibles • Paiement sécurisé • 🇧🇫 Offres spéciales
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">
              {popularPlan?.name} est le plus populaire
            </span>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <Button 
            variant={durationFilter === 'all' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setDurationFilter('all')}
            className="gap-2"
          >
            Tous
          </Button>
          <Button 
            variant={durationFilter === '1' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setDurationFilter('1')}
          >
            1 mois
          </Button>
          <Button 
            variant={durationFilter === '3' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setDurationFilter('3')}
            className="gap-1"
          >
            3 mois <span className="text-xs text-green-500">-10%</span>
          </Button>
          <Button 
            variant={durationFilter === '6' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setDurationFilter('6')}
            className="gap-1"
          >
            6 mois <span className="text-xs text-green-500">-20%</span>
          </Button>
          <Button 
            variant={durationFilter === '12' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setDurationFilter('12')}
            className="gap-1 bg-gradient-to-r from-green-600 to-yellow-500 text-white hover:from-green-700 hover:to-yellow-600"
          >
            🇧🇫 12 mois <span className="text-xs text-yellow-200">-30%</span>
          </Button>
        </div>

        {filteredPlans.length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun plan disponible pour cette durée</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map((plan, index) => {
              const isCurrentPlan = currentSubscription?.plan?.includes(plan.name);
              const isActive = currentSubscription?.status === 'active';
              const hasPending = currentSubscription?.status === 'pending';
              const isPopular = plan.id === popularPlan?.id;
              const isBestOffer = plan.duration_months === 12 && plan.discount >= 30;
              const isStarter = plan.category === 'starter';
              const isGrowth = plan.category === 'growth';
              const isPremium = plan.category === 'premium';
              const isEnterprise = plan.category === 'enterprise';
              
              // Calcul du prix annuel avec réduction
              const annualPrice = plan.price * 12 * 0.7;
              const monthlyPrice = plan.price;

              // Couleurs par catégorie
              const categoryColors = {
                starter: 'border-blue-200 bg-blue-50/30',
                growth: 'border-green-200 bg-green-50/30',
                premium: 'border-purple-200 bg-purple-50/30',
                enterprise: 'border-amber-200 bg-amber-50/30'
              };

              return (
                <Card 
                  key={plan.id} 
                  className={`border-2 transition-all hover:shadow-2xl ${
                    isCurrentPlan && isActive ? 'border-primary shadow-lg bg-primary/5' : 
                    isBestOffer ? 'border-green-500 shadow-lg bg-green-50/50' :
                    isPopular ? 'border-amber-400 shadow-lg' :
                    'border-transparent hover:border-primary/30'
                  } relative overflow-hidden`}
                >
                  {/* Badge spécial pour les offres */}
                  {isBestOffer && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-green-600 to-yellow-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-lg flex items-center gap-1">
                      <Flag className="h-3 w-3" />
                      🇧🇫 MEILLEURE OFFRE
                    </div>
                  )}
                  {isPopular && !isBestOffer && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-lg flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      POPULAIRE
                    </div>
                  )}
                  {isCurrentPlan && isActive && (
                    <div className="absolute top-0 left-0 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-br-lg flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      ACTUEL
                    </div>
                  )}
                  {hasPending && isCurrentPlan && (
                    <div className="absolute top-0 left-0 bg-yellow-500 text-white text-xs font-bold px-4 py-1.5 rounded-br-lg flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      EN ATTENTE
                    </div>
                  )}

                  <CardContent className="p-6 pt-8">
                    {/* Header du plan */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{plan.icon || '📋'}</span>
                          <h3 className="text-xl font-bold">{plan.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      </div>
                      {plan.badge && (
                        <Badge className={`${
                          isBestOffer ? 'bg-green-500 text-white' :
                          isPopular ? 'bg-amber-500 text-white' :
                          'bg-amber-100 text-amber-700 border-amber-200'
                        }`}>
                          {plan.badge}
                        </Badge>
                      )}
                    </div>

                    {/* Prix */}
                    <div className="mt-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{plan.price.toLocaleString()} FCFA</span>
                        <span className="text-sm text-muted-foreground">/ mois</span>
                      </div>
                      {plan.discount > 0 && (
                        <div className="text-sm text-green-600 mt-1">
                          Économisez {plan.discount}% avec cette offre
                        </div>
                      )}
                      
                      {/* Offre annuelle */}
                      {plan.duration_months === 1 && (
                        <div className="mt-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-green-700 flex items-center gap-1">
                                <Flag className="h-3 w-3" />
                                Offre annuelle
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-green-700">
                                  {Math.round(plan.price * 12 * 0.7).toLocaleString()} FCFA
                                </span>
                                <Badge className="bg-green-500 text-white text-xs">-30%</Badge>
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-green-300 text-green-700 hover:bg-green-50"
                              onClick={() => handleSubscribe(plan, 12)}
                              disabled={processing || (isCurrentPlan && isActive)}
                            >
                              <Gift className="h-3 w-3 mr-1" />
                              Choisir
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Caractéristiques */}
                    <div className="mt-4 space-y-2 text-sm">
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

                    {/* Features */}
                    {plan.features && plan.features.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        {plan.features.slice(0, 4).map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground py-0.5">
                            <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                        {plan.features.length > 4 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            +{plan.features.length - 4} autres fonctionnalités
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bouton d'action */}
                    <Button 
                      className={`w-full mt-6 gap-2 ${
                        isBestOffer ? 'bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white' :
                        isPopular && !isBestOffer ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white' :
                        ''
                      }`}
                      variant={isCurrentPlan && isActive ? 'outline' : 'default'}
                      disabled={
                        (isCurrentPlan && isActive) || 
                        processing || 
                        !plan.is_active ||
                        (currentSubscription?.status === 'pending')
                      }
                      onClick={() => handleSubscribe(plan, plan.duration_months || 1)}
                    >
                      {processing && selectedPlan?.id === plan.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Traitement...
                        </>
                      ) : isCurrentPlan && isActive ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Plan actif
                        </>
                      ) : currentSubscription?.status === 'pending' && isCurrentPlan ? (
                        <>
                          <Clock className="h-4 w-4" />
                          En attente
                        </>
                      ) : !plan.is_active ? (
                        'Indisponible'
                      ) : (
                        <>
                          <Rocket className="h-4 w-4" />
                          Souscrire maintenant
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>

                    {/* Engagement */}
                    <div className="text-center mt-3">
                      <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        🔒 Sans engagement • Résiliable à tout moment
                        {plan.duration_months === 12 && (
                          <Badge variant="outline" className="text-[10px] border-green-500 text-green-600 ml-1">
                            🇧🇫 Promo
                          </Badge>
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Section avantages Burkina Faso */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-green-50 via-yellow-50 to-red-50">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold flex items-center justify-center gap-2">
              <Flag className="h-6 w-6" />
              Pourquoi choisir nos plans ?
              <Flag className="h-6 w-6" />
            </h3>
            <p className="text-muted-foreground">
              Des solutions adaptées au marché burkinabé avec un rapport qualité-prix imbattable
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-green-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mx-auto">
                <ThumbsUp className="h-7 w-7 text-green-600" />
              </div>
              <p className="font-medium mt-2">Prix adaptés</p>
              <p className="text-sm text-muted-foreground">Des tarifs conçus pour le marché local</p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mx-auto">
                <Users className="h-7 w-7 text-yellow-600" />
              </div>
              <p className="font-medium mt-2">Support local</p>
              <p className="text-sm text-muted-foreground">Une équipe basée au Burkina Faso</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mx-auto">
                <Shield className="h-7 w-7 text-purple-600" />
              </div>
              <p className="font-medium mt-2">Paiement sécurisé</p>
              <p className="text-sm text-muted-foreground">Transactions 100% sécurisées</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 p-3 rounded-full w-14 h-14 flex items-center justify-center mx-auto">
                <Headphones className="h-7 w-7 text-blue-600" />
              </div>
              <p className="font-medium mt-2">Support 24/7</p>
              <p className="text-sm text-muted-foreground">Assistance en français et en anglais</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ / Support */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm bg-muted/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Besoin d'aide ?</h3>
                <p className="text-sm text-muted-foreground">
                  Contactez le support pour toute question concernant votre abonnement.
                </p>
                <Button variant="outline" className="mt-3 gap-2" asChild>
                  <Link to="/admin/support">
                    <Headphones className="h-4 w-4" />
                    Support
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-muted/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Info className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Ce que vous obtenez</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Support 24/7 inclus</li>
                  <li>• Mise à niveau à tout moment</li>
                  <li>• Pas de frais d'installation</li>
                  <li>• Annulation gratuite</li>
                  <li>• 🇧🇫 Fièrement made in Burkina Faso</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Composant Flag pour les icônes
const Flag = ({ className }) => (
  <svg 
    className={className}
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 10h20" />
    <path d="M2 14h20" />
    <path d="M8 4v16" />
    <path d="M16 4v16" />
  </svg>
);