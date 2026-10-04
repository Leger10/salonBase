// /src/pages/CashierPage.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext";
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ReceiptPDF } from '@/components/ReceiptPDF';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CreditCard,
  Banknote,
  Undo2,
  Download,
  Search,
  Receipt,
  RefreshCw,
  Printer,
  FileText,
  Wallet,
  ArrowLeftRight,
} from "lucide-react";

// ✅ Fonction pour formater le téléphone
const formatPhone = (phone) => {
  if (!phone) return 'Non renseigné';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  return phone;
};

// ✅ Fonction pour extraire les infos client d'une transaction
const getClientInfo = (transaction) => {
  try {
    // ✅ Structure correcte: transaction.appointment.client.profile
    if (transaction?.appointment?.client?.profile) {
      return {
        full_name: transaction.appointment.client.profile.full_name || 'Client',
        phone: transaction.appointment.client.profile.phone || 'Non renseigné',
        email: transaction.appointment.client.profile.email || '',
        client_id: transaction.appointment.client.id
      };
    }
    
    // ✅ Structure alternative: transaction.appointment.client (sans profile)
    if (transaction?.appointment?.client) {
      return {
        full_name: transaction.appointment.client.full_name || 
                   transaction.appointment.client.name || 'Client',
        phone: transaction.appointment.client.phone || 'Non renseigné',
        email: transaction.appointment.client.email || '',
        client_id: transaction.appointment.client.id
      };
    }
    
    // ✅ Structure: transaction.client (jointure directe)
    if (transaction?.client?.profile) {
      return {
        full_name: transaction.client.profile.full_name || 'Client',
        phone: transaction.client.profile.phone || 'Non renseigné',
        email: transaction.client.profile.email || '',
        client_id: transaction.client.id
      };
    }
    
    return {
      full_name: 'Client inconnu',
      phone: 'Non renseigné',
      email: '',
      client_id: null
    };
  } catch (error) {
    console.error('Error getting client info:', error);
    return {
      full_name: 'Client inconnu',
      phone: 'Non renseigné',
      email: '',
      client_id: null
    };
  }
};

