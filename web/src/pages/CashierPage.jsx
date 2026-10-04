// /src/pages/CashierPage.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext";
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ReceiptPDF } from '@/components/ReceiptPDF';
import * as XLSX from 'xlsx';
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
  Package,
  Plus,
  Minus,
  ShoppingCart,
  Trash2,
  FileSpreadsheet,
  Filter,
  Calendar,
  ShoppingBag,
  Users,
  ClipboardList,
  CheckCircle,
  Clock,
  Archive,
  Tag,
} from "lucide-react";

// ✅ Fonction pour formater le téléphone
const formatPhone = (phone) => {
  if (!phone) return 'Non renseigné';
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  return phone;
};

// ✅ Fonction pour formater les montants
const formatAmount = (amount) => {
  if (!amount && amount !== 0) return '0 FCFA';
  return amount.toLocaleString('fr-FR') + ' FCFA';
};

// ✅ Fonction pour formater les montants sans FCFA
const formatAmountOnly = (amount) => {
  if (!amount && amount !== 0) return '0';
  return amount.toLocaleString('fr-FR');
};

// ✅ Fonction pour extraire les infos client d'une transaction
const getClientInfo = (transaction) => {
  try {
    if (transaction?.customer_name) {
      return {
        full_name: transaction.customer_name,
        phone: transaction.customer_phone || 'Non renseigné',
        email: '',
        client_id: null
      };
    }
    
    if (transaction?.appointment?.client?.profile) {
      return {
        full_name: transaction.appointment.client.profile.full_name || 'Client',
        phone: transaction.appointment.client.profile.phone || 'Non renseigné',
        email: transaction.appointment.client.profile.email || '',
        client_id: transaction.appointment.client.id
      };
    }
    
    if (transaction?.appointment?.client) {
      const client = transaction.appointment.client;
      return {
        full_name: client.full_name || client.name || 'Client',
        phone: client.phone || 'Non renseigné',
        email: client.email || '',
        client_id: client.id
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
  const [pendingOrders, setPendingOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [paymentModal, setPaymentModal] = useState(false);
  const [refundModal, setRefundModal] = useState(false);
  const [receiptModal, setReceiptModal] = useState(false);
  const [productSaleModal, setProductSaleModal] = useState(false);
  const [orderPaymentModal, setOrderPaymentModal] = useState(false);
  const [archivedTicketModal, setArchivedTicketModal] = useState(false);

  // Cart
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productQuantity, setProductQuantity] = useState(1);
  const [productSearch, setProductSearch] = useState("");

  // Filters
  const [filterType, setFilterType] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

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
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Tickets archivés
  const [archivedTickets, setArchivedTickets] = useState([]);
  const [selectedArchivedTicket, setSelectedArchivedTicket] = useState(null);

  const [stats, setStats] = useState({
    todayRevenue: 0,
    monthlyTransactions: 0,
    averageValue: 0,
    totalRevenue: 0,
    productRevenue: 0,
    appointmentRevenue: 0,
    galleryRevenue: 0,
    pendingOrdersCount: 0,
  });

  // ✅ Générer un numéro de reçu séquentiel au format RCP-0001 (4 chiffres)
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
        } else {
          const numbers = data[0].receipt_number.replace(/\D/g, '');
          if (numbers.length >= 4) {
            lastNumber = parseInt(numbers.slice(-4), 10);
          }
        }
      }

      const newNumber = lastNumber + 1;
      const paddedNumber = String(newNumber).padStart(4, '0');
      return `RCP-${paddedNumber}`;
    } catch (error) {
      console.error('Error generating receipt number:', error);
      const timestamp = Date.now().toString().slice(-4);
      return `RCP-${timestamp}`;
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

  // ✅ Récupérer les produits
  const fetchProducts = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) return;

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .order("name", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  // ✅ Récupérer les tickets archivés
  const fetchArchivedTickets = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) return;

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'archived')
        .eq('date', today)
        .order('ticket_number', { ascending: true });

      if (error) throw error;

      // ✅ Filtrer les tickets qui n'ont PAS été payés
      const unpaidArchived = data?.filter(ticket => {
        const hasTransaction = ticket.transaction_id && ticket.transaction_id !== null && ticket.transaction_id !== '';
        const isCompleted = ticket.status === 'completed';
        
        if (hasTransaction || isCompleted) {
          return false;
        }
        return true;
      }) || [];

      setArchivedTickets(unpaidArchived);
      
    } catch (error) {
      console.error('Error fetching archived tickets:', error);
    }
  };

  // ✅ Encaisser un ticket archivé
  const handleArchivedTicketPayment = async (e) => {
    e.preventDefault();
    try {
      if (!selectedArchivedTicket) {
        toast.error("Aucun ticket sélectionné");
        return;
      }

      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error("Tenant non trouvé");
        return;
      }

      const amount = parseFloat(selectedArchivedTicket.service_price) || 0;
      const receivedAmount = parseFloat(paymentForm.received_amount) || amount;

      if (receivedAmount < amount) {
        toast.error(`Le montant reçu (${receivedAmount.toLocaleString()} FCFA) est inférieur au montant à payer (${amount.toLocaleString()} FCFA)`);
        return;
      }

      const change = receivedAmount - amount;
      const receiptNumber = await generateReceiptNumber(tenantId);

      // 1. Créer la transaction
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .insert({
          tenant_id: tenantId,
          client_id: null,
          amount: amount,
          total_after_discount: amount,
          payment_method: paymentForm.payment_method,
          receipt_number: receiptNumber,
          status: "completed",
          transaction_date: new Date().toISOString(),
          transaction_type: "ticket_payment",
          source: "ticket_archived",
          customer_name: selectedArchivedTicket.client_name || "Client",
          customer_phone: selectedArchivedTicket.client_phone || "",
          notes: `Ticket #${selectedArchivedTicket.ticket_number} - ${selectedArchivedTicket.service_type}`,
        })
        .select()
        .single();

      if (txError) throw txError;

      // 2. Mettre à jour le ticket
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ 
          status: 'completed',
          transaction_id: txData.id
        })
        .eq('id', selectedArchivedTicket.id);

      if (updateError) {
        console.error('❌ Erreur mise à jour ticket:', updateError);
        await supabase
          .from('tickets')
          .update({ 
            status: 'completed'
          })
          .eq('id', selectedArchivedTicket.id);
      }

      toast.success(
        `💰 Ticket #${selectedArchivedTicket.ticket_number} encaissé - Total: ${amount.toLocaleString()} FCFA${change > 0 ? ` - Monnaie: ${change.toLocaleString()} FCFA` : ''}`
      );

      // Créer l'objet transaction pour le reçu
      setCurrentTransaction({
        ...txData,
        change: change,
        received_amount: receivedAmount,
        cart_items: [{
          name: selectedArchivedTicket.service_type || 'Service',
          quantity: 1,
          price: amount,
          total: amount
        }],
        customer_name: selectedArchivedTicket.client_name || 'Client',
        customer_phone: selectedArchivedTicket.client_phone || '',
        ticket_number: selectedArchivedTicket.ticket_number,
      });

      setArchivedTicketModal(false);
      setSelectedArchivedTicket(null);
      setPaymentForm({
        appointment_id: "",
        amount: "",
        received_amount: "",
        payment_method: "cash",
        change: 0,
      });
      
      await fetchData();
      
      setReceiptModal(true);
      
    } catch (error) {
      console.error("❌ Error processing archived ticket payment:", error);
      toast.error(error.message || "Échec de l'encaissement");
    }
  };

  // ✅ Nettoyer les tickets déjà payés
  const cleanPaidTickets = async () => {
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) return;

      const { data: ticketsToFix, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'archived')
        .not('transaction_id', 'is', null);

      if (error) throw error;

      if (ticketsToFix && ticketsToFix.length > 0) {
        for (const ticket of ticketsToFix) {
          await supabase
            .from('tickets')
            .update({
              status: 'completed'
            })
            .eq('id', ticket.id);
        }
      }

    } catch (error) {
      console.error('Error cleaning paid tickets:', error);
    }
  };

  // ✅ Récupérer les données
  const fetchData = async () => {
    setLoading(true);
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      
      if (!tenantId) {
        setTransactions([]);
        setAppointments([]);
        setPendingOrders([]);
        setStats({
          todayRevenue: 0,
          monthlyTransactions: 0,
          averageValue: 0,
          totalRevenue: 0,
          productRevenue: 0,
          appointmentRevenue: 0,
          galleryRevenue: 0,
          pendingOrdersCount: 0,
        });
        setLoading(false);
        return;
      }

      // Récupérer les transactions avec les infos de réduction
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
              profile_id,
              profile:profiles!profile_id (
                full_name,
                phone,
                email
              )
            )
          ),
          transaction_lines (
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            product:product_id (
              id,
              name,
              selling_price
            )
          )
        `)
        .eq("tenant_id", tenantId)
        .order("transaction_date", { ascending: false })
        .limit(200);

      if (txError) throw txError;

      // Récupérer les rendez-vous
      const { data: apptData, error: apptError } = await supabase
        .from("appointments")
        .select(`
          *,
          client:client_id (
            id,
            name,
            email,
            phone,
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
        .order("appointment_date", { ascending: false });

      if (apptError) throw apptError;

      // IDs des rendez-vous déjà payés
      const paidAppointmentIds = (txData || [])
        .filter(t => t.appointment_id && t.status !== 'pending' && t.status !== 'refunded')
        .map(t => t.appointment_id);

      // Filtrer les rendez-vous non payés
      const unpaidAppointments = (apptData || []).filter(appt => 
        !paidAppointmentIds.includes(appt.id)
      );

      // Mettre à jour les states
      const pending = (txData || []).filter(t => t.status === 'pending' && t.source === 'gallery_order');
      const completed = (txData || []).filter(t => t.status !== 'pending');

      setTransactions(completed);
      setPendingOrders(pending);
      setAppointments(unpaidAppointments);

      // Calcul des statistiques
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const completedTransactions = completed.filter(t => 
        t.status === 'completed' && t.amount > 0
      );

      const todayRevenue = completedTransactions
        .filter(t => {
          const txDate = new Date(t.transaction_date);
          return txDate >= today && txDate < tomorrow;
        })
        .reduce((sum, t) => sum + (t.total_after_discount || t.amount), 0);

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthlyTransactions = completedTransactions
        .filter(t => new Date(t.transaction_date) >= startOfMonth)
        .length;

      const totalRevenue = completedTransactions
        .reduce((sum, t) => sum + (t.total_after_discount || t.amount), 0);

      let productRevenue = 0;
      let appointmentRevenue = 0;
      let galleryRevenue = 0;

      completedTransactions.forEach(t => {
        const amount = t.total_after_discount || t.amount || 0;
        if (t.transaction_type === 'product_sale' || t.source === 'cashier_sale') {
          productRevenue += amount;
        } else if (t.transaction_type === 'appointment' || t.source === 'cashier_appointment') {
          appointmentRevenue += amount;
        } else if (t.source === 'gallery_order') {
          galleryRevenue += amount;
        }
      });

      const averageValue = completedTransactions.length > 0 
        ? totalRevenue / completedTransactions.length 
        : 0;

      setStats({
        todayRevenue: todayRevenue,
        monthlyTransactions: monthlyTransactions,
        averageValue: averageValue,
        totalRevenue: totalRevenue,
        productRevenue: productRevenue,
        appointmentRevenue: appointmentRevenue,
        galleryRevenue: galleryRevenue,
        pendingOrdersCount: pending.length,
      });

      // ✅ Nettoyer les tickets déjà payés
      await cleanPaidTickets();
      
      // ✅ Récupérer les produits
      await fetchProducts();
      
      // ✅ Récupérer les tickets archivés
      await fetchArchivedTickets();
      
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

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

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity + productQuantity > product.stock_quantity) {
        toast.error(`Stock insuffisant. Disponible: ${product.stock_quantity}`);
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + productQuantity }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: productQuantity }]);
    }
    toast.success(`${product.name} ajouté au panier`);
    setSelectedProduct(null);
    setProductQuantity(1);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateCartQuantity = (productId, newQuantity) => {
    const product = cart.find(item => item.id === productId);
    if (!product) return;
    if (newQuantity > product.stock_quantity) {
      toast.error(`Stock insuffisant. Disponible: ${product.stock_quantity}`);
      return;
    }
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.selling_price * item.quantity), 0);
  };

  const clearCart = () => {
    setCart([]);
  };

  // ✅ Encaisser une commande avec code promo
  const handleOrderPayment = async (e) => {
    e.preventDefault();
    try {
      if (!selectedOrder) {
        toast.error("Aucune commande sélectionnée");
        return;
      }

      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error("Tenant non trouvé");
        return;
      }

      // ✅ Utiliser le montant après réduction s'il existe
      const amount = selectedOrder.total_after_discount || selectedOrder.amount;
      const receivedAmount = parseFloat(paymentForm.received_amount) || amount;

      if (receivedAmount < amount) {
        toast.error(`Le montant reçu (${receivedAmount.toLocaleString()} FCFA) est inférieur au montant à payer (${amount.toLocaleString()} FCFA)`);
        return;
      }

      const change = receivedAmount - amount;

      // ✅ Mettre à jour avec le montant après réduction
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          status: "completed",
          payment_method: paymentForm.payment_method,
          amount: amount,
          total_after_discount: amount,
          transaction_date: new Date().toISOString(),
        })
        .eq("id", selectedOrder.id);

      if (updateError) throw updateError;

      if (selectedOrder.transaction_lines && selectedOrder.transaction_lines.length > 0) {
        for (const line of selectedOrder.transaction_lines) {
          const { data: product } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", line.product_id)
            .single();

          if (product) {
            const newStock = (product.stock_quantity || 0) - line.quantity;
            await supabase
              .from("products")
              .update({ stock_quantity: newStock })
              .eq("id", line.product_id);
          }
        }
      }

      toast.success(
        `💰 Commande encaissée - Total: ${amount.toLocaleString()} FCFA${change > 0 ? ` - Monnaie: ${change.toLocaleString()} FCFA` : ''}`
      );

      const clientInfo = getClientInfo(selectedOrder);
      
      let items = [];
      
      if (selectedOrder.transaction_lines && selectedOrder.transaction_lines.length > 0) {
        items = selectedOrder.transaction_lines.map(line => {
          const productData = line.product || {};
          let price = parseFloat(line.unit_price);
          if (price === 0 || isNaN(price)) {
            price = parseFloat(productData.selling_price) || parseFloat(productData.price) || 0;
          }
          const quantity = parseInt(line.quantity) || 1;
          const total = parseFloat(line.total_price) || (price * quantity);
          
          return {
            name: productData.name || line.product_name || 'Produit',
            quantity: quantity,
            price: price,
            total: total
          };
        });
      } 
      else if (selectedOrder.cart_items && selectedOrder.cart_items.length > 0) {
        items = selectedOrder.cart_items.map(item => {
          let price = parseFloat(item.price) || parseFloat(item.selling_price) || parseFloat(item.unit_price) || 0;
          const quantity = parseInt(item.quantity) || 1;
          const total = parseFloat(item.total) || (price * quantity);
          
          return {
            name: item.name || 'Produit',
            quantity: quantity,
            price: price,
            total: total
          };
        });
      }

      // ✅ Inclure les informations de réduction dans currentTransaction
      setCurrentTransaction({
        id: selectedOrder.id,
        receipt_number: selectedOrder.receipt_number,
        transaction_date: selectedOrder.transaction_date || new Date().toISOString(),
        amount: selectedOrder.amount || 0,
        total_after_discount: amount,
        discount_amount: selectedOrder.discount_amount || 0,
        discount_code: selectedOrder.discount_code || null,
        payment_method: paymentForm.payment_method,
        status: "completed",
        source: selectedOrder.source || "gallery_order",
        transaction_type: selectedOrder.transaction_type || "product_sale",
        customer_name: clientInfo.full_name || selectedOrder.customer_name || "Client",
        customer_phone: clientInfo.phone || selectedOrder.customer_phone || "Non renseigné",
        change: change,
        received_amount: receivedAmount,
        cart_items: items,
        transaction_lines: selectedOrder.transaction_lines,
      });

      setOrderPaymentModal(false);
      setSelectedOrder(null);
      setPaymentForm({
        appointment_id: "",
        amount: "",
        received_amount: "",
        payment_method: "cash",
        change: 0,
      });
      
      await fetchData();
      
      setReceiptModal(true);
      
    } catch (error) {
      console.error("Error processing order payment:", error);
      toast.error(error.message || "Échec de l'encaissement");
    }
  };

  // ✅ Enregistrer une vente de produits
  const handleProductSale = async (e) => {
    e.preventDefault();
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      if (!tenantId) {
        toast.error("Tenant non trouvé");
        return;
      }

      if (cart.length === 0) {
        toast.error("Panier vide");
        return;
      }

      const totalAmount = getCartTotal();
      const receivedAmount = parseFloat(paymentForm.received_amount) || totalAmount;

      if (receivedAmount < totalAmount) {
        toast.error(`Le montant reçu (${receivedAmount.toLocaleString()} FCFA) est inférieur au total (${totalAmount.toLocaleString()} FCFA)`);
        return;
      }

      const change = receivedAmount - totalAmount;
      const receiptNumber = await generateReceiptNumber(tenantId);

      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .insert({
          tenant_id: tenantId,
          client_id: null,
          amount: totalAmount,
          total_after_discount: totalAmount,
          payment_method: paymentForm.payment_method,
          receipt_number: receiptNumber,
          status: "completed",
          transaction_date: new Date().toISOString(),
          transaction_type: "product_sale",
          source: "cashier_sale",
        })
        .select()
        .single();

      if (txError) throw txError;

      const cartItems = [];
      for (const item of cart) {
        const newStock = item.stock_quantity - item.quantity;
        const { error: updateError } = await supabase
          .from("products")
          .update({ 
            stock_quantity: newStock,
            updated_at: new Date().toISOString()
          })
          .eq("id", item.id);

        if (updateError) {
          console.error(`Error updating stock for ${item.id}:`, updateError);
          throw updateError;
        }

        const { error: lineError } = await supabase
          .from("transaction_lines")
          .insert({
            transaction_id: txData.id,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.selling_price,
            total_price: item.selling_price * item.quantity,
          });

        if (lineError) {
          console.error(`Error creating transaction line:`, lineError);
        }

        cartItems.push({
          name: item.name,
          quantity: item.quantity,
          price: item.selling_price,
          total: item.selling_price * item.quantity
        });
      }

      setCurrentTransaction({
        ...txData,
        change: change,
        received_amount: receivedAmount,
        cart_items: cartItems,
        transaction_type: "product_sale",
        source: "cashier_sale",
        customer_name: "Vente en libre-service",
        customer_phone: "",
      });

      toast.success(
        `💰 Vente de ${cart.length} produit(s) enregistrée - Total: ${totalAmount.toLocaleString()} FCFA${change > 0 ? ` - Monnaie: ${change.toLocaleString()} FCFA` : ''}`
      );

      clearCart();
      setPaymentForm({
        appointment_id: "",
        amount: "",
        received_amount: "",
        payment_method: "cash",
        change: 0,
      });
      
      setProductSaleModal(false);
      await fetchData();
      
      setReceiptModal(true);
      
    } catch (error) {
      console.error("Error recording product sale:", error);
      toast.error(error.message || "Échec de l'enregistrement");
    }
  };

  // ✅ Fonction pour formater le numéro de reçu (4 chiffres)
  const formatReceiptNumber = (receiptNumber) => {
    if (!receiptNumber) return 'RCP-0001';
    const str = String(receiptNumber);
    if (str.startsWith('RCP-')) {
      const parts = str.split('-');
      if (parts.length === 2) {
        const numStr = parts[1].replace(/\D/g, '');
        const num = parseInt(numStr);
        if (!isNaN(num) && num > 0) {
          return `RCP-${String(num).padStart(4, '0')}`;
        }
      }
      return str;
    }
    const numbers = str.replace(/\D/g, '');
    if (!numbers) return 'RCP-0001';
    const lastFour = numbers.slice(-4);
    return `RCP-${lastFour.padStart(4, '0')}`;
  };

  // ✅ Enregistrer un paiement de rendez-vous
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
      const receiptNumber = await generateReceiptNumber(tenantId);

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          tenant_id: tenantId,
          appointment_id: appointment.id,
          client_id: appointment.client_id,
          amount: amount,
          total_after_discount: amount,
          payment_method: paymentForm.payment_method,
          receipt_number: receiptNumber,
          status: "completed",
          transaction_date: new Date().toISOString(),
          transaction_type: "appointment",
          source: "cashier_appointment",
          customer_name: getClientName(appointment),
          customer_phone: getClientPhone(appointment),
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("appointments")
        .update({ payment_status: "paid" })
        .eq("id", appointment.id);

      setCurrentTransaction({
        ...data,
        appointment: appointment,
        change: change,
        received_amount: receivedAmount,
        cart_items: [{
          name: appointment.service?.name || 'Service',
          quantity: 1,
          price: amount,
          total: amount
        }],
        customer_name: getClientName(appointment),
        customer_phone: getClientPhone(appointment),
      });

      toast.success(
        `💰 Paiement de ${amount.toLocaleString()} FCFA enregistré${change > 0 ? ` - Monnaie: ${change.toLocaleString()} FCFA` : ''}`
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
        receipt_number: `REF-${String(Date.now()).slice(-4)}`,
        status: "refunded",
        transaction_date: new Date().toISOString(),
      });

      if (error) throw error;

      await supabase
        .from("transactions")
        .update({ status: "refunded" })
        .eq("id", refundForm.transaction_id);

      if (transaction.appointment_id) {
        await supabase
          .from("appointments")
          .update({ payment_status: "refunded" })
          .eq("id", transaction.appointment_id);
      }

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

  // ✅ Export Excel avec filtres
  const handleExportExcel = () => {
    try {
      let filteredData = [...transactions];

      if (filterType !== "all") {
        filteredData = filteredData.filter(t => t.transaction_type === filterType);
      }

      if (filterSource !== "all") {
        filteredData = filteredData.filter(t => t.source === filterSource);
      }

      if (filterStatus !== "all") {
        filteredData = filteredData.filter(t => t.status === filterStatus);
      }

      if (filterDate) {
        filteredData = filteredData.filter(t => 
          t.transaction_date?.startsWith(filterDate)
        );
      }

      if (filteredData.length === 0) {
        toast.warning("Aucune transaction à exporter avec ces filtres");
        return;
      }

      const exportData = filteredData.map((tx) => {
        const clientInfo = getClientInfo(tx);
        const items = tx.transaction_lines || [];
        const itemsList = items.map(item => 
          `${item.product?.name || 'Produit'} x${item.quantity} (${item.unit_price?.toLocaleString() || 0} FCFA)`
        ).join('; ');

        const sourceLabel = tx.source === "gallery_order" ? "🛒 Commande" :
                           tx.source === "cashier_sale" ? "🏪 Vente caisse" :
                           tx.source === "ticket_archived" ? "📦 Ticket archivé" :
                           tx.transaction_type === "appointment" ? "📅 RDV" : "Autre";

        const finalAmount = tx.total_after_discount || tx.amount || 0;

        return {
          'Date': format(new Date(tx.transaction_date), "dd/MM/yyyy HH:mm"),
          'Type': tx.transaction_type === "product_sale" ? "Vente produit" : tx.transaction_type === "ticket_payment" ? "Ticket archivé" : "Rendez-vous",
          'Source': sourceLabel,
          'Client': clientInfo.full_name || "Client inconnu",
          'Téléphone': clientInfo.phone || "-",
          'Montant': finalAmount.toLocaleString() + ' FCFA',
          'Code Promo': tx.discount_code || "-",
          'Réduction': tx.discount_amount ? tx.discount_amount.toLocaleString() + ' FCFA' : "-",
          'Méthode': getPaymentMethodLabel(tx.payment_method).replace('💰', '').replace('💳', '').replace('📱', '').trim(),
          'Statut': tx.status === "completed" ? "Complété" : tx.status === "pending" ? "En attente" : "Remboursé",
          'Reçu': tx.receipt_number || "-",
          'Produits': itemsList || "-",
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      const colWidths = [
        { wch: 20 }, // Date
        { wch: 15 }, // Type
        { wch: 20 }, // Source
        { wch: 25 }, // Client
        { wch: 15 }, // Téléphone
        { wch: 15 }, // Montant
        { wch: 15 }, // Code Promo
        { wch: 15 }, // Réduction
        { wch: 15 }, // Méthode
        { wch: 15 }, // Statut
        { wch: 15 }, // Reçu
        { wch: 40 }, // Produits
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Transactions");
      
      const fileName = `transactions_${format(new Date(), "yyyy-MM-dd")}_${filterType}_${filterSource}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success(`Export Excel réussi (${filteredData.length} transactions)`);
    } catch (err) {
      console.error("Error exporting:", err);
      toast.error("Erreur lors de l'export Excel");
    }
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: "💰 Espèces",
      card: "💳 Carte Bancaire",
      orange_money: "📱 Orange Money",
      moov_money: "📱 Moov Money",
      wave: "🌊 Wave",
      pending: "⏳ En attente",
    };
    return labels[method] || method;
  };

  const getPaymentMethodIcon = (method) => {
    if (method === "cash") return <Banknote className="h-4 w-4" />;
    if (method === "pending") return <Clock className="h-4 w-4" />;
    if (method === "orange_money" || method === "moov_money") return <CreditCard className="h-4 w-4" />;
    return <CreditCard className="h-4 w-4" />;
  };

  const getClientName = (appointment) => {
    if (!appointment?.client) return 'Client';
    if (appointment.client.profile?.full_name) {
      return appointment.client.profile.full_name;
    }
    if (appointment.client.name) {
      return appointment.client.name;
    }
    if (appointment.client.full_name) {
      return appointment.client.full_name;
    }
    return 'Client';
  };

  const getClientPhone = (appointment) => {
    if (!appointment?.client) return null;
    if (appointment.client.profile?.phone) {
      return appointment.client.profile.phone;
    }
    if (appointment.client.phone) {
      return appointment.client.phone;
    }
    return null;
  };

  const getFilteredTransactions = () => {
    let filtered = [...transactions];
    if (filterType !== "all") {
      filtered = filtered.filter(t => t.transaction_type === filterType);
    }
    if (filterSource !== "all") {
      filtered = filtered.filter(t => t.source === filterSource);
    }
    if (filterStatus !== "all") {
      filtered = filtered.filter(t => t.status === filterStatus);
    }
    if (filterDate) {
      filtered = filtered.filter(t => 
        t.transaction_date?.startsWith(filterDate)
      );
    }
    return filtered;
  };

  const getSourceLabel = (source) => {
    const labels = {
      'gallery_order': '🛒 Commande',
      'cashier_sale': '🏪 Vente caisse',
      'cashier_appointment': '📅 RDV caisse',
      'appointment': '📅 RDV',
      'ticket_archived': '📦 Ticket archivé',
    };
    return labels[source] || source || 'Autre';
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
    <div className="space-y-8 pb-8 bg-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
            <Banknote className="h-8 w-8 text-primary" />
            Caisse
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos paiements, commandes et transactions.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? "Actualisation..." : "Actualiser"}
          </Button>
          <Button onClick={() => setPaymentModal(true)} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
            <Banknote className="w-4 h-4" /> Encaisser RDV
          </Button>
          <Button onClick={() => {
            setProductSaleModal(true);
            setCart([]);
            setPaymentForm({
              ...paymentForm,
              amount: "",
              received_amount: "",
            });
          }} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
            <ShoppingCart className="w-4 h-4" /> Vente produit
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Recettes du jour</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatAmount(stats.todayRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Transactions (mois)</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.monthlyTransactions}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total encaissé</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatAmount(stats.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Ventes produits</p>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{formatAmount(stats.productRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-pink-50 to-pink-100/50 dark:from-pink-950/30 dark:to-pink-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Ventes RDV</p>
            <p className="text-xl font-bold text-pink-600 dark:text-pink-400">{formatAmount(stats.appointmentRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Commandes</p>
            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{formatAmount(stats.galleryRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/30 dark:to-yellow-900/20">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">En attente</p>
            <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingOrdersCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tickets archivés à encaisser */}
      {archivedTickets.length > 0 && (
        <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20 shadow-sm">
          <CardHeader>
            <CardTitle className="text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Tickets archivés à encaisser ({archivedTickets.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Ces tickets ont été archivés mais n'ont pas encore été payés
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-gray-700">
                    <TableHead className="text-gray-700 dark:text-gray-300">#Ticket</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Client</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Téléphone</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Service</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Prix</TableHead>
                    <TableHead className="text-right text-gray-700 dark:text-gray-300">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archivedTickets.slice(0, 10).map((ticket) => (
                    <TableRow 
                      key={ticket.id} 
                      className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 dark:border-gray-700"
                    >
                      <TableCell className="font-bold text-blue-700 dark:text-blue-400">
                        #{ticket.ticket_number}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        {ticket.client_name || 'Client'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                        {formatPhone(ticket.client_phone || '')}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                        {ticket.service_type || '-'}
                      </TableCell>
                      <TableCell>
                        {ticket.service_price > 0 ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-bold dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700">
                            {formatAmount(ticket.service_price)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">0 FCFA</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          className="gap-1 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
                          onClick={() => {
                            setSelectedArchivedTicket(ticket);
                            setPaymentForm({
                              ...paymentForm,
                              amount: (ticket.service_price || 0).toString(),
                              received_amount: (ticket.service_price || 0).toString(),
                            });
                            setArchivedTicketModal(true);
                          }}
                        >
                          <Banknote className="h-3 w-3" /> Encaisser
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {archivedTickets.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 dark:text-gray-400 text-sm">
                        + {archivedTickets.length - 10} autres tickets archivés
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {pendingOrders.length > 0 && (
        <Card className="border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50/30 dark:bg-yellow-950/20 shadow-sm">
          <CardHeader>
            <CardTitle className="text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Commandes en attente de paiement ({pendingOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-gray-700">
                    <TableHead className="text-gray-700 dark:text-gray-300">Date</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Client</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Téléphone</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Articles</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Montant</TableHead>
                    <TableHead className="text-right text-gray-700 dark:text-gray-300">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOrders.slice(0, 10).map((order) => {
                    const items = order.transaction_lines || [];
                    const itemNames = items.map(item => 
                      `${item.product?.name || 'Produit'} x${item.quantity}`
                    ).join(', ');
                    const finalAmount = order.total_after_discount || order.amount || 0;
                    
                    return (
                      <TableRow 
                        key={order.id} 
                        className="hover:bg-yellow-50/50 dark:hover:bg-yellow-900/20 dark:border-gray-700"
                      >
                        <TableCell className="text-gray-700 dark:text-gray-300">
                          {format(new Date(order.transaction_date), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          {order.customer_name || 'Client'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                          {formatPhone(order.customer_phone || '')}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                          {itemNames || '-'}
                          {order.discount_code && (
                            <Badge className="ml-2 bg-green-100 text-green-800 text-[10px] dark:bg-green-900/30 dark:text-green-300">
                              <Tag className="h-3 w-3 mr-1" />
                              {order.discount_code}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-yellow-700 dark:text-yellow-400">
                          {formatAmount(finalAmount)}
                          {order.discount_amount > 0 && (
                            <span className="text-xs text-green-600 dark:text-green-400 block">
                              -{formatAmount(order.discount_amount)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="gap-1 bg-yellow-600 hover:bg-yellow-700 text-white dark:bg-yellow-700 dark:hover:bg-yellow-800"
                            onClick={() => {
                              setSelectedOrder(order);
                              const amount = order.total_after_discount || order.amount || 0;
                              setPaymentForm({
                                ...paymentForm,
                                amount: amount.toString(),
                                received_amount: amount.toString(),
                              });
                              setOrderPaymentModal(true);
                            }}
                          >
                            <Banknote className="h-3 w-3" /> Encaisser
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {pendingOrders.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 dark:text-gray-400 text-sm">
                        + {pendingOrders.length - 10} autres commandes en attente
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {appointments.length > 0 && (
        <Card className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20 shadow-sm">
          <CardHeader>
            <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Rendez-vous à encaisser ({appointments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-gray-700">
                    <TableHead className="text-gray-700 dark:text-gray-300">Date</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Client</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Téléphone</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Service</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Montant</TableHead>
                    <TableHead className="text-right text-gray-700 dark:text-gray-300">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.slice(0, 5).map((appt) => (
                    <TableRow key={appt.id} className="dark:border-gray-700 hover:bg-amber-50/50 dark:hover:bg-amber-900/20">
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {format(new Date(appt.appointment_date), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        {getClientName(appt)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                        {formatPhone(getClientPhone(appt))}
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">
                        {appt.service?.name || "N/A"}
                      </TableCell>
                      <TableCell className="font-bold text-amber-700 dark:text-amber-400">
                        {formatAmount(appt.service?.price || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          className="gap-1 bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800" 
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
                          <Banknote className="h-3 w-3" /> Encaisser
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historique des transactions avec filtres */}
      <Card className="border shadow-sm dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b dark:border-gray-700">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <CreditCard className="h-5 w-5 text-primary" />
            Historique des transactions
            <Badge variant="secondary" className="ml-2">{getFilteredTransactions().length}</Badge>
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[130px] h-9 dark:bg-gray-700 dark:border-gray-600">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="all">📊 Tous</SelectItem>
                  <SelectItem value="appointment">📅 RDV</SelectItem>
                  <SelectItem value="product_sale">🛍️ Produits</SelectItem>
                  <SelectItem value="ticket_payment">📦 Ticket archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-[140px] h-9 dark:bg-gray-700 dark:border-gray-600">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="all">📋 Toutes</SelectItem>
                  <SelectItem value="gallery_order">🛒 Commandes</SelectItem>
                  <SelectItem value="cashier_sale">🏪 Ventes caisse</SelectItem>
                  <SelectItem value="cashier_appointment">📅 RDV caisse</SelectItem>
                  <SelectItem value="ticket_archived">📦 Ticket archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px] h-9 dark:bg-gray-700 dark:border-gray-600">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="all">📋 Tous</SelectItem>
                  <SelectItem value="completed">✅ Complété</SelectItem>
                  <SelectItem value="pending">⏳ En attente</SelectItem>
                  <SelectItem value="refunded">↩️ Remboursé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="h-9 w-[160px] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {filterDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2"
                  onClick={() => setFilterDate("")}
                >
                  ✕
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="gap-2 h-9 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-950/20"
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600 dark:text-green-400" />
              Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full dark:bg-gray-700" />)}
            </div>
          ) : getFilteredTransactions().length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="h-16 w-16 text-muted-foreground mb-4 opacity-30" />
              <p className="text-lg font-medium text-muted-foreground">Aucune transaction</p>
              <p className="text-sm text-muted-foreground">
                {filterType !== "all" || filterSource !== "all" || filterStatus !== "all" || filterDate 
                  ? "Aucune transaction ne correspond aux filtres" 
                  : "Les paiements enregistrés apparaîtront ici."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30 dark:bg-gray-700/30">
                  <TableRow>
                    <TableHead className="pl-6 text-foreground">Date</TableHead>
                    <TableHead className="text-foreground">Client</TableHead>
                    <TableHead className="text-foreground">Téléphone</TableHead>
                    <TableHead className="text-right text-foreground">Montant</TableHead>
                    <TableHead className="text-foreground">Code Promo</TableHead>
                    <TableHead className="text-foreground">Type</TableHead>
                    <TableHead className="text-foreground">Source</TableHead>
                    <TableHead className="text-foreground">Méthode</TableHead>
                    <TableHead className="text-foreground">Statut</TableHead>
                    <TableHead className="text-foreground">Reçu</TableHead>
                    <TableHead className="text-right pr-6 text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredTransactions().map((tx) => {
                    const clientInfo = getClientInfo(tx);
                    const isProductSale = tx.transaction_type === "product_sale";
                    const isTicketPayment = tx.transaction_type === "ticket_payment";
                    const isGalleryOrder = tx.source === "gallery_order";
                    const isCashierSale = tx.source === "cashier_sale";
                    const isPending = tx.status === "pending";
                    const finalAmount = tx.total_after_discount || tx.amount || 0;
                    
                    return (
                      <TableRow key={tx.id} className={isPending ? 'bg-yellow-50/30 dark:bg-yellow-900/20' : 'hover:bg-muted/10 dark:hover:bg-gray-700/20'}>
                        <TableCell className="pl-6 text-sm text-foreground">
                          {format(new Date(tx.transaction_date), "dd MMM yyyy HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {isProductSale ? "Vente produit" : (clientInfo.full_name || "Client inconnu")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {isProductSale ? "-" : formatPhone(clientInfo.phone)}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${tx.amount < 0 ? 'text-red-500' : 'text-foreground'}`}>
                          {formatAmount(finalAmount)}{tx.amount < 0 && " (Remb.)"}
                          {tx.discount_amount > 0 && (
                            <span className="text-xs text-green-600 dark:text-green-400 block">
                              -{formatAmount(tx.discount_amount)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {tx.discount_code ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
                              <Tag className="h-3 w-3 mr-1" />
                              {tx.discount_code}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            isProductSale ? "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700" :
                            isTicketPayment ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700" :
                            "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700"
                          }>
                            {isProductSale ? "🛍️ Produit" : isTicketPayment ? "📦 Ticket" : "📅 RDV"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            isGalleryOrder 
                              ? "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700" 
                              : isCashierSale 
                              ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
                              : tx.source === "ticket_archived"
                              ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                              : "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700"
                          }>
                            {isGalleryOrder ? "🛒 Commande" : isCashierSale ? "🏪 Vente" : tx.source === "ticket_archived" ? "📦 Ticket" : "📅 RDV"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-foreground">
                            {getPaymentMethodIcon(tx.payment_method)}
                            {getPaymentMethodLabel(tx.payment_method)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            tx.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" :
                            tx.status === "pending" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" :
                            "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          }>
                            {tx.status === "completed" ? "Complété" : 
                             tx.status === "pending" ? "En attente" : "Remboursé"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-foreground">{tx.receipt_number || "-"}</TableCell>
                        <TableCell className="text-right pr-6">
                          {tx.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300"
                              onClick={() => {
                                setSelectedOrder(tx);
                                const amount = tx.total_after_discount || tx.amount || 0;
                                setPaymentForm({
                                  ...paymentForm,
                                  amount: amount.toString(),
                                  received_amount: amount.toString(),
                                });
                                setOrderPaymentModal(true);
                              }}
                            >
                              <Banknote className="w-4 h-4 mr-1" /> Encaisser
                            </Button>
                          )}
                          {tx.status !== "refunded" && tx.status !== "pending" && tx.amount > 0 && (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => {
                                let receiptItems = [];
                                if (tx.transaction_lines && tx.transaction_lines.length > 0) {
                                  receiptItems = tx.transaction_lines.map(line => {
                                    const product = line.product || {};
                                    const price = parseFloat(line.unit_price) || parseFloat(product.selling_price) || 0;
                                    return {
                                      name: product.name || 'Produit',
                                      quantity: line.quantity || 1,
                                      price: price,
                                      total: line.total_price || (price * (line.quantity || 1))
                                    };
                                  });
                                }
                                
                                setCurrentTransaction({ 
                                  ...tx, 
                                  appointment: tx.appointment, 
                                  change: 0, 
                                  received_amount: finalAmount,
                                  cart_items: receiptItems,
                                  customer_name: clientInfo.full_name || tx.customer_name,
                                  customer_phone: clientInfo.phone || tx.customer_phone,
                                });
                                setReceiptModal(true);
                              }} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300" title="Voir le reçu">
                                <FileText className="w-4 h-4 mr-1" /> Reçu
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setRefundForm({ ...refundForm, transaction_id: tx.id, refund_amount: tx.amount.toString(), refund_reason: "" });
                                setRefundModal(true);
                              }} className="text-destructive hover:text-destructive">
                                <Undo2 className="w-4 h-4 mr-1" /> Rembourser
                              </Button>
                            </div>
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

      {/* ✅ Modal d'encaissement d'un ticket archivé */}
      <Dialog open={archivedTicketModal} onOpenChange={setArchivedTicketModal}>
        <DialogContent className="sm:max-w-md dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Archive className="h-5 w-5" />
              Encaisser un ticket archivé
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleArchivedTicketPayment} className="space-y-4">
            {selectedArchivedTicket && (
              <div className="space-y-3">
                <div className="p-3 bg-muted/20 dark:bg-gray-700/50 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ticket</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">#{selectedArchivedTicket.ticket_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client</span>
                    <span className="font-medium text-foreground">{selectedArchivedTicket.client_name || 'Client'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Téléphone</span>
                    <span className="font-medium text-foreground">{formatPhone(selectedArchivedTicket.client_phone || '')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service</span>
                    <span className="font-medium text-foreground">{selectedArchivedTicket.service_type || '-'}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 dark:border-gray-600">
                    <span className="font-bold text-foreground">Total à payer</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{formatAmount(selectedArchivedTicket.service_price || 0)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-foreground">
                    <Wallet className="h-4 w-4 text-blue-500" /> Montant reçu du client (FCFA) *
                  </Label>
                  <Input
                    type="number"
                    step="100"
                    required
                    value={paymentForm.received_amount}
                    onChange={(e) => {
                      const received = e.target.value;
                      const change = calculateChange(received, selectedArchivedTicket.service_price || 0);
                      setPaymentForm({
                        ...paymentForm,
                        received_amount: received,
                        change: change,
                        amount: (selectedArchivedTicket.service_price || 0).toString(),
                      });
                    }}
                    className="bg-background border-2 border-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Montant reçu"
                    autoFocus
                  />
                </div>

                {paymentForm.change > 0 && (
                  <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg dark:bg-green-950/30 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="font-medium text-green-700 dark:text-green-400">Monnaie à rendre</span>
                      </div>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">{formatAmount(paymentForm.change)}</span>
                    </div>
                  </div>
                )}

                {paymentForm.received_amount && parseFloat(paymentForm.received_amount) > 0 && parseFloat(paymentForm.received_amount) < (selectedArchivedTicket.service_price || 0) && (
                  <div className="p-3 bg-red-50 border border-red-300 rounded-lg dark:bg-red-950/30 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      ⚠️ Le montant reçu ({formatAmount(parseFloat(paymentForm.received_amount))}) est inférieur au total ({formatAmount(selectedArchivedTicket.service_price || 0)})
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-foreground">Méthode de paiement *</Label>
                  <Select
                    value={paymentForm.payment_method}
                    onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}
                  >
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                      <SelectItem value="cash">💰 Espèces</SelectItem>
                      <SelectItem value="card">💳 Carte Bancaire</SelectItem>
                      <SelectItem value="orange_money">📱 Orange Money</SelectItem>
                      <SelectItem value="moov_money">📱 Moov Money</SelectItem>
                      <SelectItem value="wave">🌊 Wave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setArchivedTicketModal(false);
                  setSelectedArchivedTicket(null);
                }}
                className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
                disabled={!selectedArchivedTicket || !paymentForm.received_amount || parseFloat(paymentForm.received_amount) < (selectedArchivedTicket?.service_price || 0)}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Valider l'encaissement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ✅ Modal d'encaissement d'une commande avec code promo */}
      <Dialog open={orderPaymentModal} onOpenChange={setOrderPaymentModal}>
        <DialogContent className="sm:max-w-md dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <Clock className="h-5 w-5" />
              Encaisser une commande
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOrderPayment} className="space-y-4">
            {selectedOrder && (
              <div className="space-y-3">
                <div className="p-3 bg-muted/20 dark:bg-gray-700/50 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client</span>
                    <span className="font-medium text-foreground">{selectedOrder.customer_name || 'Client'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Téléphone</span>
                    <span className="font-medium text-foreground">{formatPhone(selectedOrder.customer_phone || '')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Articles</span>
                    <span className="font-medium text-foreground">
                      {selectedOrder.transaction_lines?.length || 0} article(s)
                    </span>
                  </div>
                  {selectedOrder.discount_code && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Tag className="h-4 w-4" />
                        Code promo
                      </span>
                      <span className="font-medium">{selectedOrder.discount_code}</span>
                    </div>
                  )}
                  {selectedOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span className="text-muted-foreground">Réduction</span>
                      <span className="font-medium">-{formatAmount(selectedOrder.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 dark:border-gray-600">
                    <span className="font-bold text-foreground">Total à payer</span>
                    <span className="font-bold text-yellow-600 dark:text-yellow-400">
                      {formatAmount(selectedOrder.total_after_discount || selectedOrder.amount || 0)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-foreground">
                    <Wallet className="h-4 w-4 text-blue-500" /> Montant reçu du client (FCFA) *
                  </Label>
                  <Input
                    type="number"
                    step="100"
                    required
                    value={paymentForm.received_amount}
                    onChange={(e) => {
                      const received = e.target.value;
                      const amount = selectedOrder.total_after_discount || selectedOrder.amount || 0;
                      const change = calculateChange(received, amount);
                      setPaymentForm({
                        ...paymentForm,
                        received_amount: received,
                        change: change,
                        amount: amount.toString(),
                      });
                    }}
                    className="bg-background border-2 border-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Montant reçu"
                    autoFocus
                  />
                </div>

                {paymentForm.change > 0 && (
                  <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg dark:bg-green-950/30 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="font-medium text-green-700 dark:text-green-400">Monnaie à rendre</span>
                      </div>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">{formatAmount(paymentForm.change)}</span>
                    </div>
                  </div>
                )}

                {paymentForm.received_amount && parseFloat(paymentForm.received_amount) > 0 && parseFloat(paymentForm.received_amount) < (selectedOrder.total_after_discount || selectedOrder.amount || 0) && (
                  <div className="p-3 bg-red-50 border border-red-300 rounded-lg dark:bg-red-950/30 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      ⚠️ Le montant reçu ({formatAmount(parseFloat(paymentForm.received_amount))}) est inférieur au total ({formatAmount(selectedOrder.total_after_discount || selectedOrder.amount || 0)})
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-foreground">Méthode de paiement *</Label>
                  <Select
                    value={paymentForm.payment_method}
                    onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}
                  >
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                      <SelectItem value="cash">💰 Espèces</SelectItem>
                      <SelectItem value="card">💳 Carte Bancaire</SelectItem>
                      <SelectItem value="orange_money">📱 Orange Money</SelectItem>
                      <SelectItem value="moov_money">📱 Moov Money</SelectItem>
                      <SelectItem value="wave">🌊 Wave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOrderPaymentModal(false);
                  setSelectedOrder(null);
                }}
                className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-yellow-600 hover:bg-yellow-700 text-white dark:bg-yellow-700 dark:hover:bg-yellow-800"
                disabled={!selectedOrder || !paymentForm.received_amount || parseFloat(paymentForm.received_amount) < (selectedOrder.total_after_discount || selectedOrder.amount || 0)}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Valider l'encaissement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ✅ Modal de vente de produits */}
      <Dialog open={productSaleModal} onOpenChange={setProductSaleModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <ShoppingCart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Vente de produits
              <Badge variant="secondary" className="ml-2">
                {cart.length} articles
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Sélection des produits */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un produit..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProductSaleModal(false);
                    window.location.href = '/admin/products';
                  }}
                  className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Package className="h-4 w-4 mr-1" />
                  Gérer produits
                </Button>
              </div>

              {/* Liste des produits */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                {products
                  .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                  .slice(0, 12)
                  .map((product) => (
                    <Button
                      key={product.id}
                      variant="outline"
                      className="justify-start h-auto py-2 px-3 hover:border-purple-300 dark:border-gray-600 dark:text-gray-300 dark:hover:border-purple-700 dark:hover:bg-purple-950/20"
                      onClick={() => {
                        setSelectedProduct(product);
                        setProductQuantity(1);
                      }}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="h-8 w-8 rounded object-cover" />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-xs font-medium truncate text-foreground">{product.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {product.selling_price.toLocaleString()} FCFA
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] dark:border-gray-600 dark:text-gray-400">
                          {product.stock_quantity}
                        </Badge>
                      </div>
                    </Button>
                  ))}
                {products.length === 0 && (
                  <div className="col-span-3 text-center py-4 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>Aucun produit disponible</p>
                    <p className="text-xs">Ajoutez des produits dans l'onglet Produits</p>
                  </div>
                )}
              </div>

              {/* Sélecteur de quantité */}
              {selectedProduct && (
                <div className="p-3 border rounded-lg bg-muted/20 dark:border-gray-600 dark:bg-gray-700/30">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      {selectedProduct.image_url ? (
                        <img src={selectedProduct.image_url} alt={selectedProduct.name} className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{selectedProduct.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedProduct.selling_price.toLocaleString()} FCFA
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))}
                        className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        max={selectedProduct.stock_quantity}
                        value={productQuantity}
                        onChange={(e) => setProductQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 text-center h-8 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setProductQuantity(Math.min(selectedProduct.stock_quantity, productQuantity + 1))}
                        className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-700 dark:hover:bg-purple-800"
                        onClick={() => addToCart(selectedProduct)}
                      >
                        Ajouter
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stock disponible: {selectedProduct.stock_quantity} unités
                  </p>
                </div>
              )}
            </div>

            {/* Panier */}
            {cart.length > 0 && (
              <div className="border rounded-lg dark:border-gray-600">
                <div className="p-3 border-b bg-muted/20 dark:border-gray-600 dark:bg-gray-700/30 flex items-center justify-between">
                  <span className="font-medium text-foreground">Panier</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={clearCart}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Vider
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 border-b last:border-0 hover:bg-muted/10 dark:border-gray-600 dark:hover:bg-gray-700/30">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{item.name}</span>
                        <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-400">
                          {item.quantity} × {item.selling_price.toLocaleString()} FCFA
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 dark:text-gray-400 dark:hover:bg-gray-700"
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm w-6 text-center text-foreground">{item.quantity}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 dark:text-gray-400 dark:hover:bg-gray-700"
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive dark:hover:bg-gray-700"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t bg-muted/10 dark:border-gray-600 dark:bg-gray-700/30 flex items-center justify-between">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {formatAmount(getCartTotal())}
                  </span>
                </div>
              </div>
            )}

            {/* Paiement */}
            {cart.length > 0 && (
              <form onSubmit={handleProductSale} className="space-y-4 pt-2 border-t dark:border-gray-600">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-foreground">
                    <Wallet className="h-4 w-4 text-blue-500" /> Montant reçu du client (FCFA) *
                  </Label>
                  <Input
                    type="number"
                    step="100"
                    required
                    value={paymentForm.received_amount}
                    onChange={(e) => {
                      const received = e.target.value;
                      const total = getCartTotal();
                      const change = calculateChange(received, total);
                      setPaymentForm({
                        ...paymentForm,
                        received_amount: received,
                        change: change,
                        amount: total.toString(),
                      });
                    }}
                    className="bg-background border-2 border-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Montant reçu"
                    autoFocus
                  />
                </div>

                {paymentForm.change > 0 && (
                  <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg dark:bg-green-950/30 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="font-medium text-green-700 dark:text-green-400">Monnaie à rendre</span>
                      </div>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">{formatAmount(paymentForm.change)}</span>
                    </div>
                  </div>
                )}

                {paymentForm.received_amount && parseFloat(paymentForm.received_amount) > 0 && parseFloat(paymentForm.received_amount) < getCartTotal() && (
                  <div className="p-3 bg-red-50 border border-red-300 rounded-lg dark:bg-red-950/30 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      ⚠️ Le montant reçu ({formatAmount(parseFloat(paymentForm.received_amount))}) est inférieur au total ({formatAmount(getCartTotal())})
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-foreground">Méthode de paiement *</Label>
                  <Select
                    value={paymentForm.payment_method}
                    onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}
                  >
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
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
                    onClick={() => {
                      setProductSaleModal(false);
                      clearCart();
                    }}
                    className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-700 dark:hover:bg-purple-800"
                    disabled={!paymentForm.received_amount || parseFloat(paymentForm.received_amount) < getCartTotal()}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Valider la vente
                  </Button>
                </DialogFooter>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal d'encaissement rendez-vous */}
      <Dialog open={paymentModal} onOpenChange={setPaymentModal}>
        <DialogContent className="sm:max-w-md dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Banknote className="h-5 w-5" /> Enregistrer un paiement
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Rendez-vous associé</Label>
              <Select value={paymentForm.appointment_id} onValueChange={async (v) => {
                const appt = appointments.find((a) => a.id === v);
                setPaymentForm({ ...paymentForm, appointment_id: v, amount: appt?.service?.price?.toString() || "", received_amount: "", change: 0 });
              }}>
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                  <SelectValue placeholder="Sélectionner un rendez-vous" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {appointments.length === 0 ? (
                    <SelectItem value="none" disabled>Aucun rendez-vous à encaisser</SelectItem>
                  ) : (
                    appointments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {format(new Date(a.appointment_date), "dd/MM/yyyy")} - {getClientName(a)} ({a.service?.name || "Sans service"})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Montant à payer (FCFA)</Label>
              <Input type="number" step="100" value={paymentForm.amount} readOnly className="bg-muted/50 font-bold dark:bg-gray-700/50 dark:text-white" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-foreground">
                <Wallet className="h-4 w-4 text-blue-500" /> Montant reçu du client (FCFA) *
              </Label>
              <Input type="number" step="100" required value={paymentForm.received_amount} onChange={handleReceivedAmountChange} className="bg-background border-2 border-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Ex: 10000" autoFocus />
            </div>

            {paymentForm.change > 0 && (
              <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg dark:bg-green-950/30 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-700 dark:text-green-400">Monnaie à rendre</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">{formatAmount(paymentForm.change)}</span>
                </div>
              </div>
            )}

            {paymentForm.received_amount && parseFloat(paymentForm.received_amount) > 0 && parseFloat(paymentForm.received_amount) < parseFloat(paymentForm.amount) && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-lg dark:bg-red-950/30 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">⚠️ Le montant reçu ({formatAmount(parseFloat(paymentForm.received_amount))}) est inférieur au montant à payer ({formatAmount(parseFloat(paymentForm.amount))})</p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-foreground">Méthode de paiement *</Label>
              <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}>
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="cash">💰 Espèces</SelectItem>
                  <SelectItem value="card">💳 Carte Bancaire</SelectItem>
                  <SelectItem value="orange_money">📱 Orange Money</SelectItem>
                  <SelectItem value="moov_money">📱 Moov Money</SelectItem>
                  <SelectItem value="wave">🌊 Wave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaymentModal(false)} className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Annuler</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800" disabled={!paymentForm.appointment_id || !paymentForm.amount || !paymentForm.received_amount || parseFloat(paymentForm.received_amount) < parseFloat(paymentForm.amount)}>
                <Banknote className="w-4 h-4 mr-2" /> Valider le paiement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ✅ Modal du reçu - avec code promo */}
      <Dialog open={receiptModal} onOpenChange={setReceiptModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Receipt className="h-5 w-5 text-primary" /> Reçu de paiement
            </DialogTitle>
          </DialogHeader>
          
          {currentTransaction && (
            <div className="space-y-4">
              {(() => {
                const clientInfo = getClientInfo(currentTransaction);
                const isProductSale = currentTransaction.transaction_type === "product_sale";
                const isTicketPayment = currentTransaction.transaction_type === "ticket_payment";
                const isGalleryOrder = currentTransaction.source === "gallery_order";
                const isPending = currentTransaction.status === "pending";
                
                let items = [];
                
                if (currentTransaction.cart_items && currentTransaction.cart_items.length > 0) {
                  items = currentTransaction.cart_items;
                } else if (currentTransaction.transaction_lines && currentTransaction.transaction_lines.length > 0) {
                  items = currentTransaction.transaction_lines.map(line => {
                    const product = line.product || {};
                    const price = parseFloat(line.unit_price) || parseFloat(product.selling_price) || parseFloat(product.price) || 0;
                    const qty = parseInt(line.quantity) || 1;
                    return {
                      name: product.name || line.product_name || 'Produit',
                      quantity: qty,
                      price: price,
                      total: line.total_price || (price * qty)
                    };
                  });
                }
                
                const hasItems = items && items.length > 0;
                const originalAmount = currentTransaction.amount || 0;
                const discountAmount = currentTransaction.discount_amount || 0;
                const finalAmount = currentTransaction.total_after_discount || originalAmount;
                const changeAmount = currentTransaction.change || 0;
                const receivedAmount = currentTransaction.received_amount || finalAmount;
                const discountCode = currentTransaction.discount_code || null;
                
                return (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border dark:border-gray-700">
                    {/* En-tête avec logo */}
                    <div className="bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 p-4 border-b dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {tenantInfo?.logo_url ? (
                            <img 
                              src={tenantInfo.logo_url} 
                              alt={tenantInfo.name} 
                              className="w-12 h-12 rounded-lg object-cover border-2 border-primary/20"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <span className="text-2xl font-bold text-primary">
                                {tenantInfo?.name?.charAt(0) || 'S'}
                              </span>
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-lg text-foreground">
                              {tenantInfo?.name || 'Salon'}
                            </h3>
                            {tenantInfo?.address && (
                              <p className="text-xs text-muted-foreground">{tenantInfo.address}</p>
                            )}
                            {tenantInfo?.phone && (
                              <p className="text-xs text-muted-foreground">Tel: {tenantInfo.phone}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-primary">Reçu de paiement</p>
                          <p className="text-xs font-mono font-bold text-primary">
                            N° {formatReceiptNumber(currentTransaction.receipt_number)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Corps du reçu */}
                    <div className="p-4 space-y-3">
                      {/* Titre */}
                      <div className="text-center border-b dark:border-gray-700 pb-2">
                        <p className="text-sm font-bold text-foreground uppercase tracking-wider">
                          {isGalleryOrder ? 'REÇU DE COMMANDE' : isTicketPayment ? 'REÇU DE TICKET' : 'REÇU DE PAIEMENT'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(currentTransaction.transaction_date).toLocaleString()}
                        </p>
                      </div>

                      {/* Informations client */}
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type</span>
                          <span className="font-medium text-foreground">
                            {isGalleryOrder ? "🛒 Commande" : isProductSale ? "🛍️ Vente produit" : isTicketPayment ? "📦 Ticket archivé" : "📅 Rendez-vous"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Client</span>
                          <span className="font-medium text-foreground">
                            {(isProductSale && !isGalleryOrder && !isTicketPayment) ? "Vente en libre-service" : (clientInfo.full_name || 'Client inconnu')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Téléphone</span>
                          <span className="font-medium text-foreground">
                            {(isProductSale && !isGalleryOrder && !isTicketPayment) ? "-" : formatPhone(clientInfo.phone)}
                          </span>
                        </div>
                        {isTicketPayment && currentTransaction.ticket_number && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ticket</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">#{currentTransaction.ticket_number}</span>
                          </div>
                        )}
                        {discountCode && (
                          <div className="flex justify-between text-green-600 dark:text-green-400">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Tag className="h-4 w-4" />
                              Code promo
                            </span>
                            <span className="font-medium">{discountCode}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Méthode</span>
                          <span className="font-medium text-foreground">{getPaymentMethodLabel(currentTransaction.payment_method)}</span>
                        </div>
                        {isPending && (
                          <div className="flex justify-between text-yellow-600 dark:text-yellow-400">
                            <span className="text-muted-foreground">Statut</span>
                            <span className="font-medium">⏳ En attente de paiement</span>
                          </div>
                        )}
                      </div>

                      {/* Tableau des articles */}
                      {hasItems && (
                        <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                          <div className="grid grid-cols-4 gap-1 bg-muted/30 dark:bg-gray-700/30 p-2 text-xs font-bold text-muted-foreground">
                            <span className="col-span-1">Description</span>
                            <span className="text-center">Qté</span>
                            <span className="text-right">Prix unit.</span>
                            <span className="text-right">Total</span>
                          </div>
                          {items.map((item, idx) => {
                            const price = parseFloat(item.price) || 0;
                            const qty = parseInt(item.quantity) || 1;
                            const total = price * qty;
                            return (
                              <div key={idx} className="grid grid-cols-4 gap-1 p-2 text-sm border-t dark:border-gray-700">
                                <span className="col-span-1 font-medium truncate text-foreground">{item.name}</span>
                                <span className="text-center text-foreground">{qty}</span>
                                <span className="text-right text-foreground">{formatAmount(price)}</span>
                                <span className="text-right font-medium text-foreground">{formatAmount(total)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Totaux avec réduction */}
                      <div className="space-y-1 pt-2 border-t-2 border-primary/30 dark:border-primary/20">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sous-total</span>
                          <span className="text-foreground">{formatAmount(originalAmount)}</span>
                        </div>
                        {discountCode && discountAmount > 0 && (
                          <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                            <span className="flex items-center gap-1">
                              <Tag className="h-4 w-4" />
                              Réduction ({discountCode})
                            </span>
                            <span>-{formatAmount(discountAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm pt-1 border-t dark:border-gray-700">
                          <span className="font-bold text-foreground">Total à payer</span>
                          <span className="font-bold text-lg text-primary">
                            {formatAmount(finalAmount)}
                          </span>
                        </div>
                        {receivedAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Montant reçu</span>
                            <span className="text-foreground">{formatAmount(receivedAmount)}</span>
                          </div>
                        )}
                        {changeAmount > 0 && (
                          <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-medium">
                            <span>🔄 Monnaie rendue</span>
                            <span>{formatAmount(changeAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm pt-1 border-t dark:border-gray-700">
                          <span className="font-bold text-foreground">Total réglé</span>
                          <span className="font-bold text-lg text-primary">
                            {formatAmount(finalAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Message de remerciement avec code promo */}
                      {discountCode && discountAmount > 0 && (
                        <div className="text-center bg-green-50 dark:bg-green-950/30 p-2 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-xs font-medium text-green-600 dark:text-green-400">
                            🎉 Réduction de {formatAmount(discountAmount)} appliquée avec le code "{discountCode}"
                          </p>
                        </div>
                      )}
                      {!discountCode && (
                        <div className="text-center bg-primary/5 dark:bg-primary/10 p-2 rounded-lg border border-primary/20">
                          <p className="text-xs font-medium text-primary">
                            {isPending ? '📋 Commande enregistrée' : isTicketPayment ? '🎫 Ticket payé' : 'Merci pour votre confiance !'}
                          </p>
                        </div>
                      )}

                      {/* Pied de page */}
                      <div className="text-center text-[10px] text-muted-foreground border-t dark:border-gray-700 pt-2">
                        <p>
                          {isPending 
                            ? 'Ce reçu fait office de bon de commande. Paiement à la caisse.'
                            : 'Ce reçu fait office de justificatif de paiement.'}
                        </p>
                        <p className="mt-1 text-[8px] text-muted-foreground/60">
                          {new Date(currentTransaction.transaction_date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button 
                  className="w-full gap-2 bg-primary hover:bg-primary/90 text-white"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4" /> Imprimer le reçu
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  onClick={() => setReceiptModal(false)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de remboursement */}
      <Dialog open={refundModal} onOpenChange={setRefundModal}>
        <DialogContent className="sm:max-w-md dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Undo2 className="h-5 w-5" /> Effectuer un remboursement
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRefund} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Montant à rembourser (FCFA) *</Label>
              <Input type="number" step="100" required value={refundForm.refund_amount} onChange={(e) => setRefundForm({ ...refundForm, refund_amount: e.target.value })} className="bg-background dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Ex: 5000" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Raison du remboursement *</Label>
              <Input required value={refundForm.refund_reason} onChange={(e) => setRefundForm({ ...refundForm, refund_reason: e.target.value })} placeholder="Annulation, erreur, etc." className="bg-background dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRefundModal(false)} className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Annuler</Button>
              <Button type="submit" variant="destructive" disabled={!refundForm.refund_amount || !refundForm.refund_reason}>Confirmer le remboursement</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}