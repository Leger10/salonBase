// /src/pages/AdminAppointmentsPage.jsx
import React, { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext.jsx";
import AppointmentCalendar from "@/components/AppointmentCalendar.jsx";
import AppointmentModal from "@/components/AppointmentModal.jsx";
import AppointmentDetailsModal from "@/components/AppointmentDetailsModal.jsx";
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
  Plus,
  RefreshCw,
  Eye,
  Edit2,
  CheckCircle,
  XCircle,
  Search,
  Calendar as CalendarIcon,
  Filter,
  Play,
  Users,
  Store,
  Phone,
  Mail,
  User,
  Clock,
  DollarSign,
  Download,
  FileText,
  Printer,
  ChevronDown,
  Archive,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.jsx";

export default function AdminAppointmentsPage() {
  const { currentUser } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [tenantInfo, setTenantInfo] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetType, setResetType] = useState("simple");

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);

  // Récupérer les infos du tenant
  useEffect(() => {
    const fetchTenantInfo = async () => {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) return;

      try {
        const { data, error } = await supabase
          .from("tenants")
          .select("id, name, logo_url, address, phone, email")
          .eq("id", tenantId)
          .single();

        if (error) throw error;
        setTenantInfo(data);
      } catch (err) {
        console.error("Error fetching tenant info:", err);
      }
    };

    fetchTenantInfo();
  }, [currentUser]);

  // Récupérer les employés
  const fetchEmployees = async () => {
    const tenantId = currentUser?.profile?.tenant_id;
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from("employees")
        .select(`
          id,
          employee_number,
          is_available,
          profile:profile_id (
            full_name,
            phone,
            email
          )
        `)
        .eq("tenant_id", tenantId)
        .eq("is_active", true);

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      await fetchEmployees();

      let query = supabase
        .from("appointments")
        .select(
          `
          *,
          client:client_id (
            id,
            name,
            email,
            phone,
            loyalty_points,
            total_visits,
            total_spent,
            profile:profile_id (
              full_name,
              phone,
              email
            )
          ),
          employee:employee_id (
            id,
            employee_number,
            profile:profile_id (
              full_name
            )
          ),
          service:service_id (
            id,
            name,
            duration,
            price
          )
        `,
        )
        .eq("tenant_id", tenantId)
        .order("appointment_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (dateFilter) {
        query = query.eq("appointment_date", dateFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data.map((appt) => {
        let clientName = "Client inconnu";
        if (appt.client) {
          if (appt.client.profile?.full_name) {
            clientName = appt.client.profile.full_name;
          } else if (appt.client.name) {
            clientName = appt.client.name;
          }
        }
        
        let clientPhone = "";
        let clientEmail = "";
        if (appt.client) {
          if (appt.client.profile?.phone) {
            clientPhone = appt.client.profile.phone;
          } else if (appt.client.phone) {
            clientPhone = appt.client.phone;
          }
          if (appt.client.profile?.email) {
            clientEmail = appt.client.profile.email;
          } else if (appt.client.email) {
            clientEmail = appt.client.email;
          }
        }

        let employeeName = "Non assigné";
        if (appt.employee?.profile?.full_name) {
          employeeName = appt.employee.profile.full_name;
        }

        let serviceName = "Service inconnu";
        let serviceDuration = 30;
        let servicePrice = 0;
        if (appt.service) {
          serviceName = appt.service.name || "Service inconnu";
          serviceDuration = appt.service.duration || 30;
          servicePrice = appt.service.price || 0;
        }

        return {
          ...appt,
          client_name: clientName,
          client_phone: clientPhone,
          client_email: clientEmail,
          employee_name: employeeName,
          service_name: serviceName,
          service_duration: serviceDuration,
          service_price: servicePrice,
        };
      });

      setAppointments(formattedData || []);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      toast.error("Erreur de chargement des rendez-vous");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.profile?.tenant_id) {
      fetchAppointments();
    }
  }, [currentUser, statusFilter, dateFilter]);

  // ✅ Fonction pour assigner un employé
  const handleAssignEmployee = async (appointmentId, employeeId) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          employee_id: employeeId,
          status: "confirmed",
        })
        .eq("id", appointmentId);

      if (error) throw error;

      toast.success("Employé assigné avec succès");
      fetchAppointments();
    } catch (err) {
      console.error("Error assigning employee:", err);
      toast.error("Erreur lors de l'assignation");
    }
  };

  // ✅ Fonction pour démarrer le service
  const handleStartService = async (id) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "in_progress",
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Service démarré");
      fetchAppointments();
    } catch (err) {
      console.error("Error starting service:", err);
      toast.error("Erreur lors du démarrage");
    }
  };

  // ✅ Fonction pour terminer le service
  const handleCompleteService = async (id) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "completed",
          payment_status: "unpaid",
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Service terminé");
      fetchAppointments();
    } catch (err) {
      console.error("Error completing service:", err);
      toast.error("Erreur lors de la finalisation");
    }
  };

  // ✅ Fonction de mise à jour du statut
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          status: newStatus,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Statut mis à jour: ${getStatusLabel(newStatus)}`);
      fetchAppointments();
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Échec de la mise à jour");
    }
  };

  // ✅ Réinitialiser le compteur de réservations
  const handleResetBookingNumbers = async () => {
    const tenantId = currentUser?.profile?.tenant_id;
    if (!tenantId) {
      toast.error("Tenant non trouvé");
      return;
    }

    setExporting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      
      const { error } = await supabase
        .rpc('reset_booking_sequence', {
          p_tenant_id: tenantId,
          p_date: today
        });

      if (error) {
        console.error("Erreur RPC:", error);
        const { error: upsertError } = await supabase
          .from("booking_sequences")
          .upsert({
            tenant_id: tenantId,
            date: today,
            last_number: 0,
          }, {
            onConflict: 'tenant_id,date'
          });

        if (upsertError) throw upsertError;
      }

      toast.success(`✅ Compteur réinitialisé ! Les nouveaux rendez-vous commenceront à #01`);
      await fetchAppointments();
    } catch (error) {
      console.error("Error resetting booking numbers:", error);
      toast.error("Erreur lors de la réinitialisation: " + (error.message || "Veuillez réessayer"));
    } finally {
      setExporting(false);
      setResetDialogOpen(false);
    }
  };

  // ✅ Réinitialisation complète (archiver + reset)
  const handleFullReset = async () => {
    const tenantId = currentUser?.profile?.tenant_id;
    if (!tenantId) {
      toast.error("Tenant non trouvé");
      return;
    }

    setExporting(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      // 1. Récupérer les rendez-vous du jour (non archivés)
      const { data: todayAppts, error: fetchError } = await supabase
        .from("appointments")
        .select("id, status")
        .eq("tenant_id", tenantId)
        .eq("appointment_date", today)
        .neq("status", "archived");

      if (fetchError) {
        console.error("Erreur récupération:", fetchError);
        throw fetchError;
      }

      if (todayAppts && todayAppts.length > 0) {
        // 2. Archiver les rendez-vous
        const { error: archiveError } = await supabase
          .from("appointments")
          .update({ 
            status: "archived"
          })
          .eq("tenant_id", tenantId)
          .eq("appointment_date", today)
          .neq("status", "archived");

        if (archiveError) {
          console.error("Erreur archivage:", archiveError);
          throw archiveError;
        }

        toast.success(`📦 ${todayAppts.length} rendez-vous archivés`);
      } else {
        toast.info("Aucun rendez-vous à archiver aujourd'hui");
      }

      // 3. Réinitialiser le compteur
      try {
        const { error: resetError } = await supabase
          .rpc('reset_booking_sequence', {
            p_tenant_id: tenantId,
            p_date: today
          });

        if (resetError) {
          const { error: upsertError } = await supabase
            .from("booking_sequences")
            .upsert({
              tenant_id: tenantId,
              date: today,
              last_number: 0,
            }, {
              onConflict: 'tenant_id,date'
            });

          if (upsertError) throw upsertError;
        }
        toast.success("✅ Compteur réinitialisé !");
      } catch (resetErr) {
        console.error("Erreur reset séquence:", resetErr);
        toast.warning("⚠️ Compteur non réinitialisé, mais les rendez-vous sont archivés");
      }
      
      // 4. Rafraîchir les données
      await fetchAppointments();

    } catch (error) {
      console.error("Error during full reset:", error);
      toast.error("Erreur lors de la réinitialisation: " + (error.message || "Veuillez réessayer"));
    } finally {
      setExporting(false);
      setResetDialogOpen(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: "En attente",
      confirmed: "Confirmé",
      in_progress: "En cours",
      completed: "Terminé",
      cancelled: "Annulé",
      no_show: "Non présenté",
      archived: "Archivé",
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status) => {
    const variants = {
      confirmed: "bg-blue-100 text-blue-800 border-blue-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      in_progress: "bg-purple-100 text-purple-800 border-purple-200",
      no_show: "bg-gray-100 text-gray-800 border-gray-200",
      archived: "bg-gray-100 text-gray-500 border-gray-200",
    };
    return (
      <Badge className={variants[status] || "bg-gray-100 text-gray-800"}>
        {getStatusLabel(status)}
      </Badge>
    );
  };

  const openNew = () => {
    setSelectedAppt(null);
    setIsModalOpen(true);
  };

  const openEdit = (appt) => {
    setSelectedAppt(appt);
    setIsModalOpen(true);
  };

  const openDetails = (appt) => {
    setSelectedAppt(appt);
    setIsDetailsOpen(true);
  };

  const filteredAppointments = appointments.filter((appt) => {
    const clientName = appt.client_name || "";
    const serviceName = appt.service_name || "";
    const bookingNumber = appt.booking_number || "";
    return (
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bookingNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const today = new Date().toISOString().split("T")[0];
  const todayAppointments = appointments.filter(
    (a) => a.appointment_date === today && a.status !== "archived",
  );
  const upcomingAppointments = appointments.filter(
    (a) => a.appointment_date > today && a.status === "confirmed",
  );
  const completedToday = todayAppointments.filter(
    (a) => a.status === "completed",
  ).length;

  const statusCounts = {
    all: appointments.length,
    pending: appointments.filter((a) => a.status === "pending").length,
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
    in_progress: appointments.filter((a) => a.status === "in_progress").length,
    completed: appointments.filter((a) => a.status === "completed").length,
    cancelled: appointments.filter((a) => a.status === "cancelled").length,
    archived: appointments.filter((a) => a.status === "archived").length,
  };

  // ✅ EXPORT PAR STATUT
  const exportAppointmentsByStatus = async (status) => {
    setExporting(true);
    try {
      let filteredAppointments = [];
      
      if (status === "all") {
        filteredAppointments = appointments;
      } else if (status === "archived") {
        filteredAppointments = appointments.filter(
          (a) => a.status === "archived"
        );
      } else {
        filteredAppointments = appointments.filter(
          (a) => a.status === status && a.status !== "archived"
        );
      }

      if (filteredAppointments.length === 0) {
        toast.warning(`Aucun rendez-vous ${status !== "all" ? getStatusLabel(status) : ""} trouvé`);
        setExporting(false);
        return;
      }

      const statusLabel = status !== "all" ? getStatusLabel(status) : "Tous (incluant archivés)";
      const logoUrl = tenantInfo?.logo_url || '';

      const content = `
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Rendez-vous - ${statusLabel}</title>
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
              .header-logo {
                flex-shrink: 0;
              }
              .header-logo img {
                max-height: 60px;
                max-width: 120px;
                object-fit: contain;
              }
              .header-text {
                text-align: center;
              }
              .header h1 { 
                color: #ec4899; 
                font-size: 24px; 
                margin: 0; 
              }
              .header p { 
                color: #666; 
                margin: 5px 0; 
              }
              .header .date { 
                font-size: 16px; 
                font-weight: bold; 
                color: #333; 
              }
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
              .status-pending { background-color: #fef3c7; color: #92400e; }
              .status-confirmed { background-color: #dbeafe; color: #1e40af; }
              .status-completed { background-color: #d1fae5; color: #065f46; }
              .status-cancelled { background-color: #fee2e2; color: #991b1b; }
              .status-in_progress { background-color: #ede9fe; color: #5b21b6; }
              .status-archived { background-color: #e5e7eb; color: #6b7280; }
              .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
              .total { font-weight: bold; margin-top: 15px; text-align: right; font-size: 16px; }
              .summary { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; }
              .summary-item { text-align: center; }
              .summary-item .number { font-size: 20px; font-weight: bold; color: #ec4899; }
              .summary-item .label { font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              ${logoUrl ? `
                <div class="header-logo">
                  <img src="${logoUrl}" alt="${tenantInfo?.name || 'Salon'}" />
                </div>
              ` : ''}
              <div class="header-text">
                <h1>${tenantInfo?.name || 'BeautyFlow'}</h1>
                <p>${tenantInfo?.address || ''}</p>
                <p>📞 ${tenantInfo?.phone || ''} | ✉️ ${tenantInfo?.email || ''}</p>
                <div class="date">📅 Rapport du ${format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}</div>
                <div class="status-filter">Statut: ${statusLabel}</div>
              </div>
            </div>

            <div class="summary">
              <div class="summary-item">
                <div class="number">${filteredAppointments.length}</div>
                <div class="label">Total rendez-vous</div>
              </div>
              <div class="summary-item">
                <div class="number">${filteredAppointments.filter(a => a.status === 'confirmed').length}</div>
                <div class="label">Confirmés</div>
              </div>
              <div class="summary-item">
                <div class="number">${filteredAppointments.filter(a => a.status === 'pending').length}</div>
                <div class="label">En attente</div>
              </div>
              <div class="summary-item">
                <div class="number">${filteredAppointments.filter(a => a.status === 'completed').length}</div>
                <div class="label">Terminés</div>
              </div>
              <div class="summary-item">
                <div class="number">${filteredAppointments.filter(a => a.status === 'archived').length}</div>
                <div class="label">Archivés</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Heure</th>
                  <th>Client</th>
                  <th>Téléphone</th>
                  <th>Service</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                ${filteredAppointments
                  .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time))
                  .map((appt) => `
                    <tr>
                      <td>${appt.booking_number || appt.id.substring(0, 6).toUpperCase()}</td>
                      <td>${format(new Date(appt.appointment_date), 'dd/MM/yyyy')}</td>
                      <td>${appt.start_time}</td>
                      <td>${appt.client_name}</td>
                      <td>${appt.client_phone || '-'}</td>
                      <td>${appt.service_name}</td>
                      <td>${(appt.total_price || appt.service_price || 0).toLocaleString()} FCFA</td>
                      <td><span class="status status-${appt.status}">${getStatusLabel(appt.status)}</span></td>
                    </tr>
                  `).join('')}
              </tbody>
            </table>

            <div class="total">
              Total: ${filteredAppointments.length} rendez-vous
            </div>

            <div class="footer">
              Document généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')} • ${tenantInfo?.name || 'BeautyFlow'}
            </div>
          </body>
        </html>
      `;

      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const printWindow = window.open(url, '_blank', 'width=800,height=600,scrollbars=yes');
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

      toast.success(`Export de ${filteredAppointments.length} rendez-vous réussi`);
    } catch (error) {
      console.error('Error exporting appointments:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  // ✅ EXPORT DES RENDEZ-VOUS DU JOUR
  const exportTodayAppointments = async () => {
    setExporting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const todayAppointments = appointments.filter(
        (a) => a.appointment_date === today && a.status !== "archived",
      );

      if (todayAppointments.length === 0) {
        toast.warning("Aucun rendez-vous aujourd'hui");
        setExporting(false);
        return;
      }

      const logoUrl = tenantInfo?.logo_url || '';

      const content = `
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Rendez-vous du jour</title>
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
              .header-logo {
                flex-shrink: 0;
              }
              .header-logo img {
                max-height: 60px;
                max-width: 120px;
                object-fit: contain;
              }
              .header-text {
                text-align: center;
              }
              .header h1 { 
                color: #ec4899; 
                font-size: 24px; 
                margin: 0; 
              }
              .header p { 
                color: #666; 
                margin: 5px 0; 
              }
              .header .date { 
                font-size: 18px; 
                font-weight: bold; 
                color: #333; 
              }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #ec4899; color: white; padding: 12px; text-align: left; font-size: 14px; }
              td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
              .status-pending { background-color: #fef3c7; color: #92400e; }
              .status-confirmed { background-color: #dbeafe; color: #1e40af; }
              .status-completed { background-color: #d1fae5; color: #065f46; }
              .status-cancelled { background-color: #fee2e2; color: #991b1b; }
              .status-in_progress { background-color: #ede9fe; color: #5b21b6; }
              .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
              .total { font-weight: bold; margin-top: 15px; text-align: right; font-size: 16px; }
              .summary { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; }
              .summary-item { text-align: center; }
              .summary-item .number { font-size: 20px; font-weight: bold; color: #ec4899; }
              .summary-item .label { font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              ${logoUrl ? `
                <div class="header-logo">
                  <img src="${logoUrl}" alt="${tenantInfo?.name || 'Salon'}" />
                </div>
              ` : ''}
              <div class="header-text">
                <h1>${tenantInfo?.name || 'BeautyFlow'}</h1>
                <p>${tenantInfo?.address || ''}</p>
                <p>📞 ${tenantInfo?.phone || ''} | ✉️ ${tenantInfo?.email || ''}</p>
                <div class="date">📅 Rendez-vous du ${format(new Date(today), 'EEEE d MMMM yyyy', { locale: fr })}</div>
              </div>
            </div>

            <div class="summary">
              <div class="summary-item">
                <div class="number">${todayAppointments.length}</div>
                <div class="label">Total rendez-vous</div>
              </div>
              <div class="summary-item">
                <div class="number">${todayAppointments.filter(a => a.status === 'confirmed').length}</div>
                <div class="label">Confirmés</div>
              </div>
              <div class="summary-item">
                <div class="number">${todayAppointments.filter(a => a.status === 'pending').length}</div>
                <div class="label">En attente</div>
              </div>
              <div class="summary-item">
                <div class="number">${todayAppointments.filter(a => a.status === 'completed').length}</div>
                <div class="label">Terminés</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Heure</th>
                  <th>Client</th>
                  <th>Téléphone</th>
                  <th>Service</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                ${todayAppointments
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map((appt) => `
                    <tr>
                      <td>${appt.booking_number || appt.id.substring(0, 6).toUpperCase()}</td>
                      <td>${appt.start_time} - ${appt.end_time || ''}</td>
                      <td>${appt.client_name}</td>
                      <td>${appt.client_phone || '-'}</td>
                      <td>${appt.service_name}</td>
                      <td><span class="status status-${appt.status}">${getStatusLabel(appt.status)}</span></td>
                    </tr>
                  `).join('')}
              </tbody>
            </table>

            <div class="total">
              Total: ${todayAppointments.length} rendez-vous
            </div>

            <div class="footer">
              Document généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')} • ${tenantInfo?.name || 'BeautyFlow'}
            </div>
          </body>
        </html>
      `;

      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const printWindow = window.open(url, '_blank', 'width=800,height=600,scrollbars=yes');
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

      toast.success(`Export de ${todayAppointments.length} rendez-vous réussi`);
    } catch (error) {
      console.error('Error exporting appointments:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  // ✅ Dialogue de confirmation de réinitialisation
  const ResetConfirmationDialog = () => (
    <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
      <DialogContent className="sm:max-w-md bg-black border border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${resetType === "full" ? "text-red-400" : "text-amber-400"}`}>
            {resetType === "full" ? (
              <>
                <AlertTriangle className="h-5 w-5 text-red-400" />
                Réinitialisation complète
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5 text-amber-400" />
                Réinitialiser le compteur
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {resetType === "full" 
              ? "Cette action est irréversible. Tous les rendez-vous du jour seront archivés."
              : "Les nouveaux rendez-vous commenceront à #01."
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {resetType === "full" ? (
            <div className="bg-red-950/80 border-2 border-red-600 rounded-xl p-6 shadow-lg shadow-red-900/30">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-300 text-lg">⚠️ ATTENTION - ACTION IRRÉVERSIBLE</p>
                  <ul className="text-sm text-red-200/90 list-disc list-inside mt-3 space-y-2">
                    <li>Tous les rendez-vous du jour seront <strong className="text-red-100">archivés</strong></li>
                    <li>Le compteur sera <strong className="text-red-100">réinitialisé à zéro</strong></li>
                    <li>Les clients ne verront plus ces rendez-vous</li>
                    <li className="text-red-300 font-bold">Cette action ne peut pas être annulée</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-950/80 border-2 border-amber-500 rounded-xl p-6 shadow-lg shadow-amber-900/30">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 text-black" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-300 text-lg">📋 Réinitialisation du compteur</p>
                  <ul className="text-sm text-amber-200/90 list-disc list-inside mt-3 space-y-2">
                    <li>Les rendez-vous existants <strong className="text-amber-100">gardent leur numéro</strong></li>
                    <li>Les nouveaux rendez-vous commenceront à <strong className="text-amber-100">#01</strong></li>
                    <li>Les rendez-vous passés restent <strong className="text-amber-100">visibles</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-800 mt-2">
            <Button 
              variant="outline" 
              onClick={() => setResetDialogOpen(false)}
              className="px-6 border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Annuler
            </Button>
            <Button 
              variant={resetType === "full" ? "destructive" : "default"}
              onClick={resetType === "full" ? handleFullReset : handleResetBookingNumbers}
              disabled={exporting}
              className={`px-6 gap-2 ${
                resetType === "full" 
                  ? "bg-red-600 hover:bg-red-700 text-white" 
                  : "bg-amber-500 hover:bg-amber-600 text-black"
              }`}
            >
              {exporting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                resetType === "full" ? <AlertTriangle className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />
              )}
              {resetType === "full" ? "Archiver et réinitialiser" : "Réinitialiser le compteur"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-primary" />
            Rendez-vous
          </h1>
          <div className="text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            <span>Gérez le planning de votre salon</span>
            {tenantInfo && (
              <Badge variant="outline" className="ml-2">
                <Store className="h-3 w-3 mr-1" />
                {tenantInfo.name}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
                disabled={exporting}
              >
                {exporting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Réinitialiser
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem 
                onClick={() => {
                  setResetType("simple");
                  setResetDialogOpen(true);
                }}
                className="text-orange-600 cursor-pointer"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                <div>
                  <div className="font-medium">Réinitialiser le compteur</div>
                  <div className="text-xs text-muted-foreground">Les nouveaux RDV commencent à #01</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setResetType("full");
                  setResetDialogOpen(true);
                }}
                className="text-red-600 cursor-pointer"
              >
                <Archive className="h-4 w-4 mr-2" />
                <div>
                  <div className="font-medium">Archiver et réinitialiser</div>
                  <div className="text-xs text-muted-foreground">Archive les RDV du jour + reset</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                disabled={exporting}
              >
                {exporting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Exporter
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => exportAppointmentsByStatus("all")}>
                <FileText className="h-4 w-4 mr-2 text-gray-500" />
                Tous ({statusCounts.all})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAppointmentsByStatus("pending")}>
                <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                En attente ({statusCounts.pending})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAppointmentsByStatus("confirmed")}>
                <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
                Confirmés ({statusCounts.confirmed})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAppointmentsByStatus("in_progress")}>
                <Play className="h-4 w-4 mr-2 text-purple-500" />
                En cours ({statusCounts.in_progress})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAppointmentsByStatus("completed")}>
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                Terminés ({statusCounts.completed})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAppointmentsByStatus("cancelled")}>
                <XCircle className="h-4 w-4 mr-2 text-red-500" />
                Annulés ({statusCounts.cancelled})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportAppointmentsByStatus("archived")}>
                <Archive className="h-4 w-4 mr-2 text-gray-500" />
                Archivés ({statusCounts.archived})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {todayAppointments.length > 0 && (
            <Button
              onClick={exportTodayAppointments}
              variant="outline"
              size="sm"
              className="gap-2 border-green-500 text-green-600 hover:bg-green-50"
              disabled={exporting}
            >
              {exporting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              Jour ({todayAppointments.length})
            </Button>
          )}
          <Button
            onClick={fetchAppointments}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Nouveau Rendez-vous
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aujourd'hui</p>
                <p className="text-2xl font-bold">{todayAppointments.length}</p>
                <p className="text-xs text-muted-foreground">
                  {completedToday} terminés
                </p>
              </div>
              <CalendarIcon className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">À venir</p>
                <p className="text-2xl font-bold">
                  {upcomingAppointments.length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {statusCounts.pending}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{statusCounts.all}</p>
                <p className="text-xs text-muted-foreground">
                  {statusCounts.completed} terminés
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par client, service ou numéro..."
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-background">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous ({statusCounts.all})</SelectItem>
            <SelectItem value="pending">
              En attente ({statusCounts.pending})
            </SelectItem>
            <SelectItem value="confirmed">
              Confirmés ({statusCounts.confirmed})
            </SelectItem>
            <SelectItem value="in_progress">
              En cours ({statusCounts.in_progress})
            </SelectItem>
            <SelectItem value="completed">
              Terminés ({statusCounts.completed})
            </SelectItem>
            <SelectItem value="cancelled">
              Annulés ({statusCounts.cancelled})
            </SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-full sm:w-48 bg-background"
          placeholder="Filtrer par date"
        />
        {dateFilter && (
          <Button variant="ghost" onClick={() => setDateFilter("")} size="sm">
            Effacer
          </Button>
        )}
      </div>

      {/* Calendrier */}
      <AppointmentCalendar
        appointments={appointments}
        onAppointmentClick={openDetails}
      />

      {/* Liste des rendez-vous */}
      <Card className="border-none shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Liste des rendez-vous</CardTitle>
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {filteredAppointments.length} rendez-vous
            </Badge>
          </div>
          <CardDescription>
            Consultez et gérez tous les rendez-vous de votre salon
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <CalendarIcon className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">Aucun rendez-vous trouvé</p>
              <p className="text-sm mt-1">
                {searchTerm || statusFilter !== "all" || dateFilter
                  ? "Modifiez vos filtres"
                  : "Commencez par créer un nouveau rendez-vous"}
              </p>
              {!searchTerm && statusFilter === "all" && !dateFilter && (
                <Button variant="link" onClick={openNew} className="mt-2">
                  Créer un rendez-vous
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Date & Heure</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Professionnel</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.slice(0, 20).map((appt) => (
                    <TableRow key={appt.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #
                        {appt.booking_number ||
                          appt.id.substring(0, 6).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {format(
                            new Date(appt.appointment_date),
                            "dd MMM yyyy",
                            { locale: fr },
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {appt.start_time} - {appt.end_time}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{appt.client_name}</div>
                        {appt.client_phone && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {appt.client_phone}
                          </div>
                        )}
                        {appt.client_email && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {appt.client_email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>{appt.service_name}</div>
                        <div className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {appt.service_duration} min
                        </div>
                      </TableCell>
                      <TableCell>
                        {appt.employee_id ? (
                          <div className="font-medium">{appt.employee_name}</div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-amber-600">Non assigné</span>
                            <Select
                              onValueChange={(value) => {
                                if (value && value !== "" && value !== "no-employees") {
                                  handleAssignEmployee(appt.id, value);
                                }
                              }}
                            >
                              <SelectTrigger className="h-7 text-xs w-36">
                                <SelectValue placeholder="Assigner..." />
                              </SelectTrigger>
                              <SelectContent>
                                {employees.length > 0 ? (
                                  employees.map((emp) => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                      {emp.profile?.full_name || `Employé #${emp.employee_number}`}
                                      {!emp.is_available && " (Occupé)"}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no-employees" disabled>
                                    Aucun employé disponible
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {appt.total_price?.toLocaleString() ||
                          appt.service_price?.toLocaleString() ||
                          0}{" "}
                        FCFA
                      </TableCell>
                      <TableCell>{getStatusBadge(appt.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDetails(appt)}
                            title="Voir"
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(appt)}
                            title="Modifier"
                            className="h-8 w-8"
                          >
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          
                          {appt.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleStatusUpdate(appt.id, "confirmed")
                                }
                                title="Confirmer"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleStatusUpdate(appt.id, "cancelled")
                                }
                                title="Annuler"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          
                          {appt.status === "confirmed" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStartService(appt.id)}
                                title="Démarrer"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleStatusUpdate(appt.id, "cancelled")
                                }
                                title="Annuler"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          
                          {appt.status === "in_progress" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCompleteService(appt.id)}
                              title="Terminer"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {filteredAppointments.length > 20 && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Affichage des 20 premiers résultats sur{" "}
              {filteredAppointments.length}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AppointmentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        appointment={selectedAppt}
        onSuccess={fetchAppointments}
        employees={employees}
      />

      <AppointmentDetailsModal
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        appointment={selectedAppt}
      />

      <ResetConfirmationDialog />
    </div>
  );
}