export default function CashierPage() {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [paymentModal, setPaymentModal] = useState(false);
  const [refundModal, setRefundModal] = useState(false);
  const [receiptModal, setReceiptModal] = useState(false);

  // Forms
  const [paymentForm, setPaymentForm] = useState({
    appointment_id: "",
    amount: "",
    received_amount: "",
    payment_method: "cash",
    change: 0,
  });
  const [refundForm, setRefundForm] = useState({
    transaction_id: "",
    refund_amount: "",
    refund_reason: "",
  });

  // Transaction pour le reçu
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [tenantInfo, setTenantInfo] = useState(null);

  const [stats, setStats] = useState({
    todayRevenue: 0,
    monthlyTransactions: 0,
    averageValue: 0,
    totalRevenue: 0,
  });

  // ✅ Générer un numéro de reçu séquentiel
  const generateReceiptNumber = async (tenantId) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('receipt_number')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      let lastNumber = 0;
      if (data && data.length > 0 && data[0].receipt_number) {
        const match = data[0].receipt_number.match(/RCP-(\d+)/);
        if (match) {
          lastNumber = parseInt(match[1], 10);
        }
      }

      const newNumber = lastNumber + 1;
      const paddedNumber = String(newNumber).padStart(4, '0');
      return `RCP-${paddedNumber}`;
    } catch (error) {
      console.error('Error generating receipt number:', error);
      return `RCP-${Date.now()}`;
    }
  };

  // ✅ Récupérer les infos du salon
  const fetchTenantInfo = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) return;

      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();

      if (error) throw error;
      setTenantInfo(data);
    } catch (error) {
      console.error("Error fetching tenant info:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      
      if (!tenantId) {
        setTransactions([]);
        setAppointments([]);
        setLoading(false);
        return;
      }

      // ✅ Récupérer les transactions avec les infos client complètes
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select(`
          *,
          appointment:appointment_id (
            id,
            appointment_date,
            client_id,
            service_id,
            client:client_id (
              id,
              name,
              email,
              phone,
              address,
              profile_id,
              profile:profiles!profile_id (
                full_name,
                phone,
                email
              )
            )
          )
        `)
        .eq("tenant_id", tenantId)
        .order("transaction_date", { ascending: false })
        .limit(100);

      if (txError) {
        console.error('❌ Erreur transactions:', txError);
        throw txError;
      }

      console.log('📊 Transactions avec clients:', JSON.stringify(txData, null, 2));

      // ✅ Récupérer les rendez-vous à payer
      const { data: apptData, error: apptError } = await supabase
        .from("appointments")
        .select(`
          *,
          client:client_id (
            id,
            name,
            email,
            phone,
            address,
            profile_id,
            profile:profiles!profile_id (
              full_name,
              phone,
              email
            )
          ),
          service:service_id (id, name, price)
        `)
        .eq("tenant_id", tenantId)
        .in("status", ["completed", "confirmed"])
        .eq("payment_status", "unpaid")
        .order("appointment_date", { ascending: false });

      if (apptError) {
        console.error('❌ Erreur appointments:', apptError);
        throw apptError;
      }

      console.log('📅 Rendez-vous à payer:', JSON.stringify(apptData, null, 2));

      setTransactions(txData || []);
      setAppointments(apptData || []);

      // Calculer les statistiques
      const today = new Date().toISOString().split("T")[0];
      const todayTransactions = (txData || []).filter(
        (t) => t.transaction_date?.split("T")[0] === today && t.status !== "refunded"
      );

      const monthTransactions = (txData || []).filter(
        (t) => t.status !== "refunded"
      );
      
      const totalRevenue = monthTransactions.reduce(
        (sum, t) => sum + (t.amount || 0),
        0
      );

      setStats({
        todayRevenue: todayTransactions.reduce(
          (sum, t) => sum + (t.amount || 0),
          0
        ),
        monthlyTransactions: monthTransactions.length,
        averageValue: monthTransactions.length > 0
          ? totalRevenue / monthTransactions.length
          : 0,
        totalRevenue: totalRevenue,
      });
      
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fonction handleRefresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success("Données actualisées");
  };

  useEffect(() => {
    if (currentUser?.profile?.tenant_id) {
      fetchTenantInfo();
      fetchData();
    }
  }, [currentUser]);

  // ✅ Calcul automatique de la monnaie
  const calculateChange = (received, amount) => {
    const receivedNum = parseFloat(received) || 0;
    const amountNum = parseFloat(amount) || 0;
    const change = receivedNum - amountNum;
    return change > 0 ? change : 0;
  };

  const handleReceivedAmountChange = (e) => {
    const received = e.target.value;
    const amount = paymentForm.amount;
    const change = calculateChange(received, amount);
    setPaymentForm({
      ...paymentForm,
      received_amount: received,
      change: change,
    });
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error("Tenant non trouvé");
        return;
      }

      const appointment = appointments.find(
        (a) => a.id === paymentForm.appointment_id
      );
      if (!appointment) {
        toast.error("Sélectionnez un rendez-vous");
        return;
      }

      const amount = parseFloat(paymentForm.amount);
      const receivedAmount = parseFloat(paymentForm.received_amount) || amount;
      
      if (!amount || amount <= 0) {
        toast.error("Montant invalide");
        return;
      }

      if (receivedAmount < amount) {
        toast.error(`Le montant reçu (${receivedAmount.toLocaleString()} FCFA) est inférieur au montant à payer (${amount.toLocaleString()} FCFA)`);
        return;
      }

      const change = receivedAmount - amount;

      // ✅ Générer un numéro de reçu séquentiel
      const receiptNumber = await generateReceiptNumber(tenantId);

      // Insérer la transaction
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          tenant_id: tenantId,
          appointment_id: appointment.id,
          client_id: appointment.client_id,
          amount: amount,
          payment_method: paymentForm.payment_method,
          receipt_number: receiptNumber,
          status: "completed",
          transaction_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Mettre à jour le statut de paiement du rendez-vous
      await supabase
        .from("appointments")
        .update({ payment_status: "paid" })
        .eq("id", appointment.id);

      // ✅ Stocker la transaction pour le reçu avec les infos client
      setCurrentTransaction({
        ...data,
        appointment: appointment,
        change: change,
        received_amount: receivedAmount,
      });

      toast.success(
        `💰 Paiement de ${amount.toLocaleString()} FCFA enregistré${change > 0 ? ` - Monnaie à rendre: ${change.toLocaleString()} FCFA` : ''}`
      );

      setPaymentModal(false);
      setPaymentForm({
        appointment_id: "",
        amount: "",
        received_amount: "",
        payment_method: "cash",
        change: 0,
      });
      
      await fetchData();
      
      // ✅ Ouvrir le modal du reçu
      setReceiptModal(true);
      
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error(error.message || "Échec de l'enregistrement");
    }
  };

  const handleRefund = async (e) => {
    e.preventDefault();
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error("Tenant non trouvé");
        return;
      }

      const transaction = transactions.find(
        (t) => t.id === refundForm.transaction_id
      );
      if (!transaction) {
        toast.error("Transaction non trouvée");
        return;
      }

      const refundAmount = parseFloat(refundForm.refund_amount);
      if (!refundAmount || refundAmount <= 0) {
        toast.error("Montant de remboursement invalide");
        return;
      }

      if (refundAmount > transaction.amount) {
        toast.error("Le montant du remboursement ne peut pas dépasser le montant initial");
        return;
      }

      const { error } = await supabase.from("transactions").insert({
        tenant_id: tenantId,
        appointment_id: transaction.appointment_id,
        client_id: transaction.client_id,
        amount: -refundAmount,
        payment_method: transaction.payment_method,
        receipt_number: `REF-${Date.now()}`,
        status: "refunded",
        transaction_date: new Date().toISOString(),
      });

      if (error) throw error;

      await supabase
        .from("transactions")
        .update({ status: "refunded" })
        .eq("id", refundForm.transaction_id);

      await supabase
        .from("appointments")
        .update({ payment_status: "refunded" })
        .eq("id", transaction.appointment_id);

      toast.success("Remboursement effectué avec succès");
      setRefundModal(false);
      setRefundForm({
        transaction_id: "",
        refund_amount: "",
        refund_reason: "",
      });
      await fetchData();
    } catch (error) {
      console.error("Error processing refund:", error);
      toast.error(error.message || "Échec du remboursement");
    }
  };

  const handleExport = async () => {
    try {
      if (transactions.length === 0) {
        toast.warning("Aucune transaction à exporter");
        return;
      }

      const exportData = transactions.map((tx) => {
        const clientInfo = getClientInfo(tx);
        return {
          Date: format(new Date(tx.transaction_date), "dd/MM/yyyy HH:mm"),
          Client: clientInfo.full_name || "Inconnu",
          Téléphone: formatPhone(clientInfo.phone),
          Montant: `${Math.abs(tx.amount).toLocaleString()} FCFA`,
          Méthode: getPaymentMethodLabel(tx.payment_method),
          Statut: tx.status === "completed" ? "Complété" : "Remboursé",
          Reçu: tx.receipt_number || "-",
        };
      });

      const csvContent = [
        Object.keys(exportData[0] || {}).join(","),
        ...exportData.map((row) => Object.values(row).join(",")),
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Export CSV réussi");
    } catch (err) {
      console.error("Error exporting:", err);
      toast.error("Erreur lors de l'export");
    }
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: "💰 Espèces",
      card: "💳 Carte Bancaire",
      orange_money: "📱 Orange Money",
      moov_money: "📱 Moov Money",
      wave: "🌊 Wave",
    };
    return labels[method] || method;
  };

  const getPaymentMethodIcon = (method) => {
    if (method === "cash") return <Banknote className="h-4 w-4" />;
    return <CreditCard className="h-4 w-4" />;
  };

  if (!currentUser?.profile?.tenant_id && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Banknote className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Aucun salon associé</h2>
        <p className="text-muted-foreground max-w-md">
          Vous devez être associé à un salon pour accéder à la caisse.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Banknote className="h-8 w-8 text-primary" />
            Caisse
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos paiements et transactions.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? "Actualisation..." : "Actualiser"}
          </Button>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button onClick={() => setPaymentModal(true)} className="gap-2">
            <Banknote className="w-4 h-4" /> Encaisser
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Recettes du jour
            </p>
            <p className="text-3xl font-bold mt-2 text-green-600">
              {stats.todayRevenue.toLocaleString()} FCFA
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Transactions (mois)
            </p>
            <p className="text-3xl font-bold mt-2 text-blue-600">
              {stats.monthlyTransactions}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Valeur moyenne
            </p>
            <p className="text-3xl font-bold mt-2 text-purple-600">
              {Math.round(stats.averageValue).toLocaleString()} FCFA
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Total encaissé
            </p>
            <p className="text-3xl font-bold mt-2 text-amber-600">
              {stats.totalRevenue.toLocaleString()} FCFA
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rendez-vous en attente */}
      {appointments.length > 0 && (
        <Card className="border-2 border-amber-200 bg-amber-50/30 shadow-sm">
          <CardHeader>
            <CardTitle className="text-amber-700 flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Rendez-vous à encaisser ({appointments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.slice(0, 5).map((appt) => {
                    // Récupérer le nom du client depuis profile ou directement
                    const clientName = appt.client?.profile?.full_name || 
                                       appt.client?.name || 
                                       'Client';
                    const clientPhone = appt.client?.profile?.phone || 
                                        appt.client?.phone || 
                                        null;
                    return (
                      <TableRow key={appt.id}>
                        <TableCell>
                          {format(new Date(appt.appointment_date), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {clientName}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatPhone(clientPhone)}
                        </TableCell>
                        <TableCell>{appt.service?.name || "N/A"}</TableCell>
                        <TableCell className="font-bold">
                          {appt.service?.price?.toLocaleString() || 0} FCFA
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="gap-1 bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setPaymentForm({
                                appointment_id: appt.id,
                                amount: appt.service?.price?.toString() || "",
                                received_amount: "",
                                payment_method: "cash",
                                change: 0,
                              });
                              setPaymentModal(true);
                            }}
                          >
                            <Banknote className="h-3 w-3" />
                            Encaisser
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historique des transactions */}
      <Card className="dashboard-card border-none shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Historique des transactions
            <Badge variant="secondary" className="ml-2">
              {transactions.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="h-16 w-16 text-muted-foreground mb-4 opacity-30" />
              <p className="text-lg font-medium text-muted-foreground">
                Aucune transaction
              </p>
              <p className="text-sm text-muted-foreground">
                Les paiements enregistrés apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="pl-6">Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Reçu</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const clientInfo = getClientInfo(tx);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="pl-6 text-sm">
                          {format(
                            new Date(tx.transaction_date),
                            "dd MMM yyyy HH:mm",
                            { locale: fr }
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {clientInfo.full_name || "Client inconnu"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatPhone(clientInfo.phone)}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${tx.amount < 0 ? 'text-red-500' : ''}`}>
                          {Math.abs(tx.amount).toLocaleString()} FCFA
                          {tx.amount < 0 && " (Remb.)"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getPaymentMethodIcon(tx.payment_method)}
                            {getPaymentMethodLabel(tx.payment_method)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              tx.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {tx.status === "completed" ? "Complété" : "Remboursé"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {tx.receipt_number || "-"}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {tx.status !== "refunded" && tx.amount > 0 && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCurrentTransaction({
                                    ...tx,
                                    appointment: tx.appointment,
                                    change: 0,
                                    received_amount: tx.amount,
                                  });
                                  setReceiptModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-700"
                                title="Voir le reçu"
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                Reçu
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setRefundForm({
                                    ...refundForm,
                                    transaction_id: tx.id,
                                    refund_amount: tx.amount.toString(),
                                    refund_reason: "",
                                  });
                                  setRefundModal(true);
                                }}
                                className="text-destructive hover:text-destructive"
                              >
                                <Undo2 className="w-4 h-4 mr-1" />
                                Rembourser
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal d'encaissement avec monnaie */}
      <Dialog open={paymentModal} onOpenChange={setPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-green-600" />
              Enregistrer un paiement
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="space-y-2">
              <Label>Rendez-vous associé</Label>
              <Select
                value={paymentForm.appointment_id}
                onValueChange={async (v) => {
                  const appt = appointments.find((a) => a.id === v);
                  setPaymentForm({
                    ...paymentForm,
                    appointment_id: v,
                    amount: appt?.service?.price?.toString() || "",
                    received_amount: "",
                    change: 0,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rendez-vous" />
                </SelectTrigger>
                <SelectContent>
                  {appointments.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Aucun rendez-vous à encaisser
                    </SelectItem>
                  ) : (
                    appointments.map((a) => {
                      const clientName = a.client?.profile?.full_name || 
                                         a.client?.name || 
                                         'Client';
                      return (
                        <SelectItem key={a.id} value={a.id}>
                          {format(new Date(a.appointment_date), "dd/MM/yyyy")} -{" "}
                          {clientName} ({a.service?.name || "Sans service"})
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Montant à payer (FCFA)</Label>
              <Input
                type="number"
                step="100"
                value={paymentForm.amount}
                readOnly
                className="bg-muted/50 font-bold"
              />
            </div>

            {/* ✅ Champ: Montant reçu du client */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-500" />
                Montant reçu du client (FCFA) *
              </Label>
              <Input
                type="number"
                step="100"
                required
                value={paymentForm.received_amount}
                onChange={handleReceivedAmountChange}
                className="bg-background border-2 border-blue-200 focus:border-blue-500"
                placeholder="Ex: 10000"
                autoFocus
              />
            </div>

            {/* ✅ Affichage de la monnaie à rendre */}
            {paymentForm.change > 0 && (
              <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-700">Monnaie à rendre</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    {paymentForm.change.toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            )}

            {paymentForm.received_amount && parseFloat(paymentForm.received_amount) > 0 && 
             parseFloat(paymentForm.received_amount) < parseFloat(paymentForm.amount) && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-lg">
                <p className="text-sm text-red-600">
                  ⚠️ Le montant reçu ({parseFloat(paymentForm.received_amount).toLocaleString()} FCFA) est inférieur au montant à payer ({parseFloat(paymentForm.amount).toLocaleString()} FCFA)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Méthode de paiement *</Label>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(v) =>
                  setPaymentForm({ ...paymentForm, payment_method: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">💰 Espèces</SelectItem>
                  <SelectItem value="card">💳 Carte Bancaire</SelectItem>
                  <SelectItem value="orange_money">📱 Orange Money</SelectItem>
                  <SelectItem value="moov_money">📱 Moov Money</SelectItem>
                  <SelectItem value="wave">🌊 Wave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentModal(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={
                  !paymentForm.appointment_id || 
                  !paymentForm.amount || 
                  !paymentForm.received_amount ||
                  parseFloat(paymentForm.received_amount) < parseFloat(paymentForm.amount)
                }
              >
                <Banknote className="w-4 h-4 mr-2" />
                Valider le paiement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ✅ Modal du reçu PDF */}
      <Dialog open={receiptModal} onOpenChange={setReceiptModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Reçu de paiement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {currentTransaction && (
              <div className="space-y-3">
                {(() => {
                  const clientInfo = getClientInfo(currentTransaction);
                  return (
                    <div className="p-4 bg-muted/20 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Client</span>
                        <span className="font-medium">
                          {clientInfo.full_name || 'Client inconnu'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Téléphone</span>
                        <span className="font-medium">
                          {formatPhone(clientInfo.phone)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Montant</span>
                        <span className="font-bold text-primary">
                          {currentTransaction.amount.toLocaleString()} FCFA
                        </span>
                      </div>
                      {currentTransaction.change > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>🔄 Monnaie rendue</span>
                          <span className="font-bold">
                            {currentTransaction.change.toLocaleString()} FCFA
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reçu n°</span>
                        <span className="font-mono text-sm font-bold text-primary">
                          {currentTransaction.receipt_number}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* ✅ Boutons d'action */}
                <div className="flex flex-col gap-2">
                  <PDFDownloadLink
                    document={
                      <ReceiptPDF
                        transaction={currentTransaction}
                        tenant={tenantInfo}
                        client={currentTransaction.appointment?.client}
                        service={currentTransaction.appointment?.service}
                        change={currentTransaction.change || 0}
                      />
                    }
                    fileName={`reçu-${currentTransaction.receipt_number}.pdf`}
                  >
                    {({ blob, url, loading, error }) => (
                      <Button className="w-full gap-2" disabled={loading}>
                        <Printer className="h-4 w-4" />
                        {loading ? "Génération..." : "📄 Télécharger le reçu PDF"}
                      </Button>
                    )}
                  </PDFDownloadLink>
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.print()}
                  >
                    🖨️ Imprimer
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReceiptModal(false)}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de remboursement */}
      <Dialog open={refundModal} onOpenChange={setRefundModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Undo2 className="h-5 w-5" />
              Effectuer un remboursement
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRefund} className="space-y-4">
            <div className="space-y-2">
              <Label>Montant à rembourser (FCFA) *</Label>
              <Input
                type="number"
                step="100"
                required
                value={refundForm.refund_amount}
                onChange={(e) =>
                  setRefundForm({
                    ...refundForm,
                    refund_amount: e.target.value,
                  })
                }
                className="bg-background"
                placeholder="Ex: 5000"
              />
            </div>
            <div className="space-y-2">
              <Label>Raison du remboursement *</Label>
              <Input
                required
                value={refundForm.refund_reason}
                onChange={(e) =>
                  setRefundForm({
                    ...refundForm,
                    refund_reason: e.target.value,
                  })
                }
                placeholder="Annulation, erreur, etc."
                className="bg-background"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRefundModal(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={!refundForm.refund_amount || !refundForm.refund_reason}
              >
                Confirmer le remboursement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}