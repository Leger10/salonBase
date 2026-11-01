// /src/pages/SuperAdminNotificationsPage.jsx
//
// Centre de notifications de la plateforme : lecture, marquage lu/non lu,
// suppression et envoi d'une annonce a un etablissement, a un utilisateur ou
// a tous les etablissements. Les donnees viennent de la table `notifications`.
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import {
  Bell,
  CheckCheck,
  Check,
  RefreshCw,
  Plus,
  Search,
  Trash2,
  MailOpen,
  Send,
  Building2,
  User as UserIcon,
  Megaphone,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const TYPE_META = {
  info: { label: "Information", className: "bg-blue-100 text-blue-700", icon: Info },
  success: { label: "Succès", className: "bg-green-100 text-green-700", icon: Check },
  warning: { label: "Avertissement", className: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  alert: { label: "Alerte", className: "bg-red-100 text-red-700", icon: AlertTriangle },
  promotion: { label: "Promotion", className: "bg-pink-100 text-pink-700", icon: Megaphone },
  system: { label: "Système", className: "bg-slate-100 text-slate-700", icon: Bell },
};

const EMPTY_FORM = {
  target: "all",
  tenant_id: "",
  user_id: "",
  type: "info",
  title: "",
  message: "",
};

function typeMeta(type) {
  return TYPE_META[type] ?? TYPE_META.info;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SuperAdminNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchData = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const [notificationsResult, tenantsResult, profilesResult] = await Promise.all([
        supabase
          .from("notifications")
          .select("id, user_id, tenant_id, type, title, message, is_read, created_at")
          .order("created_at", { ascending: false })
          .limit(300),
        supabase.from("tenants").select("id, name").order("name", { ascending: true }),
        supabase.from("profiles").select("id, full_name, email, tenant_id, role"),
      ]);

      if (notificationsResult.error) throw notificationsResult.error;
      if (tenantsResult.error) throw tenantsResult.error;
      if (profilesResult.error) throw profilesResult.error;

      setNotifications(notificationsResult.data ?? []);
      setTenants(tenantsResult.data ?? []);
      setProfiles(profilesResult.data ?? []);
    } catch (error) {
      console.error("Erreur chargement notifications:", error);
      toast.error(error.message || "Erreur lors du chargement des notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const tenantNames = useMemo(
    () => new Map(tenants.map((tenant) => [tenant.id, tenant.name])),
    [tenants]
  );
  const profileNames = useMemo(
    () =>
      new Map(
        profiles.map((profile) => [
          profile.id,
          profile.full_name || profile.email || "Utilisateur",
        ])
      ),
    [profiles]
  );

  const stats = useMemo(() => {
    const unread = notifications.filter((item) => !item.is_read).length;
    const today = notifications.filter((item) => {
      if (!item.created_at) return false;
      const date = new Date(item.created_at);
      const now = new Date();
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    }).length;
    return { total: notifications.length, unread, today };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    const term = search.trim().toLowerCase();
    return notifications.filter((item) => {
      if (filter === "unread" && item.is_read) return false;
      if (filter === "read" && !item.is_read) return false;
      if (!term) return true;
      return (
        String(item.title ?? "").toLowerCase().includes(term) ||
        String(item.message ?? "").toLowerCase().includes(term) ||
        String(item.type ?? "").toLowerCase().includes(term)
      );
    });
  }, [notifications, filter, search]);

  const setReadState = async (ids, isRead) => {
    if (ids.length === 0) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: isRead })
        .in("id", ids);
      if (error) throw error;
      setNotifications((prev) =>
        prev.map((item) => (ids.includes(item.id) ? { ...item, is_read: isRead } : item))
      );
    } catch (error) {
      console.error("Erreur mise à jour notification:", error);
      toast.error("Impossible de mettre à jour la notification");
    }
  };

  const markAllRead = async () => {
    const ids = notifications.filter((item) => !item.is_read).map((item) => item.id);
    if (ids.length === 0) {
      toast.info("Toutes les notifications sont déjà lues");
      return;
    }
    await setReadState(ids, true);
    toast.success(`${ids.length} notification(s) marquée(s) comme lue(s)`);
  };

  const deleteNotification = async (id) => {
    if (!window.confirm("Supprimer définitivement cette notification ?")) return;
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      toast.success("Notification supprimée");
    } catch (error) {
      console.error("Erreur suppression notification:", error);
      toast.error("Impossible de supprimer la notification");
    }
  };

  const openDialog = () => {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const buildRows = () => {
    const base = {
      type: form.type,
      title: form.title.trim(),
      message: form.message.trim() || null,
      is_read: false,
    };

    if (form.target === "tenant") {
      if (!form.tenant_id) throw new Error("Sélectionnez un établissement");
      return [{ ...base, tenant_id: form.tenant_id }];
    }

    if (form.target === "user") {
      if (!form.user_id) throw new Error("Sélectionnez un utilisateur");
      const profile = profiles.find((item) => item.id === form.user_id);
      return [{ ...base, user_id: form.user_id, tenant_id: profile?.tenant_id ?? null }];
    }

    // Tous les établissements : une ligne par salon pour que chaque espace
    // d'administration la voie dans son propre périmètre.
    if (tenants.length === 0) return [{ ...base }];
    return tenants.map((tenant) => ({ ...base, tenant_id: tenant.id }));
  };

  const sendNotification = async () => {
    if (!form.title.trim()) {
      toast.error("Le titre est obligatoire");
      return;
    }
    setSending(true);
    try {
      const rows = buildRows();
      const { error } = await supabase.from("notifications").insert(rows);
      if (error) throw error;
      toast.success(
        rows.length > 1
          ? `Notification envoyée à ${rows.length} établissement(s)`
          : "Notification envoyée"
      );
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      await fetchData({ silent: true });
    } catch (error) {
      console.error("Erreur envoi notification:", error);
      toast.error(error.message || "Impossible d'envoyer la notification");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Alertes système et annonces envoyées aux établissements
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => fetchData({ silent: true })} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Actualiser
          </Button>
          <Button variant="outline" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Tout marquer lu
          </Button>
          <Button onClick={openDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle notification
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <Bell className="h-8 w-8 text-primary/60" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Non lues</p>
              <p className="text-3xl font-bold text-amber-600">{stats.unread}</p>
            </div>
            <MailOpen className="h-8 w-8 text-amber-500/70" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Aujourd'hui</p>
              <p className="text-3xl font-bold">{stats.today}</p>
            </div>
            <Send className="h-8 w-8 text-blue-500/70" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <CardTitle className="text-base">Boîte de notifications</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher..."
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="unread">Non lues</SelectItem>
                  <SelectItem value="read">Lues</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              Aucune notification à afficher
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const meta = typeMeta(item.type);
              const Icon = meta.icon;
              return (
                <div
                  key={item.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    item.is_read ? "bg-card" : "bg-primary/[0.03] border-primary/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${meta.className}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{item.title}</p>
                        <Badge variant="outline" className={meta.className}>
                          {meta.label}
                        </Badge>
                        {!item.is_read && <Badge className="bg-primary text-primary-foreground">Nouveau</Badge>}
                      </div>
                      {item.message && (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                          {item.message}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                        <span>{formatDate(item.created_at)}</span>
                        {item.tenant_id && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {tenantNames.get(item.tenant_id) || "Établissement"}
                          </span>
                        )}
                        {item.user_id && (
                          <span className="inline-flex items-center gap-1">
                            <UserIcon className="h-3.5 w-3.5" />
                            {profileNames.get(item.user_id) || "Utilisateur"}
                          </span>
                        )}
                        {!item.tenant_id && !item.user_id && (
                          <span className="inline-flex items-center gap-1">
                            <Megaphone className="h-3.5 w-3.5" />
                            Toute la plateforme
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={item.is_read ? "Marquer comme non lue" : "Marquer comme lue"}
                        onClick={() => setReadState([item.id], !item.is_read)}
                      >
                        {item.is_read ? <MailOpen className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Supprimer"
                        onClick={() => deleteNotification(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Envoyer une notification</DialogTitle>
            <DialogDescription>
              L'annonce apparaîtra dans l'espace des destinataires sélectionnés.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Destinataires</Label>
              <Select value={form.target} onValueChange={(value) => updateForm("target", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les établissements</SelectItem>
                  <SelectItem value="tenant">Un établissement</SelectItem>
                  <SelectItem value="user">Un utilisateur</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.target === "tenant" && (
              <div className="space-y-2">
                <Label>Établissement</Label>
                <Select
                  value={form.tenant_id || undefined}
                  onValueChange={(value) => updateForm("tenant_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un établissement" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.target === "user" && (
              <div className="space-y-2">
                <Label>Utilisateur</Label>
                <Select
                  value={form.user_id || undefined}
                  onValueChange={(value) => updateForm("user_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un utilisateur" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name || profile.email || profile.id}
                        {profile.role ? ` (${profile.role})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(value) => updateForm("type", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Information</SelectItem>
                  <SelectItem value="success">Succès</SelectItem>
                  <SelectItem value="warning">Avertissement</SelectItem>
                  <SelectItem value="alert">Alerte</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="system">Système</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-title">Titre *</Label>
              <Input
                id="notification-title"
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                placeholder="Ex : maintenance planifiée"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-message">Message</Label>
              <Textarea
                id="notification-message"
                value={form.message}
                onChange={(event) => updateForm("message", event.target.value)}
                placeholder="Décrivez l'annonce..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={sending}>
              Annuler
            </Button>
            <Button onClick={sendNotification} disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
