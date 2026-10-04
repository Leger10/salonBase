// /src/pages/SuperAdminLogsPage.jsx
import React, { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Activity,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  Loader2,
  Calendar,
  Download,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { toast } from "sonner";

export default function SuperAdminLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const itemsPerPage = 20;

  useEffect(() => {
    fetchLogs();
  }, [currentPage, searchTerm, filterType, dateRange]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("📋 Récupération des logs...");

      // ✅ Utiliser activity_logs au lieu de audit_logs
      let query = supabase.from("activity_logs").select("*", { count: "exact" });

      // Filtres
      if (searchTerm) {
        query = query.or(
          `action.ilike.%${searchTerm}%,user_email.ilike.%${searchTerm}%`,
        );
      }

      if (filterType !== "all") {
        query = query.eq("action_type", filterType);
      }

      if (dateRange.start) {
        query = query.gte("created_at", dateRange.start);
      }

      if (dateRange.end) {
        query = query.lte("created_at", dateRange.end);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      setLogs(data || []);
      setTotalLogs(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));

      console.log(
        `✅ ${data?.length || 0} logs chargés sur ${count || 0} total`,
      );
    } catch (error) {
      console.error("❌ Erreur lors du chargement des logs:", error);
      setError(error.message || "Erreur lors du chargement des logs");
      toast.error("Erreur lors du chargement des logs");
    } finally {
      setLoading(false);
    }
  };

  const getLogIcon = (actionType) => {
    const icons = {
      login: <User className="w-4 h-4 text-blue-500" />,
      create: <Activity className="w-4 h-4 text-green-500" />,
      update: <Activity className="w-4 h-4 text-yellow-500" />,
      delete: <AlertTriangle className="w-4 h-4 text-red-500" />,
      error: <AlertCircle className="w-4 h-4 text-red-500" />,
    };
    return icons[actionType] || <Info className="w-4 h-4 text-gray-500" />;
  };

  const getLogColor = (actionType) => {
    const colors = {
      login: "border-l-blue-500 bg-blue-50/30",
      create: "border-l-green-500 bg-green-50/30",
      update: "border-l-yellow-500 bg-yellow-50/30",
      delete: "border-l-red-500 bg-red-50/30",
      error: "border-l-red-500 bg-red-50/30",
    };
    return colors[actionType] || "border-l-gray-400 bg-gray-50/30";
  };

  const getLogLabel = (actionType) => {
    const labels = {
      login: "Connexion",
      create: "Création",
      update: "Mise à jour",
      delete: "Suppression",
      error: "Erreur",
    };
    return labels[actionType] || actionType;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const exportLogs = () => {
    if (logs.length === 0) {
      toast.warning("Aucun log à exporter");
      return;
    }

    try {
      const headers = [
        "Date",
        "Utilisateur",
        "Action",
        "Type",
        "Détails",
        "IP",
      ];
      const csv = [
        headers.join(","),
        ...logs.map((log) =>
          [
            new Date(log.created_at).toISOString(),
            log.user_email || "Système",
            log.action || "",
            log.action_type || "",
            (log.details || "").replace(/,/g, ";"),
            log.ip_address || "",
          ].join(","),
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `logs_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Export de ${logs.length} logs réussi`);
    } catch (error) {
      console.error("Erreur export:", error);
      toast.error("Erreur lors de l'export");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold">Erreur de chargement</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button className="mt-4" onClick={fetchLogs}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Logs Système
          </h1>
          <p className="text-muted-foreground mt-1">
            Historique complet des actions sur la plateforme
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchLogs} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
          <Button onClick={exportLogs} className="gap-2">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total logs</p>
            <p className="text-2xl font-bold">{totalLogs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Page actuelle</p>
            <p className="text-2xl font-bold">
              {currentPage} / {totalPages}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Logs affichés</p>
            <p className="text-2xl font-bold">{logs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Filtre actif</p>
            <p className="text-2xl font-bold capitalize">
              {filterType === "all" ? "Tous" : filterType}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Tous les types</option>
              <option value="login">Connexions</option>
              <option value="create">Créations</option>
              <option value="update">Mises à jour</option>
              <option value="delete">Suppressions</option>
              <option value="error">Erreurs</option>
            </select>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              className="px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Date début"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              className="px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Date fin"
            />
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Utilisateur</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Détails</th>
                  <th className="px-6 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-12 text-center text-muted-foreground"
                    >
                      <Activity className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      Aucun log trouvé
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className={`border-l-4 ${getLogColor(log.action_type)} hover:bg-muted/30 transition-colors`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {log.user_email || "Système"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm">{log.action || "-"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            log.action_type === "login"
                              ? "bg-blue-100 text-blue-700"
                              : log.action_type === "create"
                                ? "bg-green-100 text-green-700"
                                : log.action_type === "update"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : log.action_type === "delete"
                                    ? "bg-red-100 text-red-700"
                                    : log.action_type === "error"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {getLogIcon(log.action_type)}
                          {getLogLabel(log.action_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                          {log.details || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-muted-foreground">
                          {log.ip_address || "-"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages} ({totalLogs} logs au total)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}