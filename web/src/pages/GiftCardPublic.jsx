// /src/pages/GiftCardPublic.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Gift, 
  Eye, 
  Sparkles, 
  Building2, 
  CheckCircle, 
  Loader2, 
  ArrowLeft, 
  Wallet, 
  Send, 
  Printer, 
  Download, 
  Smartphone, 
  Store, 
  Copy, 
  Check, 
  History, 
  RefreshCw,
  Phone,
  User,
  Clock
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// ========== LISTE DES OCCASIONS EN FRANÇAIS ==========
const OCCASIONS = [
  { value: "birthday", label: "🎂 Anniversaire" },
  { value: "anniversary", label: "💑 Anniversaire de mariage" },
  { value: "wedding", label: "💍 Mariage" },
  { value: "baby", label: "👶 Naissance" },
  { value: "graduation", label: "🎓 Diplôme" },
  { value: "new_job", label: "💼 Nouvel emploi" },
  { value: "goodbye", label: "✈️ Départ" },
  { value: "thank_you", label: "🙏 Remerciement" },
  { value: "christmas", label: "🎄 Noël" },
  { value: "new_year", label: "🎊 Nouvel an" },
  { value: "valentine", label: "❤️ Saint-Valentin" },
  { value: "mothers_day", label: "🌸 Fête des mères" },
  { value: "fathers_day", label: "👔 Fête des pères" },
  { value: "friends_day", label: "🤝 Journée des amis" },
  { value: "loyalty", label: "⭐ Fidélité" },
  { value: "other", label: "🎁 Autre" },
];

const getOccasionLabel = (value) => {
  if (!value) return "🎁 Autre";
  const occasion = OCCASIONS.find(o => o.value === value);
  return occasion ? occasion.label : "🎁 Autre";
};

// ========== MÉTHODES DE PAIEMENT ==========
const paymentMethods = [
  { value: "orange_money", label: "📱 Orange Money" },
  { value: "moov_money", label: "📱 Moov Money" },
  { value: "wave", label: "🌊 Wave" },
  { value: "card", label: "💳 Carte Bancaire" },
  { value: "cash", label: "🏪 Paiement en caisse" },
];

const getPaymentMethodLabel = (value) => {
  const method = paymentMethods.find(m => m.value === value);
  return method ? method.label : "Non spécifié";
};

