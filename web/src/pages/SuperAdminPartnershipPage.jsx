// /src/pages/SuperAdminPartnershipPage.jsx
//
// Tableau de bord transparent du partenariat :
//   - chiffre d'affaires des abonnements valides, mois par mois ;
//   - salons abonnes enregistres pour chaque mois ;
//   - 20 % retenus pour la survie de l'application ;
//   - partage a parts egales (50/50) du reste entre les deux associes.
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
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
  AlertCircle,
  ArrowUpRight,
  Building2,
  Calculator,
  CheckCircle2,
  FileSignature,
  Handshake,
  Info,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

const money = (value) =>
  `${Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA`;

const shortMoney = (value) => {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1000000) return `${(amount / 1000000).toFixed(1)} M`;
  if (Math.abs(amount) >= 1000) return `${Math.round(amount / 1000)} k`;
  return `${amount}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

export default function SuperAdminPartnershipPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const fetchReport = async (selectedYear = year) => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/api/super-admin/partnership?year=${encodeURIComponent(selectedYear)}`);
      setReport(data);
    } catch (err) {
      setError(err.message || "Impossible de charger le rapport de partenariat.");
      toast.error(err.message || "Impossible de charger le rapport de partenariat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const currentMonthNumber = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthNumber);

  const month = useMemo(() => {
    if (!report) return null;
    return report.months.find((item) => item.month === selectedMonth) ?? report.months[0];
  }, [report, selectedMonth]);

  const bestMonth = useMemo(() => {
    if (!report) return null;
    return report.months.reduce(
      (best, item) => (item.revenue > (best?.revenue ?? 0) ? item : best),
      null
    );
  }, [report]);

  const chartData = useMemo(
    () =>
      (report?.months ?? []).map((item) => ({
        name: item.label.slice(0, 4),
        "CA brut": item.grossRevenue,
        "Commissions influenceurs": item.commissions,
        "Part associe A": item.partnerA,
        "Part associe B": item.partnerB,
        "Charges application": item.appShare,
      })),
    [report]
  );

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
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
            <Button onClick={() => fetchReport(year)}>
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
            <Handshake className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Partenariat &amp; revenus</h1>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Chiffre d'affaires des abonnements, commissions des influenceurs deduites,
            charges de survie de l'application (20 %) et partage a parts egales (50/50)
            entre les deux associes. Chaque montant affiche ici est calcule a partir
            d'un abonnement valide enregistre.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Annee" />
            </SelectTrigger>
            <SelectContent>
              {(report?.years ?? [new Date().getFullYear()]).map((item) => (
                <SelectItem key={item} value={String(item)}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => fetchReport(year)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
          </Button>
          <Button asChild>
            <Link to="/super-admin/partnership/contract">
              <FileSignature className="mr-2 h-4 w-4" /> Contrat de partenariat
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-primary" /> CA brut {report.year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{money(report.totals.grossRevenue)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {report.totals.salonsCount} salon(s) abonne(s) sur l'annee
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" /> Commissions influenceurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-rose-600">-{money(report.totals.commissions)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Deduites du CA avant charges (article 12 du contrat)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calculator className="h-4 w-4" /> CA net partageable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{money(report.totals.revenue)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Base de calcul des charges, apres commissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calculator className="h-4 w-4" /> Charges application (20 %)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{money(report.totals.appShare)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Survie de l'application, deduites avant partage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wallet className="h-4 w-4" /> Associe A
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{money(report.totals.partnerA)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Fondateur (DigiHouse) - 50 % du reste
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wallet className="h-4 w-4" /> Associe B
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-cyan-600">{money(report.totals.partnerB)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Apporteur d'affaires / communication - 50 % du reste
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-200 bg-amber-50/60">
        <CardContent className="flex flex-col gap-2 p-4 text-sm text-amber-900 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Methode : CA brut = abonnements <strong>valides</strong> du mois (montant encaisse).
              Les commissions des influenceurs sont deduites de ce CA, puis les charges
              application representent 20 % du CA net. Le reste (80 %) est partage 50/50.
              Aucun revenu n'est estime : seuls les abonnements reels sont comptes.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-amber-300 bg-white">
            Commissions deduites · 20 % application · 80 % partage 50/50
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Evolution mensuelle {report.year}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={shortMoney} tick={{ fontSize: 12 }} width={56} />
                  <Tooltip formatter={(value) => money(value)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="CA brut" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Commissions influenceurs" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Part associe A" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Part associe B" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Charges application" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detail du mois</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={String(selectedMonth)}
              onValueChange={(value) => setSelectedMonth(Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {report.months.map((item) => (
                  <SelectItem key={item.month} value={String(item.month)}>
                    {item.label} {report.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="space-y-2 rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">CA brut</span>
                <span className="font-semibold">{money(month?.grossRevenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Commissions influenceurs</span>
                <span className="font-semibold text-rose-600">-{money(month?.commissions)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-muted-foreground">CA net</span>
                <span className="font-semibold">{money(month?.revenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Charges application (20 %)</span>
                <span className="font-semibold text-amber-600">-{money(month?.appShare)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-muted-foreground">Reste a partager</span>
                <span className="font-semibold">{money(month?.distributable)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Part associe A</span>
                <span className="font-semibold text-primary">{money(month?.partnerA)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Part associe B</span>
                <span className="font-semibold text-cyan-600">{money(month?.partnerB)}</span>
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-4 w-4" /> Salons abonnes ({month?.salonsCount ?? 0})
              </p>
              {month?.salons?.length ? (
                <ul className="max-h-52 space-y-2 overflow-y-auto pr-1 text-sm">
                  {month.salons.map((salon) => (
                    <li
                      key={salon.subscriptionId}
                      className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{salon.tenantName}</span>
                        <span className="text-xs text-muted-foreground">
                          {salon.plan} · {formatDate(salon.date)}
                        </span>
                        {salon.commission > 0 && (
                          <span className="block text-xs text-rose-600">
                            commission {money(salon.commission)}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs font-semibold">{money(salon.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  Aucun abonnement valide enregistre pour ce mois.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tableau mensuel {report.year}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mois</TableHead>
                <TableHead>Salons abonnes</TableHead>
                <TableHead className="text-right">CA brut</TableHead>
                <TableHead className="text-right">Commissions</TableHead>
                <TableHead className="text-right">CA net</TableHead>
                <TableHead className="text-right">Charges 20 %</TableHead>
                <TableHead className="text-right">Reste a partager</TableHead>
                <TableHead className="text-right">Associe A</TableHead>
                <TableHead className="text-right">Associe B</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.months.map((item) => {
                const isSelected = item.month === selectedMonth;
                return (
                  <TableRow
                    key={item.month}
                    className={isSelected ? "bg-primary/5" : undefined}
                    onClick={() => setSelectedMonth(item.month)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") setSelectedMonth(item.month);
                    }}
                  >
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {item.label}
                        {item.month === currentMonthNumber && report.year === new Date().getFullYear() && (
                          <Badge variant="secondary" className="text-[10px]">En cours</Badge>
                        )}
                        {bestMonth?.month === item.month && item.revenue > 0 && (
                          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                      </span>
                    </TableCell>
                    <TableCell>{item.salonsCount}</TableCell>
                    <TableCell className="text-right font-semibold">{money(item.grossRevenue)}</TableCell>
                    <TableCell className="text-right text-rose-600">-{money(item.commissions)}</TableCell>
                    <TableCell className="text-right font-semibold">{money(item.revenue)}</TableCell>
                    <TableCell className="text-right text-amber-600">{money(item.appShare)}</TableCell>
                    <TableCell className="text-right">{money(item.distributable)}</TableCell>
                    <TableCell className="text-right text-primary">{money(item.partnerA)}</TableCell>
                    <TableCell className="text-right text-cyan-600">{money(item.partnerB)}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell>Total {report.year}</TableCell>
                <TableCell>{report.totals.salonsCount}</TableCell>
                <TableCell className="text-right">{money(report.totals.grossRevenue)}</TableCell>
                <TableCell className="text-right text-rose-600">-{money(report.totals.commissions)}</TableCell>
                <TableCell className="text-right">{money(report.totals.revenue)}</TableCell>
                <TableCell className="text-right">{money(report.totals.appShare)}</TableCell>
                <TableCell className="text-right">{money(report.totals.distributable)}</TableCell>
                <TableCell className="text-right">{money(report.totals.partnerA)}</TableCell>
                <TableCell className="text-right">{money(report.totals.partnerB)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cumul depuis le lancement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{money(report.allTime.revenue)}</p>
            <p className="text-xs text-muted-foreground">
              CA net · brut {money(report.allTime.grossRevenue)} · commissions{" "}
              {money(report.allTime.commissions)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {money(report.allTime.partnerA)} par associe apres charges
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Abonnements valides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{report.activeSubscriptions}</p>
            <p className="text-xs text-muted-foreground">
              {report.pendingSubscriptions.length} demande(s) en attente non comptabilisee(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Salons actifs sans abonnement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{report.activeTenantsWithoutSubscription.length}</p>
            <p className="text-xs text-muted-foreground">
              Affiches mais non comptes dans le chiffre d'affaires
            </p>
          </CardContent>
        </Card>
      </div>

      {report.activeTenantsWithoutSubscription.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Salons actifs sans abonnement enregistre
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {report.activeTenantsWithoutSubscription.map((tenant) => (
              <Badge key={tenant.id} variant="outline" className="gap-1">
                <Users className="h-3 w-3" /> {tenant.name}
                <span className="text-muted-foreground">· {tenant.plan || "plan non defini"}</span>
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {report.pendingSubscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-amber-600" />
              Demandes en attente (a valider)
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Salon</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Debut</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.pendingSubscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell className="font-medium">{subscription.tenantName}</TableCell>
                    <TableCell>{subscription.plan}</TableCell>
                    <TableCell>{formatDate(subscription.startDate)}</TableCell>
                    <TableCell className="text-right">{money(subscription.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/super-admin/subscriptions/validation">Valider</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
