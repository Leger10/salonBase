// /src/pages/HomePage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useTenant } from "@/contexts/TenantContext.jsx";
import { useTheme } from "@/contexts/ThemeContext.jsx";
import { useActiveTenant } from "@/contexts/ActiveTenantContext.jsx";
import { usePlatformConfig } from "@/contexts/PlatformConfigContext.jsx";
import { supabase } from '@/lib/supabase';
import PublicHeader from "@/components/PublicHeader.jsx";
import PublicFooter from "@/components/PublicFooter.jsx";
import ProductsList from "@/components/ProductsList.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import {
  Scissors,
  Calendar,
  Star,
  Sparkles,
  ArrowRight,
  Clock,
  Users,
  ChevronRight,
  Building2,
  MapPin,
  Eye,
  Crown,
  Store,
  Shield,
  CheckCircle,
  Settings,
} from "lucide-react";
import FloatingAiChat from "@/components/FloatingAiChat.jsx";

const PRIMARY_PINK = "#ec4899";

export default function HomePage() {
  const { isAuthenticated, currentUser, isLoading } = useAuth();
  const { tenantSettings, homeSettings, refreshTenant } = useTenant();
  const { isDark } = useTheme();
  const { activeTenant, isShowcase } = useActiveTenant();
  const platformConfig = usePlatformConfig();
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userTenant, setUserTenant] = useState(null);

  const getDashboardPath = (role) => {
    if (role === "super_admin") return "/super-admin/dashboard";
    if (role === "admin") return "/admin/dashboard";
    if (role === "employee") return "/employee/dashboard";
    return "/client/dashboard";
  };

  const getUserRole = () => {
    return currentUser?.profile?.role || currentUser?.role;
  };

  const isSuperAdmin = isAuthenticated && getUserRole() === 'super_admin';
  const isAdmin = isAuthenticated && getUserRole() === 'admin';
  const isEmployee = isAuthenticated && getUserRole() === 'employee';
  const isClient = isAuthenticated && getUserRole() === 'client';

  const currentTenant = isShowcase ? activeTenant : userTenant;

  useEffect(() => {
    if (isSuperAdmin) {
      refreshTenant();
    }
  }, []);

  useEffect(() => {
    if (isShowcase && activeTenant) {
      setTenants([activeTenant]);
      setTenantsLoading(false);
      return;
    }

    if (isAuthenticated && (isAdmin || isEmployee)) {
      fetchUserTenant();
    } else {
      fetchActiveTenants();
    }
  }, [isAuthenticated, currentUser, isShowcase, activeTenant]);


  useEffect(() => {
    // Sauvegarder le slug si on est en mode showcase
    if (isShowcase && activeTenant?.slug) {
      localStorage.setItem('beautyflow_last_slug', activeTenant.slug);
      localStorage.setItem('beautyflow_deep_link', `/showcase/${activeTenant.slug}`);
      console.log('💾 Slug sauvegardé depuis HomePage:', activeTenant.slug);
    }
    
    // Si on est sur la page d'accueil et qu'on a un lien profond sauvegardé
    const currentPath = window.location.pathname;
    if (currentPath === '/' || currentPath === '') {
      const savedSlug = localStorage.getItem('beautyflow_last_slug');
      const savedDeepLink = localStorage.getItem('beautyflow_deep_link');
      
      // Détecter le mode PWA
      const isPWA = window.navigator.standalone || 
                    window.matchMedia('(display-mode: standalone)').matches ||
                    window.location.search.includes('source=pwa');
      
      if (isPWA && savedDeepLink && savedDeepLink !== '/') {
        console.log('🔄 PWA: Restauration du lien profond depuis HomePage:', savedDeepLink);
        // Ne pas rediriger ici pour éviter les boucles, la redirection est gérée par main.jsx
      }
    }
  }, [isShowcase, activeTenant]);

  const fetchUserTenant = async () => {
    setTenantsLoading(true);
    setError(null);
    
    try {
      const tenantId = currentUser?.profile?.tenant_id;
      
      if (!tenantId) {
        setTenants([]);
        setTenantsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('tenants')
        .select(`
          id, 
          name, 
          slug, 
          description, 
          address, 
          phone, 
          email, 
          logo_url, 
          cover_image, 
          primary_color, 
          secondary_color, 
          subscription_plan, 
          subscription_status, 
          created_at,
          show_on_home,
          rating,
          city
        `)
        .eq('id', tenantId)
        .eq('subscription_status', 'active')
        .single();

      if (error) throw error;

      setUserTenant(data);
      setTenants(data ? [data] : []);
    } catch (error) {
      console.error('Error fetching user tenant:', error);
      setError('Impossible de charger votre salon');
      setTenants([]);
    } finally {
      setTenantsLoading(false);
    }
  };

  const fetchActiveTenants = async () => {
    setTenantsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          id, 
          name, 
          slug, 
          description, 
          address, 
          phone, 
          email, 
          logo_url, 
          cover_image, 
          primary_color, 
          secondary_color, 
          subscription_plan, 
          subscription_status, 
          created_at,
          show_on_home,
          rating,
          city
        `)
        .eq('subscription_status', 'active')
        .eq('show_on_home', true)
        .order('name');

      if (error) throw error;

      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setError('Impossible de charger les salons');
      setTenants([]);
    } finally {
      setTenantsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // ✅ Récupération des couleurs
  const getPrimaryColor = () => {
    if (isShowcase && activeTenant?.primary_color) {
      return activeTenant.primary_color;
    }
    if (isSuperAdmin && platformConfig.primaryColor) {
      return platformConfig.primaryColor;
    }
    if (tenantSettings?.primary_color) {
      return tenantSettings.primary_color;
    }
    if (userTenant?.primary_color) {
      return userTenant.primary_color;
    }
    return PRIMARY_PINK;
  };

  // ✅ Récupération du nom du salon
  const getSalonName = () => {
    if (isShowcase && activeTenant) {
      return activeTenant.name;
    }
    if (isAdmin || isEmployee) {
      return userTenant?.name || tenantSettings?.name || 'BeautyFlow';
    }
    if (isSuperAdmin) {
      return platformConfig.platformName;
    }
    return platformConfig.platformName;
  };

  const primaryColor = getPrimaryColor();
  const salonName = getSalonName();
  const userRole = getUserRole();

  // ✅ Récupération du logo
  const getLogoUrl = () => {
    if (isShowcase && activeTenant?.logo_url) {
      return activeTenant.logo_url;
    }
    if (userTenant?.logo_url) {
      return userTenant.logo_url;
    }
    if (tenantSettings?.logo_url) {
      return tenantSettings.logo_url;
    }
    return platformConfig.logoUrl;
  };

  const logoUrl = getLogoUrl();

  // ✅ Fonctions pour obtenir les textes
  const getHeroTitle = () => {
    if (isShowcase && activeTenant) {
      return `Bienvenue chez ${activeTenant.name}`;
    }
    if (isSuperAdmin) {
      return platformConfig.platformName || "BeautyFlow - Administration";
    }
    if (isAdmin || isEmployee) {
      return homeSettings?.hero_title?.replace('{tenant_name}', userTenant?.name || '') || 
        `Bienvenue dans votre salon, ${currentUser?.profile?.full_name || 'Admin'}`;
    }
    if (isClient) {
      return homeSettings?.hero_title?.replace('{tenant_name}', '') || 
        `Bonjour, ${currentUser?.profile?.full_name || 'Client'}`;
    }
    return platformConfig.platformName || "Prenez soin de vous avec BeautyFlow";
  };

  const getHeroSubtitle = () => {
    if (isShowcase && activeTenant) {
      return activeTenant.description || 'Découvrez nos services de qualité';
    }
    if (isSuperAdmin) {
      return platformConfig.platformDescription || "Gérez la plateforme BeautyFlow";
    }
    if (isAdmin || isEmployee) {
      return homeSettings?.hero_subtitle || 
        userTenant?.description || 
        "Gérez votre salon et vos services depuis votre espace professionnel";
    }
    if (isClient) {
      return homeSettings?.hero_subtitle || 
        "Retrouvez vos salons favoris et gérez vos rendez-vous";
    }
    return platformConfig.platformDescription || 
      "La plateforme complète pour réserver vos soins beauté, gérer vos rendez-vous et découvrir de nouveaux talents près de chez vous.";
  };

  const getHeroBadge = () => {
    if (isShowcase && activeTenant) {
      return `✨ ${activeTenant.name}`;
    }
    if (isSuperAdmin) {
      return "⭐ Super Admin - Gestion de la plateforme";
    }
    if (isAdmin || isEmployee) {
      return homeSettings?.hero_badge_text || "👋 Espace professionnel";
    }
    if (isClient) {
      return homeSettings?.hero_badge_text || "✨ Bienvenue dans votre espace client";
    }
    return platformConfig.get?.('hero.badge_text') || homeSettings?.hero_badge_text || "✨ Nouveau : Programme de fidélité amélioré";
  };

  const getHeroCtaText = () => {
    if (isAuthenticated || isShowcase) return null;
    return platformConfig.get?.('hero.cta_text') || homeSettings?.hero_cta_text || "Commencer gratuitement";
  };

  const getHeroCtaLink = () => {
    if (isAuthenticated || isShowcase) return null;
    return platformConfig.get?.('hero.cta_link') || homeSettings?.hero_cta_link || "/auth/signup";
  };

  const getHeroSecondaryCtaText = () => {
    if (isAuthenticated || isShowcase) return null;
    return platformConfig.get?.('hero.secondary_cta_text') || homeSettings?.hero_secondary_cta_text || "Se connecter";
  };

  const getHeroSecondaryCtaLink = () => {
    if (isAuthenticated || isShowcase) return null;
    return platformConfig.get?.('hero.secondary_cta_link') || homeSettings?.hero_secondary_cta_link || "/auth/login";
  };

  const shouldShowStats = () => {
    if (isAdmin || isEmployee || isSuperAdmin || isShowcase) return false;
    const heroShowStats = platformConfig.get?.('hero.show_stats');
    if (heroShowStats !== undefined) return heroShowStats;
    return homeSettings?.hero_show_stats !== false;
  };

  const getStats = () => {
    if (!shouldShowStats()) return [];
    return [
      { number: homeSettings?.stat_1_number || '500+', label: homeSettings?.stat_1_label || 'Salons partenaires' },
      { number: homeSettings?.stat_2_number || '10k+', label: homeSettings?.stat_2_label || 'Clients satisfaits' },
      { number: homeSettings?.stat_3_number || '50k+', label: homeSettings?.stat_3_label || 'Rendez-vous réservés' }
    ];
  };

  const getFeatures = () => {
    if (isSuperAdmin) {
      return [
        {
          title: 'Gestion des salons',
          description: 'Visualisez et gérez tous les salons de la plateforme.',
          icon: <Building2 className="h-7 w-7 text-primary" />
        },
        {
          title: 'Administrateurs',
          description: 'Gérez les administrateurs de salons et leurs permissions.',
          icon: <Shield className="h-7 w-7 text-accent" />
        },
        {
          title: 'Configuration globale',
          description: 'Configurez les paramètres généraux de la plateforme.',
          icon: <Settings className="h-7 w-7 text-secondary-foreground" />
        }
      ];
    }

    if (isAdmin || isEmployee) {
      return [
        {
          title: homeSettings?.feature_1_title || 'Gestion des rendez-vous',
          description: homeSettings?.feature_1_description || 'Visualisez et gérez tous les rendez-vous de votre salon en un coup d\'œil.',
          icon: <Calendar className="h-7 w-7 text-primary" />
        },
        {
          title: homeSettings?.feature_2_title || 'Équipe et clients',
          description: homeSettings?.feature_2_description || 'Gérez vos employés, suivez vos clients et leur fidélité.',
          icon: <Users className="h-7 w-7 text-accent" />
        },
        {
          title: homeSettings?.feature_3_title || 'Services et produits',
          description: homeSettings?.feature_3_description || 'Gérez vos services, produits et promotions en temps réel.',
          icon: <Scissors className="h-7 w-7 text-secondary-foreground" />
        }
      ];
    }
    
    return [
      {
        title: homeSettings?.feature_1_title || 'Réservation Facile',
        description: homeSettings?.feature_1_description || 'Trouvez un créneau disponible 24/7 en quelques clics, sans avoir à appeler.',
        icon: <Calendar className="h-7 w-7 text-primary" />
      },
      {
        title: homeSettings?.feature_2_title || 'Programme Fidélité',
        description: homeSettings?.feature_2_description || 'Cumulez des points à chaque visite et profitez de réductions exclusives.',
        icon: <Star className="h-7 w-7 text-accent" />
      },
      {
        title: homeSettings?.feature_3_title || 'Les Meilleurs Pros',
        description: homeSettings?.feature_3_description || 'Consultez les avis certifiés pour choisir le professionnel qui vous correspond.',
        icon: <Users className="h-7 w-7 text-secondary-foreground" />
      }
    ];
  };

  const shouldShowFeatures = () => {
    return homeSettings?.features_show !== false;
  };

  const shouldShowProducts = () => {
    if (isAdmin || isEmployee || isSuperAdmin || isShowcase) return false;
    return homeSettings?.products_show !== false;
  };

  const shouldShowCTA = () => {
    if (isShowcase) return false;
    if (!isAuthenticated && platformConfig.get?.('cta.show') !== undefined) {
      return platformConfig.get('cta.show');
    }
    return homeSettings?.cta_show !== false;
  };

  const getCTATitle = () => {
    if (isSuperAdmin) {
      return platformConfig.get?.('cta.title') || "Gérez votre plateforme BeautyFlow";
    }
    if (isAdmin || isEmployee) {
      return homeSettings?.cta_title || 'Optimisez la gestion de votre salon';
    }
    return platformConfig.get?.('cta.title') || homeSettings?.cta_title || 'Prêt à sublimer votre beauté ?';
  };

  const getCTASubtitle = () => {
    if (isSuperAdmin) {
      return platformConfig.get?.('cta.subtitle') || "Accédez à votre espace d'administration pour configurer la plateforme";
    }
    if (isAdmin || isEmployee) {
      return homeSettings?.cta_subtitle || 'Accédez à votre espace professionnel pour gérer votre salon';
    }
    return platformConfig.get?.('cta.subtitle') || homeSettings?.cta_subtitle || 'Rejoignez des milliers de clients satisfaits et prenez rendez-vous dès aujourd\'hui.';
  };

  const getCTAButtonText = () => {
    if (isSuperAdmin) {
      return 'Accéder au tableau de bord';
    }
    if (isAdmin || isEmployee) {
      return 'Accéder à mon espace';
    }
    if (!isAuthenticated) {
      return platformConfig.get?.('cta.button_text') || homeSettings?.cta_button_text || 'Créer un compte gratuit';
    }
    return 'Accéder à mon espace';
  };

  const getCTAButtonLink = () => {
    if (isSuperAdmin) {
      return '/super-admin/dashboard';
    }
    if (!isAuthenticated) {
      return platformConfig.get?.('cta.button_link') || homeSettings?.cta_button_link || '/auth/signup';
    }
    return getDashboardPath(userRole);
  };

  const displayTenants = isShowcase ? [activeTenant] : (isAdmin || isEmployee ? tenants : tenants);

  // ✅ Rendu du Hero
  const renderHero = () => {
    const bgType = isShowcase ? 'gradient' : (isSuperAdmin ? platformConfig.get?.('hero.background_type') : homeSettings?.hero_background_type || 'gradient');
    
    let bgImage = isShowcase ? activeTenant?.cover_image : (isSuperAdmin ? platformConfig.get?.('hero.background_image') : homeSettings?.hero_background_image || tenantSettings?.cover_image || userTenant?.cover_image);
    
    const bgColor = isShowcase ? activeTenant?.primary_color : (isSuperAdmin ? platformConfig.get?.('hero.background_color') : homeSettings?.hero_background_color || primaryColor);
    const overlayOpacity = isSuperAdmin ? platformConfig.get?.('hero.overlay_opacity') : homeSettings?.hero_overlay_opacity || 70;

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
      <section className="relative overflow-hidden pt-16 md:pt-24 pb-32">
        <div className="absolute inset-0" style={backgroundStyle} />
        {bgType === 'image' && (
          <div 
            className="absolute inset-0"
            style={{ 
              backgroundColor: `rgba(0,0,0,${overlayOpacity/100})`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-1.5 text-sm font-medium text-white mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {isSuperAdmin ? (
              <Shield className="h-4 w-4" />
            ) : isAdmin || isEmployee ? (
              <Store className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>{getHeroBadge()}</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight drop-shadow-lg">
            {isShowcase && activeTenant ? (
              <>
                <span style={{ color: isDark ? '#60a5fa' : '#ffffff' }}>
                  {activeTenant.name}
                </span>
                <span className="block text-xl font-normal text-white/90 mt-2">
                  {activeTenant.description || 'Votre salon de beauté'}
                </span>
              </>
            ) : isAuthenticated && userTenant && !isSuperAdmin ? (
              <>
                {isAdmin ? '👋' : isEmployee ? '👋' : 'Bonjour'}{" "}
                <span style={{ color: isDark ? '#60a5fa' : primaryColor }}>
                  {userTenant.name}
                </span>
              </>
            ) : isAuthenticated && isClient ? (
              <>
                Bonjour{" "}
                <span style={{ color: isDark ? '#60a5fa' : primaryColor }}>
                  {currentUser?.profile?.full_name || 'Client'}
                </span>
              </>
            ) : (
              <span dangerouslySetInnerHTML={{ __html: getHeroTitle() }} />
            )}
          </h1>
          
          <p className="mt-6 text-lg md:text-xl text-white/95 max-w-2xl mx-auto leading-relaxed drop-shadow-lg">
            {getHeroSubtitle()}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {!isAuthenticated && !isShowcase ? (
              <>
                <Button
                  size="lg"
                  asChild
                  className="h-14 px-8 text-base shadow-lg hover:shadow-xl transition-all text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Link to={getHeroCtaLink()}>{getHeroCtaText()}</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-14 px-8 text-base bg-white/10 backdrop-blur-sm text-white border-white/20 hover:bg-white/20"
                >
                  <Link to={getHeroSecondaryCtaLink()}>{getHeroSecondaryCtaText()}</Link>
                </Button>
              </>
            ) : isShowcase && activeTenant ? (
              <Button
                size="lg"
                asChild
                className="h-14 px-8 text-base shadow-lg hover:shadow-xl transition-all text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <Link to={`/booking/tenant/${activeTenant.slug}`}>
                  Prendre rendez-vous <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-lg font-medium text-white drop-shadow-lg">
                  {isSuperAdmin ? (
                    <>Bienvenue dans votre espace d'administration</>
                  ) : isAdmin || isEmployee ? (
                    <>Gérez votre salon depuis votre tableau de bord</>
                  ) : (
                    <>Heureux de vous revoir, {currentUser?.profile?.full_name || 'Client'} !</>
                  )}
                </p>
                <Button
                  size="lg"
                  asChild
                  className="h-14 px-8 text-base shadow-lg gap-2 text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Link to={getDashboardPath(userRole)}>
                    Accéder à mon espace <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {shouldShowStats() && !isAuthenticated && (
            <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
              {getStats().map((stat) => (
                <div 
                  key={stat.label} 
                  className="text-center rounded-xl p-4 bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all duration-300"
                >
                  <div className="text-3xl font-bold text-white">{stat.number}</div>
                  <div className="text-sm text-white/80 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-12 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-all duration-300">
            <Sparkles className="h-4 w-4" />
            <span>
              🤖 Notre assistant IA est disponible 24/7 ! Cliquez en bas à
              droite pour discuter.
            </span>
          </div>
        </div>
      </section>
    );
  };

  // Rendu des Features
  const renderFeatures = () => {
    if (!shouldShowFeatures()) return null;

    const features = getFeatures();
    const featuresTitle = isSuperAdmin ? "Gestion de la plateforme" :
      homeSettings?.features_title || 
      (isAdmin || isEmployee ? 'Gérez votre salon efficacement' : 'Pourquoi choisir BeautyFlow ?');
    const featuresSubtitle = isSuperAdmin ? "Tous les outils pour administrer BeautyFlow" :
      homeSettings?.features_subtitle ||
      (isAdmin || isEmployee 
        ? 'Tous les outils pour gérer votre salon, vos employés et vos rendez-vous'
        : 'Une expérience unique pour prendre soin de vous');

    return (
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              {featuresTitle}
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              {featuresSubtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bento-card p-8 flex flex-col items-center text-center group hover:scale-105 transition-transform duration-300">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  // Rendu des Produits
  const renderProducts = () => {
    if (!shouldShowProducts()) return null;

    return (
      <section className="py-16 bg-muted/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              {homeSettings?.products_title || 'Nos produits populaires'}
            </h2>
            <p className="text-muted-foreground mt-2">
              {homeSettings?.products_subtitle || 'Découvrez les produits préférés de nos clients'}
            </p>
          </div>
          <ProductsList limit={homeSettings?.products_limit || 8} showFilters={false} />
        </div>
      </section>
    );
  };

  // Rendu du CTA
  const renderCTA = () => {
    if (!shouldShowCTA()) return null;

    const bgType = isSuperAdmin ? platformConfig.get?.('cta.background_type') : homeSettings?.cta_background_type || 'gradient';
    let bgImage = isSuperAdmin ? platformConfig.get?.('cta.background_image') : homeSettings?.cta_background_image || tenantSettings?.cover_image || userTenant?.cover_image;
    
    const bgColor = isSuperAdmin ? platformConfig.get?.('cta.background_color') : homeSettings?.cta_background_color || primaryColor;

    let bgStyle = {};
    if (bgType === 'image' && bgImage) {
      bgStyle = {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    } else if (bgType === 'color') {
      bgStyle = { backgroundColor: bgColor };
    } else {
      bgStyle = {
        background: `linear-gradient(135deg, ${bgColor}dd, ${bgColor}99)`
      };
    }

    return (
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0" style={bgStyle} />
        {bgType === 'image' && (
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        )}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05]" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            {getCTATitle()}
          </h2>
          <p className="text-white/90 mb-8 text-lg">
            {getCTASubtitle()}
          </p>
          <Button 
            size="lg" 
            asChild 
            className="h-12 px-8 shadow-lg hover:shadow-xl transition-all"
            style={{ 
              backgroundColor: '#ffffff',
              color: bgColor,
              boxShadow: '0 4px 16px -4px rgba(0, 0, 0, 0.2)'
            }}
          >
            <Link to={getCTAButtonLink()}>
              {getCTAButtonText()}
              {isAuthenticated && <ArrowRight className="h-5 w-5 ml-2" />}
            </Link>
          </Button>
        </div>
      </section>
    );
  };

  // ✅ Construction du Schema.org JSON-LD
  const getSchemaJson = () => {
    const baseSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": platformConfig.platformName || "BeautyFlow",
      "description": platformConfig.platformDescription || "Plateforme de gestion de salons de beauté",
      "url": "https://beautyflow.com",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://beautyflow.com/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    };

    if (isShowcase && activeTenant) {
      return {
        "@context": "https://schema.org",
        "@type": "BeautySalon",
        "name": activeTenant.name,
        "description": activeTenant.description || "Salon de beauté",
        "image": activeTenant.logo_url || activeTenant.cover_image,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": activeTenant.city || "Burkina Faso",
          "addressCountry": "BF"
        },
        "telephone": activeTenant.phone,
        "email": activeTenant.email,
        "url": `https://beautyflow.com/showcase/${activeTenant.slug}`
      };
    }

    return baseSchema;
  };

  // ✅ Données SEO
  const getSeoData = () => {
    if (isShowcase && activeTenant) {
      return {
        title: `${activeTenant.name} - BeautyFlow`,
        description: activeTenant.description || `Découvrez ${activeTenant.name}, votre salon de beauté.`,
        image: activeTenant.cover_image || activeTenant.logo_url || "/og-image.jpg",
        url: `/showcase/${activeTenant.slug}`,
        siteName: activeTenant.name,
      };
    }
    if (isSuperAdmin) {
      return {
        title: "Administration - BeautyFlow",
        description: "Gérez la plateforme BeautyFlow",
        image: "/og-image.jpg",
        url: "/super-admin/dashboard",
        siteName: "BeautyFlow",
      };
    }
    return {
      title: "BeautyFlow - Plateforme de gestion de salons de beauté",
      description: "La plateforme complète pour gérer votre salon de beauté, réserver des rendez-vous et fidéliser vos clients.",
      image: "/og-image.jpg",
      url: "/",
      siteName: "BeautyFlow",
    };
  };

  const seoData = getSeoData();

  return (
    <>
      <Helmet>
        <title>{seoData.title}</title>
        <meta name="description" content={seoData.description} />
        <meta name="keywords" content={isShowcase && activeTenant 
          ? `beauté, salon, ${activeTenant.name}, soins, bien-être, Burkina Faso` 
          : "beauté, salon, gestion, rendez-vous, fidélité, bien-être, Burkina Faso, Afrique"
        } />
        
        {/* Open Graph */}
        <meta property="og:title" content={seoData.title} />
        <meta property="og:description" content={seoData.description} />
        <meta property="og:image" content={seoData.image} />
        <meta property="og:url" content={`https://saloncenter.netlify.app${seoData.url}`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={seoData.siteName} />
        <meta property="og:locale" content="fr_FR" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoData.title} />
        <meta name="twitter:description" content={seoData.description} />
        <meta name="twitter:image" content={seoData.image} />
        
        {/* Canonical */}
        <link rel="canonical" href={`https://saloncenter.netlify.app${seoData.url}`} />
        
        {/* Theme color */}
        <meta name="theme-color" content={isShowcase && activeTenant?.primary_color ? activeTenant.primary_color : '#ec4899'} />
        
        {/* Robots */}
        <meta name="robots" content="index, follow" />
        
        {/* Schema.org JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify(getSchemaJson())}
        </script>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />

        <main className="flex-1">
          {renderHero()}

          {/* Salons partenaires */}
          {!isSuperAdmin && !isShowcase && (
            <section className="py-16 bg-muted/20">
              <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
                    <Building2 className="h-8 w-8 text-primary" />
                    {homeSettings?.partners_title || (isAdmin || isEmployee ? 'Mon salon' : 'Nos salons partenaires')}
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    {isAdmin ? (
                      homeSettings?.partners_subtitle || "Vous gérez ce salon. Accédez à votre espace administrateur pour le gérer."
                    ) : isEmployee ? (
                      homeSettings?.partners_subtitle || "Vous travaillez dans ce salon. Accédez à votre espace employé."
                    ) : isClient ? (
                      homeSettings?.partners_subtitle || "Retrouvez tous les salons disponibles près de chez vous"
                    ) : (
                      homeSettings?.partners_subtitle || "Cliquez sur un salon pour découvrir sa vitrine et réserver vos soins"
                    )}
                  </p>
                  {error && (
                    <p className="text-red-500 text-sm mt-2">⚠️ {error}</p>
                  )}
                </div>

                {tenantsLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {[...Array(isAdmin || isEmployee ? 1 : 6)].map((_, i) => (
                      <div key={i} className="flex flex-col items-center p-4 rounded-xl border bg-card animate-pulse">
                        <Skeleton className="w-20 h-20 rounded-full" />
                        <Skeleton className="h-4 w-24 mt-3" />
                        <Skeleton className="h-3 w-16 mt-2" />
                      </div>
                    ))}
                  </div>
                ) : displayTenants.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                    <p className="text-muted-foreground">
                      {isAdmin || isEmployee 
                        ? "Vous n'êtes pas encore associé à un salon"
                        : "Aucun salon partenaire disponible pour le moment"
                      }
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {isAdmin || isEmployee 
                        ? "Contactez l'équipe BeautyFlow pour configurer votre salon"
                        : "Revenez bientôt !"
                      }
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                      {displayTenants.map((tenant) => {
                        const tenantColor = tenant.primary_color || '#2563eb';
                        const initial = tenant.name?.charAt(0) || 'S';
                        
                        return (
                          <Link
                            key={tenant.id}
                            to={`/showcase/${tenant.slug}`}
                            className="group flex flex-col items-center p-5 rounded-2xl border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 relative overflow-hidden"
                          >
                            {tenant.subscription_plan === 'premium' && (
                              <div className="absolute top-2 right-2">
                                <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-none text-[10px] px-2 py-0.5">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Premium
                                </Badge>
                              </div>
                            )}

                            <div 
                              className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-primary transition-all duration-300 shadow-md group-hover:shadow-lg"
                              style={{ 
                                backgroundColor: tenant.logo_url ? 'transparent' : `${tenantColor}20`,
                                borderColor: tenant.logo_url ? 'transparent' : tenantColor
                              }}
                            >
                              {tenant.logo_url ? (
                                <img
                                  src={tenant.logo_url}
                                  alt={tenant.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-3xl font-bold" style={{ color: tenantColor }}>
                                  {initial}
                                </span>
                              )}
                            </div>

                            <span className="text-sm font-semibold mt-3 text-center group-hover:text-primary transition-colors line-clamp-1">
                              {tenant.name}
                            </span>

                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="h-3 w-3" />
                              <span>{tenant.city || tenant.address?.split(',')[0] || 'Ville'}</span>
                            </div>

                            <div className="flex items-center gap-1 mt-1.5">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-3 w-3 ${i < (tenant.rating || 4.5) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                                />
                              ))}
                              <span className="text-xs font-medium ml-0.5 text-muted-foreground">
                                {tenant.rating || 4.5}
                              </span>
                            </div>

                            <div className="mt-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-2">
                              <Badge variant="outline" className="gap-1 text-xs border-primary/50 text-primary">
                                <Eye className="h-3 w-3" />
                                {isAdmin || isEmployee ? 'Accéder' : 'Découvrir'}
                              </Badge>
                            </div>

                            {(isAdmin || isEmployee) && tenant.id === currentUser?.profile?.tenant_id && (
                              <Badge className="absolute bottom-2 left-2 bg-primary/10 text-primary text-[10px] border border-primary/20 gap-1">
                                <Shield className="h-3 w-3" />
                                Votre salon
                              </Badge>
                            )}
                          </Link>
                        );
                      })}
                    </div>

                    {homeSettings?.partners_show_button !== false && !isAdmin && !isEmployee && displayTenants.length > 0 && (
                      <div className="text-center mt-10">
                        <Button variant="outline" asChild className="gap-2 px-8 py-6 text-base hover:scale-105 transition-transform">
                          <Link to="/services">
                            {homeSettings?.partners_button_text || 'Voir tous les salons'} <ChevronRight className="h-5 w-5" />
                          </Link>
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          )}

          {renderFeatures()}
          {renderProducts()}
          {renderCTA()}
        </main>

        <PublicFooter />
        <FloatingAiChat endpointUrl="/integrated-ai/stream-public" />
      </div>
    </>
  );
}