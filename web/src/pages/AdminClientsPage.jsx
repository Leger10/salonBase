// /src/pages/AdminClientsPage.jsx
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  Users,
  Search,
  RefreshCw,
  User,
  Mail,
  Phone,
  Calendar,
  Ticket,
  ShoppingBag,
  Award,
  Eye,
  Download,
  UserPlus,
  Activity,
  DollarSign,
  Calendar as CalendarIcon,
  Filter,
  X,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from "xlsx";
import { Calendar as CalendarComponent } from "@/components/ui/calendar.jsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.jsx";
import { cn } from "@/lib/utils";

export default function AdminClientsPage() {
  const { currentUser } = useAuth();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedClient, setSelectedClient] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    new: 0,
    loyal: 0,
    totalRevenue: 0,
    totalVisits: 0,
  });
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState("all");

  // États pour le filtre de date
  const [dateRange, setDateRange] = useState({
    from: null,
    to: null,
  });
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);

  // États pour les données détaillées
  const [clientAppointments, setClientAppointments] = useState([]);
  const [clientTickets, setClientTickets] = useState([]);
  const [clientTransactions, setClientTransactions] = useState([]);

  // État pour le chargement des activités
  const [loadingActivities, setLoadingActivities] = useState(false);

  useEffect(() => {
    if (currentUser?.profile?.tenant_id) {
      fetchClients();
    }
  }, [currentUser]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        setClients([]);
        setFilteredClients([]);
        setLoading(false);
        return;
      }

      // Récupérer tous les clients du tenant
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select(
          `
          *,
          profile:profile_id (
            id,
            full_name,
            email,
            phone,
            avatar
          )
        `
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (clientsError) throw clientsError;

      // Pour chaque client, récupérer ses statistiques
      const clientsWithStats = await Promise.all(
        (clientsData || []).map(async (client) => {
          // Récupérer les rendez-vous
          const { data: appointments } = await supabase
            .from("appointments")
            .select("id, status, total_price, created_at, appointment_date")
            .eq("client_id", client.id);

          // Récupérer les tickets
          const { data: tickets } = await supabase
            .from("tickets")
            .select("id, status, service_price, created_at, date")
            .eq("client_id", client.id);

          // Récupérer les transactions (achats)
          const { data: transactions } = await supabase
            .from("transactions")
            .select("id, amount, status, created_at, transaction_date")
            .eq("client_id", client.id);

          const totalAppointments = appointments?.length || 0;
          const completedAppointments =
            appointments?.filter((a) => a.status === "completed").length || 0;
          const totalTickets = tickets?.length || 0;
          const completedTickets =
            tickets?.filter(
              (t) => t.status === "served" || t.status === "completed"
            ).length || 0;
          const totalTransactions = transactions?.length || 0;

          const totalRevenue =
            (appointments || [])
              .filter((a) => a.status === "completed")
              .reduce((sum, a) => sum + (a.total_price || 0), 0) +
            (tickets || [])
              .filter((t) => t.status === "served" || t.status === "completed")
              .reduce((sum, t) => sum + (t.service_price || 0), 0) +
            (transactions || [])
              .filter((t) => t.status === "completed")
              .reduce((sum, t) => sum + (t.amount || 0), 0);

          // Récupérer toutes les dates d'activité
          const activityDates = [
            ...(appointments || []).map((a) => ({
              date: a.appointment_date || a.created_at,
              type: "appointment",
            })),
            ...(tickets || []).map((t) => ({
              date: t.date || t.created_at,
              type: "ticket",
            })),
            ...(transactions || []).map((t) => ({
              date: t.transaction_date || t.created_at,
              type: "transaction",
            })),
          ];

          // Trier par date
          activityDates.sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          );

          const lastVisit = activityDates.length > 0 ? activityDates[0].date : null;
          const totalVisits = totalAppointments + totalTickets;

          return {
            ...client,
            full_name: client.profile?.full_name || client.name || "Client",
            email: client.profile?.email || client.email || "",
            phone: client.profile?.phone || client.phone || "",
            totalAppointments,
            completedAppointments,
            totalTickets,
            completedTickets,
            totalTransactions,
            totalRevenue,
            totalVisits,
            lastVisit,
            loyalty_points: client.loyalty_points || 0,
            activityDates, // Ajout des dates d'activité
          };
        })
      );

      setClients(clientsWithStats);
      setFilteredClients(clientsWithStats);

      // Calculer les statistiques globales
      const total = clientsWithStats.length;
      const active = clientsWithStats.filter((c) => c.totalVisits > 0).length;
      const newClients = clientsWithStats.filter((c) => {
        const created = new Date(c.created_at);
        const now = new Date();
        const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      }).length;
      const loyal = clientsWithStats.filter((c) => c.totalVisits >= 5).length;
      const totalRevenue = clientsWithStats.reduce(
        (sum, c) => sum + c.totalRevenue,
        0
      );
      const totalVisits = clientsWithStats.reduce(
        (sum, c) => sum + c.totalVisits,
        0
      );

      setStats({
        total,
        active,
        new: newClients,
        loyal,
        totalRevenue,
        totalVisits,
      });
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Erreur lors du chargement des clients");
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les clients par activité (date)
  const filterClientsByActivity = useCallback((clientsList, fromDate, toDate) => {
    if (!fromDate) return clientsList;

    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    
    const to = toDate ? new Date(toDate) : new Date(from);
    to.setHours(23, 59, 59, 999);

    return clientsList.filter((client) => {
      // Vérifier si le client a des activités dans la période
      const hasActivity = client.activityDates?.some((activity) => {
        const activityDate = new Date(activity.date);
        return activityDate >= from && activityDate <= to;
      });

      return hasActivity;
    });
  }, []);

  // Filtrer les clients
  useEffect(() => {
    let filtered = [...clients];

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.phone?.includes(searchTerm)
      );
    }

    // Filtre par type
    if (filterType === "active") {
      filtered = filtered.filter((c) => c.totalVisits > 0);
    } else if (filterType === "loyal") {
      filtered = filtered.filter((c) => c.totalVisits >= 5);
    } else if (filterType === "new") {
      filtered = filtered.filter((c) => {
        const created = new Date(c.created_at);
        const now = new Date();
        const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
      });
    }

    // Filtre par date d'activité (période)
    if (dateRange.from) {
      filtered = filterClientsByActivity(filtered, dateRange.from, dateRange.to);
    }

    setFilteredClients(filtered);
  }, [clients, searchTerm, filterType, dateRange, filterClientsByActivity]);

  // Calculer les statistiques filtrées
  const getFilteredStats = useCallback(() => {
    const total = filteredClients.length;
    const active = filteredClients.filter((c) => c.totalVisits > 0).length;
    const newClients = filteredClients.filter((c) => {
      const created = new Date(c.created_at);
      const now = new Date();
      const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    }).length;
    const loyal = filteredClients.filter((c) => c.totalVisits >= 5).length;
    const totalRevenue = filteredClients.reduce(
      (sum, c) => sum + c.totalRevenue,
      0
    );
    const totalVisits = filteredClients.reduce(
      (sum, c) => sum + c.totalVisits,
      0
    );

    return { total, active, new: newClients, loyal, totalRevenue, totalVisits };
  }, [filteredClients]);

  // Récupérer les détails d'un client
  const fetchClientDetails = async (clientId) => {
    try {
      // Rendez-vous du client
      const { data: appointments } = await supabase
        .from("appointments")
        .select(
          `
          *,
          service:service_id (
            id, name, price
          ),
          employee:employee_id (
            id,
            profile:profile_id (
              full_name
            )
          )
        `
        )
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      // Tickets du client
      const { data: tickets } = await supabase
        .from("tickets")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      // Transactions du client
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      setClientAppointments(appointments || []);
      setClientTickets(tickets || []);
      setClientTransactions(transactions || []);
    } catch (error) {
      console.error("Error fetching client details:", error);
      toast.error("Erreur lors du chargement des détails");
    }
  };

  const openClientDetails = async (client) => {
    setSelectedClient(client);
    setIsDetailsOpen(true);
    await fetchClientDetails(client.id);
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: {
        label: "En attente",
        className: "bg-yellow-100 text-yellow-800",
      },
      confirmed: { label: "Confirmé", className: "bg-blue-100 text-blue-800" },
      in_progress: {
        label: "En cours",
        className: "bg-purple-100 text-purple-800",
      },
      completed: { label: "Terminé", className: "bg-green-100 text-green-800" },
      cancelled: { label: "Annulé", className: "bg-red-100 text-red-800" },
      served: { label: "Servi", className: "bg-green-100 text-green-800" },
      waiting: {
        label: "En attente",
        className: "bg-yellow-100 text-yellow-800",
      },
    };
    return config[status] || config.pending;
  };

  const getLoyaltyLevel = (points) => {
    if (points >= 100)
      return { label: "⭐ VIP", className: "bg-purple-100 text-purple-800" };
    if (points >= 50)
      return { label: "🌟 Régulier", className: "bg-blue-100 text-blue-800" };
    if (points >= 20)
      return { label: "✨ Fidèle", className: "bg-green-100 text-green-800" };
    return { label: "🆕 Nouveau", className: "bg-gray-100 text-gray-800" };
  };

  // Exporter selon le type sélectionné
  const exportToExcel = async () => {
    setExporting(true);
    try {
      let dataToExport = [];

      // Déterminer les données à exporter selon le type
      if (exportType === "all") {
        // Tous les clients
        dataToExport = clients;
      } else if (exportType === "filtered") {
        // Clients filtrés (recherche + statut + date)
        dataToExport = filteredClients;
      } else if (exportType === "period") {
        // Clients par période (calendrier)
        if (!dateRange.from) {
          toast.error("Veuillez sélectionner une période");
          setExporting(false);
          return;
        }
        dataToExport = filteredClients;
      }

      if (dataToExport.length === 0) {
        toast.warning("Aucun client à exporter");
        setExporting(false);
        return;
      }

      const formattedData = dataToExport.map((c) => ({
        "Nom complet": c.full_name || "",
        Email: c.email || "",
        Téléphone: c.phone || "",
        "Rendez-vous": c.totalAppointments || 0,
        "RDV terminés": c.completedAppointments || 0,
        Tickets: c.totalTickets || 0,
        "Tickets servis": c.completedTickets || 0,
        Achats: c.totalTransactions || 0,
        "Revenu total": c.totalRevenue || 0,
        "Visites totales": c.totalVisits || 0,
        "Points fidélité": c.loyalty_points || 0,
        "Date création": c.created_at
          ? format(new Date(c.created_at), "dd/MM/yyyy HH:mm")
          : "",
        "Dernière visite": c.lastVisit
          ? format(new Date(c.lastVisit), "dd/MM/yyyy HH:mm")
          : "Jamais",
        Statut: c.totalVisits > 0 ? "Actif" : "Inactif",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(formattedData);

      // Ajuster les largeurs des colonnes
      const colWidths = [
        { wch: 25 },
        { wch: 30 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
      ];
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Clients");

      // Générer le nom du fichier avec la période si nécessaire
      let fileName = `clients_${format(new Date(), "yyyy-MM-dd")}`;
      if (exportType === "period" && dateRange.from) {
        const fromStr = format(dateRange.from, "yyyy-MM-dd");
        const toStr = dateRange.to
          ? format(dateRange.to, "yyyy-MM-dd")
          : fromStr;
        fileName = `clients_activite_${fromStr}_${toStr}`;
      } else if (exportType === "filtered") {
        fileName = `clients_filtrés_${format(new Date(), "yyyy-MM-dd")}`;
      }
      fileName += ".xlsx";

      XLSX.writeFile(wb, fileName);

      let message = `Export de ${dataToExport.length} clients réussi`;
      if (exportType === "period" && dateRange.from) {
        const fromStr = format(dateRange.from, "dd/MM/yyyy");
        const toStr = dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : fromStr;
        message += ` pour la période du ${fromStr} au ${toStr}`;
      }
      toast.success(message);
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  // ✅ Composant de détails client
  const ClientDetailsModal = () => {
    if (!selectedClient) return null;

    return (
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-black border border-gray-700 text-white">
          <DialogHeader className="border-b border-gray-700 pb-4">
            <DialogTitle className="flex items-center gap-3 text-2xl text-white">
              <div className="p-2 rounded-xl bg-primary/20">
                <User className="h-6 w-6 text-primary" />
              </div>
              <span className="text-white">{selectedClient.full_name}</span>
            </DialogTitle>
            <DialogDescription className="text-gray-400 flex items-center gap-2">
              <Mail className="h-4 w-4" /> {selectedClient.email}
              {selectedClient.phone && (
                <>
                  <span className="text-gray-600">•</span>
                  <Phone className="h-4 w-4" /> {selectedClient.phone}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Statistiques client */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-gray-400">Rendez-vous</p>
                  <p className="text-xl font-bold text-primary">
                    {clientAppointments.length}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-gray-400">Tickets</p>
                  <p className="text-xl font-bold text-blue-400">
                    {clientTickets.length}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-gray-400">Achats</p>
                  <p className="text-xl font-bold text-green-400">
                    {clientTransactions.length}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-gray-400">Points</p>
                  <p className="text-xl font-bold text-yellow-400">
                    {selectedClient.loyalty_points}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Rendez-vous du client */}
            {clientAppointments.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Rendez-vous (
                  {clientAppointments.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {clientAppointments.slice(0, 5).map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {appt.service?.name || "Service"} -{" "}
                          {appt.total_price?.toLocaleString() || 0} FCFA
                        </p>
                        <p className="text-xs text-gray-400">
                          {appt.appointment_date} à {appt.start_time}
                        </p>
                      </div>
                      <Badge className={getStatusBadge(appt.status).className}>
                        {getStatusBadge(appt.status).label}
                      </Badge>
                    </div>
                  ))}
                  {clientAppointments.length > 5 && (
                    <p className="text-xs text-gray-500 text-center">
                      + {clientAppointments.length - 5} autres
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tickets du client */}
            {clientTickets.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <Ticket className="h-4 w-4" /> Tickets ({clientTickets.length}
                  )
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {clientTickets.slice(0, 5).map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          #{ticket.ticket_number} -{" "}
                          {ticket.service_type || "Service"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {ticket.date} •{" "}
                          {ticket.service_price?.toLocaleString() || 0} FCFA
                        </p>
                      </div>
                      <Badge
                        className={getStatusBadge(ticket.status).className}
                      >
                        {getStatusBadge(ticket.status).label}
                      </Badge>
                    </div>
                  ))}
                  {clientTickets.length > 5 && (
                    <p className="text-xs text-gray-500 text-center">
                      + {clientTickets.length - 5} autres
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Transactions du client */}
            {clientTransactions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" /> Achats (
                  {clientTransactions.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {clientTransactions.slice(0, 5).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {transaction.service_name || "Achat"} -{" "}
                          {transaction.amount?.toLocaleString() || 0} FCFA
                        </p>
                        <p className="text-xs text-gray-400">
                          {transaction.transaction_date ||
                            format(
                              new Date(transaction.created_at),
                              "dd/MM/yyyy"
                            )}
                        </p>
                      </div>
                      <Badge
                        className={
                          transaction.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {transaction.status === "completed"
                          ? "✅ Payé"
                          : "⏳ En attente"}
                      </Badge>
                    </div>
                  ))}
                  {clientTransactions.length > 5 && (
                    <p className="text-xs text-gray-500 text-center">
                      + {clientTransactions.length - 5} autres
                    </p>
                  )}
                </div>
              </div>
            )}

            {clientAppointments.length === 0 &&
              clientTickets.length === 0 &&
              clientTransactions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Aucune activité pour ce client</p>
                </div>
              )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Composant pour le sélecteur de type d'export
  const ExportSelector = () => (
    <div className="flex items-center gap-2">
      <Select value={exportType} onValueChange={setExportType}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Type d'export" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">📊 Tous les clients</SelectItem>
          <SelectItem value="filtered">🔍 Clients filtrés</SelectItem>
          <SelectItem value="period">📅 Par période d'activité</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="default"
        size="sm"
        className="gap-2"
        onClick={exportToExcel}
        disabled={exporting || filteredClients.length === 0}
      >
        {exporting ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Exporter
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const filteredStats = getFilteredStats();

  // Formater la date pour l'affichage
  const formatDateRange = () => {
    if (!dateRange.from) return null;
    const fromStr = format(dateRange.from, "dd MMMM yyyy", { locale: fr });
    if (dateRange.to) {
      const toStr = format(dateRange.to, "dd MMMM yyyy", { locale: fr });
      return `du ${fromStr} au ${toStr}`;
    }
    return `du ${fromStr}`;
  };

  return (
    <div className="space-y-6 p-3 sm:p-4 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            Clients
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez vos clients et leur historique
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportSelector />
          <Button
            onClick={fetchClients}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
          <Button size="sm" className="gap-2" asChild>
            <Link to="/admin/clients/new">
              <UserPlus className="h-4 w-4" />
              Nouveau client
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistiques filtrées */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-none shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{filteredStats.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Actifs</p>
                <p className="text-xl font-bold text-green-600">
                  {filteredStats.active}
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Nouveaux</p>
                <p className="text-xl font-bold text-blue-600">
                  {filteredStats.new}
                </p>
              </div>
              <UserPlus className="h-8 w-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Fidèles</p>
                <p className="text-xl font-bold text-purple-600">
                  {filteredStats.loyal}
                </p>
              </div>
              <Award className="h-8 w-8 text-purple-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-yellow-50 to-yellow-100/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">CA total</p>
                <p className="text-xl font-bold text-yellow-600">
                  {filteredStats.totalRevenue.toLocaleString()} FCFA
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email ou téléphone..."
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Sélecteur de date d'activité */}
          <Popover open={isDateFilterOpen} onOpenChange={setIsDateFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-auto justify-start text-left font-normal",
                  !dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                      {format(dateRange.to, "dd/MM/yyyy")}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yyyy")
                  )
                ) : (
                  <span>Période d'activité</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                  if (range?.to) {
                    setIsDateFilterOpen(false);
                  }
                }}
                numberOfMonths={2}
                className="bg-popover"
                locale={fr}
              />
            </PopoverContent>
          </Popover>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48 bg-background">
              <SelectValue placeholder="Tous les clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              <SelectItem value="active">Clients actifs</SelectItem>
              <SelectItem value="loyal">Clients fidèles</SelectItem>
              <SelectItem value="new">Nouveaux clients</SelectItem>
            </SelectContent>
          </Select>

          {(searchTerm || dateRange.from || filterType !== "all") && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchTerm("");
                setDateRange({ from: null, to: null });
                setFilterType("all");
              }}
              size="sm"
              className="gap-1"
            >
              <X className="h-4 w-4" />
              Effacer les filtres
            </Button>
          )}
        </div>

        {/* Indicateurs de filtres actifs */}
        {(dateRange.from || filterType !== "all" || searchTerm) && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-3 w-3" />
            <span>Filtres actifs :</span>
            {dateRange.from && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Activité : {formatDateRange()}
              </Badge>
            )}
            {filterType !== "all" && (
              <Badge variant="secondary">
                {filterType === "active" && "Actifs"}
                {filterType === "loyal" && "Fidèles"}
                {filterType === "new" && "Nouveaux"}
              </Badge>
            )}
            {searchTerm && (
              <Badge variant="secondary" className="gap-1">
                <Search className="h-3 w-3" />
                {searchTerm}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Liste des clients */}
      <Card className="border-none shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Liste des clients</CardTitle>
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {filteredClients.length} clients
              {dateRange.from && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({formatDateRange()})
                </span>
              )}
            </Badge>
          </div>
          <CardDescription>
            {dateRange.from 
              ? `Clients ayant eu une activité ${formatDateRange()}`
              : "Consultez et gérez tous vos clients"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <Users className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">Aucun client trouvé</p>
              <p className="text-sm mt-1">
                {searchTerm || dateRange.from
                  ? "Modifiez vos filtres de recherche"
                  : "Commencez par ajouter des clients"}
              </p>
              {dateRange.from && (
                <p className="text-xs text-muted-foreground mt-2">
                  Aucun client n'a eu d'activité {formatDateRange()}
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Activité</TableHead>
                    <TableHead>Visites</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead className="text-right">CA</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => {
                    const loyaltyLevel = getLoyaltyLevel(client.loyalty_points);
                    return (
                      <TableRow key={client.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                              <span className="text-sm font-bold text-primary">
                                {client.full_name?.charAt(0) || "C"}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{client.full_name}</p>
                              <Badge
                                className={
                                  loyaltyLevel.className + " text-[10px]"
                                }
                              >
                                {loyaltyLevel.label}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {client.email && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {client.email}
                            </div>
                          )}
                          {client.phone && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {client.phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 flex-wrap">
                            {client.totalAppointments > 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                📅 {client.totalAppointments}
                              </Badge>
                            )}
                            {client.totalTickets > 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                🎫 {client.totalTickets}
                              </Badge>
                            )}
                            {client.totalTransactions > 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                🛍️ {client.totalTransactions}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {client.totalVisits}
                          </span>
                          {client.lastVisit && (
                            <div className="text-xs text-muted-foreground">
                              Dernière:{" "}
                              {format(new Date(client.lastVisit), "dd/MM/yyyy")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {client.loyalty_points}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {client.totalRevenue.toLocaleString()} FCFA
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openClientDetails(client)}
                            title="Voir détails"
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal détails client */}
      <ClientDetailsModal />

      <style>{`
        .step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }
        .step-active {
          background: #ec4899;
          color: white;
          box-shadow: 0 0 0 4px rgba(236, 72, 153, 0.2);
        }
        .step-completed {
          background: #22c55e;
          color: white;
        }
        .step-pending {
          background: #e5e7eb;
          color: #6b7280;
        }
        .step-connector {
          height: 2px;
          flex: 1;
          margin: 0 4px;
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  );
}