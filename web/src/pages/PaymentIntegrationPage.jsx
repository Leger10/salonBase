import React, { useState, useEffect } from "react";
import DashboardLayout from "@/layouts/DashboardLayout.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";
import { Switch } from "@/components/ui/switch.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CreditCard,
  Link as LinkIcon,
  RefreshCcw,
  Wallet,
  Building2,
  Smartphone,
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext";

export default function PaymentIntegrationPage() {
  const [integrations, setIntegrations] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testingStripe, setTestingStripe] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser?.profile?.tenant_id) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;

      // Charger les transactions récentes
      const { data: transactionsData, error: txError } = await supabase
        .from("transactions")
        .select(
          `
          *,
          client:client_id (
            id,
            profile:profile_id (
              full_name,
              email
            )
          ),
          cashier:cashier_id (
            id,
            profile:profile_id (
              full_name
            )
          )
        `,
        )
        .eq("tenant_id", tenantId)
        .order("transaction_date", { ascending: false })
        .limit(20);

      if (txError) throw txError;

      setTransactions(transactionsData || []);

      // Configurations des intégrations (données mock ou à venir)
      setIntegrations([
        {
          id: "stripe",
          provider: "stripe",
          name: "Stripe",
          status: "disconnected",
          icon: CreditCard,
          description: "Paiements par carte bancaire en ligne",
        },
        {
          id: "orange_money",
          provider: "orange_money",
          name: "Orange Money",
          status: "available",
          icon: Smartphone,
          description: "Paiement mobile Orange Money",
        },
        {
          id: "moov_money",
          provider: "moov_money",
          name: "Moov Money",
          status: "available",
          icon: Smartphone,
          description: "Paiement mobile Moov Money",
        },
        {
          id: "wave",
          provider: "wave",
          name: "Wave",
          status: "available",
          icon: Wallet,
          description: "Paiement par Wave",
        },
      ]);
    } catch (err) {
      console.error("Error loading payment data:", err);
      toast.error("Erreur de chargement des paramètres de paiement");
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (provider) => {
    if (provider === "stripe") setTestingStripe(true);
    try {
      // Simuler un test de connexion
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success(`Connexion à ${provider} réussie !`);
    } catch (err) {
      toast.error(err.message || "Échec de la connexion");
    } finally {
      if (provider === "stripe") setTestingStripe(false);
    }
  };

  const getPaymentMethodIcon = (method) => {
    const icons = {
      cash: <Building2 className="h-4 w-4" />,
      card: <CreditCard className="h-4 w-4" />,
      orange_money: <Smartphone className="h-4 w-4" />,
      moov_money: <Smartphone className="h-4 w-4" />,
      wave: <Wallet className="h-4 w-4" />,
      gift_card: <CreditCard className="h-4 w-4" />,
    };
    return icons[method] || <CreditCard className="h-4 w-4" />;
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: "Espèces",
      card: "Carte Bancaire",
      orange_money: "Orange Money",
      moov_money: "Moov Money",
      wave: "Wave",
      gift_card: "Carte Cadeau",
    };
    return labels[method] || method;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "dd MMM yyyy HH:mm", { locale: fr });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Paiements & Intégrations
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos passerelles de paiement et suivez vos transactions.
            </p>
          </div>
        </div>

        <Tabs defaultValue="gateways" className="w-full">
          <TabsList className="w-full flex justify-start h-auto bg-card border rounded-xl p-1 gap-1 mb-6">
            <TabsTrigger
              value="gateways"
              className="flex-1 max-w-[200px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Passerelles
            </TabsTrigger>
            <TabsTrigger
              value="methods"
              className="flex-1 max-w-[200px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Méthodes & Frais
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-1 max-w-[200px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Transactions
            </TabsTrigger>
          </TabsList>

          {/* Passerelles de paiement */}
          <TabsContent value="gateways" className="space-y-6 m-0">
            <Card className="dashboard-card border-none shadow-md">
              <CardHeader className="border-b bg-muted/10">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-indigo-500" /> Stripe
                    </CardTitle>
                    <CardDescription>
                      Paiements par carte bancaire en ligne
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-yellow-100 text-yellow-800"
                  >
                    À configurer
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Clé Publique (Publishable Key)</Label>
                    <Input
                      type="text"
                      placeholder="pk_live_..."
                      className="font-mono bg-muted/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Clé Secrète (Secret Key)</Label>
                    <Input
                      type="password"
                      placeholder="sk_live_..."
                      className="font-mono bg-muted/50"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleTestConnection("stripe")}
                    disabled={testingStripe}
                  >
                    {testingStripe ? (
                      <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <LinkIcon className="w-4 h-4 mr-2" />
                    )}
                    Tester la connexion
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mobile Money */}
            <Card className="dashboard-card border-none shadow-md">
              <CardHeader className="border-b bg-muted/10">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-orange-500" /> Mobile
                      Money
                    </CardTitle>
                    <CardDescription>
                      Paiements par Orange Money, Moov Money et Wave
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800"
                  >
                    Disponible
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-sm">
                  Les paiements par mobile money sont automatiquement
                  disponibles via l'API partenaire. Configuration requise auprès
                  de votre fournisseur.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Méthodes de paiement */}
          <TabsContent value="methods" className="m-0">
            <Card className="dashboard-card border-none shadow-md">
              <CardHeader>
                <CardTitle>Méthodes Acceptées en Caisse</CardTitle>
                <CardDescription>
                  Gérez les moyens de paiement acceptés dans votre salon
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="table-header">
                    <TableRow>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Frais (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { id: "cash", name: "Espèces", fee: 0, active: true },
                      {
                        id: "card",
                        name: "Carte Bancaire",
                        fee: 1.5,
                        active: true,
                      },
                      {
                        id: "orange_money",
                        name: "Orange Money",
                        fee: 1,
                        active: true,
                      },
                      {
                        id: "moov_money",
                        name: "Moov Money",
                        fee: 1,
                        active: true,
                      },
                      { id: "wave", name: "Wave", fee: 1, active: true },
                      {
                        id: "gift_card",
                        name: "Carte Cadeau",
                        fee: 0,
                        active: false,
                      },
                    ].map((method) => (
                      <TableRow key={method.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          {getPaymentMethodIcon(method.id)}
                          {method.name}
                        </TableCell>
                        <TableCell>
                          <Switch defaultChecked={method.active} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            defaultValue={method.fee}
                            className="w-20 ml-auto text-right h-8"
                            step="0.1"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-6 pt-4 border-t">
                  <Button variant="outline" className="w-full">
                    Enregistrer les modifications
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Historique des transactions */}
          <TabsContent value="history" className="m-0">
            <Card className="dashboard-card border-none shadow-md">
              <CardHeader>
                <CardTitle>Dernières Transactions</CardTitle>
                <CardDescription>
                  Historique des paiements effectués dans votre salon
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6">
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-30" />
                    <p className="text-muted-foreground">
                      Aucune transaction récente
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="pl-6">Date</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Méthode</TableHead>
                          <TableHead>Caissier</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                          <TableHead className="text-center pr-6">
                            Statut
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="pl-6 text-sm">
                              {formatDate(tx.transaction_date)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {tx.client?.profile?.full_name ||
                                "Client inconnu"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {getPaymentMethodIcon(tx.payment_method)}
                                <span className="text-sm">
                                  {getPaymentMethodLabel(tx.payment_method)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {tx.cashier?.profile?.full_name || "-"}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {tx.amount?.toLocaleString()} FCFA
                            </TableCell>
                            <TableCell className="text-center pr-6">
                              <Badge
                                className={
                                  tx.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }
                              >
                                {tx.status === "completed"
                                  ? "Complété"
                                  : "En attente"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
