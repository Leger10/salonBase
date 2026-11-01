// /src/pages/SuperAdminPromotionsPage.jsx
//
// Moderation des promotions de tous les etablissements. Le super administrateur
// peut creer une promotion pour un salon, modifier une promotion existante,
// l'activer/desactiver ou la supprimer.
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Switch } from "@/components/ui/switch.jsx";
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
  Tag,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Building2,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

const money = (value) =>
  `${Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA`;

const EMPTY_FORM = {
  tenant_id: "",
  code: "",
  name: "",
  description: "",
  type: "percentage",
  value: "",
  min_purchase: 0,
  max_uses: 100,
  start_date: "",
  end_date: "",
  applicable_clients: "all",
  is_active: true,
};

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("fr-FR");
}

function promoValue(promotion) {
  const value = Number(promotion.value || 0);
  return promotion.type === "percentage"
    ? `${value}%`
    : promotion.type === "fixed"
      ? money(value)
      : `${value}`;
}

export default function SuperAdminPromotionsPage() {
  const [promotions, setPromotions] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchData = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const [promotionsResult, tenantsResult] = await Promise.all([
        supabase
          .from("promotions")
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

      if (promotionsResult.error) throw promotionsResult.error;
      if (tenantsResult.error) throw tenantsResult.error;

      setPromotions(promotionsResult.data ?? []);
      setTenants(tenantsResult.data ?? []);
    } catch (error) {
      console.error("Erreur chargement promotions:", error);
      toast.error(error.message || "Erreur lors du chargement des promotions");
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
    return promotions.filter((promotion) => {
      if (tenantFilter !== "all" && promotion.tenant_id !== tenantFilter) return false;
      if (statusFilter === "active" && !promotion.is_active) return false;
      if (statusFilter === "inactive" && promotion.is_active) return false;
      if (!term) return true;
      return (
        String(promotion.code ?? "").toLowerCase().includes(term) ||
        String(promotion.name ?? "").toLowerCase().includes(term) ||
        String(promotion.tenants?.name ?? "").toLowerCase().includes(term)
      );
    });
  }, [promotions, search, tenantFilter, statusFilter]);

  const stats = useMemo(() => {
    const active = promotions.filter((item) => item.is_active).length;
    return { total: promotions.length, active, inactive: promotions.length - active };
  }, [promotions]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, tenant_id: tenants[0]?.id ?? "" });
    setDialogOpen(true);
  };

  const openEdit = (promotion) => {
    setEditing(promotion);
    setForm({
      tenant_id: promotion.tenant_id ?? "",
      code: promotion.code ?? "",
      name: promotion.name ?? "",
      description: promotion.description ?? "",
      type: promotion.type ?? "percentage",
      value: promotion.value ?? "",
      min_purchase: promotion.min_purchase ?? 0,
      max_uses: promotion.max_uses ?? 100,
      start_date: promotion.start_date ? String(promotion.start_date).slice(0, 10) : "",
      end_date: promotion.end_date ? String(promotion.end_date).slice(0, 10) : "",
      applicable_clients: promotion.applicable_clients ?? "all",
      is_active: promotion.is_active !== false,
    });
    setDialogOpen(true);
  };

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const savePromotion = async () => {
    if (!form.tenant_id) {
      toast.error("Sélectionnez un établissement");
      return;
    }
    if (!form.code.trim() || !form.name.trim() || form.value === "") {
      toast.error("Code, nom et valeur sont obligatoires");
      return;
    }

    // `end_date` est obligatoire en base : par defaut 30 jours de validite.
    const today = new Date();
    const defaultEnd = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const startDate =
      form.start_date || today.toISOString().slice(0, 10);
    const endDate =
      form.end_date || defaultEnd.toISOString().slice(0, 10);

    setSaving(true);
    try {
      const payload = {
        tenant_id: form.tenant_id,
        code: form.code.toUpperCase().trim(),
        name: form.name.trim(),
        description: form.description?.trim() || null,
        type: form.type,
        value: Number(form.value) || 0,
        min_purchase: Number(form.min_purchase) || 0,
        max_uses: Number(form.max_uses) || 0,
        start_date: startDate,
        end_date: endDate,
        applicable_clients: form.applicable_clients,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editing) {
        const { error } = await supabase
          .from("promotions")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Promotion mise à jour");
      } else {
        const { error } = await supabase.from("promotions").insert({
          ...payload,
          used_count: 0,
          created_at: new Date().toISOString(),
        });
        if (error) throw error;
        toast.success("Promotion créée");
      }

      setDialogOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await fetchData({ silent: true });
    } catch (error) {
      console.error("Erreur enregistrement promotion:", error);
      toast.error(error.message || "Impossible d'enregistrer la promotion");
    } finally {
      setSaving(false);
    }
  };

  const togglePromotion = async (promotion) => {
    const next = !promotion.is_active;
    try {
      const { error } = await supabase
        .from("promotions")
        .update({ is_active: next, updated_at: new Date().toISOString() })
        .eq("id", promotion.id);
      if (error) throw error;
      setPromotions((prev) =>
        prev.map((item) => (item.id === promotion.id ? { ...item, is_active: next } : item))
      );
      toast.success(next ? "Promotion activée" : "Promotion désactivée");
    } catch (error) {
      console.error("Erreur changement statut promotion:", error);
      toast.error("Impossible de modifier la promotion");
    }
  };

  const deletePromotion = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("promotions").delete().eq("id", selected.id);
      if (error) throw error;
      setPromotions((prev) => prev.filter((item) => item.id !== selected.id));
      toast.success("Promotion supprimée");
      setDeleteOpen(false);
      setSelected(null);
    } catch (error) {
      console.error("Erreur suppression promotion:", error);
      toast.error(error.message || "Impossible de supprimer la promotion");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((key) => (
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
            <Tag className="h-8 w-8 text-primary" />
            Promotions globales
          </h1>
          <p className="text-muted-foreground mt-1">
            Campagnes promotionnelles de tous les établissements
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
            Nouvelle promotion
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Actives</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Inactives</p>
            <p className="text-2xl font-bold text-gray-500">{stats.inactive}</p>
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
                placeholder="Rechercher un code, un nom, un salon..."
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actives</SelectItem>
                <SelectItem value="inactive">Inactives</SelectItem>
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
                  <TableHead>Code / Nom</TableHead>
                  <TableHead>Établissement</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Valeur</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Utilisations</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Tag className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      Aucune promotion trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((promotion) => (
                    <TableRow key={promotion.id}>
                      <TableCell>
                        <p className="font-mono font-medium">{promotion.code}</p>
                        <p className="text-xs text-muted-foreground">{promotion.name}</p>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {promotion.tenants?.name || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {promotion.type || "-"}
                      </TableCell>
                      <TableCell className="font-medium">{promoValue(promotion)}</TableCell>
                      <TableCell className="text-xs">
                        <p>{formatDate(promotion.start_date)}</p>
                        <p className="text-muted-foreground">→ {formatDate(promotion.end_date)}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {promotion.used_count || 0}
                        {promotion.max_uses ? ` / ${promotion.max_uses}` : ""}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={promotion.is_active === true}
                            onCheckedChange={() => togglePromotion(promotion)}
                          />
                          {promotion.is_active ? (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" /> Active
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-700">
                              <XCircle className="h-3 w-3 mr-1" /> Inactive
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Modifier"
                            onClick={() => openEdit(promotion)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Supprimer"
                            onClick={() => {
                              setSelected(promotion);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier la promotion" : "Nouvelle promotion"}
            </DialogTitle>
            <DialogDescription>
              Les promotions s'appliquent aux réservations et tickets du salon sélectionné.
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
            </div>
            <div>
              <Label htmlFor="promo-code">Code *</Label>
              <Input
                id="promo-code"
                value={form.code}
                onChange={(event) => updateForm("code", event.target.value.toUpperCase())}
                placeholder="EX: BIENVENUE"
              />
            </div>
            <div>
              <Label htmlFor="promo-name">Nom *</Label>
              <Input
                id="promo-name"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="Ex: Remise de bienvenue"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="promo-description">Description</Label>
              <Textarea
                id="promo-description"
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(value) => updateForm("type", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Pourcentage</SelectItem>
                  <SelectItem value="fixed">Montant fixe</SelectItem>
                  <SelectItem value="free_service">Service offert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="promo-value">Valeur *</Label>
              <Input
                id="promo-value"
                type="number"
                min="0"
                value={form.value}
                onChange={(event) => updateForm("value", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="promo-min">Achat minimum (FCFA)</Label>
              <Input
                id="promo-min"
                type="number"
                min="0"
                value={form.min_purchase}
                onChange={(event) => updateForm("min_purchase", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="promo-max">Utilisations maximum</Label>
              <Input
                id="promo-max"
                type="number"
                min="0"
                value={form.max_uses}
                onChange={(event) => updateForm("max_uses", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="promo-start">Début</Label>
              <Input
                id="promo-start"
                type="date"
                value={form.start_date}
                onChange={(event) => updateForm("start_date", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="promo-end">Fin</Label>
              <Input
                id="promo-end"
                type="date"
                value={form.end_date}
                onChange={(event) => updateForm("end_date", event.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(value) => updateForm("is_active", value)}
              />
              <Label>Promotion active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={savePromotion} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette promotion ?</AlertDialogTitle>
            <AlertDialogDescription>
              La promotion « {selected?.code} » ({selected?.name}) sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                deletePromotion();
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
