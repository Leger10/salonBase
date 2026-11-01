// /src/pages/SuperAdminPaymentsPage.jsx
//
// Historique des paiements d'abonnement de la plateforme. Un paiement est
// materialise par une ligne `subscriptions` : montant, moyen de paiement,
// reference, statut et periode. Le super administrateur peut confirmer un
// paiement en attente, l'annuler ou le supprimer.
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
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
  DollarSign,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Trash2,
  Building2,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

const money = (value) =>
  `${Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA`;

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("fr-FR");
}

function statusMeta(status) {
  switch (status) {
    case "active":
      return { label: "Payé", className: "bg-green-100 text-green-700" };
    case "pending":
      return { label: "En attente", className: "bg-amber-100 text-amber-700" };
    case "cancelled":
      return { label: "Annulé", className: "bg-gray-100 text-gray-700" };
    case "expired":
      return { label: "Expiré", className: "bg-red-100 text-red-700" };
    case "trial":
      return { label: "Essai", className: "bg-blue-100 text-blue-700" };
    default:
      return { label: status || "Inconnu", className: "bg-gray-100 text-gray-700" };
  }
}

export default function SuperAdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [processing, setProcessing] = useState(null);

  const fetchPayments = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          tenants:tenant_id (
            id,
            name,
            email,
            phone,
            subscription_status,
            subscription_plan
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data ?? []);
    } catch (error) {
      console.error("Erreur chargement paiements:", error);
      toast.error(error.message || "Erreur lors du chargement des paiements");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const stats = useMemo(() => {
    const paid = payments.filter((item) => item.status === "active");
    const pending = payments.filter((item) => item.status === "pending");
    return {
      collected: paid.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      pendingAmount: pending.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      pendingCount: pending.length,
      total: payments.length,
    };
  }, [payments]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return payments.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!term) return true;
      const tenant = item.tenants?.name ?? "";
      return (
        String(tenant).toLowerCase().includes(term) ||
        String(item.plan ?? "").toLowerCase().includes(term) ||
        String(item.payment_reference ?? "").toLowerCase().includes(term) ||
        String(item.payment_method ?? "").toLowerCase().includes(term)
      );
    });
  }, [payments, search, statusFilter]);

  const updateStatus = async (payment, status) => {
    setProcessing(payment.id);
    try {
      const now = new Date().toISOString();
      const payload = { status, updated_at: now };
      if (status === "active") payload.validated_at = now;
      if (status === "cancelled") payload.rejected_at = now;

      const { error } = await supabase
        .from("subscriptions")
        .update(payload)
        .eq("id", payment.id);
      if (error) throw error;

      if (payment.tenant_id) {
        const tenantUpdate = {};
        if (status === "active") {
          tenantUpdate.subscription_status = "active";
          if (payment.plan) tenantUpdate.subscription_plan = payment.plan;
          if (payment.end_date) tenantUpdate.subscription_end = payment.end_date;
        }
        if (status === "cancelled") tenantUpdate.subscription_status = "inactive";
        if (Object.keys(tenantUpdate).length) {
          const { error: tenantError } = await supabase
            .from("tenants")
            .update(tenantUpdate)
            .eq("id", payment.tenant_id);
          if (tenantError) throw tenantError;
        }
      }

      setPayments((prev) =>
        prev.map((item) => (item.id === payment.id ? { ...item, ...payload } : item))
      );
      toast.success(
        status === "active" ? "Paiement confirmé" : "Paiement annulé"
      );
    } catch (error) {
      console.error("Erreur mise à jour paiement:", error);
      toast.error(error.message || "Impossible de mettre à jour le paiement");
    } finally {
      setProcessing(null);
    }
  };

  const deletePayment = async () => {
    if (!selected) return;
    setProcessing(selected.id);
    try {
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("id", selected.id);
      if (error) throw error;
      setPayments((prev) => prev.filter((item) => item.id !== selected.id));
      toast.success("Paiement supprimé");
      setDeleteOpen(false);
      setSelected(null);
    } catch (error) {
      console.error("Erreur suppression paiement:", error);
      toast.error(error.message || "Impossible de supprimer le paiement");
    } finally {
      setProcessing(null);
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
            <CreditCard className="h-8 w-8 text-primary" />
            Paiements
          </h1>
          <p className="text-muted-foreground mt-1">
            Historique et validation des paiements d'abonnement
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchPayments({ silent: true })}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Actualiser
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Encaissé</p>
              <p className="text-2xl font-bold text-green-600">{money(stats.collected)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500/60" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">En attente</p>
              <p className="text-2xl font-bold text-amber-600">{money(stats.pendingAmount)}</p>
              <p className="text-xs text-muted-foreground">{stats.pendingCount} paiement(s)</p>
            </div>
            <Clock className="h-8 w-8 text-amber-500/60" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total paiements</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <DollarSign className="h-8 w-8 text-primary/60" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un salon, une référence, un plan..."
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Payés</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="cancelled">Annulés</SelectItem>
                <SelectItem value="expired">Expirés</SelectItem>
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
                  <TableHead>Salon</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Moyen / Référence</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      Aucun paiement enregistré
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((payment) => {
                    const meta = statusMeta(payment.status);
                    const busy = processing === payment.id;
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{payment.tenants?.name || "N/A"}</p>
                              <p className="text-xs text-muted-foreground">
                                {payment.tenants?.email || "-"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {payment.plan || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{money(payment.amount)}</TableCell>
                        <TableCell className="text-sm">
                          <p className="capitalize">{payment.payment_method || "-"}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {payment.payment_reference || "-"}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm">
                          <p>Début : {formatDate(payment.start_date)}</p>
                          <p className="text-muted-foreground">
                            Fin : {formatDate(payment.end_date)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge className={meta.className}>{meta.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {payment.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Confirmer le paiement"
                                  disabled={busy}
                                  onClick={() => updateStatus(payment, "active")}
                                >
                                  {busy ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Annuler le paiement"
                                  disabled={busy}
                                  onClick={() => updateStatus(payment, "cancelled")}
                                >
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Supprimer"
                              onClick={() => {
                                setSelected(payment);
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le paiement de {money(selected?.amount)} pour{" "}
              {selected?.tenants?.name || "cet établissement"} sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing === selected?.id}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                deletePayment();
              }}
              disabled={processing === selected?.id}
              className="bg-red-600 hover:bg-red-700"
            >
              {processing === selected?.id && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
