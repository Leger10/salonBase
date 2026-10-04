// /src/pages/AboutPage.jsx
import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";
import PublicHeader from "@/components/PublicHeader.jsx";
import PublicFooter from "@/components/PublicFooter.jsx";
import { useMetaTags } from "@/utils/seo.js";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/contexts/AuthContext.jsx";
import { useActiveTenant } from "@/contexts/ActiveTenantContext.jsx";
import { usePlatformConfig } from "@/contexts/PlatformConfigContext.jsx";
import { 
  Award, Heart, Users, Sparkles, 
  Calendar, MessageSquare, Star, Gift, 
  CreditCard, BarChart3, Package, Building2,
  Wrench, Smartphone, Globe, Scissors,
  CheckCircle, ArrowRight, ShoppingBag, Receipt
} from "lucide-react";

export default function AboutPage() {
  const { isAuthenticated, currentUser } = useAuth();
  const { activeTenant, isShowcase } = useActiveTenant();
  const platformConfig = usePlatformConfig();
  const [tenantData, setTenantData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Déterminer le tenant à utiliser
  const userRole = currentUser?.profile?.role || currentUser?.role;
  const isAdmin = isAuthenticated && (userRole === 'admin' || userRole === 'employee');
  const tenantId = isShowcase ? activeTenant?.id : 
    (isAdmin ? currentUser?.profile?.tenant_id : null);

  // Récupérer les infos du tenant
  useEffect(() => {
    const fetchTenant = async () => {
      if (!tenantId) {
        setTenantData(null);
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', tenantId)
          .single();
        
        if (!error && data) {
          setTenantData(data);
        }
      } catch (error) {
        console.error('Error fetching tenant:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTenant();
  }, [tenantId]);

  // ✅ Déterminer les données à afficher
  const getDisplayData = () => {
    // Mode showcase ou admin connecté : utiliser les données du tenant
    if (isShowcase && activeTenant) {
      return {
        name: activeTenant.name,
        description: activeTenant.description || 'Votre salon de beauté et bien-être.',
        primaryColor: activeTenant.primary_color || platformConfig.primaryColor,
        logo: activeTenant.logo_url,
        isSalon: true,
      };
    }

    if (isAdmin && tenantData) {
      return {
        name: tenantData.name,
        description: tenantData.description || platformConfig.platformDescription,
        primaryColor: tenantData.primary_color || platformConfig.primaryColor,
        logo: tenantData.logo_url,
        isSalon: true,
      };
    }

    // Mode général : utiliser la config de la plateforme
    return {
      name: platformConfig.platformName,
      description: platformConfig.platformDescription,
      primaryColor: platformConfig.primaryColor,
      logo: platformConfig.logoUrl,
      isSalon: false,
    };
  };

  const displayData = getDisplayData();
  const tenantName = displayData.name;
  const tenantDescription = displayData.description;
  const primaryColor = displayData.primaryColor;

  const metaTags = useMetaTags({
    title: `À Propos de ${tenantName}`,
    description: tenantDescription,
    keywords: "logiciel salon beauté, gestion salon, réservation en ligne, fidélité client",
  });

  const values = [
    {
      icon: Award,
      title: "Qualité & Excellence",
      description: "Nous visons la perfection dans chaque prestation, en utilisant des produits premium et des techniques avancées.",
    },
    {
      icon: Heart,
      title: "Passion & Écoute",
      description: "Notre équipe est passionnée par la beauté et dévouée à vous écouter pour vous faire sentir rayonnant(e).",
    },
    {
      icon: Users,
      title: "Professionnalisme",
      description: "Nous construisons des relations durables avec nos clients, en offrant un accueil chaleureux et irréprochable.",
    },
    {
      icon: Sparkles,
      title: "Innovation",
      description: "Nous anticipons les tendances, en nous formant continuellement aux dernières méthodes et technologies.",
    },
  ];

  const features = [
    {
      icon: Globe,
      title: "Réservation en ligne & Site web",
      description: "Permettez à vos clients de réserver 24h/24, 7j/7 depuis votre site web personnalisé.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: Smartphone,
      title: "Application mobile",
      description: "Gérez votre salon depuis votre smartphone, où que vous soyez.",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: Calendar,
      title: "Plannings",
      description: "Gérez les plannings de votre équipe en temps réel avec une vue d'ensemble claire.",
      color: "from-green-500 to-green-600"
    },
    {
      icon: Receipt,
      title: "Encaissement",
      description: "Enregistrez les paiements, gérez les transactions et suivez vos revenus en temps réel.",
      color: "from-emerald-500 to-emerald-600"
    },
    {
      icon: MessageSquare,
      title: "Communication & Marketing",
      description: "Campagnes email, SMS et notifications pour fidéliser vos clients.",
      color: "from-pink-500 to-pink-600"
    },
    {
      icon: Star,
      title: "Fidélité & Relation client",
      description: "Programme de fidélité, points de récompense et gestion des avis clients.",
      color: "from-yellow-500 to-yellow-600"
    },
    {
      icon: ShoppingBag,
      title: "Cures & Abonnements",
      description: "Proposez des forfaits et abonnements à vos clients pour une fidélisation accrue.",
      color: "from-indigo-500 to-indigo-600"
    },
    {
      icon: Gift,
      title: "Cartes cadeaux",
      description: "Créez et gérez des cartes cadeaux personnalisées pour vos clients.",
      color: "from-rose-500 to-rose-600"
    },
    {
      icon: BarChart3,
      title: "Suivi et pilotage d'activité",
      description: "Analytique avancée, rapports et indicateurs de performance pour piloter votre salon.",
      color: "from-orange-500 to-orange-600"
    },
    {
      icon: Package,
      title: "Gestion du stock",
      description: "Suivez vos produits, gérez les alertes de stock et optimisez vos commandes.",
      color: "from-teal-500 to-teal-600"
    },
    {
      icon: Building2,
      title: "Multi-établissement",
      description: "Gérez plusieurs succursales depuis une interface unique et centralisée.",
      color: "from-cyan-500 to-cyan-600"
    },
    {
      icon: Wrench,
      title: "Matériel & services",
      description: "Gérez votre équipement, suivez la maintenance et optimisez vos ressources.",
      color: "from-slate-500 to-slate-600"
    }
  ];

  if (loading) {
    return (
      <>
        <PublicHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <PublicFooter />
      </>
    );
  }

  return (
    <>
      <Helmet {...metaTags} />
      <PublicHeader />

      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20" />
          <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary mb-6">
                <Sparkles className="h-4 w-4" />
                <span>{displayData.isSalon ? 'Salon de Beauté' : '🚀 Logiciel Tout-en-Un pour Salons de Beauté'}</span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl mb-4 text-balance">
                À Propos de{" "}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {tenantName}
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-balance">
                {tenantDescription}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Histoire & Mission */}
        <section className="py-20">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-3xl font-bold mb-6" style={{ color: primaryColor }}>
                  Notre Histoire
                </h2>
                <div className="prose prose-lg max-w-none text-foreground">
                  <p className="leading-relaxed mb-4">
                    {displayData.isSalon ? (
                      <>
                        <strong>{tenantName}</strong> est né d'une vision simple : 
                        créer un espace où la beauté, la créativité et un service 
                        exceptionnel se rejoignent en parfaite harmonie.
                      </>
                    ) : (
                      <>
                        Fondé en 2020, <strong>{tenantName}</strong> est né d'une vision simple : 
                        créer un écosystème complet où la beauté, la créativité et un service 
                        exceptionnel se rejoignent en parfaite harmonie.
                      </>
                    )}
                  </p>
                  <p className="leading-relaxed mb-4">
                    {displayData.isSalon ? (
                      <>
                        Ce qui a commencé comme un petit salon s'est développé 
                        pour devenir une référence dans le domaine de la beauté.
                      </>
                    ) : (
                      <>
                        Ce qui a commencé comme un petit salon de quartier s'est développé 
                        pour devenir une plateforme de référence, au service de milliers de 
                        clients et professionnels de la beauté.
                      </>
                    )}
                  </p>
                  <p className="leading-relaxed">
                    Aujourd'hui, <strong>{tenantName}</strong> est le partenaire de confiance 
                    de ceux qui veulent offrir une expérience client exceptionnelle.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-card rounded-3xl border border-border/50 p-8 shadow-sm"
              >
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4 bg-primary/5 rounded-xl">
                    <div className="text-3xl font-black" style={{ color: primaryColor }}>
                      {displayData.isSalon ? '100+' : '500+'}
                    </div>
                    <div className="text-xs text-muted-foreground">Clients satisfaits</div>
                  </div>
                  <div className="text-center p-4 bg-primary/5 rounded-xl">
                    <div className="text-3xl font-black" style={{ color: primaryColor }}>
                      {displayData.isSalon ? '1k+' : '10k+'}
                    </div>
                    <div className="text-xs text-muted-foreground">Rendez-vous réservés</div>
                  </div>
                  <div className="text-center p-4 bg-primary/5 rounded-xl">
                    <div className="text-3xl font-black" style={{ color: primaryColor }}>
                      98%
                    </div>
                    <div className="text-xs text-muted-foreground">Taux de satisfaction</div>
                  </div>
                  <div className="text-center p-4 bg-primary/5 rounded-xl">
                    <div className="text-3xl font-black" style={{ color: primaryColor }}>
                      4.9
                    </div>
                    <div className="text-xs text-muted-foreground">Note moyenne</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Notre Mission */}
        <section className="py-16 bg-muted/20">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-6" style={{ color: primaryColor }}>
                Notre Mission
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                {displayData.isSalon ? (
                  <>
                    Notre mission est de transformer votre apparence et votre confiance 
                    à travers des services de beauté exceptionnels. Nous sommes convaincus 
                    que chacun mérite de se sentir pleinement rayonnant.
                  </>
                ) : (
                  <>
                    Notre mission est de révolutionner la gestion des salons de beauté 
                    en offrant une plateforme complète et intuitive. Nous croyons que 
                    chaque salon mérite des outils performants pour se développer.
                  </>
                )}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Nos Valeurs */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4" style={{ color: primaryColor }}>
                Nos Valeurs
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
                Les principes fondamentaux qui guident chacune de nos actions
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, idx) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="text-center p-8 bg-card rounded-3xl border border-border/50 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
                    <value.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {value.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Fonctionnalités - Caché en mode salon */}
        {!displayData.isSalon && (
          <section className="py-24 bg-muted/20">
            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary mb-4">
                  <Sparkles className="h-4 w-4" />
                  <span>Fonctionnalités</span>
                </div>
                <h2 className="text-3xl font-bold mb-4">Toutes les fonctions pour développer votre business beauté</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
                  Un logiciel tout-en-un qui répond à tous vos besoins et accompagne votre développement
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {features.map((feature, idx) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                      className="bg-card rounded-2xl border border-border/50 p-6 hover:shadow-lg transition-all hover:-translate-y-1 group"
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-12 text-center">
                <Button asChild size="lg" className="gap-2" style={{ backgroundColor: primaryColor }}>
                  <Link to="/booking">
                    Découvrir toutes les fonctionnalités
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05]" />
          <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold sm:text-4xl mb-6">
                {displayData.isSalon 
                  ? `Prêt(e) à découvrir ${tenantName} ?`
                  : 'Prêt(e) à digitaliser votre salon ?'}
              </h2>
              <p className="text-lg text-primary-foreground/90 mb-10 leading-relaxed">
                {displayData.isSalon 
                  ? `Rejoignez des milliers de clients satisfaits qui ont déjà choisi ${tenantName} pour leurs soins beauté.`
                  : 'Rejoignez des milliers de salons qui ont déjà choisi BeautyFlow pour gérer leur activité.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" variant="secondary" className="px-8 text-lg hover:bg-white hover:text-primary transition-colors">
                  <Link to={displayData.isSalon ? `/booking/tenant/${tenantData?.slug || ''}` : "/auth/signup"}>
                    {displayData.isSalon ? 'Prendre rendez-vous' : 'Commencer gratuitement'}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 text-lg">
                  <Link to={displayData.isSalon ? `/showcase/${tenantData?.slug || ''}` : "/contact"}>
                    {displayData.isSalon ? 'Découvrir le salon' : 'Nous contacter'}
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