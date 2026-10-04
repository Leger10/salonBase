// /src/pages/AdminSettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Separator } from '@/components/ui/separator.jsx';
import { toast } from 'sonner';
import { 
  Loader2, Save, Building2, Palette, Layout, CalendarIcon, 
  Globe, Bell, Image, Upload, X, Eye, EyeOff,
  Paintbrush, Home, Sparkles, CheckCircle, 
  Settings, Award, Users, ShoppingBag, Megaphone,
  FileText, Search, Mail, Phone, MapPin, Clock,
  Facebook, Instagram, Twitter, Linkedin, Youtube,
  Store, Crown, Shield, Heart, Star, Scissors
} from 'lucide-react';
// Import TikTok icon (ou utilisez un SVG personnalisé)
import { SiTiktok } from 'react-icons/si';

export default function AdminSettingsPage() {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tenantId, setTenantId] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState('hero');
  
  // États pour les aperçus d'images
  const [previewHeroImage, setPreviewHeroImage] = useState(null);
  const [previewCtaImage, setPreviewCtaImage] = useState(null);
  const [previewLogo, setPreviewLogo] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const id = currentUser?.profile?.tenant_id;
        if (!id) {
          setLoading(false);
          return;
        }
        setTenantId(id);

        // Récupérer les infos du tenant
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', id)
          .single();

        if (tenantError) throw tenantError;
        setTenant(tenantData);
        setPreviewLogo(tenantData.logo_url || '');

        // Récupérer les paramètres du home
        let { data, error } = await supabase
          .from('tenant_home_settings')
          .select('*')
          .eq('tenant_id', id)
          .single();

        // Si pas de paramètres, créer les defaults
        if (error && error.code === 'PGRST116') {
          const defaultSettings = {
            tenant_id: id,
            // Hero Section
            hero_title: `Prenez soin de vous avec ${tenantData.name || 'BeautyFlow'}`,
            hero_subtitle: 'La plateforme complète pour réserver vos soins beauté, gérer vos rendez-vous et découvrir de nouveaux talents près de chez vous.',
            hero_cta_text: 'Commencer gratuitement',
            hero_cta_link: '/auth/signup',
            hero_secondary_cta_text: 'Se connecter',
            hero_secondary_cta_link: '/auth/login',
            hero_badge_text: '✨ Nouveau : Programme de fidélité amélioré',
            hero_show_stats: true,
            hero_background_type: 'gradient',
            hero_background_image: tenantData.cover_image || '',
            hero_background_color: tenantData.primary_color || '#ec4899',
            hero_overlay_opacity: 70,
            // Stats Section
            stats_title: 'Nos chiffres',
            stats_show: true,
            stat_1_number: '500+',
            stat_1_label: 'Salons partenaires',
            stat_2_number: '10k+',
            stat_2_label: 'Clients satisfaits',
            stat_3_number: '50k+',
            stat_3_label: 'Rendez-vous réservés',
            // Partners Section
            partners_title: 'Nos salons partenaires',
            partners_subtitle: 'Cliquez sur un salon pour découvrir sa vitrine',
            partners_show: true,
            partners_show_button: true,
            partners_button_text: 'Voir tous les salons',
            // Features Section
            features_title: 'Pourquoi choisir BeautyFlow ?',
            features_subtitle: 'Une expérience unique pour prendre soin de vous',
            features_show: true,
            feature_1_title: 'Réservation Facile',
            feature_1_description: 'Trouvez un créneau disponible 24/7 en quelques clics',
            feature_2_title: 'Programme Fidélité',
            feature_2_description: 'Cumulez des points à chaque visite et profitez de réductions',
            feature_3_title: 'Les Meilleurs Pros',
            feature_3_description: 'Consultez les avis certifiés pour choisir le professionnel',
            // Products Section
            products_title: 'Nos produits populaires',
            products_subtitle: 'Découvrez les produits préférés de nos clients',
            products_show: true,
            products_limit: 8,
            // CTA Section
            cta_title: 'Prêt à sublimer votre beauté ?',
            cta_subtitle: 'Rejoignez des milliers de clients satisfaits',
            cta_button_text: 'Créer un compte gratuit',
            cta_button_link: '/auth/signup',
            cta_show: true,
            cta_background_type: 'gradient',
            cta_background_image: '',
            cta_background_color: tenantData.primary_color || '#ec4899',
            // Footer Section
            footer_show_social: true,
            footer_copyright: tenantData.name || 'BeautyFlow',
            footer_address: tenantData.address || '',
            footer_phone: tenantData.phone || '',
            footer_email: tenantData.email || '',
            footer_description: tenantData.description || '',
            footer_social_facebook: '',
            footer_social_instagram: '',
            footer_social_twitter: '',
            footer_social_linkedin: '',
            footer_social_youtube: '',
            footer_social_tiktok: '', // Ajout de TikTok
            footer_hours_monday: '09:00 - 19:00',
            footer_hours_tuesday: '09:00 - 19:00',
            footer_hours_wednesday: '09:00 - 19:00',
            footer_hours_thursday: '09:00 - 19:00',
            footer_hours_friday: '09:00 - 19:00',
            footer_hours_saturday: '09:00 - 17:00',
            footer_hours_sunday: 'Fermé',
            // SEO
            seo_title: '',
            seo_description: '',
            seo_keywords: '',
          };

          const { data: newSettings, error: insertError } = await supabase
            .from('tenant_home_settings')
            .insert(defaultSettings)
            .select()
            .single();

          if (insertError) throw insertError;
          data = newSettings;
          
          setPreviewHeroImage(defaultSettings.hero_background_image || '');
          setPreviewCtaImage(defaultSettings.cta_background_image || '');
        } else if (error) {
          throw error;
        }

        setSettings(data);
        setPreviewHeroImage(data?.hero_background_image || '');
        setPreviewCtaImage(data?.cta_background_image || '');
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        toast.error('Erreur lors du chargement des paramètres');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?.profile?.tenant_id) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleTenantChange = (field, value) => {
    setTenant(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (file, type) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5MB');
      return;
    }

    setUploading(true);
    
    // Aperçu local
    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === 'hero') {
        setPreviewHeroImage(e.target.result);
      } else if (type === 'cta') {
        setPreviewCtaImage(e.target.result);
      } else if (type === 'logo') {
        setPreviewLogo(e.target.result);
      }
    };
    reader.readAsDataURL(file);

    try {
      if (!tenantId) {
        toast.error('Salon non trouvé');
        setUploading(false);
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}/${type}_${Date.now()}.${fileExt}`;
      const filePath = `tenants/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tenant-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('tenant-assets')
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;

      if (type === 'hero') {
        setPreviewHeroImage(publicUrl);
        handleChange('hero_background_image', publicUrl);
        toast.success('Image Hero téléchargée avec succès');
      } else if (type === 'cta') {
        setPreviewCtaImage(publicUrl);
        handleChange('cta_background_image', publicUrl);
        toast.success('Image CTA téléchargée avec succès');
      } else if (type === 'logo') {
        setPreviewLogo(publicUrl);
        handleTenantChange('logo_url', publicUrl);
        toast.success('Logo téléchargé avec succès');
      }

    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erreur lors du téléchargement');
      if (type === 'hero') {
        setPreviewHeroImage(settings?.hero_background_image || '');
      } else if (type === 'cta') {
        setPreviewCtaImage(settings?.cta_background_image || '');
      } else if (type === 'logo') {
        setPreviewLogo(tenant?.logo_url || '');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (type) => {
    if (type === 'hero') {
      setPreviewHeroImage(null);
      handleChange('hero_background_image', '');
      toast.info('Image Hero supprimée');
    } else if (type === 'cta') {
      setPreviewCtaImage(null);
      handleChange('cta_background_image', '');
      toast.info('Image CTA supprimée');
    } else if (type === 'logo') {
      setPreviewLogo(null);
      handleTenantChange('logo_url', '');
      toast.info('Logo supprimé');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tenantId) {
      toast.error('Salon non trouvé');
      return;
    }

    setSaving(true);
    try {
      // Mettre à jour tenant_home_settings
      const { error: settingsError } = await supabase
        .from('tenant_home_settings')
        .update({
          hero_title: settings.hero_title,
          hero_subtitle: settings.hero_subtitle,
          hero_cta_text: settings.hero_cta_text,
          hero_cta_link: settings.hero_cta_link,
          hero_secondary_cta_text: settings.hero_secondary_cta_text,
          hero_secondary_cta_link: settings.hero_secondary_cta_link,
          hero_badge_text: settings.hero_badge_text,
          hero_show_stats: settings.hero_show_stats,
          hero_background_type: settings.hero_background_type,
          hero_background_image: settings.hero_background_image || null,
          hero_background_color: settings.hero_background_color,
          hero_overlay_opacity: settings.hero_overlay_opacity,
          stats_title: settings.stats_title,
          stats_show: settings.stats_show,
          stat_1_number: settings.stat_1_number,
          stat_1_label: settings.stat_1_label,
          stat_2_number: settings.stat_2_number,
          stat_2_label: settings.stat_2_label,
          stat_3_number: settings.stat_3_number,
          stat_3_label: settings.stat_3_label,
          partners_title: settings.partners_title,
          partners_subtitle: settings.partners_subtitle,
          partners_show: settings.partners_show,
          partners_show_button: settings.partners_show_button,
          partners_button_text: settings.partners_button_text,
          features_title: settings.features_title,
          features_subtitle: settings.features_subtitle,
          features_show: settings.features_show,
          feature_1_title: settings.feature_1_title,
          feature_1_description: settings.feature_1_description,
          feature_2_title: settings.feature_2_title,
          feature_2_description: settings.feature_2_description,
          feature_3_title: settings.feature_3_title,
          feature_3_description: settings.feature_3_description,
          products_title: settings.products_title,
          products_subtitle: settings.products_subtitle,
          products_show: settings.products_show,
          products_limit: settings.products_limit,
          cta_title: settings.cta_title,
          cta_subtitle: settings.cta_subtitle,
          cta_button_text: settings.cta_button_text,
          cta_button_link: settings.cta_button_link,
          cta_show: settings.cta_show,
          cta_background_type: settings.cta_background_type,
          cta_background_image: settings.cta_background_image || null,
          cta_background_color: settings.cta_background_color,
          footer_show_social: settings.footer_show_social,
          footer_copyright: settings.footer_copyright,
          footer_address: settings.footer_address,
          footer_phone: settings.footer_phone,
          footer_email: settings.footer_email,
          footer_description: settings.footer_description,
          footer_social_facebook: settings.footer_social_facebook,
          footer_social_instagram: settings.footer_social_instagram,
          footer_social_twitter: settings.footer_social_twitter,
          footer_social_linkedin: settings.footer_social_linkedin,
          footer_social_youtube: settings.footer_social_youtube,
          footer_social_tiktok: settings.footer_social_tiktok, // Ajout de TikTok
          footer_hours_monday: settings.footer_hours_monday,
          footer_hours_tuesday: settings.footer_hours_tuesday,
          footer_hours_wednesday: settings.footer_hours_wednesday,
          footer_hours_thursday: settings.footer_hours_thursday,
          footer_hours_friday: settings.footer_hours_friday,
          footer_hours_saturday: settings.footer_hours_saturday,
          footer_hours_sunday: settings.footer_hours_sunday,
          seo_title: settings.seo_title,
          seo_description: settings.seo_description,
          seo_keywords: settings.seo_keywords,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId);

      if (settingsError) throw settingsError;

      // Mettre à jour la table tenants (logo, etc.)
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({
          logo_url: tenant.logo_url || null,
          name: tenant.name,
          description: tenant.description,
          address: tenant.address,
          phone: tenant.phone,
          email: tenant.email,
          primary_color: tenant.primary_color,
          secondary_color: tenant.secondary_color,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId);

      if (tenantError) throw tenantError;

      toast.success('Paramètres sauvegardés avec succès');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings || !tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Impossible de charger les paramètres</p>
      </div>
    );
  }

  // Fonction d'aperçu du Hero
  const renderHeroPreview = () => {
    const bgType = settings.hero_background_type || 'gradient';
    const bgImage = settings.hero_background_image || tenant.cover_image;
    const bgColor = settings.hero_background_color || tenant.primary_color || '#ec4899';
    const overlayOpacity = settings.hero_overlay_opacity || 70;

    let backgroundStyle = {};
    if (bgType === 'image' && bgImage) {
      backgroundStyle = {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    } else if (bgType === 'color') {
      backgroundStyle = { backgroundColor: bgColor };
    } else {
      backgroundStyle = {
        background: `linear-gradient(135deg, ${bgColor}dd, ${bgColor}99)`
      };
    }

    return (
      <div className="relative overflow-hidden rounded-xl min-h-[300px]">
        <div className="absolute inset-0" style={backgroundStyle} />
        {bgType === 'image' && (
          <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity/100})` }} />
        )}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05]" />
        <div className="relative z-10 p-8 text-center text-white">
          <div className="inline-block rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-1.5 text-sm font-medium mb-4">
            {settings.hero_badge_text || '✨ Badge'}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold">
            {settings.hero_title || 'Titre du Hero'}
          </h2>
          <p className="mt-2 text-white/90 max-w-2xl mx-auto">
            {settings.hero_subtitle || 'Sous-titre du Hero'}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button 
              className="px-6 py-2 rounded-lg text-white font-medium shadow-lg"
              style={{ backgroundColor: bgColor }}
            >
              {settings.hero_cta_text || 'CTA Principal'}
            </button>
            <button className="px-6 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white">
              {settings.hero_secondary_cta_text || 'CTA Secondaire'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Fonction d'aperçu du CTA
  const renderCtaPreview = () => {
    const bgType = settings.cta_background_type || 'gradient';
    const bgImage = settings.cta_background_image || tenant.cover_image;
    const bgColor = settings.cta_background_color || tenant.primary_color || '#ec4899';

    let backgroundStyle = {};
    if (bgType === 'image' && bgImage) {
      backgroundStyle = {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    } else if (bgType === 'color') {
      backgroundStyle = { backgroundColor: bgColor };
    } else {
      backgroundStyle = {
        background: `linear-gradient(135deg, ${bgColor}dd, ${bgColor}99)`
      };
    }

    return (
      <div className="relative overflow-hidden rounded-xl min-h-[200px]">
        <div className="absolute inset-0" style={backgroundStyle} />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05]" />
        <div className="relative z-10 p-8 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold">
            {settings.cta_title || 'Titre du CTA'}
          </h2>
          <p className="mt-2 text-white/90 max-w-2xl mx-auto">
            {settings.cta_subtitle || 'Sous-titre du CTA'}
          </p>
          <button 
            className="mt-4 px-6 py-2 rounded-lg text-white font-medium shadow-lg"
            style={{ backgroundColor: '#ffffff', color: bgColor }}
          >
            {settings.cta_button_text || 'CTA Button'}
          </button>
        </div>
      </div>
    );
  };

  // Fonction d'aperçu du Footer
  const renderFooterPreview = () => {
    const socialIcons = [
      { key: 'facebook', icon: Facebook, url: settings.footer_social_facebook },
      { key: 'instagram', icon: Instagram, url: settings.footer_social_instagram },
      { key: 'twitter', icon: Twitter, url: settings.footer_social_twitter },
      { key: 'linkedin', icon: Linkedin, url: settings.footer_social_linkedin },
      { key: 'youtube', icon: Youtube, url: settings.footer_social_youtube },
      { key: 'tiktok', icon: SiTiktok, url: settings.footer_social_tiktok }, // Ajout de TikTok
    ];

    const days = [
      { key: 'monday', label: 'Lundi' },
      { key: 'tuesday', label: 'Mardi' },
      { key: 'wednesday', label: 'Mercredi' },
      { key: 'thursday', label: 'Jeudi' },
      { key: 'friday', label: 'Vendredi' },
      { key: 'saturday', label: 'Samedi' },
      { key: 'sunday', label: 'Dimanche' },
    ];

    return (
      <div className="bg-gray-900 text-white rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Colonne 1: Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              {previewLogo ? (
                <img src={previewLogo} alt="Logo" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <Store className="h-8 w-8 text-primary" />
              )}
              <span className="text-lg font-bold">{tenant.name || 'BeautyFlow'}</span>
            </div>
            <p className="text-sm text-gray-400">
              {settings.footer_description || tenant.description || 'Votre salon de beauté et bien-être.'}
            </p>
          </div>

          {/* Colonne 2: Contact */}
          <div>
            <h4 className="font-semibold mb-3">Contact</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              {settings.footer_address && (
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{settings.footer_address}</span>
                </li>
              )}
              {settings.footer_phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{settings.footer_phone}</span>
                </li>
              )}
              {settings.footer_email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{settings.footer_email}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Colonne 3: Horaires */}
          <div>
            <h4 className="font-semibold mb-3">Horaires</h4>
            <ul className="space-y-1 text-sm text-gray-400">
              {days.map(day => {
                const hours = settings[`footer_hours_${day.key}`];
                return hours && (
                  <li key={day.key} className="flex justify-between">
                    <span>{day.label}</span>
                    <span>{hours}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Colonne 4: Réseaux sociaux */}
          <div>
            <h4 className="font-semibold mb-3">Suivez-nous</h4>
            {settings.footer_show_social !== false && (
              <div className="flex flex-wrap gap-3">
                {socialIcons.map(({ key, icon: Icon, url }) => (
                  url && (
                    <a 
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  )
                ))}
              </div>
            )}
            <p className="text-sm text-gray-400 mt-4">
              © {new Date().getFullYear()} {settings.footer_copyright || tenant.name}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personnalisation de la page d'accueil</h1>
          <p className="text-muted-foreground mt-1">Configurez chaque section de votre page d'accueil</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setPreviewMode(!previewMode)}
            className="gap-2"
          >
            {previewMode ? (
              <>
                <Paintbrush className="h-4 w-4" />
                Mode Édition
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Aperçu global
              </>
            )}
          </Button>
        </div>
      </div>

      {previewMode ? (
        // === MODE APERÇU GLOBAL ===
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>🔍 Aperçu de la page d'accueil</CardTitle>
              <CardDescription>Voici à quoi ressemble votre page d'accueil avec les paramètres actuels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Hero Preview */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Section Hero</h3>
                {renderHeroPreview()}
              </div>

              {/* CTA Preview */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Section CTA</h3>
                {renderCtaPreview()}
              </div>

              {/* Stats Preview */}
              {settings.stats_show !== false && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Statistiques</h3>
                  <div className="grid grid-cols-3 gap-4 bg-muted/20 rounded-xl p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{settings.stat_1_number || '500+'}</div>
                      <div className="text-sm text-muted-foreground">{settings.stat_1_label || 'Salons'}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{settings.stat_2_number || '10k+'}</div>
                      <div className="text-sm text-muted-foreground">{settings.stat_2_label || 'Clients'}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{settings.stat_3_number || '50k+'}</div>
                      <div className="text-sm text-muted-foreground">{settings.stat_3_label || 'Rendez-vous'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Features Preview */}
              {settings.features_show !== false && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Fonctionnalités</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { title: settings.feature_1_title, desc: settings.feature_1_description },
                      { title: settings.feature_2_title, desc: settings.feature_2_description },
                      { title: settings.feature_3_title, desc: settings.feature_3_description },
                    ].map((feature, i) => (
                      <div key={i} className="p-4 border rounded-xl text-center">
                        <div className="h-10 w-10 rounded-full bg-primary/10 mx-auto mb-2 flex items-center justify-center">
                          <Star className="h-5 w-5 text-primary" />
                        </div>
                        <h4 className="font-semibold text-sm">{feature.title || 'Feature'}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{feature.desc || 'Description'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Preview */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Pied de page</h3>
                {renderFooterPreview()}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        // === MODE ÉDITION ===
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 mb-6 flex-wrap gap-1">
              <TabsTrigger value="hero" className="gap-2 text-xs">
                <Image className="h-4 w-4" />
                <span className="hidden sm:inline">Hero</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-2 text-xs">
                <Award className="h-4 w-4" />
                <span className="hidden sm:inline">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="features" className="gap-2 text-xs">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Features</span>
              </TabsTrigger>
              <TabsTrigger value="products" className="gap-2 text-xs">
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">Produits</span>
              </TabsTrigger>
              <TabsTrigger value="cta" className="gap-2 text-xs">
                <Megaphone className="h-4 w-4" />
                <span className="hidden sm:inline">CTA</span>
              </TabsTrigger>
              <TabsTrigger value="footer" className="gap-2 text-xs">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Footer</span>
              </TabsTrigger>
              <TabsTrigger value="branding" className="gap-2 text-xs">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Branding</span>
              </TabsTrigger>
            </TabsList>

            {/* ==================== HERO SECTION ==================== */}
            <TabsContent value="hero" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5 text-primary" />
                    Section Hero - Configuration complète
                  </CardTitle>
                  <CardDescription>Personnalisez la bannière principale de votre page d'accueil</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Aperçu en direct */}
                  <div className="mb-4">
                    <Label className="text-sm font-medium">Aperçu en direct</Label>
                    {renderHeroPreview()}
                  </div>

                  <Separator />

                  {/* Badge */}
                  <div className="space-y-2">
                    <Label>Badge (petit texte au-dessus du titre)</Label>
                    <Input 
                      value={settings.hero_badge_text || ''} 
                      onChange={(e) => handleChange('hero_badge_text', e.target.value)}
                      placeholder="✨ Nouveau : Programme de fidélité"
                    />
                  </div>

                  {/* Titre */}
                  <div className="space-y-2">
                    <Label>Titre principal</Label>
                    <Textarea 
                      value={settings.hero_title || ''} 
                      onChange={(e) => handleChange('hero_title', e.target.value)}
                      rows={2}
                      placeholder="Prenez soin de vous avec BeautyFlow"
                    />
                    <p className="text-xs text-muted-foreground">Utilisez {'{tenant_name}'} pour afficher le nom du salon</p>
                  </div>

                  {/* Sous-titre */}
                  <div className="space-y-2">
                    <Label>Sous-titre</Label>
                    <Textarea 
                      value={settings.hero_subtitle || ''} 
                      onChange={(e) => handleChange('hero_subtitle', e.target.value)}
                      rows={3}
                      placeholder="La plateforme complète pour réserver vos soins beauté"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Texte du bouton principal</Label>
                      <Input 
                        value={settings.hero_cta_text || ''} 
                        onChange={(e) => handleChange('hero_cta_text', e.target.value)}
                        placeholder="Commencer gratuitement"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Lien du bouton principal</Label>
                      <Input 
                        value={settings.hero_cta_link || ''} 
                        onChange={(e) => handleChange('hero_cta_link', e.target.value)}
                        placeholder="/auth/signup"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Texte du bouton secondaire</Label>
                      <Input 
                        value={settings.hero_secondary_cta_text || ''} 
                        onChange={(e) => handleChange('hero_secondary_cta_text', e.target.value)}
                        placeholder="Se connecter"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Lien du bouton secondaire</Label>
                      <Input 
                        value={settings.hero_secondary_cta_link || ''} 
                        onChange={(e) => handleChange('hero_secondary_cta_link', e.target.value)}
                        placeholder="/auth/login"
                      />
                    </div>
                  </div>

                  {/* Arrière-plan */}
                  <div className="border-t pt-6">
                    <Label className="text-base font-semibold">Arrière-plan du Hero</Label>
                    <p className="text-sm text-muted-foreground mb-4">Choisissez le type et l'apparence du fond</p>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Type d'arrière-plan</Label>
                        <Select 
                          value={settings.hero_background_type || 'gradient'} 
                          onValueChange={(v) => handleChange('hero_background_type', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gradient">Dégradé</SelectItem>
                            <SelectItem value="image">Image</SelectItem>
                            <SelectItem value="color">Couleur unie</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {settings.hero_background_type === 'color' && (
                        <div className="space-y-2">
                          <Label>Couleur</Label>
                          <div className="flex gap-3">
                            <input 
                              type="color" 
                              value={settings.hero_background_color || '#ec4899'} 
                              onChange={(e) => handleChange('hero_background_color', e.target.value)}
                              className="w-16 h-10 rounded border cursor-pointer" 
                            />
                            <Input 
                              value={settings.hero_background_color || '#ec4899'} 
                              onChange={(e) => handleChange('hero_background_color', e.target.value)}
                              className="flex-1 font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {settings.hero_background_type === 'image' && (
                        <div className="space-y-2 md:col-span-2">
                          <Label>Image de fond</Label>
                          <div className="relative">
                            {previewHeroImage ? (
                              <div className="relative w-full h-48">
                                <img 
                                  src={previewHeroImage} 
                                  alt="Hero background" 
                                  className="w-full h-48 rounded-lg object-cover border"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage('hero')}
                                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div 
                                className="w-full h-48 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/30"
                                onClick={() => document.getElementById('hero-image-upload').click()}
                              >
                                <Upload className="h-12 w-12 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Cliquer pour uploader</span>
                                <span className="text-xs text-muted-foreground">1920x1080 recommandé</span>
                              </div>
                            )}
                            <input
                              id="hero-image-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file, 'hero');
                                e.target.value = '';
                              }}
                            />
                            {uploading && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                                <Loader2 className="h-8 w-8 animate-spin text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Opacité du overlay (%)</Label>
                        <div className="flex items-center gap-4">
                          <Input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={settings.hero_overlay_opacity || 70}
                            onChange={(e) => handleChange('hero_overlay_opacity', parseInt(e.target.value))}
                            className="flex-1"
                          />
                          <span className="w-12 text-center font-mono">{settings.hero_overlay_opacity || 70}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Afficher les statistiques</Label>
                      <p className="text-sm text-muted-foreground">Afficher les chiffres clés sous le hero</p>
                    </div>
                    <Switch 
                      checked={settings.hero_show_stats !== false} 
                      onCheckedChange={(c) => handleChange('hero_show_stats', c)} 
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ==================== STATS SECTION ==================== */}
            <TabsContent value="stats" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Statistiques
                  </CardTitle>
                  <CardDescription>Les chiffres clés affichés sous le hero</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Afficher les statistiques</Label>
                      <p className="text-sm text-muted-foreground">Activer/désactiver toute la section</p>
                    </div>
                    <Switch 
                      checked={settings.stats_show !== false} 
                      onCheckedChange={(c) => handleChange('stats_show', c)} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Titre de la section</Label>
                    <Input 
                      value={settings.stats_title || ''} 
                      onChange={(e) => handleChange('stats_title', e.target.value)}
                      placeholder="Nos chiffres"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2 p-4 border rounded-lg">
                      <Label className="font-semibold">Statistique 1</Label>
                      <Input 
                        value={settings.stat_1_number || ''} 
                        onChange={(e) => handleChange('stat_1_number', e.target.value)}
                        placeholder="500+"
                      />
                      <Input 
                        value={settings.stat_1_label || ''} 
                        onChange={(e) => handleChange('stat_1_label', e.target.value)}
                        placeholder="Salons partenaires"
                      />
                    </div>
                    <div className="space-y-2 p-4 border rounded-lg">
                      <Label className="font-semibold">Statistique 2</Label>
                      <Input 
                        value={settings.stat_2_number || ''} 
                        onChange={(e) => handleChange('stat_2_number', e.target.value)}
                        placeholder="10k+"
                      />
                      <Input 
                        value={settings.stat_2_label || ''} 
                        onChange={(e) => handleChange('stat_2_label', e.target.value)}
                        placeholder="Clients satisfaits"
                      />
                    </div>
                    <div className="space-y-2 p-4 border rounded-lg">
                      <Label className="font-semibold">Statistique 3</Label>
                      <Input 
                        value={settings.stat_3_number || ''} 
                        onChange={(e) => handleChange('stat_3_number', e.target.value)}
                        placeholder="50k+"
                      />
                      <Input 
                        value={settings.stat_3_label || ''} 
                        onChange={(e) => handleChange('stat_3_label', e.target.value)}
                        placeholder="Rendez-vous réservés"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ==================== FEATURES SECTION ==================== */}
            <TabsContent value="features" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Section Fonctionnalités
                  </CardTitle>
                  <CardDescription>Les 3 fonctionnalités principales</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Afficher la section</Label>
                      <p className="text-sm text-muted-foreground">Activer/désactiver toute la section</p>
                    </div>
                    <Switch 
                      checked={settings.features_show !== false} 
                      onCheckedChange={(c) => handleChange('features_show', c)} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input 
                      value={settings.features_title || ''} 
                      onChange={(e) => handleChange('features_title', e.target.value)}
                      placeholder="Pourquoi choisir BeautyFlow ?"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Sous-titre</Label>
                    <Input 
                      value={settings.features_subtitle || ''} 
                      onChange={(e) => handleChange('features_subtitle', e.target.value)}
                      placeholder="Une expérience unique pour prendre soin de vous"
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-3">
                    {[1, 2, 3].map((num) => (
                      <div key={num} className="space-y-2 p-4 border rounded-lg">
                        <Label className="text-base font-semibold">Fonctionnalité {num}</Label>
                        <Input 
                          value={settings[`feature_${num}_title`] || ''} 
                          onChange={(e) => handleChange(`feature_${num}_title`, e.target.value)}
                          placeholder={`Titre de la fonctionnalité ${num}`}
                        />
                        <Textarea 
                          value={settings[`feature_${num}_description`] || ''} 
                          onChange={(e) => handleChange(`feature_${num}_description`, e.target.value)}
                          rows={2}
                          placeholder={`Description de la fonctionnalité ${num}`}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ==================== PRODUCTS SECTION ==================== */}
            <TabsContent value="products" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    Section Produits
                  </CardTitle>
                  <CardDescription>Les produits mis en avant</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Afficher la section</Label>
                      <p className="text-sm text-muted-foreground">Activer/désactiver toute la section</p>
                    </div>
                    <Switch 
                      checked={settings.products_show !== false} 
                      onCheckedChange={(c) => handleChange('products_show', c)} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input 
                      value={settings.products_title || ''} 
                      onChange={(e) => handleChange('products_title', e.target.value)}
                      placeholder="Nos produits populaires"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Sous-titre</Label>
                    <Input 
                      value={settings.products_subtitle || ''} 
                      onChange={(e) => handleChange('products_subtitle', e.target.value)}
                      placeholder="Découvrez les produits préférés de nos clients"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Nombre de produits à afficher</Label>
                    <Input 
                      type="number"
                      min="1"
                      max="20"
                      value={settings.products_limit || 8} 
                      onChange={(e) => handleChange('products_limit', parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Entre 1 et 20 produits</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ==================== CTA SECTION ==================== */}
            <TabsContent value="cta" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-primary" />
                    Section CTA - Configuration complète
                  </CardTitle>
                  <CardDescription>Personnalisez l'appel à l'action final de votre page d'accueil</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Aperçu en direct */}
                  <div className="mb-4">
                    <Label className="text-sm font-medium">Aperçu en direct</Label>
                    {renderCtaPreview()}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Textarea 
                      value={settings.cta_title || ''} 
                      onChange={(e) => handleChange('cta_title', e.target.value)}
                      rows={2}
                      placeholder="Prêt à sublimer votre beauté ?"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Sous-titre</Label>
                    <Textarea 
                      value={settings.cta_subtitle || ''} 
                      onChange={(e) => handleChange('cta_subtitle', e.target.value)}
                      rows={2}
                      placeholder="Rejoignez des milliers de clients satisfaits"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Texte du bouton</Label>
                      <Input 
                        value={settings.cta_button_text || ''} 
                        onChange={(e) => handleChange('cta_button_text', e.target.value)}
                        placeholder="Créer un compte gratuit"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Lien du bouton</Label>
                      <Input 
                        value={settings.cta_button_link || ''} 
                        onChange={(e) => handleChange('cta_button_link', e.target.value)}
                        placeholder="/auth/signup"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <Label className="text-base font-semibold">Arrière-plan du CTA</Label>
                    
                    <div className="grid gap-4 md:grid-cols-2 mt-4">
                      <div className="space-y-2">
                        <Label>Type d'arrière-plan</Label>
                        <Select 
                          value={settings.cta_background_type || 'gradient'} 
                          onValueChange={(v) => handleChange('cta_background_type', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gradient">Dégradé</SelectItem>
                            <SelectItem value="image">Image</SelectItem>
                            <SelectItem value="color">Couleur unie</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {settings.cta_background_type === 'color' && (
                        <div className="space-y-2">
                          <Label>Couleur</Label>
                          <div className="flex gap-3">
                            <input 
                              type="color" 
                              value={settings.cta_background_color || '#ec4899'} 
                              onChange={(e) => handleChange('cta_background_color', e.target.value)}
                              className="w-16 h-10 rounded border cursor-pointer" 
                            />
                            <Input 
                              value={settings.cta_background_color || '#ec4899'} 
                              onChange={(e) => handleChange('cta_background_color', e.target.value)}
                              className="flex-1 font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {settings.cta_background_type === 'image' && (
                        <div className="space-y-2 md:col-span-2">
                          <Label>Image de fond CTA</Label>
                          <div className="relative">
                            {previewCtaImage ? (
                              <div className="relative w-full h-48">
                                <img 
                                  src={previewCtaImage} 
                                  alt="CTA background" 
                                  className="w-full h-48 rounded-lg object-cover border"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage('cta')}
                                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div 
                                className="w-full h-48 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/30"
                                onClick={() => document.getElementById('cta-image-upload').click()}
                              >
                                <Upload className="h-12 w-12 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Cliquer pour uploader</span>
                              </div>
                            )}
                            <input
                              id="cta-image-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file, 'cta');
                                e.target.value = '';
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Afficher la section</Label>
                      <p className="text-sm text-muted-foreground">Activer/désactiver toute la section</p>
                    </div>
                    <Switch 
                      checked={settings.cta_show !== false} 
                      onCheckedChange={(c) => handleChange('cta_show', c)} 
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ==================== FOOTER SECTION ==================== */}
            <TabsContent value="footer" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Pied de page
                  </CardTitle>
                  <CardDescription>Configuration complète du footer</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Aperçu en direct */}
                  <div className="mb-4">
                    <Label className="text-sm font-medium">Aperçu en direct</Label>
                    {renderFooterPreview()}
                  </div>

                  <Separator />

                  {/* Informations de contact */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Informations de contact</Label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Adresse</Label>
                        <Textarea 
                          value={settings.footer_address || ''} 
                          onChange={(e) => handleChange('footer_address', e.target.value)}
                          rows={2}
                          placeholder="Adresse complète du salon"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Téléphone</Label>
                        <Input 
                          value={settings.footer_phone || ''} 
                          onChange={(e) => handleChange('footer_phone', e.target.value)}
                          placeholder="+225 07 37 90 978"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Email</Label>
                        <Input 
                          value={settings.footer_email || ''} 
                          onChange={(e) => handleChange('footer_email', e.target.value)}
                          placeholder="contact@salon.com"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Description</Label>
                        <Textarea 
                          value={settings.footer_description || ''} 
                          onChange={(e) => handleChange('footer_description', e.target.value)}
                          rows={2}
                          placeholder="Description de votre salon pour le footer"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Horaires d'ouverture */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Horaires d'ouverture</Label>
                    <div className="grid gap-3 md:grid-cols-2">
                      {[
                        { key: 'monday', label: 'Lundi' },
                        { key: 'tuesday', label: 'Mardi' },
                        { key: 'wednesday', label: 'Mercredi' },
                        { key: 'thursday', label: 'Jeudi' },
                        { key: 'friday', label: 'Vendredi' },
                        { key: 'saturday', label: 'Samedi' },
                        { key: 'sunday', label: 'Dimanche' },
                      ].map((day) => (
                        <div key={day.key} className="flex items-center gap-2">
                          <Label className="w-24">{day.label}</Label>
                          <Input 
                            value={settings[`footer_hours_${day.key}`] || ''} 
                            onChange={(e) => handleChange(`footer_hours_${day.key}`, e.target.value)}
                            placeholder={day.key === 'sunday' ? 'Fermé' : '09:00 - 19:00'}
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Réseaux sociaux */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Réseaux sociaux</Label>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Afficher</Label>
                        <Switch 
                          checked={settings.footer_show_social !== false} 
                          onCheckedChange={(c) => handleChange('footer_show_social', c)} 
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <Facebook className="h-4 w-4 text-blue-600" />
                        <Input 
                          value={settings.footer_social_facebook || ''} 
                          onChange={(e) => handleChange('footer_social_facebook', e.target.value)}
                          placeholder="https://facebook.com/votre-page"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-pink-600" />
                        <Input 
                          value={settings.footer_social_instagram || ''} 
                          onChange={(e) => handleChange('footer_social_instagram', e.target.value)}
                          placeholder="https://instagram.com/votre-compte"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Twitter className="h-4 w-4 text-sky-500" />
                        <Input 
                          value={settings.footer_social_twitter || ''} 
                          onChange={(e) => handleChange('footer_social_twitter', e.target.value)}
                          placeholder="https://twitter.com/votre-compte"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4 text-blue-700" />
                        <Input 
                          value={settings.footer_social_linkedin || ''} 
                          onChange={(e) => handleChange('footer_social_linkedin', e.target.value)}
                          placeholder="https://linkedin.com/company/votre-salon"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Youtube className="h-4 w-4 text-red-600" />
                        <Input 
                          value={settings.footer_social_youtube || ''} 
                          onChange={(e) => handleChange('footer_social_youtube', e.target.value)}
                          placeholder="https://youtube.com/@votre-chaine"
                        />
                      </div>
                      {/* Ajout du champ TikTok */}
                      <div className="flex items-center gap-2">
                        <SiTiktok className="h-4 w-4 text-white" style={{ color: '#000000' }} />
                        <Input 
                          value={settings.footer_social_tiktok || ''} 
                          onChange={(e) => handleChange('footer_social_tiktok', e.target.value)}
                          placeholder="https://tiktok.com/@votre-compte"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Texte de copyright</Label>
                    <Input 
                      value={settings.footer_copyright || ''} 
                      onChange={(e) => handleChange('footer_copyright', e.target.value)}
                      placeholder="BeautyFlow"
                    />
                    <p className="text-xs text-muted-foreground">Sera affiché comme "© 2024 VotreTexte"</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ==================== BRANDING SECTION ==================== */}
            <TabsContent value="branding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    Identité visuelle
                  </CardTitle>
                  <CardDescription>Personnalisez le logo et les couleurs de votre salon</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Logo */}
                  <div>
                    <Label className="text-base font-semibold">Logo</Label>
                    <p className="text-sm text-muted-foreground mb-3">Format carré recommandé (200x200)</p>
                    
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0">
                        {previewLogo ? (
                          <div className="relative w-32 h-32">
                            <img 
                              src={previewLogo} 
                              alt="Logo" 
                              className="w-32 h-32 rounded-2xl object-cover border-2"
                              style={{ borderColor: tenant.primary_color || '#2563eb' }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage('logo')}
                              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="w-32 h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/30 transition-colors"
                            style={{ borderColor: tenant.primary_color || '#2563eb' }}
                            onClick={() => document.getElementById('logo-upload').click()}
                          >
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground text-center">Cliquer pour uploader</span>
                          </div>
                        )}
                        <input
                          id="logo-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, 'logo');
                            e.target.value = '';
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
                          {previewLogo ? '✅ Logo chargé' : 'Aucun logo sélectionné'}
                        </p>
                        {previewLogo && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => document.getElementById('logo-upload').click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Changer le logo
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Couleurs */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Couleurs du salon</Label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Couleur principale</Label>
                        <div className="flex gap-3">
                          <input 
                            type="color" 
                            value={tenant.primary_color || '#2563eb'} 
                            onChange={(e) => handleTenantChange('primary_color', e.target.value)}
                            className="w-16 h-10 rounded border cursor-pointer" 
                          />
                          <Input 
                            value={tenant.primary_color || '#2563eb'} 
                            onChange={(e) => handleTenantChange('primary_color', e.target.value)}
                            className="flex-1 font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Couleur secondaire</Label>
                        <div className="flex gap-3">
                          <input 
                            type="color" 
                            value={tenant.secondary_color || '#3b82f6'} 
                            onChange={(e) => handleTenantChange('secondary_color', e.target.value)}
                            className="w-16 h-10 rounded border cursor-pointer" 
                          />
                          <Input 
                            value={tenant.secondary_color || '#3b82f6'} 
                            onChange={(e) => handleTenantChange('secondary_color', e.target.value)}
                            className="flex-1 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 p-4 rounded-xl" style={{ backgroundColor: tenant.primary_color || '#2563eb' }}>
                      <div className="flex-1 text-white text-center font-medium">Aperçu couleur principale</div>
                    </div>
                  </div>

                  <Separator />

                  {/* Informations du salon */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Informations du salon</Label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Nom du salon</Label>
                        <Input 
                          value={tenant.name || ''} 
                          onChange={(e) => handleTenantChange('name', e.target.value)}
                          placeholder="Nom de votre salon"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Téléphone</Label>
                        <Input 
                          value={tenant.phone || ''} 
                          onChange={(e) => handleTenantChange('phone', e.target.value)}
                          placeholder="+225 07 37 90 978"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input 
                          value={tenant.email || ''} 
                          onChange={(e) => handleTenantChange('email', e.target.value)}
                          placeholder="contact@salon.com"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Adresse</Label>
                        <Textarea 
                          value={tenant.address || ''} 
                          onChange={(e) => handleTenantChange('address', e.target.value)}
                          rows={2}
                          placeholder="Adresse complète"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Description</Label>
                        <Textarea 
                          value={tenant.description || ''} 
                          onChange={(e) => handleTenantChange('description', e.target.value)}
                          rows={3}
                          placeholder="Description de votre salon"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-8 flex justify-end gap-4">
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}