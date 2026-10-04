// /src/pages/AdminPaymentsPage.jsx
import React, { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import {
  DollarSign,
  Search,
  RefreshCw,
  Eye,
  Download,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  User,
  Mail,
  Phone,
  FileText,
  ChevronDown,
  Filter,
  CreditCard,
  Wallet,
  Banknote,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  AlertCircle,
  Crown,
  Receipt,
  FileCheck,
  Users,
  Scissors,
  Package,
  Zap,
  Shield,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ============================================
// COMPOSANT POUR LE PDF - VERSION CORRIGÉE
// ============================================
const generateReceiptPDF = (subscription, tenantInfo) => {
  // Fonction pour générer le HTML du reçu
  const generateHTML = () => {
    const date = new Date();
    const formattedDate = format(date, "dd MMMM yyyy 'à' HH:mm", { locale: fr });
    
    // Récupérer le nom du plan avec fallback
    const planName = subscription.plan_name || "Plan Standard";

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Reçu d'abonnement - ${tenantInfo?.name || 'BeautyFlow'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Arial', sans-serif;
              background: #f5f5f5;
              padding: 40px;
              color: #333;
            }
            .receipt {
              max-width: 800px;
              margin: 0 auto;
              background: #fff;
              border-radius: 16px;
              padding: 40px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #ec4899;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header-left {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            .logo {
              width: 60px;
              height: 60px;
              border-radius: 12px;
              background: #ec4899;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 28px;
              font-weight: bold;
            }
            .title h1 {
              color: #ec4899;
              font-size: 24px;
              margin: 0;
            }
            .title p {
              color: #666;
              font-size: 14px;
              margin: 4px 0 0 0;
            }
            .receipt-number {
              text-align: right;
              font-size: 14px;
              color: #666;
            }
            .receipt-number strong {
              color: #333;
              font-size: 18px;
            }
            .badge {
              display: inline-block;
              padding: 4px 16px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              margin-top: 4px;
            }
            .badge-success {
              background: #d1fae5;
              color: #065f46;
            }
            .badge-pending {
              background: #fef3c7;
              color: #92400e;
            }
            .details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              background: #f8f9fa;
              padding: 20px;
              border-radius: 12px;
              margin: 20px 0;
            }
            .details-item label {
              font-size: 12px;
              color: #999;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .details-item p {
              font-size: 16px;
              font-weight: 500;
              margin-top: 4px;
            }
            .amount-box {
              background: linear-gradient(135deg, #ec4899, #f472b6);
              color: white;
              padding: 20px 30px;
              border-radius: 12px;
              text-align: center;
              margin: 20px 0;
            }
            .amount-box .label {
              font-size: 14px;
              opacity: 0.9;
            }
            .amount-box .amount {
              font-size: 36px;
              font-weight: 700;
              margin-top: 4px;
            }
            .features {
              margin: 20px 0;
              padding: 20px;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
            }
            .features h3 {
              font-size: 14px;
              color: #666;
              margin-bottom: 12px;
            }
            .features ul {
              list-style: none;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
            }
            .features ul li {
              font-size: 14px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .features ul li::before {
              content: "✓";
              color: #ec4899;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 12px;
              color: #999;
            }
            .footer p {
              margin: 4px 0;
            }
            @media print {
              body { background: #fff; padding: 20px; }
              .receipt { box-shadow: none; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="header-left">
                <div class="logo">${tenantInfo?.name?.charAt(0) || 'B'}</div>
                <div class="title">
                  <h1>${tenantInfo?.name || 'BeautyFlow'}</h1>
                  <p>${tenantInfo?.address || ''}</p>
                </div>
              </div>
              <div class="receipt-number">
                <p>N° de reçu</p>
                <strong>#${subscription.receipt_number || subscription.id.substring(0, 8).toUpperCase()}</strong>
                <div>
                  <span class="badge ${subscription.status === 'active' || subscription.status === 'completed' || subscription.status === 'paid' ? 'badge-success' : 'badge-pending'}">
                    ${subscription.status === 'active' || subscription.status === 'completed' || subscription.status === 'paid' ? '✅ Actif' : '⏳ En attente'}
                  </span>
                </div>
              </div>
            </div>

            <div class="details">
              <div class="details-item">
                <label>Plan</label>
                <p>${planName}</p>
              </div>
              <div class="details-item">
                <label>Durée</label>
                <p>${subscription.duration_months || 1} mois</p>
              </div>
              <div class="details-item">
                <label>Date de début</label>
                <p>${subscription.start_date ? format(new Date(subscription.start_date), 'dd MMMM yyyy', { locale: fr }) : 'N/A'}</p>
              </div>
              <div class="details-item">
                <label>Date de fin</label>
                <p>${subscription.end_date ? format(new Date(subscription.end_date), 'dd MMMM yyyy', { locale: fr }) : 'N/A'}</p>
              </div>
            </div>

            <div class="amount-box">
              <div class="label">Montant réglé</div>
              <div class="amount">${(subscription.amount || 0).toLocaleString()} FCFA</div>
            </div>

            <div class="features">
              <h3>📋 Fonctionnalités incluses</h3>
              <ul>
                <li>Jusqu'à ${subscription.max_employees || 5} employés</li>
                <li>Jusqu'à ${subscription.max_services || 10} services</li>
                <li>Jusqu'à ${subscription.max_products || 20} produits</li>
                <li>Gestion des rendez-vous</li>
                <li>File d'attente</li>
                <li>Programme de fidélité</li>
              </ul>
            </div>

            <div style="margin: 20px 0; padding: 16px; background: #f8f9fa; border-radius: 8px; text-align: center; font-size: 14px; color: #666;">
              <p>📧 ${tenantInfo?.email || ''}</p>
              <p>📞 ${tenantInfo?.phone || ''}</p>
            </div>

            <div class="footer">
              <p>Reçu généré le ${formattedDate}</p>
              <p>© ${new Date().getFullYear()} ${tenantInfo?.name || 'BeautyFlow'} - Tous droits réservés</p>
              <p style="font-size: 11px; color: #bbb;">Ce document fait foi de paiement</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  // ✅ CORRECTION: Ouvrir une nouvelle fenêtre avec le contenu HTML
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (printWindow) {
    // Écrire le HTML dans la nouvelle fenêtre
    printWindow.document.open();
    printWindow.document.write(generateHTML());
    printWindow.document.close();
    printWindow.focus();
    
    // Attendre que la page soit chargée puis imprimer
    printWindow.onload = function() {
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {
          console.log('Erreur lors de l\'impression:', e);
        }
      }, 800);
    };
  } else {
    // Fallback: si la fenêtre ne s'ouvre pas, ouvrir dans un nouvel onglet avec le HTML
    const htmlContent = generateHTML();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    URL.revokeObjectURL(url);
  }
};

export default function AdminPaymentsPage() {
  const { currentUser } = useAuth();
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    totalAmount: 0,
    pending: 0,
    completed: 0,
    failed: 0,
  });

  useEffect(() => {
    if (currentUser?.profile?.tenant_id) {
      fetchTenantInfo();
      fetchPayments();
    }
  }, [currentUser]);

  const fetchTenantInfo = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) return;

      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, logo_url, address, phone, email")
        .eq("id", tenantId)
        .single();

      if (!error && data) {
        setTenantInfo(data);
      }
    } catch (error) {
      console.error("Error fetching tenant info:", error);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        setPayments([]);
        setFilteredPayments([]);
        setLoading(false);
        return;
      }

      console.log("🔍 Récupération des paiements d'abonnements pour tenant:", tenantId);

      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          tenant:tenant_id (
            id,
            name,
            logo_url,
            address,
            phone,
            email
          )
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Erreur Supabase:", error);
        throw error;
      }

      console.log(`✅ ${data?.length || 0} abonnements récupérés`);

      const formattedPayments = (data || []).map((sub) => {
        let planName = sub.plan_name || sub.name || "Plan Standard";
        
        if (!planName || planName === "Plan Standard") {
          const price = sub.amount || 0;
          if (price <= 10000) planName = "Plan Basic";
          else if (price <= 25000) planName = "Plan Pro";
          else if (price <= 50000) planName = "Plan Premium";
          else planName = "Plan Enterprise";
        }

        return {
          id: sub.id,
          receipt_number: sub.receipt_number || `SUB-${String(sub.id).substring(0, 8).toUpperCase()}`,
          plan_name: planName,
          amount: sub.amount || 0,
          status: sub.status || "pending",
          created_at: sub.created_at,
          start_date: sub.start_date,
          end_date: sub.end_date,
          duration_months: sub.duration_months || 1,
          max_employees: sub.max_employees || 5,
          max_services: sub.max_services || 10,
          max_products: sub.max_products || 20,
          payment_method: sub.payment_method || "card",
          features: sub.features || {},
          tenant_name: sub.tenant?.name || "Salon",
          tenant_logo: sub.tenant?.logo_url || null,
          is_renewal: sub.is_renewal || false,
          currency: sub.currency || "FCFA",
        };
      });

      setPayments(formattedPayments);
      setFilteredPayments(formattedPayments);

      const total = formattedPayments.length;
      const totalAmount = formattedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const pending = formattedPayments.filter((p) => p.status === "pending" || p.status === "unpaid").length;
      const completed = formattedPayments.filter((p) => p.status === "active" || p.status === "completed" || p.status === "paid").length;
      const failed = formattedPayments.filter((p) => p.status === "failed" || p.status === "cancelled" || p.status === "expired").length;

      setStats({
        total,
        totalAmount,
        pending,
        completed,
        failed,
      });
    } catch (error) {
      console.error("❌ Error fetching payments:", error);
      setError(error.message || "Erreur lors du chargement des paiements");
      toast.error("Erreur lors du chargement des paiements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...payments];

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.plan_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => {
        if (statusFilter === "pending") return p.status === "pending" || p.status === "unpaid";
        if (statusFilter === "active") return p.status === "active" || p.status === "completed" || p.status === "paid";
        if (statusFilter === "failed") return p.status === "failed" || p.status === "cancelled" || p.status === "expired";
        return p.status === statusFilter;
      });
    }

    setFilteredPayments(filtered);
  }, [payments, searchTerm, statusFilter]);

  const getStatusBadge = (status) => {
    const config = {
      pending: {
        label: "⏳ En attente",
        className: "bg-yellow-100 text-yellow-800 border-yellow-200",
      },
      unpaid: {
        label: "⏳ Non payé",
        className: "bg-yellow-100 text-yellow-800 border-yellow-200",
      },
      active: {
        label: "✅ Actif",
        className: "bg-green-100 text-green-800 border-green-200",
      },
      completed: {
        label: "✅ Terminé",
        className: "bg-green-100 text-green-800 border-green-200",
      },
      paid: {
        label: "✅ Payé",
        className: "bg-green-100 text-green-800 border-green-200",
      },
      failed: {
        label: "❌ Échoué",
        className: "bg-red-100 text-red-800 border-red-200",
      },
      cancelled: {
        label: "❌ Annulé",
        className: "bg-red-100 text-red-800 border-red-200",
      },
      expired: {
        label: "⏰ Expiré",
        className: "bg-gray-100 text-gray-800 border-gray-200",
      },
      refunded: {
        label: "↩️ Remboursé",
        className: "bg-gray-100 text-gray-800 border-gray-200",
      },
    };
    return config[status] || config.pending;
  };

  const getMethodIcon = (method) => {
    const icons = {
      cash: <Banknote className="h-4 w-4" />,
      card: <CreditCard className="h-4 w-4" />,
      mobile: <Wallet className="h-4 w-4" />,
      transfer: <ArrowUpDown className="h-4 w-4" />,
    };
    return icons[method] || <CreditCard className="h-4 w-4" />;
  };

  const getMethodLabel = (method) => {
    const labels = {
      cash: "💵 Espèces",
      card: "💳 Carte bancaire",
      mobile: "📱 Mobile Money",
      transfer: "🏦 Virement",
    };
    return labels[method] || method || "Non spécifié";
  };

  const openPaymentDetails = (payment) => {
    setSelectedPayment(payment);
    setIsDetailsOpen(true);
  };

  const handleDownloadReceipt = (payment) => {
    if (!payment) {
      toast.error("Aucun paiement sélectionné");
      return;
    }
    
    const receiptData = {
      ...payment,
      receipt_number: payment.receipt_number || payment.id.substring(0, 8).toUpperCase(),
      plan_name: payment.plan_name || "Plan Standard",
    };
    
    generateReceiptPDF(receiptData, tenantInfo);
    toast.success("Reçu en cours de génération...");
  };

  const handleExport = () => {
    if (filteredPayments.length === 0) {
      toast.warning("Aucun paiement à exporter");
      return;
    }
    toast.success(`Export de ${filteredPayments.length} paiements en cours...`);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold">Erreur de chargement</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button className="mt-4" onClick={fetchPayments}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            Paiements & Abonnements
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez tous les paiements d'abonnements de votre salon
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchPayments}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={filteredPayments.length === 0}
          >
            <Download className="h-4 w-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-primary font-medium">
                  {stats.totalAmount.toLocaleString()} FCFA
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-yellow-50 to-yellow-100/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.pending}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Actifs</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completed}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-red-50 to-red-100/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Échoués</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.failed}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par plan ou numéro..."
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-background">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">📊 Tous les statuts</SelectItem>
            <SelectItem value="pending">⏳ En attente</SelectItem>
            <SelectItem value="active">✅ Actifs</SelectItem>
            <SelectItem value="failed">❌ Échoués</SelectItem>
            <SelectItem value="refunded">↩️ Remboursés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste des paiements */}
      <Card className="border-none shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Historique des abonnements</CardTitle>
            <Badge variant="outline" className="gap-1">
              <Crown className="h-3 w-3" />
              {filteredPayments.length} abonnements
            </Badge>
          </div>
          <CardDescription>
            Consultez l'historique complet des abonnements et paiements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <Crown className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">Aucun abonnement trouvé</p>
              <p className="text-sm mt-1">
                {searchTerm || statusFilter !== "all"
                  ? "Modifiez vos filtres"
                  : "Souscrivez à un abonnement pour commencer"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.slice(0, 20).map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {payment.receipt_number || payment.id.substring(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-primary" />
                          <span className="font-medium">{payment.plan_name}</span>
                        </div>
                        {payment.is_renewal && (
                          <Badge className="bg-blue-100 text-blue-800 text-[10px]">
                            🔄 Renouvellement
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {payment.amount?.toLocaleString()} FCFA
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{payment.duration_months} mois</div>
                        {payment.start_date && (
                          <div className="text-xs text-muted-foreground">
                            Début: {format(new Date(payment.start_date), "dd/MM/yyyy")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(payment.status).className}>
                          {getStatusBadge(payment.status).label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {payment.created_at
                            ? format(new Date(payment.created_at), "dd/MM/yyyy", { locale: fr })
                            : "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {payment.created_at
                            ? format(new Date(payment.created_at), "HH:mm", { locale: fr })
                            : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openPaymentDetails(payment)}
                            title="Voir détails"
                            className="h-8 w-8"
                          >
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadReceipt(payment)}
                            title="Télécharger le reçu PDF"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <FileCheck className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {filteredPayments.length > 20 && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Affichage des 20 premiers résultats sur {filteredPayments.length}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Détails du paiement */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-black border border-gray-700 text-white">
          <DialogHeader className="border-b border-gray-700 pb-4">
            <DialogTitle className="flex items-center gap-3 text-2xl text-white">
              <div className="p-2 rounded-xl bg-primary/20">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <span>Détails de l'abonnement</span>
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedPayment?.receipt_number || selectedPayment?.id.substring(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-6 py-4">
              {/* Montant et statut */}
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
                <div>
                  <p className="text-sm text-gray-400">Montant</p>
                  <p className="text-3xl font-bold text-primary">
                    {selectedPayment.amount?.toLocaleString()} FCFA
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Statut</p>
                  <Badge className={getStatusBadge(selectedPayment.status).className}>
                    {getStatusBadge(selectedPayment.status).label}
                  </Badge>
                </div>
              </div>

              {/* Détails du plan */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Plan</p>
                  <p className="font-medium text-white">{selectedPayment.plan_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Durée</p>
                  <p className="font-medium text-white">{selectedPayment.duration_months} mois</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Date de début</p>
                  <p className="text-white">
                    {selectedPayment.start_date
                      ? format(new Date(selectedPayment.start_date), "dd MMMM yyyy", { locale: fr })
                      : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Date de fin</p>
                  <p className="text-white">
                    {selectedPayment.end_date
                      ? format(new Date(selectedPayment.end_date), "dd MMMM yyyy", { locale: fr })
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Caractéristiques du plan */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Caractéristiques
                </h4>
                <div className="bg-gray-800/30 rounded-lg p-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{selectedPayment.max_employees || 0} employés</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Scissors className="h-4 w-4 text-primary" />
                    <span>{selectedPayment.max_services || 0} services</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Package className="h-4 w-4 text-primary" />
                    <span>{selectedPayment.max_products || 0} produits</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Support inclus</span>
                  </div>
                </div>
              </div>

              {/* Méthode de paiement */}
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Méthode de paiement</p>
                <div className="flex items-center gap-2 text-gray-300">
                  {getMethodIcon(selectedPayment.payment_method)}
                  <span>{getMethodLabel(selectedPayment.payment_method)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-700 pt-4 flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  className="gap-2 border-green-600 text-green-400 hover:bg-green-950/30"
                  onClick={() => handleDownloadReceipt(selectedPayment)}
                >
                  <FileCheck className="h-4 w-4" />
                  Télécharger le reçu PDF
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-gray-600 text-gray-300 hover:bg-gray-800"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4" />
                  Imprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}