// /src/pages/ServicesPage.jsx
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import PublicHeader from '@/components/PublicHeader.jsx';
import PublicFooter from '@/components/PublicFooter.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveTenant } from '@/contexts/ActiveTenantContext';
import { usePlatformConfig } from '@/contexts/PlatformConfigContext';
import { 
  Scissors, 
  AlertCircle, 
  RefreshCcw, 
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  Star,
  ArrowRight,
  Building2,
  Search,
  Grid,
  List,
  Crown,
  Eye,
  Shield,
  Store,
  Phone,
  Mail,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

// ✅ Mapping des catégories pour les labels français
const CATEGORY_LABELS = {
  'Hair Care': 'Soins Cheveux',
  'Skincare': 'Soins Visage',
  'Makeup': 'Maquillage',
  'Accessories': 'Accessoires',
  'Nail Care': 'Soins Ongles',
  'Body Care': 'Soins Corps',
  'Other': 'Autre',
};

const getCategoryLabel = (value) => {
  if (!value) return 'Général';
  return CATEGORY_LABELS[value] || value;
};

// ========== COMPOSANT : SERVICE CARD ==========
const ServiceCard = ({ service, tenantSlug }) => {
  const [imageError, setImageError] = useState(false);
  const hasImage = service.image_url && !imageError;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-md hover:shadow-2xl transition-all duration-300"
    >
      <div className="relative h-52 md:h-60 overflow-hidden bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/10">
        {hasImage ? (
          <img
            src={service.image_url}
            alt={service.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/10">
            <span className="text-7xl md:text-8xl mb-2">
              {service.icon_emoji || "✂️"}
            </span>
            <span className="text-xs text-muted-foreground">Aucune image</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="absolute bottom-4 left-4">
          <div className="flex items-center gap-1.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl px-3.5 py-2 shadow-lg border border-white/20">
            <DollarSign className="h-3.5 w-3.5 text-primary" />
            <span className="font-bold text-base md:text-lg">
              {service.price.toLocaleString()} FCFA
            </span>
          </div>
        </div>

        <div className="absolute top-4 right-4">
          <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md rounded-xl px-3 py-1.5 text-white text-xs md:text-sm border border-white/10">
            <Clock className="h-3.5 w-3.5" />
            {service.duration} min
          </div>
        </div>

        {service.salon_type === "premium" && (
          <div className="absolute top-4 left-4">
            <span className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
              <Crown className="h-3 w-3 fill-white" />
              Premium
            </span>
          </div>
        )}
      </div>

      <div className="p-4 md:p-5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg md:text-xl font-bold leading-tight truncate">
              {service.name}
            </h3>
            {service.category && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {getCategoryLabel(service.category)}
              </span>
            )}
          </div>
        </div>

        {service.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {service.description}
          </p>
        )}

        <Link
          to={`/booking/tenant/${tenantSlug}?service=${service.id}`}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-95"
        >
          <Calendar className="h-4 w-4" />
          Réserver ce service
        </Link>
      </div>
    </motion.div>
  );
};

// ========== COMPOSANT : SALON CARD ==========
const SalonCard = ({ tenant, isSelected, onSelect, isUserTenant }) => {
  const initial = tenant.name?.charAt(0) || 'S';
  const color = tenant.primary_color || '#2563eb';
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`cursor-pointer rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
        isSelected 
          ? 'border-primary shadow-lg shadow-primary/20 bg-primary/5' 
          : 'border-transparent hover:border-primary/30 hover:shadow-md bg-card'
      }`}
      onClick={() => onSelect(tenant)}
    >
      <div className="p-4 flex items-center gap-4">
        <div 
          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: tenant.logo_url ? 'transparent' : `${color}20` }}
        >
          {tenant.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-2xl font-bold" style={{ color }}>
              {initial}
            </span>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold truncate">{tenant.name}</h3>
            {tenant.subscription_plan === 'premium' && (
              <Crown className="h-4 w-4 text-amber-500" />
            )}
            {isSelected && (
              <Badge className="bg-primary text-white border-0 text-xs">
                Sélectionné
              </Badge>
            )}
            {isUserTenant && (
              <Badge variant="outline" className="text-xs gap-1 border-primary/50 text-primary">
                <Shield className="h-3 w-3" />
                Votre salon
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {tenant.city && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                {tenant.city}
              </span>
            )}
            <span>•</span>
            <div className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{tenant.rating || '4.5'}</span>
            </div>
          </div>
        </div>
        
        {isSelected && (
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        )}
      </div>
    </motion.div>
  );
};

