// /src/pages/admin/AdminTicketQueuePage.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Input } from "@/components/ui/input.jsx";
import { toast } from "sonner";
import {
  Ticket,
  Clock,
  User,
  Users,
  Bell,
  CheckCircle,
  XCircle,
  RefreshCw,
  Phone,
  Loader2,
  Search,
  Archive,
  Zap,
  Award,
  MapPin,
  FileSpreadsheet,
  FileText,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { useAudioAnnouncement } from "@/hooks/useAudioAnnouncement";

// ✅ Styles pour les cartes élégantes
const cardStyles = {
  stats:
    "relative overflow-hidden rounded-2xl border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50",
  ticket:
    "relative overflow-hidden rounded-2xl border-0 shadow-lg transition-all hover:shadow-xl group",
  called:
    "border-2 border-emerald-400/50 bg-gradient-to-br from-emerald-50 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/10 shadow-lg shadow-emerald-500/10",
  waiting: "hover:border-primary/20",
  inProgress:
    "border-2 border-indigo-400/50 bg-gradient-to-br from-indigo-50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/10",
  archived:
    "border-2 border-gray-400/50 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/30 dark:to-gray-900/20 opacity-75",
};

function AdminTicketQueuePage() {
  const { currentUser } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentCalling, setCurrentCalling] = useState([]); // ✅ Tableau pour plusieurs appels
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [debugInfo, setDebugInfo] = useState("");
  const [tenantId, setTenantId] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [archivedCount, setArchivedCount] = useState(0);
  const isMounted = useRef(true);
  const fetchingRef = useRef(false);

  // ✅ États pour la répétition de l'annonce (par ticket)
  const [announcementStates, setAnnouncementStates] = useState({});

  // ✅ Utiliser le hook d'annonce vocale
  const {
    isReady: audioReady,
    isPlaying: audioPlaying,
    announceTicket,
    playNotificationOnly,
  } = useAudioAnnouncement();

  // Récupérer les infos du tenant
  useEffect(() => {
    const fetchTenantInfo = async () => {
      const id = currentUser?.profile?.tenant_id;
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from("tenants")
          .select("id, name, logo_url, address, phone, email")
          .eq("id", id)
          .single();

        if (!error && data) {
          setTenantInfo(data);
        }
      } catch (error) {
        console.error("Error fetching tenant info:", error);
      }
    };

    fetchTenantInfo();
  }, [currentUser]);

  // Nettoyage
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ✅ Appliquer les filtres
  const applyFiltersToData = useCallback(
    (data) => {
      if (!data) return [];

      let filtered = [...data];

      if (filterStatus !== "all") {
        if (filterStatus === "archived") {
          filtered = filtered.filter((t) => t.status === "archived");
        } else if (filterStatus === "completed") {
          filtered = filtered.filter(
            (t) => t.status === "completed" || t.status === "archived",
          );
        } else if (filterStatus === "waiting") {
          filtered = filtered.filter((t) => t.status === "waiting");
        } else if (filterStatus === "called") {
          filtered = filtered.filter((t) => t.status === "called");
        } else if (filterStatus === "in_progress") {
          filtered = filtered.filter((t) => t.status === "in_progress");
        } else if (filterStatus === "cancelled") {
          filtered = filtered.filter((t) => t.status === "cancelled");
        }
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.ticket_number?.toString().includes(term) ||
            t.client_name?.toLowerCase().includes(term) ||
            t.service_type?.toLowerCase().includes(term) ||
            t.client_phone?.includes(term),
        );
      }

      setFilteredTickets(filtered);
      return filtered;
    },
    [filterStatus, searchTerm],
  );

  // ✅ Fonction fetchData
  const fetchData = useCallback(async () => {
    if (fetchingRef.current) {
      return;
    }

    const tenantId = currentUser?.profile?.tenant_id;
    if (!tenantId) {
      if (isMounted.current) {
        setTickets([]);
        setEmployees([]);
        setLoading(false);
        setDebugInfo("❌ Aucun tenant trouvé");
      }
      return;
    }

    fetchingRef.current = true;
    setLoading(true);

    try {
      const { data: allTickets, error: allError } = await supabase
        .from("tickets")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (allError) {
        throw allError;
      }

      const today = selectedDate || new Date().toISOString().split("T")[0];
      let ticketsData = allTickets || [];
      ticketsData = ticketsData.filter((t) => t.date === today);

      const archived = ticketsData.filter(
        (t) => t.status === "archived",
      ).length;
      setArchivedCount(archived);

      let debugMsg = "";
      if (ticketsData.length === 0 && allTickets && allTickets.length > 0) {
        ticketsData = allTickets.slice(0, 20);
        debugMsg = `⚠️ Aucun ticket pour le ${today}. Affichage des ${ticketsData.length} plus récents.`;
      } else if (ticketsData.length === 0) {
        debugMsg = `📭 Aucun ticket trouvé pour le ${today}`;
      } else {
        debugMsg = `✅ ${ticketsData.length} ticket(s) trouvé(s) pour le ${today} (${archived} archivés)`;
      }

      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select(
          `
          id,
          employee_number,
          is_available,
          profile:profile_id (full_name)
        `,
        )
        .eq("tenant_id", tenantId)
        .eq("is_active", true);

      if (employeesError) throw employeesError;

      if (isMounted.current) {
        setTenantId(tenantId);
        setTickets(ticketsData);
        setEmployees(employeesData || []);
        setDebugInfo(debugMsg);

        const filtered = applyFiltersToData(ticketsData);
        setFilteredTickets(filtered || []);

        // ✅ Récupérer TOUS les tickets en cours d'appel
        const callingTickets = ticketsData?.filter((t) => t.status === "called") || [];
        setCurrentCalling(callingTickets);

        setLoading(false);
      }
    } catch (error) {
      console.error("❌ Error fetching tickets:", error);
      if (isMounted.current) {
        toast.error("Erreur lors du chargement");
        setDebugInfo("❌ Erreur: " + error.message);
        setLoading(false);
      }
    } finally {
      fetchingRef.current = false;
    }
  }, [currentUser, selectedDate, applyFiltersToData]);

  // ✅ Fonction pour forcer l'actualisation
  const forceRefreshWithArchived = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error("Tenant non trouvé");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("date", selectedDate)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (isMounted.current) {
        setTickets(data || []);
        setArchivedCount(
          data?.filter((t) => t.status === "archived").length || 0,
        );
        const filtered = applyFiltersToData(data || []);
        setFilteredTickets(filtered || []);

        const callingTickets = data?.filter((t) => t.status === "called") || [];
        setCurrentCalling(callingTickets);

        toast.success(
          `✅ ${data?.length || 0} tickets chargés (${data?.filter((t) => t.status === "archived").length || 0} archivés)`,
        );
        setDebugInfo(
          `✅ ${data?.length || 0} tickets (${data?.filter((t) => t.status === "archived").length || 0} archivés)`,
        );
      }
    } catch (error) {
      console.error("❌ Error force refresh:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Mise à jour des filtres quand les tickets changent
  useEffect(() => {
    if (tickets.length > 0) {
      applyFiltersToData(tickets);
    }
  }, [tickets, applyFiltersToData]);

  // ✅ Mise à jour des états d'annonce
  useEffect(() => {
    const newStates = { ...announcementStates };
    const currentCallingIds = currentCalling.map(t => t.id);
    
    // Ajouter les nouveaux tickets appelés
    currentCalling.forEach((ticket) => {
      if (!newStates[ticket.id]) {
        const employee = employees.find(
          (e) => e.id === ticket.assigned_employee_id,
        );
        newStates[ticket.id] = {
          hasPlayed: false,
          ticket: ticket,
          employee: employee || null,
          employeeNumber: employee?.employee_number || "1",
        };
      }
    });

    // Supprimer les tickets qui ne sont plus en appel
    Object.keys(newStates).forEach((id) => {
      if (!currentCallingIds.includes(id)) {
        delete newStates[id];
      }
    });

    setAnnouncementStates(newStates);
  }, [currentCalling, employees]);

  // ✅ Abonnement aux changements
  useEffect(() => {
    if (
      currentUser?.profile?.role !== "admin" &&
      currentUser?.profile?.role !== "super_admin"
    ) {
      console.warn("⚠️ L'utilisateur n'est pas un admin");
      setLoading(false);
      return;
    }

    if (currentUser?.profile?.tenant_id) {
      fetchData();
    }

    const tenantId = currentUser?.profile?.tenant_id;
    if (!tenantId) return;

    const subscription = supabase
      .channel("admin_tickets_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if (isMounted.current) {
            if (
              payload.eventType === "UPDATE" &&
              payload.new.status === "called"
            ) {
              if (soundEnabled) {
                playNotificationOnly();
              }
            }
            fetchData();
          }
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser, fetchData, playNotificationOnly, soundEnabled]);

  // ✅ HANDLER APPEL - Plusieurs appels simultanés
  const handleCallTicket = async (ticketId, employeeId) => {
    try {
      const ticket = tickets.find((t) => t.id === ticketId);
      const employee = employees.find((e) => e.id === employeeId);

      if (!ticket) {
        toast.error("Ticket non trouvé");
        return;
      }

      // ✅ SUPPRESSION de la vérification d'appel unique
      // On peut maintenant appeler plusieurs tickets simultanément

      if (ticket.status !== "waiting") {
        toast.warning(
          `Le ticket #${ticket.ticket_number} n'est plus en attente`,
        );
        return;
      }

      const { error } = await supabase
        .from("tickets")
        .update({
          status: "called",
          assigned_employee_id: employeeId,
          called_at: new Date().toISOString(),
        })
        .eq("id", ticketId)
        .eq("status", "waiting");

      if (error) throw error;

      toast.success(
        `📢 Client appelé à la place ${employee?.employee_number || "?"}!`,
      );

      // ✅ Stocker l'état d'annonce pour ce ticket
      const employeeNumber = employee?.employee_number || "1";
      setAnnouncementStates((prev) => ({
        ...prev,
        [ticketId]: {
          hasPlayed: false,
          ticket: ticket,
          employee: employee,
          employeeNumber: employeeNumber,
        },
      }));

      // ✅ Jouer l'annonce vocale (sans pause après notification)
      if (soundEnabled && audioReady) {
        await announceTicket(ticket.ticket_number, employeeNumber);
        setAnnouncementStates((prev) => ({
          ...prev,
          [ticketId]: {
            ...prev[ticketId],
            hasPlayed: true,
          },
        }));
      } else if (soundEnabled) {
        await playNotificationOnly();
        setAnnouncementStates((prev) => ({
          ...prev,
          [ticketId]: {
            ...prev[ticketId],
            hasPlayed: true,
          },
        }));
      }

      await fetchData();
    } catch (error) {
      console.error("Error calling ticket:", error);
      toast.error("Erreur lors de l'appel");
    }
  };

  // ✅ Fonction pour répéter l'annonce d'un ticket spécifique
  const handleRepeatAnnouncement = async (ticketId) => {
    const state = announcementStates[ticketId];
    if (!state) {
      toast.error("Aucun appel en cours à répéter");
      return;
    }

    const { ticket, employeeNumber } = state;

    const currentTicket = tickets.find((t) => t.id === ticket.id);
    if (!currentTicket || currentTicket.status !== "called") {
      toast.warning("Ce ticket n'est plus en cours d'appel");
      setAnnouncementStates((prev) => {
        const newState = { ...prev };
        delete newState[ticketId];
        return newState;
      });
      return;
    }

    toast.info(`🔊 Répétition de l'appel du ticket #${ticket.ticket_number}`);

    if (soundEnabled && audioReady) {
      await announceTicket(ticket.ticket_number, employeeNumber);
    } else if (soundEnabled) {
      await playNotificationOnly();
    }
  };

  // ✅ Fonction pour basculer le son
  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    if (!soundEnabled) {
      toast.info("🔊 Son activé");
      if (audioReady) {
        playNotificationOnly();
      }
    } else {
      toast.info("🔇 Son désactivé");
    }
  };

  const handleStartService = async (ticketId) => {
    try {
      const { error } = await supabase
        .from("tickets")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (error) throw error;

      toast.success("💪 Service commencé !");
      fetchData();
    } catch (error) {
      console.error("Error starting service:", error);
      toast.error("Erreur lors du démarrage");
    }
  };

  const handleCompleteService = async (ticketId) => {
    try {
      const { error } = await supabase
        .from("tickets")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (error) throw error;

      toast.success("🎉 Service terminé !");
      fetchData();
    } catch (error) {
      console.error("Error completing service:", error);
      toast.error("Erreur lors de la finalisation");
    }
  };

  // ✅ EXPORT EXCEL
  const exportToExcel = async () => {
    setExporting(true);
    try {
      let exportData = [];

      const { data: allData } = await supabase
        .from("tickets")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("date", selectedDate);

      let filtered = allData || [];

      if (filterStatus !== "all") {
        if (filterStatus === "archived") {
          filtered = filtered.filter((t) => t.status === "archived");
        } else if (filterStatus === "completed") {
          filtered = filtered.filter(
            (t) => t.status === "completed" || t.status === "archived",
          );
        } else {
          filtered = filtered.filter((t) => t.status === filterStatus);
        }
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.ticket_number?.toString().includes(term) ||
            t.client_name?.toLowerCase().includes(term) ||
            t.service_type?.toLowerCase().includes(term) ||
            t.client_phone?.includes(term),
        );
      }
      exportData = filtered;

      if (exportData.length === 0) {
        toast.warning("Aucun ticket à exporter");
        setExporting(false);
        return;
      }

      const dataToExport = exportData.map((ticket) => ({
        Numéro: ticket.ticket_number,
        Client: ticket.client_name || "Client",
        "📱 Téléphone": ticket.client_phone || "",
        Service: ticket.service_type || "",
        Statut: getStatusLabel(ticket.status),
        Date: ticket.date ? format(new Date(ticket.date), "dd/MM/yyyy") : "",
        Heure: ticket.created_at
          ? format(new Date(ticket.created_at), "HH:mm")
          : "",
        Secteur: ticket.client_sector || "",
        Employé: ticket.assigned_employee_id
          ? employees.find((e) => e.id === ticket.assigned_employee_id)?.profile
              ?.full_name || ""
          : "",
        "Archivé le": ticket.archived_at
          ? format(new Date(ticket.archived_at), "dd/MM/yyyy HH:mm")
          : "",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      XLSX.utils.book_append_sheet(wb, ws, "Tickets");

      const colWidths = [
        { wch: 10 },
        { wch: 25 },
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
        { wch: 20 },
        { wch: 25 },
        { wch: 20 },
      ];
      ws["!cols"] = colWidths;

      const fileName = `tickets_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success(`Export Excel réussi (${dataToExport.length} tickets)`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Erreur lors de l'export Excel");
    } finally {
      setExporting(false);
    }
  };

  // ✅ EXPORT PDF
  const exportToPDF = async () => {
    setExporting(true);
    try {
      let exportData = [];

      const { data: allData } = await supabase
        .from("tickets")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("date", selectedDate);

      let filtered = allData || [];

      if (filterStatus !== "all") {
        if (filterStatus === "archived") {
          filtered = filtered.filter((t) => t.status === "archived");
        } else if (filterStatus === "completed") {
          filtered = filtered.filter(
            (t) => t.status === "completed" || t.status === "archived",
          );
        } else {
          filtered = filtered.filter((t) => t.status === filterStatus);
        }
      }
      exportData = filtered;

      if (exportData.length === 0) {
        toast.warning("Aucun ticket à exporter");
        setExporting(false);
        return;
      }

      const statusLabel =
        filterStatus !== "all" ? getStatusLabel(filterStatus) : "Tous";
      const logoUrl = tenantInfo?.logo_url || "";

      const content = `
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Tickets - ${format(new Date(), "dd/MM/yyyy")}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
              .header { 
                text-align: center; 
                margin-bottom: 30px; 
                border-bottom: 2px solid #ec4899; 
                padding-bottom: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 20px;
              }
              .header-logo { flex-shrink: 0; }
              .header-logo img { max-height: 60px; max-width: 120px; object-fit: contain; }
              .header-text { text-align: center; }
              .header h1 { color: #ec4899; font-size: 24px; margin: 0; }
              .header p { color: #666; margin: 5px 0; }
              .header .date { font-size: 16px; font-weight: bold; color: #333; }
              .header .status-filter { 
                display: inline-block; 
                padding: 4px 16px; 
                border-radius: 20px; 
                font-size: 14px; 
                font-weight: bold;
                margin-top: 8px;
                background: #ec4899;
                color: white;
              }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #ec4899; color: white; padding: 12px; text-align: left; font-size: 14px; }
              td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
              .status-waiting { background-color: #fef3c7; color: #92400e; }
              .status-called { background-color: #dbeafe; color: #1e40af; }
              .status-in_progress { background-color: #ede9fe; color: #5b21b6; }
              .status-completed { background-color: #d1fae5; color: #065f46; }
              .status-cancelled { background-color: #fee2e2; color: #991b1b; }
              .status-archived { background-color: #e5e7eb; color: #6b7280; }
              .phone-number {
                font-family: 'Courier New', monospace;
                font-weight: bold;
                color: #059669;
                background: #f0fdf4;
                padding: 2px 8px;
                border-radius: 4px;
                border: 1px solid #bbf7d0;
              }
              .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
              .total { font-weight: bold; margin-top: 15px; text-align: right; font-size: 16px; }
              .summary { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; flex-wrap: wrap; gap: 10px; }
              .summary-item { text-align: center; min-width: 80px; }
              .summary-item .number { font-size: 20px; font-weight: bold; color: #ec4899; }
              .summary-item .label { font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              ${
                logoUrl
                  ? `
                <div class="header-logo">
                  <img src="${logoUrl}" alt="${tenantInfo?.name || "Salon"}" />
                </div>
              `
                  : ""
              }
              <div class="header-text">
                <h1>${tenantInfo?.name || "BeautyFlow"}</h1>
                <p>${tenantInfo?.address || ""}</p>
                <p>📞 ${tenantInfo?.phone || ""} | ✉️ ${tenantInfo?.email || ""}</p>
                <div class="date">📅 Tickets du ${format(new Date(selectedDate), "EEEE d MMMM yyyy", { locale: fr })}</div>
                <div class="status-filter">Statut: ${statusLabel}</div>
              </div>
            </div>

            <div class="summary">
              <div class="summary-item">
                <div class="number">${exportData.length}</div>
                <div class="label">Total tickets</div>
              </div>
              <div class="summary-item">
                <div class="number">${exportData.filter((t) => t.status === "waiting").length}</div>
                <div class="label">En attente</div>
              </div>
              <div class="summary-item">
                <div class="number">${exportData.filter((t) => t.status === "called").length}</div>
                <div class="label">Appelés</div>
              </div>
              <div class="summary-item">
                <div class="number">${exportData.filter((t) => t.status === "in_progress").length}</div>
                <div class="label">En cours</div>
              </div>
              <div class="summary-item">
                <div class="number">${exportData.filter((t) => t.status === "completed").length}</div>
                <div class="label">Terminés</div>
              </div>
              <div class="summary-item">
                <div class="number">${exportData.filter((t) => t.status === "archived").length}</div>
                <div class="label">Archivés</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Client</th>
                  <th>📱 Téléphone</th>
                  <th>Service</th>
                  <th>Statut</th>
                  <th>Heure</th>
                  <th>Secteur</th>
                  <th>Archivé le</th>
                </tr>
              </thead>
              <tbody>
                ${exportData
                  .sort((a, b) => a.ticket_number - b.ticket_number)
                  .map(
                    (ticket) => `
                    <tr>
                      <td>#${ticket.ticket_number}</td>
                      <td>${ticket.client_name || "Client"}</td>
                      <td>${ticket.client_phone ? `<span class="phone-number">📱 ${ticket.client_phone}</span>` : "-"}</td>
                      <td>${ticket.service_type || "-"}</td>
                      <td><span class="status status-${ticket.status}">${getStatusLabel(ticket.status)}</span></td>
                      <td>${ticket.created_at ? format(new Date(ticket.created_at), "HH:mm") : ""}</td>
                      <td>${ticket.client_sector || "-"}</td>
                      <td>${ticket.archived_at ? format(new Date(ticket.archived_at), "dd/MM/yyyy HH:mm") : "-"}</td>
                    </tr>
                  `,
                  )
                  .join("")}
              </tbody>
            </table>

            <div class="total">
              Total: ${exportData.length} tickets
            </div>

            <div class="footer">
              Document généré le ${format(new Date(), "dd/MM/yyyy à HH:mm")} • ${tenantInfo?.name || "BeautyFlow"}
            </div>
          </body>
        </html>
      `;

      const blob = new Blob([content], { type: "text/html" });
      const url = URL.createObjectURL(blob);

      const printWindow = window.open(
        url,
        "_blank",
        "width=800,height=600,scrollbars=yes",
      );
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            URL.revokeObjectURL(url);
          }, 500);
        };
      } else {
        toast.error("Impossible d'ouvrir la fenêtre d'impression");
      }

      toast.success(`Export PDF réussi (${exportData.length} tickets)`);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast.error("Erreur lors de l'export PDF");
    } finally {
      setExporting(false);
    }
  };

  // ✅ RÉINITIALISATION
  const handleResetDay = async () => {
    if (
      !confirm(
        "⚠️ ATTENTION : Cette action va :\n\n" +
          "1️⃣ Archiver TOUS les tickets du jour (quel que soit leur statut)\n" +
          "2️⃣ Réinitialiser le compteur à 0\n" +
          "3️⃣ Les tickets archivés ne seront plus visibles dans la file\n\n" +
          "Les tickets restent dans la base pour historique.\n\n" +
          "Voulez-vous continuer ?",
      )
    )
      return;

    setExporting(true);
    try {
      const today = selectedDate || new Date().toISOString().split("T")[0];

      const { data: todayTickets, error: fetchError } = await supabase
        .from("tickets")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("date", today)
        .neq("status", "archived");

      if (fetchError) throw fetchError;

      if (todayTickets && todayTickets.length > 0) {
        const { error: archiveError } = await supabase
          .from("tickets")
          .update({
            status: "archived",
            archived_at: new Date().toISOString(),
          })
          .eq("tenant_id", tenantId)
          .eq("date", today)
          .neq("status", "archived");

        if (archiveError) throw archiveError;

        toast.success(
          `📦 ${todayTickets.length} tickets archivés - Compteur réinitialisé`,
        );
      } else {
        toast.info("Aucun ticket à archiver aujourd'hui");
      }

      setShowResetDialog(false);
      await fetchData();
    } catch (error) {
      console.error("Error resetting day:", error);
      toast.error("Erreur lors de la réinitialisation: " + error.message);
    } finally {
      setExporting(false);
    }
  };

  // ✅ Fonctions de statut
  const getStatusLabel = (status) => {
    const labels = {
      waiting: "En attente",
      called: "Appelé 📢",
      in_progress: "En cours 💆",
      completed: "Terminé ✅",
      cancelled: "Annulé ❌",
      archived: "📦 Archivé",
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status) => {
    const config = {
      waiting: {
        label: "En attente",
        className: "bg-amber-100 text-amber-800 border-amber-200",
      },
      called: {
        label: "📢 Appelé",
        className:
          "bg-emerald-100 text-emerald-800 border-emerald-200 animate-pulse",
      },
      in_progress: {
        label: "💆 En cours",
        className: "bg-indigo-100 text-indigo-800 border-indigo-200",
      },
      completed: {
        label: "✅ Terminé",
        className: "bg-green-100 text-green-800 border-green-200",
      },
      cancelled: {
        label: "❌ Annulé",
        className: "bg-gray-100 text-gray-800 border-gray-200",
      },
      archived: {
        label: "📦 Archivé",
        className: "bg-gray-100 text-gray-500 border-gray-200",
      },
    };
    return config[status] || config.waiting;
  };

  const getStatusIcon = (status) => {
    const icons = {
      waiting: Clock,
      called: Bell,
      in_progress: Zap,
      completed: CheckCircle,
      cancelled: XCircle,
      archived: Archive,
    };
    const Icon = icons[status] || Clock;
    return <Icon className="h-3.5 w-3.5" />;
  };

  // ✅ Statistiques
  const stats = {
    waiting: tickets.filter((t) => t.status === "waiting").length,
    called: tickets.filter((t) => t.status === "called").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    completed: tickets.filter((t) => t.status === "completed").length,
    archived: tickets.filter((t) => t.status === "archived").length,
    total: tickets.length,
  };

  const statsConfig = [
    {
      key: "waiting",
      label: "En attente",
      value: stats.waiting,
      color: "amber",
      icon: Clock,
    },
    {
      key: "called",
      label: "Appelés",
      value: stats.called,
      color: "emerald",
      icon: Bell,
    },
    {
      key: "inProgress",
      label: "En cours",
      value: stats.inProgress,
      color: "indigo",
      icon: Zap,
    },
    {
      key: "completed",
      label: "Terminés",
      value: stats.completed,
      color: "green",
      icon: Award,
    },
    {
      key: "archived",
      label: "Archivés",
      value: stats.archived,
      color: "gray",
      icon: Archive,
    },
    {
      key: "total",
      label: "Total",
      value: stats.total,
      color: "gray",
      icon: Users,
    },
  ];

  // ✅ Dialog de confirmation de réinitialisation
  const renderResetDialog = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="max-w-lg w-full mx-4 p-6 border-0 shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">
            ⚠️ Réinitialisation de la file
          </h3>
          <p className="text-muted-foreground mb-4">
            Cette action va archiver TOUS les tickets du jour et réinitialiser
            le compteur.
            <br />
            <span className="text-red-500 font-semibold">
              Cette action est irréversible.
            </span>
          </p>

          <div className="flex flex-col gap-2 mb-4 p-4 bg-muted/20 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tickets à archiver</span>
              <span className="font-bold">{filteredTickets.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="font-bold">
                {format(new Date(selectedDate), "dd/MM/yyyy")}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowResetDialog(false)}
              disabled={exporting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-2"
              onClick={handleResetDay}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Confirmer
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Ticket className="h-7 w-7 text-primary" />
            </div>
            File d'attente
          </h1>
          <p className="text-muted-foreground">
            Gérez les tickets des clients -{" "}
            {format(new Date(selectedDate), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            {debugInfo}
            {audioReady && !audioPlaying && (
              <span className="text-emerald-500 font-medium">
                🔊 Audio prêt
              </span>
            )}
            {audioPlaying && (
              <span className="text-amber-500 font-medium animate-pulse">
                🔊 Annonce en cours...
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              disabled={exporting}
              className="gap-2 border-green-500 text-green-600 hover:bg-green-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              disabled={exporting}
              className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>

          <Button
            variant={soundEnabled ? "default" : "outline"}
            size="sm"
            onClick={toggleSound}
            className={`gap-2 rounded-xl ${
              soundEnabled
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/20"
                : "text-muted-foreground hover:text-primary hover:bg-primary/10"
            }`}
            title={soundEnabled ? "Désactiver le son" : "Activer le son"}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="h-4 w-4" />
                Son ON
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4" />
                Son OFF
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={forceRefreshWithArchived}
            disabled={loading}
            className="gap-2 border-amber-500 text-amber-600 hover:bg-amber-50"
          >
            <Archive className="h-4 w-4" />
            Afficher tous
          </Button>

          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />

          <Button onClick={fetchData} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>

          <Button
            onClick={() => setShowResetDialog(true)}
            variant="destructive"
            className="gap-2"
            disabled={filteredTickets.length === 0}
          >
            <Trash2 className="h-4 w-4" />
            Réinitialiser
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-6">
        {statsConfig.map((stat, index) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <Card
              className={`${cardStyles.stats} border-l-4 border-l-${stat.color}-500`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <p
                      className={`text-2xl font-bold text-${stat.color}-600 mt-0.5`}
                    >
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-xl bg-${stat.color}-500/10`}>
                    <stat.icon className={`h-5 w-5 text-${stat.color}-500`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, numéro, téléphone ou service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">Tous les statuts</option>
          <option value="waiting">En attente</option>
          <option value="called">Appelés</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Terminés</option>
          <option value="cancelled">Annulés</option>
          <option value="archived">📦 Archivés</option>
        </select>
      </div>

      {/* Liste des tickets */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-primary" />
            <span className="font-medium">Tickets</span>
            <Badge variant="secondary" className="ml-2">
              {filteredTickets.length}
            </Badge>
            {archivedCount > 0 && (
              <Badge variant="outline" className="ml-1 text-gray-500">
                📦 {archivedCount} archivés
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {filteredTickets.filter((t) => t.status === "waiting").length} en
            attente
          </span>
        </div>

        <CardContent className="p-0">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-4 rounded-full bg-muted/20 mx-auto w-fit mb-4">
                <Ticket className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">
                Aucun ticket trouvé
              </p>
              <p className="text-sm text-muted-foreground/60">
                {searchTerm
                  ? "Essayez de modifier votre recherche"
                  : "Aucun ticket pour cette date"}
              </p>
              <p className="text-xs text-muted-foreground/40 mt-2">
                💡 {debugInfo}
              </p>
              <div className="flex gap-2 justify-center mt-4">
                <Button
                  variant="outline"
                  className="gap-2 rounded-xl"
                  onClick={() => {
                    fetchingRef.current = false;
                    fetchData();
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualiser
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 rounded-xl border-amber-500 text-amber-600 hover:bg-amber-50"
                  onClick={forceRefreshWithArchived}
                >
                  <Archive className="h-4 w-4" />
                  Afficher tous
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-muted/30">
              {filteredTickets.map((ticket, index) => {
                const statusInfo = getStatusBadge(ticket.status);
                const clientName = ticket.client_name || "Client";
                const isCalled = ticket.status === "called";
                const isInProgress = ticket.status === "in_progress";
                const isCompleted = ticket.status === "completed";
                const isArchived = ticket.status === "archived";
                const announcementState = announcementStates[ticket.id];
                const hasPlayed = announcementState?.hasPlayed || false;

                return (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`${cardStyles.ticket} ${
                      isCalled
                        ? cardStyles.called
                        : isInProgress
                          ? cardStyles.inProgress
                          : isArchived
                            ? cardStyles.archived
                            : cardStyles.waiting
                    } ${isCompleted ? "opacity-70" : ""}`}
                  >
                    <CardContent className="p-5">
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        {/* Partie gauche - Info ticket */}
                        <div className="flex items-center gap-5 flex-1 min-w-0">
                          <div
                            className={`flex h-14 w-14 items-center justify-center rounded-2xl flex-shrink-0 ${
                              isCalled
                                ? "bg-emerald-500 shadow-lg shadow-emerald-500/30"
                                : isInProgress
                                  ? "bg-indigo-500 shadow-lg shadow-indigo-500/30"
                                  : isArchived
                                    ? "bg-gray-400 shadow-lg shadow-gray-400/30"
                                    : isCompleted
                                      ? "bg-green-500 shadow-lg shadow-green-500/30"
                                      : "bg-primary/10"
                            }`}
                          >
                            <Ticket
                              className={`h-7 w-7 ${isCalled || isInProgress || isCompleted || isArchived ? "text-white" : "text-primary"}`}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p
                                className={`text-2xl font-bold ${
                                  isCalled
                                    ? "text-emerald-700 dark:text-emerald-300"
                                    : isCompleted
                                      ? "text-green-700 dark:text-green-300"
                                      : isArchived
                                        ? "text-gray-500 dark:text-gray-400"
                                        : ""
                                }`}
                              >
                                #{ticket.ticket_number}
                              </p>
                              <Badge
                                className={`${statusInfo.className} border-0 font-medium px-3 py-1`}
                              >
                                {getStatusIcon(ticket.status)}
                                <span className="ml-1">{statusInfo.label}</span>
                              </Badge>
                              {isCalled && (
                                <Badge className="bg-emerald-500 text-white border-0 animate-pulse px-3 py-1">
                                  <Bell className="h-3 w-3 mr-1" />
                                  En appel
                                </Badge>
                              )}
                              {isInProgress && (
                                <Badge className="bg-indigo-500 text-white border-0 px-3 py-1">
                                  <Zap className="h-3 w-3 mr-1" />
                                  En cours
                                </Badge>
                              )}
                              {isCompleted && (
                                <Badge className="bg-green-500 text-white border-0 px-3 py-1">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Terminé
                                </Badge>
                              )}
                              {isArchived && (
                                <Badge className="bg-gray-500 text-white border-0 px-3 py-1">
                                  <Archive className="h-3 w-3 mr-1" />
                                  Archivé
                                </Badge>
                              )}
                            </div>

                            <p
                              className={`font-medium text-lg ${
                                isCalled
                                  ? "text-emerald-700 dark:text-emerald-300"
                                  : isCompleted
                                    ? "text-green-700 dark:text-green-300"
                                    : isArchived
                                      ? "text-gray-500 dark:text-gray-400"
                                      : ""
                              }`}
                            >
                              {clientName}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                              {ticket.client_phone && (
                                <span className="flex items-center gap-1 bg-muted/30 px-2 py-0.5 rounded-full text-emerald-600 dark:text-emerald-400 font-medium">
                                  <Phone className="h-3 w-3" />
                                  {ticket.client_phone}
                                </span>
                              )}
                              {ticket.service_type && (
                                <Badge variant="outline" className="text-xs">
                                  {ticket.service_type}
                                </Badge>
                              )}
                              {ticket.client_sector && (
                                <span className="flex items-center gap-1 text-xs bg-muted/30 px-2 py-0.5 rounded-full">
                                  <MapPin className="h-3 w-3" />
                                  {ticket.client_sector}
                                </span>
                              )}
                              {ticket.created_at && (
                                <span className="flex items-center gap-1 bg-muted/30 px-2 py-0.5 rounded-full">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(ticket.created_at), "HH:mm")}
                                </span>
                              )}
                              {ticket.assigned_employee_id && (
                                <span className="text-xs bg-primary/5 px-2 py-0.5 rounded-full">
                                  👤{" "}
                                  {employees.find(
                                    (e) => e.id === ticket.assigned_employee_id,
                                  )?.profile?.full_name || "Employé"}
                                </span>
                              )}
                              {isArchived && ticket.archived_at && (
                                <span className="text-xs bg-gray-500/10 px-2 py-0.5 rounded-full">
                                  📅 Archivé le{" "}
                                  {format(
                                    new Date(ticket.archived_at),
                                    "dd/MM/yyyy HH:mm",
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Partie droite - Actions */}
                        <div className="flex flex-wrap gap-2 w-full lg:w-auto flex-shrink-0">
                          {ticket.status === "waiting" && (
                            <>
                              <select
                                className="rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                onChange={(e) => {
                                  const employeeId = e.target.value;
                                  if (employeeId)
                                    handleCallTicket(ticket.id, employeeId);
                                }}
                                defaultValue=""
                              >
                                <option value="">Assigner à...</option>
                                {employees.map((emp) => (
                                  <option key={emp.id} value={emp.id}>
                                    {emp.profile?.full_name || "Employé"} #
                                    {emp.employee_number}
                                  </option>
                                ))}
                              </select>
                              <Button
                                onClick={() => {
                                  if (employees.length > 0) {
                                    handleCallTicket(
                                      ticket.id,
                                      employees[0].id,
                                    );
                                  } else {
                                    toast.error("Aucun employé disponible");
                                  }
                                }}
                                size="sm"
                                className="gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/20"
                              >
                                <Bell className="h-4 w-4" />
                                Appeler
                              </Button>
                            </>
                          )}

                          {ticket.status === "called" && (
                            <>
                              <Button
                                onClick={() => handleStartService(ticket.id)}
                                size="sm"
                                className="gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-lg shadow-indigo-500/20"
                              >
                                <User className="h-4 w-4" />
                                Démarrer
                              </Button>
                              {/* ✅ Bouton de répétition dans la liste */}
                              <Button
                                onClick={() => handleRepeatAnnouncement(ticket.id)}
                                size="sm"
                                variant="outline"
                                className="gap-2 rounded-xl border-amber-500 text-amber-600 hover:bg-amber-50"
                                disabled={!hasPlayed}
                              >
                                <Bell className="h-4 w-4" />
                                Répéter
                              </Button>
                            </>
                          )}

                          {ticket.status === "in_progress" && (
                            <Button
                              onClick={() => handleCompleteService(ticket.id)}
                              size="sm"
                              className="gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/20"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Terminer
                            </Button>
                          )}

                          {(ticket.status === "completed" ||
                            ticket.status === "archived") && (
                            <Badge className="bg-gray-100 text-gray-600 border-0 px-4 py-2">
                              {ticket.status === "completed"
                                ? "✅ Terminé"
                                : "📦 Archivé"}
                            </Badge>
                          )}

                          {ticket.status === "cancelled" && (
                            <Badge className="bg-red-100 text-red-700 border-0 px-4 py-2">
                              ❌ Annulé
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ Current calling display - GRILLE des tickets en cours d'appel */}
      {currentCalling.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentCalling.map((callingTicket) => {
            const announcementState = announcementStates[callingTicket.id];
            const hasPlayed = announcementState?.hasPlayed || false;
            
            return (
              <AnimatePresence key={callingTicket.id}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="h-full"
                >
                  <Card className="relative overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 text-white h-full">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/5 animate-pulse" />
                    <div className="absolute -inset-1 bg-gradient-to-r from-white/5 via-white/10 to-white/5 blur-3xl" />

                    <CardContent className="p-6 text-center relative">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm animate-pulse">
                          <Bell className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-medium uppercase tracking-wider opacity-90">
                          🎯 En cours d'appel
                        </p>
                      </div>

                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <p className="text-6xl font-bold tracking-tight drop-shadow-lg">
                          #{callingTicket.ticket_number}
                        </p>
                      </motion.div>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <div className="p-1.5 rounded-full bg-white/20">
                            <User className="h-4 w-4" />
                          </div>
                          <span className="text-lg font-medium">
                            {callingTicket.client_name || "Client"}
                          </span>
                        </div>

                        {/* ✅ Afficher la place assignée */}
                        {callingTicket.assigned_employee_id && (
                          <div className="flex items-center justify-center gap-2">
                            <span className="opacity-80 text-sm">📍 Place</span>
                            <span className="font-bold text-xl bg-white/20 px-3 py-0.5 rounded-full">
                              {employees.find(
                                (e) => e.id === callingTicket.assigned_employee_id,
                              )?.employee_number || "?"}
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-center gap-2 text-xs opacity-90">
                          {callingTicket.client_phone && (
                            <span className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full font-medium">
                              <Phone className="h-3 w-3" />
                              {callingTicket.client_phone}
                            </span>
                          )}
                          {callingTicket.service_type && (
                            <Badge className="bg-white/20 text-white border-0 hover:bg-white/30 px-3 py-0.5">
                              {callingTicket.service_type}
                            </Badge>
                          )}
                          {callingTicket.called_at && (
                            <span className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
                              <Clock className="h-3 w-3" />
                              {format(new Date(callingTicket.called_at), "HH:mm:ss")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ✅ Boutons d'action pour chaque ticket */}
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <Button
                          onClick={() => handleStartService(callingTicket.id)}
                          className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all hover:scale-105 active:scale-95 shadow-lg rounded-xl px-4 py-2 text-xs font-medium border border-white/20"
                        >
                          <User className="h-3 w-3 mr-1" />
                          Démarrer
                        </Button>

                        {/* ✅ Bouton Répéter pour chaque ticket */}
                        <Button
                          onClick={() => handleRepeatAnnouncement(callingTicket.id)}
                          disabled={!hasPlayed}
                          className={`backdrop-blur-sm transition-all hover:scale-105 active:scale-95 shadow-lg rounded-xl px-4 py-2 text-xs font-medium border ${
                            hasPlayed
                              ? "bg-amber-500/30 text-white hover:bg-amber-500/40 border-amber-400/50"
                              : "bg-gray-500/20 text-gray-400 border-gray-400/30 cursor-not-allowed"
                          }`}
                          title={
                            hasPlayed
                              ? "Répéter l'annonce vocale"
                              : "Attendez que l'annonce soit terminée"
                          }
                        >
                          <Bell className="h-3 w-3 mr-1" />
                          Répéter
                          {!hasPlayed && (
                            <Loader2 className="h-2 w-2 ml-1 animate-spin" />
                          )}
                        </Button>
                      </div>

                      {/* ✅ Indicateur d'état individuel */}
                      <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-white/50">
                        {hasPlayed ? (
                          <>
                            <CheckCircle className="h-2.5 w-2.5 text-emerald-300" />
                            <span>Annonce jouée</span>
                          </>
                        ) : (
                          <>
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            <span>En cours...</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            );
          })}
        </div>
      )}

      {/* Dialog de confirmation de réinitialisation */}
      {showResetDialog && renderResetDialog()}
    </div>
  );
}

export default AdminTicketQueuePage;