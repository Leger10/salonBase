// /src/pages/BookingPage.jsx - Version corrigée
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext.jsx";
import Header from "@/components/Header.jsx";
import Footer from "@/components/Footer.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Calendar } from "@/components/ui/calendar.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  User,
  MapPin,
  CalendarDays,
  Scissors,
  Building2,
  Star,
  Phone,
  Mail,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const { slug } = useParams();
  const serviceId = searchParams.get("service");
  const tenantSlug = slug || searchParams.get("tenant");

  const { isAuthenticated, currentUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState(null);
  const [tenantId, setTenantId] = useState(null);

  // Flow State
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  const [clientInfo, setClientInfo] = useState({
    name: currentUser?.profile?.full_name || "",
    email: currentUser?.profile?.email || currentUser?.email || "",
    phone: currentUser?.profile?.phone || "",
    notes: "",
  });

  // Data
  const [services, setServices] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [generatingSlots, setGeneratingSlots] = useState(false);

  // ✅ Récupérer le tenant et les services
  useEffect(() => {
    const fetchData = async () => {
      if (!tenantSlug) {
        toast.error("Salon non spécifié");
        navigate("/services");
        return;
      }

      try {
        setLoading(true);

        // 1. Récupérer le tenant
        const { data: tenantData, error: tenantError } = await supabase
          .from("tenants")
          .select("*")
          .eq("slug", tenantSlug)
          .eq("subscription_status", "active")
          .maybeSingle();

        if (tenantError) {
          console.error("❌ Erreur tenant:", tenantError);
          toast.error("Erreur lors du chargement du salon");
          return;
        }

        if (!tenantData) {
          toast.error("Salon non trouvé ou inactif");
          navigate("/services");
          return;
        }

        setTenant(tenantData);
        setTenantId(tenantData.id);

        // 2. Récupérer les services
        const { data: servicesData, error: servicesError } = await supabase
          .from("services")
          .select("*")
          .eq("tenant_id", tenantData.id)
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .order("name");

        if (servicesError) {
          console.error("❌ Erreur services:", servicesError);
          toast.error("Erreur lors du chargement des services");
        } else {
          setServices(servicesData || []);
        }

        // 3. Si un serviceId est spécifié
        if (serviceId) {
          const { data: serviceData, error: serviceError } = await supabase
            .from("services")
            .select("*")
            .eq("id", serviceId)
            .eq("tenant_id", tenantData.id)
            .maybeSingle();

          if (!serviceError && serviceData) {
            setSelectedService(serviceData);
            setStep(3);
          } else {
            console.log("Service non trouvé avec ID:", serviceId);
          }
        }
      } catch (error) {
        console.error("❌ Error fetching data:", error);
        toast.error("Erreur lors du chargement du salon");
        navigate("/services");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenantSlug, serviceId, navigate]);

  // ✅ Générer les créneaux disponibles
  const generateAvailableSlots = async (date) => {
    if (!tenantId || !date) return;

    setGeneratingSlots(true);
    try {
      const slots = [];
      const startHour = 8;
      const endHour = 20;

      for (let hour = startHour; hour < endHour; hour++) {
        slots.push(`${hour.toString().padStart(2, "0")}:00`);
        slots.push(`${hour.toString().padStart(2, "0")}:30`);
      }

      const dateStr = format(date, "yyyy-MM-dd");

      const { data: existingAppts, error: apptError } = await supabase
        .from("appointments")
        .select("start_time")
        .eq("tenant_id", tenantId)
        .eq("appointment_date", dateStr)
        .in("status", ["confirmed", "pending", "in_progress"]);

      if (apptError) {
        console.error("❌ Erreur récupération appointments:", apptError);
        setAvailableSlots(slots);
        return;
      }

      const bookedSlots = existingAppts?.map((a) => a.start_time) || [];
      const freeSlots = slots.filter((s) => !bookedSlots.includes(s));
      setAvailableSlots(freeSlots);
    } catch (error) {
      console.error("❌ Error generating slots:", error);
      toast.error("Impossible de charger les disponibilités");
      setAvailableSlots([]);
    } finally {
      setGeneratingSlots(false);
    }
  };

  useEffect(() => {
    if (selectedDate && tenantId) {
      generateAvailableSlots(selectedDate);
    }
  }, [selectedDate, tenantId]);

  // ✅ Gestion des étapes
  const handleNext = () => {
    // Validation spécifique à l'étape
    if (step === 1 && !tenant) {
      toast.error("Veuillez sélectionner un salon");
      return;
    }
    if (step === 2 && !selectedService) {
      toast.error("Veuillez sélectionner un service");
      return;
    }
    if (step === 3 && (!selectedDate || !selectedTime)) {
      toast.error("Veuillez sélectionner une date et une heure");
      return;
    }
    if (step === 4 && !isAuthenticated) {
      // Validation du formulaire client
      if (!clientInfo.name.trim()) {
        toast.error("Veuillez entrer votre nom");
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  const validateClientInfo = () => {
    if (!clientInfo.name.trim()) {
      toast.error("Veuillez entrer votre nom");
      return false;
    }
    return true;
  };

  // ✅ Récupérer le prochain numéro de réservation
  const getNextBookingNumber = async (tenantId, date) => {
    try {
      const { data, error } = await supabase.rpc("get_next_booking_number", {
        p_tenant_id: tenantId,
        p_date: date,
      });

      if (error) {
        console.error("❌ Erreur RPC:", error);
        // Fallback
        const { count } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("appointment_date", date);

        const nextNumber = (count || 0) + 1;
        return String(nextNumber).padStart(2, "0");
      }

      return data;
    } catch (error) {
      console.error("❌ Error getting next booking number:", error);
      return String(Math.floor(Math.random() * 90) + 10).padStart(2, "0");
    }
  };

  // ✅ Calculer l'heure de fin
  const calculateEndTime = (startTime, duration) => {
    if (!startTime) return null;
    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + (duration || 30);
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}:00`;
  };

  // ✅ Confirmation de réservation
  const handleConfirm = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error("Veuillez compléter toutes les étapes");
      return;
    }

    if (!isAuthenticated && !validateClientInfo()) {
      return;
    }

    setLoading(true);
    try {
      let clientId = null;
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      // 1. Récupérer ou créer le client
      if (isAuthenticated && currentUser?.profile?.id) {
        const { data: existingClient, error: clientError } = await supabase
          .from("clients")
          .select("id")
          .eq("profile_id", currentUser.profile.id)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (clientError) {
          console.error("❌ Error fetching client:", clientError);
        }

        clientId = existingClient?.id;

        if (!clientId) {
          const { data: newClient, error: createError } = await supabase
            .from("clients")
            .insert({
              tenant_id: tenantId,
              profile_id: currentUser.profile.id,
              name: clientInfo.name || currentUser.profile.full_name,
              email: clientInfo.email || currentUser.profile.email || null,
              phone: clientInfo.phone || currentUser.profile.phone || null,
              loyalty_points: 0,
              total_visits: 0,
              total_spent: 0,
            })
            .select()
            .single();

          if (createError) {
            console.error("❌ Error creating client:", createError);
          } else if (newClient) {
            clientId = newClient.id;
          }
        }
      } else {
        // Mode invité - recherche par nom ou téléphone
        let clientQuery = supabase
          .from("clients")
          .select("id")
          .eq("tenant_id", tenantId);

        // Recherche par téléphone si disponible, sinon par nom
        if (clientInfo.phone && clientInfo.phone.trim()) {
          clientQuery = clientQuery.eq("phone", clientInfo.phone);
        } else {
          clientQuery = clientQuery.eq("name", clientInfo.name);
        }

        const { data: existingClient, error: clientError } =
          await clientQuery.maybeSingle();

        if (clientError) {
          console.error("❌ Error checking existing client:", clientError);
        }

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          const { data: newClient, error: createError } = await supabase
            .from("clients")
            .insert({
              tenant_id: tenantId,
              name: clientInfo.name,
              email: clientInfo.email || null,
              phone: clientInfo.phone || null,
              loyalty_points: 0,
              total_visits: 0,
              total_spent: 0,
            })
            .select()
            .single();

          if (createError) {
            console.error("❌ Error creating client:", createError);
          } else if (newClient) {
            clientId = newClient.id;
          }
        }
      }

      // 2. Générer le numéro de réservation
      const bookingNumber = await getNextBookingNumber(tenantId, dateStr);

      // 3. Calculer l'heure de fin
      const duration = selectedService.duration || 30;
      const endTime = calculateEndTime(selectedTime, duration);

      // 4. Préparer les données
      const appointmentData = {
        tenant_id: tenantId,
        client_id: clientId,
        service_id: selectedService.id,
        employee_id: null,
        client_name: clientInfo.name,
        client_email: clientInfo.email || null,
        client_phone: clientInfo.phone || null,
        appointment_date: dateStr,
        start_time: selectedTime,
        end_time: endTime,
        status: "pending",
        total_price: selectedService.price || 0,
        notes: clientInfo.notes || null,
        booking_number: bookingNumber,
        created_at: new Date().toISOString(),
      };

      console.log("📝 Données à insérer:", appointmentData);

      // 5. Insérer le rendez-vous
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert(appointmentData)
        .select()
        .single();

      if (appointmentError) {
        console.error("❌ Erreur insertion:", appointmentError);
        throw appointmentError;
      }

      console.log("✅ Rendez-vous enregistré avec le numéro:", bookingNumber);

      // 6. Mettre à jour les points de fidélité
      if (clientId) {
        try {
          const { data: currentClient } = await supabase
            .from("clients")
            .select("total_visits, total_spent, loyalty_points")
            .eq("id", clientId)
            .single();

          if (currentClient) {
            await supabase
              .from("clients")
              .update({
                total_visits: (currentClient.total_visits || 0) + 1,
                total_spent:
                  (currentClient.total_spent || 0) +
                  (selectedService.price || 0),
                loyalty_points: (currentClient.loyalty_points || 0) + 10,
                last_visit: new Date().toISOString(),
              })
              .eq("id", clientId);
          }
        } catch (updateError) {
          console.error("Error updating client stats:", updateError);
        }
      }

      // 7. Sauvegarder pour les non-connectés
      if (!isAuthenticated) {
        localStorage.setItem("guest_appointment_email", clientInfo.email || "");
        localStorage.setItem("guest_appointment_name", clientInfo.name);
        localStorage.setItem("guest_booking_number", bookingNumber);
      }

      // 8. Rediriger vers la page de succès
      navigate("/booking/success", {
        state: {
          bookingDetails: {
            ref: bookingNumber,
            bookingNumber: bookingNumber,
            service: selectedService,
            employee: null,
            date: dateStr,
            time: selectedTime,
            clientInfo: {
              name: clientInfo.name,
              email: clientInfo.email || "",
              phone: clientInfo.phone || "",
            },
            salonType: tenant,
            tenant: tenant,
            appointmentId: appointment.id,
            status: "pending",
          },
        },
      });
    } catch (error) {
      console.error("❌ Booking error:", error);
      toast.error(
        "Erreur lors de la réservation: " +
          (error.message || "Veuillez réessayer"),
      );
    } finally {
      setLoading(false);
    }
  };

  const stepsList = [
    { title: "Salon" },
    { title: "Service" },
    { title: "Date & Heure" },
    { title: "Informations" },
    { title: "Confirmation" },
  ];

  // Rendu des étapes
  const renderStep = () => {
    switch (step) {
      case 1:
        return renderSalonStep();
      case 2:
        return renderServiceStep();
      case 3:
        return renderDateTimeStep();
      case 4:
        return renderInfoStep();
      case 5:
        return renderConfirmationStep();
      default:
        return null;
    }
  };

  const renderSalonStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Votre salon</h1>
        <p className="text-muted-foreground mt-2">
          Confirmez le salon pour la réservation
        </p>
      </div>

      {tenant && (
        <Card className="cursor-pointer border-primary ring-2 ring-primary/20 bg-primary/5">
          <CardContent className="p-6 flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {tenant.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={tenant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="h-10 w-10 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{tenant.name}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                {tenant.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {tenant.address}
                  </span>
                )}
                {tenant.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" /> {tenant.phone}
                  </span>
                )}
                {tenant.rating && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />{" "}
                    {tenant.rating}
                  </span>
                )}
              </div>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Actif
            </Badge>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!tenant} className="h-12 px-8">
          Continuer <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderServiceStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="rounded-full hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Choisissez un service</h2>
          <p className="text-muted-foreground text-sm">{tenant?.name}</p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed">
          <Scissors className="h-12 w-12 text-muted-foreground opacity-20 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">
            Aucun service disponible
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <Card
              key={service.id}
              className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/40 rounded-2xl overflow-hidden ${
                selectedService?.id === service.id
                  ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                  : "border-border/50"
              }`}
              onClick={() => {
                setSelectedService(service);
                handleNext();
              }}
            >
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 pr-4 flex-1">
                    <h3 className="font-bold text-lg leading-tight">
                      {service.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {service.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" /> {service.duration}{" "}
                        min
                      </Badge>
                      {service.salon_type === "premium" && (
                        <Badge className="bg-amber-100 text-amber-800 text-xs">
                          Premium
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-xl font-extrabold text-primary whitespace-nowrap ml-4">
                    {service.price?.toLocaleString()} FCFA
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderDateTimeStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="rounded-full hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Date et heure</h2>
          <p className="text-muted-foreground text-sm">
            {selectedService?.name} - {tenant?.name}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="w-full h-full p-4"
              disabled={(date) =>
                date < new Date(new Date().setHours(0, 0, 0, 0))
              }
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b bg-muted/10">
            <CardTitle className="text-lg">Créneaux disponibles</CardTitle>
            {selectedDate && (
              <p className="text-sm text-muted-foreground capitalize">
                {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col">
            {!selectedDate ? (
              <div className="flex-1 flex items-center justify-center text-center text-muted-foreground text-sm">
                Sélectionnez une date sur le calendrier
              </div>
            ) : generatingSlots ? (
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/30 rounded-xl border border-dashed p-6">
                <CalendarDays className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm font-medium">Aucun créneau disponible</p>
                <p className="text-xs mt-1">Choisissez une autre date</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 auto-rows-max">
                {availableSlots.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    className={`rounded-lg font-medium ${selectedTime === time ? "shadow-md" : "hover:border-primary/40"}`}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            )}

            <div className="mt-auto pt-6">
              <Button
                onClick={handleNext}
                disabled={!selectedDate || !selectedTime}
                className="w-full h-12 text-base font-semibold rounded-xl"
              >
                Continuer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderInfoStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="rounded-full hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Vos coordonnées</h2>
          <p className="text-muted-foreground text-sm">
            Pour confirmer et vous contacter
          </p>
        </div>
      </div>

      <Card className="rounded-2xl border-border/50 shadow-sm max-w-2xl mx-auto">
        <CardContent className="p-6 md:p-8 space-y-6">
          {isAuthenticated ? (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
              <div className="bg-primary/10 p-2 rounded-full text-primary">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">
                  Connecté en tant que{" "}
                  {currentUser?.profile?.full_name || currentUser?.full_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentUser?.profile?.email || currentUser?.email}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">
                  Nom complet *
                </Label>
                <Input
                  id="name"
                  value={clientInfo.name}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, name: e.target.value })
                  }
                  placeholder="ex: Sophie Dupont"
                  className="h-12 rounded-xl bg-background"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold">
                  Téléphone
                </Label>
                <Input
                  id="phone"
                  value={clientInfo.phone}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, phone: e.target.value })
                  }
                  placeholder="+226 54 32 92 99"
                  className="h-12 rounded-xl bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  💡 Pour les rappels et confirmations
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-semibold">
              Notes spéciales
            </Label>
            <Input
              id="notes"
              value={clientInfo.notes}
              onChange={(e) =>
                setClientInfo({ ...clientInfo, notes: e.target.value })
              }
              placeholder="Allergies, demandes particulières..."
              className="h-12 rounded-xl bg-background"
            />
          </div>

          <Button
            onClick={handleNext}
            className="w-full h-12 rounded-xl font-semibold"
          >
            Vérifier la réservation
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="rounded-full hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Récapitulatif</h2>
          <p className="text-muted-foreground text-sm">
            Vérifiez avant de confirmer
          </p>
        </div>
      </div>

      <Card className="rounded-2xl border-border/50 shadow-lg overflow-hidden max-w-2xl mx-auto">
        <div className="bg-card p-6 md:p-8 border-b border-border/50">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-2xl font-bold">{selectedService?.name}</h3>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <Building2 className="h-4 w-4" /> {tenant?.name}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                <span className="text-yellow-600">⏳</span> En attente
                d'assignation par le salon
              </p>
            </div>
            <div className="text-3xl font-extrabold text-primary">
              {selectedService?.price?.toLocaleString()} FCFA
            </div>
          </div>
        </div>

        <CardContent className="p-6 md:p-8">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-4 bg-muted/20 p-5 rounded-2xl">
              <div className="flex gap-3">
                <CalendarDays className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Date & Heure
                  </p>
                  <p className="font-semibold capitalize">
                    {selectedDate &&
                      format(selectedDate, "EEEE d MMM yyyy", { locale: fr })}
                  </p>
                  <p className="text-foreground">
                    À {selectedTime} ({selectedService?.duration} min)
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Lieu
                  </p>
                  <p className="font-semibold">{tenant?.name}</p>
                  {tenant?.address && (
                    <p className="text-sm text-muted-foreground">
                      {tenant.address}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 bg-muted/20 p-5 rounded-2xl">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Vos informations
                </p>
                <p className="font-semibold">{clientInfo.name}</p>
                {clientInfo.email && (
                  <p className="text-sm text-foreground">{clientInfo.email}</p>
                )}
                {clientInfo.phone && (
                  <p className="text-sm text-foreground">{clientInfo.phone}</p>
                )}
              </div>
              {clientInfo.notes && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Notes
                  </p>
                  <p className="text-sm text-foreground italic">
                    "{clientInfo.notes}"
                  </p>
                </div>
              )}
              <div className="mt-2">
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  ⏳ En attente de confirmation
                </Badge>
              </div>
            </div>
          </div>

          <Button
            className="w-full mt-8 text-lg h-14 rounded-xl shadow-md transition-all active:scale-[0.98]"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Confirmation en cours...
              </>
            ) : (
              "Confirmer et réserver"
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Votre réservation sera confirmée par le salon.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  if (loading && !tenant) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/10">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/10">
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-12">
            <div className="flex items-center justify-between relative">
              {stepsList.map((s, i) => (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center relative z-10">
                    <div
                      className={`step-indicator ${step > i + 1 ? "step-completed" : step === i + 1 ? "step-active" : "step-pending"}`}
                    >
                      {step > i + 1 ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className="text-xs font-medium mt-2 hidden sm:block absolute -bottom-6 w-24 text-center">
                      {s.title}
                    </span>
                  </div>
                  {i < stepsList.length - 1 && (
                    <div
                      className={`step-connector ${step > i + 1 ? "bg-primary" : "bg-border"}`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
