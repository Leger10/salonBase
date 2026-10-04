import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { supabase } from '@/lib/supabase';
import Header from "@/components/Header.jsx";
import Footer from "@/components/Footer.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import {
  ArrowLeft,
  Clock,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Link2,
  Calendar,
  User,
} from "lucide-react";
import { toast } from "sonner";

// Fonctions utilitaires
const formatRelativeDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const getCategoryColor = (category) => {
  const colors = {
    'Offre/Promotion': 'bg-amber-100 text-amber-800',
    'News': 'bg-blue-100 text-blue-800',
    'Post': 'bg-purple-100 text-purple-800'
  };
  return colors[category] || 'bg-gray-100 text-gray-800';
};

const getCategoryLabel = (category) => {
  const labels = {
    'Offre/Promotion': '🎁 Offre',
    'News': '📰 Actualité',
    'Post': '📝 Article'
  };
  return labels[category] || category;
};

export default function NewsDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState(null);

  // Récupérer le tenant actif
  const fetchActiveTenant = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id')
        .eq('subscription_status', 'active')
        .limit(1)
        .single();

      if (error) throw error;
      return data?.id;
    } catch (err) {
      console.error('Error fetching tenant:', err);
      return null;
    }
  };

  useEffect(() => {
    const init = async () => {
      const activeTenantId = await fetchActiveTenant();
      setTenantId(activeTenantId);
      if (activeTenantId) {
        fetchArticle(activeTenantId);
      }
    };
    init();
    window.scrollTo(0, 0);
  }, [id]);

  const fetchArticle = async (activeTenantId) => {
    setLoading(true);
    try {
      // Récupérer l'article
      const { data: articleData, error: articleError } = await supabase
        .from('news')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', activeTenantId)
        .eq('status', 'Published')
        .single();

      if (articleError) throw articleError;
      setArticle(articleData);

      // Récupérer les articles similaires
      if (articleData.category) {
        const { data: relatedData, error: relatedError } = await supabase
          .from('news')
          .select('*')
          .eq('tenant_id', activeTenantId)
          .eq('category', articleData.category)
          .eq('status', 'Published')
          .neq('id', id)
          .limit(3);

        if (!relatedError) setRelated(relatedData || []);
      }
    } catch (error) {
      console.error("Failed to fetch article:", error);
      navigate("/news");
      toast.error("L'article n'existe pas ou a été retiré.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Lien copié dans le presse-papiers");
  };

  const handleShare = (platform) => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(article?.title || '');
    
    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}`
    };
    
    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto max-w-4xl px-4 py-12">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-[400px] w-full rounded-3xl mb-8" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/4 mb-12" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!article) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{`${article.title} | BeautyFlow`}</title>
        <meta name="description" content={article.excerpt || article.content?.substring(0, 160)} />
      </Helmet>

      <Header />

      <main className="flex-1 pb-20">
        <article className="container mx-auto max-w-4xl px-4 sm:px-6 py-8 md:py-12">
          <Link
            to="/news"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Retour aux actualités
          </Link>

          <header className="mb-12">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <Badge className={`px-3 py-1 text-sm ${getCategoryColor(article.category)}`}>
                {getCategoryLabel(article.category)}
              </Badge>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatRelativeDate(article.published_at || article.created_at)}
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-8">
              {article.title}
            </h1>

            {article.image_url && (
              <div className="w-full aspect-video md:aspect-[21/9] rounded-3xl overflow-hidden bg-muted relative shadow-lg">
                <img
                  src={article.image_url}
                  alt={article.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
          </header>

          <div className="flex flex-col lg:flex-row gap-12">
            {/* Share buttons */}
            <div className="lg:w-20 shrink-0">
              <div className="sticky top-24 flex lg:flex-col gap-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 hidden lg:block">
                  Partager
                </p>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full h-10 w-10"
                  onClick={() => handleShare('facebook')}
                >
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full h-10 w-10"
                  onClick={() => handleShare('twitter')}
                >
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full h-10 w-10"
                  onClick={() => handleShare('linkedin')}
                >
                  <Linkedin className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full h-10 w-10"
                  onClick={handleCopyLink}
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                  {article.content}
                </div>
              </div>

              <div className="border-t pt-8 mt-12">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Publié par</p>
                    <p className="font-medium">L'équipe BeautyFlow</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Related Articles */}
        {related.length > 0 && (
          <section className="bg-muted/30 py-16 border-t mt-12">
            <div className="container mx-auto max-w-5xl px-4 sm:px-6">
              <h2 className="text-2xl font-bold mb-8">Articles similaires</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {related.map((rel) => (
                  <Link key={rel.id} to={`/news/${rel.id}`} className="group block">
                    <Card className="h-full border-transparent shadow-sm hover:shadow-md transition-all overflow-hidden rounded-2xl">
                      {rel.image_url && (
                        <div className="aspect-[16/10] overflow-hidden bg-muted">
                          <img
                            src={rel.image_url}
                            alt={rel.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                          <Clock className="h-3 w-3" />
                          {formatRelativeDate(rel.published_at || rel.created_at)}
                        </div>
                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary line-clamp-2">
                          {rel.title}
                        </h3>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}