// /src/pages/ReviewsPage.jsx
import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import PublicHeader from "@/components/PublicHeader.jsx";
import PublicFooter from "@/components/PublicFooter.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Button } from "@/components/ui/button.jsx";
import { supabase } from '@/lib/supabase';
import { Star, MessageCircle, AlertCircle, RefreshCcw, Calendar, User, ThumbsUp } from "lucide-react";
import { useActiveTenant } from "@/contexts/ActiveTenantContext.jsx";
import { usePlatformConfig } from "@/contexts/PlatformConfigContext.jsx";

export default function ReviewsPage() {
  const { activeTenant, isShowcase } = useActiveTenant();
  const platformConfig = usePlatformConfig();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0, distribution: {} });
  const [pageTitle, setPageTitle] = useState('BeautyFlow');

  // ✅ Déterminer le tenant à utiliser
  const currentTenant = isShowcase ? activeTenant : null;
  const tenantId = currentTenant?.id || null;

  // ✅ Mettre à jour le titre
  useEffect(() => {
    if (isShowcase && activeTenant) {
      setPageTitle(activeTenant.name);
    } else {
      setPageTitle(platformConfig.platformName);
    }
  }, [isShowcase, activeTenant, platformConfig]);

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // ✅ Si pas de tenant en mode showcase, afficher un message
      if (isShowcase && !tenantId) {
        setReviews([]);
        setStats({ avgRating: 0, totalReviews: 0, distribution: {} });
        setLoading(false);
        return;
      }

      // ✅ En mode général, on pourrait afficher tous les avis ou un message
      if (!isShowcase) {
        // Mode général : afficher tous les avis de tous les salons
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('appointments')
          .select(`
            id,
            rating,
            review,
            created_at,
            client:client_id (
              id,
              profile:profile_id (
                full_name,
                avatar
              )
            ),
            employee:employee_id (
              id,
              employee_number,
              profile:profile_id (
                full_name
              )
            ),
            services (
              name
            ),
            tenant:tenant_id (
              name
            )
          `)
          .not('rating', 'is', null)
          .not('review', 'is', null)
          .order('created_at', { ascending: false })
          .limit(50);

        if (reviewsError) throw reviewsError;

        const formattedReviews = reviewsData.map(review => ({
          id: review.id,
          rating: review.rating,
          comment: review.review,
          created_at: review.created_at,
          client_name: review.client?.profile?.full_name || 'Client anonyme',
          client_avatar: review.client?.profile?.avatar,
          employee_name: review.employee?.profile?.full_name,
          service_name: review.services?.name,
          tenant_name: review.tenant?.name || 'Salon inconnu',
        }));

        setReviews(formattedReviews);

        const totalReviews = formattedReviews.length;
        const avgRating = totalReviews > 0
          ? formattedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
          : 0;

        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        formattedReviews.forEach(r => {
          distribution[r.rating] = (distribution[r.rating] || 0) + 1;
        });

        setStats({ avgRating, totalReviews, distribution });
        setLoading(false);
        return;
      }

      // ✅ Mode showcase : avis du salon spécifique
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('appointments')
        .select(`
          id,
          rating,
          review,
          created_at,
          client:client_id (
            id,
            profile:profile_id (
              full_name,
              avatar
            )
          ),
          employee:employee_id (
            id,
            employee_number,
            profile:profile_id (
              full_name
            )
          ),
          services (
            name
          )
        `)
        .eq('tenant_id', tenantId)
        .not('rating', 'is', null)
        .not('review', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (reviewsError) throw reviewsError;

      const formattedReviews = reviewsData.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.review,
        created_at: review.created_at,
        client_name: review.client?.profile?.full_name || 'Client anonyme',
        client_avatar: review.client?.profile?.avatar,
        employee_name: review.employee?.profile?.full_name,
        service_name: review.services?.name,
      }));

      setReviews(formattedReviews);

      const totalReviews = formattedReviews.length;
      const avgRating = totalReviews > 0
        ? formattedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      formattedReviews.forEach(r => {
        distribution[r.rating] = (distribution[r.rating] || 0) + 1;
      });

      setStats({ avgRating, totalReviews, distribution });
    } catch (err) {
      console.error("Error fetching reviews:", err);
      setError("Impossible de charger les avis. Veuillez réessayer plus tard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [tenantId, isShowcase]);

  const renderStars = (rating, size = "h-8 w-8") => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= rating
                ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const getRatingPercentage = (rating) => {
    if (stats.totalReviews === 0) return 0;
    return (stats.distribution[rating] / stats.totalReviews) * 100;
  };

  const ReviewCard = ({ review }) => {
    return (
      <div className="bg-card rounded-2xl p-6 border shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {review.client_avatar ? (
              <img
                src={review.client_avatar}
                alt={review.client_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <h3 className="font-semibold text-lg">{review.client_name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(review.created_at).toLocaleDateString('fr-FR')}
              </div>
            </div>
            {renderStars(review.rating, "h-4 w-4")}
            <p className="text-muted-foreground mt-3">{review.comment}</p>
            <div className="mt-3 pt-3 border-t text-sm text-muted-foreground flex flex-wrap gap-2">
              {review.service_name && <span>Service: {review.service_name}</span>}
              {review.employee_name && <span className="ml-3">Avec: {review.employee_name}</span>}
              {review.tenant_name && <span className="ml-3">Salon: {review.tenant_name}</span>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <>
        <PublicHeader />
        <div className="min-h-screen">
          <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-20">
            <div className="mx-auto max-w-7xl px-6 text-center">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
                Avis Clients
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {isShowcase ? `Découvrez les avis de nos clients` : `Découvrez les avis des clients`}
              </p>
            </div>
          </section>
          <section className="py-20">
            <div className="mx-auto max-w-7xl px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-48 w-full rounded-2xl" />
                ))}
              </div>
            </div>
          </section>
        </div>
        <PublicFooter />
      </>
    );
  }

  const displayName = isShowcase ? pageTitle : platformConfig.platformName;

  return (
    <>
      <Helmet>
        <title>Avis Clients - {displayName}</title>
        <meta name="description" content={`Découvrez ce que nos clients disent de leur expérience${isShowcase ? ` chez ${displayName}` : ''}.`} />
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
                Avis Clients
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                {isShowcase 
                  ? `Découvrez ce que nos clients satisfaits disent de ${displayName}`
                  : `Découvrez les avis des clients de ${displayName}`
                }
              </p>
            </motion.div>

            {!loading && !error && stats.totalReviews > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-background/60 backdrop-blur-sm border shadow-sm rounded-3xl p-8 max-w-md mx-auto"
              >
                {renderStars(Math.round(stats.avgRating), "h-10 w-10")}
                <div className="text-center mt-4">
                  <p className="text-5xl font-black text-primary mb-1">
                    {stats.avgRating.toFixed(1)}
                  </p>
                  <p className="text-muted-foreground font-medium">
                    Basé sur {stats.totalReviews} avis vérifiés
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {!loading && !error && stats.totalReviews > 0 && (
          <section className="py-12 border-b">
            <div className="mx-auto max-w-7xl px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-16">
                        <span className="text-sm font-medium">{rating}</span>
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      </div>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${getRatingPercentage(rating)}%` }}
                        />
                      </div>
                      <div className="w-12 text-sm text-muted-foreground">
                        {stats.distribution[rating]}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-center justify-center text-center">
                  <ThumbsUp className="h-12 w-12 text-primary mb-2" />
                  <p className="text-lg font-medium">{stats.totalReviews} clients satisfaits</p>
                  <p className="text-sm text-muted-foreground">
                    {isShowcase ? `Recommandent ${displayName}` : 'Recommandent nos salons'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="py-20">
          <div className="mx-auto max-w-7xl px-6">
            {error ? (
              <div className="text-center py-16 bg-muted/20 rounded-3xl border max-w-xl mx-auto">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <p className="text-lg font-medium text-foreground mb-4">{error}</p>
                <Button onClick={fetchReviews} variant="outline" className="gap-2">
                  <RefreshCcw className="h-4 w-4" /> Réessayer
                </Button>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed">
                <MessageCircle className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-xl font-medium text-muted-foreground">
                  {isShowcase 
                    ? "Aucun avis pour ce salon pour le moment. Soyez le premier à partager votre expérience !"
                    : "Aucun avis pour le moment. Soyez le premier à partager votre expérience !"
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {reviews.map((review, idx) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                  >
                    <ReviewCard review={review} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}