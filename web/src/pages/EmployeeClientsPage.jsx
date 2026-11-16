// /src/pages/EmployeeClientsPage.jsx
// Tous les clients rattaches a l'employe connecte : ceux qui lui ont ete
// assignes (tickets) et ceux qu'il a traites (tickets + rendez-vous).
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { ScrollArea } from "@/components/ui/scroll-area.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import {
  AlertCircle,
  CalendarDays,
  DollarSign,
  Mail,
  Phone,
  RefreshCw,
  Scissors,
  Search,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const money = (value) =>
  `${new Intl.NumberFormat("fr-FR").format(Math.round(Number(value) || 0))} FCFA`;

const digits = (value) => String(value ?? "").replace(/\D/g, "");

const initials = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = toDate(value);
  return date ? format(date, "dd MMM yyyy", { locale: fr }) : "—";
};

const ticketStatus = {
  waiting: { label: "En attente", className: "bg-yellow-100 text-yellow-800" },
  called: { label: "Appelé", className: "bg-blue-100 text-blue-800" },
  in_progress: { label: "En cours", className: "bg-purple-100 text-purple-800" },
  completed: { label: "Terminé", className: "bg-green-100 text-green-800" },
  served: { label: "Servi", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Annulé", className: "bg-gray-100 text-gray-700" },
};

const appointmentStatus = {
  pending: { label: "En attente", className: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmé", className: "bg-blue-100 text-blue-800" },
  in_progress: { label: "En cours", className: "bg-purple-100 text-purple-800" },
  completed: { label: "Terminé", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Annulé", className: "bg-gray-100 text-gray-700" },
  no_show: { label: "Non présenté", className: "bg-gray-100 text-gray-700" },
};

const STAFF_DONE = new Set(["completed", "served"]);

export default function EmployeeClientsPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [selected, setSelected] = useState(null);

  const loadData = useCallback(async () => {
    const tenantId = currentUser?.profile?.tenant_id;
    const profileId = currentUser?.profile?.id;

    if (!tenantId || !profileId) {
      setClients([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: employeeRow, error: employeeError } = await supabase
        .from("employees")
        .select("id, employee_number, position, is_available, profile_id")
        .eq("profile_id", profileId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (employeeError) throw employeeError;
      if (!employeeRow) {
        setEmployee(null);
        setClients([]);
        return;
      }
      setEmployee(employeeRow);

      const [ticketsResult, appointmentsResult] = await Promise.all([
        supabase
          .from("tickets")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("assigned_employee_id", employeeRow.id)
          .order("date", { ascending: false }),
        supabase
          .from("appointments")
          .select("*, service:service_id(id, name, price)")
          .eq("tenant_id", tenantId)
          .eq("employee_id", employeeRow.id)
          .order("appointment_date", { ascending: false }),
      ]);

      if (ticketsResult.error) throw ticketsResult.error;
      if (appointmentsResult.error) throw appointmentsResult.error;

      const tickets = (ticketsResult.data ?? []).filter(
        (ticket) => ticket.status !== "archived"
      );
      const appointments = appointmentsResult.data ?? [];

      const clientIds = [
        ...new Set(
          [...tickets, ...appointments]
            .map((row) => row.client_id)
            .filter(Boolean)
        ),
      ];

      let clientRows = [];
      if (clientIds.length > 0) {
        const { data, error } = await supabase
          .from("clients")
          .select(
            "id, name, email, phone, total_visits, total_spent, last_visit, notes, allergies, birthday, loyalty_points, profile:profile_id(full_name, email, phone, avatar)"
          )
          .in("id", clientIds);
        if (error) throw error;
        clientRows = data ?? [];
      }

      const clientById = new Map(clientRows.map((row) => [row.id, row]));
      const entries = new Map();

      const ensureEntry = (key, seed = {}) => {
        if (!entries.has(key)) {
          entries.set(key, {
            key,
            name: seed.name || "Client",
            phone: seed.phone || "",
            email: seed.email || "",
            avatar: seed.avatar || null,
            clientId: seed.clientId || null,
            notes: seed.notes || "",
            allergies: seed.allergies || "",
            birthday: seed.birthday || null,
            loyaltyPoints: seed.loyaltyPoints || 0,
            visits: 0,
            totalSpent: 0,
            lastVisit: null,
            tickets: [],
            appointments: [],
          });
        }
        return entries.get(key);
      };

      tickets.forEach((ticket) => {
        const client = ticket.client_id ? clientById.get(ticket.client_id) : null;
        const name =
          client?.profile?.full_name ||
          client?.name ||
          ticket.client_name ||
          `Client ticket #${ticket.ticket_number ?? ""}`;
        const key = ticket.client_id
          ? `client:${ticket.client_id}`
          : `guest:${digits(ticket.client_phone) || String(name).toLowerCase().trim()}`;

        const entry = ensureEntry(key, {
          name,
          phone: client?.profile?.phone || client?.phone || ticket.client_phone,
          email: client?.profile?.email || client?.email || ticket.client_email,
          avatar: client?.profile?.avatar,
          clientId: ticket.client_id,
          notes: client?.notes,
          allergies: client?.allergies,
          birthday: client?.birthday,
          loyaltyPoints: client?.loyalty_points,
        });

        if (!entry.avatar && client?.profile?.avatar) entry.avatar = client.profile.avatar;
        if (client?.profile?.full_name) entry.name = client.profile.full_name;
        else if (client?.name) entry.name = client.name;
        if (!entry.phone) {
          entry.phone = client?.profile?.phone || client?.phone || ticket.client_phone || "";
        }
        if (!entry.email) {
          entry.email = client?.profile?.email || client?.email || ticket.client_email || "";
        }

        entry.tickets.push(ticket);
        if (STAFF_DONE.has(ticket.status)) {
          entry.visits += 1;
          entry.totalSpent += Number(ticket.service_price) || 0;
        }
        const visitDate = toDate(ticket.completed_at || ticket.date || ticket.created_at);
        if (visitDate && (!entry.lastVisit || visitDate > entry.lastVisit)) {
          entry.lastVisit = visitDate;
        }
      });

      appointments.forEach((appointment) => {
        const client = appointment.client_id
          ? clientById.get(appointment.client_id)
          : null;
        const name =
          client?.profile?.full_name ||
          client?.name ||
          appointment.client_name ||
          "Client";
        const key = appointment.client_id
          ? `client:${appointment.client_id}`
          : `guest:${digits(appointment.client_phone) || String(name).toLowerCase().trim()}`;

        const entry = ensureEntry(key, {
          name,
          phone: client?.profile?.phone || client?.phone || appointment.client_phone,
          email: client?.profile?.email || client?.email || appointment.client_email,
          avatar: client?.profile?.avatar,
          clientId: appointment.client_id,
          notes: client?.notes,
          allergies: client?.allergies,
          birthday: client?.birthday,
          loyaltyPoints: client?.loyalty_points,
        });

        if (!entry.avatar && client?.profile?.avatar) entry.avatar = client.profile.avatar;
        if (client?.profile?.full_name) entry.name = client.profile.full_name;
        else if (client?.name) entry.name = client.name;
        if (!entry.phone) {
          entry.phone = client?.profile?.phone || client?.phone || appointment.client_phone || "";
        }
        if (!entry.email) {
          entry.email = client?.profile?.email || client?.email || appointment.client_email || "";
        }

        entry.appointments.push(appointment);
        if (appointment.status === "completed") {
          entry.visits += 1;
          entry.totalSpent +=
            Number(appointment.total_price) || Number(appointment.service?.price) || 0;
        }
        const visitDate = toDate(appointment.appointment_date);
        if (visitDate && (!entry.lastVisit || visitDate > entry.lastVisit)) {
          entry.lastVisit = visitDate;
        }
      });

      setClients(Array.from(entries.values()));
    } catch (error) {
      console.error("Erreur chargement clients employe:", error);
      toast.error("Impossible de charger vos clients");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = term
      ? clients.filter((client) =>
          [client.name, client.phone, client.email]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term))
        )
      : [...clients];

    const byRecent = (a, b) =>
      (b.lastVisit?.getTime() ?? 0) - (a.lastVisit?.getTime() ?? 0);

    if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    } else if (sortBy === "spent") {
      list.sort((a, b) => b.totalSpent - a.totalSpent || byRecent(a, b));
    } else if (sortBy === "visits") {
      list.sort((a, b) => b.visits - a.visits || byRecent(a, b));
    } else {
      list.sort(byRecent);
    }
    return list;
  }, [clients, searchTerm, sortBy]);

  const stats = useMemo(() => {
    const totalClients = clients.length;
    const servedClients = clients.filter((client) => client.visits > 0).length;
    const revenue = clients.reduce((sum, client) => sum + client.totalSpent, 0);
    const visits = clients.reduce((sum, client) => sum + client.visits, 0);
    return { totalClients, servedClients, revenue, visits };
  }, [clients]);

  if (loading) {
    return (
      <div className="space-y-4 p-3 sm:p-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-3 pb-20 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Users className="h-7 w-7 text-primary" />
            Mes clients
          </h1>
          <p className="text-sm text-muted-foreground">
            {employee
              ? `Clients assignés et traités par vous — Employé #${employee.employee_number}`
              : "Clients assignés et traités par vous"}
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Clients suivis</p>
            <p className="text-2xl font-bold">{stats.totalClients}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Clients servis</p>
            <p className="text-2xl font-bold text-green-600">{stats.servedClients}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Visites réalisées</p>
            <p className="text-2xl font-bold">{stats.visits}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Prestations générées</p>
            <p className="text-lg font-bold text-primary">{money(stats.revenue)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Rechercher un client par nom, téléphone ou email..."
            className="pl-9"
          />
        </div>
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="recent">Plus récents</option>
          <option value="name">Nom (A-Z)</option>
          <option value="spent">Dépenses</option>
          <option value="visits">Nombre de visites</option>
        </select>
      </div>

      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <UserRound className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium">
              {clients.length === 0 ? "Aucun client pour le moment" : "Aucun résultat"}
            </p>
            <p className="text-sm text-muted-foreground">
              {clients.length === 0
                ? "Les clients qui vous sont assignés ou que vous traitez apparaîtront ici."
                : "Essayez un autre nom, téléphone ou email."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredClients.map((client) => (
            <button
              key={client.key}
              type="button"
              onClick={() => setSelected(client)}
              className="rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={client.avatar || undefined} alt={client.name} />
                  <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                    {initials(client.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{client.name}</p>
                    {client.visits >= 3 && (
                      <Badge className="bg-amber-100 text-[10px] text-amber-800">
                        Fidèle
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {client.phone && (
                      <p className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {client.phone}
                      </p>
                    )}
                    {client.email && (
                      <p className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" /> {client.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center">
                <div>
                  <p className="text-[11px] text-muted-foreground">Visites</p>
                  <p className="text-sm font-semibold">{client.visits}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Dépensé</p>
                  <p className="text-sm font-semibold">{money(client.totalSpent)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Dernier passage</p>
                  <p className="text-sm font-semibold">{formatDate(client.lastVisit)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={selected.avatar || undefined} alt={selected.name} />
                    <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                      {initials(selected.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <DialogTitle className="truncate">{selected.name}</DialogTitle>
                    <DialogDescription>
                      {selected.visits} visite{selected.visits > 1 ? "s" : ""} •{" "}
                      {money(selected.totalSpent)} de prestations
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3 text-sm">
                  <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                    Contact
                  </p>
                  {selected.phone ? (
                    <a
                      href={`tel:${selected.phone}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4" /> {selected.phone}
                    </a>
                  ) : (
                    <p className="text-muted-foreground">Téléphone non renseigné</p>
                  )}
                  {selected.email && (
                    <a
                      href={`mailto:${selected.email}`}
                      className="mt-1 flex items-center gap-2 truncate text-primary hover:underline"
                    >
                      <Mail className="h-4 w-4" /> {selected.email}
                    </a>
                  )}
                  {selected.birthday && (
                    <p className="mt-1 flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-4 w-4" /> Anniversaire :{" "}
                      {formatDate(selected.birthday)}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border p-3 text-sm">
                  <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                    Suivi
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-muted-foreground">Visites</span>
                    <span className="font-semibold">{selected.visits}</span>
                  </p>
                  <p className="mt-1 flex items-center justify-between">
                    <span className="text-muted-foreground">Dépensé avec vous</span>
                    <span className="font-semibold">{money(selected.totalSpent)}</span>
                  </p>
                  <p className="mt-1 flex items-center justify-between">
                    <span className="text-muted-foreground">Dernier passage</span>
                    <span className="font-semibold">{formatDate(selected.lastVisit)}</span>
                  </p>
                  {selected.loyaltyPoints > 0 && (
                    <p className="mt-1 flex items-center justify-between">
                      <span className="text-muted-foreground">Points fidélité</span>
                      <span className="font-semibold">{selected.loyaltyPoints}</span>
                    </p>
                  )}
                </div>
              </div>

              {(selected.notes || selected.allergies) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium text-amber-800">
                    <AlertCircle className="h-4 w-4" /> À savoir
                  </p>
                  {selected.allergies && (
                    <p className="mt-1 text-amber-900">Allergies : {selected.allergies}</p>
                  )}
                  {selected.notes && (
                    <p className="mt-1 text-amber-900">Notes : {selected.notes}</p>
                  )}
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-semibold">Historique</p>
                <ScrollArea className="max-h-72 rounded-lg border">
                  <div className="divide-y">
                    {[
                      ...selected.tickets.map((ticket) => ({
                        id: `ticket-${ticket.id}`,
                        kind: "ticket",
                        date: toDate(ticket.completed_at || ticket.date || ticket.created_at),
                        title: `Ticket #${ticket.ticket_number ?? "—"}`,
                        subtitle: ticket.service_type || "Service",
                        amount:
                          Number(ticket.service_price) ||
                          Number(ticket.service?.price) ||
                          0,
                        status: ticket.status,
                        statusMap: ticketStatus,
                      })),
                      ...selected.appointments.map((appointment) => ({
                        id: `appointment-${appointment.id}`,
                        kind: "appointment",
                        date: toDate(
                          appointment.appointment_date
                            ? `${appointment.appointment_date}T${appointment.start_time || "00:00"}`
                            : appointment.created_at
                        ),
                        title: "Rendez-vous",
                        subtitle:
                          appointment.service?.name || appointment.service_name || "Service",
                        amount:
                          Number(appointment.total_price) ||
                          Number(appointment.service?.price) ||
                          0,
                        status: appointment.status,
                        statusMap: appointmentStatus,
                      })),
                    ]
                      .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
                      .map((item) => {
                        const badge =
                          item.statusMap[item.status] || item.statusMap.pending;
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 p-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                                {item.kind === "ticket" ? (
                                  <Ticket className="h-4 w-4" />
                                ) : (
                                  <Scissors className="h-4 w-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {item.title} — {item.subtitle}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.date
                                    ? format(item.date, "dd MMM yyyy • HH:mm", {
                                        locale: fr,
                                      })
                                    : "Date inconnue"}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-sm font-semibold">
                                {money(item.amount)}
                              </span>
                              {badge && (
                                <Badge className={`${badge.className} text-[10px]`}>
                                  {badge.label}
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
