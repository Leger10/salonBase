// /src/pages/PricingPage.jsx
import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import PublicHeader from "@/components/PublicHeader.jsx";
import PublicFooter from "@/components/PublicFooter.jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Link } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { Clock, AlertCircle, RefreshCcw, Scissors, Sparkles, Heart } from "lucide-react";
import { toast } from "sonner";
import { useTenantId } from "@/hooks/useTenantId.js";

export default function PricingPage() {
  const { tenantId, loading: tenantLoading } = useTenantId();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantName, setTenantName] = useState('BeautyFlow');

  // Récupérer le nom du tenant
  useEffect(() => {
    const fetchTenantName = async () => {
      if (!tenantId) return;
      
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', tenantId)
          .single();
        
        if (!error && data) {
          setTenantName(data.name);
        }
      } catch (error) {
        console.error('Error fetching tenant name:', error);
      }
    };
    
    fetchTenantName();
  }, [tenantId]);

  const fetchServices = async () => {
    if (!tenantId) {
      setServices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          categories!category_id (
            id,
            name,
            type
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;

      setServices(data || []);
    } catch (err) {
      console.error("Error fetching services:", err);
      setError("Impossible de charger les tarifs. Veuillez réessayer plus tard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!tenantLoading) {
      fetchServices();
    }
  }, [tenantId, tenantLoading]);

  const groupedServices = services.reduce((acc, service) => {
    const category = service.categories?.name || service.salon_type || "Autres Services";
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {});

  const sortedCategories = Object.keys(groupedServices).sort();

  const getCategoryIcon = (category) => {
    const icons = {
      'Coiffure': <Scissors className="h-6 w-6" />,
      'Beauté': <Sparkles className="h-6 w-6" />,
      'SPA': <Heart className="h-6 w-6" />,
      'Onglerie': <Sparkles className="h-6 w-6" />
    };
    return icons[category] || <Scissors className="h-6 w-6" />;
  };

  if (tenantLoading || loading) {
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
      <Helmet>
        <title>Nos Tarifs - {tenantName}</title>
        <meta name="description" content={`Tarification transparente pour tous nos services chez ${tenantName}.`} />
      </Helmet>
      
      <PublicHeader />

      <main className="min-h-screen">
        <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
          <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
                Nos Tarifs
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Des prix transparents sans frais cachés. Un service de qualité à des prix justes.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-7xl px-6">
            {error ? (
              <div className="text-center py-16 bg-muted/20 rounded-3xl border max-w-xl mx-auto">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <p className="text-lg font-medium text-foreground mb-4">{error}</p>
                <Button onClick={fetchServices} variant="outline" className="gap-2">
                  <RefreshCcw className="h-4 w-4" /> Réessayer
                </Button>
              </div>
            ) : Object.keys(groupedServices).length === 0 ? (
              <div className="text-center py-16">
                <Scissors className="mx-auto h-16 w-16 text-muted-foreground mb-4 opacity-30" />
                <p className="text-xl font-medium text-muted-foreground">
                  Aucun tarif disponible pour le moment.
                </p>
              </div>
            ) : (
              <div className="space-y-16">
                {sortedCategories.map((category, idx) => (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                  >
                    <div className="flex items-center gap-4 mb-8 border-b pb-4">
                      <div className="p-2 bg-primary/10 rounded-xl text-primary">
                        {getCategoryIcon(category)}
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold capitalize">
                        {category}
                      </h2>
                      <Badge variant="secondary" className="rounded-full">
                        {groupedServices[category].length} services
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {groupedServices[category].map((service) => (
                        <Card
                          key={service.id}
                          className="group hover:shadow-lg transition-all duration-300 rounded-2xl border-border/50 hover:border-primary/30"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <CardTitle className="text-xl text-balance group-hover:text-primary transition-colors">
                                  {service.name}
                                </CardTitle>
                                {service.description && (
                                  <CardDescription className="mt-2 line-clamp-2">
                                    {service.description}
                                  </CardDescription>
                                )}
                              </div>
                              {service.icon_emoji && (
                                <span className="text-3xl bg-muted/50 p-2 rounded-xl shrink-0">
                                  {service.icon_emoji}
                                </span>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="mt-auto pt-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">
                                  {service.duration} min
                                </span>
                              </div>
                              <span className="text-2xl font-black text-primary">
                                {service.price.toLocaleString()} FCFA
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
          <div className="mx-auto max-w-4xl px-6 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold sm:text-4xl mb-6">
                Prêt(e) à réserver ?
              </h2>
              <p className="text-lg text-primary-foreground/90 mb-10 leading-relaxed">
                Prenez rendez-vous dès aujourd'hui et découvrez la différence.
                Notre équipe d'experts est prête à vous sublimer.
              </p>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="px-10 h-14 text-lg hover:bg-white hover:text-primary transition-colors"
              >
                <Link to="/booking">Réserver un Rendez-vous</Link>
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}