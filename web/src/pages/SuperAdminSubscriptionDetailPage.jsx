// /src/pages/SuperAdminSubscriptionDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  ArrowLeft,
  CreditCard,
  Calendar,
  Building2,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Mail,
  Phone,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function SuperAdminSubscriptionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, [id]);

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          tenants:tenant_id (
            id,
            name,
            email,
            phone,
            subscription_status,
            subscription_plan,
            address,
            created_at
          ),
          validated_by:validated_by (
            id,
            full_name,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des détails');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!subscription) return;
    if (!confirm('Confirmez-vous la validation de cet abonnement ?')) return;

    setProcessing(true);
    try {
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          validated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', subscription.id);

      if (subError) throw subError;

      const { error: tenantError } = await supabase
        .from('tenants')
        .update({
          subscription_status: 'active'
        })
        .eq('id', subscription.tenant_id);

      if (tenantError) throw tenantError;

      toast.success('Abonnement validé avec succès !');
      fetchSubscription();
    } catch (error) {
      console.error('Error validating:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!subscription) return;
    if (!confirm('Confirmez-vous le rejet de cet abonnement ?')) return;

    setProcessing(true);
    try {
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled'
        })
        .eq('id', subscription.id);

      if (subError) throw subError;

      const { error: tenantError } = await supabase
        .from('tenants')
        .update({
          subscription_status: 'inactive'
        })
        .eq('id', subscription.tenant_id);

      if (tenantError) throw tenantError;

      toast.success('Abonnement rejeté');
      fetchSubscription();
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Erreur lors du rejet');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const statuses = {
      active: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Actif' },
      expired: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Expiré' },
      pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'En attente' },
      cancelled: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Annulé' },
      trial: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Essai' }
    };
    const info = statuses[status] || statuses.pending;
    const Icon = info.icon;
    return (
      <span className={`flex items-center gap-2 px-3 py-1 rounded-full ${info.bg} ${info.color}`}>
        <Icon className="w-4 h-4" />
        {info.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-32" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Abonnement non trouvé</h2>
        <p className="text-muted-foreground mb-6">
          L'abonnement que vous recherchez n'existe pas ou a été supprimé.
        </p>
        <Button onClick={() => navigate('/super-admin/subscriptions')}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  const isPending = subscription.status === 'pending';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/super-admin/subscriptions')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              Abonnement #{subscription.id.slice(0, 8)}
              {getStatusBadge(subscription.status)}
            </h1>
            <p className="text-muted-foreground text-sm">
              Salon: {subscription.tenants?.name || 'N/A'}
            </p>
          </div>
        </div>
        {isPending && (
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={handleValidate}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Valider
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing}
              className="gap-2"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Rejeter
            </Button>
          </div>
        )}
      </div>

      {/* Détails */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Détails de l'abonnement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="font-medium">{subscription.plan || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Montant</p>
                <p className="font-medium text-green-600">{subscription.amount?.toLocaleString()} FCFA</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Durée</p>
                <p className="font-medium">{subscription.duration || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Méthode de paiement</p>
                <p className="font-medium">{subscription.payment_method || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Période
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Date de début</p>
                <p className="font-medium">{new Date(subscription.start_date).toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date de fin</p>
                <p className="font-medium">{new Date(subscription.end_date).toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Créé le</p>
                <p className="font-medium">{new Date(subscription.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Renouvellement</p>
                <p className="font-medium">{subscription.auto_renew ? 'Automatique' : 'Manuel'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Informations du salon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nom</p>
                <p className="font-medium">{subscription.tenants?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{subscription.tenants?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Téléphone</p>
                <p className="font-medium">{subscription.tenants?.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statut du salon</p>
                <Badge className={subscription.tenants?.subscription_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  {subscription.tenants?.subscription_status || 'N/A'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {subscription.features && Object.keys(subscription.features).length > 0 && (
          <Card className="border-none shadow-sm md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Fonctionnalités incluses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(subscription.features).map(([key, value]) => (
                  <Badge key={key} variant="outline" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    {value}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {subscription.validated_by && (
          <Card className="border-none shadow-sm md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Validé par
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{subscription.validated_by?.full_name || 'N/A'}</p>
              <p className="text-sm text-muted-foreground">{subscription.validated_by?.email || ''}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}