// ========== CARTE CADEAU PRÉVISUALISATION ==========
const GiftCardPreview = ({ giftCard, isPDF = false }) => {
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
    created_at,
    code,
    status,
    payment_method
  } = giftCard;

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
      email: "📧 Par email" 
    };
    return labels[method] || method;
  };

  const primaryColor = tenant_primary_color || "#ec4899";

  // Version pour le PDF
  if (isPDF) {
    return (
      <div 
        id="gift-card-pdf"
        style={{
          width: '800px',
          height: '400px',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          border: `2px solid ${primaryColor}`,
          padding: '30px',
          display: 'flex',
          flexDirection: 'row',
          fontFamily: 'Arial, sans-serif',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
        }}
      >
        {/* Fond décoratif */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          backgroundColor: primaryColor,
          opacity: 0.05,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-100px',
          left: '-100px',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          backgroundColor: primaryColor,
          opacity: 0.05,
          pointerEvents: 'none',
        }} />

        {/* COLONNE GAUCHE */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          paddingRight: '20px',
          zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {tenant_logo ? (
              <img 
                src={tenant_logo} 
                alt={tenant_name} 
                style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }} 
              />
            ) : (
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: `${primaryColor}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{ fontSize: '24px' }}>🎁</span>
              </div>
            )}
            <div>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a1a2e', margin: 0 }}>
                {tenant_name || "SalonApp"}
              </p>
              <p style={{ fontSize: '10px', fontWeight: '600', color: primaryColor, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                ✦ Carte cadeau
              </p>
            </div>
          </div>

          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: primaryColor }} />
              <p style={{ fontSize: '10px', fontWeight: '600', color: primaryColor, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                Offert à
              </p>
            </div>
            <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#1a1a2e', margin: 0 }}>
              {recipient_name || "Non attribué"}
            </p>
            {recipient_phone && (
              <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '500', margin: 0 }}>
                {recipient_phone}
              </p>
            )}
          </div>

          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: primaryColor }} />
              <p style={{ fontSize: '10px', fontWeight: '600', color: primaryColor, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                Valeur
              </p>
            </div>
            <p style={{ fontSize: '32px', fontWeight: '800', color: primaryColor, margin: 0 }}>
              {amount?.toLocaleString()} FCFA
            </p>
          </div>
        </div>

        {/* COLONNE DROITE */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          zIndex: 1,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '9999px',
            backgroundColor: `${primaryColor}12`,
            border: `1px solid ${primaryColor}20`,
          }}>
            <span style={{ fontSize: '20px' }}>{getOccasionEmoji(occasion)}</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: primaryColor }}>
              Pour {getOccasionLabel(occasion)}
            </span>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
              <p style={{ fontSize: '10px', fontWeight: '600', color: primaryColor, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                De la part de
              </p>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: primaryColor }} />
            </div>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a1a2e', margin: 0 }}>
              {sender_name || "Anonyme"}
            </p>
            {sender_phone && (
              <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '500', margin: 0 }}>
                {sender_phone}
              </p>
            )}
          </div>

          {message && (
            <div style={{
              fontSize: '14px',
              fontStyle: 'italic',
              color: '#1a1a2e',
              backgroundColor: 'rgba(255,255,255,0.8)',
              padding: '8px 16px',
              borderRadius: '12px',
              border: `1px solid ${primaryColor}15`,
              maxWidth: '280px',
              textAlign: 'right',
            }}>
              "{message}"
            </div>
          )}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '11px',
            color: '#64748b',
            backgroundColor: 'rgba(255,255,255,0.8)',
            padding: '6px 16px',
            borderRadius: '9999px',
            border: `1px solid ${primaryColor}15`,
          }}>
            <span style={{ fontWeight: '500' }}>{getDeliveryLabel(delivery_method)}</span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span>{created_at ? format(new Date(created_at), "dd/MM/yyyy") : ""}</span>
          </div>
        </div>
      </div>
    );
  }

  // Version responsive pour l'affichage web - optimisée pour iPhone
  return (
    <div 
      className="gift-card-wrapper"
      style={{
        width: '100%',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '0',
      }}
    >
      <div
        className="gift-card-container"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          border: `2px solid ${primaryColor}`,
          padding: '16px 12px',
          width: '100%',
          minHeight: '280px',
          boxShadow: `0 20px 60px ${primaryColor}20, 0 4px 20px rgba(0,0,0,0.05)`,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Fond décoratif */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          backgroundColor: primaryColor,
          opacity: 0.04,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-60px',
          left: '-60px',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          backgroundColor: primaryColor,
          opacity: 0.04,
          pointerEvents: 'none',
        }} />

        {/* Version mobile : layout vertical */}
        <div className="flex flex-col h-full relative z-10 gap-3">
          
          {/* Ligne 1 : Logo + Titre + Occasion */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {tenant_logo ? (
                <img 
                  src={tenant_logo} 
                  alt={tenant_name} 
                  className="w-8 h-8 rounded-lg object-cover border border-white shadow-md flex-shrink-0" 
                />
              ) : (
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md flex-shrink-0"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Gift className="h-4 w-4" style={{ color: primaryColor }} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground truncate">{tenant_name || "SalonApp"}</p>
                <p 
                  className="text-[8px] uppercase tracking-wider font-medium"
                  style={{ color: primaryColor }}
                >
                  ✦ Carte cadeau
                </p>
              </div>
            </div>
            <div 
              className="flex items-center gap-1 px-2 py-1 rounded-full shadow-sm flex-shrink-0"
              style={{ 
                backgroundColor: `${primaryColor}12`,
                border: `1px solid ${primaryColor}20`
              }}
            >
              <span className="text-sm leading-none">{getOccasionEmoji(occasion)}</span>
              <span className="text-[9px] font-semibold truncate max-w-[80px]" style={{ color: primaryColor }}>
                {getOccasionLabel(occasion)}
              </span>
            </div>
          </div>

          {/* Ligne 2 : Destinataire + Valeur */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <div 
                  className="w-1 h-1 rounded-full flex-shrink-0"
                  style={{ backgroundColor: primaryColor }}
                />
                <p 
                  className="text-[8px] uppercase tracking-wider font-semibold"
                  style={{ color: primaryColor }}
                >
                  Offert à
                </p>
              </div>
              <p className="text-base font-bold text-foreground truncate">{recipient_name || "Non attribué"}</p>
              {recipient_phone && (
                <p className="text-[10px] text-muted-foreground font-medium truncate">{recipient_phone}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="flex items-center justify-end gap-1">
                <p 
                  className="text-[8px] uppercase tracking-wider font-semibold"
                  style={{ color: primaryColor }}
                >
                  Valeur
                </p>
                <div 
                  className="w-1 h-1 rounded-full flex-shrink-0"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>
              <div 
                className="text-xl font-extrabold tracking-tight"
                style={{ color: primaryColor }}
              >
                {amount?.toLocaleString()} FCFA
              </div>
            </div>
          </div>

          {/* Ligne 3 : Expéditeur + Message */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p 
                  className="text-[8px] uppercase tracking-wider font-semibold"
                  style={{ color: primaryColor }}
                >
                  De la part de
                </p>
                <div 
                  className="w-1 h-1 rounded-full flex-shrink-0"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>
              <p className="text-sm font-bold text-foreground truncate">{sender_name || "Anonyme"}</p>
              {sender_phone && (
                <p className="text-[10px] text-muted-foreground font-medium truncate">{sender_phone}</p>
              )}
            </div>
            {message && (
              <div 
                className="text-[10px] italic text-foreground/80 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm px-2 py-1 rounded-lg border shadow-sm max-w-[120px] flex-shrink-0 text-right"
                style={{ borderColor: `${primaryColor}15` }}
              >
                "{message}"
              </div>
            )}
          </div>

          {/* Ligne 4 : Livraison + Date + Code + Statut */}
          <div className="flex items-center justify-between gap-2 mt-auto pt-1 border-t border-gray-100/50">
            <div className="flex items-center gap-2 text-[8px] text-muted-foreground bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm px-2 py-0.5 rounded-full border"
              style={{ borderColor: `${primaryColor}15` }}
            >
              <span className="font-medium">{getDeliveryLabel(delivery_method)}</span>
              <span className="text-muted-foreground/30">•</span>
              <span>{created_at ? format(new Date(created_at), "dd/MM/yyyy") : ""}</span>
            </div>
            <div className="flex items-center gap-2">
              {code && (
                <span className="font-mono text-[8px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {code}
                </span>
              )}
              {status && (
                <Badge 
                  variant={status === 'pending' ? 'outline' : status === 'pending_cash' ? 'secondary' : 'default'}
                  className="text-[6px] sm:text-[8px] px-1 py-0.5"
                >
                  {status === 'pending' && '⏳ En attente'}
                  {status === 'pending_cash' && '🏪 Caisse'}
                  {status === 'paid' && '✅ Payée'}
                  {status === 'validated' && '🎉 Validée'}
                </Badge>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ========== PAGE PRINCIPALE ==========
export default function GiftCardPublic() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    amount: 5000,
    recipient_name: "",
    recipient_phone: "",
    sender_name: "",
    sender_phone: "",
    message: "",
    occasion: "other",
    delivery_method: "whatsapp",
    payment_method: "orange_money",
  });

  const [myGiftCards, setMyGiftCards] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [createdGiftCard, setCreatedGiftCard] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showHistoryCard, setShowHistoryCard] = useState(false);

  const presetAmounts = [5000, 10000, 15000, 20000, 25000, 30000, 50000];
  const deliveryMethods = [
    { value: "whatsapp", label: "📱 WhatsApp", icon: <Smartphone className="h-4 w-4" /> },
    { value: "physical", label: "🏪 En présentielle", icon: <Store className="h-4 w-4" /> }
  ];

  const resetForm = () => {
    setFormData({
      amount: 5000,
      recipient_name: "",
      recipient_phone: "",
      sender_name: "",
      sender_phone: "",
      message: "",
      occasion: "other",
      delivery_method: "whatsapp",
      payment_method: "orange_money",
    });
    setCreatedGiftCard(null);
    setShowSuccess(false);
  };

  useEffect(() => { if (slug) { fetchTenant(); fetchMyGiftCards(); } }, [slug]);

  const fetchMyGiftCards = async () => {
    if (!tenant?.id) return;
    setLoadingHistory(true);
    try {
      let phone = formData.recipient_phone || localStorage.getItem('gift_card_phone') || (isAuthenticated && currentUser?.profile?.phone);
      if (!phone) { setMyGiftCards([]); setLoadingHistory(false); return; }
      const cleanPhone = phone.replace(/\s/g, '').replace(/-/g, '');
      const { data, error } = await supabase
        .from("gift_cards")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("recipient_phone", cleanPhone)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMyGiftCards(data || []);
      if (data?.length > 0) toast.success(`${data.length} carte(s) cadeau trouvée(s)`);
    } catch (error) { 
      console.error(error); 
      toast.error("Erreur lors du chargement"); 
    } finally { 
      setLoadingHistory(false); 
    }
  };

  const fetchTenant = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("slug", slug)
        .eq("subscription_status", "active")
        .single();
      if (error) throw error;
      if (!data) { toast.error("Salon non trouvé"); navigate("/"); return; }
      setTenant(data);
      if (isAuthenticated && currentUser?.profile) {
        setFormData(prev => ({
          ...prev,
          sender_name: currentUser.profile.full_name || "",
          sender_phone: currentUser.profile.phone || "",
        }));
      }
    } catch (error) { 
      console.error(error); 
      toast.error("Erreur lors du chargement"); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleCreateGiftCard = async (e) => {
    e.preventDefault();
    if (!formData.amount || formData.amount < 1000) return toast.error("Le montant minimum est de 1 000 FCFA");
    if (!formData.recipient_name.trim()) return toast.error("Veuillez entrer le nom du destinataire");
    if (!formData.recipient_phone.trim()) return toast.error("Veuillez entrer le numéro de téléphone du destinataire");
    if (!formData.sender_name.trim()) return toast.error("Veuillez entrer votre nom");
    if (!formData.sender_phone.trim()) return toast.error("Veuillez entrer votre numéro de téléphone");

    setSubmitting(true);
    try {
      const code = `GC-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const cleanRecipientPhone = formData.recipient_phone.trim().replace(/\s/g, '').replace(/-/g, '');
      const cleanSenderPhone = formData.sender_phone.trim().replace(/\s/g, '').replace(/-/g, '');

      // ✅ TOUJOURS EN "pending" - L'ADMIN VALIDERA MANUELLEMENT
      const { data: giftCard, error } = await supabase
        .from("gift_cards")
        .insert({
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          tenant_logo: tenant.logo_url,
          tenant_primary_color: tenant.primary_color || "#ec4899",
          amount: formData.amount,
          recipient_name: formData.recipient_name.trim(),
          recipient_phone: cleanRecipientPhone,
          sender_name: formData.sender_name.trim(),
          sender_phone: cleanSenderPhone,
          message: formData.message.trim() || null,
          occasion: formData.occasion,
          delivery_method: formData.delivery_method,
          payment_method: formData.payment_method,
          code,
          status: "pending",
          payment_status: "en_attente",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      localStorage.setItem('gift_card_phone', cleanRecipientPhone);
      setCreatedGiftCard(giftCard);
      setShowSuccess(true);
      toast.success("🎉 Carte cadeau créée ! En attente de validation par l'admin.");

      // Notification pour l'admin
      await supabase
        .from("notifications")
        .insert({
          tenant_id: tenant.id,
          type: "gift_card_pending",
          title: "🆕 Nouvelle carte cadeau en attente",
          message: `Une nouvelle carte cadeau de ${formData.amount.toLocaleString()} FCFA a été créée par ${formData.sender_name} pour ${formData.recipient_name}. Code: ${code}`,
          read: false,
          created_at: new Date().toISOString()
        });

    } catch (error) {
      console.error(error);
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  // Fonction pour le téléchargement PDF
  const downloadPDF = async (cardToDownload = null) => {
    const card = cardToDownload || createdGiftCard || selectedCard;
    if (!card) {
      toast.error("Aucune carte à télécharger");
      return;
    }

    toast.loading("Génération du PDF...");

    try {
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.height = '400px';
      container.style.zIndex = '-9999';
      container.style.backgroundColor = '#ffffff';
      document.body.appendChild(container);

      const root = document.createElement('div');
      root.style.width = '100%';
      root.style.height = '100%';
      container.appendChild(root);

      const { createRoot } = await import('react-dom/client');
      const rootElement = createRoot(root);
      
      rootElement.render(
        <GiftCardPreview giftCard={card} isPDF={true} />
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: 800,
        height: 400,
        onclone: (clonedDoc) => {
          const imgElements = clonedDoc.querySelectorAll('img');
          return Promise.all(Array.from(imgElements).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
              img.onload = resolve;
              img.onerror = resolve;
            });
          }));
        }
      });

      rootElement.unmount();
      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [210, 148]
      });

      const pdfWidth = 210;
      const pdfHeight = 148;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const code = card.code || 'gift-card';
      pdf.save(`carte-cadeau-${code}.pdf`);

      toast.dismiss();
      toast.success("📄 PDF téléchargé avec succès !");
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  const sendViaWhatsApp = () => {
    const card = createdGiftCard || selectedCard;
    if (!card?.recipient_phone) return toast.error("Numéro de téléphone du destinataire manquant");
    const phone = card.recipient_phone.replace(/\D/g, '');
    const message = `🎁 *Carte cadeau* pour *${card.recipient_name}* de la part de *${card.sender_name}*\n\n` +
      `💳 Montant: *${card.amount.toLocaleString()} FCFA*\n` +
      `🏷️ Code: *${card.code}*\n` +
      `📍 Salon: *${card.tenant_name}*\n` +
      `🎯 Occasion: *${getOccasionLabel(card.occasion)}*\n` +
      `${card.message ? `💬 Message: *"${card.message}"*` : ''}\n\n` +
      `✅ Carte valable chez *${card.tenant_name}*`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 3000);
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Footer />
    </div>
  );
  
  if (!tenant) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <Building2 className="h-16 w-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Salon non trouvé</h2>
          <Button asChild><Link to="/">Retour</Link></Button>
        </div>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 flex-wrap">
          <Button 
            variant="ghost" 
            size="sm" 
            asChild
            className="gap-1 sm:gap-2 text-muted-foreground hover:text-primary transition-colors text-xs sm:text-sm"
          >
            <Link to={`/showcase/${tenant.slug}`}>
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Retour au salon</span>
              <span className="xs:hidden">Retour</span>
            </Link>
          </Button>
          
          <span className="text-muted-foreground/30">|</span>
          <span className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[150px] sm:max-w-xs">
            {tenant.name}
          </span>
        </div>

        {!showSuccess ? (
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-8">
            {/* Formulaire */}
            <Card className="order-2 lg:order-1">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Gift className="h-4 w-4 sm:h-5 sm:w-5" /> Créer votre carte cadeau
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Remplissez les informations ci-dessous</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <form onSubmit={handleCreateGiftCard} className="space-y-3 sm:space-y-4">
                  <div>
                    <Label className="text-xs sm:text-sm">Montant (FCFA) *</Label>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                      {presetAmounts.map(amount => (
                        <Button
                          key={amount}
                          type="button"
                          variant={formData.amount === amount ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFormData({...formData, amount})}
                          className="text-xs sm:text-sm h-7 sm:h-9 px-2 sm:px-3"
                        >
                          {amount.toLocaleString()}
                        </Button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: parseInt(e.target.value) || 0})}
                      className="mt-2 text-sm"
                      min="1000"
                      step="500"
                    />
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm">Occasion</Label>
                    <Select value={formData.occasion} onValueChange={(value) => setFormData({...formData, occasion: value})}>
                      <SelectTrigger className="text-sm"><SelectValue placeholder="Choisissez" /></SelectTrigger>
                      <SelectContent>
                        {OCCASIONS.map(occ => (
                          <SelectItem key={occ.value} value={occ.value}>{occ.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border-t pt-3 sm:pt-4">
                    <h4 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3 flex items-center gap-2">
                      <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                      Destinataire
                    </h4>
                    <div className="space-y-2 sm:space-y-3">
                      <div>
                        <Label className="text-xs sm:text-sm">Nom complet *</Label>
                        <Input
                          value={formData.recipient_name}
                          onChange={(e) => setFormData({...formData, recipient_name: e.target.value})}
                          placeholder="Nom du destinataire"
                          required
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs sm:text-sm">Téléphone *</Label>
                        <Input
                          type="tel"
                          value={formData.recipient_phone}
                          onChange={(e) => setFormData({...formData, recipient_phone: e.target.value})}
                          placeholder="Téléphone du destinataire"
                          required
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3 sm:pt-4">
                    <h4 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3 flex items-center gap-2">
                      <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                      De la part de (Vous)
                    </h4>
                    <div className="space-y-2 sm:space-y-3">
                      <div>
                        <Label className="text-xs sm:text-sm">Votre nom *</Label>
                        <Input
                          value={formData.sender_name}
                          onChange={(e) => setFormData({...formData, sender_name: e.target.value})}
                          placeholder="Votre nom"
                          required
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-2 text-xs sm:text-sm">
                          <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                          Votre numéro de téléphone *
                        </Label>
                        <Input
                          type="tel"
                          value={formData.sender_phone}
                          onChange={(e) => setFormData({...formData, sender_phone: e.target.value})}
                          placeholder="Votre numéro de téléphone"
                          required
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm">Message personnalisé</Label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      rows={3}
                      maxLength={500}
                      placeholder="Écrivez un message pour le destinataire..."
                      className="text-sm resize-none"
                    />
                    <p className="text-[10px] sm:text-xs text-muted-foreground text-right mt-1">
                      {formData.message.length}/500 caractères
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm">Mode de livraison</Label>
                    <Select value={formData.delivery_method} onValueChange={(value) => setFormData({...formData, delivery_method: value})}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {deliveryMethods.map(m => (
                          <SelectItem key={m.value} value={m.value}>
                            <span className="flex items-center gap-2 text-sm">{m.icon}{m.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Information sur le paiement en caisse */}
                  <div className="border-t pt-3 sm:pt-4">
                    <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <Store className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-400">
                        💡 Vous pouvez payer directement en caisse au moment de la réception de la carte.
                      </p>
                    </div>
                  </div>

                  <Button type="submit" className="w-full text-sm" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" /> : <Gift className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />}
                    {submitting ? "Création..." : "Créer la carte"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Aperçu */}
            <div className="order-1 lg:order-2">
              <h3 className="font-semibold text-sm sm:text-lg mb-3 sm:mb-4">
                <Eye className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                Aperçu
              </h3>
              {createdGiftCard ? (
                <GiftCardPreview giftCard={createdGiftCard} />
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <Gift className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/30 mx-auto" />
                    <p className="text-xs sm:text-sm text-muted-foreground">Remplissez le formulaire</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <Card className="max-w-2xl mx-auto border-amber-500/30">
            <CardContent className="p-4 sm:p-8 text-center">
              <div className="h-16 w-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-8 w-8 text-amber-500 animate-pulse" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-amber-500">⏳ En attente de validation</h2>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                Votre carte cadeau a été créée avec succès. Elle sera disponible dès que l'administrateur aura validé le paiement.
              </p>
              <div className="mt-4">
                <GiftCardPreview giftCard={createdGiftCard} />
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center mt-4">
                <Button onClick={() => downloadPDF(createdGiftCard)} size="sm" className="text-xs sm:text-sm">
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> PDF
                </Button>
                <Button variant="outline" onClick={sendViaWhatsApp} size="sm" className="text-xs sm:text-sm">
                  <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> WhatsApp
                </Button>
                <Button variant="outline" onClick={copyLink} size="sm" className="text-xs sm:text-sm">
                  {copied ? <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />}
                  {copied ? "Copié !" : "Copier"}
                </Button>
                <Button variant="outline" onClick={() => window.print()} size="sm" className="text-xs sm:text-sm">
                  <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Imprimer
                </Button>
              </div>
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                  💡 Présentez-vous en caisse avec le code <span className="font-mono font-bold">{createdGiftCard?.code}</span> pour finaliser le paiement.
                </p>
              </div>
              <Button variant="outline" className="mt-4 text-sm" onClick={resetForm}>
                Créer une autre carte
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Historique */}
        <div className="mt-6 sm:mt-8">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h3 className="text-sm sm:text-lg font-semibold">
              <History className="h-4 w-4 sm:h-5 sm:w-5 inline mr-1 sm:mr-2" />
              Mes cartes
            </h3>
            <Button variant="ghost" size="sm" onClick={fetchMyGiftCards} disabled={loadingHistory} className="text-xs sm:text-sm">
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Actualiser
            </Button>
          </div>
          {loadingHistory ? (
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto" />
          ) : myGiftCards.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-4 sm:p-6 text-center">
                <Gift className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/30 mx-auto" />
                <p className="text-xs sm:text-sm text-muted-foreground">Aucune carte trouvée</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {myGiftCards.map(card => (
                <div 
                  key={card.id} 
                  className="p-3 sm:p-4 border rounded-xl cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setSelectedCard(card); setShowHistoryCard(true); }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono text-[10px] sm:text-xs">{card.code}</span>
                    <Badge 
                      variant={
                        card.status === 'pending' ? 'outline' : 
                        card.status === 'pending_cash' ? 'secondary' : 
                        'default'
                      } 
                      className="text-[8px] sm:text-xs"
                    >
                      {card.status === 'pending' && '⏳ En attente'}
                      {card.status === 'pending_cash' && '🏪 Caisse'}
                      {card.status === 'paid' && '✅ Payée'}
                      {card.status === 'validated' && '🎉 Validée'}
                    </Badge>
                  </div>
                  <p className="font-bold text-primary text-sm sm:text-base">{card.amount.toLocaleString()} FCFA</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Pour {card.recipient_name}</p>
                  {card.status === 'pending' && (
                    <p className="text-[8px] text-amber-600 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      En attente de validation
                    </p>
                  )}
                  {card.status === 'pending_cash' && (
                    <p className="text-[8px] text-amber-600 mt-1 flex items-center gap-1">
                      <Store className="h-3 w-3" />
                      Paiement en caisse
                    </p>
                  )}
                  {card.payment_method && (
                    <p className="text-[8px] text-muted-foreground mt-0.5">
                      {getPaymentMethodLabel(card.payment_method)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Détails */}
      <Dialog open={showHistoryCard} onOpenChange={setShowHistoryCard}>
        <DialogContent className="max-w-2xl w-[95vw] p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Détails de la carte cadeau
            </DialogTitle>
          </DialogHeader>
          {selectedCard && (
            <div className="space-y-4">
              <GiftCardPreview giftCard={selectedCard} />
              
              <div className="flex flex-wrap gap-2 justify-center">
                <Button variant="outline" className="gap-2 text-xs sm:text-sm" onClick={() => downloadPDF(selectedCard)}>
                  <Download className="h-3 w-3 sm:h-4 sm:w-4" /> PDF
                </Button>
                <Button variant="outline" className="gap-2 text-xs sm:text-sm" onClick={sendViaWhatsApp}>
                  <Send className="h-3 w-3 sm:h-4 sm:w-4" /> WhatsApp
                </Button>
                <Button variant="outline" className="gap-2 text-xs sm:text-sm" onClick={() => window.print()}>
                  <Printer className="h-3 w-3 sm:h-4 sm:w-4" /> Imprimer
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm border-t pt-4">
                <div>
                  <p className="text-muted-foreground text-[10px] sm:text-xs">Code</p>
                  <p className="font-mono font-medium text-xs sm:text-sm">{selectedCard.code}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] sm:text-xs">Statut</p>
                  <Badge 
                    variant={
                      selectedCard.status === 'pending' ? 'outline' : 
                      selectedCard.status === 'pending_cash' ? 'secondary' : 
                      'default'
                    } 
                    className="text-[8px] sm:text-xs"
                  >
                    {selectedCard.status === 'pending' && '⏳ En attente de paiement'}
                    {selectedCard.status === 'pending_cash' && '🏪 À payer en caisse'}
                    {selectedCard.status === 'paid' && '✅ Payée'}
                    {selectedCard.status === 'validated' && '🎉 Validée'}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] sm:text-xs">Méthode de paiement</p>
                  <p className="text-xs sm:text-sm">
                    {selectedCard.payment_method === 'cash' ? '🏪 Caisse' : 
                     selectedCard.payment_method === 'orange_money' ? '📱 Orange Money' :
                     selectedCard.payment_method === 'moov_money' ? '📱 Moov Money' :
                     selectedCard.payment_method === 'wave' ? '🌊 Wave' :
                     selectedCard.payment_method === 'card' ? '💳 Carte Bancaire' :
                     'Non spécifié'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] sm:text-xs">Date de création</p>
                  <p className="text-xs sm:text-sm">{selectedCard.created_at ? format(new Date(selectedCard.created_at), "dd/MM/yyyy") : ""}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryCard(false)} className="text-sm">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}