// /src/pages/SuperAdminMarketingPage.jsx
//
// Vue consolidée des campagnes marketing de tous les établissements. Le super
// administrateur peut créer une campagne pour un salon, la marquer envoyée,
// consulter son contenu et la supprimer.
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card.jsx";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.jsx";
import {
  Megaphone,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Eye,
  Send,
  Mail,
  MessageSquare,
  Building2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = {
  tenant_id: "",
  name: "",
  type: "email",
  subject: "",
  body: "",
  recipient_type: "all_clients",
  schedule: "now",
  scheduled_date: "",
};

function parseContent(campaign) {
  try {
    const parsed = JSON.parse(campaign.content || "{}");
    return {
      subject: parsed.subject || "",
      body: parsed.body || "",
      recipient_type: parsed.recipient_type || "all_clients",
      recipient_count: parsed.recipient_count ?? null,
    };
  } catch {
    return { subject: "", body: campaign.content || "", recipient_type: "all_clients", recipient_count: null };
  }
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

export default function SuperAdminMarketingPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [recipientCount, setRecipientCount] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selected, setSelected] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchData = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const [campaignsResult, tenantsResult] = await Promise.all([
        supabase
          .from("marketing_campaigns")
          .select(`
            *,
            tenants:tenant_id (
              id,
              name,
              email
            )
          `)
          .order("created_at", { ascending: false }),
        supabase.from("tenants").select("id, name").order("name", { ascending: true }),
      ]);

      if (campaignsResult.error) throw campaignsResult.error;
      if (tenantsResult.error) throw tenantsResult.error;

      setCampaigns(campaignsResult.data ?? []);
      setTenants(tenantsResult.data ?? []);
    } catch (error) {
      console.error("Erreur chargement campagnes:", error);
      toast.error(error.message || "Erreur lors du chargement des campagnes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return campaigns.filter((campaign) => {
      if (tenantFilter !== "all" && campaign.tenant_id !== tenantFilter) return false;
      if (typeFilter !== "all" && campaign.type !== typeFilter) return false;
      if (!term) return true;
      return (
        String(campaign.name ?? "").toLowerCase().includes(term) ||
        String(campaign.tenants?.name ?? "").toLowerCase().includes(term) ||
        String(parseContent(campaign).subject ?? "").toLowerCase().includes(term)
      );
    });
  }, [campaigns, search, tenantFilter, typeFilter]);

  const stats = useMemo(() => {
    const sent = campaigns.filter((item) => item.sent_at).length;
    const emails = campaigns.filter((item) => item.type === "email").length;
    const sms = campaigns.filter((item) => item.type === "sms").length;
    return { total: campaigns.length, sent, scheduled: campaigns.length - sent, emails, sms };
  }, [campaigns]);

  const refreshRecipients = async (tenantId) => {
    if (!tenantId) {
      setRecipientCount(null);
      return;
    }
    const { count, error } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    setRecipientCount(error ? null : count ?? 0);
  };

  const openCreate = () => {
    const tenantId = tenants[0]?.id ?? "";
    setForm({ ...EMPTY_FORM, tenant_id: tenantId });
    setRecipientCount(null);
    refreshRecipients(tenantId);
    setDialogOpen(true);
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "tenant_id") refreshRecipients(value);
  };

  const saveCampaign = async () => {
    if (!form.tenant_id) {
      toast.error("Sélectionnez un établissement");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Le nom de la campagne est obligatoire");
      return;
    }
    if (form.type === "email" && !form.subject.trim()) {
      toast.error("L'objet de l'email est obligatoire");
      return;
    }
    if (!form.body.trim()) {
      toast.error("Le contenu du message est obligatoire");
      return;
    }

    setSaving(true);
    try {
      const immediate = form.schedule === "now";
      const payload = {
        tenant_id: form.tenant_id,
        name: form.name.trim(),
        type: form.type,
        content: JSON.stringify({
          subject: form.subject.trim(),
          body: form.body.trim(),
          recipient_type: form.recipient_type,
          recipient_count: recipientCount,
          scheduled_date: immediate ? null : form.scheduled_date || null,
        }),
        sent_at: immediate ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("marketing_campaigns").insert(payload);
      if (error) throw error;

      toast.success(
        immediate ? "Campagne créée et marquée envoyée" : "Campagne programmée"
      );
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      await fetchData({ silent: true });
    } catch (error) {
      console.error("Erreur création campagne:", error);
      toast.error(error.message || "Impossible de créer la campagne");
    } finally {
      setSaving(false);
    }
  };

  const markSent = async (campaign) => {
    try {
      const { error } = await supabase
        .from("marketing_campaigns")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", campaign.id);
      if (error) throw error;
      setCampaigns((prev) =>
        prev.map((item) =>
          item.id === campaign.id ? { ...item, sent_at: new Date().toISOString() } : item
        )
      );
      toast.success("Campagne marquée comme envoyée");
    } catch (error) {
      console.error("Erreur mise à jour campagne:", error);
      toast.error("Impossible de mettre à jour la campagne");
    }
  };

  const deleteCampaign = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("marketing_campaigns")
        .delete()
        .eq("id", selected.id);
      if (error) throw error;
      setCampaigns((prev) => prev.filter((item) => item.id !== selected.id));
      toast.success("Campagne supprimée");
      setDeleteOpen(false);
      setSelected(null);
    } catch (error) {
      console.error("Erreur suppression campagne:", error);
      toast.error(error.message || "Impossible de supprimer la campagne");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-28 rounded-xl" />
          ))}
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
            <Megaphone className="h-8 w-8 text-primary" />
            Marketing
          </h1>
          <p className="text-muted-foreground mt-1">
            Campagnes email et SMS de tous les établissements
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchData({ silent: true })}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Actualiser
          </Button>
          <Button onClick={openCreate} disabled={tenants.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle campagne
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Campagnes</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Envoyées</p>
            <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Programmées</p>
            <p className="text-2xl font-bold text-amber-600">{stats.scheduled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Email / SMS</p>
            <p className="text-2xl font-bold">
              {stats.emails} / {stats.sms}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher une campagne, un salon..."
                className="pl-9"
              />
            </div>
            <Select value={tenantFilter} onValueChange={setTenantFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Établissement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les établissements</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les canaux</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campagne</TableHead>
                  <TableHead>Établissement</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Destinataires</TableHead>
                  <TableHead>Créée le</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Megaphone className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      Aucune campagne trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((campaign) => {
                    const content = parseContent(campaign);
                    const isEmail = campaign.type === "email";
                    return (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {content.subject || content.body || "-"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-sm">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {campaign.tenants?.name || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            {isEmail ? (
                              <Mail className="h-3 w-3" />
                            ) : (
                              <MessageSquare className="h-3 w-3" />
                            )}
                            {isEmail ? "Email" : "SMS"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {content.recipient_count ?? "-"}
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(campaign.created_at)}</TableCell>
                        <TableCell>
                          {campaign.sent_at ? (
                            <Badge className="bg-green-100 text-green-700">Envoyée</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700">Programmée</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Voir le contenu"
                              onClick={() => setPreview(campaign)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!campaign.sent_at && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Marquer envoyée"
                                onClick={() => markSent(campaign)}
                              >
                                <Send className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Supprimer"
                              onClick={() => {
                                setSelected(campaign);
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle campagne</DialogTitle>
            <DialogDescription>
              La campagne est enregistrée pour l'établissement choisi.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Établissement *</Label>
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
              <p className="text-xs text-muted-foreground mt-1">
                {recipientCount === null
                  ? "Destinataires : -"
                  : `${recipientCount} client(s) dans cet établissement`}
              </p>
            </div>
            <div>
              <Label htmlFor="campaign-name">Nom de la campagne *</Label>
              <Input
                id="campaign-name"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="Ex: Promo de novembre"
              />
            </div>
            <div>
              <Label>Canal</Label>
              <Select value={form.type} onValueChange={(value) => updateForm("type", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Destinataires</Label>
              <Select
                value={form.recipient_type}
                onValueChange={(value) => updateForm("recipient_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_clients">Tous les clients</SelectItem>
                  <SelectItem value="active_clients">Clients actifs</SelectItem>
                  <SelectItem value="inactive_clients">Clients inactifs (90 jours)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type === "email" && (
              <div className="sm:col-span-2">
                <Label htmlFor="campaign-subject">Objet *</Label>
                <Input
                  id="campaign-subject"
                  value={form.subject}
                  onChange={(event) => updateForm("subject", event.target.value)}
                  placeholder="Objet de l'email"
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <Label htmlFor="campaign-body">Message *</Label>
              <Textarea
                id="campaign-body"
                value={form.body}
                onChange={(event) => updateForm("body", event.target.value)}
                rows={5}
                placeholder="Contenu de la campagne..."
              />
            </div>
            <div>
              <Label>Envoi</Label>
              <Select value={form.schedule} onValueChange={(value) => updateForm("schedule", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="now">Marquer envoyée maintenant</SelectItem>
                  <SelectItem value="later">Programmer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.schedule === "later" && (
              <div>
                <Label htmlFor="campaign-date">Date d'envoi</Label>
                <Input
                  id="campaign-date"
                  type="date"
                  value={form.scheduled_date}
                  onChange={(event) => updateForm("scheduled_date", event.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={saveCampaign} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
            <DialogDescription>
              {preview?.tenants?.name || "Établissement"} ·{" "}
              {preview?.type === "email" ? "Email" : "SMS"}
            </DialogDescription>
          </DialogHeader>
          {preview && (() => {
            const content = parseContent(preview);
            return (
              <div className="space-y-3">
                {content.subject && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Objet</p>
                    <p className="font-medium">{content.subject}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Message</p>
                  <p className="whitespace-pre-wrap text-sm">{content.body || "-"}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Créée le {formatDate(preview.created_at)} ·{" "}
                  {preview.sent_at ? "Envoyée" : "Programmée"}
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette campagne ?</AlertDialogTitle>
            <AlertDialogDescription>
              La campagne « {selected?.name} » sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                deleteCampaign();
              }}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
