// /src/pages/SuperAdminInfluencersPage.jsx
//
// Gestion des influenceurs :
//   - fiche de chaque influenceur (taux de commission, acces a son espace) ;
//   - attribution des salons : quel influenceur a inscrit quel salon ;
//   - suivi des retraits demandes par les influenceurs.
//
// Chaque commission affichee est calculee a partir d'un abonnement VALIDE d'un
// salon rattache a l'influenceur. Aucun montant n'est saisi a la main.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
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
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle2,
  Eye,
  Handshake,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

const money = (value) =>
  `${Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA`;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

const STATUS_LABELS = {
  pending: "En attente",
  approved: "Approuvee",
  paid: "Payee",
  rejected: "Refusee",
};

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-blue-100 text-blue-800 border-blue-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
};

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  commission_rate: 20,
  notes: "",
  create_account: false,
  password: "",
};

export default function SuperAdminInfluencersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [influencers, setInfluencers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState("all");
  const [busy, setBusy] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  const [withdrawalTarget, setWithdrawalTarget] = useState(null);
  const [withdrawalNote, setWithdrawalNote] = useState("");
  const loadedRef = useRef(false);

  const loadAll = useCallback(async () => {
    // Le squelette n'est affiche qu'au premier chargement : les rafraichissements
    // apres une action ne doivent pas demonter les onglets (sinon l'onglet
    // Retraits revient sur Influenceurs a chaque validation).
    if (!loadedRef.current) setLoading(true);
    setError("");
    try {
      const [list, payouts] = await Promise.all([
        apiFetch("/api/super-admin/influencers"),
        apiFetch("/api/super-admin/withdrawals"),
      ]);
      setInfluencers(list.influencers ?? []);
      setTenants(list.tenants ?? []);
      setWithdrawals(payouts.withdrawals ?? []);
      loadedRef.current = true;
    } catch (err) {
      setError(err.message || "Impossible de charger les influenceurs.");
      toast.error(err.message || "Impossible de charger les influenceurs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const totals = useMemo(
    () => ({
      count: influencers.length,
      salons: influencers.reduce((sum, item) => sum + (item.stats?.salons ?? 0), 0),
      earned: influencers.reduce((sum, item) => sum + (item.stats?.earned ?? 0), 0),
      available: influencers.reduce((sum, item) => sum + (item.stats?.available ?? 0), 0),
      pendingWithdrawals: withdrawals.filter((item) => item.status === "pending").length,
    }),
    [influencers, withdrawals]
  );

  const filteredWithdrawals = useMemo(
    () =>
      withdrawalFilter === "all"
        ? withdrawals
        : withdrawals.filter((item) => item.status === withdrawalFilter),
    [withdrawals, withdrawalFilter]
  );

  const unassignedTenants = useMemo(
    () => tenants.filter((tenant) => !tenant.referred_by_influencer_id),
    [tenants]
  );

  const openCreate = () => {
    setFormMode("create");
    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (influencer) => {
    setFormMode("edit");
    setEditingId(influencer.id);
    setForm({
      full_name: influencer.full_name ?? "",
      email: influencer.email ?? "",
      phone: influencer.phone ?? "",
      commission_rate: influencer.commission_rate ?? 20,
      notes: influencer.notes ?? "",
      create_account: false,
      password: "",
    });
    setFormOpen(true);
  };

  const submitForm = async () => {
    if (!form.full_name.trim()) {
      toast.error("Le nom complet est obligatoire.");
      return;
    }
    if (form.create_account && (!form.email.trim() || form.password.length < 8)) {
      toast.error("Un email et un mot de passe (8 caracteres minimum) sont requis.");
      return;
    }
    setBusy(true);
    try {
      if (formMode === "create") {
        await apiFetch("/api/super-admin/influencers", {
          method: "POST",
          body: {
            full_name: form.full_name,
            email: form.email || null,
            phone: form.phone || null,
            commission_rate: Number(form.commission_rate) || 0,
            notes: form.notes || null,
            create_account: form.create_account,
            password: form.create_account ? form.password : undefined,
          },
        });
        toast.success("Influenceur cree.");
      } else {
        await apiFetch(`/api/super-admin/influencers/${editingId}`, {
          method: "PATCH",
          body: {
            full_name: form.full_name,
            email: form.email || null,
            phone: form.phone || null,
            commission_rate: Number(form.commission_rate) || 0,
            notes: form.notes || null,
            ...(form.password ? { password: form.password } : {}),
          },
        });
        toast.success("Influenceur mis a jour.");
      }
      setFormOpen(false);
      await loadAll();
    } catch (err) {
      toast.error(err.message || "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  const openDetail = async (influencer) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const report = await apiFetch(`/api/super-admin/influencers/${influencer.id}`);
      setDetail(report);
    } catch (err) {
      toast.error(err.message || "Impossible de charger la fiche.");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const removeInfluencer = async (influencer) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Supprimer ${influencer.full_name} ? Cette action est definitive.`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/super-admin/influencers/${influencer.id}`, { method: "DELETE" });
      toast.success("Influenceur supprime.");
      await loadAll();
    } catch (err) {
      toast.error(err.message || "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  };

  const assignTenant = async (tenantId, influencerId) => {
    setBusy(true);
    try {
      await apiFetch(`/api/super-admin/tenants/${tenantId}/referral`, {
        method: "PATCH",
        body: { influencer_id: influencerId === "none" ? null : influencerId },
      });
      toast.success("Attribution enregistree.");
      await loadAll();
    } catch (err) {
      toast.error(err.message || "Attribution impossible.");
    } finally {
      setBusy(false);
    }
  };

  const processWithdrawal = async (withdrawal, status) => {
    setBusy(true);
    try {
      await apiFetch(`/api/super-admin/withdrawals/${withdrawal.id}`, {
        method: "PATCH",
        body: { status, note: withdrawalNote || undefined },
      });
      toast.success(`Demande ${STATUS_LABELS[status].toLowerCase()}.`);
      setWithdrawalTarget(null);
      setWithdrawalNote("");
      await loadAll();
    } catch (err) {
      toast.error(err.message || "Traitement impossible.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="font-medium">Erreur de chargement</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={loadAll}>
              <RefreshCw className="mr-2 h-4 w-4" /> Reessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UserPlus className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Influenceurs</h1>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Chaque influenceur recoit une commission sur les abonnements valides des salons qu'il a
            inscrits. Il peut demander un retrait de son solde depuis son espace personnel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={loadAll} disabled={busy}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nouvel influenceur
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Influenceurs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Salons rattaches</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.salons}</p>
            <p className="text-xs text-muted-foreground">
              {unassignedTenants.length} salon(s) encore sans influenceur
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Commissions acquises</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{money(totals.earned)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Solde retirable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{money(totals.available)}</p>
            <p className="text-xs text-muted-foreground">
              {totals.pendingWithdrawals} demande(s) de retrait en attente
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-2 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Commission = taux de l'influenceur (20 % par defaut) applique au montant de chaque
            abonnement <strong>valide</strong> d'un salon rattache. Les demandes en attente ou
            approuvees sont reservees sur le solde : l'influenceur ne peut pas demander deux fois le
            meme montant. Chaque retrait retient <strong>5 % de frais</strong> : le net a payer est
            le montant demande moins ces frais.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="influencers">
        <TabsList>
          <TabsTrigger value="influencers">
            <Users className="mr-2 h-4 w-4" /> Influenceurs
          </TabsTrigger>
          <TabsTrigger value="attribution">
            <Handshake className="mr-2 h-4 w-4" /> Attribution des salons
          </TabsTrigger>
          <TabsTrigger value="withdrawals">
            <Banknote className="mr-2 h-4 w-4" /> Retraits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="influencers" className="space-y-4">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Influenceur</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Taux</TableHead>
                    <TableHead className="text-right">Salons</TableHead>
                    <TableHead className="text-right">Commissions</TableHead>
                    <TableHead className="text-right">Solde</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {influencers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        Aucun influenceur enregistre. Cliquez sur « Nouvel influenceur » pour
                        commencer.
                      </TableCell>
                    </TableRow>
                  )}
                  {influencers.map((influencer) => (
                    <TableRow key={influencer.id}>
                      <TableCell>
                        <span className="block font-medium">{influencer.full_name}</span>
                        <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">
                            {influencer.referral_code}
                          </Badge>
                          {influencer.status === "inactive" && (
                            <Badge variant="secondary" className="text-[10px]">
                              Inactif
                            </Badge>
                          )}
                          {influencer.has_account ? (
                            <Badge className="text-[10px]">Espace actif</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Sans compte
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="block">{influencer.email || "-"}</span>
                        <span className="text-xs text-muted-foreground">{influencer.phone || ""}</span>
                      </TableCell>
                      <TableCell className="text-right">{influencer.commission_rate} %</TableCell>
                      <TableCell className="text-right">{influencer.stats?.salons ?? 0}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {money(influencer.stats?.earned)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-emerald-600">
                          {money(influencer.stats?.available)}
                        </span>
                        {(influencer.stats?.pending ?? 0) > 0 && (
                          <span className="block text-xs text-amber-600">
                            {money(influencer.stats.pending)} en attente
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openDetail(influencer)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(influencer)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeInfluencer(influencer)}
                            disabled={busy}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quel influenceur a inscrit quel salon ?</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salon</TableHead>
                    <TableHead>Abonnement</TableHead>
                    <TableHead>Influenceur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                        Aucun salon.
                      </TableCell>
                    </TableRow>
                  )}
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <span className="flex items-center gap-2 font-medium">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {tenant.name}
                        </span>
                        {tenant.parent_tenant_id && (
                          <span className="text-xs text-muted-foreground">Succursale</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tenant.subscription_plan || "Sans plan"}</Badge>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {tenant.subscription_status || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={tenant.referred_by_influencer_id || "none"}
                          onValueChange={(value) => assignTenant(tenant.id, value)}
                          disabled={busy}
                        >
                          <SelectTrigger className="w-[240px]">
                            <SelectValue placeholder="Aucun influenceur" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Aucun influenceur</SelectItem>
                            {influencers.map((influencer) => (
                              <SelectItem key={influencer.id} value={influencer.id}>
                                {influencer.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Demandes de retrait</CardTitle>
              <Select value={withdrawalFilter} onValueChange={setWithdrawalFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="approved">Approuvees</SelectItem>
                  <SelectItem value="paid">Payees</SelectItem>
                  <SelectItem value="rejected">Refusees</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Influenceur</TableHead>
                    <TableHead className="text-right">Net a payer</TableHead>
                    <TableHead>Moyen</TableHead>
                    <TableHead>Coordonnees</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWithdrawals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        Aucune demande de retrait.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredWithdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <span className="block font-medium">{withdrawal.influencer_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {withdrawal.influencer_email || withdrawal.influencer_phone || ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="block font-semibold">{money(withdrawal.net_amount)}</span>
                        <span className="text-xs text-muted-foreground">
                          demande {money(withdrawal.amount)} · frais {money(withdrawal.fee_amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{withdrawal.method || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {withdrawal.account_details || "-"}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(withdrawal.requested_at)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={STATUS_STYLES[withdrawal.status] ?? ""}
                        >
                          {STATUS_LABELS[withdrawal.status] ?? withdrawal.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {withdrawal.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setWithdrawalTarget({ withdrawal, status: "approved" });
                                setWithdrawalNote("");
                              }}
                              disabled={busy}
                            >
                              <CheckCircle2 className="mr-1 h-4 w-4" /> Approuver
                            </Button>
                          )}
                          {withdrawal.status === "approved" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setWithdrawalTarget({ withdrawal, status: "paid" });
                                setWithdrawalNote("");
                              }}
                              disabled={busy}
                            >
                              <Banknote className="mr-1 h-4 w-4" /> Marquer payee
                            </Button>
                          )}
                          {(withdrawal.status === "pending" || withdrawal.status === "approved") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setWithdrawalTarget({ withdrawal, status: "rejected" });
                                setWithdrawalNote("");
                              }}
                              disabled={busy}
                            >
                              <XCircle className="mr-1 h-4 w-4 text-destructive" /> Refuser
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Formulaire creation / edition */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formMode === "create" ? "Nouvel influenceur" : "Modifier l'influenceur"}
            </DialogTitle>
            <DialogDescription>
              Le taux de commission s'applique a chaque abonnement valide des salons rattaches.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="inf-name">Nom complet *</Label>
              <Input
                id="inf-name"
                value={form.full_name}
                onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                placeholder="Ex : Awa Traore"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="inf-email">Email</Label>
                <Input
                  id="inf-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="influenceur@exemple.com"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="inf-phone">Telephone</Label>
                <Input
                  id="inf-phone"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  placeholder="+226 ..."
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="inf-rate">Taux de commission (%)</Label>
                <Input
                  id="inf-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.commission_rate}
                  onChange={(event) =>
                    setForm({ ...form, commission_rate: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="inf-password">
                  {formMode === "create" ? "Mot de passe de l'espace" : "Nouveau mot de passe (optionnel)"}
                </Label>
                <Input
                  id="inf-password"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder="8 caracteres minimum"
                />
              </div>
            </div>

            {formMode === "create" && (
              <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={form.create_account}
                  onChange={(event) =>
                    setForm({ ...form, create_account: event.target.checked })
                  }
                />
                <span>
                  <span className="font-medium">Ouvrir l'acces a l'espace influenceur</span>
                  <span className="block text-xs text-muted-foreground">
                    Cree un compte de connexion (email + mot de passe) pour que l'influenceur
                    consulte ses salons et demande ses retraits.
                  </span>
                </span>
              </label>
            )}

            <div className="space-y-1">
              <Label htmlFor="inf-notes">Notes internes</Label>
              <Textarea
                id="inf-notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                rows={3}
                placeholder="Reseau, zone geographique, accord particulier..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={busy}>
              Annuler
            </Button>
            <Button onClick={submitForm} disabled={busy}>
              {busy ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail influenceur */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.influencer?.full_name ?? "Fiche influenceur"}</DialogTitle>
            <DialogDescription>
              {detail?.influencer?.email || "Sans email"} · taux {detail?.rate ?? 0} % · code{" "}
              {detail?.influencer?.referral_code}
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !detail ? (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-56" />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Salons</p>
                  <p className="text-lg font-bold">{detail.totals.salons}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Commissions</p>
                  <p className="text-lg font-bold text-primary">{money(detail.totals.earned)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Reserve</p>
                  <p className="text-lg font-bold">{money(detail.totals.reserved)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Disponible</p>
                  <p className="text-lg font-bold text-emerald-600">{money(detail.totals.available)}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4" /> Salons rattaches
                </p>
                {detail.salons.length === 0 ? (
                  <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    Aucun salon rattache. Utilisez l'onglet « Attribution des salons ».
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Salon</TableHead>
                          <TableHead className="text-right">Abonnements</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                          <TableHead className="text-right">Commission</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.salons.map((salon) => (
                          <TableRow key={salon.tenant_id}>
                            <TableCell className="font-medium">{salon.tenant_name}</TableCell>
                            <TableCell className="text-right">{salon.subscription_count}</TableCell>
                            <TableCell className="text-right">{money(salon.total_amount)}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {money(salon.total_commission)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Wallet className="h-4 w-4" /> Derniers abonnements generant une commission
                </p>
                {detail.commissions.length === 0 ? (
                  <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    Aucun abonnement valide pour le moment.
                  </p>
                ) : (
                  <div className="max-h-56 overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Salon</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                          <TableHead className="text-right">Commission</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.commissions.slice(0, 30).map((commission) => (
                          <TableRow key={commission.subscription_id}>
                            <TableCell className="font-medium">{commission.tenant_name}</TableCell>
                            <TableCell className="text-sm">{commission.plan}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(commission.recognized_at)}
                            </TableCell>
                            <TableCell className="text-right">{money(commission.amount)}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {money(commission.commission)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Banknote className="h-4 w-4" /> Retraits
                </p>
                {detail.withdrawals.length === 0 ? (
                  <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    Aucune demande de retrait.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Demande</TableHead>
                          <TableHead className="text-right">Frais</TableHead>
                          <TableHead className="text-right">Net recu</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.withdrawals.map((withdrawal) => (
                          <TableRow key={withdrawal.id}>
                            <TableCell className="text-sm">
                              {formatDate(withdrawal.requested_at)}
                            </TableCell>
                            <TableCell className="text-right">{money(withdrawal.amount)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              -{money(withdrawal.fee_amount)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {money(withdrawal.net_amount)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={STATUS_STYLES[withdrawal.status] ?? ""}
                              >
                                {STATUS_LABELS[withdrawal.status] ?? withdrawal.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Traitement d'un retrait */}
      <Dialog
        open={Boolean(withdrawalTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setWithdrawalTarget(null);
            setWithdrawalNote("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {withdrawalTarget ? STATUS_LABELS[withdrawalTarget.status] : ""} — demande de retrait
            </DialogTitle>
            <DialogDescription>
              {withdrawalTarget
                ? `${withdrawalTarget.withdrawal.influencer_name} · demande ${money(
                    withdrawalTarget.withdrawal.amount
                  )} · frais ${money(
                    withdrawalTarget.withdrawal.fee_amount
                  )} · net a payer ${money(withdrawalTarget.withdrawal.net_amount)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="wd-note">Note (optionnelle)</Label>
            <Textarea
              id="wd-note"
              rows={3}
              value={withdrawalNote}
              onChange={(event) => setWithdrawalNote(event.target.value)}
              placeholder="Reference du paiement, motif du refus..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawalTarget(null)} disabled={busy}>
              Annuler
            </Button>
            <Button
              onClick={() =>
                withdrawalTarget &&
                processWithdrawal(withdrawalTarget.withdrawal, withdrawalTarget.status)
              }
              disabled={busy}
              variant={withdrawalTarget?.status === "rejected" ? "destructive" : "default"}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
