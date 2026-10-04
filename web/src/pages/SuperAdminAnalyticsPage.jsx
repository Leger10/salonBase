// /src/pages/SuperAdminAnalyticsPage.jsx
import React, { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  TrendingUp,
  Users,
  Building2,
  DollarSign,
  Calendar,
  RefreshCw,
  BarChart3,
  AlertCircle,
  PieChart as PieChartIcon,
  Eye,
  ChevronDown,
  ChevronUp,
  Store,
  Phone,
  Mail,
  Clock,
  Award,
  Crown,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

const COLORS = ["#ec4899", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#14b8a6", "#f97316"];

export default function SuperAdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState("all");
  const [tenants, setTenants] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return format(now, "yyyy-MM");
  });
  
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalUsers: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    pendingTenants: 0,
  });
  
  const [chartData, setChartData] = useState({
    revenue: [],
    appointments: [],
    tenants: [],
    roles: [],
    tenantRevenue: [],
    monthlyAppointments: [],
    statusDistribution: [],
  });

  const [tenantDetails, setTenantDetails] = useState([]);
  const [expandedTenant, setExpandedTenant] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedTenant, selectedMonth]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("📊 Récupération des données analytics...");

      // 1. Récupérer tous les tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from("tenants")
        .select(`
          id, 
          name, 
          slug, 
          subscription_status, 
          subscription_plan,
          created_at,
          address,
          phone,
          email,
          logo_url,
          primary_color
        `)
        .order("created_at", { ascending: false });

      if (tenantsError) throw tenantsError;
      setTenants(tenantsData || []);
      
      const totalTenants = tenantsData?.length || 0;
      const activeTenants = tenantsData?.filter(t => t.subscription_status === "active").length || 0;
      const pendingTenants = tenantsData?.filter(t => t.subscription_status === "pending").length || 0;

      // 2. Récupérer les profils
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("role, is_active, tenant_id");

      if (profilesError) throw profilesError;

      // 3. Récupérer les rendez-vous
      let appointmentsQuery = supabase
        .from("appointments")
        .select("status, total_price, appointment_date, tenant_id");

      // Filtrer par tenant si sélectionné
      if (selectedTenant !== "all") {
        appointmentsQuery = appointmentsQuery.eq("tenant_id", selectedTenant);
      }

      const { data: appointments, error: appointmentsError } = await appointmentsQuery;

      if (appointmentsError) throw appointmentsError;

      // 4. Récupérer les abonnements
      let subscriptionsQuery = supabase
        .from("subscriptions")
        .select("amount, status, start_date, tenant_id");

      if (selectedTenant !== "all") {
        subscriptionsQuery = subscriptionsQuery.eq("tenant_id", selectedTenant);
      }

      const { data: subscriptions, error: subscriptionsError } = await subscriptionsQuery;

      if (subscriptionsError) throw subscriptionsError;

      // 5. Récupérer les transactions
      let transactionsQuery = supabase
        .from("transactions")
        .select("amount, status, created_at, tenant_id");

      if (selectedTenant !== "all") {
        transactionsQuery = transactionsQuery.eq("tenant_id", selectedTenant);
      }

      const { data: transactions, error: transactionsError } = await transactionsQuery;

      if (transactionsError) throw transactionsError;

      // Statistiques
      const totalUsers = profiles?.length || 0;
      const totalAppointments = appointments?.length || 0;

      // Revenus totaux (abonnements + transactions)
      const activeSubscriptions = subscriptions?.filter(s => s.status === "active") || [];
      const subscriptionRevenue = activeSubscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);
      
      const completedTransactions = transactions?.filter(t => t.status === "completed") || [];
      const transactionRevenue = completedTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const totalRevenue = subscriptionRevenue + transactionRevenue;

      setStats({
        totalTenants,
        activeTenants,
        totalUsers,
        totalAppointments,
        totalRevenue,
        pendingTenants,
      });

      // === DONNÉES POUR LES GRAPHIQUES ===

      // 1. Revenus par mois (abonnements + transactions)
      const revenueByMonth = {};
      
      activeSubscriptions.forEach((s) => {
        if (s.start_date) {
          const month = format(new Date(s.start_date), "MMM yyyy", { locale: fr });
          revenueByMonth[month] = (revenueByMonth[month] || 0) + (s.amount || 0);
        }
      });
      
      completedTransactions.forEach((t) => {
        if (t.created_at) {
          const month = format(new Date(t.created_at), "MMM yyyy", { locale: fr });
          revenueByMonth[month] = (revenueByMonth[month] || 0) + (t.amount || 0);
        }
      });

      const revenueData = Object.entries(revenueByMonth)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => {
          const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
          return months.indexOf(a.month.split(" ")[0]) - months.indexOf(b.month.split(" ")[0]);
        });

      // 2. Distribution des rôles
      const roleCount = {};
      profiles?.forEach((p) => {
        const role = p.role || "client";
        roleCount[role] = (roleCount[role] || 0) + 1;
      });
      const roleData = Object.entries(roleCount).map(([role, count]) => ({
        role: role === "super_admin" ? "Super Admin" : 
              role === "admin" ? "Admin Salon" : 
              role === "employee" ? "Employé" : "Client",
        count,
        key: role,
      }));

      // 3. Rendez-vous par statut
      const statusCount = {};
      appointments?.forEach((a) => {
        const status = a.status || "pending";
        statusCount[status] = (statusCount[status] || 0) + 1;
      });
      const statusData = Object.entries(statusCount).map(([status, count]) => ({
        status: status === "completed" ? "Terminé" :
                status === "confirmed" ? "Confirmé" :
                status === "pending" ? "En attente" :
                status === "cancelled" ? "Annulé" :
                status === "in_progress" ? "En cours" : status,
        count,
        key: status,
      }));

      // 4. Revenus par tenant
      const tenantRevenueMap = {};
      activeSubscriptions.forEach((s) => {
        const tenantId = s.tenant_id;
        const tenant = tenantsData?.find(t => t.id === tenantId);
        if (tenant) {
          tenantRevenueMap[tenantId] = {
            name: tenant.name || "Inconnu",
            revenue: (tenantRevenueMap[tenantId]?.revenue || 0) + (s.amount || 0),
            plan: tenant.subscription_plan || "standard",
            status: tenant.subscription_status,
          };
        }
      });
      
      completedTransactions.forEach((t) => {
        const tenantId = t.tenant_id;
        const tenant = tenantsData?.find(t => t.id === tenantId);
        if (tenant) {
          tenantRevenueMap[tenantId] = {
            name: tenant.name || "Inconnu",
            revenue: (tenantRevenueMap[tenantId]?.revenue || 0) + (t.amount || 0),
            plan: tenant.subscription_plan || "standard",
            status: tenant.subscription_status,
          };
        }
      });

      const tenantRevenueData = Object.entries(tenantRevenueMap)
        .map(([id, data]) => ({
          id,
          name: data.name,
          revenue: data.revenue,
          plan: data.plan,
          status: data.status,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // 5. Rendez-vous mensuels
      const monthlyAppointments = {};
      appointments?.forEach((a) => {
        if (a.appointment_date) {
          const month = format(new Date(a.appointment_date), "MMM yyyy", { locale: fr });
          monthlyAppointments[month] = (monthlyAppointments[month] || 0) + 1;
        }
      });
      const monthlyAppointmentsData = Object.entries(monthlyAppointments)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => {
          const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
          return months.indexOf(a.month.split(" ")[0]) - months.indexOf(b.month.split(" ")[0]);
        });

      // 6. Détails des tenants
      const tenantDetailsData = await Promise.all((tenantsData || []).slice(0, 20).map(async (tenant) => {
        // Récupérer le nombre de rendez-vous pour ce tenant
        const { count: appCount } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id);

        // Récupérer le nombre de clients
        const { count: clientCount } = await supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id);

        // Récupérer les revenus du tenant
        const { data: tenantSubs } = await supabase
          .from("subscriptions")
          .select("amount")
          .eq("tenant_id", tenant.id)
          .eq("status", "active");

        const { data: tenantTrans } = await supabase
          .from("transactions")
          .select("amount")
          .eq("tenant_id", tenant.id)
          .eq("status", "completed");

        const subRevenue = tenantSubs?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
        const transRevenue = tenantTrans?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

        return {
          ...tenant,
          appointments: appCount || 0,
          clients: clientCount || 0,
          revenue: subRevenue + transRevenue,
        };
      }));

      setTenantDetails(tenantDetailsData);

      setChartData({
        revenue: revenueData,
        appointments: statusData,
        tenants: tenantDetailsData.slice(0, 10).map(t => ({ name: t.name || "Inconnu", count: t.appointments || 0 })),
        roles: roleData,
        tenantRevenue: tenantRevenueData,
        monthlyAppointments: monthlyAppointmentsData,
        statusDistribution: statusData,
      });

      console.log("✅ Données analytics chargées");
      toast.success("✅ Données chargées avec succès");
    } catch (error) {
      console.error("❌ Error fetching analytics:", error);
      setError(error.message || "Erreur lors du chargement des données");
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      suspended: "bg-red-100 text-red-800",
      expired: "bg-gray-100 text-gray-800",
      inactive: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPlanLabel = (plan) => {
    const plans = {
      free: "Gratuit",
      basic: "Basique",
      pro: "Professionnel",
      premium: "Premium",
      enterprise: "Entreprise",
    };
    return plans[plan] || plan || "Standard";
  };

  const getPlanIcon = (plan) => {
    if (plan === "premium" || plan === "enterprise") return <Crown className="h-4 w-4 text-amber-500" />;
    if (plan === "pro") return <Star className="h-4 w-4 text-blue-500" />;
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold">Erreur de chargement</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button className="mt-4" onClick={fetchAnalytics}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Analytique Globale
          </h1>
          <p className="text-muted-foreground mt-1">
            Vue d'ensemble des performances de la plateforme
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Mois" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 6 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                return (
                  <SelectItem key={i} value={format(date, "yyyy-MM")}>
                    {format(date, "MMMM yyyy", { locale: fr })}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Select value={selectedTenant} onValueChange={setSelectedTenant}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tous les salons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📊 Tous les salons</SelectItem>
              {tenants.slice(0, 20).map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name || "Salon sans nom"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={fetchAnalytics} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Salons</p>
                <p className="text-2xl font-bold">{stats.totalTenants}</p>
                <p className="text-[10px] text-green-600">{stats.activeTenants} actifs</p>
              </div>
              <Building2 className="h-6 w-6 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Utilisateurs</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="h-6 w-6 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Rendez-vous</p>
                <p className="text-2xl font-bold">{stats.totalAppointments}</p>
              </div>
              <Calendar className="h-6 w-6 text-purple-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Revenus</p>
                <p className="text-xl font-bold text-green-600">
                  {Math.round(stats.totalRevenue).toLocaleString()} FCFA
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingTenants}</p>
              </div>
              <Clock className="h-6 w-6 text-yellow-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Taux actif</p>
                <p className="text-2xl font-bold">
                  {stats.totalTenants > 0 ? Math.round((stats.activeTenants / stats.totalTenants) * 100) : 0}%
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-emerald-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenus mensuels */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution des revenus</CardTitle>
            <CardDescription>Revenus mensuels (abonnements + transactions)</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {chartData.revenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `${v.toLocaleString()} FCFA`} />
                  <Tooltip
                    formatter={(value) => [`${value.toLocaleString()} FCFA`, "Revenu"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#ec4899"
                    fill="#ec4899"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribution des rôles */}
        <Card>
          <CardHeader>
            <CardTitle>Distribution des utilisateurs</CardTitle>
            <CardDescription>Répartition par type de compte</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {chartData.roles.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.roles}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="count"
                    label={({ role, percent }) =>
                      `${role} ${(percent * 100).toFixed(0)}%`
                    }
                    fontSize={11}
                  >
                    {chartData.roles.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deuxième ligne de graphiques */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Rendez-vous mensuels */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution des rendez-vous</CardTitle>
            <CardDescription>Nombre de rendez-vous par mois</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {chartData.monthlyAppointments.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.monthlyAppointments}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statut des rendez-vous */}
        <Card>
          <CardHeader>
            <CardTitle>Statut des rendez-vous</CardTitle>
            <CardDescription>Répartition par statut</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {chartData.statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="count"
                    label={({ status, percent }) =>
                      `${status} ${(percent * 100).toFixed(0)}%`
                    }
                    fontSize={11}
                  >
                    {chartData.statusDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top salons par revenu */}
      <Card>
        <CardHeader>
          <CardTitle>Top salons par revenu</CardTitle>
          <CardDescription>Les 10 salons générant le plus de revenus</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          {chartData.tenantRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.tenantRevenue} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" stroke="#888" fontSize={11} tickFormatter={(v) => `${v.toLocaleString()} FCFA`} />
                <YAxis dataKey="name" type="category" stroke="#888" fontSize={11} width={100} />
                <Tooltip
                  formatter={(value) => [`${value.toLocaleString()} FCFA`, "Revenu"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Aucune donnée disponible
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liste des salons avec détails */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Liste des salons</CardTitle>
              <CardDescription>
                {tenantDetails.length} salon(s) - Cliquez sur un salon pour voir les détails
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <Building2 className="h-3 w-3" />
              {tenantDetails.length} salons
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tenantDetails.slice(0, 20).map((tenant) => (
              <div
                key={tenant.id}
                className="border rounded-lg overflow-hidden hover:shadow-md transition-all"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => setExpandedTenant(expandedTenant === tenant.id ? null : tenant.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {tenant.logo_url ? (
                      <img
                        src={tenant.logo_url}
                        alt={tenant.name}
                        className="w-10 h-10 rounded-full object-cover border"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: tenant.primary_color || "#ec4899" }}
                      >
                        {tenant.name?.charAt(0) || "S"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{tenant.name || "Salon sans nom"}</p>
                        <Badge className={getStatusColor(tenant.subscription_status)}>
                          {tenant.subscription_status === "active" ? "✅ Actif" :
                           tenant.subscription_status === "pending" ? "⏳ En attente" :
                           tenant.subscription_status === "suspended" ? "⛔ Suspendu" :
                           tenant.subscription_status === "expired" ? "⏰ Expiré" : tenant.subscription_status}
                        </Badge>
                        {getPlanIcon(tenant.subscription_plan)}
                        <Badge variant="outline" className="text-[10px]">
                          {getPlanLabel(tenant.subscription_plan)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {tenant.clients || 0} clients
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {tenant.appointments || 0} RDV
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {(tenant.revenue || 0).toLocaleString()} FCFA
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(tenant.created_at), "dd/MM/yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/showcase/${tenant.slug}`, "_blank");
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      Voir
                    </Button>
                    {expandedTenant === tenant.id ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {expandedTenant === tenant.id && (
                  <div className="border-t p-4 bg-muted/10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Informations</p>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {tenant.address && (
                            <p className="flex items-center gap-1">
                              📍 {tenant.address}
                            </p>
                          )}
                          {tenant.phone && (
                            <p className="flex items-center gap-1">
                              📞 {tenant.phone}
                            </p>
                          )}
                          {tenant.email && (
                            <p className="flex items-center gap-1">
                              ✉️ {tenant.email}
                            </p>
                          )}
                          <p className="flex items-center gap-1">
                            🆔 {tenant.slug || tenant.id}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Statistiques</p>
                        <div className="space-y-1 text-sm">
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Clients</span>
                            <span className="font-medium">{tenant.clients || 0}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Rendez-vous</span>
                            <span className="font-medium">{tenant.appointments || 0}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Revenu total</span>
                            <span className="font-medium text-green-600">
                              {(tenant.revenue || 0).toLocaleString()} FCFA
                            </span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Plan</span>
                            <span className="font-medium">{getPlanLabel(tenant.subscription_plan)}</span>
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Actions</p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => window.open(`/showcase/${tenant.slug}`, "_blank")}
                          >
                            <Eye className="h-4 w-4" />
                            Vitrine
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => window.open(`/admin/tenants/${tenant.id}`, "_blank")}
                          >
                            <Building2 className="h-4 w-4" />
                            Admin
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {tenantDetails.length > 20 && (
              <p className="text-center text-sm text-muted-foreground py-2">
                Affichage des 20 premiers salons sur {tenantDetails.length}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}