// ========== PAGE PRINCIPALE ==========
export default function ServicesPage() {
  const [searchParams] = useSearchParams();
  const { slug } = useParams();
  const serviceId = searchParams.get('service');
  
  const { currentUser, isAuthenticated, userRole, userTenantId } = useAuth();
  const { activeTenant, isShowcase, tenantId: activeTenantId } = useActiveTenant();
  const platformConfig = usePlatformConfig();
  
  const [allTenants, setAllTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [tenantSearchTerm, setTenantSearchTerm] = useState('');
  const [tenantInfo, setTenantInfo] = useState(null);

  // ✅ Déterminer le type d'utilisateur
  const isSuperAdmin = userRole === 'super_admin';
  const isTenantStaff = userRole === 'employee' || userRole === 'admin';
  const isTenantClient = userRole === 'client';
  const isUserAssociatedWithTenant = !isSuperAdmin && userTenantId && (isTenantStaff || isTenantClient);

  // ✅ Déterminer si on est en mode showcase ou général
  const isShowcaseMode = isShowcase && slug;
  const currentTenant = isShowcaseMode ? activeTenant : selectedTenant;

  // ✅ Récupérer les données
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 📌 Cas 1: Mode showcase
        if (isShowcaseMode && activeTenant) {
          setSelectedTenant(activeTenant);
          await fetchServicesForTenant(activeTenant.id);
          await fetchTenantInfo(activeTenant.id);
          setAllTenants([activeTenant]);
          setLoading(false);
          return;
        }

        // 📌 Cas 2: Utilisateur associé à un salon (admin, employee, client)
        if (isAuthenticated && isUserAssociatedWithTenant && userTenantId) {
          // Récupérer uniquement le salon de l'utilisateur
          const { data: tenantData, error: tenantError } = await supabase
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
            .eq('id', userTenantId)
            .single();

          if (tenantError) throw tenantError;

          if (tenantData) {
            setAllTenants([tenantData]);
            setSelectedTenant(tenantData);
            await fetchServicesForTenant(tenantData.id);
            await fetchTenantInfo(tenantData.id);
          } else {
            setAllTenants([]);
            setSelectedTenant(null);
            setServices([]);
          }
          setLoading(false);
          return;
        }

        // 📌 Cas 3: Super Admin ou utilisateur non connecté ou sans tenant
        // Afficher tous les salons
        await fetchAllTenants();

      } catch (err) {
        console.error('❌ Error fetching data:', err);
        setError('Impossible de charger les données. Veuillez réessayer plus tard.');
        setLoading(false);
      }
    };

    fetchData();
  }, [isShowcase, activeTenant, slug, isAuthenticated, userRole, userTenantId, isUserAssociatedWithTenant]);

  const fetchTenantInfo = async (tenantId) => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (!error && data) {
        setTenantInfo(data);
      }
    } catch (error) {
      console.error("Error fetching tenant:", error);
    }
  };

  const fetchAllTenants = async () => {
    setLoading(true);
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

      setAllTenants(data || []);
      
      // Sélectionner le premier salon par défaut
      if (data && data.length > 0) {
        const firstTenant = data[0];
        setSelectedTenant(firstTenant);
        await fetchServicesForTenant(firstTenant.id);
        await fetchTenantInfo(firstTenant.id);
      }
      
    } catch (err) {
      console.error('❌ Error fetching tenants:', err);
      setError('Impossible de charger les salons. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  };

  const fetchServicesForTenant = async (tenantId) => {
    try {
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (servicesError) throw servicesError;

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('type', 'service')
        .order('name', { ascending: true });

      if (categoriesError) {
        console.error('❌ Erreur lors de la récupération des catégories:', categoriesError);
      }

      const categoryMap = {};
      (categoriesData || []).forEach(cat => {
        categoryMap[cat.id] = cat.name;
      });

      const formattedServices = (servicesData || []).map(service => ({
        id: service.id,
        name: service.name || 'Service sans nom',
        description: service.description || '',
        duration: service.duration || 30,
        price: service.price || 0,
        is_active: service.is_active !== undefined ? service.is_active : true,
        category: service.category_id ? categoryMap[service.category_id] : (service.category || 'Général'),
        category_id: service.category_id,
        icon_emoji: service.icon_emoji || '✂️',
        salon_type: service.salon_type || 'standard',
        image_url: service.image_url || service.cover_image || null,
        display_order: service.display_order || 0,
        created_at: service.created_at,
      }));

      setServices(formattedServices);
      setCategories(categoriesData || []);
      
    } catch (err) {
      console.error('❌ Error fetching services:', err);
      toast.error('Impossible de charger les services de ce salon');
    }
  };

  const handleTenantSelect = async (tenant) => {
    setSelectedTenant(tenant);
    setActiveCategory('all');
    setSearchTerm('');
    await fetchServicesForTenant(tenant.id);
    await fetchTenantInfo(tenant.id);
  };

  // ✅ Filtrer les services
  const filteredServices = services.filter(service => {
    if (activeCategory !== 'all' && service.category !== activeCategory) {
      return false;
    }
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matchName = service.name.toLowerCase().includes(term);
      const matchDescription = service.description?.toLowerCase().includes(term);
      const matchCategory = service.category?.toLowerCase().includes(term);
      if (!matchName && !matchDescription && !matchCategory) {
        return false;
      }
    }
    
    return true;
  });

  const filteredTenants = allTenants.filter(tenant => 
    tenant.name.toLowerCase().includes(tenantSearchTerm.toLowerCase())
  );

  // ✅ Vérifier si on doit cacher la liste des salons (pour les utilisateurs associés à un salon)
  const shouldHideTenantList = isAuthenticated && isUserAssociatedWithTenant;

  // ✅ Rendu du mode showcase
  if (isShowcaseMode && currentTenant) {
    return renderShowcaseMode();
  }

  // ✅ Rendu du mode général
  return renderGeneralMode();

  // ========== MODE SHOWCASE ==========
  function renderShowcaseMode() {
    const displayName = currentTenant?.name || platformConfig.platformName;

    return (
      <>
        <Helmet>
          <title>Services - {displayName}</title>
          <meta name="description" content={currentTenant?.description || `Découvrez tous les services proposés par ${displayName}.`} />
          <meta property="og:title" content={`Services - ${displayName}`} />
          <meta property="og:description" content={currentTenant?.description || `Découvrez les services de ${displayName}.`} />
          <meta property="og:image" content={currentTenant?.cover_image || currentTenant?.logo_url || '/og-image.jpg'} />
          <link rel="canonical" href={`https://beautyflow.com/showcase/${currentTenant?.slug}/services`} />
        </Helmet>
        
        <PublicHeader />
        
        <main className="min-h-screen bg-background">
          {/* Hero */}
          <section className="relative overflow-hidden py-16 bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/5">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
            <div className="relative z-10 mx-auto max-w-7xl px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
                  Services - {displayName}
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  {currentTenant?.description || 'Des soins professionnels adaptés à votre style unique'}
                </p>
                {currentTenant?.address && (
                  <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {currentTenant.address}
                    </span>
                    {currentTenant?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {currentTenant.phone}
                      </span>
                    )}
                    {currentTenant?.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {currentTenant.email}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          </section>

          {/* Services */}
          <section className="py-8">
            <div className="mx-auto max-w-7xl px-6">
              {renderServicesList()}
            </div>
          </section>

          {/* CTA */}
          <section className="py-20 bg-muted/30">
            <div className="mx-auto max-w-4xl px-6 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <h2 className="text-2xl font-bold sm:text-3xl mb-4">
                  Vous ne trouvez pas ce que vous cherchez ?
                </h2>
                <p className="text-muted-foreground mb-6">
                  Contactez-nous pour un service personnalisé adapté à vos besoins.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Button asChild size="lg">
                    <Link to={`/showcase/${currentTenant?.slug}/contact`}>Nous contacter</Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link to={`/showcase/${currentTenant?.slug}`}>
                      Retour au salon <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <PublicFooter />
      </>
    );
  }

  // ========== MODE GÉNÉRAL ==========
  function renderGeneralMode() {
    const isAssociated = isAuthenticated && isUserAssociatedWithTenant;
    const displayTitle = isAssociated ? `Services - ${selectedTenant?.name || 'Mon Salon'}` : 'Nos Services';
    const displayDescription = isAssociated 
      ? `Gérez les services de votre salon ${selectedTenant?.name}` 
      : 'Des soins professionnels adaptés à votre style unique';

    return (
      <>
        <Helmet>
          <title>{displayTitle} - BeautyFlow</title>
          <meta name="description" content={displayDescription} />
          <link rel="canonical" href="https://beautyflow.com/services" />
        </Helmet>
        
        <PublicHeader />
        
        <main className="min-h-screen bg-background">
          {/* Hero */}
          <section className="relative overflow-hidden py-16 bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/5">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
            <div className="relative z-10 mx-auto max-w-7xl px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
                  {displayTitle}
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  {displayDescription}
                </p>
                {isAssociated && selectedTenant && (
                  <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground flex-wrap">
                    <Badge variant="outline" className="bg-primary/10">
                      <Shield className="h-3 w-3 mr-1" />
                      {userRole === 'admin' ? 'Administrateur' : userRole === 'client' ? 'Client' : 'Employé'}
                    </Badge>
                    {selectedTenant.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {selectedTenant.address}
                      </span>
                    )}
                  </div>
                )}
                {isSuperAdmin && (
                  <Badge className="mt-3 gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                    <Crown className="h-3 w-3" /> Super Admin - Tous les salons disponibles
                  </Badge>
                )}
                {!isAuthenticated && (
                  <Badge className="mt-3 gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
                    <Eye className="h-3 w-3" /> Mode invité - Tous les salons disponibles
                  </Badge>
                )}
              </motion.div>
            </div>
          </section>

          {/* Salons et Services */}
          <section className="py-8">
            <div className="mx-auto max-w-7xl px-6">
              {error ? (
                <div className="text-center py-16 bg-muted/20 rounded-3xl border max-w-xl mx-auto">
                  <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
                  <p className="text-lg font-medium text-foreground mb-4">{error}</p>
                  <Button onClick={fetchAllTenants} variant="outline" className="gap-2">
                    <RefreshCcw className="h-4 w-4" /> Réessayer
                  </Button>
                </div>
              ) : loading ? (
                <LoadingSkeleton />
              ) : allTenants.length === 0 ? (
                <div className="text-center py-16">
                  <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                  <p className="text-muted-foreground">
                    {isAssociated ? 'Vous n\'êtes associé à aucun salon.' : 'Aucun salon disponible'}
                  </p>
                </div>
              ) : (
                <>
                  {/* ✅ Afficher la liste des salons seulement si l'utilisateur n'est PAS associé à un salon */}
                  {!shouldHideTenantList && (
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-primary" />
                          Nos salons partenaires
                          <Badge variant="secondary" className="ml-2">
                            {allTenants.length}
                          </Badge>
                        </h2>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Rechercher un salon..."
                            value={tenantSearchTerm}
                            onChange={(e) => setTenantSearchTerm(e.target.value)}
                            className="pl-10 w-48 md:w-64 h-9 text-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {filteredTenants.map((tenant) => (
                          <SalonCard
                            key={tenant.id}
                            tenant={tenant}
                            isSelected={selectedTenant?.id === tenant.id}
                            onSelect={handleTenantSelect}
                            isUserTenant={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Services du salon sélectionné */}
                  {selectedTenant && (
                    <div className="mt-8">
                      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                        <div>
                          <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Scissors className="h-6 w-6 text-primary" />
                            Services disponibles
                            <Badge variant="secondary" className="ml-2">
                              {services.length}
                            </Badge>
                          </h2>
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {selectedTenant.name}
                            {selectedTenant.address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {selectedTenant.address}
                              </span>
                            )}
                            {isAssociated && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                {userRole === 'admin' ? 'Admin' : userRole === 'client' ? 'Client' : 'Employé'}
                              </Badge>
                            )}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Rechercher un service..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10 w-48 md:w-64 h-9 text-sm"
                            />
                          </div>
                          <div className="flex border rounded-lg overflow-hidden">
                            <Button
                              variant={viewMode === 'grid' ? 'default' : 'ghost'}
                              size="sm"
                              className="rounded-none h-9"
                              onClick={() => setViewMode('grid')}
                            >
                              <Grid className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={viewMode === 'list' ? 'default' : 'ghost'}
                              size="sm"
                              className="rounded-none h-9"
                              onClick={() => setViewMode('list')}
                            >
                              <List className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {renderServicesList()}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* CTA - Cacher pour les utilisateurs associés à un salon */}
          {!shouldHideTenantList && (
            <section className="py-20 bg-muted/30">
              <div className="mx-auto max-w-4xl px-6 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-2xl font-bold sm:text-3xl mb-4">
                    Vous ne trouvez pas ce que vous cherchez ?
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Contactez-nous pour un service personnalisé adapté à vos besoins.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    <Button asChild size="lg">
                      <Link to="/contact">Nous contacter</Link>
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                      <Link to="/">
                        Retour à l'accueil <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </motion.div>
              </div>
            </section>
          )}
        </main>

        <PublicFooter />
      </>
    );
  }

  // ========== COMPOSANT : LISTE DES SERVICES ==========
  function renderServicesList() {
    if (loading) {
      return <LoadingSkeleton />;
    }

    if (services.length === 0) {
      return (
        <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed">
          <Scissors className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-lg text-muted-foreground">
            Aucun service disponible pour ce salon.
          </p>
          {isUserAssociatedWithTenant && (
            <p className="text-sm text-muted-foreground mt-2">
              Ajoutez des services depuis votre espace administrateur.
            </p>
          )}
        </div>
      );
    }

    return (
      <>
        {/* Catégories */}
        {categories.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory('all')}
                className="rounded-full"
              >
                Tous ({services.length})
              </Button>
              {categories.map(cat => {
                const count = services.filter(s => s.category === cat.name).length;
                return (
                  <Button
                    key={cat.id}
                    variant={activeCategory === cat.name ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveCategory(cat.name)}
                    className="rounded-full"
                  >
                    {getCategoryLabel(cat.name)} ({count})
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {filteredServices.length === 0 ? (
          <div className="text-center py-12 bg-muted/10 rounded-3xl border border-dashed">
            <Search className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg text-muted-foreground">
              Aucun service ne correspond à votre recherche
            </p>
            <Button variant="link" onClick={() => setSearchTerm('')}>
              Effacer la recherche
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredServices.map((service, idx) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
              >
                <ServiceCard 
                  service={service} 
                  tenantSlug={isShowcaseMode ? currentTenant?.slug : selectedTenant?.slug}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredServices.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between p-4 bg-card rounded-xl border hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/10 to-secondary/10">
                    {service.image_url ? (
                      <img
                        src={service.image_url}
                        alt={service.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl">{service.icon_emoji || '✂️'}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold">{service.name}</h3>
                    {service.category && (
                      <Badge variant="outline" className="text-xs">
                        {getCategoryLabel(service.category)}
                      </Badge>
                    )}
                    {service.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {service.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="font-bold text-primary">
                      {service.price.toLocaleString()} FCFA
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3" />
                      {service.duration} min
                    </div>
                  </div>
                  <Link
                    to={`/booking/tenant/${isShowcaseMode ? currentTenant?.slug : selectedTenant?.slug}?service=${service.id}`}
                    className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Voir
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  // ========== COMPOSANT : LOADING SKELETON ==========
  function LoadingSkeleton() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="rounded-2xl overflow-hidden">
              <Skeleton className="h-56 w-full" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}