// /src/pages/admin/GiftCards.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { supabase } from "@/lib/supabase";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.jsx";
import {
  Gift,
  Plus,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  X,
  Sparkles,
  Calendar,
  User,
  Mail,
  MessageSquare,
  Clock,
  Truck,
  Eye,
  RefreshCw,
  Search,
  Loader2,
  Download,
  Send,
  Printer,
  Phone,
  Building2,
  AlertTriangle,
  Banknote,
  Wallet,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// ========== LISTE DES OCCASIONS EN FRANÇAIS ==========
const OCCASIONS = [
  { value: "mariage", label: "💍 Mariage" },
  { value: "wedding", label: "💍 Mariage" },
  { value: "anniversaire", label: "🎂 Anniversaire" },
  { value: "birthday", label: "🎂 Anniversaire" },
  { value: "anniversary", label: "💑 Anniversaire de Mariage" },
  { value: "naissance", label: "👶 Naissance" },
  { value: "birth", label: "👶 Naissance" },
  { value: "noel", label: "🎄 Noël" },
  { value: "christmas", label: "🎄 Noël" },
  { value: "saint_valentin", label: "❤️ Saint-Valentin" },
  { value: "valentine", label: "❤️ Saint-Valentin" },
  { value: "fete_des_meres", label: "🌸 Fête des Mères" },
  { value: "mother", label: "🌸 Fête des Mères" },
  { value: "fete_des_peres", label: "👔 Fête des Pères" },
  { value: "father", label: "👔 Fête des Pères" },
  { value: "mariage_anniversaire", label: "💑 Anniversaire de Mariage" },
  { value: "obtention_diplome", label: "🎓 Obtention de Diplôme" },
  { value: "graduation", label: "🎓 Obtention de Diplôme" },
  { value: "nouvel_emploi", label: "💼 Nouvel Emploi" },
  { value: "job", label: "💼 Nouvel Emploi" },
  { value: "maison", label: "🏠 Nouvelle Maison" },
  { value: "house", label: "🏠 Nouvelle Maison" },
  { value: "retraite", label: "🌅 Retraite" },
  { value: "retirement", label: "🌅 Retraite" },
  { value: "sante", label: "💪 Rétablissement" },
  { value: "health", label: "💪 Rétablissement" },
  { value: "amitie", label: "🤝 Amitié" },
  { value: "friendship", label: "🤝 Amitié" },
  { value: "remerciement", label: "🙏 Remerciement" },
  { value: "thanks", label: "🙏 Remerciement" },
  { value: "thank_you", label: "🙏 Remerciement" },
  { value: "thankyou", label: "🙏 Remerciement" },
  { value: "goodbye", label: "👋 Au revoir" },
  { value: "adieu", label: "👋 Au revoir" },
  { value: "autre", label: "✨ Autre" },
  { value: "other", label: "✨ Autre" },
  { value: "others", label: "✨ Autre" },
];

// ========== FONCTIONS DE TRADUCTION ==========
const getOccasionLabel = (value) => {
  if (!value) return "✨ Autre";
  const occasion = OCCASIONS.find((o) => o.value === value);
  if (occasion) return occasion.label;

  const lowerValue = value.toLowerCase().trim();
  const translationMap = {
    'wedding': '💍 Mariage',
    'mariage': '💍 Mariage',
    'birthday': '🎂 Anniversaire',
    'anniversaire': '🎂 Anniversaire',
    'anniversary': '💑 Anniversaire de Mariage',
    'mariage_anniversaire': '💑 Anniversaire de Mariage',
    'birth': '👶 Naissance',
    'naissance': '👶 Naissance',
    'christmas': '🎄 Noël',
    'noel': '🎄 Noël',
    'valentine': '❤️ Saint-Valentin',
    'saint_valentin': '❤️ Saint-Valentin',
    'mother': '🌸 Fête des Mères',
    'fete_des_meres': '🌸 Fête des Mères',
    'father': '👔 Fête des Pères',
    'fete_des_peres': '👔 Fête des Pères',
    'graduation': '🎓 Obtention de Diplôme',
    'obtention_diplome': '🎓 Obtention de Diplôme',
    'job': '💼 Nouvel Emploi',
    'nouvel_emploi': '💼 Nouvel Emploi',
    'house': '🏠 Nouvelle Maison',
    'maison': '🏠 Nouvelle Maison',
    'retirement': '🌅 Retraite',
    'retraite': '🌅 Retraite',
    'health': '💪 Rétablissement',
    'sante': '💪 Rétablissement',
    'friendship': '🤝 Amitié',
    'amitie': '🤝 Amitié',
    'thanks': '🙏 Remerciement',
    'thank_you': '🙏 Remerciement',
    'thankyou': '🙏 Remerciement',
    'thank': '🙏 Remerciement',
    'remerciement': '🙏 Remerciement',
    'goodbye': '👋 Au revoir',
    'adieu': '👋 Au revoir',
    'au_revoir': '👋 Au revoir',
    'other': '✨ Autre',
    'autre': '✨ Autre',
    'others': '✨ Autre',
  };
  return translationMap[lowerValue] || value;
};

// ========== COMPOSANT : STATUT BADGE ==========
const StatusBadge = ({ status }) => {
  const statusMap = {
    pending: {
      label: "⏳ En attente",
      color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    },
    paid: {
      label: "✅ Payée",
      color: "bg-blue-100 text-blue-800 border-blue-300",
    },
    validated: {
      label: "🎉 Validée",
      color: "bg-green-100 text-green-800 border-green-300",
    },
    delivered: {
      label: "📦 Livrée",
      color: "bg-purple-100 text-purple-800 border-purple-300",
    },
    used: {
      label: "🎁 Utilisée",
      color: "bg-gray-100 text-gray-800 border-gray-300",
    },
    cancelled: {
      label: "❌ Annulée",
      color: "bg-red-100 text-red-800 border-red-300",
    },
    expired: {
      label: "⏰ Expirée",
      color: "bg-orange-100 text-orange-800 border-orange-300",
    },
  };

  const config = statusMap[status] || statusMap.pending;
  return (
    <Badge className={`${config.color} border px-3 py-1 text-xs font-medium`}>
      {config.label}
    </Badge>
  );
};

// ========== COMPOSANT : CARTE CADEAU PRÉVISUALISATION (FORMAT RECTANGLE 20/10) ==========
const GiftCardPreview = ({ giftCard, onPay }) => {
  if (!giftCard) return null;

  const {
    amount,
    recipient_name,
    recipient_phone,
    sender_name,
    sender_phone,
    message,
    occasion,
    delivery_method,
    tenant_name,
    tenant_logo,
    tenant_primary_color,
    status,
    created_at,
    code,
  } = giftCard;

  const isPending = status === 'pending' || status === 'en_attente';

  const getOccasionEmoji = (occasion) => {
    const emojis = {
      birthday: "🎂",
      anniversary: "💑",
      wedding: "💍",
      baby: "👶",
      graduation: "🎓",
      new_job: "💼",
      goodbye: "✈️",
      thank_you: "🙏",
      other: "🎁",
      christmas: "🎄",
      new_year: "🎊",
      valentine: "❤️",
      mothers_day: "🌸",
      fathers_day: "👔",
      friends_day: "🤝",
      loyalty: "⭐",
    };
    return emojis[occasion] || "🎁";
  };

  const getDeliveryLabel = (method) => {
    const labels = {
      whatsapp: "📱 WhatsApp",
      physical: "🏪 En présentielle",
      presentielle: "🏪 En présentielle",
      email: "📧 Par email",
    };
    return labels[method] || method;
  };

  const primaryColor = tenant_primary_color || "#ec4899";

  return (
    <div className="relative" id="gift-card-preview">
      <div
        className="rounded-3xl overflow-hidden shadow-2xl max-w-4xl mx-auto bg-white dark:bg-gray-900"
        style={{
          border: `2px solid ${primaryColor}`,
          minHeight: '200px',
          maxWidth: '800px',
          width: '100%',
          aspectRatio: '2 / 1',
          boxShadow: `0 20px 60px ${primaryColor}20, 0 4px 20px rgba(0,0,0,0.05)`,
        }}
      >
        {/* Décoration de fond */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
          <div 
            className="absolute -top-32 -right-32 w-80 h-80 rounded-full blur-2xl"
            style={{ backgroundColor: primaryColor }}
          />
          <div 
            className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-2xl"
            style={{ backgroundColor: primaryColor }}
          />
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 p-6 h-full z-10">
          
          {/* ===== COLONNE GAUCHE ===== */}
          <div className="flex flex-col justify-between space-y-4">
            {/* Logo et titre */}
            <div className="flex items-center gap-3">
              {tenant_logo ? (
                <img
                  src={tenant_logo}
                  alt={tenant_name}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-md"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Gift className="h-6 w-6" style={{ color: primaryColor }} />
                </div>
              )}
              <div>
                <p className="text-base font-bold text-foreground tracking-tight">{tenant_name || "SalonApp"}</p>
                <p 
                  className="text-[10px] uppercase tracking-wider font-medium tracking-widest"
                  style={{ color: primaryColor }}
                >
                  ✦ Carte cadeau
                </p>
              </div>
            </div>

            {/* Offert à */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <div 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
                <p 
                  className="text-[10px] uppercase tracking-wider font-semibold tracking-widest"
                  style={{ color: primaryColor }}
                >
                  Offert à
                </p>
              </div>
              <p className="text-xl font-bold text-foreground">{recipient_name || "Non attribué"}</p>
              {recipient_phone && (
                <p className="text-sm text-muted-foreground font-medium">{recipient_phone}</p>
              )}
            </div>

            {/* Valeur */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <div 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
                <p 
                  className="text-[10px] uppercase tracking-wider font-semibold tracking-widest"
                  style={{ color: primaryColor }}
                >
                  Valeur
                </p>
              </div>
              <div 
                className="text-3xl font-extrabold tracking-tight"
                style={{ color: primaryColor }}
              >
                {amount?.toLocaleString()} FCFA
              </div>
            </div>
          </div>

          {/* ===== COLONNE DROITE ===== */}
          <div className="flex flex-col justify-between items-end space-y-4">
            {/* Occasion */}
            <div 
              className="flex items-center gap-2 px-4 py-2 rounded-full shadow-sm"
              style={{ 
                backgroundColor: `${primaryColor}12`,
                border: `1px solid ${primaryColor}20`
              }}
            >
              <span className="text-xl leading-none">{getOccasionEmoji(occasion)}</span>
              <span className="text-sm font-semibold" style={{ color: primaryColor }}>
                Pour {getOccasionLabel(occasion)}
              </span>
            </div>

            {/* Expéditeur */}
            <div className="text-right space-y-0.5">
              <div className="flex items-center justify-end gap-1.5">
                <p 
                  className="text-[10px] uppercase tracking-wider font-semibold tracking-widest"
                  style={{ color: primaryColor }}
                >
                  De la part de
                </p>
                <div 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>
              <p className="text-lg font-bold text-foreground">{sender_name || "Anonyme"}</p>
              {sender_phone && (
                <p className="text-sm text-muted-foreground font-medium">{sender_phone}</p>
              )}
            </div>

            {/* Message */}
            {message && (
              <div 
                className="text-sm italic text-foreground/80 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm px-4 py-2 rounded-xl border shadow-sm max-w-[280px]"
                style={{ borderColor: `${primaryColor}15` }}
              >
                "{message}"
              </div>
            )}

            {/* Livraison et date */}
            <div 
              className="flex items-center gap-3 text-xs text-muted-foreground bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm px-4 py-1.5 rounded-full border shadow-sm"
              style={{ borderColor: `${primaryColor}15` }}
            >
              <span className="font-medium">{getDeliveryLabel(delivery_method)}</span>
              <span className="text-muted-foreground/30">•</span>
              <span>{created_at ? format(new Date(created_at), "dd/MM/yyyy") : ""}</span>
            </div>

            {/* Bouton Payer */}
            {isPending && (
              <Button
                onClick={() => onPay && onPay(giftCard)}
                className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                size="sm"
              >
                <Banknote className="h-4 w-4" />
                Payer à la caisse
              </Button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

// ========== PAGE PRINCIPALE ==========
export default function GiftCards() {
  const { currentUser } = useAuth();
  const [giftCards, setGiftCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  const [viewCardOpen, setViewCardOpen] = useState(false);
  const [error, setError] = useState(null);

  // États pour le paiement à la caisse
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentCard, setPaymentCard] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    received_amount: "",
    payment_method: "cash",
    change: 0,
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    validated: 0,
    delivered: 0,
    cancelled: 0,
    totalAmount: 0,
  });

  const [formData, setFormData] = useState({
    code: "",
    amount: "",
    recipient_name: "",
    recipient_email: "",
    recipient_phone: "",
    sender_name: "",
    sender_phone: "",
    message: "",
    occasion: "",
    delivery_method: "presentielle",
    payment_status: "payé",
    status: "paid",
    is_active: true,
  });

  const userRole = currentUser?.profile?.role || currentUser?.role;
  const isSuperAdmin = userRole === "super_admin";
  const tenantId = currentUser?.profile?.tenant_id;

  // ========== GÉNÉRER UN CODE ==========
  const generateGiftCardCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return "GC-" + code;
  };

  // ========== RÉCUPÉRER LES DONNÉES ==========
  useEffect(() => {
    fetchGiftCards();
  }, []);

  const fetchGiftCards = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!tenantId && userRole !== "super_admin") {
        setError("Aucun salon associé à votre compte.");
        setGiftCards([]);
        setLoading(false);
        return;
      }

      let query = supabase.from("gift_cards").select("*");
      if (!isSuperAdmin && tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setGiftCards(data || []);

      const total = data?.length || 0;
      const pending = data?.filter((c) => c.status === "pending" || c.payment_status === "en_attente").length || 0;
      const paid = data?.filter((c) => c.status === "paid" || c.payment_status === "payé").length || 0;
      const validated = data?.filter((c) => c.status === "validated").length || 0;
      const delivered = data?.filter((c) => c.status === "delivered").length || 0;
      const cancelled = data?.filter((c) => c.status === "cancelled" || c.payment_status === "annulé").length || 0;
      const totalAmount = data?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      setStats({ total, pending, paid, validated, delivered, cancelled, totalAmount });
    } catch (error) {
      console.error("Error fetching gift cards:", error);
      setError(error.message);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  // ========== CRÉER UNE CARTE CADEAU ==========
  const handleCreateGiftCard = async (e) => {
    e.preventDefault();
    try {
      if (!tenantId) {
        toast.error("Configuration du salon non trouvée");
        return;
      }

      const payload = {
        tenant_id: tenantId,
        code: formData.code || generateGiftCardCode(),
        amount: parseFloat(formData.amount),
        recipient_name: formData.recipient_name || null,
        recipient_email: formData.recipient_email || null,
        recipient_phone: formData.recipient_phone || null,
        sender_name: formData.sender_name || null,
        sender_phone: formData.sender_phone || null,
        message: formData.message || null,
        occasion: formData.occasion || null,
        delivery_method: formData.delivery_method || "presentielle",
        payment_status: formData.payment_status || "payé",
        status: formData.payment_status === "payé" ? "paid" : "pending",
        is_active: formData.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tenant_name: currentUser?.profile?.tenant_name || null,
        tenant_primary_color: currentUser?.profile?.primary_color || "#ec4899",
      };

      if (editingCard) {
        const { error } = await supabase.from("gift_cards").update(payload).eq("id", editingCard.id);
        if (error) throw error;
        toast.success("Carte cadeau mise à jour avec succès");
      } else {
        const { error } = await supabase.from("gift_cards").insert([payload]);
        if (error) throw error;
        toast.success("Carte cadeau créée avec succès");
      }

      setModalOpen(false);
      setEditingCard(null);
      resetForm();
      fetchGiftCards();
    } catch (error) {
      console.error("Error saving gift card:", error);
      toast.error(error.message || "Erreur lors de la sauvegarde");
    }
  };

  // ========== SUPPRIMER UNE CARTE ==========
  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette carte cadeau ?")) return;
    try {
      const { error } = await supabase.from("gift_cards").delete().eq("id", id);
      if (error) throw error;
      toast.success("Carte cadeau supprimée");
      fetchGiftCards();
    } catch (error) {
      console.error("Error deleting gift card:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  // ========== MODIFIER UNE CARTE ==========
  const handleEdit = (card) => {
    setEditingCard(card);
    setFormData({
      code: card.code,
      amount: card.amount?.toString() || "",
      recipient_name: card.recipient_name || "",
      recipient_email: card.recipient_email || "",
      recipient_phone: card.recipient_phone || "",
      sender_name: card.sender_name || "",
      sender_phone: card.sender_phone || "",
      message: card.message || "",
      occasion: card.occasion || "",
      delivery_method: card.delivery_method || "presentielle",
      payment_status: card.payment_status || "payé",
      is_active: card.is_active !== undefined ? card.is_active : true,
    });
    setModalOpen(true);
  };

  // ========== VOIR UNE CARTE ==========
  const viewCard = (card) => {
    setSelectedCard(card);
    setViewCardOpen(true);
  };

  // ========== COPIER LE CODE ==========
  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copié !");
  };

  // ========== RÉINITIALISER LE FORMULAIRE ==========
  const resetForm = () => {
    const today = new Date().toISOString().split("T")[0];
    setFormData({
      code: generateGiftCardCode(),
      amount: "",
      recipient_name: "",
      recipient_email: "",
      recipient_phone: "",
      sender_name: "",
      sender_phone: "",
      message: "",
      occasion: "",
      delivery_method: "presentielle",
      payment_status: "payé",
      is_active: true,
    });
  };

  // ========== STATUT BADGE POUR CARTE ==========
  const getStatusBadge = (card) => {
    const status = card.status || card.payment_status;
    if (status === "cancelled" || status === "annulé") return <Badge variant="destructive">❌ Annulée</Badge>;
    if (status === "expired" || status === "expiré") return <Badge className="bg-orange-100 text-orange-800">⏰ Expirée</Badge>;
    if (status === "used") return <Badge className="bg-gray-100 text-gray-800">🎁 Utilisée</Badge>;
    if (status === "validated") return <Badge className="bg-green-100 text-green-800">🎉 Validée</Badge>;
    if (status === "paid" || status === "payé") return <Badge className="bg-blue-100 text-blue-800">✅ Payée</Badge>;
    if (status === "pending" || status === "en_attente") return <Badge className="bg-yellow-100 text-yellow-800">⏳ En attente</Badge>;
    if (status === "delivered" || status === "livrée") return <Badge className="bg-purple-100 text-purple-800">📦 Livrée</Badge>;
    return <Badge variant="outline">{status || "Inconnu"}</Badge>;
  };

  // ========== FILTRAGE ==========
  const filteredCards = giftCards.filter((card) => {
    const matchesSearch =
      card.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.sender_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // ========== TÉLÉCHARGER LE PDF ==========
  const downloadPDF = async () => {
    const previewElement = document.getElementById("gift-card-preview");
    if (!previewElement) return;

    toast.loading("Génération du PDF...");

    try {
      const canvas = await html2canvas(previewElement, {
        scale: 3,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a5",
      });

      const pdfWidth = 148;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`carte-cadeau-${selectedCard?.code || 'gift'}.pdf`);

      toast.dismiss();
      toast.success("📄 PDF téléchargé avec succès !");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.dismiss();
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  // ========== ENVOYER PAR WHATSAPP ==========
  const sendViaWhatsApp = () => {
    const card = selectedCard;
    if (!card?.recipient_phone) {
      toast.error("Numéro de téléphone du destinataire manquant");
      return;
    }

    const phone = card.recipient_phone.replace(/\D/g, "");
    const message = `🎁 Carte cadeau pour ${card.recipient_name} de la part de ${card.sender_name || "un client"}

💳 Montant: ${card.amount?.toLocaleString()} FCFA
🏷️ Code: ${card.code}
🎯 Occasion: ${getOccasionLabel(card.occasion)}

${card.message ? `💬 Message: "${card.message}"` : ""}

✅ Carte valable chez notre salon`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  // ========== PAYER À LA CAISSE ==========
  const openPaymentModal = (card) => {
    setPaymentCard(card);
    setPaymentForm({
      received_amount: card.amount?.toString() || "",
      payment_method: "cash",
      change: 0,
    });
    setPaymentModalOpen(true);
  };

  const calculateChange = (received, amount) => {
    const receivedNum = parseFloat(received) || 0;
    const amountNum = parseFloat(amount) || 0;
    const change = receivedNum - amountNum;
    return change > 0 ? change : 0;
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!paymentCard || !tenantId) {
        toast.error("Information manquante");
        return;
      }

      const amount = parseFloat(paymentCard.amount);
      const receivedAmount = parseFloat(paymentForm.received_amount) || amount;

      if (receivedAmount < amount) {
        toast.error(`Le montant reçu est inférieur au montant à payer`);
        return;
      }

      const change = receivedAmount - amount;

      const { error: updateError } = await supabase
        .from("gift_cards")
        .update({
          status: "paid",
          payment_status: "payé",
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentCard.id);

      if (updateError) throw updateError;

      const receiptNumber = `GC-${Date.now().toString().slice(-6)}`;

      const { error: txError } = await supabase
        .from("transactions")
        .insert({
          tenant_id: tenantId,
          amount: amount,
          payment_method: paymentForm.payment_method,
          receipt_number: receiptNumber,
          status: "completed",
          transaction_date: new Date().toISOString(),
          transaction_type: "gift_card",
          source: "cashier",
          customer_name: paymentCard.recipient_name || "Client",
          customer_phone: paymentCard.recipient_phone || "",
          description: `Paiement carte cadeau ${paymentCard.code}`,
          gift_card_id: paymentCard.id,
        });

      if (txError) throw txError;

      toast.success(`💰 Paiement de ${amount.toLocaleString()} FCFA enregistré`);
      setPaymentModalOpen(false);
      setPaymentCard(null);
      setPaymentForm({ received_amount: "", payment_method: "cash", change: 0 });
      await fetchGiftCards();
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error(error.message || "Échec du paiement");
    }
  };

  // ========== RENDU ==========
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gift className="h-8 w-8 text-purple-500" />
            Gestion des Cartes Cadeaux
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white ml-2">
              {giftCards.length} cartes
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-1">
            {isSuperAdmin ? "Toutes les cartes de tous les salons" : "Gérez vos cartes cadeaux"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchGiftCards}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          {!isSuperAdmin && (
            <Button onClick={() => { setEditingCard(null); resetForm(); setModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Créer une carte
            </Button>
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="border-l-4 border-l-purple-500"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Total</p><p className="text-xl font-bold">{stats.total}</p></CardContent></Card>
        <Card className="border-l-4 border-l-yellow-500"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">En attente</p><p className="text-xl font-bold text-yellow-600">{stats.pending}</p></CardContent></Card>
        <Card className="border-l-4 border-l-blue-500"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Payées</p><p className="text-xl font-bold text-blue-600">{stats.paid}</p></CardContent></Card>
        <Card className="border-l-4 border-l-green-500"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Validées</p><p className="text-xl font-bold text-green-600">{stats.validated}</p></CardContent></Card>
        <Card className="border-l-4 border-l-purple-500"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Livrées</p><p className="text-xl font-bold text-purple-600">{stats.delivered}</p></CardContent></Card>
        <Card className="border-l-4 border-l-red-500"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Annulées</p><p className="text-xl font-bold text-red-600">{stats.cancelled}</p></CardContent></Card>
        <Card className="border-l-4 border-l-emerald-500"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Montant total</p><p className="text-xl font-bold text-emerald-600">{stats.totalAmount.toLocaleString()} FCFA</p></CardContent></Card>
      </div>

      {/* Recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vue */}
      <div className="flex justify-end">
        <div className="flex border rounded-lg overflow-hidden">
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("grid")}>
            <Gift className="h-4 w-4 mr-2" /> Cartes
          </Button>
          <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setViewMode("table")}>
            <Table className="h-4 w-4 mr-2" /> Liste
          </Button>
        </div>
      </div>

      {/* Liste des cartes */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[200px] w-full rounded-2xl" />)}
        </div>
      ) : filteredCards.length === 0 ? (
        <Card className="p-12 text-center"><Gift className="h-16 w-16 mx-auto text-muted-foreground/30" /><p className="mt-4">Aucune carte cadeau</p></Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCards.map(card => (
            <GiftCardPreview key={card.id} giftCard={card} onPay={openPaymentModal} />
          ))}
        </div>
      ) : (
        <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Destinataire</TableHead><TableHead>Expéditeur</TableHead><TableHead>Montant</TableHead><TableHead>Occasion</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
          {filteredCards.map(card => (
            <TableRow key={card.id}>
              <TableCell className="font-mono">{card.code}</TableCell>
              <TableCell>{card.recipient_name || "-"}</TableCell>
              <TableCell>{card.sender_name || "-"}</TableCell>
              <TableCell>{card.amount?.toLocaleString()} FCFA</TableCell>
              <TableCell>{getOccasionLabel(card.occasion)}</TableCell>
              <TableCell>{getStatusBadge(card)}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => viewCard(card)}><Eye className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(card)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(card.id)}><Trash2 className="h-4 w-4" /></Button>
                {card.status === 'pending' && (
                  <Button size="sm" className="bg-amber-500 text-white hover:bg-amber-600" onClick={() => openPaymentModal(card)}>
                    <Banknote className="h-3 w-3 mr-1" /> Payer
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody></Table></CardContent></Card>
      )}

      {/* Modals */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingCard ? "Modifier" : "Créer"} une carte cadeau</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateGiftCard} className="space-y-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <div className="flex gap-2">
                <Input value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})} className="font-mono" />
                <Button type="button" variant="outline" onClick={() => setFormData({...formData, code: generateGiftCardCode()})}>Générer</Button>
              </div>
            </div>
            <div><Label>Montant (FCFA) *</Label><Input type="number" required value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} /></div>
            <div><Label>Destinataire</Label><Input value={formData.recipient_name} onChange={(e) => setFormData({...formData, recipient_name: e.target.value})} /></div>
            <div><Label>Email</Label><Input type="email" value={formData.recipient_email} onChange={(e) => setFormData({...formData, recipient_email: e.target.value})} /></div>
            <div><Label>Téléphone</Label><Input value={formData.recipient_phone} onChange={(e) => setFormData({...formData, recipient_phone: e.target.value})} /></div>
            <div><Label>Expéditeur</Label><Input value={formData.sender_name} onChange={(e) => setFormData({...formData, sender_name: e.target.value})} /></div>
            <div><Label>Téléphone expéditeur</Label><Input value={formData.sender_phone} onChange={(e) => setFormData({...formData, sender_phone: e.target.value})} /></div>
            <div><Label>Occasion</Label>
              <select value={formData.occasion} onChange={(e) => setFormData({...formData, occasion: e.target.value})} className="w-full p-2 border rounded-md">
                <option value="">Sélectionnez</option>
                {OCCASIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div><Label>Message</Label><Input value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} /></div>
            <div><Label>Livraison</Label>
              <select value={formData.delivery_method} onChange={(e) => setFormData({...formData, delivery_method: e.target.value})} className="w-full p-2 border rounded-md">
                <option value="presentielle">🏪 En présentielle</option>
                <option value="whatsapp">📱 WhatsApp</option>
                <option value="email">📧 Par email</option>
              </select>
            </div>
            <div><Label>Statut paiement</Label>
              <select value={formData.payment_status} onChange={(e) => setFormData({...formData, payment_status: e.target.value})} className="w-full p-2 border rounded-md">
                <option value="payé">✅ Payée</option>
                <option value="en_attente">⏳ En attente</option>
                <option value="annulé">❌ Annulée</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button type="submit">{editingCard ? "Mettre à jour" : "Créer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Voir carte */}
      <Dialog open={viewCardOpen} onOpenChange={setViewCardOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Détails de la carte cadeau</DialogTitle></DialogHeader>
          {selectedCard && (
            <div className="space-y-4">
              <GiftCardPreview giftCard={selectedCard} onPay={openPaymentModal} />
              <div className="flex gap-2">
                <Button onClick={downloadPDF}><Download className="h-4 w-4 mr-2" /> PDF</Button>
                <Button variant="outline" onClick={sendViaWhatsApp}><Send className="h-4 w-4 mr-2" /> WhatsApp</Button>
                <Button variant="outline" onClick={() => setViewCardOpen(false)}>Fermer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Paiement */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Paiement à la caisse</DialogTitle></DialogHeader>
          {paymentCard && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Code</span><span className="font-mono">{paymentCard.code}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Montant</span><span className="font-bold">{paymentCard.amount?.toLocaleString()} FCFA</span></div>
              </div>
              <div><Label>Montant reçu (FCFA) *</Label>
                <Input type="number" step="100" required value={paymentForm.received_amount} onChange={(e) => {
                  const received = e.target.value;
                  const change = calculateChange(received, paymentCard.amount);
                  setPaymentForm({...paymentForm, received_amount: received, change});
                }} autoFocus />
              </div>
              {paymentForm.change > 0 && (
                <div className="p-3 bg-green-50 border border-green-300 rounded-lg">
                  <div className="flex justify-between"><span className="text-green-700">Monnaie à rendre</span><span className="font-bold text-green-700">{paymentForm.change.toLocaleString()} FCFA</span></div>
                </div>
              )}
              <div><Label>Méthode</Label>
                <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm({...paymentForm, payment_method: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">💰 Espèces</SelectItem>
                    <SelectItem value="card">💳 Carte</SelectItem>
                    <SelectItem value="orange_money">📱 Orange Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPaymentModalOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={!paymentForm.received_amount || parseFloat(paymentForm.received_amount) < parseFloat(paymentCard.amount)}>
                  Valider le paiement
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}