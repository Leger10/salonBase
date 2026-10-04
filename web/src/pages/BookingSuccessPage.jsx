// /src/pages/BookingSuccessPage.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  CheckCircle2, CalendarDays, MapPin, User, ArrowRight, 
  Scissors, Building2, Calendar, ListChecks, X, 
  Search, RefreshCw, Clock, Mail, Phone, CalendarPlus, Loader2
} from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Separator } from '@/components/ui/separator.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ========== COMPOSANT : MODAL MES RENDEZ-VOUS (INTÉGRÉ) ==========
const MyAppointmentsModal = ({ isOpen, onClose, tenantId, tenantName, initialEmail }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientEmail, setClientEmail] = useState(initialEmail || "");
  const [clientName, setClientName] = useState("");
  const [searchMode, setSearchMode] = useState("email");
  const [hasSearched, setHasSearched] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // ✅ Charger les rendez-vous automatiquement si un email est fourni
  useEffect(() => {
    if (isOpen && tenantId) {
      if (isAuthenticated && currentUser?.profile) {
        const userEmail = currentUser.profile.email;
        setClientEmail(userEmail);
        fetchAppointmentsByEmail(userEmail);
      } else if (initialEmail) {
        setClientEmail(initialEmail);
        fetchAppointmentsByEmail(initialEmail);
      } else {
        const storedEmail = localStorage.getItem("guest_appointment_email");
        const storedName = localStorage.getItem("guest_appointment_name");
        if (storedEmail) {
          setClientEmail(storedEmail);
          fetchAppointmentsByEmail(storedEmail);
        } else if (storedName) {
          setClientName(storedName);
          fetchAppointmentsByName(storedName);
        } else {
          setLoading(false);
          setHasSearched(false);
        }
      }
    }
  }, [isOpen, tenantId, initialEmail, isAuthenticated, currentUser]);

  // ✅ Récupérer les rendez-vous par email
  const fetchAppointmentsByEmail = async (email) => {
    if (!email) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          service:service_id (
            id, name, duration, price
          ),
          employee:employee_id (
            id,
            profile:profile_id (
              full_name
            )
          ),
          tenant:tenant_id (
            id, name, address, phone
          )
        `)
        .eq("tenant_id", tenantId)
        .eq("client_email", email)
        .order("appointment_date", { ascending: true });

      if (error) {
        console.error("❌ Erreur Supabase:", error);
        throw error;
      }

      console.log("📋 Rendez-vous récupérés:", data);
      
      // ✅ Afficher les données pour déboguer
      if (data && data.length > 0) {
        console.log("🔍 Premier rendez-vous:", {
          id: data[0].id,
          start_time: data[0].start_time,
          appointment_date: data[0].appointment_date,
        });
      }
      
      setAppointments(data || []);
      applyFilters(data || []);
      localStorage.setItem("guest_appointment_email", email);

      if (data?.length === 0) {
        toast.info("Aucun rendez-vous trouvé pour cet email");
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Erreur lors du chargement des rendez-vous");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Récupérer les rendez-vous par nom
  const fetchAppointmentsByName = async (name) => {
    if (!name) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          service:service_id (
            id, name, duration, price
          ),
          employee:employee_id (
            id,
            profile:profile_id (
              full_name
            )
          ),
          tenant:tenant_id (
            id, name, address, phone
          )
        `)
        .eq("tenant_id", tenantId)
        .ilike("client_name", `%${name}%`)
        .order("appointment_date", { ascending: true });

      if (error) {
        console.error("❌ Erreur Supabase:", error);
        throw error;
      }

      console.log("📋 Rendez-vous récupérés par nom:", data);
      setAppointments(data || []);
      applyFilters(data || []);
      localStorage.setItem("guest_appointment_name", name);

      if (data?.length === 0) {
        toast.info("Aucun rendez-vous trouvé pour ce nom");
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Erreur lors du chargement des rendez-vous");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data = appointments) => {
    let filtered = [...data];
    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }
    setFilteredAppointments(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [appointments, statusFilter]);

  const handleSearch = () => {
    if (searchMode === "email" && clientEmail.trim()) {
      fetchAppointmentsByEmail(clientEmail.trim());
    } else if (searchMode === "name" && clientName.trim()) {
      fetchAppointmentsByName(clientName.trim());
    } else {
      toast.error("Veuillez entrer une recherche");
    }
  };

  const handleReset = () => {
    setClientName("");
    setClientEmail("");
    setAppointments([]);
    setFilteredAppointments([]);
    setHasSearched(false);
    setStatusFilter("all");
    localStorage.removeItem("guest_appointment_email");
    localStorage.removeItem("guest_appointment_name");
    toast.info("Filtres réinitialisés");
  };

  // ✅ Fonction pour obtenir le numéro de rendez-vous
  const getBookingNumber = (appointment) => {
    if (appointment.booking_number) {
      return appointment.booking_number;
    }
    if (appointment.metadata?.booking_number) {
      return appointment.metadata.booking_number;
    }
    if (appointment.id) {
      const idHash = appointment.id.replace(/[^0-9]/g, '').slice(0, 4);
      if (idHash && idHash.length > 0) {
        return String(parseInt(idHash) % 100).padStart(2, '0');
      }
      return appointment.id.slice(0, 8);
    }
    return 'N/A';
  };

  // ✅ Fonction pour obtenir l'heure du rendez-vous (utilise start_time)
  const getAppointmentTime = (appointment) => {
    // Utiliser start_time qui existe dans la table
    if (appointment.start_time) {
      return appointment.start_time;
    }
    // Fallback: si l'heure est dans appointment_date
    if (appointment.appointment_date) {
      try {
        const date = new Date(appointment.appointment_date);
        if (!isNaN(date.getTime())) {
          return format(date, 'HH:mm');
        }
      } catch (e) {}
    }
    return null;
  };

  const getStatusConfig = (status) => {
    const config = {
      pending: { label: "En attente", className: "bg-amber-500/20 text-amber-300 border-amber-500/30", icon: "⏳" },
      confirmed: { label: "Confirmé", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: "✅" },
      in_progress: { label: "En cours", className: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: "💇" },
      completed: { label: "Terminé", className: "bg-green-500/20 text-green-300 border-green-500/30", icon: "🎉" },
      cancelled: { label: "Annulé", className: "bg-red-500/20 text-red-300 border-red-500/30", icon: "❌" },
      no_show: { label: "Non présent", className: "bg-gray-500/20 text-gray-300 border-gray-500/30", icon: "🚫" },
    };
    return config[status] || config.pending;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "border-amber-500/30 bg-amber-950/30",
      confirmed: "border-emerald-500/30 bg-emerald-950/30",
      in_progress: "border-blue-500/30 bg-blue-950/30",
      completed: "border-green-500/30 bg-green-950/30",
      cancelled: "border-red-500/30 bg-red-950/30",
      no_show: "border-gray-500/30 bg-gray-800/30",
    };
    return colors[status] || colors.pending;
  };

  const formatDate = (dateStr) => {
    try {
      return format(new Date(dateStr), "EEEE d MMMM yyyy", { locale: fr });
    } catch {
      return dateStr;
    }
  };

  const displayAppointments = filteredAppointments.length > 0 ? filteredAppointments : appointments;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[90vh] overflow-y-auto bg-black border border-gray-700 text-white p-6">
        <DialogHeader className="border-b border-gray-700 pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl text-white">
            <div className="p-2 rounded-xl bg-primary/20">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Mes rendez-vous
            </span>
            {displayAppointments.length > 0 && (
              <Badge variant="default" className="ml-2 bg-primary/20 text-primary border-primary/30">
                {displayAppointments.length} rendez-vous
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400 flex items-center gap-2 mt-1">
            {isAuthenticated 
              ? `👤 ${currentUser?.profile?.full_name}`
              : "Entrez votre email ou nom pour voir vos rendez-vous"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4 h-[calc(90vh-200px)] overflow-y-auto">
          {/* ✅ Barre de recherche pour non connectés */}
          {!isAuthenticated && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <select
                  value={searchMode}
                  onChange={(e) => setSearchMode(e.target.value)}
                  className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="email">Par email</option>
                  <option value="name">Par nom</option>
                </select>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={searchMode === "email" ? "Entrez votre email" : "Entrez votre nom"}
                    value={searchMode === "email" ? clientEmail : clientName}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (searchMode === "email") {
                        setClientEmail(value);
                        localStorage.setItem("guest_appointment_email", value);
                      } else {
                        setClientName(value);
                        localStorage.setItem("guest_appointment_name", value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                    className="pl-10 bg-gray-900 border-gray-700 flex-1 text-white placeholder:text-gray-400"
                  />
                </div>
                <Button onClick={handleSearch} className="gap-2 bg-primary hover:bg-primary/90 text-white">
                  <Search className="h-4 w-4" />
                  Chercher
                </Button>
                <Button onClick={handleReset} variant="outline" className="gap-2 border-gray-700 text-gray-300 hover:bg-gray-800">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              {hasSearched && displayAppointments.length === 0 && (
                <p className="text-sm text-gray-400 text-center">Aucun rendez-vous trouvé</p>
              )}
            </div>
          )}

          {isAuthenticated && (
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">👤 {currentUser?.profile?.full_name}</p>
                  <p className="text-xs text-gray-400">{currentUser?.profile?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">✅ Connecté</Badge>
                  <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2 hover:bg-gray-800" onClick={() => {
                    if (currentUser?.profile?.email) fetchAppointmentsByEmail(currentUser.profile.email);
                  }}>
                    <RefreshCw className="h-3 w-3 mr-1" /> Rafraîchir
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ✅ Filtres par statut */}
          {appointments.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-700">
              <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setStatusFilter("all")}>
                Tous ({appointments.length})
              </Button>
              <Button variant={statusFilter === "pending" ? "default" : "outline"} size="sm" className="text-xs border-amber-500/30 text-amber-300 hover:bg-amber-950/30" onClick={() => setStatusFilter("pending")}>
                ⏳ En attente ({appointments.filter(a => a.status === "pending").length})
              </Button>
              <Button variant={statusFilter === "confirmed" ? "default" : "outline"} size="sm" className="text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/30" onClick={() => setStatusFilter("confirmed")}>
                ✅ Confirmés ({appointments.filter(a => a.status === "confirmed").length})
              </Button>
              <Button variant={statusFilter === "completed" ? "default" : "outline"} size="sm" className="text-xs border-green-500/30 text-green-300 hover:bg-green-950/30" onClick={() => setStatusFilter("completed")}>
                🎉 Terminés ({appointments.filter(a => a.status === "completed").length})
              </Button>
            </div>
          )}

          {/* Liste des rendez-vous */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-gray-400">Chargement de vos rendez-vous...</p>
              </div>
            </div>
          ) : displayAppointments.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-12 w-12 text-gray-500" />
              </div>
              <p className="text-lg font-medium text-white">{hasSearched ? "Aucun rendez-vous trouvé" : "Aucun rendez-vous"}</p>
              <p className="text-sm text-gray-400 mt-1">
                {isAuthenticated ? "Vous n'avez pas encore de rendez-vous" : "Entrez votre email ou nom pour voir vos rendez-vous"}
              </p>
              {!isAuthenticated && !hasSearched && (
                <p className="text-xs text-gray-500 mt-2">💡 Utilisez l'email ou le nom utilisé lors de la réservation</p>
              )}
              <Button asChild className="w-full gap-2 mt-4">
                <Link to={`/booking/tenant/${tenantId || "tenant"}`}>
                  <Calendar className="h-4 w-4" /> Prendre rendez-vous
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayAppointments.map((appointment, index) => {
                const statusConfig = getStatusConfig(appointment.status);
                const statusColor = getStatusColor(appointment.status);
                const isPast = new Date(appointment.appointment_date) < new Date();
                const isToday = new Date(appointment.appointment_date).toDateString() === new Date().toDateString();
                const bookingNumber = getBookingNumber(appointment);
                // ✅ Utiliser start_time pour l'heure
                const appointmentTime = appointment.start_time;

                return (
                  <motion.div
                    key={appointment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`
                      group relative p-5 rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10
                      ${statusColor}
                      ${isToday ? "ring-2 ring-primary/30" : ""}
                      ${isPast && appointment.status !== "completed" && appointment.status !== "cancelled" ? "opacity-70" : ""}
                    `}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20">
                            <Calendar className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Rendez-vous</p>
                            <p className="font-mono font-bold text-lg text-primary">
                              #{bookingNumber}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-3 py-1 rounded-full border ${statusConfig.className}`}>
                          {statusConfig.icon} {statusConfig.label}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <p className="font-bold text-lg text-white">{appointment.service?.name || "Service"}</p>
                          <p className="text-sm text-gray-400">{tenantName || appointment.tenant?.name || "Salon"}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="flex items-center gap-1 text-gray-300">
                            <Calendar className="h-4 w-4 text-primary" />
                            {formatDate(appointment.appointment_date)}
                          </span>
                          {/* ✅ Afficher l'heure depuis start_time */}
                          <span className="flex items-center gap-1 text-gray-300">
                            <Clock className="h-4 w-4 text-primary" />
                            {appointmentTime || "Horaire non défini"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                          {appointment.employee?.profile?.full_name && (
                            <span className="flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded-full">
                              <User className="h-3 w-3" /> {appointment.employee.profile.full_name}
                            </span>
                          )}
                          {appointment.service?.duration && (
                            <span className="flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded-full">
                              <Clock className="h-3 w-3" /> {appointment.service.duration} min
                            </span>
                          )}
                          {appointment.service?.price && (
                            <span className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full text-primary">
                              {appointment.service.price.toLocaleString()} FCFA
                            </span>
                          )}
                          {isToday && <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">Aujourd'hui</Badge>}
                          {isPast && appointment.status !== "completed" && (
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-[10px]">Passé</Badge>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-700/50">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {appointment.client_name || "Client"}</span>
                          {appointment.client_email && (
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {appointment.client_email}</span>
                          )}
                          {appointment.client_phone && (
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {appointment.client_phone}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-2">
                        {appointment.status === "pending" && (
                          <Button size="sm" variant="outline" className="flex-1 text-xs border-gray-700 text-gray-300 hover:bg-gray-800" onClick={() => toast.info("Fonctionnalité à venir")}>
                            Annuler
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="flex-1 text-xs border-primary/30 text-primary hover:bg-primary/10" asChild>
                          <Link to={`/booking/tenant/${tenantId || "tenant"}`}>
                            <CalendarPlus className="h-3 w-3 mr-1" /> Nouveau RDV
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-700 pt-4 mt-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              Total: {displayAppointments.length} rendez-vous
              {appointments.length !== displayAppointments.length && appointments.length > 0 && ` (sur ${appointments.length})`}
              {statusFilter !== "all" && ` - Filtré: ${statusFilter}`}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs text-gray-400 hover:text-white hover:bg-gray-800">
                <RefreshCw className="h-3 w-3 mr-1" /> Réinitialiser
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-gray-800">
                Fermer
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ========== PAGE DE SUCCÈS ==========
export default function BookingSuccessPage() {
  const location = useLocation();
  const { bookingDetails } = location.state || {};
  const [isAppointmentsModalOpen, setIsAppointmentsModalOpen] = useState(false);

  if (!bookingDetails) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/20">
        <Header />
        <main className="flex-1 flex items-center justify-center py-16 px-4">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-2">Aucune réservation trouvée</h2>
            <p className="text-muted-foreground mb-6">Vous n'avez pas de réservation en cours.</p>
            <Button asChild><Link to="/booking">Faire une réservation</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const {
    ref = 'N/A',
    bookingNumber = '01',
    service = { name: 'Service', duration: 30, price: 0 },
    employee = { profile: { full_name: 'Professionnel' } },
    date = new Date().toISOString(),
    time = '--:--',
    clientInfo = { name: 'Client', email: '', phone: '' },
    salonType = { name: 'Salon' },
    tenant = { name: 'Salon', id: null },
    appointmentId = null
  } = bookingDetails;

  const appointmentDate = new Date(date);
  const serviceName = service?.name || 'Service';
  const serviceDuration = service?.duration || service?.duration_minutes || 30;
  const servicePrice = service?.price || 0;
  const tenantName = tenant?.name || salonType?.name || 'Salon';
  const tenantId = tenant?.id || null;
  const employeeName = employee?.profile?.full_name || employee?.profile?.name || employee?.full_name || 'Professionnel assigné';
  const displayRef = bookingNumber || ref || '01';
  const clientEmail = clientInfo?.email || '';
  const clientPhone = clientInfo?.phone || '';

  // ✅ Sauvegarder l'email et le numéro de réservation
  if (clientEmail) {
    localStorage.setItem("guest_appointment_email", clientEmail);
  }
  if (clientInfo?.name) {
    localStorage.setItem("guest_appointment_name", clientInfo.name);
  }
  if (displayRef) {
    localStorage.setItem("guest_booking_number", displayRef);
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, delay: 0.2 }}
              className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm"
            >
              <CheckCircle2 className="w-12 h-12" />
            </motion.div>
            <h1 className="text-4xl font-extrabold text-foreground mb-4">Réservation Confirmée !</h1>
            <p className="text-lg text-muted-foreground">
              Merci, {clientInfo?.name || 'Client'}. Votre rendez-vous a été enregistré avec succès.
            </p>
          </div>

          <Card className="overflow-hidden border-border/50 shadow-lg rounded-2xl">
            <div className="bg-primary/5 p-6 text-center border-b border-border/50">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Numéro de réservation</p>
              <p className="text-4xl font-mono font-bold tracking-widest text-foreground">{displayRef}</p>
            </div>
            
            <CardContent className="p-8">
              <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Scissors className="w-4 h-4" /> Détails de la prestation
                    </h3>
                    <p className="font-semibold text-foreground text-lg">{serviceName}</p>
                    <p className="text-sm text-muted-foreground">{tenantName} • {serviceDuration} min</p>
                    <p className="text-sm font-medium text-primary mt-1">{servicePrice.toLocaleString()} FCFA</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" /> Avec
                    </h3>
                    <p className="font-medium text-foreground">{employeeName}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" /> Date & Heure
                    </h3>
                    <p className="font-medium text-foreground capitalize">
                      {format(appointmentDate, 'EEEE d MMMM yyyy', { locale: fr })}
                    </p>
                    <p className="text-foreground">À {time}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Vos informations
                    </h3>
                    <p className="font-medium text-foreground">{clientEmail || 'Email non fourni'}</p>
                    {clientPhone && <p className="text-foreground">{clientPhone}</p>}
                  </div>
                </div>
              </div>

              <Separator className="my-8" />

              <div className="text-center space-y-2">
                <p className="font-medium text-emerald-600">Un email de confirmation vous a été envoyé.</p>
                <p className="text-sm text-muted-foreground">Vous y trouverez les détails pour modifier ou annuler votre réservation si besoin.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  ⏳ Votre rendez-vous est en attente de confirmation par le salon.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="default" 
              className="h-12 px-8 gap-2 bg-primary hover:bg-primary/90"
              onClick={() => setIsAppointmentsModalOpen(true)}
            >
              <ListChecks className="w-4 h-4" />
              Mes rendez-vous
            </Button>
            <Button asChild variant="outline" className="h-12 px-8">
              <Link to="/">Retour à l'accueil <ArrowRight className="w-4 h-4" /></Link>
            </Button>
          </div>
        </motion.div>
      </main>

      <MyAppointmentsModal
        isOpen={isAppointmentsModalOpen}
        onClose={() => setIsAppointmentsModalOpen(false)}
        tenantId={tenantId}
        tenantName={tenantName}
        initialEmail={clientEmail}
      />

      <Footer />
    </div>
  );
}