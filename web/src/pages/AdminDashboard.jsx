// /src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import {
  Users,
  CreditCard,
  Calendar,
  Plus,
  Scissors,
  Star,
  TrendingUp,
  Clock,
  Gift,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  BarChart3,
  UserPlus,
  Building2,
  Package,
  MessageSquare,
  Award,
  ShoppingBag,
  Wrench,
  Receipt,
  Globe,
  Settings,
  Bell,
  Crown,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  DollarSign,
  PieChart,
  Share2,
  Copy,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AdminHomeFeatures from "@/components/AdminHomeFeatures.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";

const COLORS = ["#ec4899", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981"];

// ========== COMPOSANT : BOUTON DE PARTAGE ==========
const ShareSalonButton = ({ tenantId, tenantName, tenantSlug }) => {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/showcase/${tenantSlug || tenantId}`;
  const shareText = `Découvrez ${tenantName} sur BeautyFlow ! ✨`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Lien copié dans le presse-papier !');
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error('Erreur lors de la copie');
    }
  };

  const shareLinks = [
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-[#1877f2] hover:bg-[#1877f2]/90',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-[#1da1f2] hover:bg-[#1da1f2]/90',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-[#0a66c2] hover:bg-[#0a66c2]/90',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'WhatsApp',
      icon: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
      color: 'bg-[#25D366] hover:bg-[#25D366]/90',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`,
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-[#ea4335] hover:bg-[#ea4335]/90',
      url: `mailto:?subject=${encodeURIComponent(`Découvrez ${tenantName}`)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
          <Share2 className="h-4 w-4" />
          Partager mon salon
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Partager {tenantName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Lien direct */}
          <div className="space-y-2">
            <Label>Lien de partage</Label>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1 bg-muted"
                onClick={(e) => e.target.select()}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Partagez ce lien pour que vos clients puissent découvrir votre salon
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou partager sur
              </span>
            </div>
          </div>

          {/* Réseaux sociaux */}
          <div className="grid grid-cols-3 gap-2">
            {shareLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Button
                  key={link.name}
                  variant="outline"
                  className={`${link.color} text-white hover:text-white border-none h-auto py-3 flex flex-col gap-1 group`}
                  onClick={() => {
                    window.open(link.url, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <Icon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs">{link.name}</span>
                </Button>
              );
            })}
          </div>

          {/* Aperçu */}
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              🔗 Vos clients verront une page dédiée à votre salon
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {tenantName} - Page vitrine personnalisée
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ========== PAGE PRINCIPALE ==========
export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [topEmployees, setTopEmployees] = useState([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [tenantSlug, setTenantSlug] = useState(null);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser?.profile?.tenant_id) {
      fetchDashboardData();
    } else {
      console.warn("⚠️ Pas de tenant_id pour l'utilisateur");
      setLoading(false);
    }
  }, [currentUser]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const tenantId = currentUser.profile.tenant_id;
      console.log("🏢 Tenant ID:", tenantId);

      // 1. Vérifier l'abonnement et récupérer le slug
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .select(
          "subscription_status, subscription_end, subscription_plan, name, slug"
        )
        .eq("id", tenantId)
        .single();

      if (tenantError) {
        console.error("❌ Erreur tenant:", tenantError);
        throw tenantError;
      }
      setSubscriptionStatus(tenant);
      setTenantSlug(tenant?.slug || tenantId);
      console.log("✅ Tenant:", tenant);

      if (tenant.subscription_status !== "active") {
        console.warn("⚠️ Abonnement non actif:", tenant.subscription_status);
        setLoading(false);
        return;
      }

      // 2. Statistiques clients
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id", { count: "exact" })
        .eq("tenant_id", tenantId);

      if (clientsError) {
        console.error("❌ Erreur clients:", clientsError);
      }
      const totalClients = clients?.length || 0;
      console.log("👥 Clients:", totalClients);

      // 3. Statistiques rendez-vous
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .eq("tenant_id", tenantId);

      if (appointmentsError) {
        console.error("❌ Erreur appointments:", appointmentsError);
      }

      const appointmentsData = appointments || [];
      const totalRevenue =
        appointmentsData.reduce((sum, a) => sum + (a.total_price || 0), 0) || 0;
      const totalAppointments = appointmentsData.length;
      const completedAppointments =
        appointmentsData.filter((a) => a.status === "completed").length || 0;
      const pendingAppointments =
        appointmentsData.filter((a) => a.status === "pending").length || 0;

      const today = new Date().toISOString().split("T")[0];
      const upcomingAppointments =
        appointmentsData.filter(
          (a) => a.appointment_date >= today && a.status === "confirmed",
        ).length || 0;

      console.log("📊 Appointments:", {
        totalAppointments,
        totalRevenue,
        completedAppointments,
        pendingAppointments,
        upcomingAppointments,
      });

      // 4. Statistiques employés
      const { data: employees, error: employeesError } = await supabase
        .from("employees")
        .select("*, profile:profile_id(full_name)")
        .eq("tenant_id", tenantId);

      if (employeesError) {
        console.error("❌ Erreur employees:", employeesError);
      }

      const employeesData = employees || [];
      const averageRating =
        employeesData.length > 0
          ? employeesData.reduce((sum, e) => sum + (e.average_rating || 0), 0) /
            employeesData.length
          : 0;

      console.log("👔 Employees:", employeesData.length);

      // 5. Services et produits
      const { data: services, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true);

      if (servicesError) {
        console.error("❌ Erreur services:", servicesError);
      }

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", tenantId);

      if (productsError) {
        console.error("❌ Erreur products:", productsError);
      }

      console.log(
        "📦 Services:",
        services?.length || 0,
        "Produits:",
        products?.length || 0,
      );

      // 6. Rendez-vous récents
      const { data: recent, error: recentError } = await supabase
        .from("appointments")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("appointment_date", { ascending: false })
        .order("start_time", { ascending: false })
        .limit(10);

      if (recentError) {
        console.error("❌ Erreur recent appointments:", recentError);
      }

      const enrichedRecent = await Promise.all(
        (recent || []).map(async (apt) => {
          let clientName = "Client";
          if (apt.client_id) {
            const { data: client } = await supabase
              .from("clients")
              .select("name")
              .eq("id", apt.client_id)
              .single();
            if (client) clientName = client.name;
          }
          return { ...apt, client_name: clientName };
        }),
      );

      console.log("📋 Recent appointments:", enrichedRecent.length);

      // 7. Top employés
      const topRated = [...employeesData]
        .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
        .slice(0, 5);
      setTopEmployees(topRated);

      // 8. Revenus par mois
      const revenueByMonth = appointmentsData.reduce((acc, apt) => {
        if (
          apt.status === "completed" &&
          apt.total_price &&
          apt.appointment_date
        ) {
          try {
            const month = new Date(apt.appointment_date).toLocaleString(
              "fr-FR",
              { month: "short" },
            );
            acc[month] = (acc[month] || 0) + apt.total_price;
          } catch (e) {
            console.warn("Date invalide:", apt.appointment_date);
          }
        }
        return acc;
      }, {});
      const chartData = Object.entries(revenueByMonth || {}).map(
        ([name, revenue]) => ({ name, revenue }),
      );

      // 9. Répartition des services
      const serviceDistribution = appointmentsData.reduce((acc, apt) => {
        const name = apt.service_type || "Autre";
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});
      const pieData = Object.entries(serviceDistribution || {})
        .map(([name, value]) => ({ name, value }))
        .slice(0, 6);

      setDashboardData({
        totalClients,
        totalRevenue,
        totalAppointments,
        completedAppointments,
        pendingAppointments,
        upcomingAppointments,
        averageRating: averageRating.toFixed(1),
        totalEmployees: employeesData.length || 0,
        totalServices: services?.length || 0,
        totalProducts: products?.length || 0,
        chartData: chartData.slice(-6),
        pieData,
      });

      setRecentAppointments(enrichedRecent || []);
    } catch (error) {
      console.error("❌ Error fetching dashboard data:", error);
      setError(error.message);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="p-8 max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-destructive mb-2">
            Erreur de chargement
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchDashboardData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (
    !subscriptionStatus ||
    subscriptionStatus?.subscription_status !== "active"
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="p-8 max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-destructive mb-2">
            Abonnement expiré
          </h2>
          <p className="text-muted-foreground mb-6">
            Votre abonnement n'est plus actif. Veuillez contacter le super
            administrateur pour réactiver votre compte.
          </p>
          <Badge className="bg-red-100 text-red-800 text-lg py-2 px-4">
            Plan: {subscriptionStatus?.subscription_plan || "Starter"} - Expiré
          </Badge>
          <div className="mt-6 text-sm text-muted-foreground">
            <p>Contactez le support pour toute question.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bonjour, {currentUser?.profile?.full_name || currentUser?.full_name}
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-muted-foreground">
              Voici un aperçu de votre salon aujourd'hui.
            </p>
            <Badge className="bg-green-100 text-green-800 gap-1">
              <CheckCircle className="h-3 w-3" />
              Plan {subscriptionStatus?.subscription_plan || "Starter"} Actif
            </Badge>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* ✅ BOUTON DE PARTAGE - CHAQUE ADMIN A SON LIEN UNIQUE */}
          <ShareSalonButton 
            tenantId={currentUser?.profile?.tenant_id}
            tenantName={subscriptionStatus?.name}
            tenantSlug={tenantSlug}
          />
          {/* <Button asChild className="gap-2">
            <Link to="/admin/appointments/new">
              <Calendar className="h-4 w-4" />
              Nouveau RDV
            </Link>
          </Button> */}
          {/* <Button asChild variant="outline" className="gap-2">
            <Link to="/admin/clients/new">
              <UserPlus className="h-4 w-4" />
              Nouveau client
            </Link>
          </Button> */}
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm hover:shadow-md transition-all group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clients
            </CardTitle>
            <Users className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dashboardData?.totalClients || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              clients inscrits
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-all group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenus
            </CardTitle>
            <CreditCard className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Math.round(dashboardData?.totalRevenue || 0).toLocaleString()}{" "}
              FCFA
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              chiffre d'affaires total
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-all group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              RDV à venir
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dashboardData?.upcomingAppointments || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              rendez-vous confirmés
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-all group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Note moyenne
            </CardTitle>
            <Star className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dashboardData?.averageRating || 0}/5
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              évaluations employés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-none shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Évolution des revenus
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {dashboardData?.chartData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData.chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${value?.toLocaleString()} FCFA`,
                      "Revenu",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Aucune donnée de revenus disponible</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Meilleurs employés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topEmployees.length > 0 ? (
                topEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold">
                          {employee.profile?.full_name?.charAt(0) || "E"}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">
                          {employee.profile?.full_name || "Employé"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Employé #{employee.employee_number}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">
                          {employee.average_rating || 0}/5
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {employee.total_clients_served || 0} clients
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Aucun employé pour le moment
                </p>
              )}
              <Button variant="outline" asChild className="w-full mt-2">
                <Link to="/admin/team">
                  Gérer l'équipe <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Derniers rendez-vous */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Derniers rendez-vous
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAppointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun rendez-vous récent
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Client</th>
                    <th className="pb-3 font-medium">Service</th>
                    <th className="pb-3 font-medium">Date & Heure</th>
                    <th className="pb-3 font-medium">Statut</th>
                    <th className="pb-3 font-medium">Montant</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAppointments.slice(0, 5).map((apt) => (
                    <tr
                      key={apt.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="py-3">
                        <div className="font-medium">
                          {apt.client_name || "Client"}
                        </div>
                      </td>
                      <td className="py-3">
                        <div>{apt.service_type || "Service"}</div>
                        {apt.duration && (
                          <div className="text-xs text-muted-foreground">
                            {apt.duration} min
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        <div>
                          {apt.appointment_date
                            ? new Date(
                                apt.appointment_date,
                              ).toLocaleDateString()
                            : "-"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {apt.start_time || "-"}
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge
                          className={
                            apt.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : apt.status === "confirmed"
                                ? "bg-blue-100 text-blue-800"
                                : apt.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : apt.status === "cancelled"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                          }
                        >
                          {apt.status === "completed"
                            ? "Terminé"
                            : apt.status === "confirmed"
                              ? "Confirmé"
                              : apt.status === "pending"
                                ? "En attente"
                                : apt.status === "cancelled"
                                  ? "Annulé"
                                  : "Non présenté"}
                        </Badge>
                      </td>
                      <td className="py-3 font-semibold">
                        {apt.total_price?.toLocaleString() || 0} FCFA
                      </td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="sm" asChild>
                       <Link to="/admin/appointments">
                            Détails <ChevronRight className="h-3 w-3 ml-1" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 text-center">
            <Button variant="outline" asChild>
              <Link to="/admin/appointments">Voir tous les rendez-vous</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Résumé des services */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Services</p>
                <p className="text-2xl font-bold">
                  {dashboardData?.totalServices || 0}
                </p>
              </div>
              <Scissors className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Produits</p>
                <p className="text-2xl font-bold">
                  {dashboardData?.totalProducts || 0}
                </p>
              </div>
              <Package className="h-8 w-8 text-orange-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Employés</p>
                <p className="text-2xl font-bold">
                  {dashboardData?.totalEmployees || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">RDV en attente</p>
                <p className="text-2xl font-bold">
                  {dashboardData?.pendingAppointments || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Toutes les fonctionnalités */}
      <AdminHomeFeatures />

      {/* Actions rapides */}
      <div className="grid gap-6 md:grid-cols-4">
        <Button
          variant="outline"
          asChild
          className="h-auto py-6 flex-col gap-2 group"
        >
          <Link to="/admin/team">
            <Users className="h-6 w-6 group-hover:scale-110 transition-transform" />
            <span>Gestion d'équipe</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          asChild
          className="h-auto py-6 flex-col gap-2 group"
        >
          <Link to="/admin/plannings">
            <Calendar className="h-6 w-6 group-hover:scale-110 transition-transform" />
            <span>Plannings</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          asChild
          className="h-auto py-6 flex-col gap-2 group"
        >
          <Link to="/admin/marketing">
            <MessageSquare className="h-6 w-6 group-hover:scale-110 transition-transform" />
            <span>Marketing</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          asChild
          className="h-auto py-6 flex-col gap-2 group"
        >
          <Link to="/admin/cashier">
            <Receipt className="h-6 w-6 group-hover:scale-110 transition-transform" />
            <span>Encaissement</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}