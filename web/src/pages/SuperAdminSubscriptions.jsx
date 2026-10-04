// /src/pages/SuperAdminSubscriptions.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";
import { 
  DollarSign, TrendingUp, AlertCircle, Calendar, RefreshCw, 
  Plus, Eye, Edit, Crown, Users, Building2, CreditCard,
  CheckCircle, XCircle, Clock, ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

export default function SuperAdminSubscriptions() {
  const [stats, setStats] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Récupérer tous les abonnements avec les infos des salons
      const { data: subs, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          tenants:tenant_id (
            id,
            name,
            email,
            subscription_status,
            subscription_plan
          )
        `)
        .order('created_at', { ascending: false });

      if (subsError) throw subsError;
      setSubscriptions(subs || []);

      // 2. Calculer les statistiques à partir des abonnements
      const activeSubs = subs?.filter(s => s.status === 'active') || [];
      const expiredSubs = subs?.filter(s => s.status === 'expired' || s.status === 'cancelled') || [];
      const trialSubs = subs?.filter(s => s.status === 'trial') || [];
      const pendingSubs = subs?.filter(s => s.status === 'pending') || [];
      
      // ✅ Calculer les revenus totaux à partir des montants des abonnements actifs
      const totalRevenue = activeSubs.reduce((sum, s) => sum + (s.amount || 0), 0);

      // ✅ Revenus par mois à partir des dates de création des abonnements
      const revenueByMonth = {};
      subs?.forEach(s => {
        if (s.created_at && s.amount) {
          const month = new Date(s.created_at).toLocaleString('fr-FR', { month: 'short', year: 'numeric' });
          revenueByMonth[month] = (revenueByMonth[month] || 0) + s.amount;
        }
      });

      const chartData = Object.entries(revenueByMonth || {})
        .map(([month, revenue]) => ({ month, revenue }))
        .sort((a, b) => {
          const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
          const aMonth = a.month.split(' ')[0];
          const bMonth = b.month.split(' ')[0];
          return months.indexOf(aMonth) - months.indexOf(bMonth);
        });

      // ✅ Répartition des plans
      const planDistribution = subs?.reduce((acc, s) => {
        const plan = s.plan || 'starter';
        acc[plan] = (acc[plan] || 0) + 1;
        return acc;
      }, {});

      const pieData = Object.entries(planDistribution || {}).map(([name, value]) => ({ 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        value 
      }));

      setStats({
        totalRevenue,
        activeSubscriptions: activeSubs.length,
        expiredSubscriptions: expiredSubs.length,
        trialSubscriptions: trialSubs.length,
        pendingSubscriptions: pendingSubs.length,
        totalSubscriptions: subs?.length || 0,
        revenueByMonth: chartData,
        planDistribution: pieData
      });

    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async (subscriptionId) => {
    try {
      const newEndDate = new Date();
      newEndDate.setMonth(newEndDate.getMonth() + 1);

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          end_date: newEndDate.toISOString().split('T')[0]
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast.success("Abonnement renouvelé avec succès");
      fetchData();
    } catch (error) {
      console.error('Error renewing subscription:', error);
      toast.error("Échec du renouvellement");
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

  const getFilteredSubscriptions = () => {
    if (activeTab === 'active') {
      return subscriptions.filter(s => s.status === 'active' || s.status === 'trial');
    }
    if (activeTab === 'expired') {
      return subscriptions.filter(s => s.status === 'expired' || s.status === 'cancelled');
    }
    if (activeTab === 'pending') {
      return subscriptions.filter(s => s.status === 'pending');
    }
    return subscriptions;
  };

  const filteredSubs = getFilteredSubscriptions();
  const COLORS = ['#ec4899', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981'];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Abonnements</h1>
          <p className="text-muted-foreground mt-1">
            {stats?.totalSubscriptions || 0} abonnements sur la plateforme
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="default">
            <Link to="/super-admin/subscriptions/plans">
              <Plus className="h-4 w-4 mr-2" />
              Gérer les plans
            </Link>
          </Button>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenus totaux</p>
                <p className="text-2xl font-bold">{Math.round(stats?.totalRevenue || 0).toLocaleString()} FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Abonnements actifs</p>
                <p className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold">{stats?.pendingSubscriptions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expirés / Annulés</p>
                <p className="text-2xl font-bold">{stats?.expiredSubscriptions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Évolution des revenus</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {stats?.revenueByMonth?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value) => `${Math.round(value).toLocaleString()} FCFA`} />
                  <Line type="monotone" dataKey="revenue" stroke="#ec4899" strokeWidth={2} name="Revenus" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Aucune donnée de revenus disponible</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Répartition des plans</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {stats?.planDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.planDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {stats.planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Aucune donnée de plans disponible</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Liste des abonnements */}
      <Card className="border-none shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tous les abonnements</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant={activeTab === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveTab('all')}
              >
                Tous ({subscriptions.length})
              </Button>
              <Button 
                variant={activeTab === 'active' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveTab('active')}
                className="gap-1"
              >
                <CheckCircle className="h-3 w-3" />
                Actifs
              </Button>
              <Button 
                variant={activeTab === 'pending' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveTab('pending')}
                className="gap-1"
              >
                <Clock className="h-3 w-3" />
                En attente
              </Button>
              <Button 
                variant={activeTab === 'expired' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setActiveTab('expired')}
                className="gap-1"
              >
                <XCircle className="h-3 w-3" />
                Expirés
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Salon</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Montant</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Période</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-muted-foreground">
                      Aucun abonnement trouvé
                    </td>
                  </tr>
                ) : (
                  filteredSubs.map((sub) => {
                    const status = getStatusBadge(sub.status);
                    const daysRemaining = sub.end_date ? 
                      Math.ceil((new Date(sub.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

                    return (
                      <tr key={sub.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-medium">{sub.tenants?.name || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{sub.tenants?.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="outline" className="capitalize">
                            {sub.plan || 'Standard'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 font-medium">
                          {sub.amount?.toLocaleString()} FCFA
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={status.className}>
                            {status.label}
                          </Badge>
                          {sub.status === 'active' && daysRemaining > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({daysRemaining}j)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <div>Début: {new Date(sub.start_date).toLocaleDateString()}</div>
                          <div className="text-muted-foreground">
                            Fin: {sub.end_date ? new Date(sub.end_date).toLocaleDateString() : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            {sub.status === 'expired' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleRenew(sub.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Renouveler
                              </Button>
                            )}
                            {sub.status === 'pending' && (
                              <Button 
                                variant="default" 
                                size="sm"
                                asChild
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Link to={`/super-admin/subscriptions/validation`}>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Valider
                                </Link>
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/super-admin/subscriptions/${sub.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}