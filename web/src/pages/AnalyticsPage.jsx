// /src/pages/AnalyticsPage.jsx
import React, { useState, useEffect, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge.jsx";
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
  TrendingDown,
  Users,
  Calendar,
  Banknote,
  Star,
  Clock,
  Percent,
  Scissors,
} from "lucide-react";
import { format, differenceInCalendarDays, subDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext";

const COLORS = ["#ec4899", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

const PRESETS = [
  { label: "7 jours", days: 7 },
  { label: "30 jours", days: 30 },
  { label: "90 jours", days: 90 },
  { label: "12 mois", days: 365 },
];

const iso = (d) => format(d, "yyyy-MM-dd");

function percentChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function Delta({ value, suffix = "%" }) {
  if (!isFinite(value)) return null;
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${up ? "text-green-600" : "text-red-500"}`}
    >
      {up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {up ? "+" : ""}
      {value.toFixed(1)}
      {suffix}
    </span>
  );
}

export default function AnalyticsPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start_date: iso(subDays(new Date(), 30)),
    end_date: iso(new Date()),
  });

  const [metrics, setMetrics] = useState({
    revenue: { total: 0, previous: 0, daily: [] },
    appointments: {
      total: 0,
      previous: 0,
      completed: 0,
      cancelled: 0,
      by_service: [],
      by_status: [],
      by_employee: [],
      by_hour: [],
      top_clients: [],
    },
    clients: { total: 0, new_in_period: 0, repeat_rate_percent: 0 },
    payments: { average_ticket: 0, methods: [] },
  });

  const tenantId = currentUser?.profile?.tenant_id;

  const fetchData = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const start = dateRange.start_date;
      const end = dateRange.end_date;
      const periodDays =
        differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;

      const prevEnd = format(subDays(parseISO(start), 1), "yyyy-MM-dd");
      const prevStart = format(subDays(parseISO(start), periodDays), "yyyy-MM-dd");

      const apptSelect = `
        id, appointment_date, start_time, status, total_price,
        client_id, client_name, client_email,
        service:service_id (name, price),
        employee:employee_id (profile:profile_id (full_name))
      `;

      const [apptRes, prevApptRes, clientRes, txRes, prevTxRes] =
        await Promise.all([
          supabase
            .from("appointments")
            .select(apptSelect)
            .eq("tenant_id", tenantId)
            .gte("appointment_date", start)
            .lte("appointment_date", end),
          supabase
            .from("appointments")
            .select("id, status, total_price")
            .eq("tenant_id", tenantId)
            .gte("appointment_date", prevStart)
            .lte("appointment_date", prevEnd),
          supabase
            .from("clients")
            .select("id, name, created_at")
            .eq("tenant_id", tenantId),
          supabase
            .from("transactions")
            .select(
              "id, amount, payment_method, transaction_date, status, customer_name, client_id, transaction_type",
            )
            .eq("tenant_id", tenantId)
            .gte("transaction_date", `${start}T00:00:00`)
            .lte("transaction_date", `${end}T23:59:59`),
          supabase
            .from("transactions")
            .select("id, amount, transaction_date, status")
            .eq("tenant_id", tenantId)
            .gte("transaction_date", `${prevStart}T00:00:00`)
            .lte("transaction_date", `${prevEnd}T23:59:59`),
        ]);

      if (apptRes.error) throw apptRes.error;
      if (clientRes.error) throw clientRes.error;

      const appointments = apptRes.data || [];
      const prevAppointments = prevApptRes.data || [];
      const clients = clientRes.data || [];
      const transactions = txRes.data || [];
      const prevTransactions = prevTxRes.data || [];

      const isRevenue = (t) => t.status !== "cancelled" && t.status !== "refunded";

      // ----- Revenus : privilégie la caisse, sinon les RDV terminés -----
      const txRevenue = transactions
        .filter(isRevenue)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const prevTxRevenue = prevTransactions
        .filter(isRevenue)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const completed = appointments.filter((a) => a.status === "completed");
      const apptRevenue = completed.reduce(
        (sum, a) => sum + Number(a.total_price || 0),
        0,
      );
      const prevApptRevenue = prevAppointments
        .filter((a) => a.status === "completed")
        .reduce((sum, a) => sum + Number(a.total_price || 0), 0);

      const useTransactions = transactions.length > 0;
      const totalRevenue = useTransactions ? txRevenue : apptRevenue;
      const prevRevenue = useTransactions ? prevTxRevenue : prevApptRevenue;

      // Revenus journaliers
      const dailyMap = {};
      if (useTransactions) {
        transactions.filter(isRevenue).forEach((t) => {
          const day = String(t.transaction_date).slice(0, 10);
          dailyMap[day] = (dailyMap[day] || 0) + Number(t.amount || 0);
        });
      } else {
        completed.forEach((a) => {
          const day = String(a.appointment_date).slice(0, 10);
          dailyMap[day] = (dailyMap[day] || 0) + Number(a.total_price || 0);
        });
      }

      // Remplir les jours sans transaction pour une courbe continue
      const apptMap = {};
      appointments.forEach((a) => {
        const day = String(a.appointment_date).slice(0, 10);
        apptMap[day] = (apptMap[day] || 0) + 1;
      });

      const daily = [];
      for (let i = 0; i < Math.min(periodDays, 400); i += 1) {
        const day = format(addDaysSafe(parseISO(start), i), "yyyy-MM-dd");
        daily.push({
          date: day,
          amount: Math.round(dailyMap[day] || 0),
          appointments: apptMap[day] || 0,
        });
      }

      // ----- RDV -----
      const countBy = (list, keyFn) => {
        const map = {};
        list.forEach((item) => {
          const key = keyFn(item);
          if (!key) return;
          map[key] = (map[key] || 0) + 1;
        });
        return map;
      };

      const byService = Object.entries(
        countBy(appointments, (a) => a.service?.name),
      ).map(([service_name, count]) => ({ service_name, count }));

      const byStatus = Object.entries(
        countBy(appointments, (a) => a.status),
      ).map(([status, count]) => ({ status, count }));

      const byEmployee = Object.entries(
        countBy(
          appointments,
          (a) => a.employee?.profile?.full_name || "Non assigné",
        ),
      )
        .map(([employee_name, count]) => ({ employee_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      const byHour = Object.entries(
        countBy(appointments, (a) => {
          const hh = String(a.start_time || "").slice(0, 2);
          return hh ? `${hh}:00` : null;
        }),
      )
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      // Top clients
      const clientMap = {};
      appointments.forEach((a) => {
        const key = a.client_id || a.client_name || "Client invité";
        if (!clientMap[key]) {
          clientMap[key] = {
            name: a.client_name || a.client_email || "Client invité",
            visits: 0,
            spent: 0,
          };
        }
        clientMap[key].visits += 1;
        clientMap[key].spent += Number(a.total_price || 0);
      });
      const topClients = Object.values(clientMap)
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 6);

      // ----- Clients -----
      const inPeriod = clients.filter((c) => {
        const d = parseISO(c.created_at);
        return (
          differenceInCalendarDays(d, parseISO(start)) >= 0 &&
          differenceInCalendarDays(d, parseISO(end)) <= 0
        );
      });

      const clientVisitCount = {};
      appointments.forEach((a) => {
        if (a.client_id)
          clientVisitCount[a.client_id] =
            (clientVisitCount[a.client_id] || 0) + 1;
      });
      const visited = Object.keys(clientVisitCount).length;
      const repeatClients = Object.values(clientVisitCount).filter(
        (n) => n > 1,
      ).length;
      const repeatRate = visited ? (repeatClients / visited) * 100 : 0;

      // ----- Moyens de paiement -----
      const methodMap = {};
      transactions.filter(isRevenue).forEach((t) => {
        const m = t.payment_method || "Non précisé";
        methodMap[m] = (methodMap[m] || 0) + Number(t.amount || 0);
      });
      const methods = Object.entries(methodMap).map(([name, value]) => ({
        name,
        value: Math.round(value),
      }));

      const nbSales = transactions.filter(isRevenue).length;
      const averageTicket =
        nbSales > 0
          ? totalRevenue / nbSales
          : completed.length > 0
            ? totalRevenue / completed.length
            : 0;

      setMetrics({
        revenue: { total: totalRevenue, previous: prevRevenue, daily },
        appointments: {
          total: appointments.length,
          previous: prevAppointments.length,
          completed: completed.length,
          cancelled: appointments.filter((a) => a.status === "cancelled")
            .length,
          by_service: byService.sort((a, b) => b.count - a.count),
          by_status: byStatus,
          by_employee: byEmployee,
          by_hour: byHour,
          top_clients: topClients,
        },
        clients: {
          total: clients.length,
          new_in_period: inPeriod.length,
          repeat_rate_percent: repeatRate,
        },
        payments: { average_ticket: Math.round(averageTicket), methods },
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Erreur lors du chargement des analytiques");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchData();
    } else if (currentUser) {
      setLoading(false);
    }
  }, [tenantId, dateRange]);

  const applyPreset = (days) => {
    const start = subDays(new Date(), days - 1);
    setDateRange({ start_date: iso(start), end_date: iso(new Date()) });
  };

  const completionRate = useMemo(() => {
    if (!metrics.appointments.total) return 0;
    return (metrics.appointments.completed / metrics.appointments.total) * 100;
  }, [metrics]);

  const cancelRate = useMemo(() => {
    if (!metrics.appointments.total) return 0;
    return (metrics.appointments.cancelled / metrics.appointments.total) * 100;
  }, [metrics]);

  const revenueDelta = percentChange(
    metrics.revenue.total,
    metrics.revenue.previous,
  );
  const apptDelta = percentChange(
    metrics.appointments.total,
    metrics.appointments.previous,
  );

  const handleExport = () => {
    try {
      const rows = [
        ["Date", "Revenu (FCFA)", "Rendez-vous"],
        ...metrics.revenue.daily.map((d) => [d.date, d.amount, d.appointments]),
      ];

      const csv = rows
        .map((r) => r.join(","))
        .join("\n");
      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport-${dateRange.start_date}_${dateRange.end_date}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Rapport exporté en CSV");
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Analytique & rapports
          </h1>
          <p className="text-muted-foreground mt-1">
            Suivez les performances de votre salon et comparez les périodes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex flex-wrap gap-1 rounded-lg border p-1">
            {PRESETS.map((p) => (
              <Button
                key={p.days}
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => applyPreset(p.days)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm">Du</Label>
            <Input
              type="date"
              value={dateRange.start_date}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, start_date: e.target.value }))
              }
              className="w-36 h-9"
            />
            <Label className="text-sm">Au</Label>
            <Input
              type="date"
              value={dateRange.end_date}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end_date: e.target.value }))
              }
              className="w-36 h-9"
            />
          </div>

          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="border-none shadow-sm bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Chiffre d'affaires
                </p>
                <p className="text-2xl font-bold">
                  {Math.round(metrics.revenue.total).toLocaleString()} FCFA
                </p>
                <Delta value={revenueDelta} />
              </div>
              <div className="p-3 bg-primary/20 text-primary rounded-xl">
                <Banknote className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Rendez-vous
                </p>
                <p className="text-2xl font-bold">{metrics.appointments.total}</p>
                <Delta value={apptDelta} />
              </div>
              <div className="p-3 bg-secondary/20 text-secondary-foreground rounded-xl">
                <Calendar className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Panier moyen
                </p>
                <p className="text-2xl font-bold">
                  {metrics.payments.average_ticket.toLocaleString()} FCFA
                </p>
                <p className="text-xs text-muted-foreground">
                  par prestation réglée
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
                <Scissors className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Taux de réalisation
                </p>
                <p className="text-2xl font-bold">
                  {completionRate.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {metrics.appointments.completed} terminés ·{" "}
                  {metrics.appointments.cancelled} annulés
                </p>
              </div>
              <div className="p-3 bg-green-500/10 text-green-600 rounded-xl">
                <Percent className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Nouveaux clients
                </p>
                <p className="text-2xl font-bold">
                  {metrics.clients.new_in_period}
                </p>
                <p className="text-xs text-muted-foreground">
                  sur la période · {metrics.clients.total} au total
                </p>
              </div>
              <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Clients fidèles
                </p>
                <p className="text-2xl font-bold">
                  {metrics.clients.repeat_rate_percent.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  2 visites ou plus
                </p>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
                <Star className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques principaux */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Évolution du chiffre d'affaires</CardTitle>
            <CardDescription>
              Revenus journaliers sur la période sélectionnée
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {metrics.revenue.daily.some((d) => d.amount > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.revenue.daily}>
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
                    tickFormatter={(v) => format(new Date(v), "dd/MM")}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v.toLocaleString()} FCFA`}
                  />
                  <Tooltip
                    labelFormatter={(v) => format(new Date(v), "dd MMM yyyy")}
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

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Services les plus demandés</CardTitle>
            <CardDescription>Répartition des rendez-vous par service</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {metrics.appointments.by_service.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.appointments.by_service}
                  layout="vertical"
                  margin={{ left: 40 }}
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
                    fontSize={11}
                    width={110}
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

      {/* Heures de pointe + statuts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Heures de pointe</CardTitle>
            <CardDescription>
              Nombre de rendez-vous par tranche horaire
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {metrics.appointments.by_hour.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.appointments.by_hour}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="hour"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Statut des rendez-vous</CardTitle>
            <CardDescription>
              Part des RDV terminés, annulés et en attente
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
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

      {/* Performance employés + top clients + paiements */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Performance par employé</CardTitle>
            <CardDescription>Nombre de rendez-vous par membre</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
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
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    angle={-30}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Meilleurs clients</CardTitle>
            <CardDescription>Classement par dépenses cumulées</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {metrics.appointments.top_clients.length > 0 ? (
              <div className="space-y-3">
                {metrics.appointments.top_clients.map((c, index) => (
                  <div
                    key={`${c.name}-${index}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge className="w-6 justify-center bg-primary/15 text-primary border-0">
                        {index + 1}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.visits} visite{c.visits > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {c.spent.toLocaleString()} FCFA
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Moyens de paiement</CardTitle>
            <CardDescription>Répartition des encaissements</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {metrics.payments.methods.length > 0 ? (
              <div className="space-y-3">
                {metrics.payments.methods.map((m) => (
                  <div
                    key={m.name}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-sm capitalize">{m.name}</span>
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {m.value.toLocaleString()} FCFA
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Aucun encaissement enregistré
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Résumé */}
      <Card className="border-none shadow-md bg-muted/20">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                {metrics.clients.total}
              </p>
              <p className="text-sm text-muted-foreground">Clients au total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {metrics.clients.repeat_rate_percent.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Taux de rétention</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {completionRate.toFixed(0)}%
              </p>
              <p className="text-sm text-muted-foreground">RDV réalisés</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {cancelRate.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Taux d'annulation</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function addDaysSafe(date, days) {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function transactionsEmptyMessage() {
  return "Aucun encaissement enregistré";
}
