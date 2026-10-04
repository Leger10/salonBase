// /src/pages/SuperAdminSettingsPage.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Switch } from "@/components/ui/switch.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { toast } from "sonner";
import {
  Globe,
  Shield,
  Bell,
  CreditCard,
  Building2,
  Save,
  RefreshCw,
  AlertTriangle,
  Settings,
  CheckCircle,
  Server,
  Search,
  Users,
  Mail,
  Phone,
  MapPin,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Share2,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  MessageCircle,
  Link,
  Image,
  Upload,
  X,
  Palette,
  Crown,
  Star,
  Loader2,
} from "lucide-react";

export default function SuperAdminSettingsPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [debugData, setDebugData] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  // États pour les aperçus d'images
  const [previewLogo, setPreviewLogo] = useState(null);
  const [previewCover, setPreviewCover] = useState(null);
  const [previewHero, setPreviewHero] = useState(null);
  const [previewFavicon, setPreviewFavicon] = useState(null);

  // Paramètres généraux
  const [generalSettings, setGeneralSettings] = useState({
    platform_name: "BeautyFlow",
    platform_description: "Plateforme de gestion de salons de beauté",
    contact_email: "contact@beautyflow.com",
    contact_phone: "+226 54 32 92 99",
    support_email: "support@beautyflow.com",
    support_phone: "+226 54 32 92 99",
    address: "Ouagadougou, Burkina Faso",
    timezone: "Africa/Ouagadougou",
    currency: "XOF",
    language: "fr",
  });

  // Paramètres de branding (logo, couleurs, images)
  const [brandingSettings, setBrandingSettings] = useState({
    logo_url: "",
    favicon_url: "",
    cover_image: "",
    hero_image: "",
    primary_color: "#ec4899",
    secondary_color: "#06b6d4",
    accent_color: "#8b5cf6",
  });

  // Paramètres de sécurité
  const [securitySettings, setSecuritySettings] = useState({
    require_email_verification: true,
    require_phone_verification: false,
    max_login_attempts: 5,
    session_timeout_minutes: 60,
    two_factor_auth: false,
    password_min_length: 8,
    password_require_numbers: true,
    password_require_uppercase: true,
    password_require_special: false,
    enable_recaptcha: true,
    recaptcha_site_key: "",
    recaptcha_secret_key: "",
    ip_whitelist_enabled: false,
    ip_whitelist: "",
  });

  // Paramètres de notification
  const [notificationSettings, setNotificationSettings] = useState({
    admin_new_tenant: true,
    admin_new_user: true,
    admin_payment_received: true,
    admin_subscription_expired: true,
    admin_tenant_inactive: true,
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    email_smtp_host: "",
    email_smtp_port: 587,
    email_smtp_user: "",
    email_smtp_password: "",
    email_from_address: "noreply@beautyflow.com",
    email_from_name: "BeautyFlow",
  });

  // Paramètres de paiement
  const [paymentSettings, setPaymentSettings] = useState({
    platform_fee_percentage: 5,
    platform_fee_fixed: 0,
    stripe_enabled: false,
    stripe_public_key: "",
    stripe_secret_key: "",
    stripe_webhook_secret: "",
    orange_money_enabled: true,
    orange_money_merchant_id: "",
    orange_money_api_key: "",
    moov_money_enabled: true,
    moov_money_merchant_id: "",
    moov_money_api_key: "",
    wave_enabled: true,
    wave_api_key: "",
    wave_webhook_secret: "",
    default_currency: "XOF",
    minimum_payout: 1000,
    payout_frequency: "monthly",
    enable_auto_payout: true,
  });

  // Paramètres d'abonnement
  const [subscriptionSettings, setSubscriptionSettings] = useState({
    starter_price: 29000,
    pro_price: 99000,
    premium_price: 199000,
    starter_features:
      "Jusqu'à 50 clients, Gestion des rendez-vous, Notifications SMS basiques",
    pro_features:
      "Clients illimités, Gestion avancée, Notifications SMS et email, Programme de fidélité",
    premium_features:
      "Tout inclus du plan Pro, Employés illimités, API personnalisée, Support dédié 24/7",
    trial_days: 14,
    enable_annual_billing: true,
    annual_discount_percentage: 20,
    enable_custom_plans: false,
    max_employees_starter: 2,
    max_employees_pro: 10,
    max_employees_premium: -1,
    max_clients_starter: 50,
    max_clients_pro: -1,
    max_clients_premium: -1,
  });

  // Paramètres de l'application
  const [appSettings, setAppSettings] = useState({
    maintenance_mode: false,
    maintenance_message:
      "La plateforme est en maintenance. Nous revenons bientôt !",
    allow_registration: true,
    allow_tenant_registration: true,
    require_tenant_approval: true,
    max_tenants: -1,
    max_users_per_tenant: -1,
    enable_analytics: true,
    enable_logging: true,
    log_retention_days: 30,
    cache_enabled: true,
    cache_duration: 3600,
  });

  // Paramètres SEO
  const [seoSettings, setSeoSettings] = useState({
    meta_title: "BeautyFlow - Plateforme de gestion de salons de beauté",
    meta_description:
      "La plateforme complète pour gérer votre salon de beauté, réserver des rendez-vous et fidéliser vos clients.",
    meta_keywords: "beauté, salon, gestion, rendez-vous, fidélité, bien-être",
    og_title: "BeautyFlow",
    og_description: "Plateforme de gestion de salons de beauté",
    og_image: "",
    twitter_card: "summary_large_image",
    twitter_title: "BeautyFlow",
    twitter_description: "Plateforme de gestion de salons de beauté",
    twitter_image: "",
    robots_txt: "User-agent: *\nAllow: /",
    sitemap_enabled: true,
  });

  // Paramètres des réseaux sociaux
  const [socialSettings, setSocialSettings] = useState({
    facebook: "https://facebook.com/beautyflow",
    instagram: "https://instagram.com/beautyflow",
    twitter: "https://twitter.com/beautyflow",
    linkedin: "https://linkedin.com/company/beautyflow",
    youtube: "https://youtube.com/beautyflow",
    tiktok: "https://tiktok.com/@beautyflow",
    pinterest: "https://pinterest.com/beautyflow",
    whatsapp: "+226 54 32 92 99",
    telegram: "https://t.me/beautyflow",
    discord: "https://discord.gg/beautyflow",
  });

  useEffect(() => {
    if (currentUser?.profile?.role !== "super_admin") {
      toast.error("Accès non autorisé");
      setLoading(false);
      return;
    }
    fetchSettings();
  }, [currentUser]);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("🔍 Récupération des paramètres...");

      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (error) {
        console.error("❌ Erreur Supabase:", error);
        if (error.code === "PGRST116") {
          toast.info("Aucune configuration trouvée. Création automatique...");
          await createDefaultSettings();
          return;
        }
        throw error;
      }

      console.log("✅ Données brutes reçues:", data);

      if (data) {
        setDebugData(data);

        if (data.general) {
          setGeneralSettings((prev) => ({ ...prev, ...data.general }));
        }
        if (data.branding) {
          setBrandingSettings((prev) => ({ ...prev, ...data.branding }));
          setPreviewLogo(data.branding.logo_url || null);
          setPreviewCover(data.branding.cover_image || null);
          setPreviewHero(data.branding.hero_image || null);
          setPreviewFavicon(data.branding.favicon_url || null);
        }
        if (data.security) {
          setSecuritySettings((prev) => ({ ...prev, ...data.security }));
        }
        if (data.notifications) {
          setNotificationSettings((prev) => ({
            ...prev,
            ...data.notifications,
          }));
        }
        if (data.payments) {
          setPaymentSettings((prev) => ({ ...prev, ...data.payments }));
        }
        if (data.subscriptions) {
          setSubscriptionSettings((prev) => ({
            ...prev,
            ...data.subscriptions,
          }));
        }
        if (data.app) {
          setAppSettings((prev) => ({ ...prev, ...data.app }));
        }
        if (data.seo) {
          setSeoSettings((prev) => ({ ...prev, ...data.seo }));
        }
        if (data.social) {
          setSocialSettings((prev) => ({ ...prev, ...data.social }));
        }

        toast.success("✅ Paramètres chargés avec succès");
      }
    } catch (error) {
      console.error("❌ Error fetching settings:", error);
      setError(error.message || "Erreur lors du chargement des paramètres");
      toast.error(error.message || "Erreur lors du chargement des paramètres");
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    try {
      const defaultData = {
        id: 1,
        general: generalSettings,
        branding: brandingSettings,
        security: securitySettings,
        notifications: notificationSettings,
        payments: paymentSettings,
        subscriptions: subscriptionSettings,
        app: appSettings,
        seo: seoSettings,
        social: socialSettings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("platform_settings")
        .insert(defaultData)
        .select()
        .single();

      if (error) throw error;

      toast.success("Paramètres par défaut créés avec succès");
      await fetchSettings();
    } catch (error) {
      console.error("❌ Error creating default settings:", error);
      toast.error("Erreur lors de la création des paramètres par défaut");
    }
  };

  // ========== GESTION DES IMAGES ==========
  const handleImageUpload = async (file, type) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5MB");
      return;
    }

    setUploading(true);

    // Aperçu local
    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === "logo") setPreviewLogo(e.target.result);
      else if (type === "cover") setPreviewCover(e.target.result);
      else if (type === "hero") setPreviewHero(e.target.result);
      else if (type === "favicon") setPreviewFavicon(e.target.result);
    };
    reader.readAsDataURL(file);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `branding/${type}_${Date.now()}.${fileExt}`;
      const filePath = `platform/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("tenant-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("tenant-assets")
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;

      const newBranding = { ...brandingSettings };
      if (type === "logo") {
        newBranding.logo_url = publicUrl;
        setPreviewLogo(publicUrl);
      } else if (type === "cover") {
        newBranding.cover_image = publicUrl;
        setPreviewCover(publicUrl);
      } else if (type === "hero") {
        newBranding.hero_image = publicUrl;
        setPreviewHero(publicUrl);
      } else if (type === "favicon") {
        newBranding.favicon_url = publicUrl;
        setPreviewFavicon(publicUrl);
      }
      setBrandingSettings(newBranding);

      toast.success(`Image ${type} téléchargée avec succès`);
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erreur lors du téléchargement");
      if (type === "logo") setPreviewLogo(brandingSettings.logo_url || null);
      else if (type === "cover")
        setPreviewCover(brandingSettings.cover_image || null);
      else if (type === "hero")
        setPreviewHero(brandingSettings.hero_image || null);
      else if (type === "favicon")
        setPreviewFavicon(brandingSettings.favicon_url || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (type) => {
    const newBranding = { ...brandingSettings };
    if (type === "logo") {
      newBranding.logo_url = "";
      setPreviewLogo(null);
    } else if (type === "cover") {
      newBranding.cover_image = "";
      setPreviewCover(null);
    } else if (type === "hero") {
      newBranding.hero_image = "";
      setPreviewHero(null);
    } else if (type === "favicon") {
      newBranding.favicon_url = "";
      setPreviewFavicon(null);
    }
    setBrandingSettings(newBranding);
    toast.info(`Image ${type} supprimée`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        id: 1,
        general: generalSettings,
        branding: brandingSettings,
        security: securitySettings,
        notifications: notificationSettings,
        payments: paymentSettings,
        subscriptions: subscriptionSettings,
        app: appSettings,
        seo: seoSettings,
        social: socialSettings,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("platform_settings")
        .upsert(updateData)
        .eq("id", 1);

      if (error) throw error;

      toast.success("✅ Paramètres sauvegardés avec succès");
    } catch (error) {
      console.error("❌ Error saving settings:", error);
      toast.error(error.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSettings();
    setRefreshing(false);
    toast.info("Données actualisées");
  };

  // Rendu de l'aperçu du branding
  const renderBrandingPreview = () => {
    return (
      <div className="space-y-4 p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl border">
        <div className="flex items-center gap-4">
          {previewFavicon && (
            <img
              src={previewFavicon}
              alt="Favicon"
              className="h-8 w-8 rounded object-cover border"
              style={{
                borderColor: brandingSettings.primary_color || "#ec4899",
              }}
            />
          )}
          {previewLogo ? (
            <img
              src={previewLogo}
              alt="Logo"
              className="h-16 w-16 rounded-xl object-cover border-2"
              style={{
                borderColor: brandingSettings.primary_color || "#ec4899",
              }}
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center border-2 border-dashed">
              <Image className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div>
            <h3
              className="font-bold"
              style={{ color: brandingSettings.primary_color || "#ec4899" }}
            >
              {generalSettings.platform_name || "BeautyFlow"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {generalSettings.platform_description || "Plateforme de gestion"}
            </p>
            {previewFavicon && (
              <p className="text-xs text-muted-foreground">
                ✅ Favicon configuré
              </p>
            )}
            <div className="flex gap-2 mt-1">
              <span
                className="px-2 py-0.5 rounded-full text-xs"
                style={{
                  backgroundColor: brandingSettings.primary_color || "#ec4899",
                  color: "#fff",
                }}
              >
                Primaire
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-xs"
                style={{
                  backgroundColor:
                    brandingSettings.secondary_color || "#06b6d4",
                  color: "#fff",
                }}
              >
                Secondaire
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-xs"
                style={{
                  backgroundColor: brandingSettings.accent_color || "#8b5cf6",
                  color: "#fff",
                }}
              >
                Accent
              </span>
            </div>
          </div>
        </div>
        {previewCover && (
          <div className="relative rounded-lg overflow-hidden h-32">
            <img
              src={previewCover}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        {previewHero && (
          <div className="relative rounded-lg overflow-hidden h-48">
            <img
              src={previewHero}
              alt="Hero"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white">
              <p className="text-sm font-medium">Image Hero</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Rendu de l'aperçu global
  const renderGlobalPreview = () => {
    return (
      <div className="space-y-6">
        {/* Branding */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Identité visuelle
          </h3>
          {renderBrandingPreview()}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold">Erreur de chargement</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button className="mt-4" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      </div>
    );
  }

  if (currentUser?.profile?.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Shield className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold">Accès non autorisé</h1>
        <p className="text-muted-foreground">
          Vous devez être super administrateur.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            Paramètres Globaux
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez la configuration globale de la plateforme BeautyFlow
          </p>
          {debugData && (
            <p className="text-xs text-green-600 mt-1">
              ✅ Données chargées: {Object.keys(debugData).join(", ")}
            </p>
          )}
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
            className="gap-2"
          >
            {previewMode ? (
              <>
                <EyeOff className="h-4 w-4" />
                Mode Édition
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Aperçu
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Chargement..." : "Actualiser"}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Sauvegarde..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      {previewMode ? (
        // ==================== MODE APERÇU ====================
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>🔍 Aperçu de la configuration</CardTitle>
              <CardDescription>
                Voici un résumé de la configuration actuelle de la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {renderGlobalPreview()}
            </CardContent>
          </Card>
        </div>
      ) : (
        // ==================== MODE ÉDITION ====================
        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto bg-card border rounded-xl p-1 gap-1 mb-6">
            <TabsTrigger value="branding" className="flex-1">
              <Palette className="h-4 w-4 mr-2" /> Branding
            </TabsTrigger>
            <TabsTrigger value="general" className="flex-1">
              <Globe className="h-4 w-4 mr-2" /> Général
            </TabsTrigger>
            <TabsTrigger value="security" className="flex-1">
              <Shield className="h-4 w-4 mr-2" /> Sécurité
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex-1">
              <Bell className="h-4 w-4 mr-2" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex-1">
              <CreditCard className="h-4 w-4 mr-2" /> Paiements
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex-1">
              <Crown className="h-4 w-4 mr-2" /> Abonnements
            </TabsTrigger>
            <TabsTrigger value="app" className="flex-1">
              <Server className="h-4 w-4 mr-2" /> Application
            </TabsTrigger>
            <TabsTrigger value="seo" className="flex-1">
              <Search className="h-4 w-4 mr-2" /> SEO
            </TabsTrigger>
            <TabsTrigger value="social" className="flex-1">
              <Share2 className="h-4 w-4 mr-2" /> Réseaux
            </TabsTrigger>
          </TabsList>

          {/* ==================== ONGLET BRANDING ==================== */}
          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Identité visuelle
                </CardTitle>
                <CardDescription>
                  Personnalisez l'image de marque de la plateforme
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Aperçu */}
                <div className="mb-4">
                  <Label className="text-sm font-medium">Aperçu</Label>
                  {renderBrandingPreview()}
                </div>

                <Separator />

                {/* Logo */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Logo</Label>
                  <p className="text-sm text-muted-foreground">
                    Format carré recommandé (200x200)
                  </p>
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                      {previewLogo ? (
                        <div className="relative w-32 h-32">
                          <img
                            src={previewLogo}
                            alt="Logo"
                            className="w-32 h-32 rounded-2xl object-cover border-2"
                            style={{
                              borderColor:
                                brandingSettings.primary_color || "#ec4899",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage("logo")}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="w-32 h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/30 transition-colors"
                          style={{
                            borderColor:
                              brandingSettings.primary_color || "#ec4899",
                          }}
                          onClick={() =>
                            document.getElementById("logo-upload").click()
                          }
                        >
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground text-center">
                            Cliquer pour uploader
                          </span>
                        </div>
                      )}
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, "logo");
                          e.target.value = "";
                        }}
                      />
                      {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                          <Loader2 className="h-8 w-8 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {previewLogo
                          ? "✅ Logo chargé"
                          : "Aucun logo sélectionné"}
                      </p>
                      {previewLogo && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById("logo-upload").click()
                          }
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Changer le logo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Favicon */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Favicon</Label>
                  <p className="text-sm text-muted-foreground">
                    Icône du site (format carré, 32x32 ou 64x64 recommandé)
                  </p>
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                      {previewFavicon ? (
                        <div className="relative w-16 h-16">
                          <img
                            src={previewFavicon}
                            alt="Favicon"
                            className="w-16 h-16 rounded-lg object-cover border-2"
                            style={{
                              borderColor:
                                brandingSettings.primary_color || "#ec4899",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage("favicon")}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-muted/30 transition-colors"
                          style={{
                            borderColor:
                              brandingSettings.primary_color || "#ec4899",
                          }}
                          onClick={() =>
                            document.getElementById("favicon-upload").click()
                          }
                        >
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground text-center">
                            Cliquer pour uploader
                          </span>
                        </div>
                      )}
                      <input
                        id="favicon-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, "favicon");
                          e.target.value = "";
                        }}
                      />
                      {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {previewFavicon
                          ? "✅ Favicon chargé"
                          : "Aucun favicon sélectionné"}
                      </p>
                      {previewFavicon && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            document.getElementById("favicon-upload").click()
                          }
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Changer le favicon
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Image de couverture */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Image de couverture
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Format large recommandé (1200x400)
                  </p>
                  <div className="relative w-full">
                    {previewCover ? (
                      <div
                        className="relative w-full h-48 rounded-xl overflow-hidden border-2"
                        style={{
                          borderColor:
                            brandingSettings.primary_color || "#ec4899",
                        }}
                      >
                        <img
                          src={previewCover}
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage("cover")}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="w-full h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/30 transition-colors"
                        style={{
                          borderColor:
                            brandingSettings.primary_color || "#ec4899",
                        }}
                        onClick={() =>
                          document.getElementById("cover-upload").click()
                        }
                      >
                        <Upload className="h-12 w-12 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Cliquer pour uploader une image de couverture
                        </span>
                      </div>
                    )}
                    <input
                      id="cover-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, "cover");
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>

                <Separator />

                {/* Image Hero */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Image Hero (fond d'écran)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Format large recommandé (1920x1080)
                  </p>
                  <div className="relative w-full">
                    {previewHero ? (
                      <div
                        className="relative w-full h-64 rounded-xl overflow-hidden border-2"
                        style={{
                          borderColor:
                            brandingSettings.primary_color || "#ec4899",
                        }}
                      >
                        <img
                          src={previewHero}
                          alt="Hero"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage("hero")}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="w-full h-64 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/30 transition-colors"
                        style={{
                          borderColor:
                            brandingSettings.primary_color || "#ec4899",
                        }}
                        onClick={() =>
                          document.getElementById("hero-upload").click()
                        }
                      >
                        <Upload className="h-12 w-12 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Cliquer pour uploader l'image Hero
                        </span>
                      </div>
                    )}
                    <input
                      id="hero-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, "hero");
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>

                <Separator />

                {/* Couleurs */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    Couleurs de la plateforme
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Couleur principale</Label>
                      <div className="flex gap-3">
                        <input
                          type="color"
                          value={brandingSettings.primary_color || "#ec4899"}
                          onChange={(e) =>
                            setBrandingSettings({
                              ...brandingSettings,
                              primary_color: e.target.value,
                            })
                          }
                          className="w-16 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={brandingSettings.primary_color || "#ec4899"}
                          onChange={(e) =>
                            setBrandingSettings({
                              ...brandingSettings,
                              primary_color: e.target.value,
                            })
                          }
                          className="flex-1 font-mono"
                        />
                      </div>
                      <div
                        className="h-8 rounded-lg"
                        style={{
                          backgroundColor:
                            brandingSettings.primary_color || "#ec4899",
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Couleur secondaire</Label>
                      <div className="flex gap-3">
                        <input
                          type="color"
                          value={brandingSettings.secondary_color || "#06b6d4"}
                          onChange={(e) =>
                            setBrandingSettings({
                              ...brandingSettings,
                              secondary_color: e.target.value,
                            })
                          }
                          className="w-16 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={brandingSettings.secondary_color || "#06b6d4"}
                          onChange={(e) =>
                            setBrandingSettings({
                              ...brandingSettings,
                              secondary_color: e.target.value,
                            })
                          }
                          className="flex-1 font-mono"
                        />
                      </div>
                      <div
                        className="h-8 rounded-lg"
                        style={{
                          backgroundColor:
                            brandingSettings.secondary_color || "#06b6d4",
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Couleur d'accent</Label>
                      <div className="flex gap-3">
                        <input
                          type="color"
                          value={brandingSettings.accent_color || "#8b5cf6"}
                          onChange={(e) =>
                            setBrandingSettings({
                              ...brandingSettings,
                              accent_color: e.target.value,
                            })
                          }
                          className="w-16 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={brandingSettings.accent_color || "#8b5cf6"}
                          onChange={(e) =>
                            setBrandingSettings({
                              ...brandingSettings,
                              accent_color: e.target.value,
                            })
                          }
                          className="flex-1 font-mono"
                        />
                      </div>
                      <div
                        className="h-8 rounded-lg"
                        style={{
                          backgroundColor:
                            brandingSettings.accent_color || "#8b5cf6",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== ONGLET GÉNÉRAL ==================== */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Informations générales
                </CardTitle>
                <CardDescription>
                  Configuration de base de la plateforme
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Nom de la plateforme</Label>
                    <Input
                      value={generalSettings.platform_name || ""}
                      onChange={(e) =>
                        setGeneralSettings({
                          ...generalSettings,
                          platform_name: e.target.value,
                        })
                      }
                      placeholder="BeautyFlow"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Devise</Label>
                    <Input
                      value={generalSettings.currency || ""}
                      onChange={(e) =>
                        setGeneralSettings({
                          ...generalSettings,
                          currency: e.target.value,
                        })
                      }
                      placeholder="XOF"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email de contact</Label>
                    <Input
                      type="email"
                      value={generalSettings.contact_email || ""}
                      onChange={(e) =>
                        setGeneralSettings({
                          ...generalSettings,
                          contact_email: e.target.value,
                        })
                      }
                      placeholder="contact@beautyflow.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone de contact</Label>
                    <Input
                      value={generalSettings.contact_phone || ""}
                      onChange={(e) =>
                        setGeneralSettings({
                          ...generalSettings,
                          contact_phone: e.target.value,
                        })
                      }
                      placeholder="+226 54 32 92 99"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email support</Label>
                    <Input
                      type="email"
                      value={generalSettings.support_email || ""}
                      onChange={(e) =>
                        setGeneralSettings({
                          ...generalSettings,
                          support_email: e.target.value,
                        })
                      }
                      placeholder="support@beautyflow.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone support</Label>
                    <Input
                      value={generalSettings.support_phone || ""}
                      onChange={(e) =>
                        setGeneralSettings({
                          ...generalSettings,
                          support_phone: e.target.value,
                        })
                      }
                      placeholder="+226 54 32 92 99"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Adresse</Label>
                    <Input
                      value={generalSettings.address || ""}
                      onChange={(e) =>
                        setGeneralSettings({
                          ...generalSettings,
                          address: e.target.value,
                        })
                      }
                      placeholder="Ouagadougou, Burkina Faso"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fuseau horaire</Label>
                    <Select
                      value={generalSettings.timezone || "Africa/Ouagadougou"}
                      onValueChange={(v) =>
                        setGeneralSettings({ ...generalSettings, timezone: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Ouagadougou">
                          Africa/Ouagadougou
                        </SelectItem>
                        <SelectItem value="Africa/Dakar">
                          Africa/Dakar
                        </SelectItem>
                        <SelectItem value="Africa/Lagos">
                          Africa/Lagos
                        </SelectItem>
                        <SelectItem value="Europe/Paris">
                          Europe/Paris
                        </SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Langue par défaut</Label>
                    <Select
                      value={generalSettings.language || "fr"}
                      onValueChange={(v) =>
                        setGeneralSettings({ ...generalSettings, language: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={generalSettings.platform_description || ""}
                      onChange={(e) =>
                        setGeneralSettings({
                          ...generalSettings,
                          platform_description: e.target.value,
                        })
                      }
                      rows={3}
                      placeholder="Description de votre plateforme"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== ONGLET SÉCURITÉ ==================== */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Politiques de sécurité
                </CardTitle>
                <CardDescription>
                  Configurez les règles de sécurité de la plateforme
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">
                        Vérification email obligatoire
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Les utilisateurs doivent vérifier leur email
                      </p>
                    </div>
                    <Switch
                      checked={
                        securitySettings.require_email_verification ?? true
                      }
                      onCheckedChange={(c) =>
                        setSecuritySettings({
                          ...securitySettings,
                          require_email_verification: c,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">
                        Vérification téléphone obligatoire
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Les utilisateurs doivent vérifier leur numéro
                      </p>
                    </div>
                    <Switch
                      checked={
                        securitySettings.require_phone_verification ?? false
                      }
                      onCheckedChange={(c) =>
                        setSecuritySettings({
                          ...securitySettings,
                          require_phone_verification: c,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">
                        Authentification à deux facteurs
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        2FA pour les comptes admin
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.two_factor_auth ?? false}
                      onCheckedChange={(c) =>
                        setSecuritySettings({
                          ...securitySettings,
                          two_factor_auth: c,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">reCAPTCHA activé</Label>
                      <p className="text-sm text-muted-foreground">
                        Protection contre les bots
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.enable_recaptcha ?? true}
                      onCheckedChange={(c) =>
                        setSecuritySettings({
                          ...securitySettings,
                          enable_recaptcha: c,
                        })
                      }
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Tentatives de connexion max</Label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={securitySettings.max_login_attempts ?? 5}
                      onChange={(e) =>
                        setSecuritySettings({
                          ...securitySettings,
                          max_login_attempts: parseInt(e.target.value) || 5,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Durée session (minutes)</Label>
                    <Input
                      type="number"
                      min="5"
                      max="1440"
                      value={securitySettings.session_timeout_minutes ?? 60}
                      onChange={(e) =>
                        setSecuritySettings({
                          ...securitySettings,
                          session_timeout_minutes:
                            parseInt(e.target.value) || 60,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Longueur minimale mot de passe</Label>
                    <Input
                      type="number"
                      min="6"
                      max="20"
                      value={securitySettings.password_min_length ?? 8}
                      onChange={(e) =>
                        setSecuritySettings({
                          ...securitySettings,
                          password_min_length: parseInt(e.target.value) || 8,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    Exigences du mot de passe
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <Label>Chiffres requis</Label>
                      <Switch
                        checked={
                          securitySettings.password_require_numbers ?? true
                        }
                        onCheckedChange={(c) =>
                          setSecuritySettings({
                            ...securitySettings,
                            password_require_numbers: c,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <Label>Majuscules requises</Label>
                      <Switch
                        checked={
                          securitySettings.password_require_uppercase ?? true
                        }
                        onCheckedChange={(c) =>
                          setSecuritySettings({
                            ...securitySettings,
                            password_require_uppercase: c,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <Label>Caractères spéciaux requis</Label>
                      <Switch
                        checked={
                          securitySettings.password_require_special ?? false
                        }
                        onCheckedChange={(c) =>
                          setSecuritySettings({
                            ...securitySettings,
                            password_require_special: c,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== ONGLET NOTIFICATIONS ==================== */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Configurez les alertes et notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    Alertes administrateur
                  </Label>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Nouveau salon inscrit</Label>
                      <p className="text-sm text-muted-foreground">
                        Notification lors de l'inscription d'un salon
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.admin_new_tenant ?? true}
                      onCheckedChange={(c) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          admin_new_tenant: c,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Nouvel utilisateur</Label>
                      <p className="text-sm text-muted-foreground">
                        Notification lors d'une nouvelle inscription
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.admin_new_user ?? true}
                      onCheckedChange={(c) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          admin_new_user: c,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Paiement reçu</Label>
                      <p className="text-sm text-muted-foreground">
                        Notification lors d'un paiement d'abonnement
                      </p>
                    </div>
                    <Switch
                      checked={
                        notificationSettings.admin_payment_received ?? true
                      }
                      onCheckedChange={(c) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          admin_payment_received: c,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Abonnement expiré</Label>
                      <p className="text-sm text-muted-foreground">
                        Notification lors de l'expiration d'un abonnement
                      </p>
                    </div>
                    <Switch
                      checked={
                        notificationSettings.admin_subscription_expired ?? true
                      }
                      onCheckedChange={(c) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          admin_subscription_expired: c,
                        })
                      }
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    Canaux de notification
                  </Label>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Notifications email</Label>
                      <p className="text-sm text-muted-foreground">
                        Envoyer les notifications par email
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.email_notifications ?? true}
                      onCheckedChange={(c) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          email_notifications: c,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Notifications SMS</Label>
                      <p className="text-sm text-muted-foreground">
                        Envoyer les notifications par SMS
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.sms_notifications ?? false}
                      onCheckedChange={(c) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          sms_notifications: c,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Notifications push</Label>
                      <p className="text-sm text-muted-foreground">
                        Envoyer les notifications push
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.push_notifications ?? true}
                      onCheckedChange={(c) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          push_notifications: c,
                        })
                      }
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    Configuration SMTP
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Hôte SMTP</Label>
                      <Input
                        value={notificationSettings.email_smtp_host || ""}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            email_smtp_host: e.target.value,
                          })
                        }
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Port SMTP</Label>
                      <Input
                        type="number"
                        value={notificationSettings.email_smtp_port ?? 587}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            email_smtp_port: parseInt(e.target.value) || 587,
                          })
                        }
                        placeholder="587"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Utilisateur SMTP</Label>
                      <Input
                        value={notificationSettings.email_smtp_user || ""}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            email_smtp_user: e.target.value,
                          })
                        }
                        placeholder="utilisateur@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mot de passe SMTP</Label>
                      <Input
                        type="password"
                        value={notificationSettings.email_smtp_password || ""}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            email_smtp_password: e.target.value,
                          })
                        }
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email d'expédition</Label>
                      <Input
                        type="email"
                        value={notificationSettings.email_from_address || ""}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            email_from_address: e.target.value,
                          })
                        }
                        placeholder="noreply@beautyflow.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom d'expédition</Label>
                      <Input
                        value={notificationSettings.email_from_name || ""}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            email_from_name: e.target.value,
                          })
                        }
                        placeholder="BeautyFlow"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== ONGLET PAIEMENTS ==================== */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Paramètres de paiement
                </CardTitle>
                <CardDescription>
                  Configurez les commissions et moyens de paiement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    Commissions plateforme
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Commission (%)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={paymentSettings.platform_fee_percentage ?? 0}
                        onChange={(e) =>
                          setPaymentSettings({
                            ...paymentSettings,
                            platform_fee_percentage:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Commission fixe (FCFA)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={paymentSettings.platform_fee_fixed ?? 0}
                        onChange={(e) =>
                          setPaymentSettings({
                            ...paymentSettings,
                            platform_fee_fixed: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    Moyens de paiement
                  </Label>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Orange Money</Label>
                      <p className="text-sm text-muted-foreground">
                        Paiement mobile Orange Money
                      </p>
                    </div>
                    <Switch
                      checked={paymentSettings.orange_money_enabled ?? true}
                      onCheckedChange={(c) =>
                        setPaymentSettings({
                          ...paymentSettings,
                          orange_money_enabled: c,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Moov Money</Label>
                      <p className="text-sm text-muted-foreground">
                        Paiement mobile Moov Money
                      </p>
                    </div>
                    <Switch
                      checked={paymentSettings.moov_money_enabled ?? true}
                      onCheckedChange={(c) =>
                        setPaymentSettings({
                          ...paymentSettings,
                          moov_money_enabled: c,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Wave</Label>
                      <p className="text-sm text-muted-foreground">
                        Paiement par Wave
                      </p>
                    </div>
                    <Switch
                      checked={paymentSettings.wave_enabled ?? true}
                      onCheckedChange={(c) =>
                        setPaymentSettings({
                          ...paymentSettings,
                          wave_enabled: c,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Stripe</Label>
                      <p className="text-sm text-muted-foreground">
                        Paiement par carte bancaire
                      </p>
                    </div>
                    <Switch
                      checked={paymentSettings.stripe_enabled ?? false}
                      onCheckedChange={(c) =>
                        setPaymentSettings({
                          ...paymentSettings,
                          stripe_enabled: c,
                        })
                      }
                    />
                  </div>
                </div>

                {paymentSettings.stripe_enabled && (
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Configuration Stripe
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Clé publique Stripe</Label>
                        <Input
                          value={paymentSettings.stripe_public_key || ""}
                          onChange={(e) =>
                            setPaymentSettings({
                              ...paymentSettings,
                              stripe_public_key: e.target.value,
                            })
                          }
                          placeholder="pk_test_..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Clé secrète Stripe</Label>
                        <Input
                          type="password"
                          value={paymentSettings.stripe_secret_key || ""}
                          onChange={(e) =>
                            setPaymentSettings({
                              ...paymentSettings,
                              stripe_secret_key: e.target.value,
                            })
                          }
                          placeholder="sk_test_..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== ONGLET ABONNEMENTS ==================== */}
          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Plans d'abonnement
                </CardTitle>
                <CardDescription>
                  Configurez les plans et tarifs des abonnements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 p-4 border rounded-lg">
                    <Label className="font-semibold">Plan Starter</Label>
                    <Input
                      type="number"
                      value={subscriptionSettings.starter_price ?? 0}
                      onChange={(e) =>
                        setSubscriptionSettings({
                          ...subscriptionSettings,
                          starter_price: parseInt(e.target.value) || 0,
                        })
                      }
                      className="text-lg font-bold"
                    />
                    <p className="text-sm text-muted-foreground">FCFA/mois</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        👥 {subscriptionSettings.max_clients_starter} clients
                        max
                      </p>
                      <p className="text-xs text-muted-foreground">
                        👤 {subscriptionSettings.max_employees_starter} employés
                        max
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 p-4 border-2 border-primary rounded-lg">
                    <Label className="font-semibold text-primary">
                      Plan Pro
                    </Label>
                    <Input
                      type="number"
                      value={subscriptionSettings.pro_price ?? 0}
                      onChange={(e) =>
                        setSubscriptionSettings({
                          ...subscriptionSettings,
                          pro_price: parseInt(e.target.value) || 0,
                        })
                      }
                      className="text-lg font-bold text-primary"
                    />
                    <p className="text-sm text-muted-foreground">FCFA/mois</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        👥 Clients illimités
                      </p>
                      <p className="text-xs text-muted-foreground">
                        👤 {subscriptionSettings.max_employees_pro} employés max
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 p-4 border-2 border-amber-400 rounded-lg bg-amber-50/30">
                    <Label className="font-semibold text-amber-600">
                      Plan Premium
                    </Label>
                    <Input
                      type="number"
                      value={subscriptionSettings.premium_price ?? 0}
                      onChange={(e) =>
                        setSubscriptionSettings({
                          ...subscriptionSettings,
                          premium_price: parseInt(e.target.value) || 0,
                        })
                      }
                      className="text-lg font-bold text-amber-600"
                    />
                    <p className="text-sm text-muted-foreground">FCFA/mois</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        👥 Clients illimités
                      </p>
                      <p className="text-xs text-muted-foreground">
                        👤 Employés illimités
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Jours d'essai</Label>
                    <Input
                      type="number"
                      min="0"
                      max="90"
                      value={subscriptionSettings.trial_days ?? 14}
                      onChange={(e) =>
                        setSubscriptionSettings({
                          ...subscriptionSettings,
                          trial_days: parseInt(e.target.value) || 14,
                        })
                      }
                      className="w-32"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Réduction annuelle (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="90"
                      value={
                        subscriptionSettings.annual_discount_percentage ?? 20
                      }
                      onChange={(e) =>
                        setSubscriptionSettings({
                          ...subscriptionSettings,
                          annual_discount_percentage:
                            parseInt(e.target.value) || 20,
                        })
                      }
                      className="w-32"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base">Facturation annuelle</Label>
                    <p className="text-sm text-muted-foreground">
                      Permettre la facturation annuelle avec réduction
                    </p>
                  </div>
                  <Switch
                    checked={subscriptionSettings.enable_annual_billing ?? true}
                    onCheckedChange={(c) =>
                      setSubscriptionSettings({
                        ...subscriptionSettings,
                        enable_annual_billing: c,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== ONGLET APPLICATION ==================== */}
          <TabsContent value="app">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  Paramètres de l'application
                </CardTitle>
                <CardDescription>
                  Configuration générale de l'application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Mode maintenance</Label>
                      <p className="text-sm text-muted-foreground">
                        Mettre la plateforme en maintenance
                      </p>
                    </div>
                    <Switch
                      checked={appSettings.maintenance_mode ?? false}
                      onCheckedChange={(c) =>
                        setAppSettings({ ...appSettings, maintenance_mode: c })
                      }
                    />
                  </div>
                  {appSettings.maintenance_mode && (
                    <div className="space-y-2">
                      <Label>Message de maintenance</Label>
                      <Textarea
                        value={appSettings.maintenance_message || ""}
                        onChange={(e) =>
                          setAppSettings({
                            ...appSettings,
                            maintenance_message: e.target.value,
                          })
                        }
                        rows={2}
                        placeholder="La plateforme est en maintenance. Nous revenons bientôt !"
                      />
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">
                        Inscriptions autorisées
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Permettre les nouvelles inscriptions
                      </p>
                    </div>
                    <Switch
                      checked={appSettings.allow_registration ?? true}
                      onCheckedChange={(c) =>
                        setAppSettings({
                          ...appSettings,
                          allow_registration: c,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">
                        Inscriptions des salons
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Permettre l'inscription de nouveaux salons
                      </p>
                    </div>
                    <Switch
                      checked={appSettings.allow_tenant_registration ?? true}
                      onCheckedChange={(c) =>
                        setAppSettings({
                          ...appSettings,
                          allow_tenant_registration: c,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">
                        Approbation des salons
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Exiger une approbation pour les nouveaux salons
                      </p>
                    </div>
                    <Switch
                      checked={appSettings.require_tenant_approval ?? true}
                      onCheckedChange={(c) =>
                        setAppSettings({
                          ...appSettings,
                          require_tenant_approval: c,
                        })
                      }
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre max de salons (-1 = illimité)</Label>
                    <Input
                      type="number"
                      value={appSettings.max_tenants ?? -1}
                      onChange={(e) =>
                        setAppSettings({
                          ...appSettings,
                          max_tenants: parseInt(e.target.value) || -1,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Nombre max d'utilisateurs par salon (-1 = illimité)
                    </Label>
                    <Input
                      type="number"
                      value={appSettings.max_users_per_tenant ?? -1}
                      onChange={(e) =>
                        setAppSettings({
                          ...appSettings,
                          max_users_per_tenant: parseInt(e.target.value) || -1,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conservation des logs (jours)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={appSettings.log_retention_days ?? 30}
                      onChange={(e) =>
                        setAppSettings({
                          ...appSettings,
                          log_retention_days: parseInt(e.target.value) || 30,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Durée du cache (secondes)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={appSettings.cache_duration ?? 3600}
                      onChange={(e) =>
                        setAppSettings({
                          ...appSettings,
                          cache_duration: parseInt(e.target.value) || 3600,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Analytique activée</Label>
                      <p className="text-sm text-muted-foreground">
                        Collecter les données d'analyse
                      </p>
                    </div>
                    <Switch
                      checked={appSettings.enable_analytics ?? true}
                      onCheckedChange={(c) =>
                        setAppSettings({ ...appSettings, enable_analytics: c })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">
                        Journalisation activée
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Enregistrer les logs système
                      </p>
                    </div>
                    <Switch
                      checked={appSettings.enable_logging ?? true}
                      onCheckedChange={(c) =>
                        setAppSettings({ ...appSettings, enable_logging: c })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Cache activé</Label>
                      <p className="text-sm text-muted-foreground">
                        Activer le cache des données
                      </p>
                    </div>
                    <Switch
                      checked={appSettings.cache_enabled ?? true}
                      onCheckedChange={(c) =>
                        setAppSettings({ ...appSettings, cache_enabled: c })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== ONGLET SEO ==================== */}
          <TabsContent value="seo">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  Optimisation SEO
                </CardTitle>
                <CardDescription>
                  Configurez les métadonnées pour le référencement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Meta tags</Label>
                  <div className="space-y-2">
                    <Label>Titre (50-60 caractères)</Label>
                    <Input
                      value={seoSettings.meta_title || ""}
                      onChange={(e) =>
                        setSeoSettings({
                          ...seoSettings,
                          meta_title: e.target.value,
                        })
                      }
                      placeholder="BeautyFlow - Plateforme de gestion de salons de beauté"
                    />
                    <p className="text-xs text-muted-foreground">
                      {seoSettings.meta_title?.length || 0}/60 caractères
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Description (150-160 caractères)</Label>
                    <Textarea
                      value={seoSettings.meta_description || ""}
                      onChange={(e) =>
                        setSeoSettings({
                          ...seoSettings,
                          meta_description: e.target.value,
                        })
                      }
                      rows={2}
                      placeholder="La plateforme complète pour gérer votre salon de beauté..."
                    />
                    <p className="text-xs text-muted-foreground">
                      {seoSettings.meta_description?.length || 0}/160 caractères
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Mots-clés (séparés par des virgules)</Label>
                    <Input
                      value={seoSettings.meta_keywords || ""}
                      onChange={(e) =>
                        setSeoSettings({
                          ...seoSettings,
                          meta_keywords: e.target.value,
                        })
                      }
                      placeholder="beauté, salon, gestion, rendez-vous"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    Open Graph (Facebook, LinkedIn)
                  </Label>
                  <div className="space-y-2">
                    <Label>Titre OG</Label>
                    <Input
                      value={seoSettings.og_title || ""}
                      onChange={(e) =>
                        setSeoSettings({
                          ...seoSettings,
                          og_title: e.target.value,
                        })
                      }
                      placeholder="BeautyFlow"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description OG</Label>
                    <Textarea
                      value={seoSettings.og_description || ""}
                      onChange={(e) =>
                        setSeoSettings({
                          ...seoSettings,
                          og_description: e.target.value,
                        })
                      }
                      rows={2}
                      placeholder="Plateforme de gestion de salons de beauté"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Image OG (URL)</Label>
                    <Input
                      value={seoSettings.og_image || ""}
                      onChange={(e) =>
                        setSeoSettings({
                          ...seoSettings,
                          og_image: e.target.value,
                        })
                      }
                      placeholder="https://beautyflow.com/og-image.jpg"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    Twitter Cards
                  </Label>
                  <div className="space-y-2">
                    <Label>Type de carte</Label>
                    <Select
                      value={seoSettings.twitter_card || "summary_large_image"}
                      onValueChange={(v) =>
                        setSeoSettings({ ...seoSettings, twitter_card: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="summary">Résumé</SelectItem>
                        <SelectItem value="summary_large_image">
                          Résumé avec grande image
                        </SelectItem>
                        <SelectItem value="app">Application</SelectItem>
                        <SelectItem value="player">Lecteur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Titre Twitter</Label>
                    <Input
                      value={seoSettings.twitter_title || ""}
                      onChange={(e) =>
                        setSeoSettings({
                          ...seoSettings,
                          twitter_title: e.target.value,
                        })
                      }
                      placeholder="BeautyFlow"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description Twitter</Label>
                    <Textarea
                      value={seoSettings.twitter_description || ""}
                      onChange={(e) =>
                        setSeoSettings({
                          ...seoSettings,
                          twitter_description: e.target.value,
                        })
                      }
                      rows={2}
                      placeholder="Plateforme de gestion de salons de beauté"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Image Twitter (URL)</Label>
                    <Input
                      value={seoSettings.twitter_image || ""}
                      onChange={(e) =>
                        setSeoSettings({
                          ...seoSettings,
                          twitter_image: e.target.value,
                        })
                      }
                      placeholder="https://beautyflow.com/twitter-image.jpg"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>robots.txt</Label>
                    <Textarea
                      value={seoSettings.robots_txt || ""}
                      onChange={(e) =>
                        setSeoSettings({
                          ...seoSettings,
                          robots_txt: e.target.value,
                        })
                      }
                      rows={4}
                      className="font-mono text-sm"
                      placeholder="User-agent: *\nAllow: /"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">
                        Sitemap généré automatiquement
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Générer un sitemap.xml automatiquement
                      </p>
                    </div>
                    <Switch
                      checked={seoSettings.sitemap_enabled ?? true}
                      onCheckedChange={(c) =>
                        setSeoSettings({ ...seoSettings, sitemap_enabled: c })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== ONGLET RÉSEAUX SOCIAUX ==================== */}
          <TabsContent value="social">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary" />
                  Réseaux sociaux
                </CardTitle>
                <CardDescription>
                  Configurez les liens vers vos réseaux sociaux
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Facebook className="h-4 w-4 text-blue-600" />
                      Facebook
                    </Label>
                    <Input
                      value={socialSettings.facebook || ""}
                      onChange={(e) =>
                        setSocialSettings({
                          ...socialSettings,
                          facebook: e.target.value,
                        })
                      }
                      placeholder="https://facebook.com/beautyflow"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-pink-600" />
                      Instagram
                    </Label>
                    <Input
                      value={socialSettings.instagram || ""}
                      onChange={(e) =>
                        setSocialSettings({
                          ...socialSettings,
                          instagram: e.target.value,
                        })
                      }
                      placeholder="https://instagram.com/beautyflow"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Twitter className="h-4 w-4 text-sky-500" />
                      Twitter/X
                    </Label>
                    <Input
                      value={socialSettings.twitter || ""}
                      onChange={(e) =>
                        setSocialSettings({
                          ...socialSettings,
                          twitter: e.target.value,
                        })
                      }
                      placeholder="https://twitter.com/beautyflow"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4 text-blue-700" />
                      LinkedIn
                    </Label>
                    <Input
                      value={socialSettings.linkedin || ""}
                      onChange={(e) =>
                        setSocialSettings({
                          ...socialSettings,
                          linkedin: e.target.value,
                        })
                      }
                      placeholder="https://linkedin.com/company/beautyflow"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Youtube className="h-4 w-4 text-red-600" />
                      YouTube
                    </Label>
                    <Input
                      value={socialSettings.youtube || ""}
                      onChange={(e) =>
                        setSocialSettings({
                          ...socialSettings,
                          youtube: e.target.value,
                        })
                      }
                      placeholder="https://youtube.com/beautyflow"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-black" />
                      TikTok
                    </Label>
                    <Input
                      value={socialSettings.tiktok || ""}
                      onChange={(e) =>
                        setSocialSettings({
                          ...socialSettings,
                          tiktok: e.target.value,
                        })
                      }
                      placeholder="https://tiktok.com/@beautyflow"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Link className="h-4 w-4 text-red-600" />
                      Pinterest
                    </Label>
                    <Input
                      value={socialSettings.pinterest || ""}
                      onChange={(e) =>
                        setSocialSettings({
                          ...socialSettings,
                          pinterest: e.target.value,
                        })
                      }
                      placeholder="https://pinterest.com/beautyflow"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-green-600" />
                      WhatsApp
                    </Label>
                    <Input
                      value={socialSettings.whatsapp || ""}
                      onChange={(e) =>
                        setSocialSettings({
                          ...socialSettings,
                          whatsapp: e.target.value,
                        })
                      }
                      placeholder="+226 54 32 92 99"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-blue-500" />
                      Telegram
                    </Label>
                    <Input
                      value={socialSettings.telegram || ""}
                      onChange={(e) =>
                        setSocialSettings({
                          ...socialSettings,
                          telegram: e.target.value,
                        })
                      }
                      placeholder="https://t.me/beautyflow"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-indigo-500" />
                      Discord
                    </Label>
                    <Input
                      value={socialSettings.discord || ""}
                      onChange={(e) =>
                        setSocialSettings({
                          ...socialSettings,
                          discord: e.target.value,
                        })
                      }
                      placeholder="https://discord.gg/beautyflow"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
