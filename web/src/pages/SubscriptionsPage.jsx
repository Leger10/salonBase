import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionAuth } from '@/contexts/SubscriptionAuthContext';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  Clock,
  Download,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SubscriptionsPage() {
  const { currentUser, isAuthenticated } = useAuth();
  const { subscriptions, refreshSubscriptions, hasValidSubscription, polling } = useSubscriptionAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [tenantDetails, setTenantDetails] = useState(null);

  useEffect(() => {
    if (isAuthenticated && currentUser?.profile?.tenant_id) {
      fetchSubscriptionDetails();
    }
  }, [isAuthenticated, currentUser]);

  const fetchSubscriptionDetails = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser.profile.tenant_id;

      // Récupérer les détails du tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (tenantError) throw tenantError;
      setTenantDetails(tenant);

      // Récupérer l'historique des transactions d'abonnement
      const { data: transactions, error: transactionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      setInvoices(transactions || []);
      
      // Rafraîchir les abonnements
      await refreshSubscriptions();
      
    } catch (error) {
      console.error('Error fetching subscription details:', error);
      toast.error('Erreur lors du chargement des détails');
    } finally {
      setLoading(false);
    }
  };

  const getPlanName = (plan) => {
    const plans = {
      starter: 'Starter',
      pro: 'Pro',
      premium: 'Premium'
    };
    return plans[plan] || plan;
  };

  const getPlanPrice = (plan) => {
    const prices = {
      starter: 29.99,
      pro: 99.99,
      premium: 199.99
    };
    return prices[plan] || 0;
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading || polling) {
    return (
      <>
        <Header />
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const daysRemaining = tenantDetails?.subscription_end 
    ? getDaysRemaining(tenantDetails.subscription_end) 
    : 0;
  
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7;

  return (
    <>
      <Header />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Mon abonnement
          </h1>
          <p className="mt-2 text-muted-foreground">
            Gérez votre plan et vos factures
          </p>
        </div>

        {/* Statut de l'abonnement */}
        <Card className="mb-8 border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Abonnement actuel</span>
              {hasValidSubscription ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Actif
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Inactif
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tenantDetails ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-3xl font-bold text-primary">
                      {getPlanName(tenantDetails.subscription_plan)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getPlanPrice(tenantDetails.subscription_plan)} € / mois
                    </p>
                  </div>
                  {!hasValidSubscription && (
                    <Button asChild>
                      <Link to="/plans">Souscrire ou renouveler</Link>
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Début de l'abonnement</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(tenantDetails.subscription_start)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Fin de l'abonnement</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(tenantDetails.subscription_end)}
                      </p>
                    </div>
                  </div>
                </div>

                {hasValidSubscription && (
                  <div className={`p-4 rounded-lg ${isExpiringSoon ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                    <div className="flex items-center gap-3">
                      {isExpiringSoon ? (
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      )}
                      <div>
                        <p className="font-medium">
                          {isExpiringSoon 
                            ? `Votre abonnement expire dans ${daysRemaining} jour(s)` 
                            : `Votre abonnement est actif pour ${daysRemaining} jours`}
                        </p>
                        {isExpiringSoon && (
                          <Button variant="link" className="p-0 h-auto text-sm" asChild>
                            <Link to="/plans">Renouveler maintenant →</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucun abonnement actif</p>
                <Button asChild className="mt-4">
                  <Link to="/plans">Choisir un plan</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historique des factures */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Historique des factures
            </CardTitle>
            <CardDescription>
              Consultez l'historique de vos paiements
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucune facture disponible</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="font-medium">
                        Facture du {formatDate(invoice.created_at)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Plan {getPlanName(invoice.plan)} - {invoice.duration}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 mt-2 sm:mt-0">
                      <p className="font-semibold text-primary">
                        {invoice.amount.toLocaleString()} €
                      </p>
                      <Badge variant={invoice.status === 'completed' ? 'default' : 'secondary'}>
                        {invoice.status === 'completed' ? 'Payée' : 'En attente'}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section d'aide */}
        <Card className="mt-8 bg-muted/30 border-none">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Besoin d'aide avec votre abonnement ?
              </p>
              <Button variant="link" asChild className="mt-2">
                <a href="/contact">Contacter le support</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </>
  );
}