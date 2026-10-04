// /src/pages/SuperAdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import {
  Building2, Users, CreditCard, DollarSign, TrendingUp,
  TrendingDown, Calendar, Clock, CheckCircle, XCircle,
  AlertCircle, RefreshCw, Eye, ArrowUp, ArrowDown,
  BarChart3, PieChart, Activity, Zap, Crown, Shield,
  Mail, Phone, Globe, UserPlus, UserMinus, Award
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart as RePieChart,
  Pie, Cell, BarChart, Bar, AreaChart, Area
} from "recharts";

const COLORS = ['#ec4899', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    inactiveTenants: 0,
    expiredTenants: 0,
    pendingTenants: 0,
    totalAdmins: 0,
    totalEmployees: 0,
    totalClients: 0,
    totalUsers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    revenueGrowth: 0,
    tenantGrowth: 0,
    appointmentGrowth: 0
  });
  const [revenueChart, setRevenueChart] = useState([]);
  const [tenantDistribution, setTenantDistribution] = useState([]);
  const [planDistribution, setPlanDistribution] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [topTenants, setTopTenants] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Récupérer tous les tenants
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('*');

      if (tenantsError) throw tenantsError;

      // 2. Récupérer les profils utilisateurs
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('role, tenant_id');

      if (profilesError) throw profilesError;

      // 3. Récupérer les rendez-vous
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('status, created_at, total_price, tenant_id');

      if (appointmentsError) throw appointmentsError;

      // 4. Récupérer les abonnements (pour les revenus)
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('status, plan, amount, tenant_id, start_date, end_date, created_at');

      if (subscriptionsError) throw subscriptionsError;

      // 5. Récupérer les transactions (pour les revenus complémentaires)
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('amount, transaction_date, status, tenant_id');

      if (transactionsError) throw transactionsError;

      // ========== CALCUL DES STATISTIQUES ==========

      // Statistiques des salons
      const totalTenants = tenants?.length || 0;
      const activeTenants = tenants?.filter(t => t.subscription_status === 'active').length || 0;
      const inactiveTenants = tenants?.filter(t => t.subscription_status === 'inactive').length || 0;
      const expiredTenants = tenants?.filter(t => t.subscription_status === 'expired').length || 0;
      const pendingTenants = tenants?.filter(t => t.subscription_status === 'pending').length || 0;

      // Statistiques des utilisateurs
      const totalAdmins = profiles?.filter(p => p.role === 'admin').length || 0;
      const totalEmployees = profiles?.filter(p => p.role === 'employee').length || 0;
      const totalClients = profiles?.filter(p => p.role === 'client').length || 0;
      const totalUsers = profiles?.length || 0;

      // Statistiques des rendez-vous
      const totalAppointments = appointments?.length || 0;
      const pendingAppointments = appointments?.filter(a => a.status === 'pending').length || 0;
      const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0;
      const cancelledAppointments = appointments?.filter(a => a.status === 'cancelled').length || 0;

      // ✅ REVENUS À PARTIR DES ABONNEMENTS DES SALONS
      // Calculer les revenus totaux à partir des abonnements actifs
      const activeSubscriptions = subscriptions?.filter(s => s.status === 'active') || [];
      const totalRevenue = activeSubscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);

      // Revenus du mois à partir des abonnements actifs
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Filtrer les abonnements actifs du mois en cours
      const monthlySubscriptions = activeSubscriptions.filter(s => {
        if (!s.start_date) return false;
        const startDate = new Date(s.start_date);
        return startDate >= firstDayOfMonth;
      });
      const monthlyRevenue = monthlySubscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);

      // Croissance des revenus (mois précédent vs mois en cours)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      
      const lastMonthSubscriptions = activeSubscriptions.filter(s => {
        if (!s.start_date) return false;
        const startDate = new Date(s.start_date);
        return startDate >= lastMonth && startDate <= lastMonthEnd;
      });
      const lastMonthRevenue = lastMonthSubscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);
      const revenueGrowth = lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

      // Croissance des salons
      const lastMonthTenants = tenants?.filter(t => {
        const date = new Date(t.created_at);
        return date >= lastMonth && date < firstDayOfMonth;
      }).length || 0;
      const tenantGrowth = lastMonthTenants > 0 ? ((activeTenants - lastMonthTenants) / lastMonthTenants) * 100 : 0;

      // ========== GRAPHIQUES ==========

      // ✅ Évolution des revenus par mois (12 derniers mois) à partir des abonnements
      const revenueByMonth = [];
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = monthDate.toLocaleString('fr-FR', { month: 'short' });
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        
        // Filtrer les abonnements actifs de ce mois
        const monthSubscriptions = activeSubscriptions.filter(s => {
          if (!s.start_date) return false;
          const startDate = new Date(s.start_date);
          return startDate >= monthStart && startDate <= monthEnd;
        });
        
        const monthRevenue = monthSubscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);
        revenueByMonth.push({ month: monthName, revenue: monthRevenue });
      }
      setRevenueChart(revenueByMonth);

      // Distribution des salons par statut
      setTenantDistribution([
        { name: 'Actifs', value: activeTenants, color: '#10b981' },
        { name: 'Inactifs', value: inactiveTenants, color: '#ef4444' },
        { name: 'Expirés', value: expiredTenants, color: '#f59e0b' },
        { name: 'En attente', value: pendingTenants, color: '#06b6d4' }
      ]);

      // Distribution des plans d'abonnement
      const planCount = {};
      subscriptions?.forEach(s => {
        const plan = s.plan || 'starter';
        planCount[plan] = (planCount[plan] || 0) + 1;
      });
      
      // Si pas d'abonnements, utiliser les tenants
      if (Object.keys(planCount).length === 0) {
        tenants?.forEach(t => {
          const plan = t.subscription_plan || 'starter';
          planCount[plan] = (planCount[plan] || 0) + 1;
        });
      }
      
      setPlanDistribution(Object.entries(planCount).map(([name, value]) => ({ 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        value 
      })));

      // ✅ Top 5 salons par revenus d'abonnements
      const tenantRevenue = {};
      activeSubscriptions.forEach(s => {
        if (s.tenant_id) {
          tenantRevenue[s.tenant_id] = (tenantRevenue[s.tenant_id] || 0) + (s.amount || 0);
        }
      });
      
      const sortedTenants = Object.entries(tenantRevenue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tenantId, revenue]) => {
          const tenant = tenants?.find(t => t.id === tenantId);
          return { ...tenant, revenue };
        });
      setTopTenants(sortedTenants);

      // Activité récente (derniers salons créés)
      const recent = tenants?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5) || [];
      setRecentActivity(recent);

      // Mettre à jour les stats
      setStats({
        totalTenants,
        activeTenants,
        inactiveTenants,
        expiredTenants,
        pendingTenants,
        totalAdmins,
        totalEmployees,
        totalClients,
        totalUsers,
        totalRevenue,
        monthlyRevenue,
        totalAppointments,
        pendingAppointments,
        completedAppointments,
        cancelledAppointments,
        revenueGrowth,
        tenantGrowth,
        appointmentGrowth: 0
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Tableau de bord
          </h1>
          <p className="text-muted-foreground mt-1">
            Vue d'ensemble de la plateforme BeautyFlow
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDashboardData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
          <Button asChild className="gap-2">
            <Link to="/super-admin/reports">
              <BarChart3 className="h-4 w-4" />
              Rapports
            </Link>
          </Button>
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Salons</p>
                <p className="text-3xl font-bold">{stats.totalTenants}</p>
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    {stats.activeTenants} actifs
                  </Badge>
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                    {stats.pendingTenants} en attente
                  </Badge>
                  <Badge className="bg-red-100 text-red-800 text-xs">
                    {stats.inactiveTenants} inactifs
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilisateurs</p>
                <p className="text-3xl font-bold">{stats.totalUsers}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>👑 {stats.totalAdmins} admins</span>
                  <span>👤 {stats.totalClients} clients</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenus des abonnements</p>
                <p className="text-3xl font-bold text-green-600">
                  {Math.round(stats.totalRevenue).toLocaleString()} FCFA
                </p>
                <div className="flex items-center gap-1 mt-1 text-xs">
                  {stats.revenueGrowth > 0 ? (
                    <span className="text-green-600 flex items-center">
                      <ArrowUp className="h-3 w-3" /> +{stats.revenueGrowth.toFixed(1)}%
                    </span>
                  ) : stats.revenueGrowth < 0 ? (
                    <span className="text-red-600 flex items-center">
                      <ArrowDown className="h-3 w-3" /> {stats.revenueGrowth.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Stable</span>
                  )}
                  <span className="text-muted-foreground">vs mois dernier</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.monthlyRevenue.toLocaleString()} FCFA ce mois-ci
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rendez-vous</p>
                <p className="text-3xl font-bold">{stats.totalAppointments}</p>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {stats.pendingAppointments} en attente
                  </Badge>
                  <Badge className="bg-green-100 text-green-800">
                    {stats.completedAppointments} terminés
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Évolution des revenus des abonnements
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value) => `${Math.round(value).toLocaleString()} FCFA`} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#ec4899" 
                  fill="#ec4899" 
                  fillOpacity={0.1}
                  strokeWidth={2} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
 {/* Distribution des salons - Version améliorée */}
  <Card className="border-none shadow-md">
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <PieChart className="h-4 w-4 text-primary" />
        Distribution des salons
      </CardTitle>
    </CardHeader>
    <CardContent className="h-80">
      {tenantDistribution.length > 0 && tenantDistribution.some(item => item.value > 0) ? (
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Pie
              data={tenantDistribution}
              cx="50%"
              cy="45%"
              labelLine={true}
              label={({ name, percent }) => {
                if (percent * 100 < 5) return '';
                return `${name} ${(percent * 100).toFixed(0)}%`;
              }}
              outerRadius={90}
              innerRadius={40}
              paddingAngle={2}
              dataKey="value"
            >
              {tenantDistribution.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke="#fff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name, props) => {
                const total = tenantDistribution.reduce((sum, item) => sum + item.value, 0);
                const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return [`${value} salon(s) (${percent}%)`, props.payload.name];
              }}
            />
            <Legend 
              layout="horizontal" 
              verticalAlign="bottom" 
              align="center"
              wrapperStyle={{
                paddingTop: '10px',
                fontSize: '12px'
              }}
            />
          </RePieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>Aucune donnée de distribution disponible</p>
        </div>
      )}
    </CardContent>
  </Card>
</div>
    

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              Distribution des plans d'abonnement
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Top 5 salons par revenus d'abonnements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topTenants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Aucune donnée disponible</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topTenants.map((tenant, index) => (
                  <div key={tenant?.id || index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{tenant?.name || 'Salon'}</p>
                      <p className="text-xs text-muted-foreground">
                        {tenant?.subscription_plan || 'Starter'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {Math.round(tenant?.revenue || 0).toLocaleString()} FCFA
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activité récente */}
      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Activité récente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Aucune activité récente</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentActivity.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Nouveau salon • {new Date(tenant.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge className={tenant.subscription_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {tenant.subscription_status === 'active' ? 'Actif' : 'En attente'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}