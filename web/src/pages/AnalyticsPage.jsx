// /src/pages/AnalyticsPage.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext";
// ❌ SUPPRIMER CET IMPORT
// import DashboardLayout from "@/layouts/DashboardLayout.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import {
  Download,
  TrendingUp,
  Users,
  Calendar,
  Banknote,
  Star,
  Clock,
} from "lucide-react";
import { format, subDays, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

const COLORS = ["#ec4899", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981"];

export default function AnalyticsPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    revenue: { total_revenue: 0, daily_breakdown: [] },
    appointments: { total: 0, by_service: [], by_status: [], by_employee: [] },
    clients: { total: 0, new_this_month: 0, repeat_rate_percent: 0 },
  });
  const [dateRange, setDateRange] = useState({
    start_date: subDays(new Date(), 30).toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        setLoading(false);
        return;
      }

      // 1. Récupérer les rendez-vous sur la période
      const { data: appointments, error: apptError } = await supabase
        .from("appointments")
        .select(
          `
          *,
          service:service_id (name, price),
          employee:employee_id (profile:profile_id (full_name))
        `,
        )
        .eq("tenant_id", tenantId)
        .gte("appointment_date", dateRange.start_date)
        .lte("appointment_date", dateRange.end_date);

      if (apptError) throw apptError;

      // 2. Récupérer les clients
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .eq("tenant_id", tenantId);

      if (clientsError) throw clientsError;

      // 3. Calculer les métriques
      const completedAppointments =
        appointments?.filter((a) => a.status === "completed") || [];

      // Revenus
      const totalRevenue = completedAppointments.reduce(
        (sum, a) => sum + (a.total_price || 0),
        0,
      );

      // Revenus par jour
      const dailyRevenue = {};
      completedAppointments.forEach((apt) => {
        const date = apt.appointment_date;
        dailyRevenue[date] = (dailyRevenue[date] || 0) + (apt.total_price || 0);
      });
      const dailyBreakdown = Object.entries(dailyRevenue).map(
        ([date, amount]) => ({ date, amount }),
      );

      // Rendez-vous par service
      const serviceCount = {};
      appointments?.forEach((apt) => {
        const serviceName = apt.service?.name || "Autre";
        serviceCount[serviceName] = (serviceCount[serviceName] || 0) + 1;
      });
      const byService = Object.entries(serviceCount).map(
        ([service_name, count]) => ({ service_name, count }),
      );

      // Rendez-vous par statut
      const statusCount = {};
      appointments?.forEach((apt) => {
        statusCount[apt.status] = (statusCount[apt.status] || 0) + 1;
      });
      const byStatus = Object.entries(statusCount).map(([status, count]) => ({
        status,
        count,
      }));

      // Rendez-vous par employé
      const employeeCount = {};
      appointments?.forEach((apt) => {
        const employeeName = apt.employee?.profile?.full_name || "Non assigné";
        employeeCount[employeeName] = (employeeCount[employeeName] || 0) + 1;
      });
      const byEmployee = Object.entries(employeeCount).map(
        ([employee_name, count]) => ({ employee_name, count }),
      );

      // Clients
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const newThisMonth =
        clients?.filter((c) => {
          const createdDate = new Date(c.created_at);
          return (
            createdDate.getMonth() === currentMonth &&
            createdDate.getFullYear() === currentYear
          );
        }).length || 0;

      // Taux de rétention (clients avec plus d'un rendez-vous)
      const clientAppointmentCount = {};
      appointments?.forEach((apt) => {
        if (apt.client_id) {
          clientAppointmentCount[apt.client_id] =
            (clientAppointmentCount[apt.client_id] || 0) + 1;
        }
      });
      const repeatClients = Object.values(clientAppointmentCount).filter(
        (count) => count > 1,
      ).length;
      const uniqueClients = Object.keys(clientAppointmentCount).length;
      const repeatRate =
        uniqueClients > 0 ? (repeatClients / uniqueClients) * 100 : 0;

      setMetrics({
        revenue: {
          total_revenue: totalRevenue,
          daily_breakdown: dailyBreakdown,
        },
        appointments: {
          total: appointments?.length || 0,
          by_service: byService,
          by_status: byStatus,
          by_employee: byEmployee,
        },
        clients: {
          total: clients?.length || 0,
          new_this_month: newThisMonth,
          repeat_rate_percent: repeatRate,
        },
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Erreur lors du chargement des analytiques");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.profile?.tenant_id) {
      fetchData();
    }
  }, [currentUser, dateRange]);

  const handleExport = async (format) => {
    try {
      let content = "";
      let filename = `rapport-${format(new Date(), "yyyy-MM-dd")}`;

      if (format === "csv") {
        content = [
          ["Date", "Revenu (FCFA)", "Rendez-vous"].join(","),
          ...metrics.revenue.daily_breakdown.map((d) =>
            [
              d.date,
              d.amount,
              metrics.appointments.by_service.reduce(
                (s, srv) => s + srv.count,
                0,
              ),
            ].join(","),
          ),
        ].join("\n");
        filename += ".csv";
      } else {
        content = JSON.stringify(metrics, null, 2);
        filename += ".json";
      }

      const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Rapport exporté en ${format.toUpperCase()}`);
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Erreur lors de l'export");
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 pb-8">
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Analytique & Rapports
          </h1>
          <p className="text-muted-foreground mt-1">
            Analysez les performances de votre salon.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Du</Label>
            <Input
              type="date"
              value={dateRange.start_date}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  start_date: e.target.value,
                }))
              }
              className="w-36 h-9"
            />
            <Label className="text-sm">Au</Label>
            <Input
              type="date"
              value={dateRange.end_date}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  end_date: e.target.value,
                }))
              }
              className="w-36 h-9"
            />
            <Button variant="outline" size="sm" onClick={fetchData}>
              Appliquer
            </Button>
          </div>
          <Button
            onClick={() => handleExport("csv")}
            variant="outline"
            className="gap-2"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="dashboard-card border-none shadow-sm bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 text-primary rounded-xl">
                <Banknote className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Chiffre d'Affaires
                </p>
                <p className="text-2xl font-bold">
                  {Math.round(metrics.revenue.total_revenue).toLocaleString()}{" "}
                  FCFA
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary/20 text-secondary-foreground rounded-xl">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Rendez-vous
                </p>
                <p className="text-2xl font-bold">
                  {metrics.appointments.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Nouveaux Clients
                </p>
                <p className="text-2xl font-bold">
                  {metrics.clients.new_this_month}
                </p>
                <p className="text-xs text-muted-foreground">ce mois-ci</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Taux de Rétention
                </p>
                <p className="text-2xl font-bold">
                  {metrics.clients.repeat_rate_percent.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Évolution du CA */}
        <Card className="dashboard-card border-none shadow-md">
          <CardHeader>
            <CardTitle>Évolution du Chiffre d'Affaires</CardTitle>
            <CardDescription>
              Revenus journaliers sur la période
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {metrics.revenue.daily_breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.revenue.daily_breakdown}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="date"
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
                    tickFormatter={(v) => `${v.toLocaleString()} FCFA`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                    }}
                    formatter={(value) => [
                      `${value.toLocaleString()} FCFA`,
                      "Revenu",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
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

        {/* Rendez-vous par service */}
        <Card className="dashboard-card border-none shadow-md">
          <CardHeader>
            <CardTitle>Services les plus populaires</CardTitle>
            <CardDescription>
              Répartition des rendez-vous par service
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {metrics.appointments.by_service.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.appointments.by_service}
                  layout="vertical"
                  margin={{ left: 80 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    type="number"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    dataKey="service_name"
                    type="category"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--secondary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
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
        {/* Rendez-vous par statut */}
        <Card className="dashboard-card border-none shadow-md">
          <CardHeader>
            <CardTitle>Statut des rendez-vous</CardTitle>
            <CardDescription>Répartition par statut</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {metrics.appointments.by_status.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.appointments.by_status}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                    label={({ status, percent }) =>
                      `${status} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {metrics.appointments.by_status.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rendez-vous par employé */}
        <Card className="dashboard-card border-none shadow-md">
          <CardHeader>
            <CardTitle>Performance par employé</CardTitle>
            <CardDescription>
              Nombre de rendez-vous par membre
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {metrics.appointments.by_employee.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.appointments.by_employee}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="employee_name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--accent))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Résumé */}
      <Card className="dashboard-card border-none shadow-md bg-muted/20">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                {metrics.clients.total}
              </p>
              <p className="text-sm text-muted-foreground">Clients totaux</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {metrics.clients.repeat_rate_percent.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Clients fidèles</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {metrics.appointments.total > 0
                  ? Math.round(
                      metrics.revenue.total_revenue /
                        metrics.appointments.total,
                    ).toLocaleString()
                  : 0}{" "}
                FCFA
              </p>
              <p className="text-sm text-muted-foreground">Panier moyen</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}