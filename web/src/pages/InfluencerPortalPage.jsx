// /src/pages/InfluencerPortalPage.jsx
//
// Espace personnel de l'influenceur (connexion email / mot de passe).
// Il y voit les salons qu'il a inscrits, leurs abonnements, ses commissions,
// son solde disponible, et peut demander un retrait.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api.js";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
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
  Handshake,
  Info,
  LogOut,
  RefreshCw,
  Scissors,
  TrendingUp,
  Wallet,
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

const METHODS = [
  { value: "mobile_money", label: "Mobile Money" },
  { value: "orange_money", label: "Orange Money" },
  { value: "moov_money", label: "Moov Money" },
  { value: "wave", label: "Wave" },
  { value: "virement", label: "Virement bancaire" },
  { value: "especes", label: "Especes" },
  { value: "autre", label: "Autre" },
];

const MIN_WITHDRAWAL = 1000;
const WITHDRAWAL_FEE_RATE = 5;

export default function InfluencerPortalPage() {
  const { currentUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestForm, setRequestForm] = useState({
    amount: "",
    method: "mobile_money",
    account_details: "",
  });

  const loadReport = useCallback(async (selectedYear) => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(
        `/api/influencers/me?year=${encodeURIComponent(selectedYear)}`
      );
      setReport(data);
    } catch (err) {
      setError(err.message || "Impossible de charger votre espace influenceur.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport(year);
  }, [loadReport, year]);

  const available = report?.totals?.available ?? 0;
  const feeRate = report?.withdrawalFeeRate ?? WITHDRAWAL_FEE_RATE;
  const minWithdrawal = report?.minWithdrawal ?? MIN_WITHDRAWAL;
  const requestAmount = Number(requestForm.amount) || 0;
  const requestFee = Math.round((requestAmount * feeRate) / 100);
  const requestNet = Math.max(0, requestAmount - requestFee);

  const lastCommissions = useMemo(
    () => (report?.commissions ?? []).slice(0, 20),
    [report]
  );

  const submitRequest = async () => {
    const amount = Number(requestForm.amount);
    if (!Number.isFinite(amount) || amount < minWithdrawal) {
      toast.error(`Le retrait minimum est de ${money(minWithdrawal)}.`);
      return;
    }
    if (amount > available) {
      toast.error(`Solde disponible insuffisant (${money(available)}).`);
      return;
    }
    if (!requestForm.account_details.trim()) {
      toast.error("Precisez le numero ou le compte qui doit recevoir le retrait.");
      return;
    }
    setRequestBusy(true);
    try {
      await apiFetch("/api/influencers/me/withdrawals", {
        method: "POST",
        body: {
          amount,
          method: requestForm.method,
          account_details: requestForm.account_details,
        },
      });
      toast.success("Demande de retrait envoyee. Elle sera traitee par l'administrateur.");
      setRequestOpen(false);
      setRequestForm({ amount: "", method: "mobile_money", account_details: "" });
      await loadReport(year);
    } catch (err) {
      toast.error(err.message || "Demande de retrait impossible.");
    } finally {
      setRequestBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Handshake className="h-5 w-5 text-primary" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">Espace influenceur</p>
              <p className="text-xs text-muted-foreground">
                {currentUser?.profile?.full_name || currentUser?.email || "Mon compte"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(report?.years ?? [new Date().getFullYear()]).map((item) => (
                  <SelectItem key={item} value={String(item)}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => loadReport(year)} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
            </Button>
            <Button variant="ghost" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Deconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {loading && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
            <Skeleton className="h-80" />
          </>
        )}

        {!loading && error && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="font-medium">Espace indisponible</p>
              <p className="max-w-md text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => loadReport(year)}>
                <RefreshCw className="mr-2 h-4 w-4" /> Reessayer
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && report && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Building2 className="h-4 w-4" /> Salons inscrits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{report.totals.salons}</p>
                  <p className="text-xs text-muted-foreground">
                    {report.totals.subscriptions} abonnement(s) valide(s)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <TrendingUp className="h-4 w-4" /> Commissions {report.year}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">
                    {money(report.totals.yearCommission)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Taux applique : {report.rate} %
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Wallet className="h-4 w-4" /> Total acquise
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{money(report.totals.earned)}</p>
                  <p className="text-xs text-muted-foreground">
                    {money(report.totals.paid)} deja payee
                  </p>
                </CardContent>
              </Card>

              <Card className="border-emerald-200 bg-emerald-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                    <Banknote className="h-4 w-4" /> Solde disponible
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-emerald-700">{money(available)}</p>
                  <p className="text-xs text-emerald-800/80">
                    {money(report.totals.reserved)} reserve en attente
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2 text-sm">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>
                    Commission = {report.rate} % du montant de chaque abonnement valide d'un salon
                    que vous avez inscrit. Retrait minimum {money(minWithdrawal)}. Chaque retrait
                    retient {feeRate} % de frais : vous recevez {100 - feeRate} % du montant demande.
                    Une demande en attente est immediatement reservee sur votre solde.
                  </p>
                </div>
                <Button onClick={() => setRequestOpen(true)} disabled={available < minWithdrawal}>
                  <Banknote className="mr-2 h-4 w-4" /> Demander un retrait
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Mes salons</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
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
                      {report.salons.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                            Aucun salon rattache pour le moment.
                          </TableCell>
                        </TableRow>
                      )}
                      {report.salons.map((salon) => (
                        <TableRow key={salon.tenant_id}>
                          <TableCell className="font-medium">{salon.tenant_name}</TableCell>
                          <TableCell className="text-right">{salon.subscription_count}</TableCell>
                          <TableCell className="text-right">{money(salon.total_amount)}</TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {money(salon.total_commission)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Mes retraits</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Montant demande</TableHead>
                        <TableHead className="text-right">Frais {feeRate} %</TableHead>
                        <TableHead className="text-right">Net recu</TableHead>
                        <TableHead>Moyen</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.withdrawals.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                            Aucune demande de retrait.
                          </TableCell>
                        </TableRow>
                      )}
                      {report.withdrawals.map((withdrawal) => (
                        <TableRow key={withdrawal.id}>
                          <TableCell className="text-sm">
                            {formatDate(withdrawal.requested_at)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {money(withdrawal.amount)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            -{money(withdrawal.fee_amount)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600">
                            {money(withdrawal.net_amount)}
                          </TableCell>
                          <TableCell className="text-sm">{withdrawal.method || "-"}</TableCell>
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
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Scissors className="h-4 w-4" /> Detail des commissions
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Salon</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Abonnement</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lastCommissions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          Aucune commission pour le moment.
                        </TableCell>
                      </TableRow>
                    )}
                    {lastCommissions.map((commission) => (
                      <TableRow key={commission.subscription_id}>
                        <TableCell className="font-medium">{commission.tenant_name}</TableCell>
                        <TableCell className="text-sm">{commission.plan}</TableCell>
                        <TableCell className="text-sm">
                          {formatDate(commission.recognized_at)}
                        </TableCell>
                        <TableCell className="text-right">{money(commission.amount)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {money(commission.commission)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Demander un retrait</DialogTitle>
            <DialogDescription>
              Solde disponible : {money(available)} · minimum {money(minWithdrawal)} · frais de
              retrait {feeRate} %
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="wd-amount">Montant a retirer (FCFA)</Label>
              <Input
                id="wd-amount"
                type="number"
                min={minWithdrawal}
                value={requestForm.amount}
                onChange={(event) =>
                  setRequestForm({ ...requestForm, amount: event.target.value })
                }
                placeholder={String(minWithdrawal)}
              />
            </div>

            <div className="space-y-1 rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Montant demande</span>
                <span className="font-medium">{money(requestAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Frais de retrait ({feeRate} %)</span>
                <span className="font-medium text-rose-600">-{money(requestFee)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t pt-2">
                <span className="font-medium">Vous recevrez</span>
                <span className="text-base font-bold text-emerald-600">{money(requestNet)}</span>
              </div>
              <p className="pt-1 text-xs text-muted-foreground">
                Le montant demande est debite de votre solde ; les frais couvrent les frais de
                transaction.
              </p>
            </div>

            <div className="space-y-1">
              <Label>Moyen de retrait</Label>
              <Select
                value={requestForm.method}
                onValueChange={(value) => setRequestForm({ ...requestForm, method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="wd-account">Numero / compte a crediter</Label>
              <Textarea
                id="wd-account"
                rows={2}
                value={requestForm.account_details}
                onChange={(event) =>
                  setRequestForm({ ...requestForm, account_details: event.target.value })
                }
                placeholder="Ex : 70 00 00 00 (Orange Money) au nom de ..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)} disabled={requestBusy}>
              Annuler
            </Button>
            <Button onClick={submitRequest} disabled={requestBusy}>
              {requestBusy ? "Envoi..." : "Envoyer la demande"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
